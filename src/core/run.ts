import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readMetadata, writeMetadata } from "../adapters/exiftool.js";
import { runCwebp } from "../adapters/cwebp.js";
import { runPngquant } from "../adapters/pngquant.js";
import { runProcess } from "../adapters/process.js";
import { resolveBinary } from "../adapters/tools.js";
import { findTrim, runVips } from "../adapters/vips.js";
import { inspectBasic } from "./inspect.js";
import { buildOutputPath } from "./pathing.js";
import { resolvePipeline, requiredToolsForUses } from "./planner.js";
import type { AbilityUse, JobSpec, MetadataDiffEntry, RunCommandRecord, RunResult, RunResultItem } from "./types.js";
import { ImgxError } from "./errors.js";
import { EXIT_CODES } from "./exit-codes.js";
import { rgbToVipsBackground } from "../utils/colors.js";

interface ExecutionContext {
  tempDir: string;
  commands: RunCommandRecord[];
  dryRun: boolean;
}

export async function runJobSpec(spec: JobSpec, options: { cwd?: string; dryRun?: boolean } = {}): Promise<RunResult> {
  const cwd = options.cwd ?? process.cwd();
  const pipeline = resolvePipeline(spec);
  const required = requiredToolsForUses(spec.uses);
  const checks = await Promise.all(
    required.map(async (tool) => {
      try {
        await runProcess(
          resolveBinary(tool as "vips" | "exiftool" | "pngquant" | "cwebp"),
          tool === "exiftool" ? ["-ver"] : tool === "cwebp" ? ["-version"] : ["--version"]
        );
        return { tool, ok: true as const };
      } catch (error) {
        return { tool, ok: false as const, error };
      }
    })
  );
  for (const result of checks) {
    if (!result.ok) {
      throw new ImgxError(`Required dependency "${result.tool}" is not available.`, EXIT_CODES.MISSING_DEPENDENCY);
    }
  }

  const items: RunResultItem[] = [];
  for (const input of spec.inputs) {
    try {
      items.push(await processInput(input, spec.uses, pipeline, cwd, Boolean(options.dryRun)));
    } catch (error) {
      items.push({
        input,
        status: "failed",
        ...(error instanceof ImgxError ? { failureCode: error.exitCode } : {}),
        warnings: [],
        commands: [],
        error: error instanceof Error ? error.message : String(error)
      });
      if (pipeline.failFast) {
        break;
      }
    }
  }
  const failed = items.filter((item) => item.status === "failed").length;
  const status = failed === 0 ? "success" : failed === items.length ? "failed" : "partial";
  if (pipeline.report.path) {
    await fs.mkdir(path.dirname(pipeline.report.path), { recursive: true });
    await fs.writeFile(pipeline.report.path, JSON.stringify({ status, items, generatedAt: new Date().toISOString() }, null, 2));
  }
  return {
    status,
    items,
    generatedAt: new Date().toISOString()
  };
}

async function processInput(
  input: string,
  uses: AbilityUse[],
  pipeline: ReturnType<typeof resolvePipeline>,
  cwd: string,
  dryRun: boolean
): Promise<RunResultItem> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-"));
  const ctx: ExecutionContext = { tempDir, commands: [], dryRun };
  const before = await inspectBasic(input);
  const normalizeFilename = uses.some((use) => use.name === "normalize-filename");
  const outputPath = buildOutputPath({
    input,
    cwd,
    outputs: pipeline.outputs,
    normalizeFilename,
    ...(pipeline.format ? { format: pipeline.format } : {})
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  if (!pipeline.outputs.overwrite && (await exists(outputPath))) {
    throw new ImgxError(`Refusing to overwrite existing file "${outputPath}".`, EXIT_CODES.INVALID_INPUT);
  }

  let currentPath = input;
  let currentHasAlpha = before.hasAlpha;

  for (const use of pipeline.phaseUses.normalize) {
    if (use.name === "autorotate") {
      currentPath = await runTempVips(ctx, ["autorot", currentPath, tempPath(ctx, "autorotate", ".png")]);
    }
    if (use.name === "to-srgb") {
      currentPath = await runTempVips(ctx, ["colourspace", currentPath, tempPath(ctx, "srgb", ".png"), "srgb"]);
    }
  }

  for (const use of pipeline.phaseUses.geometry) {
    switch (use.name) {
      case "resize-long-edge": {
        const pixels = Number(use.params.pixels);
        currentPath = await runTempVips(ctx, [
          "thumbnail",
          currentPath,
          tempPath(ctx, "resize-long-edge", ".png"),
          String(pixels),
          "--height",
          String(pixels),
          "--size",
          "both"
        ]);
        break;
      }
      case "resize-short-edge": {
        const pixels = Number(use.params.pixels);
        const landscape = before.width >= before.height;
        currentPath = await runTempVips(ctx, landscape
          ? ["thumbnail", currentPath, tempPath(ctx, "resize-short-edge", ".png"), String(before.width), "--height", String(pixels)]
          : ["thumbnail", currentPath, tempPath(ctx, "resize-short-edge", ".png"), String(pixels), "--height", String(before.height)]);
        break;
      }
      case "fit-contain": {
        const width = Number(use.params.width);
        const height = Number(use.params.height);
        const background = String(use.params.background ?? "#ffffff");
        const thumb = await runTempVips(ctx, [
          "thumbnail",
          currentPath,
          tempPath(ctx, "fit-contain-thumb", ".png"),
          String(width),
          "--height",
          String(height),
          "--size",
          "both"
        ]);
        currentPath = await runTempVips(ctx, [
          "gravity",
          thumb,
          tempPath(ctx, "fit-contain", ".png"),
          "centre",
          String(width),
          String(height),
          "--extend",
          "background",
          "--background",
          rgbToVipsBackground(background)
        ]);
        currentHasAlpha = false;
        break;
      }
      case "fit-cover": {
        const width = Number(use.params.width);
        const height = Number(use.params.height);
        currentPath = await runTempVips(ctx, [
          "thumbnail",
          currentPath,
          tempPath(ctx, "fit-cover", ".png"),
          String(width),
          "--height",
          String(height),
          "--size",
          "both",
          "--crop",
          "centre"
        ]);
        break;
      }
      case "pad-canvas": {
        const width = Number(use.params.width);
        const height = Number(use.params.height);
        const background = String(use.params.background ?? "#ffffff");
        currentPath = await runTempVips(ctx, [
          "gravity",
          currentPath,
          tempPath(ctx, "pad-canvas", ".png"),
          "centre",
          String(width),
          String(height),
          "--extend",
          "background",
          "--background",
          rgbToVipsBackground(background)
        ]);
        currentHasAlpha = false;
        break;
      }
      case "crop-center": {
        const width = Number(use.params.width);
        const height = Number(use.params.height);
        const latest = await inspectBasic(currentPath);
        const left = Math.max(0, Math.floor((latest.width - width) / 2));
        const top = Math.max(0, Math.floor((latest.height - height) / 2));
        currentPath = await runTempVips(ctx, [
          "crop",
          currentPath,
          tempPath(ctx, "crop-center", ".png"),
          String(left),
          String(top),
          String(width),
          String(height)
        ]);
        break;
      }
      case "trim-transparent-edges": {
        if (!currentHasAlpha) {
          break;
        }
        const latest = await inspectBasic(currentPath);
        const alphaPath = tempPath(ctx, "trim-alpha", ".png");
        await runAndRecord(ctx, "vips", [
          "extract_band",
          currentPath,
          alphaPath,
          String(Math.max(0, latest.bands - 1))
        ]);
        ctx.commands.push({
          tool: "vips",
          command: [resolveBinary("vips"), "find_trim", alphaPath, "-b", "0"]
        });
        if (ctx.dryRun) {
          break;
        }
        const bounds = await findTrim(alphaPath, { background: ["0"] });
        if (bounds.width === 0 || bounds.height === 0) {
          throw new ImgxError(
            "trim-transparent-edges found no visible non-transparent content to trim.",
            EXIT_CODES.INVALID_INPUT
          );
        }
        if (
          bounds.left === 0 &&
          bounds.top === 0 &&
          bounds.width === latest.width &&
          bounds.height === latest.height
        ) {
          break;
        }
        currentPath = await runTempVips(ctx, [
          "crop",
          currentPath,
          tempPath(ctx, "trim-transparent-edges", ".png"),
          String(bounds.left),
          String(bounds.top),
          String(bounds.width),
          String(bounds.height)
        ]);
        break;
      }
      case "flatten-bg": {
        const background = String(use.params.background ?? "#ffffff");
        currentPath = await runTempVips(ctx, [
          "flatten",
          currentPath,
          tempPath(ctx, "flatten-bg", ".png"),
          "--background",
          rgbToVipsBackground(background)
        ]);
        currentHasAlpha = false;
        break;
      }
      default:
        break;
    }
  }

  if (pipeline.dropAlphaWithBg && currentHasAlpha) {
    currentPath = await runTempVips(ctx, [
      "flatten",
      currentPath,
      tempPath(ctx, "drop-alpha-with-bg", ".png"),
      "--background",
      rgbToVipsBackground(pipeline.dropAlphaWithBg)
    ]);
    currentHasAlpha = false;
  }

  const format = pipeline.format ?? normalizeFormat(before.format);
  if (format === "jpg" && currentHasAlpha) {
    throw new ImgxError(
      "to-jpg cannot be used with alpha content unless flatten-bg or drop-alpha-with-bg is present.",
      EXIT_CODES.INVALID_INPUT
    );
  }

  if (dryRun) {
    return {
      input,
      output: outputPath,
      status: "success",
      bytesBefore: before.bytes,
      widthBefore: before.width,
      heightBefore: before.height,
      formatBefore: before.format,
      formatAfter: format,
      warnings: [],
      commands: ctx.commands
    };
  }

  await encodeOutput({
    format,
    currentPath,
    outputPath,
    ctx,
    uses,
    pipeline
  });

  await applyMetadata(input, outputPath, uses, pipeline, ctx);
  if (pipeline.keepTimestamps) {
    const sourceStat = await fs.stat(input);
    await fs.utimes(outputPath, sourceStat.atime, sourceStat.mtime);
  }

  const after = await inspectBasic(outputPath);
  const warnings: string[] = [];
  if (pipeline.skipIfLarger && after.bytes >= before.bytes) {
    await fs.rm(outputPath, { force: true });
    await fs.rm(`${outputPath}.imgx.json`, { force: true });
    warnings.push("Output skipped because it was not smaller than the source.");
    return {
      input,
      output: outputPath,
      status: "skipped_larger",
      bytesBefore: before.bytes,
      bytesAfter: after.bytes,
      widthBefore: before.width,
      heightBefore: before.height,
      widthAfter: after.width,
      heightAfter: after.height,
      formatBefore: before.format,
      formatAfter: after.format,
      warnings,
      commands: ctx.commands
    };
  }

  const metadataDiff = pipeline.auditMetaDiff ? await diffMetadata(input, outputPath) : undefined;

  return {
    input,
    output: outputPath,
    status: "success",
    bytesBefore: before.bytes,
    bytesAfter: after.bytes,
    widthBefore: before.width,
    heightBefore: before.height,
    widthAfter: after.width,
    heightAfter: after.height,
    formatBefore: before.format,
    formatAfter: after.format,
    warnings,
    commands: ctx.commands,
    ...(metadataDiff ? { metadataDiff } : {})
  };
}

async function encodeOutput(options: {
  format: "jpg" | "png" | "webp";
  currentPath: string;
  outputPath: string;
  ctx: ExecutionContext;
  uses: AbilityUse[];
  pipeline: ReturnType<typeof resolvePipeline>;
}): Promise<void> {
  const { format, currentPath, outputPath, ctx, uses, pipeline } = options;
  if (format === "jpg") {
    const requestedQuality = getNumberParam(uses, "jpg-quality", "quality") ?? 82;
    const quality = pipeline.targetMaxBytes
      ? await searchQuality({ min: 30, max: requestedQuality, targetBytes: pipeline.targetMaxBytes, encode: (candidate, destination) => encodeJpg(currentPath, destination, candidate, ctx) })
      : requestedQuality;
    await encodeJpg(currentPath, outputPath, quality, ctx);
    return;
  }

  if (format === "png") {
    const tempPng = tempPath(ctx, "encoded", ".png");
    await runAndRecord(ctx, "vips", [
      "copy",
      currentPath,
      `${tempPng}[strip]`
    ]);
    if (uses.some((use) => use.name === "png-quantize")) {
      const min = getNumberParam(uses, "png-quantize", "qualityMin") ?? 60;
      const max = getNumberParam(uses, "png-quantize", "qualityMax") ?? 85;
      const speed = getNumberParam(uses, "png-quantize", "speed") ?? 3;
      const exitCode = await runAndRecord(ctx, "pngquant", [
        "--quality",
        `${min}-${max}`,
        "--speed",
        String(speed),
        "--output",
        outputPath,
        "--force",
        tempPng
      ]);
      if (exitCode === 99) {
        await copyArtifact(tempPng, outputPath);
      }
    } else {
      await copyArtifact(tempPng, outputPath);
    }
    return;
  }

  const requestedQuality = getNumberParam(uses, "webp-quality", "quality") ?? 82;
  const lossless = uses.some((use) => use.name === "lossless-webp");
  const quality = pipeline.targetMaxBytes && !lossless
    ? await searchQuality({
        min: 30,
        max: requestedQuality,
        targetBytes: pipeline.targetMaxBytes,
        encode: (candidate, destination) => encodeWebp(currentPath, destination, candidate, false, ctx)
      })
    : requestedQuality;
  await encodeWebp(currentPath, outputPath, quality, lossless, ctx);
}

async function encodeJpg(input: string, output: string, quality: number, ctx: ExecutionContext): Promise<void> {
  await runAndRecord(ctx, "vips", ["copy", input, `${output}[Q=${quality},strip]`]);
}

async function encodeWebp(
  input: string,
  output: string,
  quality: number,
  lossless: boolean,
  ctx: ExecutionContext
): Promise<void> {
  const args = lossless ? ["-lossless", input, "-o", output] : ["-q", String(quality), input, "-o", output];
  await runAndRecord(ctx, "cwebp", args);
}

async function applyMetadata(
  input: string,
  outputPath: string,
  uses: AbilityUse[],
  pipeline: ReturnType<typeof resolvePipeline>,
  ctx: ExecutionContext
): Promise<void> {
  if (pipeline.metadataMode === "strip-all-meta") {
    await runAndRecord(ctx, "exiftool", ["-overwrite_original", "-P", "-all=", outputPath]);
  }
  if (pipeline.metadataMode === "keep-basic-meta") {
    await runAndRecord(ctx, "exiftool", [
      "-overwrite_original",
      "-P",
      "-TagsFromFile",
      input,
      "-EXIF:DateTimeOriginal",
      "-EXIF:CreateDate",
      "-EXIF:ModifyDate",
      "-EXIF:OffsetTime*",
      "-EXIF:Artist",
      "-IPTC:CopyrightNotice",
      "-XMP-dc:Creator",
      "-XMP-dc:Rights",
      "-XMP-xmpRights:UsageTerms",
      outputPath
    ]);
  }
  if (uses.some((use) => use.name === "strip-gps")) {
    await runAndRecord(ctx, "exiftool", ["-overwrite_original", "-P", "-GPS:all=", outputPath]);
  }
  if (pipeline.copySourceDates) {
    await runAndRecord(ctx, "exiftool", [
      "-overwrite_original",
      "-P",
      "-TagsFromFile",
      input,
      "-EXIF:DateTimeOriginal",
      "-EXIF:CreateDate",
      "-EXIF:ModifyDate",
      "-EXIF:OffsetTime*",
      outputPath
    ]);
  }
  if (uses.some((use) => use.name === "strip-orientation-tag")) {
    await runAndRecord(ctx, "exiftool", ["-overwrite_original", "-P", "-Orientation=", outputPath]);
  }
}

async function diffMetadata(input: string, output: string): Promise<MetadataDiffEntry[]> {
  const [before, after] = await Promise.all([readMetadata(input), readMetadata(output)]);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({ key, before: before[key], after: after[key] }));
}

async function searchQuality(options: {
  min: number;
  max: number;
  targetBytes: number;
  encode: (quality: number, destination: string) => Promise<void>;
}): Promise<number> {
  let low = options.min;
  let high = options.max;
  let best = options.min;
  while (low <= high) {
    const candidate = Math.floor((low + high) / 2);
    const file = path.join(os.tmpdir(), `imgx-quality-${Date.now()}-${candidate}`);
    await options.encode(candidate, file);
    const size = (await fs.stat(file)).size;
    await fs.rm(file, { force: true });
    if (size <= options.targetBytes) {
      best = candidate;
      low = candidate + 1;
    } else {
      high = candidate - 1;
    }
  }
  return best;
}

async function runTempVips(ctx: ExecutionContext, args: string[]): Promise<string> {
  const output = args[2]!;
  await runAndRecord(ctx, "vips", args);
  return output;
}

async function runAndRecord(ctx: ExecutionContext, tool: "vips" | "pngquant" | "cwebp" | "exiftool", args: string[]): Promise<number> {
  ctx.commands.push({ tool, command: [resolveBinary(tool), ...args] });
  if (ctx.dryRun) {
    return 0;
  }
  switch (tool) {
    case "vips":
      await runVips(args);
      return 0;
    case "pngquant":
      return runPngquant(args);
    case "cwebp":
      await runCwebp(args);
      return 0;
    case "exiftool":
      await writeMetadata(args);
      return 0;
  }
}

function getNumberParam(uses: AbilityUse[], name: string, key: string): number | undefined {
  const use = uses.find((entry) => entry.name === name);
  const value = use?.params[key];
  return typeof value === "number" ? value : undefined;
}

function tempPath(ctx: ExecutionContext, label: string, extension: string): string {
  return path.join(ctx.tempDir, `${ctx.commands.length}-${label}${extension}`);
}

async function copyArtifact(source: string, destination: string): Promise<void> {
  await fs.copyFile(source, destination);
  const sidecarSource = `${source}.imgx.json`;
  if (await exists(sidecarSource)) {
    await fs.copyFile(sidecarSource, `${destination}.imgx.json`);
  }
}

function normalizeFormat(format: string): "jpg" | "png" | "webp" {
  if (format === "jpeg") {
    return "jpg";
  }
  if (format === "jpg" || format === "png" || format === "webp") {
    return format;
  }
  return "png";
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

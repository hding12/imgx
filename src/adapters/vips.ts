import { runProcess } from "./process.js";
import { resolveBinary } from "./tools.js";

export interface VipsHeaderInfo {
  width: number;
  height: number;
  bands: number;
  interpretation?: string;
}

export interface VipsTrimBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export async function getVipsHeader(input: string): Promise<VipsHeaderInfo> {
  const binary = resolveBinary("vipsheader");
  const [width, height, bands, interpretation] = await Promise.all([
    runProcess(binary, ["-f", "width", input]),
    runProcess(binary, ["-f", "height", input]),
    runProcess(binary, ["-f", "bands", input]),
    runProcess(binary, ["-f", "interpretation", input]).catch(() => ({
      stdout: "",
      stderr: "",
      exitCode: 1
    }))
  ]);
  return {
    width: Number.parseInt(width.stdout.trim(), 10),
    height: Number.parseInt(height.stdout.trim(), 10),
    bands: Number.parseInt(bands.stdout.trim(), 10),
    interpretation: interpretation.stdout.trim() || undefined
  };
}

export async function runVips(args: string[]): Promise<void> {
  const binary = resolveBinary("vips");
  await runProcess(binary, args);
}

export async function findTrim(input: string, options: { background?: string[] } = {}): Promise<VipsTrimBounds> {
  const binary = resolveBinary("vips");
  const args = ["find_trim", input];
  if (options.background) {
    args.push("-b", ...options.background);
  }
  const result = await runProcess(binary, args);
  const values = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => Number.parseInt(line, 10));
  if (values.length !== 4 || values.some((value) => Number.isNaN(value))) {
    throw new Error(`Unexpected vips find_trim output for "${input}": ${JSON.stringify(result.stdout)}`);
  }
  const [left, top, width, height] = values as [number, number, number, number];
  return { left, top, width, height };
}

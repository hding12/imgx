import fs from "node:fs/promises";
import path from "node:path";
import { getVipsHeader } from "../adapters/vips.js";
import { readMetadata } from "../adapters/exiftool.js";
import { detectTools } from "../adapters/tools.js";
import type { BasicInspectInfo, InspectResult, ToolCapabilitySnapshot } from "./types.js";

export async function inspectInputs(
  inputs: string[],
  options: { includeMeta?: boolean; includeCapabilities?: boolean; capabilities?: ToolCapabilitySnapshot } = {}
): Promise<InspectResult[]> {
  const capabilities =
    options.includeCapabilities ? options.capabilities ?? (await detectTools()) : undefined;
  const results: InspectResult[] = [];
  for (const input of inputs) {
    const basic = await inspectBasic(input);
    const metadata = options.includeMeta ? await readMetadata(input) : undefined;
    results.push({
      path: input,
      basic,
      metadata,
      capabilities
    });
  }
  return results;
}

export async function inspectBasic(input: string): Promise<BasicInspectInfo> {
  const stats = await fs.stat(input);
  const header = await getVipsHeader(input);
  const metadata = (await readMetadata(input).catch(() => ({} as Record<string, unknown>))) as Record<string, unknown>;
  const format = typeof metadata.FileTypeExtension === "string"
    ? metadata.FileTypeExtension
    : path.extname(input).replace(/^\./, "").toLowerCase();
  return {
    path: input,
    width: header.width,
    height: header.height,
    bands: header.bands,
    format,
    colorSpace: header.interpretation ?? asString(metadata.ColorSpace),
    orientation: asString(metadata.Orientation),
    hasAlpha: header.bands >= 4,
    bytes: stats.size
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

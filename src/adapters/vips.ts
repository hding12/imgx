import { runProcess } from "./process.js";
import { resolveBinary } from "./tools.js";

export interface VipsHeaderInfo {
  width: number;
  height: number;
  bands: number;
  interpretation?: string;
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

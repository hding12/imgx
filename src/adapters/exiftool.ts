import { runProcess } from "./process.js";
import { resolveBinary } from "./tools.js";

export async function readMetadata(path: string): Promise<Record<string, unknown>> {
  const result = await runProcess(resolveBinary("exiftool"), ["-json", path]);
  const parsed = JSON.parse(result.stdout) as Array<Record<string, unknown>>;
  return parsed[0] ?? {};
}

export async function writeMetadata(args: string[]): Promise<void> {
  await runProcess(resolveBinary("exiftool"), args);
}

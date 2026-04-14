import { runProcess } from "./process.js";
import { resolveBinary } from "./tools.js";

export async function runPngquant(args: string[]): Promise<number> {
  const result = await runProcess(resolveBinary("pngquant"), args);
  return result.exitCode;
}

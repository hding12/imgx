import { runProcess } from "./process.js";
import { resolveBinary } from "./tools.js";

export async function runCwebp(args: string[]): Promise<void> {
  await runProcess(resolveBinary("cwebp"), args);
}

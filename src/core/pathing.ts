import path from "node:path";
import { toKebabCase } from "../utils/strings.js";
import type { JobOutputs } from "./types.js";

export function buildOutputPath(options: {
  input: string;
  cwd: string;
  outputs: Required<Pick<JobOutputs, "overwrite" | "keepStructure">> & JobOutputs;
  normalizeFilename: boolean;
  format?: "jpg" | "png" | "webp";
}): string {
  const parsed = path.parse(options.input);
  const baseName = options.normalizeFilename ? toKebabCase(parsed.name) : parsed.name;
  const suffix = options.outputs.suffix ?? "-imgx";
  const ext = options.format ? `.${options.format}` : parsed.ext;
  const outputName = `${baseName}${suffix}${ext}`;
  const root = options.outputs.outDir ?? parsed.dir;
  if (!options.outputs.keepStructure || !options.outputs.outDir) {
    return path.join(root, outputName);
  }
  const relative = path.relative(options.cwd, parsed.dir || ".");
  const safeRelative = relative.startsWith("..") ? "" : relative;
  return path.join(root, safeRelative, outputName);
}

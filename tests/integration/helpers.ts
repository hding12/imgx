import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export async function createFakeToolEnv(): Promise<NodeJS.ProcessEnv> {
  const binDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-fake-bin-"));
  const harness = path.resolve("tests/fake-bin/tool-harness.mjs");
  const toolNames = ["vips", "vipsheader", "exiftool", "pngquant", "cwebp"];
  await Promise.all(
    toolNames.map(async (tool) => {
      const target = path.join(binDir, tool);
      await fs.copyFile(harness, target);
      await fs.chmod(target, 0o755);
    })
  );
  return {
    ...process.env,
    IMGX_BIN_VIPS: path.join(binDir, "vips"),
    IMGX_BIN_VIPSHEADER: path.join(binDir, "vipsheader"),
    IMGX_BIN_EXIFTOOL: path.join(binDir, "exiftool"),
    IMGX_BIN_PNGQUANT: path.join(binDir, "pngquant"),
    IMGX_BIN_CWEBP: path.join(binDir, "cwebp")
  };
}

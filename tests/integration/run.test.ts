import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { beforeEach, describe, expect, it } from "vitest";
import { runDoctor } from "../../src/core/doctor.js";
import { inspectInputs } from "../../src/core/inspect.js";
import { runJobSpec } from "../../src/core/run.js";
import { createFakeToolEnv } from "./helpers.js";

describe("integration", () => {
  beforeEach(async () => {
    Object.assign(process.env, await createFakeToolEnv());
  });

  it("reports tool availability", async () => {
    const result = await runDoctor();
    expect(result.capabilities.tools.vips.available).toBe(true);
    expect(result.capabilities.tools.exiftool.available).toBe(true);
  });

  it("inspects metadata and capabilities", async () => {
    const input = path.resolve("tests/fixtures/oriented-photo.jpg");
    const [result] = await inspectInputs([input], { includeMeta: true, includeCapabilities: true });
    expect(result.basic?.width).toBe(3000);
    expect(result.metadata?.Orientation).toBe("Rotate 90 CW");
    expect(result.capabilities?.tools.cwebp.available).toBe(true);
  });

  it("runs the README web-share combination", async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-web-share-"));
    const result = await runJobSpec({
      inputs: [path.resolve("tests/fixtures/oriented-photo.jpg")],
      uses: [
        { name: "autorotate", params: {} },
        { name: "to-srgb", params: {} },
        { name: "resize-long-edge", params: { pixels: 2048 } },
        { name: "strip-all-meta", params: {} },
        { name: "to-webp", params: {} },
        { name: "webp-quality", params: { quality: 82 } },
        { name: "skip-if-larger", params: {} },
        { name: "out-dir", params: { path: outputDir } }
      ]
    });
    expect(result.status).toBe("success");
    expect(result.items[0]?.output?.endsWith(".webp")).toBe(true);
  });

  it("covers alpha, metadata, output, and report abilities", async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-market-"));
    const reportPath = path.join(outputDir, "report.json");
    const result = await runJobSpec({
      inputs: [path.resolve("tests/fixtures/nested/catalog/item.png")],
      uses: [
        { name: "inspect-basic", params: {} },
        { name: "inspect-meta", params: {} },
        { name: "inspect-capability", params: {} },
        { name: "normalize-filename", params: {} },
        { name: "fit-contain", params: { width: 1200, height: 1200, background: "#ffffff" } },
        { name: "pad-canvas", params: { width: 1280, height: 1280, background: "#ffffff" } },
        { name: "crop-center", params: { width: 1200, height: 1200 } },
        { name: "drop-alpha-with-bg", params: { background: "#ffffff" } },
        { name: "to-jpg", params: {} },
        { name: "jpg-quality", params: { quality: 86 } },
        { name: "target-max-bytes", params: { bytes: 2500 } },
        { name: "keep-basic-meta", params: {} },
        { name: "strip-gps", params: {} },
        { name: "keep-timestamps", params: {} },
        { name: "copy-source-dates", params: {} },
        { name: "audit-meta-diff", params: {} },
        { name: "suffix", params: { value: "-market" } },
        { name: "out-dir", params: { path: outputDir } },
        { name: "keep-structure", params: { enabled: true } },
        { name: "overwrite", params: { enabled: true } },
        { name: "report-json", params: { path: reportPath } }
      ]
    });
    expect(result.status).toBe("success");
    expect(result.items[0]?.metadataDiff?.length).toBeGreaterThan(0);
    expect(await fs.readFile(reportPath, "utf8")).toContain("\"status\"");
  });

  it("covers PNG, pngquant fallback, and skip-if-larger behavior", async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-png-"));
    process.env.IMGX_FAKE_PNGQUANT_FORCE_99 = "1";
    const result = await runJobSpec({
      inputs: [path.resolve("tests/fixtures/transparent-logo.png")],
      uses: [
        { name: "fit-cover", params: { width: 512, height: 512 } },
        { name: "keep-alpha", params: {} },
        { name: "to-png", params: {} },
        { name: "png-quantize", params: { qualityMin: 60, qualityMax: 85, speed: 3 } },
        { name: "skip-if-larger", params: {} },
        { name: "out-dir", params: { path: outputDir } }
      ]
    });
    delete process.env.IMGX_FAKE_PNGQUANT_FORCE_99;
    expect(["success", "skipped_larger"]).toContain(result.items[0]?.status);
  });

  it("covers lossless webp and dry-run command planning", async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-webp-"));
    const result = await runJobSpec(
      {
        inputs: [path.resolve("tests/fixtures/transparent-logo.png")],
        uses: [
          { name: "autorotate", params: {} },
          { name: "resize-short-edge", params: { pixels: 640 } },
          { name: "flatten-bg", params: { background: "#f5f5f5" } },
          { name: "to-webp", params: {} },
          { name: "lossless-webp", params: {} },
          { name: "strip-all-meta", params: {} },
          { name: "out-dir", params: { path: outputDir } }
        ]
      },
      { dryRun: true }
    );
    expect(result.items[0]?.commands.length).toBeGreaterThan(0);
    expect(result.items[0]?.formatAfter).toBe("webp");
  });
});

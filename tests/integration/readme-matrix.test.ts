import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { parseJobSpec } from "../../src/schemas/job-spec.js";
import { runJobSpec } from "../../src/core/run.js";
import { createFakeToolEnv } from "./helpers.js";

describe("README matrix", () => {
  beforeEach(async () => {
    Object.assign(process.env, await createFakeToolEnv());
  });

  it("parses every example spec file", async () => {
    const examplesDir = path.resolve("examples/specs");
    const files = (await fs.readdir(examplesDir)).filter((entry) => entry.endsWith(".json")).sort();
    expect(files).toHaveLength(7);

    for (const file of files) {
      const raw = await fs.readFile(path.join(examplesDir, file), "utf8");
      const spec = parseJobSpec(JSON.parse(raw));
      expect(spec.uses.length).toBeGreaterThan(0);
    }
  });

  it("executes every README example spec after relocating outputs", async () => {
    const examplesDir = path.resolve("examples/specs");
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-examples-"));
    const files = (await fs.readdir(examplesDir)).filter((entry) => entry.endsWith(".json")).sort();

    for (const file of files) {
      const raw = await fs.readFile(path.join(examplesDir, file), "utf8");
      const spec = parseJobSpec(JSON.parse(raw));
      const caseRoot = path.join(tempRoot, path.basename(file, ".json"));
      const relocated = {
        ...spec,
        uses: spec.uses.map((use) => {
          if (use.name === "out-dir") {
            return { ...use, params: { ...use.params, path: caseRoot } };
          }
          if (use.name === "report-json") {
            return { ...use, params: { ...use.params, path: path.join(caseRoot, "report.json") } };
          }
          return use;
        }),
        outputs: {
          ...spec.outputs,
          outDir: caseRoot
        },
        report: spec.report
          ? {
              ...spec.report,
              path: path.join(caseRoot, "report.json")
            }
          : spec.report
      };
      const result = await runJobSpec(relocated);
      expect(["success", "partial"]).toContain(result.status);
    }
  }, 120000);

  it("normalizes filenames into ASCII kebab-case", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-normalize-"));
    const source = path.join(tempRoot, "Fancy 名字 Photo.PNG");
    await fs.copyFile(path.resolve("tests/fixtures/transparent-logo.png"), source);
    await fs.copyFile(path.resolve("tests/fixtures/transparent-logo.png.imgx.json"), `${source}.imgx.json`);

    const result = await runJobSpec({
      inputs: [source],
      uses: [
        { name: "normalize-filename", params: {} },
        { name: "to-png", params: {} },
        { name: "out-dir", params: { path: tempRoot } }
      ]
    });

    expect(path.basename(result.items[0]?.output ?? "")).toBe("fancy-photo-imgx.png");
  });

  it("keeps directory structure and removes skipped outputs", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-keep-structure-"));
    const reportPath = path.join(tempRoot, "report.json");

    const result = await runJobSpec({
      inputs: [path.resolve("tests/fixtures/nested/catalog/item.png")],
      uses: [
        { name: "normalize-filename", params: {} },
        { name: "fit-contain", params: { width: 1200, height: 1200, background: "#ffffff" } },
        { name: "to-jpg", params: {} },
        { name: "jpg-quality", params: { quality: 86 } },
        { name: "out-dir", params: { path: tempRoot } },
        { name: "keep-structure", params: { enabled: true } },
        { name: "report-json", params: { path: reportPath } }
      ]
    });

    expect(result.items[0]?.output).toContain(path.join("tests", "fixtures", "nested", "catalog"));
    expect(await fs.readFile(reportPath, "utf8")).toContain("\"status\"");

    process.env.IMGX_FAKE_PNGQUANT_FORCE_99 = "1";
    const skipped = await runJobSpec({
      inputs: [path.resolve("tests/fixtures/transparent-logo.png")],
      uses: [
        { name: "to-png", params: {} },
        { name: "png-quantize", params: { qualityMin: 60, qualityMax: 85, speed: 3 } },
        { name: "skip-if-larger", params: {} },
        { name: "out-dir", params: { path: tempRoot } }
      ]
    });
    delete process.env.IMGX_FAKE_PNGQUANT_FORCE_99;

    if (skipped.items[0]?.status === "skipped_larger" && skipped.items[0].output) {
      await expect(fs.access(skipped.items[0].output)).rejects.toThrow();
    }
  });
});

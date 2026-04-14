import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createFakeToolEnv } from "./helpers.js";

describe("cli", () => {
  beforeEach(async () => {
    Object.assign(process.env, await createFakeToolEnv());
  });

  it("lists abilities as JSON", async () => {
    const { stdout } = await runCli(["dist/cli.js", "ability", "list", "--json"], {
      cwd: path.resolve("."),
      env: process.env
    });
    expect(stdout).toContain("\"autorotate\"");
  });

  it("runs doctor as JSON", async () => {
    const { stdout } = await runCli(["dist/cli.js", "doctor", "--json"], {
      cwd: path.resolve("."),
      env: process.env
    });
    expect(stdout).toContain("\"available\": true");
  });

  it("shows one ability", async () => {
    const { stdout } = await runCli(["dist/cli.js", "ability", "show", "to-webp"], {
      cwd: path.resolve("."),
      env: process.env
    });
    expect(stdout).toContain("to-webp");
    expect(stdout).toContain("Phase: encode");
  });

  it("runs a spec from stdin and returns JSON", async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-cli-stdin-"));
    const payload = JSON.stringify({
      inputs: ["tests/fixtures/oriented-photo.jpg"],
      uses: [
        { name: "autorotate", params: {} },
        { name: "to-webp", params: {} },
        { name: "out-dir", params: { path: outputDir } }
      ],
      report: { json: true }
    });
    const { stdout } = await runCli(["dist/cli.js", "run", "--spec", "-", "--json"], {
      cwd: path.resolve("."),
      env: process.env,
      input: payload
    });
    expect(JSON.parse(stdout).status).toBe("success");
  });

  it("returns exit code 3 for invalid combinations", async () => {
    await expect(
      runCli(
        [
          "dist/cli.js",
          "run",
          "tests/fixtures/oriented-photo.jpg",
          "--use",
          "fit-contain,width=100,height=100",
          "--use",
          "fit-cover,width=100,height=100"
        ],
        { cwd: path.resolve("."), env: process.env }
      )
    ).rejects.toMatchObject({ code: 3 });
  });

  it("returns exit code 3 for alpha-to-jpg without flattening", async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-cli-alpha-"));
    await expect(
      runCli(
        [
          "dist/cli.js",
          "run",
          "tests/fixtures/transparent-logo.png",
          "--use",
          "to-jpg",
          "--use",
          `out-dir,path=${outputDir}`
        ],
        { cwd: path.resolve("."), env: process.env }
      )
    ).rejects.toMatchObject({ code: 3 });
  });

  it("returns exit code 4 when a required dependency is missing", async () => {
    await expect(
      runCli(
        [
          "dist/cli.js",
          "run",
          "tests/fixtures/oriented-photo.jpg",
          "--use",
          "to-webp"
        ],
        {
          cwd: path.resolve("."),
          env: {
            ...process.env,
            IMGX_BIN_CWEBP: "/definitely/missing/cwebp"
          }
        }
      )
    ).rejects.toMatchObject({ code: 4 });
  });

  it("returns exit code 2 for partial success", async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "imgx-cli-partial-"));
    await expect(
      runCli(
        [
          "dist/cli.js",
          "run",
          "tests/fixtures/oriented-photo.jpg",
          "tests/fixtures/missing.jpg",
          "--use",
          "to-webp",
          "--use",
          `out-dir,path=${outputDir}`
        ],
        { cwd: path.resolve("."), env: process.env }
      )
    ).rejects.toMatchObject({ code: 2 });
  });

  it("returns exit code 5 when all inputs fail processing", async () => {
    await expect(
      runCli(
        [
          "dist/cli.js",
          "run",
          "tests/fixtures/missing.jpg",
          "--use",
          "to-webp"
        ],
        { cwd: path.resolve("."), env: process.env }
      )
    ).rejects.toMatchObject({ code: 5 });
  });

  it("prints install advice when doctor sees missing tools", async () => {
    const { stdout } = await runCli(["dist/cli.js", "doctor"], {
      cwd: path.resolve("."),
      env: {
        ...process.env,
        IMGX_BIN_VIPS: "/missing/vips",
        IMGX_BIN_EXIFTOOL: "/missing/exiftool",
        IMGX_BIN_PNGQUANT: "/missing/pngquant",
        IMGX_BIN_CWEBP: "/missing/cwebp"
      }
    });
    expect(stdout).toContain("brew install vips exiftool pngquant webp");
  });

  it("inspects metadata and capabilities from the CLI", async () => {
    const { stdout } = await runCli(
      [
        "dist/cli.js",
        "inspect",
        "tests/fixtures/oriented-photo.jpg",
        "--use",
        "inspect-meta",
        "--use",
        "inspect-capability",
        "--json"
      ],
      { cwd: path.resolve("."), env: process.env }
    );
    const payload = JSON.parse(stdout);
    expect(payload[0].metadata.Orientation).toBe("Rotate 90 CW");
    expect(payload[0].capabilities.tools.vips.available).toBe(true);
  });
});

async function runCli(
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; input?: string }
): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = execFile("node", args, { cwd: options.cwd, env: options.env }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolve({ stdout, stderr });
    });
    if (options.input !== undefined) {
      child.stdin?.write(options.input);
      child.stdin?.end();
    }
  });
}

import { runProcess } from "./process.js";
import type { ToolCapability, ToolCapabilitySnapshot } from "../core/types.js";
import type { ToolName } from "../abilities/registry.js";

export function resolveBinary(name: ToolName | "vipsheader"): string {
  switch (name) {
    case "vips":
      return process.env.IMGX_BIN_VIPS ?? "vips";
    case "vipsheader":
      return process.env.IMGX_BIN_VIPSHEADER ?? "vipsheader";
    case "exiftool":
      return process.env.IMGX_BIN_EXIFTOOL ?? "exiftool";
    case "pngquant":
      return process.env.IMGX_BIN_PNGQUANT ?? "pngquant";
    case "cwebp":
      return process.env.IMGX_BIN_CWEBP ?? "cwebp";
  }
}

export async function detectTool(tool: ToolName): Promise<ToolCapability> {
  const binary = resolveBinary(tool);
  try {
    const versionArgs =
      tool === "exiftool" ? ["-ver"] : tool === "cwebp" ? ["-version"] : ["--version"];
    const versionResult = await runProcess(binary, versionArgs);
    const version = [versionResult.stdout, versionResult.stderr].join("\n").trim().split("\n")[0]?.trim();
    const details: Record<string, unknown> = {};
    if (tool === "vips") {
      try {
        const foreignResult = await runProcess(binary, ["-l", "foreign"]);
        details.foreignLoaders = foreignResult.stdout
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
      } catch {
        // ignore optional details
      }
    }
    return { tool, binary, available: true, version, details };
  } catch (error) {
    return {
      tool,
      binary,
      available: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function detectTools(): Promise<ToolCapabilitySnapshot> {
  const tools = await Promise.all((["vips", "exiftool", "pngquant", "cwebp"] as ToolName[]).map(detectTool));
  return {
    tools: Object.fromEntries(tools.map((tool) => [tool.tool, tool])) as ToolCapabilitySnapshot["tools"]
  };
}

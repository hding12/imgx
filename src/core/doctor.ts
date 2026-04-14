import { detectTools } from "../adapters/tools.js";
import { requiredToolsForUses } from "./planner.js";
import type { AbilityUse, ToolCapabilitySnapshot } from "./types.js";

export async function runDoctor(uses?: AbilityUse[]): Promise<{
  capabilities: ToolCapabilitySnapshot;
  required: string[];
  advice: string[];
}> {
  const capabilities = await detectTools();
  const required = uses ? requiredToolsForUses(uses) : [];
  const missing = Object.values(capabilities.tools)
    .filter((tool) => !tool.available)
    .map((tool) => tool.tool);
  const advice = missing.length
    ? [
        "macOS: brew install vips exiftool pngquant webp",
        "Debian/Ubuntu: sudo apt-get install libvips-tools libimage-exiftool-perl pngquant webp"
      ]
    : [];
  return { capabilities, required, advice };
}

import { describe, expect, it } from "vitest";
import { resolvePipeline, sortUsesByPhase } from "../../src/core/planner.js";

describe("planner", () => {
  it("sorts uses by phase order", () => {
    const ordered = sortUsesByPhase([
      { name: "to-webp", params: {} },
      { name: "autorotate", params: {} },
      { name: "fit-contain", params: { width: 100, height: 100, background: "#ffffff" } }
    ]);
    expect(ordered.map((item) => item.name)).toEqual(["autorotate", "fit-contain", "to-webp"]);
  });

  it("rejects conflicting primary geometry abilities", () => {
    expect(() =>
      resolvePipeline({
        inputs: ["in.png"],
        uses: [
          { name: "resize-long-edge", params: { pixels: 100 } },
          { name: "fit-contain", params: { width: 100, height: 100, background: "#ffffff" } }
        ]
      })
    ).toThrow(/exclusive group/);
  });

  it("requires png-quantize for png target-max-bytes", () => {
    expect(() =>
      resolvePipeline({
        inputs: ["in.png"],
        uses: [
          { name: "to-png", params: {} },
          { name: "target-max-bytes", params: { bytes: 1024 } }
        ]
      })
    ).toThrow(/png-quantize/);
  });

  it("keeps trim-transparent-edges composable within geometry order", () => {
    const pipeline = resolvePipeline({
      inputs: ["in.png"],
      uses: [
        { name: "trim-transparent-edges", params: {} },
        { name: "resize-long-edge", params: { pixels: 100 } },
        { name: "to-webp", params: {} }
      ]
    });
    expect(pipeline.phaseUses.geometry.map((item) => item.name)).toEqual([
      "trim-transparent-edges",
      "resize-long-edge"
    ]);
  });
});

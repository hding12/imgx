import { describe, expect, it } from "vitest";
import { parseUseExpression } from "../../src/core/use-parser.js";

describe("parseUseExpression", () => {
  it("parses abilities with named parameters", () => {
    expect(parseUseExpression("fit-contain,width=1600,height=1600,background=#ffffff")).toEqual({
      name: "fit-contain",
      params: {
        width: 1600,
        height: 1600,
        background: "#ffffff"
      }
    });
  });

  it("applies defaults for optional parameters", () => {
    expect(parseUseExpression("overwrite")).toEqual({
      name: "overwrite",
      params: {
        enabled: true
      }
    });
  });
});

import { describe, expect, it } from "vitest";
import { buildJobSpecJsonSchema, parseJobSpec } from "../../src/schemas/job-spec.js";

describe("job spec schema", () => {
  it("parses a valid job spec", () => {
    const parsed = parseJobSpec({
      inputs: ["photo.jpg"],
      uses: [
        { name: "autorotate", params: {} },
        { name: "to-webp", params: {} }
      ],
      report: {
        json: true
      }
    });
    expect(parsed.inputs).toEqual(["photo.jpg"]);
  });

  it("exports a JSON schema object", () => {
    const schema = buildJobSpecJsonSchema();
    expect(schema).toBeTypeOf("object");
  });
});

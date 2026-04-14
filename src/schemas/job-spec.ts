import { z } from "zod";
import { abilityRegistry, buildParamSchema } from "../abilities/registry.js";
import type { JobSpec } from "../core/types.js";
import { ImgxError } from "../core/errors.js";
import { EXIT_CODES } from "../core/exit-codes.js";

const abilityUseSchemas = abilityRegistry.map((ability) =>
  z.object({
    name: z.literal(ability.name),
    params: buildParamSchema(ability).default({})
  })
);

const abilityUseSchema = z.union(abilityUseSchemas as unknown as [z.ZodTypeAny, ...z.ZodTypeAny[]]);

export const jobOutputsSchema = z
  .object({
    outDir: z.string().optional(),
    suffix: z.string().optional(),
    overwrite: z.boolean().optional(),
    keepStructure: z.boolean().optional()
  })
  .strict()
  .optional();

export const jobReportSchema = z
  .object({
    json: z.boolean().optional(),
    path: z.string().optional()
  })
  .strict()
  .optional();

export const jobSpecSchema = z
  .object({
    inputs: z.array(z.string()).min(1),
    uses: z.array(abilityUseSchema).min(1),
    outputs: jobOutputsSchema,
    report: jobReportSchema,
    failFast: z.boolean().optional()
  })
  .strict();

export function parseJobSpec(input: unknown): JobSpec {
  try {
    return jobSpecSchema.parse(input) as JobSpec;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ImgxError(
        `Invalid JobSpec: ${error.issues.map((issue) => issue.message).join("; ")}`,
        EXIT_CODES.INVALID_INPUT
      );
    }
    throw error;
  }
}

export function buildJobSpecJsonSchema(): object {
  return z.toJSONSchema(jobSpecSchema);
}

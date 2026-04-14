import { buildParamSchema, getAbility } from "../abilities/registry.js";
import type { AbilityUse } from "./types.js";
import { ImgxError } from "./errors.js";
import { EXIT_CODES } from "./exit-codes.js";
import { ZodError } from "zod";

export function parseUseExpression(expression: string): AbilityUse {
  const parts = expression
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new ImgxError("Empty --use value is not allowed.", EXIT_CODES.INVALID_INPUT);
  }

  const name = parts[0]!;
  const rawParams = parts.slice(1);
  const definition = getAbility(name);
  if (!definition) {
    throw new ImgxError(`Unknown ability "${name}".`, EXIT_CODES.INVALID_INPUT);
  }

  const params: Record<string, string | number | boolean> = {};
  for (const rawParam of rawParams) {
    const [key, ...valueParts] = rawParam.split("=");
    if (!key || valueParts.length === 0) {
      throw new ImgxError(
        `Invalid parameter "${rawParam}" in --use ${expression}. Expected key=value.`,
        EXIT_CODES.INVALID_INPUT
      );
    }
    params[key] = valueParts.join("=");
  }

  try {
    const schema = buildParamSchema(definition);
    const normalized = schema.parse(coerceParams(params, definition.params.map((param) => ({ ...param })))) as Record<
      string,
      string | number | boolean
    >;
    return { name, params: normalized };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ImgxError(
        `Invalid parameters for ability "${name}": ${error.issues.map((issue) => issue.message).join("; ")}`,
        EXIT_CODES.INVALID_INPUT
      );
    }
    throw error;
  }
}

function coerceParams(
  params: Record<string, string | number | boolean>,
  definitions: Array<{ name: string; type: string }>
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  const byName = new Map(definitions.map((definition) => [definition.name, definition]));
  for (const [key, rawValue] of Object.entries(params)) {
    const definition = byName.get(key);
    if (!definition) {
      result[key] = rawValue;
      continue;
    }
    if (typeof rawValue !== "string") {
      result[key] = rawValue;
      continue;
    }
    switch (definition.type) {
      case "integer":
        result[key] = Number.parseInt(rawValue, 10);
        break;
      case "number":
        result[key] = Number.parseFloat(rawValue);
        break;
      case "boolean":
        result[key] = rawValue === "true";
        break;
      default:
        result[key] = rawValue;
        break;
    }
  }
  return result;
}

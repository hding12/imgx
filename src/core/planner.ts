import { abilityRegistry, getAbility, phaseOrder } from "../abilities/registry.js";
import type { AbilityUse, JobSpec, ResolvedPipeline } from "./types.js";
import { ImgxError } from "./errors.js";
import { EXIT_CODES } from "./exit-codes.js";

const defaultOutputs = {
  overwrite: false,
  keepStructure: false
} as const;

export function sortUsesByPhase(uses: AbilityUse[]): AbilityUse[] {
  return [...uses].sort((left, right) => {
    const leftAbility = getAbility(left.name);
    const rightAbility = getAbility(right.name);
    return phaseOrder.indexOf(leftAbility?.phase ?? "inspect") - phaseOrder.indexOf(rightAbility?.phase ?? "inspect");
  });
}

export function resolvePipeline(spec: JobSpec): ResolvedPipeline {
  const phaseUses = Object.fromEntries(phaseOrder.map((phase) => [phase, [] as AbilityUse[]])) as ResolvedPipeline["phaseUses"];
  const orderedUses = sortUsesByPhase(spec.uses);
  const selected = new Set<string>();
  const exclusive = new Map<string, string>();

  const pipeline: ResolvedPipeline = {
    phaseUses,
    outputs: { ...defaultOutputs, ...spec.outputs },
    report: { ...spec.report },
    failFast: spec.failFast ?? false,
    skipIfLarger: false,
    metadataMode: "none",
    keepTimestamps: false,
    copySourceDates: false,
    auditMetaDiff: false,
    keepAlpha: false
  };

  for (const use of orderedUses) {
    const ability = getAbility(use.name);
    if (!ability) {
      throw new ImgxError(`Unknown ability "${use.name}".`, EXIT_CODES.INVALID_INPUT);
    }
    if (ability.exclusiveGroup) {
      const existing = exclusive.get(ability.exclusiveGroup);
      if (existing && existing !== ability.name) {
        throw new ImgxError(
          `Ability "${ability.name}" conflicts with "${existing}" in exclusive group "${ability.exclusiveGroup}".`,
          EXIT_CODES.INVALID_INPUT
        );
      }
      exclusive.set(ability.exclusiveGroup, ability.name);
    }
    for (const conflict of ability.conflicts ?? []) {
      if (selected.has(conflict)) {
        throw new ImgxError(
          `Ability "${ability.name}" conflicts with "${conflict}".`,
          EXIT_CODES.INVALID_INPUT
        );
      }
    }
    selected.add(ability.name);
    phaseUses[ability.phase].push(use);
    applyAbilityToPipeline(pipeline, use);
  }

  if (selected.has("target-max-bytes") && pipeline.format === "png" && !selected.has("png-quantize")) {
    throw new ImgxError(
      "target-max-bytes requires png-quantize when the final format is PNG.",
      EXIT_CODES.INVALID_INPUT
    );
  }
  if (selected.has("lossless-webp") && pipeline.format !== "webp") {
    throw new ImgxError("lossless-webp requires to-webp.", EXIT_CODES.INVALID_INPUT);
  }
  if (selected.has("jpg-quality") && pipeline.format && pipeline.format !== "jpg") {
    throw new ImgxError("jpg-quality can only be used with to-jpg.", EXIT_CODES.INVALID_INPUT);
  }
  if (selected.has("webp-quality") && pipeline.format && pipeline.format !== "webp") {
    throw new ImgxError("webp-quality can only be used with to-webp.", EXIT_CODES.INVALID_INPUT);
  }
  if (selected.has("png-quantize") && pipeline.format && pipeline.format !== "png") {
    throw new ImgxError("png-quantize can only be used with to-png.", EXIT_CODES.INVALID_INPUT);
  }

  return pipeline;
}

function applyAbilityToPipeline(pipeline: ResolvedPipeline, use: AbilityUse): void {
  switch (use.name) {
    case "to-jpg":
      pipeline.format = "jpg";
      break;
    case "to-png":
      pipeline.format = "png";
      break;
    case "to-webp":
      pipeline.format = "webp";
      break;
    case "skip-if-larger":
      pipeline.skipIfLarger = true;
      break;
    case "target-max-bytes":
      pipeline.targetMaxBytes = Number(use.params.bytes);
      break;
    case "strip-all-meta":
      pipeline.metadataMode = "strip-all-meta";
      break;
    case "keep-basic-meta":
      pipeline.metadataMode = "keep-basic-meta";
      break;
    case "keep-timestamps":
      pipeline.keepTimestamps = true;
      break;
    case "copy-source-dates":
      pipeline.copySourceDates = true;
      break;
    case "audit-meta-diff":
      pipeline.auditMetaDiff = true;
      break;
    case "keep-alpha":
      pipeline.keepAlpha = true;
      break;
    case "drop-alpha-with-bg":
      pipeline.dropAlphaWithBg = String(use.params.background ?? "#ffffff");
      break;
    case "flatten-bg":
      pipeline.flattenBg = String(use.params.background ?? "#ffffff");
      break;
    case "out-dir":
      pipeline.outputs.outDir = String(use.params.path);
      break;
    case "suffix":
      pipeline.outputs.suffix = String(use.params.value);
      break;
    case "overwrite":
      pipeline.outputs.overwrite = Boolean(use.params.enabled ?? true);
      break;
    case "keep-structure":
      pipeline.outputs.keepStructure = Boolean(use.params.enabled ?? true);
      break;
    case "report-json":
      pipeline.report.path = String(use.params.path);
      pipeline.report.json = true;
      break;
    default:
      break;
  }
}

export function requiredToolsForUses(uses: AbilityUse[]): string[] {
  const required = new Set<string>();
  for (const use of uses) {
    const ability = getAbility(use.name);
    for (const dependency of ability?.dependencies ?? []) {
      required.add(dependency);
    }
  }
  return [...required];
}

export function listAbilities() {
  return abilityRegistry;
}

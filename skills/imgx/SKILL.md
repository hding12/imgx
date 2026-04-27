---
name: imgx
description: Deterministic image-processing skill for the imgx CLI. Use when Codex or Claude needs to inspect image files, resize/crop/pad them, preserve or flatten alpha, convert between JPG/PNG/WebP, strip or preserve metadata, enforce file-size budgets, or batch-export web-share, avatar, marketplace, or privacy-clean assets by driving imgx through JobSpec JSON instead of ad-hoc image commands.
---

# Imgx

## Overview

Use this skill to drive `imgx` as a deterministic image-processing pipeline. Prefer it when the request can be satisfied by repeatable CLI transforms rather than manual editor work.

## Quick Start

1. Run `scripts/imgx-bridge.sh doctor --json` before promising work that depends on `vips`, `exiftool`, `pngquant`, or `cwebp`.
2. Run `scripts/imgx-bridge.sh inspect <inputs...> --json` when width, height, orientation, alpha, or metadata facts are still unknown.
3. Translate the user request into a `JobSpec`.
4. Pipe the spec to `scripts/imgx-bridge.sh run --spec - --json`.
5. Read the JSON result before reporting success. Surface `status`, per-item `warnings`, `error`, and `metadataDiff` instead of collapsing them into prose.

If this skill is copied outside the `imgx` repository, either keep `imgx` on `PATH` or export `IMGX_BIN=/absolute/path/to/imgx` so the bridge script can find the CLI.

## Workflow

### Check tools and source facts first

- Run `doctor` first when the task depends on a specific encoder or metadata tool.
- Run `inspect` before choosing geometry, output format, or metadata policy when the source file is not already understood.
- Add `--use inspect-capability` only when the tool snapshot itself needs to be returned with the inspect payload.
- Do not infer alpha handling, EXIF orientation, or source dimensions from the filename alone.

### Build a minimal `JobSpec`

Use this shape:

```json
{
  "inputs": ["/absolute/or/relative/input.png"],
  "uses": [
    { "name": "autorotate", "params": {} },
    { "name": "fit-contain", "params": { "width": 1600, "height": 1600, "background": "#ffffff" } },
    { "name": "strip-all-meta", "params": {} },
    { "name": "to-jpg", "params": {} },
    { "name": "jpg-quality", "params": { "quality": 88 } }
  ],
  "outputs": {
    "outDir": "dist"
  }
}
```

- Keep `uses` minimal; add only the abilities the request truly needs.
- Prefer `outputs.outDir` for batch work.
- Add `report.path` only when another tool or automation needs a report written to disk.
- Use `failFast` only when later items would be misleading or destructive after one failure.

### Choose abilities conservatively

- Pick exactly one primary geometry ability from `resize-long-edge`, `resize-short-edge`, `fit-contain`, or `fit-cover`.
- Pick exactly one final format from `to-jpg`, `to-png`, or `to-webp`.
- Add `flatten-bg` or `drop-alpha-with-bg` before `to-jpg` when the source may contain transparency.
- Pair `target-max-bytes` with JPG or WebP directly; for PNG, add `png-quantize`.
- Use `normalize-filename` for marketplace or batch exports where filenames matter.
- Use `skip-if-larger` when the user wants optimization without accepting bigger outputs.
- Use `keep-structure` only for multi-file runs where relative directory layout matters downstream.

### Map common requests to pipelines

- Web share or social upload: `autorotate`, `to-srgb`, `resize-long-edge`, `strip-all-meta`, `to-webp`, `webp-quality`, `skip-if-larger`.
- White-background marketplace hero: `autorotate`, `fit-contain` with white background, `strip-all-meta`, `to-jpg`, `jpg-quality`.
- Square avatar: `autorotate`, `fit-cover`, `to-srgb`, `strip-all-meta`, then `to-webp` or `to-jpg`.
- Transparent logo or UI asset: `trim-transparent-edges`, optional resize, `keep-alpha`, then `to-png` or `to-webp`; add `lossless-webp` when fidelity matters more than size.
- Privacy-clean export: `inspect-meta`, `strip-gps`, then either `keep-basic-meta` or `strip-all-meta`; add `audit-meta-diff` when the user wants evidence of what changed.

### Report outcomes honestly

- Exit code `0` means all items succeeded.
- Exit code `2` means partial success; keep the successful items and report the failures.
- Exit code `3` means invalid spec or illegal ability composition.
- Exit code `4` means a required external dependency is missing.
- Exit code `5` means processing failed after the spec passed validation.
- Do not hide `skipped_larger` results, metadata diffs, or warnings just to make the run sound cleaner.

## Boundaries

- Do not promise edits that `imgx` does not implement, such as semantic background removal, object inpainting, beauty retouching, or free-form color grading.
- When the user asks for unsupported edits, say that `imgx` covers deterministic geometry, encoding, alpha, and metadata workflows, then propose a different tool instead of inventing an ability.
- Make assumptions only when they are low-risk. Geometry, background color, final format, and metadata retention are high-impact and should be explicit in the spec.

## References

- Read `references/bridge-contract.md` for the stable CLI bridge and exit-code contract.
- Read `references/abilities.md` for the full ability table and composition rules.
- Read `references/examples.md` for common natural-language requests mapped to `JobSpec` examples.

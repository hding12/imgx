# imgx

`imgx` is a deterministic image-processing CLI for agents, automation layers, and scripted pipelines. It exposes atomic abilities instead of opaque presets, and it keeps the execution contract stable through `JobSpec` JSON, structured results, fixed phase ordering, and explicit exit codes.

Release history lives in [`CHANGELOG.md`](./CHANGELOG.md). Contribution guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md). Release guide: [`docs/release-process.md`](./docs/release-process.md).

## Scope

`imgx` is designed for repeatable image-processing operations that can be expressed as explicit pipeline stages:

- source inspection
- orientation normalization
- color-space normalization
- resizing, cropping, canvas padding, and alpha flattening
- final encoding to JPG, PNG, or WebP
- size optimization and quality control
- metadata removal, preservation, copying, and diffing
- deterministic output routing and report generation

The processing core is intentionally non-semantic. `imgx` does not implement background removal, object-aware retouching, inpainting, beauty filters, or other content-aware edits.

## Toolchain

`imgx` orchestrates four host tools with fixed responsibilities:

- `libvips`: pixel transforms, geometry, color-space conversion, and standard encoding
- `ExifTool`: metadata read, write, copy, and audit operations
- `pngquant`: PNG quantization
- `cwebp`: WebP encoding

The binaries remain external system dependencies. `imgx` does not redistribute them.

## Installation

### System Dependencies

macOS:

```bash
brew install vips exiftool pngquant webp
```

Ubuntu / Debian:

```bash
sudo apt-get install libvips-tools libimage-exiftool-perl pngquant webp
```

### Build From Source

```bash
git clone git@github.com:hding12/imgx.git
cd imgx
npm install
npm run build
```

The current release channel is GitHub Releases. Build from source unless you already have `imgx` installed on `PATH`.

In a source checkout, use `node dist/cli.js`. If `imgx` is already installed on `PATH`, substitute `imgx` for `node dist/cli.js` in the commands below.

## CLI Surface

```text
imgx ability list [--json]
imgx ability show <name> [--json]
imgx doctor [--json]
imgx inspect <inputs...> [--json]
imgx run <inputs...> --use <ability[,key=value...]>...
imgx run --spec <file|-> [--dry-run] [--json]
```

Command roles:

- `ability`: inspect the registry-backed ability catalog
- `doctor`: inspect tool availability and version-dependent capability
- `inspect`: read source file facts and metadata before planning a run
- `run`: execute a validated pipeline from CLI flags or `JobSpec`

## Execution Model

The caller cannot reorder phases. `imgx` executes a pipeline in this fixed order:

```text
inspect -> normalize -> geometry -> alpha-policy -> encode -> optimize -> metadata -> output
```

Core composition constraints:

- exactly one primary geometry ability from `resize-long-edge`, `resize-short-edge`, `fit-contain`, or `fit-cover`
- exactly one final format from `to-jpg`, `to-png`, or `to-webp`
- `to-jpg` requires `flatten-bg` or `drop-alpha-with-bg` when alpha is present
- `target-max-bytes` works directly with JPG and WebP; PNG requires `png-quantize`

## Atomic Abilities

<!-- ABILITY_TABLE_START -->
| Ability | Phase | Dependencies | Parameters | Summary |
| --- | --- | --- | --- | --- |
| `inspect-basic` | `inspect` | `vips`, `exiftool` | - | Read width, height, format, alpha, orientation, and file size. |
| `inspect-meta` | `inspect` | `exiftool` | - | Read EXIF, XMP, IPTC, and GPS metadata. |
| `inspect-capability` | `inspect` | `vips`, `exiftool`, `pngquant`, `cwebp` | - | Report tool availability and output capabilities. |
| `autorotate` | `normalize` | `vips` | - | Rotate pixels using EXIF orientation and clear the flag. |
| `to-srgb` | `normalize` | `vips` | - | Move output pixels into sRGB. |
| `strip-orientation-tag` | `normalize` | `exiftool` | - | Delete EXIF orientation tag after pixel rotation. |
| `normalize-filename` | `normalize` | - | - | Normalize the output filename to ASCII kebab-case. |
| `resize-long-edge` | `geometry` | `vips` | pixels:integer | Resize so the longest edge matches a target. |
| `resize-short-edge` | `geometry` | `vips` | pixels:integer | Resize so the shortest edge matches a target. |
| `fit-contain` | `geometry` | `vips` | width:integer, height:integer, background?:color | Resize inside a box and pad to the exact canvas. |
| `fit-cover` | `geometry` | `vips` | width:integer, height:integer | Resize and crop to fill a target box. |
| `pad-canvas` | `geometry` | `vips` | width:integer, height:integer, background?:color | Place the current image on a larger canvas. |
| `crop-center` | `geometry` | `vips` | width:integer, height:integer | Crop the center rectangle from the current image. |
| `flatten-bg` | `geometry` | `vips` | background?:color | Flatten alpha onto a solid color. |
| `to-jpg` | `encode` | `vips` | - | Encode the final image as JPEG. |
| `to-png` | `encode` | `vips` | - | Encode the final image as PNG. |
| `to-webp` | `encode` | `cwebp` | - | Encode the final image as WebP. |
| `keep-alpha` | `alpha-policy` | - | - | Preserve transparency in the final image. |
| `drop-alpha-with-bg` | `alpha-policy` | `vips` | background?:color | Flatten transparency only when the source has alpha. |
| `jpg-quality` | `optimize` | `vips` | quality:integer | Set libvips JPEG quality. |
| `png-quantize` | `optimize` | `pngquant` | qualityMin?:integer, qualityMax?:integer, speed?:integer | Quantize PNG output with pngquant. |
| `webp-quality` | `optimize` | `cwebp` | quality:number | Set cwebp quality. |
| `skip-if-larger` | `optimize` | - | - | Drop outputs that are not smaller than the source. |
| `target-max-bytes` | `optimize` | - | bytes:integer | Search quality values to fit under a file-size budget. |
| `lossless-webp` | `optimize` | `cwebp` | - | Use cwebp lossless mode. |
| `strip-all-meta` | `metadata` | `exiftool` | - | Remove all metadata from the output. |
| `keep-basic-meta` | `metadata` | `exiftool` | - | Copy a small fixed metadata whitelist from the source. |
| `strip-gps` | `metadata` | `exiftool` | - | Delete GPS metadata from the output. |
| `keep-timestamps` | `metadata` | - | - | Preserve filesystem timestamps from the source file. |
| `copy-source-dates` | `metadata` | `exiftool` | - | Copy source capture timestamps into the result metadata. |
| `audit-meta-diff` | `metadata` | `exiftool` | - | Emit a metadata diff between source and result. |
| `out-dir` | `output` | - | path:path | Write output files into a target directory. |
| `suffix` | `output` | - | value:string | Append a suffix to the output basename. |
| `overwrite` | `output` | - | enabled?:boolean | Allow replacing existing files. |
| `keep-structure` | `output` | - | enabled?:boolean | Preserve relative source directories inside the output directory. |
| `report-json` | `output` | - | path:path | Write a JSON report file to disk. |
<!-- ABILITY_TABLE_END -->

## Machine Contract

For agent-driven execution, prefer:

```bash
cat spec.json | node dist/cli.js run --spec - --json
```

Contract rules:

- send a valid `JobSpec` document to `stdin`
- read only JSON from `stdout`
- keep human-readable progress and warnings on `stderr`
- treat exit codes as part of the stable interface

Exit codes:

- `0`: all items succeeded
- `2`: partial success
- `3`: invalid spec or illegal ability composition
- `4`: missing external dependency
- `5`: processing failure

Related artifacts:

- [`job-spec.schema.json`](./job-spec.schema.json): generated schema for `JobSpec`
- [`docs/skill-bridge.md`](./docs/skill-bridge.md): concise machine-caller contract
- [`docs/generated/abilities-table.md`](./docs/generated/abilities-table.md): generated ability table source

## Example `JobSpec`

```json
{
  "inputs": ["fixtures/input.png"],
  "uses": [
    { "name": "autorotate", "params": {} },
    { "name": "to-srgb", "params": {} },
    { "name": "resize-long-edge", "params": { "pixels": 1600 } },
    { "name": "strip-all-meta", "params": {} },
    { "name": "to-webp", "params": {} },
    { "name": "webp-quality", "params": { "quality": 82 } }
  ],
  "outputs": {
    "outDir": "dist"
  },
  "report": {
    "json": true,
    "path": "dist/report.json"
  },
  "failFast": false
}
```

## Skill Package

[`skills/imgx`](./skills/imgx) packages `imgx` as an agent-facing skill bundle.

Key files:

- `SKILL.md`: workflow and ability-selection guidance
- `agents/openai.yaml`: agent-facing metadata
- `CLAUDE.md`: alternate entry note
- `scripts/imgx-bridge.sh`: stable wrapper that resolves the local build, local npm binary, or `imgx` on `PATH`

The skill contract mirrors the CLI contract described above: run `doctor`, optionally `inspect`, then execute `run --spec - --json`.

## Repository References

- [`examples/specs`](./examples/specs): example `JobSpec` payloads
- [`docs/test-matrix.md`](./docs/test-matrix.md): README-facing verification matrix
- [`CONTRIBUTING.md`](./CONTRIBUTING.md): contribution rules and documentation responsibilities
- [`docs/release-process.md`](./docs/release-process.md): versioning and GitHub Release workflow

## License

MIT for `imgx` itself. External binaries keep their original licenses.

# Abilities

## Full Ability Table

| Ability | Phase | Dependencies | Parameters | Summary |
| --- | --- | --- | --- | --- |
| `inspect-basic` | `inspect` | `vips`, `exiftool` | - | Read width, height, format, alpha, orientation, and file size. |
| `inspect-meta` | `inspect` | `exiftool` | - | Read EXIF, XMP, IPTC, and GPS metadata. |
| `inspect-capability` | `inspect` | `vips`, `exiftool`, `pngquant`, `cwebp` | - | Report tool availability and output capabilities. |
| `autorotate` | `normalize` | `vips` | - | Rotate pixels using EXIF orientation and clear the flag. |
| `to-srgb` | `normalize` | `vips` | - | Move output pixels into sRGB. |
| `strip-orientation-tag` | `normalize` | `exiftool` | - | Delete EXIF orientation tag after pixel rotation. |
| `normalize-filename` | `normalize` | - | - | Normalize the output filename to ASCII kebab-case. |
| `resize-long-edge` | `geometry` | `vips` | `pixels:integer` | Resize so the longest edge matches a target. |
| `resize-short-edge` | `geometry` | `vips` | `pixels:integer` | Resize so the shortest edge matches a target. |
| `fit-contain` | `geometry` | `vips` | `width:integer`, `height:integer`, `background?:color` | Resize inside a box and pad to the exact canvas. |
| `fit-cover` | `geometry` | `vips` | `width:integer`, `height:integer` | Resize and crop to fill a target box. |
| `pad-canvas` | `geometry` | `vips` | `width:integer`, `height:integer`, `background?:color` | Place the current image on a larger canvas. |
| `crop-center` | `geometry` | `vips` | `width:integer`, `height:integer` | Crop the center rectangle from the current image. |
| `trim-transparent-edges` | `geometry` | `vips` | - | Trim only the outer fully transparent border. |
| `flatten-bg` | `geometry` | `vips` | `background?:color` | Flatten alpha onto a solid color. |
| `to-jpg` | `encode` | `vips` | - | Encode the final image as JPEG. |
| `to-png` | `encode` | `vips` | - | Encode the final image as PNG. |
| `to-webp` | `encode` | `cwebp` | - | Encode the final image as WebP. |
| `keep-alpha` | `alpha-policy` | - | - | Preserve transparency in the final image. |
| `drop-alpha-with-bg` | `alpha-policy` | `vips` | `background?:color` | Flatten transparency only when the source has alpha. |
| `jpg-quality` | `optimize` | `vips` | `quality:integer` | Set libvips JPEG quality. |
| `png-quantize` | `optimize` | `pngquant` | `qualityMin?:integer`, `qualityMax?:integer`, `speed?:integer` | Quantize PNG output with pngquant. |
| `webp-quality` | `optimize` | `cwebp` | `quality:number` | Set cwebp quality. |
| `skip-if-larger` | `optimize` | - | - | Drop outputs that are not smaller than the source. |
| `target-max-bytes` | `optimize` | - | `bytes:integer` | Search quality values to fit under a file-size budget. |
| `lossless-webp` | `optimize` | `cwebp` | - | Use cwebp lossless mode. |
| `strip-all-meta` | `metadata` | `exiftool` | - | Remove all metadata from the output. |
| `keep-basic-meta` | `metadata` | `exiftool` | - | Copy a small fixed metadata whitelist from the source. |
| `strip-gps` | `metadata` | `exiftool` | - | Delete GPS metadata from the output. |
| `keep-timestamps` | `metadata` | - | - | Preserve filesystem timestamps from the source file. |
| `copy-source-dates` | `metadata` | `exiftool` | - | Copy source capture timestamps into the result metadata. |
| `audit-meta-diff` | `metadata` | `exiftool` | - | Emit a metadata diff between source and result. |
| `out-dir` | `output` | - | `path:path` | Write output files into a target directory. |
| `suffix` | `output` | - | `value:string` | Append a suffix to the output basename. |
| `overwrite` | `output` | - | `enabled?:boolean` | Allow replacing existing files. |
| `keep-structure` | `output` | - | `enabled?:boolean` | Preserve relative source directories inside the output directory. |
| `report-json` | `output` | - | `path:path` | Write a JSON report file to disk. |

## Composition Rules

- Use repeated `--use name,key=value` flags only for human-driven CLI calls. Prefer `JobSpec` JSON for skill-driven runs.
- Execution order is fixed by phase and cannot be reordered by the caller.
- Select only one primary geometry ability from `resize-long-edge`, `resize-short-edge`, `fit-contain`, or `fit-cover`.
- Select only one final format from `to-jpg`, `to-png`, or `to-webp`.
- `to-jpg` fails on alpha input unless `flatten-bg` or `drop-alpha-with-bg` is present.
- `target-max-bytes` supports JPG and WebP directly; PNG requires `png-quantize`.

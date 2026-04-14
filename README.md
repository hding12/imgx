# imgx

`imgx` 是一个面向个人与电商常见场景的确定性图像处理 CLI。它不内置“电商主图”这类场景预设，而是提供一组可组合的原子能力，供人类与 AI 以同一套接口稳定调用。

`imgx` is a deterministic image processing CLI for common personal and commerce workflows. It exposes composable atomic abilities instead of opaque scenario presets, so humans and future AI skills can drive the same pipeline surface.

## Why This Exists

- 用 `libvips` 负责像素处理与编码前标准化
- 用 `ExifTool` 负责元数据读取、清理、拷贝与审计
- 用 `pngquant` 负责 PNG 终态量化
- 用 `cwebp` 负责 WebP 终态编码
- CLI 和未来 skill 共用 `JobSpec` JSON 接口

## Install / 安装

```bash
npm install -g imgx
```

`imgx` itself is distributed as an npm package. External image binaries stay as system dependencies and are not bundled.

macOS:

```bash
brew install vips exiftool pngquant webp
```

Ubuntu / Debian:

```bash
sudo apt-get install libvips-tools libimage-exiftool-perl pngquant webp
```

### Why Binaries Are External / 为什么外部依赖不打包

- `imgx` keeps installation and licensing boundaries explicit.
- `pngquant` uses a GPL/commercial dual-license model, so `imgx` intentionally treats it as a host dependency rather than redistributing its binary.
- This keeps the CLI small, cross-platform friendly, and easier to wrap as a future AI skill.

## doctor

```bash
imgx doctor
imgx doctor --use to-webp --use webp-quality,quality=82 --json
```

## Atomic Abilities / 原子能力

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

## Composition Rules / 组合规则

- Use repeated `--use name,key=value` flags.
- Execution order is fixed by phase and cannot be reordered by the caller.
- Only one primary geometry ability may be selected from `resize-long-edge`, `resize-short-edge`, `fit-contain`, `fit-cover`.
- Only one final format may be selected from `to-jpg`, `to-png`, `to-webp`.
- `to-jpg` fails on alpha input unless `flatten-bg` or `drop-alpha-with-bg` is present.
- `target-max-bytes` supports JPG and WebP directly; PNG requires `png-quantize`.

## Common High-Frequency Combinations / 高频组合

网页分享图 / Web share image:

```bash
imgx run photo.jpg \
  --use autorotate \
  --use to-srgb \
  --use resize-long-edge,pixels=2048 \
  --use strip-all-meta \
  --use to-webp \
  --use webp-quality,quality=82 \
  --use skip-if-larger
```

头像方图 / Avatar square crop:

```bash
imgx run portrait.jpg \
  --use autorotate \
  --use fit-cover,width=1024,height=1024 \
  --use to-srgb \
  --use strip-all-meta \
  --use normalize-filename \
  --use to-webp \
  --use webp-quality,quality=85
```

电商白底主图 / Commerce white-background hero image:

```bash
imgx run product.png \
  --use autorotate \
  --use fit-contain,width=1600,height=1600,background=#ffffff \
  --use strip-all-meta \
  --use to-jpg \
  --use jpg-quality,quality=88
```

透明素材导出 / Transparent asset export:

```bash
imgx run logo.png \
  --use autorotate \
  --use resize-long-edge,pixels=1800 \
  --use keep-alpha \
  --use to-webp \
  --use lossless-webp
```

隐私清理导出 / Privacy-clean export:

```bash
imgx run photo.jpg \
  --use inspect-meta \
  --use strip-gps \
  --use keep-basic-meta \
  --use to-webp \
  --use webp-quality,quality=80 \
  --use audit-meta-diff
```

批量平台出图 / Batch marketplace export:

```bash
imgx run assets/*.png \
  --use normalize-filename \
  --use fit-contain,width=1200,height=1200,background=#ffffff \
  --use to-jpg \
  --use jpg-quality,quality=86 \
  --use out-dir,path=dist/marketplace \
  --use keep-structure \
  --use report-json,path=dist/marketplace/report.json
```

## JSON Spec

```json
{
  "inputs": ["fixtures/product.png"],
  "uses": [
    { "name": "autorotate", "params": {} },
    { "name": "fit-contain", "params": { "width": 1600, "height": 1600, "background": "#ffffff" } },
    { "name": "to-jpg", "params": {} },
    { "name": "jpg-quality", "params": { "quality": 88 } }
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

Run with:

```bash
imgx run --spec spec.json --json
cat spec.json | imgx run --spec - --json
```

## Examples / 示例

Ready-to-run JSON specs live in [`examples/specs`](./examples/specs).

## Future Skill Compatibility / 未来 Skill 兼容

- Machine callers should prefer `imgx run --spec - --json`
- `job-spec.schema.json` is generated from the same registry as the CLI
- `docs/skill-bridge.md` documents stdout/stderr and exit-code expectations

## License

MIT for `imgx` itself. External binaries keep their original licenses.

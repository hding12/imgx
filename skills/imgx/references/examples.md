# Examples

## White-Background Marketplace Hero

Request:

> Make this product image a 1600x1600 white-background JPG for a marketplace listing.

`JobSpec`:

```json
{
  "inputs": ["tests/fixtures/product-tall.png"],
  "uses": [
    { "name": "autorotate", "params": {} },
    { "name": "fit-contain", "params": { "width": 1600, "height": 1600, "background": "#ffffff" } },
    { "name": "strip-all-meta", "params": {} },
    { "name": "to-jpg", "params": {} },
    { "name": "jpg-quality", "params": { "quality": 88 } }
  ],
  "outputs": {
    "outDir": "dist/examples/ecom-main"
  }
}
```

## Privacy-Clean Photo Export

Request:

> Export this photo as WebP, remove GPS data, keep only basic metadata, and show me what metadata changed.

`JobSpec`:

```json
{
  "inputs": ["tests/fixtures/oriented-photo.jpg"],
  "uses": [
    { "name": "inspect-meta", "params": {} },
    { "name": "strip-gps", "params": {} },
    { "name": "keep-basic-meta", "params": {} },
    { "name": "to-webp", "params": {} },
    { "name": "webp-quality", "params": { "quality": 80 } },
    { "name": "audit-meta-diff", "params": {} }
  ],
  "outputs": {
    "outDir": "dist/examples/privacy-clean"
  }
}
```

## Transparent Asset Export

Request:

> Resize this logo for the web, keep transparency, and produce a lossless WebP.

`JobSpec`:

```json
{
  "inputs": ["tests/fixtures/transparent-logo.png"],
  "uses": [
    { "name": "autorotate", "params": {} },
    { "name": "resize-long-edge", "params": { "pixels": 1800 } },
    { "name": "keep-alpha", "params": {} },
    { "name": "to-webp", "params": {} },
    { "name": "lossless-webp", "params": {} }
  ],
  "outputs": {
    "outDir": "dist/examples/transparent-asset"
  }
}
```

## Web Share Export

Request:

> Make this photo easier to share online: rotate it correctly, cap the longest edge at 2048, strip metadata, convert to WebP, and avoid keeping it if the result is larger.

`JobSpec`:

```json
{
  "inputs": ["tests/fixtures/oriented-photo.jpg"],
  "uses": [
    { "name": "autorotate", "params": {} },
    { "name": "to-srgb", "params": {} },
    { "name": "resize-long-edge", "params": { "pixels": 2048 } },
    { "name": "strip-all-meta", "params": {} },
    { "name": "to-webp", "params": {} },
    { "name": "webp-quality", "params": { "quality": 82 } },
    { "name": "skip-if-larger", "params": {} }
  ],
  "outputs": {
    "outDir": "dist/examples/web-share"
  }
}
```

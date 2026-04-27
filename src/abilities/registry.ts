import { z } from "zod";

export const phaseOrder = [
  "inspect",
  "normalize",
  "geometry",
  "alpha-policy",
  "encode",
  "optimize",
  "metadata",
  "output"
] as const;

export type AbilityPhase = (typeof phaseOrder)[number];
export type ToolName = "vips" | "exiftool" | "pngquant" | "cwebp";
export type ParamType = "string" | "integer" | "number" | "boolean" | "color" | "path";

export interface AbilityParamDefinition {
  name: string;
  type: ParamType;
  description: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  allowedValues?: readonly string[];
}

export interface AbilityDefinition {
  name: string;
  phase: AbilityPhase;
  summary: string;
  description: string;
  params: readonly AbilityParamDefinition[];
  dependencies: readonly ToolName[];
  exclusiveGroup?: string;
  conflicts?: readonly string[];
}

const intParam = (
  name: string,
  description: string,
  options: Partial<AbilityParamDefinition> = {}
): AbilityParamDefinition => ({
  name,
  type: "integer",
  description,
  ...options
});

const numberParam = (
  name: string,
  description: string,
  options: Partial<AbilityParamDefinition> = {}
): AbilityParamDefinition => ({
  name,
  type: "number",
  description,
  ...options
});

const stringParam = (
  name: string,
  description: string,
  options: Partial<AbilityParamDefinition> = {}
): AbilityParamDefinition => ({
  name,
  type: "string",
  description,
  ...options
});

const boolParam = (
  name: string,
  description: string,
  options: Partial<AbilityParamDefinition> = {}
): AbilityParamDefinition => ({
  name,
  type: "boolean",
  description,
  ...options
});

const colorParam = (
  name: string,
  description: string,
  options: Partial<AbilityParamDefinition> = {}
): AbilityParamDefinition => ({
  name,
  type: "color",
  description,
  ...options
});

const pathParam = (
  name: string,
  description: string,
  options: Partial<AbilityParamDefinition> = {}
): AbilityParamDefinition => ({
  name,
  type: "path",
  description,
  ...options
});

export const abilityRegistry: readonly AbilityDefinition[] = [
  {
    name: "inspect-basic",
    phase: "inspect",
    summary: "Read width, height, format, alpha, orientation, and file size.",
    description: "Collect baseline image facts for humans, automations, and validation rules.",
    params: [],
    dependencies: ["vips", "exiftool"]
  },
  {
    name: "inspect-meta",
    phase: "inspect",
    summary: "Read EXIF, XMP, IPTC, and GPS metadata.",
    description: "Collect structured metadata for audit and privacy workflows.",
    params: [],
    dependencies: ["exiftool"]
  },
  {
    name: "inspect-capability",
    phase: "inspect",
    summary: "Report tool availability and output capabilities.",
    description: "Expose which external binaries and saver formats are available on the host.",
    params: [],
    dependencies: ["vips", "exiftool", "pngquant", "cwebp"]
  },
  {
    name: "autorotate",
    phase: "normalize",
    summary: "Rotate pixels using EXIF orientation and clear the flag.",
    description: "Normalizes source orientation before later geometry steps.",
    params: [],
    dependencies: ["vips"]
  },
  {
    name: "to-srgb",
    phase: "normalize",
    summary: "Move output pixels into sRGB.",
    description: "Applies a deterministic output color space for web and marketplace use.",
    params: [],
    dependencies: ["vips"]
  },
  {
    name: "strip-orientation-tag",
    phase: "normalize",
    summary: "Delete EXIF orientation tag after pixel rotation.",
    description: "Prevents downstream tools from applying orientation again.",
    params: [],
    dependencies: ["exiftool"]
  },
  {
    name: "normalize-filename",
    phase: "normalize",
    summary: "Normalize the output filename to ASCII kebab-case.",
    description: "Removes spaces and unstable casing from the generated filename.",
    params: [],
    dependencies: []
  },
  {
    name: "resize-long-edge",
    phase: "geometry",
    summary: "Resize so the longest edge matches a target.",
    description: "Scales down to a bounding square without cropping.",
    params: [intParam("pixels", "Target maximum long edge in pixels.", { required: true })],
    dependencies: ["vips"],
    exclusiveGroup: "primary-geometry"
  },
  {
    name: "resize-short-edge",
    phase: "geometry",
    summary: "Resize so the shortest edge matches a target.",
    description: "Scales proportionally based on the image orientation.",
    params: [intParam("pixels", "Target minimum short edge in pixels.", { required: true })],
    dependencies: ["vips"],
    exclusiveGroup: "primary-geometry"
  },
  {
    name: "fit-contain",
    phase: "geometry",
    summary: "Resize inside a box and pad to the exact canvas.",
    description: "Preserves the full image while producing a fixed-size canvas.",
    params: [
      intParam("width", "Target width in pixels.", { required: true }),
      intParam("height", "Target height in pixels.", { required: true }),
      colorParam("background", "Padding color.", { defaultValue: "#ffffff" })
    ],
    dependencies: ["vips"],
    exclusiveGroup: "primary-geometry"
  },
  {
    name: "fit-cover",
    phase: "geometry",
    summary: "Resize and crop to fill a target box.",
    description: "Creates a fixed-size frame by center cropping after resize.",
    params: [
      intParam("width", "Target width in pixels.", { required: true }),
      intParam("height", "Target height in pixels.", { required: true })
    ],
    dependencies: ["vips"],
    exclusiveGroup: "primary-geometry"
  },
  {
    name: "pad-canvas",
    phase: "geometry",
    summary: "Place the current image on a larger canvas.",
    description: "Expands the frame around the current pixels without scaling.",
    params: [
      intParam("width", "Canvas width in pixels.", { required: true }),
      intParam("height", "Canvas height in pixels.", { required: true }),
      colorParam("background", "Canvas background color.", { defaultValue: "#ffffff" })
    ],
    dependencies: ["vips"]
  },
  {
    name: "crop-center",
    phase: "geometry",
    summary: "Crop the center rectangle from the current image.",
    description: "Trims the image to a target width and height using center gravity.",
    params: [
      intParam("width", "Crop width in pixels.", { required: true }),
      intParam("height", "Crop height in pixels.", { required: true })
    ],
    dependencies: ["vips"]
  },
  {
    name: "trim-transparent-edges",
    phase: "geometry",
    summary: "Trim only the outer fully transparent border.",
    description: "Uses the alpha channel to remove continuous transparent edges without touching internal transparent holes.",
    params: [],
    dependencies: ["vips"]
  },
  {
    name: "flatten-bg",
    phase: "geometry",
    summary: "Flatten alpha onto a solid color.",
    description: "Turns transparent pixels into a fixed background color.",
    params: [colorParam("background", "Replacement background color.", { defaultValue: "#ffffff" })],
    dependencies: ["vips"],
    conflicts: ["keep-alpha"]
  },
  {
    name: "to-jpg",
    phase: "encode",
    summary: "Encode the final image as JPEG.",
    description: "Uses libvips JPEG saver. Requires alpha to be removed before encoding.",
    params: [],
    dependencies: ["vips"],
    exclusiveGroup: "output-format",
    conflicts: ["keep-alpha"]
  },
  {
    name: "to-png",
    phase: "encode",
    summary: "Encode the final image as PNG.",
    description: "Uses libvips PNG saver for deterministic output.",
    params: [],
    dependencies: ["vips"],
    exclusiveGroup: "output-format"
  },
  {
    name: "to-webp",
    phase: "encode",
    summary: "Encode the final image as WebP.",
    description: "Uses cwebp for lossy or lossless WebP output.",
    params: [],
    dependencies: ["cwebp"],
    exclusiveGroup: "output-format"
  },
  {
    name: "keep-alpha",
    phase: "alpha-policy",
    summary: "Preserve transparency in the final image.",
    description: "Forces the pipeline to keep alpha-capable formats only.",
    params: [],
    dependencies: [],
    conflicts: ["flatten-bg", "drop-alpha-with-bg", "to-jpg"]
  },
  {
    name: "drop-alpha-with-bg",
    phase: "alpha-policy",
    summary: "Flatten transparency only when the source has alpha.",
    description: "Useful before JPEG export while leaving non-alpha sources untouched.",
    params: [colorParam("background", "Fallback background color.", { defaultValue: "#ffffff" })],
    dependencies: ["vips"],
    conflicts: ["keep-alpha"]
  },
  {
    name: "jpg-quality",
    phase: "optimize",
    summary: "Set libvips JPEG quality.",
    description: "Controls JPEG quality when the final format is JPEG.",
    params: [intParam("quality", "JPEG quality from 1 to 100.", { required: true })],
    dependencies: ["vips"]
  },
  {
    name: "png-quantize",
    phase: "optimize",
    summary: "Quantize PNG output with pngquant.",
    description: "Shrinks PNG file size using a bounded palette.",
    params: [
      intParam("qualityMin", "Minimum pngquant quality.", { defaultValue: 60 }),
      intParam("qualityMax", "Maximum pngquant quality.", { defaultValue: 85 }),
      intParam("speed", "pngquant speed preset from 1 to 11.", { defaultValue: 3 })
    ],
    dependencies: ["pngquant"]
  },
  {
    name: "webp-quality",
    phase: "optimize",
    summary: "Set cwebp quality.",
    description: "Controls lossy WebP encoding quality.",
    params: [numberParam("quality", "WebP quality from 0 to 100.", { required: true })],
    dependencies: ["cwebp"]
  },
  {
    name: "skip-if-larger",
    phase: "optimize",
    summary: "Drop outputs that are not smaller than the source.",
    description: "Prevents size regressions in automated pipelines.",
    params: [],
    dependencies: []
  },
  {
    name: "target-max-bytes",
    phase: "optimize",
    summary: "Search quality values to fit under a file-size budget.",
    description: "Supports JPEG and WebP directly, PNG only when quantization is enabled.",
    params: [intParam("bytes", "Target maximum size in bytes.", { required: true })],
    dependencies: []
  },
  {
    name: "lossless-webp",
    phase: "optimize",
    summary: "Use cwebp lossless mode.",
    description: "Switches WebP encoding from lossy to lossless.",
    params: [],
    dependencies: ["cwebp"],
    conflicts: ["webp-quality"]
  },
  {
    name: "strip-all-meta",
    phase: "metadata",
    summary: "Remove all metadata from the output.",
    description: "Produces privacy-safe web outputs without EXIF, XMP, IPTC, or GPS data.",
    params: [],
    dependencies: ["exiftool"],
    exclusiveGroup: "metadata-policy",
    conflicts: ["keep-basic-meta"]
  },
  {
    name: "keep-basic-meta",
    phase: "metadata",
    summary: "Copy a small fixed metadata whitelist from the source.",
    description: "Retains ownership and timestamp fields while dropping bulky or sensitive metadata.",
    params: [],
    dependencies: ["exiftool"],
    exclusiveGroup: "metadata-policy",
    conflicts: ["strip-all-meta"]
  },
  {
    name: "strip-gps",
    phase: "metadata",
    summary: "Delete GPS metadata from the output.",
    description: "Can be combined with keep-basic-meta to remove location while keeping authorship fields.",
    params: [],
    dependencies: ["exiftool"]
  },
  {
    name: "keep-timestamps",
    phase: "metadata",
    summary: "Preserve filesystem timestamps from the source file.",
    description: "Restores the source mtime and atime on the final output.",
    params: [],
    dependencies: []
  },
  {
    name: "copy-source-dates",
    phase: "metadata",
    summary: "Copy source capture timestamps into the result metadata.",
    description: "Copies EXIF/XMP creation dates after re-encoding.",
    params: [],
    dependencies: ["exiftool"]
  },
  {
    name: "audit-meta-diff",
    phase: "metadata",
    summary: "Emit a metadata diff between source and result.",
    description: "Includes structured metadata changes in the final run report.",
    params: [],
    dependencies: ["exiftool"]
  },
  {
    name: "out-dir",
    phase: "output",
    summary: "Write output files into a target directory.",
    description: "Overrides the default side-by-side output placement.",
    params: [pathParam("path", "Output directory path.", { required: true })],
    dependencies: []
  },
  {
    name: "suffix",
    phase: "output",
    summary: "Append a suffix to the output basename.",
    description: "Useful for distinguishing generated variants.",
    params: [stringParam("value", "Suffix appended before the extension.", { required: true })],
    dependencies: []
  },
  {
    name: "overwrite",
    phase: "output",
    summary: "Allow replacing existing files.",
    description: "Enables destructive output writes when the target already exists.",
    params: [boolParam("enabled", "Whether overwrite is enabled.", { defaultValue: true })],
    dependencies: []
  },
  {
    name: "keep-structure",
    phase: "output",
    summary: "Preserve relative source directories inside the output directory.",
    description: "Useful for batch processing nested source trees.",
    params: [boolParam("enabled", "Whether directory structure should be preserved.", { defaultValue: true })],
    dependencies: []
  },
  {
    name: "report-json",
    phase: "output",
    summary: "Write a JSON report file to disk.",
    description: "Persists the machine-readable run summary beside stdout output.",
    params: [pathParam("path", "JSON report output path.", { required: true })],
    dependencies: []
  }
] as const;

export const abilityByName = new Map(abilityRegistry.map((ability) => [ability.name, ability]));

export function getAbility(name: string): AbilityDefinition | undefined {
  return abilityByName.get(name);
}

export function buildParamSchema(definition: AbilityDefinition): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const param of definition.params) {
    let schema: z.ZodTypeAny;
    switch (param.type) {
      case "integer":
        schema = z.number().int();
        break;
      case "number":
        schema = z.number();
        break;
      case "boolean":
        schema = z.boolean();
        break;
      case "color":
      case "path":
      case "string":
      default:
        schema = z.string();
        break;
    }
    if (param.allowedValues) {
      schema = z.enum([...param.allowedValues] as [string, ...string[]]);
    }
    if (!param.required) {
      schema = schema.optional();
    }
    if (param.defaultValue !== undefined) {
      schema = schema.default(param.defaultValue);
    }
    shape[param.name] = schema;
  }
  return z.object(shape).strict();
}

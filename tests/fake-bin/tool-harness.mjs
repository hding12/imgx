#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const tool = path.basename(process.argv[1]);
const args = process.argv.slice(2);

if (tool === "vips") {
  handleVips(args);
} else if (tool === "vipsheader") {
  handleVipsHeader(args);
} else if (tool === "exiftool") {
  handleExiftool(args);
} else if (tool === "pngquant") {
  handlePngquant(args);
} else if (tool === "cwebp") {
  handleCwebp(args);
} else {
  process.stderr.write(`Unsupported fake tool ${tool}\n`);
  process.exit(1);
}

function handleVips(inputArgs) {
  if (inputArgs[0] === "--version") {
    process.stdout.write("vips-8.17.0\n");
    return;
  }
  if (inputArgs[0] === "-l" && inputArgs[1] === "foreign") {
    process.stdout.write("jpegload\npngload\nwebpload\n");
    return;
  }
  const [command, input, rawOutput, ...rest] = inputArgs;
  const output = stripOptions(rawOutput);
  const sidecar = readSidecar(input);
  const next = structuredClone(sidecar);

  switch (command) {
    case "autorot":
      if (sidecar.metadata.Orientation === "Rotate 90 CW" || sidecar.metadata.Orientation === "Rotate 270 CW") {
        [next.width, next.height] = [sidecar.height, sidecar.width];
      }
      delete next.metadata.Orientation;
      break;
    case "colourspace":
      next.interpretation = "srgb";
      break;
    case "thumbnail": {
      const width = Number(rest[0] ?? inputArgs[3]);
      const heightFlag = rest.indexOf("--height");
      const height = heightFlag >= 0 ? Number(rest[heightFlag + 1]) : width;
      const crop = rest.includes("--crop");
      if (crop) {
        next.width = width;
        next.height = height;
      } else {
        const scale = Math.min(width / sidecar.width, height / sidecar.height);
        next.width = Math.max(1, Math.round(sidecar.width * scale));
        next.height = Math.max(1, Math.round(sidecar.height * scale));
      }
      break;
    }
    case "gravity":
      next.width = Number(rest[1]);
      next.height = Number(rest[2]);
      next.bands = Math.max(3, sidecar.bands);
      break;
    case "crop":
      next.width = Number(rest[2]);
      next.height = Number(rest[3]);
      break;
    case "flatten":
      next.bands = 3;
      break;
    case "copy":
      break;
    default:
      process.stderr.write(`Unsupported fake vips command ${command}\n`);
      process.exit(1);
  }

  next.format = path.extname(output).replace(/^\./, "") || sidecar.format;
  writeArtifact(output, next, computeSize(next, parseQuality(rawOutput)));
}

function handleVipsHeader(inputArgs) {
  const file = inputArgs[inputArgs.length - 1];
  const sidecar = readSidecar(file);
  const field = inputArgs[1];
  const value =
    field === "width"
      ? sidecar.width
      : field === "height"
        ? sidecar.height
        : field === "bands"
          ? sidecar.bands
          : sidecar.interpretation;
  process.stdout.write(`${value}\n`);
}

function handleExiftool(inputArgs) {
  if (inputArgs[0] === "-ver") {
    process.stdout.write("13.10\n");
    return;
  }
  if (inputArgs[0] === "-json") {
    const file = inputArgs[inputArgs.length - 1];
    const sidecar = readSidecar(file);
    process.stdout.write(`${JSON.stringify([buildExifJson(sidecar)])}\n`);
    return;
  }
  const destination = inputArgs[inputArgs.length - 1];
  const sidecar = readSidecar(destination);
  const next = structuredClone(sidecar);
  const sourceIndex = inputArgs.indexOf("-TagsFromFile");
  const source = sourceIndex >= 0 ? readSidecar(inputArgs[sourceIndex + 1]) : undefined;

  for (const token of inputArgs.slice(0, -1)) {
    if (token === "-overwrite_original" || token === "-P") {
      continue;
    }
    if (token === "-all=") {
      next.metadata = {};
      continue;
    }
    if (token === "-GPS:all=") {
      for (const key of Object.keys(next.metadata)) {
        if (key.startsWith("GPS")) {
          delete next.metadata[key];
        }
      }
      continue;
    }
    if (token === "-Orientation=") {
      delete next.metadata.Orientation;
      continue;
    }
    if (source && token.startsWith("-") && !token.startsWith("-TagsFromFile")) {
      const tag = token.slice(1);
      if (tag.endsWith("*")) {
        const prefix = tag.slice(0, -1);
        for (const [key, value] of Object.entries(source.metadata)) {
          if (key.startsWith(prefix)) {
            next.metadata[key] = value;
          }
        }
      } else if (tag in source.metadata) {
        next.metadata[tag] = source.metadata[tag];
      }
    }
  }

  writeArtifact(destination, next, computeSize(next, 80));
}

function handlePngquant(inputArgs) {
  if (inputArgs[0] === "--version") {
    process.stdout.write("3.0.3\n");
    return;
  }
  const output = inputArgs[inputArgs.indexOf("--output") + 1];
  const input = inputArgs[inputArgs.length - 1];
  const sidecar = readSidecar(input);
  if (process.env.IMGX_FAKE_PNGQUANT_FORCE_99 === "1") {
    writeArtifact(output, sidecar, computeSize(sidecar, 110));
    process.exit(99);
  }
  writeArtifact(output, sidecar, Math.max(20, Math.floor(computeSize(sidecar, 80) * 0.7)));
}

function handleCwebp(inputArgs) {
  if (inputArgs[0] === "-version") {
    process.stdout.write("1.6.0\n");
    return;
  }
  const output = inputArgs[inputArgs.indexOf("-o") + 1];
  const input = inputArgs[inputArgs.indexOf("-o") - 1];
  const sidecar = readSidecar(input);
  const qualityIndex = inputArgs.indexOf("-q");
  const quality = qualityIndex >= 0 ? Number(inputArgs[qualityIndex + 1]) : 90;
  const lossless = inputArgs.includes("-lossless");
  const next = { ...sidecar, format: "webp" };
  writeArtifact(output, next, computeSize(next, lossless ? 120 : quality));
}

function buildExifJson(sidecar) {
  return {
    FileTypeExtension: sidecar.format,
    ImageWidth: sidecar.width,
    ImageHeight: sidecar.height,
    ColorSpace: sidecar.interpretation,
    ...sidecar.metadata
  };
}

function readSidecar(target) {
  const sidecarPath = `${target}.imgx.json`;
  if (fs.existsSync(sidecarPath)) {
    return JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
  }
  return {
    width: 100,
    height: 100,
    bands: target.endsWith(".png") ? 4 : 3,
    interpretation: "srgb",
    format: path.extname(target).replace(/^\./, "") || "png",
    metadata: {}
  };
}

function writeArtifact(target, sidecar, bytes) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.alloc(bytes, 1));
  fs.writeFileSync(`${target}.imgx.json`, JSON.stringify(sidecar, null, 2));
}

function stripOptions(target) {
  const match = target.match(/^([^\[]+)/);
  return match ? match[1] : target;
}

function parseQuality(targetWithOptions) {
  const match = targetWithOptions.match(/Q=(\d+)/);
  return match ? Number(match[1]) : 80;
}

function computeSize(sidecar, quality) {
  return Math.max(20, Math.floor((sidecar.width * sidecar.height * sidecar.bands) / 5000) + quality * 10);
}

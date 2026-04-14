import { ImgxError } from "../core/errors.js";
import { EXIT_CODES } from "../core/exit-codes.js";

export function hexToRgb(color: string): [number, number, number] {
  const trimmed = color.trim();
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new ImgxError(`Invalid color "${color}". Expected #RRGGBB.`, EXIT_CODES.INVALID_INPUT);
  }
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  ];
}

export function rgbToVipsBackground(color: string): string {
  return hexToRgb(color).join(",");
}

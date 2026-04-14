import type { ExitCode } from "./exit-codes.js";
import { EXIT_CODES } from "./exit-codes.js";

export class ImgxError extends Error {
  readonly exitCode: ExitCode;

  constructor(message: string, exitCode: ExitCode = EXIT_CODES.PROCESSING_FAILED) {
    super(message);
    this.name = "ImgxError";
    this.exitCode = exitCode;
  }
}

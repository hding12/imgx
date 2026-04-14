export const EXIT_CODES = {
  OK: 0,
  PARTIAL_SUCCESS: 2,
  INVALID_INPUT: 3,
  MISSING_DEPENDENCY: 4,
  PROCESSING_FAILED: 5
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

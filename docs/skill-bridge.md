# Skill Bridge

`imgx` is designed to be wrapped by a future AI skill without changing the processing core.

## Contract

- Use `imgx run --spec - --json` for machine-driven execution.
- Send a valid `JobSpec` JSON document to `stdin`.
- Read only the JSON payload from `stdout`.
- Human-readable progress and warnings must stay on `stderr`.
- Exit codes are stable:
  - `0`: all items succeeded
  - `2`: partial success
  - `3`: invalid spec or illegal ability combination
  - `4`: missing external dependency
  - `5`: processing failure

## Recommended Wrapper Flow

1. Call `imgx doctor --json` to confirm tool availability.
2. Call `imgx inspect <inputs...> --json` when the skill needs file facts before choosing abilities.
3. Translate natural language into `JobSpec.uses`.
4. Call `imgx run --spec - --json`.
5. Surface `RunResult.items[*].warnings`, `error`, and `metadataDiff` back to the user or automation layer.

# Bridge Contract

Use `scripts/imgx-bridge.sh` as the stable entrypoint for this skill.

## Binary Resolution

`imgx-bridge.sh` resolves the CLI in this order:

1. `IMGX_BIN`
2. Local `imgx` repository build in `dist/cli.js`
3. Local `imgx` repository npm binary
4. `imgx` on `PATH`

If all four fail, the script exits `127` with a setup message.

## Recommended Invocation Flow

1. Run `scripts/imgx-bridge.sh doctor --json`.
2. Run `scripts/imgx-bridge.sh inspect <inputs...> --json` when source facts are needed.
3. Translate the request into `JobSpec.uses`.
4. Run `scripts/imgx-bridge.sh run --spec - --json`.
5. Surface `RunResult.items[*].warnings`, `error`, and `metadataDiff` back to the caller.

## Machine Contract

- Use `run --spec - --json` for machine-driven execution.
- Send a valid `JobSpec` JSON document to `stdin`.
- Read only the JSON payload from `stdout`.
- Keep human-readable progress, warnings, and stack traces on `stderr`.

## Stable Exit Codes

- `0`: all items succeeded
- `2`: partial success
- `3`: invalid spec or illegal ability combination
- `4`: missing external dependency
- `5`: processing failure

Treat exit codes as part of the contract. Do not collapse `2`, `3`, `4`, and `5` into a generic failure bucket.

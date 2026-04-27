# Test Matrix

This matrix maps every README-facing behavior to automated verification.

## CLI Surface

| README behavior | Coverage |
| --- | --- |
| `imgx ability list --json` | `tests/integration/cli.test.ts` |
| `imgx ability show <name>` | `tests/integration/cli.test.ts` |
| `imgx doctor` and scoped dependency checks | `tests/integration/cli.test.ts`, `tests/integration/run.test.ts` |
| `imgx inspect` with metadata/capabilities | `tests/integration/cli.test.ts`, `tests/integration/run.test.ts` |
| `imgx run --spec <file>` | `tests/integration/readme-matrix.test.ts` |
| `imgx run --spec -` | `tests/integration/cli.test.ts` |
| Stable exit codes (`0/2/3/4/5`) | `tests/integration/cli.test.ts` |

## Execution Model

| README behavior | Coverage |
| --- | --- |
| Fixed phase ordering | `tests/unit/planner.test.ts`, `tests/integration/run.test.ts` |
| Primary geometry exclusivity | `tests/unit/planner.test.ts`, `tests/integration/cli.test.ts` |
| Ordered `trim-transparent-edges` composition inside `geometry` | `tests/unit/planner.test.ts`, `tests/integration/run.test.ts` |
| Final format exclusivity | `tests/integration/cli.test.ts` |
| JPEG alpha guard | `tests/integration/cli.test.ts` |
| PNG + `target-max-bytes` requires `png-quantize` | `tests/unit/planner.test.ts`, `tests/integration/cli.test.ts` |

## Machine Contract

| README behavior | Coverage |
| --- | --- |
| `run --spec - --json` machine execution path | `tests/integration/cli.test.ts` |
| Repeated `--use name,key=value` parsing | `tests/unit/use-parser.test.ts` |
| Structured schema generation for `JobSpec` | `tests/unit/schema.test.ts`, build step |

## Output Semantics

| Behavior | Coverage |
| --- | --- |
| `normalize-filename` kebab-case output | `tests/integration/readme-matrix.test.ts` |
| `keep-structure` preserves nested directories | `tests/integration/run.test.ts`, `tests/integration/readme-matrix.test.ts` |
| `trim-transparent-edges` shrinks only transparent outer borders | `tests/integration/run.test.ts` |
| `trim-transparent-edges` is a no-op for internal holes or non-alpha inputs | `tests/integration/run.test.ts` |
| `trim-transparent-edges` fails for fully transparent inputs | `tests/integration/run.test.ts` |
| `report-json` writes a machine-readable report | `tests/integration/run.test.ts`, `tests/integration/readme-matrix.test.ts` |
| `skip-if-larger` removes the oversized result | `tests/integration/run.test.ts`, `tests/integration/readme-matrix.test.ts` |
| Explicit in-place overwrite keeps the original path | `tests/integration/run.test.ts` |
| `audit-meta-diff` returns metadata differences | `tests/integration/run.test.ts` |

## Documentation Artifacts

| Artifact | Coverage |
| --- | --- |
| `job-spec.schema.json` generation | `tests/unit/schema.test.ts`, build step |
| README ability table generation | build step |
| Example specs remain parseable | `tests/integration/readme-matrix.test.ts` |

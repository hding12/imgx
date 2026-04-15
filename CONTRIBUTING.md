# Contributing to imgx

Thanks for contributing to `imgx`.

`imgx` is a deterministic image-processing CLI. Contributions should keep that property intact: explicit inputs, explicit outputs, stable JSON contracts, and no hidden AI behavior inside the processing path.

## Project Principles

- Keep image transforms deterministic and reproducible.
- Treat the CLI flags and `JobSpec` JSON as public interfaces.
- Prefer registry-driven changes over scattered one-off logic.
- Keep external binaries as host dependencies. Do not bundle `libvips`, `ExifTool`, `pngquant`, or `cwebp`.
- When behavior changes, update tests and user-facing docs in the same change.

## Local Setup

Requirements:

- Node.js `>=20`
- `libvips`
- `ExifTool`
- `pngquant`
- `cwebp` / `webp`

macOS:

```bash
brew install vips exiftool pngquant webp
```

Ubuntu / Debian:

```bash
sudo apt-get install libvips-tools libimage-exiftool-perl pngquant webp
```

Project setup:

```bash
npm install
npm test
```

## Repository Map

- `src/abilities/registry.ts`: single source of truth for atomic abilities
- `src/core/`: planning, execution, inspection, exit-code handling
- `src/adapters/`: wrappers for `vips`, `exiftool`, `pngquant`, and `cwebp`
- `examples/specs/`: machine-consumable examples referenced from the README
- `tests/`: unit and integration coverage
- `docs/test-matrix.md`: map of README-facing behavior to automated tests
- `docs/skill-bridge.md`: machine-caller contract for future skills and agents

Generated but tracked artifacts:

- `job-spec.schema.json`
- `docs/generated/abilities-table.md`

Ignored build output such as `dist/`, local tarballs, caches, and temporary folders should not be committed.

## Development Workflow

1. Start from the latest `main`.
2. Create a focused branch.
3. Make the smallest change that solves the problem.
4. Update or add tests before opening a PR.
5. Regenerate tracked artifacts when the registry or public schema changes.
6. Update docs when CLI behavior, output shape, or examples change.
7. Run `npm test` before asking for review.

## Change-Specific Expectations

If you add or change an atomic ability:

- update `src/abilities/registry.ts`
- update planning or execution logic if required
- regenerate `job-spec.schema.json` and `docs/generated/abilities-table.md`
- add or extend tests
- update README examples if the change is user-visible

If you change JSON contracts or output semantics:

- keep the change explicit and version-conscious
- update tests that assert `InspectResult`, `RunResult`, or exit codes
- update `docs/skill-bridge.md`
- update `docs/test-matrix.md` if README-facing behavior changes

If you add a dependency or system requirement:

- update `README.md`
- update `doctor` expectations
- update CI in `.github/workflows/ci.yml`

## Pull Request Checklist

- The change is scoped and understandable without unrelated edits.
- Tests cover the new behavior or guard against regression.
- Tracked generated artifacts were refreshed when needed.
- README, examples, and machine-facing docs were updated when the public interface changed.
- The branch is clean and `npm test` passes locally.

## Commit Guidance

- Use short, imperative commit messages.
- Keep release commits separate from feature or fix commits.
- Avoid mixing refactors, behavior changes, and release metadata in one commit unless the scope is genuinely tiny.

## Release Process

Maintainers should follow [`docs/release-process.md`](./docs/release-process.md).

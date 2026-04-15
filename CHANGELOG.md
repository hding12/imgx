# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-04-15

### Added
- Versioned `skills/imgx` package for agent-facing integration, including skill metadata, bridge contract references, usage examples, and a stable `imgx-bridge.sh` wrapper.
- Contributor and maintainer workflow documentation covering repository conventions, change responsibilities, and release procedure.

### Changed
- Rewrote `README.md` as an English-only, agent-facing contract document centered on deterministic atomic abilities, fixed phase ordering, and machine integration semantics.
- Updated the README verification matrix to track execution model, machine contract, and documentation artifacts instead of scenario-oriented examples.

## [0.1.0] - 2026-04-14

### Added
- Initial `imgx` CLI release with `ability list|show`, `doctor`, `inspect`, and `run` commands.
- Registry-driven atomic image-processing abilities for inspection, normalization, geometry, encoding, optimization, metadata, and output handling.
- Stable `JobSpec`, `InspectResult`, and `RunResult` JSON contracts, including generated `job-spec.schema.json`.
- README examples plus machine-consumable example specs for common personal and ecommerce workflows.
- Test matrix covering CLI behavior, spec parsing, combination rules, output naming, exit codes, and README example execution.
- GitHub Actions CI for macOS and Linux.

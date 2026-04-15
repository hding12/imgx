# Imgx Skill

Read `SKILL.md` first.

Use `scripts/imgx-bridge.sh` as the stable entrypoint for every `imgx` invocation.

Read only the reference file needed for the current task:

- `references/bridge-contract.md` for CLI entrypoint, stdout/stderr rules, and exit codes
- `references/abilities.md` for supported abilities and composition constraints
- `references/examples.md` for common request-to-`JobSpec` mappings

Use this skill for deterministic image-processing workflows. Do not use it for semantic edits such as background removal, inpainting, or beauty retouching.

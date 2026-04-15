# Release Process

This document defines the current maintainer flow for releasing `imgx`.

Today, the canonical public release channel is GitHub Releases. npm publishing can be added later, but it is not required for a valid `imgx` release right now.

## Versioning Rules

`imgx` uses SemVer with `vX.Y.Z` git tags.

- Patch: fixes, internal hardening, docs-only cleanup that is intentionally bundled into a release
- Minor: backward-compatible abilities, flags, examples, or metadata/report additions
- Major: any breaking CLI, schema, output, or behavior change

If a change could break a strict machine caller, treat it as major unless there is a strong reason not to.

## Release Preconditions

Before cutting a release:

- `main` is up to date
- the working tree is clean
- GitHub push access works over SSH
- `npm test` passes

Recommended checks:

```bash
git switch main
git pull --ff-only
git status --short
npm test
```

## Release Steps

1. Choose the next version.

   Examples:

   ```bash
   npm version patch --no-git-tag-version
   npm version minor --no-git-tag-version
   npm version 1.0.0 --no-git-tag-version
   ```

   This updates `package.json` and `package-lock.json` without creating an automatic git commit or tag.

2. Update `CHANGELOG.md`.

   Add a new dated section for the version being released. Keep entries concise and user-facing.

3. Re-run validation.

   ```bash
   npm test
   npm pack --dry-run --cache ./.npm-cache
   ```

   `npm pack --dry-run` is recommended because it verifies the published file set without requiring npm auth.

4. Commit release metadata.

   ```bash
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "Release vX.Y.Z"
   ```

5. Create the git tag.

   ```bash
   git tag vX.Y.Z
   ```

6. Push the branch and tag.

   ```bash
   git push origin main --follow-tags
   ```

7. Publish the GitHub Release.

   Open:

   ```text
   https://github.com/hding12/imgx/releases/new?tag=vX.Y.Z&title=vX.Y.Z
   ```

   Use the matching `CHANGELOG.md` section as the release notes body.

8. Verify the published state.

   Confirm:

   - `package.json` version matches the tag
   - `CHANGELOG.md` has the released version entry
   - the GitHub Release points at the right tag
   - `main` and the tag are both visible on the remote

## Optional Artifacts

If you want a downloadable source-adjacent package asset for the release page:

```bash
npm pack --cache ./.npm-cache
```

This creates `imgx-X.Y.Z.tgz`, which can be uploaded to the GitHub Release manually. The file is ignored by git.

## If You Need To Correct A Bad Tag

If the release commit is correct but the tag is wrong and the GitHub Release has not been published yet:

```bash
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
git tag vA.B.C
git push origin vA.B.C
```

If the GitHub Release is already public, fix the release page and coordinate the tag correction deliberately. Do not rewrite published release history casually.

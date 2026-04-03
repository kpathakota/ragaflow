---
name: upload-images
description: "Upload local images to GitHub and attach them to a PR or issue as a comment with embedded screenshots."
---

# Upload Images to GitHub PR/Issue

Uploads local image files to GitHub via a temporary pre-release, then posts a comment with the images embedded in markdown.

## Arguments

- `$ARGUMENTS` — required. Format: `<PR_NUMBER> <file_paths_or_glob>`
- Examples:
  - `/upload-images 26 tests/integration/screenshots/billing-*.png`
  - `/upload-images 42 /tmp/screenshot.png`

## Step 1: Parse arguments

Extract the PR/issue number (first arg) and file paths (remaining args). Expand any glob patterns. Verify at least one image file exists.

## Step 2: Create a temporary GitHub pre-release

```bash
# Generate a unique tag name
TAG="image-upload-$(date +%s)"

# Upload all images as release assets
gh release create "$TAG" \
  --title "Image upload (temp)" \
  --notes "Temporary release for hosting images on PR #<NUMBER>. Safe to delete after review." \
  --prerelease \
  <file1> <file2> ...
```

The release acts as a file host — GitHub serves release assets as direct-download URLs that render inline in markdown.

## Step 3: Get asset download URLs

```bash
gh release view "$TAG" --json assets --jq '.assets[] | "\(.name) \(.url)"'
```

Each URL follows the pattern:
```
https://github.com/<owner>/<repo>/releases/download/<tag>/<filename>
```

## Step 4: Post a PR comment with embedded images

Build a markdown comment with `![alt](url)` for each image, then post:

```bash
gh pr comment <NUMBER> --body "<markdown with image links>"
```

Use the filename (without extension) as the alt text. Group images under a heading if there are multiple.

## Step 5: Confirm and report

- Print the comment URL returned by `gh pr comment`
- Remind the user that the temp release (`$TAG`) can be deleted after PR review:
  ```bash
  gh release delete "$TAG" --yes
  ```

## Important notes

- **Do NOT commit images to the repo** — use this release-based upload instead
- GitHub renders release asset URLs inline in markdown comments (no auth needed for public repos)
- For private repos, viewers must have repo access to see the images
- The pre-release tag is lightweight — it doesn't create a git tag on any branch
- Screenshots directory (`tests/integration/screenshots/`) is gitignored — images there are local-only

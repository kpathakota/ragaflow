---
name: security-review
description: "Thorough security audit: dependency necessity check, npm stats validation, vulnerability scan, and code-level security review."
---

# Security Review

Comprehensive security audit of the Ragaflow codebase. Run periodically on the `dev` branch before merging to `main`.

## Arguments

- `$ARGUMENTS` — optional scope filter: `deps-only`, `code-only`, or omit for full review.

## Output

Generate a report file at `docs/security-review-YYYY-MM-DD.md` with all findings. Present a summary to the user when done.

---

## Phase 1: Dependency Necessity Audit

Goal: every dependency in `package.json` must be provably used. If it can be removed or replaced with a built-in, flag it.

1. Read `web/package.json` to get the full dependency list (both `dependencies` and `devDependencies`).
2. For **each dependency**, search the codebase (`web/` directory) for actual imports or requires:
   - Use Grep to search for `from '<package>'`, `require('<package>')`, and config file references.
   - Check if the package is only referenced in config files (e.g., `postcss.config`, `next.config`, `tsconfig`) vs actual source code.
   - For `@types/*` packages, check if the corresponding runtime package is installed.
3. Classify each dependency:
   - **REQUIRED** — actively imported/used in source or config, no built-in alternative.
   - **REDUCIBLE** — used but could be replaced with a smaller package or built-in API (e.g., a utility library where only one function is used).
   - **UNUSED** — no imports or references found. Candidate for removal.
4. For any UNUSED or REDUCIBLE dependency, note the specific recommendation (remove, replace with X, etc.).

If `$ARGUMENTS` is `code-only`, skip this phase.

---

## Phase 2: Dependency Trust Validation

Goal: every included dependency should be well-maintained, widely used, and trustworthy.

1. For **each dependency** (including transitive deps with known vulnerabilities), gather data using web search and npm registry:
   - **npm weekly downloads** (via `https://api.npmjs.org/downloads/point/last-week/<package>`)
   - **GitHub stars and last commit date** (via npm registry metadata or web search)
   - **Maintainer count** (single maintainer = higher risk)
   - **Known vulnerabilities** — run `cd web && npm audit --json` to get the full audit report
   - **Package provenance** — check if the package publishes with npm provenance/signatures (look for `--provenance` in publish config or npm registry attestations)
2. Apply trust scoring. Flag a dependency as **NEEDS REVIEW** if ANY of these are true:
   - Weekly downloads < 50,000
   - Last commit > 12 months ago (unmaintained)
   - Single maintainer with no org backing
   - Has known vulnerabilities (any severity)
   - No provenance attestations
   - Package name is suspiciously similar to a popular package (typosquatting)
3. For each flagged dependency, write a brief risk summary and recommended action.

If `$ARGUMENTS` is `code-only`, skip this phase.

---

## Phase 3: Vulnerability Scan

1. Run `cd web && npm audit --json` and parse the output.
2. For each vulnerability found:
   - Note the package, severity, vulnerability description, and fix available.
   - Check if a fix is available (`npm audit fix` or manual upgrade).
   - Note if the vulnerability is in a direct dependency vs transitive.
3. Run `cd web && npx npm-check-updates --format group` to identify outdated packages with available updates.
4. Check for known CVEs in the specific versions pinned in `package-lock.json`.

If `$ARGUMENTS` is `code-only`, skip this phase.

---

## Phase 4: Code-Level Security Review

Goal: check for OWASP Top 10 and common web app vulnerabilities in the Ragaflow source code.

1. **Secrets & credentials exposure:**
   - Grep for hardcoded API keys, tokens, passwords, or secrets in source files (not `.env`).
   - Verify `.gitignore` covers all sensitive files (`.env*`, `*.xcconfig`, credentials).
   - Check that no secrets are committed in git history: `git log --all --diff-filter=A -- '*.env*' '*.xcconfig'`.

2. **Injection vulnerabilities:**
   - Search for raw SQL queries or string interpolation in database calls (Supabase client misuse).
   - Check API route handlers for unsanitized user input.
   - Look for `dangerouslySetInnerHTML` or unescaped output in React components.

3. **Authentication & authorization:**
   - Verify all API routes check authentication where needed.
   - Verify RLS policies are referenced in migration files for all tables with user data.
   - Check that server-side Supabase client is used in API routes (not browser client).

4. **API route security:**
   - Check webhook handlers validate signatures/verify sender.
   - Check for missing rate limiting considerations on public endpoints.
   - Verify CORS and CSP headers if configured.

5. **Client-side security:**
   - Check for sensitive data in client-side code or localStorage.
   - Verify auth tokens are handled via httpOnly cookies (Supabase SSR pattern), not localStorage.

If `$ARGUMENTS` is `deps-only`, skip this phase.

---

## Phase 5: iOS Security Review (if ios/ directory exists with source files)

1. Check for hardcoded credentials or API keys in Swift source files.
2. Verify xcconfig files are gitignored.
3. Check for insecure network configurations (ATS exceptions, HTTP instead of HTTPS).
4. Verify Keychain is used for sensitive storage (not UserDefaults).

If `$ARGUMENTS` is `deps-only`, skip this phase.

---

## Report Format

Write the report to `docs/security-review-YYYY-MM-DD.md` using today's date. Structure:

```markdown
# Security Review — YYYY-MM-DD

**Branch:** `dev` (commit: <short-sha>)
**Scope:** full | deps-only | code-only

## Summary

- Dependencies: X total (Y required, Z reducible, W unused)
- Trust flags: N dependencies need manual review
- Vulnerabilities: N found (X critical, Y high, Z moderate, W low)
- Code issues: N findings

## Action Items

### Immediate (do now)
- [ ] ...

### Flagged for Manual Review
- [ ] ...

### Recommended (non-urgent)
- [ ] ...

## Dependency Necessity Audit
...

## Dependency Trust Validation
...

## Vulnerability Scan
...

## Code Security Findings
...
```

## After generating the report

1. Present a concise summary to the user with the top findings.
2. If there are UNUSED dependencies, ask the user if they'd like to remove them now.
3. If there are vulnerabilities with available fixes, ask if the user wants to apply `npm audit fix`.
4. Commit the report file if the user approves.

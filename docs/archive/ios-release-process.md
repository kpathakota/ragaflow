# iOS Release Process

## Setup

### Prerequisites

- Active Apple Developer Program membership ($99/yr)
- App ID registered: `com.ragaflow.app` (developer.apple.com → Identifiers)
- App created in App Store Connect (name: Ragaflow, bundle ID: `com.ragaflow.app`, SKU: `ragaflow`)
- Xcode project signing configured (Automatically manage signing, team selected)

### TestFlight Groups

Create two internal testing groups in App Store Connect → TestFlight → Internal Testing:

| Group | Members | Purpose |
|-------|---------|---------|
| **Dev Testing** | Your Apple ID only | Verify dev builds before promoting to alpha |
| **Alpha Testers** | 5 alpha tester emails | External-facing alpha builds from production |

### Xcode Cloud Workflows

Two workflows, one per branch. Both use `ci_scripts/ci_post_clone.sh` to inject Supabase secrets at build time.

#### Dev workflow

| Setting | Value |
|---------|-------|
| Name | Dev → TestFlight (Dev Testing) |
| Branch | `dev` |
| Start condition | Changes in `ios/` |
| Environment | macOS latest, Xcode 16 latest |
| `SUPABASE_URL` (Secret) | Staging Supabase URL |
| `SUPABASE_PUBLISHABLE_KEY` (Secret) | Staging publishable key |
| Action | Archive → Distribute to **Dev Testing** |
| Trigger | Automatic on push |

#### Production workflow

| Setting | Value |
|---------|-------|
| Name | Main → TestFlight (Alpha) |
| Branch | `main` |
| Start condition | Changes in `ios/` |
| Environment | macOS latest, Xcode 16 latest |
| `SUPABASE_URL` (Secret) | Production Supabase URL |
| `SUPABASE_PUBLISHABLE_KEY` (Secret) | Production publishable key |
| Action | Archive → Distribute to **Alpha Testers** |
| Trigger | Automatic on push |

### How secrets work

`ci_scripts/ci_post_clone.sh` runs after Xcode Cloud clones the repo. It reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the workflow's environment variables and writes them into `Debug.xcconfig` and `Release.xcconfig`. The `$()` trick escapes `://` in URLs so xcconfig doesn't treat `//` as a comment.

Each workflow has different env var values, so dev builds hit staging Supabase and production builds hit production Supabase. No code changes needed.

### Flow

```
Push to dev
    → Xcode Cloud builds with staging Supabase
    → TestFlight notifies you (Dev Testing)
    → Verify on your phone

Merge dev → main
    → Xcode Cloud builds with production Supabase
    → TestFlight notifies 5 alpha testers (Alpha Testers)
```

### Manual upload (alternative to Xcode Cloud)

If you need a one-off upload without waiting for Xcode Cloud:

1. In Xcode: Product → Archive
2. Distribute App → TestFlight & App Store → Upload
3. Wait ~15 minutes for App Store Connect processing
4. Assign the build to a TestFlight group

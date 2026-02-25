# Audio Files

Audio is hosted on **Cloudflare R2**, not in the repo.

- **Bucket:** `ragaflow-audio`
- **Public URL:** `https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/`
- **Structure:** `tracks/<filename>`

## Uploading new tracks

```bash
npx wrangler r2 object put ragaflow-audio/tracks/<filename> \
  --file <local-path> \
  --content-type audio/mp4 \
  --remote
```

Then update the `audio_url` in Supabase (and `supabase/seed.sql` if it's seed data).

## CORS

Configured for `ragaflow.io`, `*.vercel.app`, and `localhost:3000`.
Managed via Cloudflare dashboard: R2 > ragaflow-audio > Settings > CORS Policy.

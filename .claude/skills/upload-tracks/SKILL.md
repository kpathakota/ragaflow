---
name: upload-tracks
description: "Sync track metadata from tracks.csv to Supabase and upload new audio to R2. Use when the user wants to upload new tracks, update track metadata, or sync the Google Sheet export to the database."
argument-hint: <folder_path> [--dry-run]
allowed-tools: [Read, Glob, Grep, Bash, Write, Edit]
---

# Sync Tracks to Ragaflow

Syncs `tracks.csv` (exported from the Google Sheet) to Supabase and Cloudflare R2. The CSV is the **single source of truth** for all track metadata. This skill handles:

- **New tracks** — upload audio to R2, INSERT into Supabase
- **Updated tracks** — UPDATE metadata in Supabase (audio is never re-uploaded)
- **Removed tracks** — flag tracks in Supabase that are missing from the CSV (requires user confirmation to delete)
- **seed.sql regeneration** — rewrite `supabase/seed.sql` from the CSV so it always mirrors the live state

## Workflow overview

```
Google Sheet (Gautam + Kiran edit)
    ↓ download as CSV
uploads/tracks.csv (local sync file)
    ↓ /upload-tracks uploads/
Cloudflare R2 (new audio only) + Supabase (full metadata sync) + seed.sql (regenerated)
```

## Arguments

- `$ARGUMENTS` — required. Path to a folder containing `tracks.csv` and any new audio files.
- Append `--dry-run` to preview all changes without executing them.
- Examples:
  - `/upload-tracks uploads/`
  - `/upload-tracks uploads/ --dry-run`

## Constants

- **R2 bucket:** `ragaflow-audio`
- **R2 public URL:** `https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/`
- **Track path in R2:** `tracks/<filename>`
- **Supported audio formats:** `.m4a`, `.mp3`, `.flac`, `.opus`, `.wav`
- **Content types:** m4a=`audio/mp4`, mp3=`audio/mpeg`, flac=`audio/flac`, opus=`audio/ogg`, wav=`audio/wav`

## Step 1: Parse arguments and load CSV

1. Extract `<folder_path>` and check for `--dry-run` flag.
2. Verify the folder exists and contains `tracks.csv`.
3. Parse `tracks.csv`. The CSV format is:

```csv
filename,id,ragam_id,title,scenarios,tags,description,artist_note,recorded_date,location,duration,free
Bhairavi_440Hz.m4a,bhairavi-focus-01,bhairavi,Morning Bhairavi,focus,grounding;concentration;warmth,A grounding Bhairavi improvisation...,,2025-01-12,Home studio Portland,2700,true
```

**Field notes:**
- `filename` — the audio filename on R2 (e.g. `Bhairavi_440Hz.m4a`). For new tracks, the file must exist in the folder. For existing tracks, it's just a reference to what's already on R2.
- `id` — unique track ID (kebab-case, e.g. `bhairavi-focus-01`)
- `ragam_id` — must match an existing ragam in `supabase/seed.sql`
- `title` — optional (leave empty for null). If absent, date + location identify the track.
- `scenarios` — semicolon-separated: `focus;meditate;sleep`
- `tags` — semicolon-separated: `grounding;warmth;contemplative`
- `description` — 1-2 sentences, editorial context. Always visible on cards and session player.
- `artist_note` — Gautam's voice: scene, poetry, session context. Expandable on session player. Optional.
- `recorded_date` — YYYY-MM-DD format
- `location` — evocative editorial text (e.g. "Before sunrise, Chennai"), not just a city name
- `duration` — in seconds. If 0 or empty, attempt to auto-detect with ffprobe for new audio files.
- `free` — `true` or `false`

Report the total number of tracks in the CSV.

## Step 2: Diff against current state

Read `supabase/seed.sql` and extract all existing track IDs.

Classify every track into one of three buckets:

| Bucket | Definition |
|--------|-----------|
| **New** | ID is in CSV but NOT in seed.sql |
| **Updated** | ID is in BOTH CSV and seed.sql |
| **Removed** | ID is in seed.sql but NOT in CSV |

Report the counts:
```
Sync summary:
  X new tracks to add
  Y existing tracks to update
  Z tracks to remove (in Supabase but not in CSV)
```

## Step 3: Validate

For **new** tracks:
1. Verify `filename` matches an actual audio file in the folder.
2. Verify `ragam_id` exists in the ragams section of seed.sql.
3. Verify `scenarios` values are valid: `focus`, `sleep`, `meditate`.
4. Verify `recorded_date` is valid YYYY-MM-DD.
5. If `duration` is 0 or empty, try to detect with ffprobe:
   ```bash
   ffprobe -v error -show_entries format=duration -of csv=p=0 "<filepath>"
   ```
   Round to nearest integer. If ffprobe is not available, ask the user.

For **updated** tracks:
1. Verify `ragam_id` exists.
2. Verify `scenarios` values are valid.
3. No audio file check needed — audio is already on R2.

For **removed** tracks:
1. List them clearly by ID and ragam name.
2. Audio on R2 is NOT deleted (R2 cleanup is manual/separate).

Report any validation errors and stop if there are issues.

## Step 4: Upload new audio files to R2

**Only for new tracks** (not updates). For each new track's audio file:

```bash
npx wrangler r2 object put ragaflow-audio/tracks/<filename> \
  --file <local-path> \
  --content-type <content-type> \
  --remote
```

Content type mapping:
- `.m4a` → `audio/mp4`
- `.mp3` → `audio/mpeg`
- `.flac` → `audio/flac`
- `.opus` → `audio/ogg`
- `.wav` → `audio/wav`

**If `--dry-run`:** Print each wrangler command but don't execute.

Report success/failure per file.

## Step 5: Generate SQL

Generate three SQL blocks:

### 5a: INSERTs for new tracks

```sql
-- New tracks
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('<id>', <title_or_null>, '<ragam_id>', '{<scenarios>}', '{<tags>}', '<description>', <artist_note_or_null>, '<recorded_date>', '<location>', <duration>, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/<filename>', <free>, '<recorded_date>T00:00:00Z');
```

### 5b: UPDATEs for existing tracks

For each updated track, generate an UPDATE that sets all metadata fields (not audio_url — that doesn't change):

```sql
-- Updated tracks
update tracks set
  title = <title_or_null>,
  ragam_id = '<ragam_id>',
  scenarios = '{<scenarios>}',
  tags = '{<tags>}',
  description = '<description>',
  artist_note = <artist_note_or_null>,
  recorded_date = '<recorded_date>',
  location = '<location>',
  duration = <duration>,
  free = <free>
where id = '<id>';
```

### 5c: DELETEs for removed tracks (if any)

```sql
-- Removed tracks (review carefully!)
-- These tracks are in Supabase but NOT in the CSV:
-- <id> (<ragam_name>)
delete from tracks where id in ('<id1>', '<id2>');
```

**Formatting rules (all SQL):**
- `title`: use `'<value>'` if present, `null` if empty
- `artist_note`: use `'<value>'` if present, `null` if empty
- `scenarios`: PostgreSQL array literal `'{focus,meditate}'` (comma-separated, no spaces)
- `tags`: PostgreSQL array literal `'{grounding,warmth}'`
- `free`: `true` or `false` (no quotes)
- `created_at` (INSERTs only): use `recorded_date` + `T00:00:00Z`
- Escape single quotes in text fields by doubling them (`it''s`)

## Step 6: Present SQL for review

Print all SQL blocks. For each block, clearly label what it does (inserts, updates, deletes).

**For deletes:** Require explicit user confirmation before including in the final SQL. List each track being removed with its ragam name and title so the user can verify.

Ask the user to:
1. **Review the SQL** for correctness
2. **Run it in the Supabase SQL editor** (paste and execute)
3. Confirm whether to include the DELETE block or skip it

Do NOT attempt to run SQL directly against Supabase — the user runs it manually for safety.

## Step 7: Regenerate seed.sql

After user confirms the SQL was run successfully, **regenerate `supabase/seed.sql` entirely from the CSV**:

1. Read the existing `supabase/seed.sql` to preserve the **ragams section** (ragam INSERTs at the top — these are not managed by the CSV).
2. Rebuild the **tracks section** from the CSV:
   - Group tracks by `ragam_id`
   - Sort groups alphabetically by ragam name
   - Within each group, sort tracks by `recorded_date` (newest first)
   - Write a comment header per group: `-- <RagamName> (<N> tracks)`
   - Write INSERT statements matching the exact seed.sql format
3. Write the complete file: ragams section + rebuilt tracks section.

This ensures seed.sql always mirrors the CSV exactly — it's reproducible from scratch.

## Step 8: Summary

Report:
- **New:** X tracks uploaded to R2 and inserted
- **Updated:** Y tracks with metadata changes
- **Removed:** Z tracks flagged/deleted (or "0 — skipped by user")
- **seed.sql:** regenerated with N total tracks
- Remind user:
  - Verify tracks on the app (check explore page)
  - If running against staging, they may need to run the same SQL on production
  - R2 audio for removed tracks is NOT auto-deleted — clean up manually if needed

## Important notes

- **CSV is the source of truth** — if a track is not in the CSV, it will be flagged for removal from Supabase
- **Audio is upload-once** — only new tracks (not in seed.sql) need audio files in the folder. Updated tracks keep their existing R2 audio.
- **R2 is shared** between staging and production — uploads are immediately available to both
- **Supabase is NOT shared** — user may need to run the SQL on both staging and production databases
- **Audio files should NOT be committed to git** — they live on R2 only
- **The `uploads/` folder is gitignored** — safe to drop files there
- **R2 audio is never auto-deleted** — removing a track from the CSV removes it from Supabase but leaves the file on R2. Manual cleanup via `npx wrangler r2 object delete ragaflow-audio/tracks/<filename> --remote`

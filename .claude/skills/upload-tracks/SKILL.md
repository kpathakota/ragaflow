---
name: upload-tracks
description: "Sync track metadata from tracks.csv to Supabase and upload new audio to R2. Use when the user wants to upload new tracks, update track metadata, or sync the Google Sheet export to the database."
argument-hint: <folder_path> [--dry-run]
allowed-tools: [Read, Glob, Grep, Bash, Write, Edit]
---

# Sync Tracks to Ragaflow

Syncs `tracks.csv` (exported from the Google Sheet) to Supabase and Cloudflare R2. The CSV is the **single source of truth** for all track metadata. This skill handles:

- **New raw audio** — discover audio files in the folder not yet in the CSV, rename to convention, upload to R2, append skeleton rows to CSV
- **Metadata sync** — UPDATE Supabase for tracks whose metadata changed in Google Sheets
- **New tracks with metadata** — INSERT into Supabase for tracks that have audio_url but aren't in production.sql yet
- **Removed tracks** — flag tracks in Supabase that are missing from the CSV (requires user confirmation to delete)
- **production.sql regeneration** — rewrite `supabase/production.sql` from the CSV so it always mirrors the live production state
- **New ragams** — auto-detect ragam IDs from filenames that aren't in production.sql yet and add them

## Workflow overview

```
Gautam drops raw audio (e.g. todi.m4a)
    ↓ into uploads/ folder
/upload-tracks uploads/
    ↓ rename → upload to R2 → append skeleton rows to tracks.csv (with audio_url)
    ↓ user copies updated tracks.csv back to Google Sheet
Kiran + Gautam fill in metadata in Google Sheet
    ↓ download as CSV → overwrite uploads/tracks.csv
/upload-tracks uploads/
    ↓ detect metadata changes → generate SQL → user runs in Supabase
    ↓ any NEW raw audio in the folder also gets processed in the same run
Repeat as content grows.
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
- **Naming convention:** `{ragam}_{mmddyyyy}.{ext}` (e.g. `todi_04062026.m4a`)

## Step 1: Discover new raw audio files

Scan the folder for audio files (`.m4a`, `.mp3`, `.flac`, `.opus`, `.wav`).

1. Load `tracks.csv` if it exists. If it doesn't exist, create it with just the header row.
2. Collect all `filename` values already in the CSV — these are **known files**.
3. For each audio file in the folder that is NOT a known filename:
   a. **Parse ragam from the filename.** The file must start with a valid ragam name (e.g. `todi.m4a`, `bhairavi_session3.m4a`, `mohanam something.m4a`). Match case-insensitively against ragam IDs in `supabase/production.sql` (or from existing CSV ragam_ids). New ragam IDs are allowed — they will be added to production.sql automatically with a capitalized name and no description. If no ragam can be parsed, report an error and skip the file.
   b. **Rename to convention.** Use the file's modification date (from `stat`) to build the new name: `{ragam}_{mmddyyyy}.{ext}`. If that name already exists (collision — same ragam, same date), append a letter suffix: `{ragam}_{mmddyyyy}a.{ext}`, `{ragam}_{mmddyyyy}b.{ext}`, etc.
   c. **Rename the local file** with `mv`.
   d. **Detect duration** with ffprobe:
      ```bash
      ffprobe -v error -show_entries format=duration -of csv=p=0 "<filepath>"
      ```
      Round to nearest integer. If ffprobe is unavailable, leave duration empty and warn.
   e. **Generate a track ID.** Format: `{ragam}-{nn}` where `nn` is the next available two-digit number for that ragam (check existing IDs in the CSV). Examples: `todi-04`, `bhairavi-06`.

4. Report discovered files:
   ```
   Discovered N new audio files:
     todi.m4a → todi_04062026.m4a (ragam: todi, duration: 1329s)
     bhairavi_morning.m4a → bhairavi_04062026.m4a (ragam: bhairavi, duration: 2700s)
   ```

**If `--dry-run`:** Show what would be renamed but don't rename.

## Step 2: Upload new audio to R2

For each newly discovered audio file (from Step 1):

```bash
npx wrangler r2 object put ragaflow-audio/tracks/<new_filename> \
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

## Step 3: Append skeleton rows to tracks.csv

For each newly discovered and uploaded file, append a row to `tracks.csv`:

| Field | Value |
|-------|-------|
| `filename` | new filename after rename (e.g. `todi_04062026.m4a`) |
| `id` | generated ID (e.g. `todi-04`) |
| `ragam_id` | parsed ragam |
| `title` | *(empty)* |
| `scenarios` | *(empty)* |
| `tags` | *(empty)* |
| `description` | *(empty)* |
| `artist_note` | *(empty)* |
| `recorded_date` | file modification date (YYYY-MM-DD) |
| `location` | *(empty)* |
| `duration` | detected via ffprobe |
| `free` | `true` |
| `audio_url` | `https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/<new_filename>` |

Write the updated CSV back to disk.

Report:
```
Appended N skeleton rows to tracks.csv.
Copy tracks.csv back to Google Sheets to fill in metadata.
```

**If `--dry-run`:** Print the rows that would be appended but don't modify the CSV.

**If there are no new audio files**, skip Steps 1–3 and proceed to Step 4.

## Step 4: Parse CSV and diff against current state

Now handle metadata sync for tracks that already have `audio_url` populated.

1. Parse the full `tracks.csv`. The CSV format is:

```csv
filename,id,ragam_id,title,scenarios,tags,description,artist_note,recorded_date,location,duration,free,audio_url
todi_04062026.m4a,todi-04,todi,,focus;meditate,,,,2026-04-06,,1329,true,https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/todi_04062026.m4a
```

**Field notes:**
- `filename` — the audio filename on R2 (e.g. `todi_04062026.m4a`), following the `{ragam}_{mmddyyyy}.{ext}` convention.
- `id` — unique track ID (e.g. `todi-04`)
- `ragam_id` — must match an existing ragam in `supabase/production.sql` (new ragams are auto-added)
- `title` — optional (leave empty for null)
- `scenarios` — semicolon-separated: `focus;meditate;sleep`
- `tags` — semicolon-separated: `grounding;warmth;contemplative`
- `description` — 1-2 sentences, editorial context
- `artist_note` — Gautam's voice. Optional.
- `recorded_date` — YYYY-MM-DD format
- `location` — evocative editorial text (e.g. "Before sunrise, Chennai")
- `duration` — in seconds
- `free` — `true` or `false`
- `audio_url` — full R2 URL. Populated by the skill after upload.

2. Read `supabase/production.sql` and extract all existing track IDs. If `production.sql` doesn't exist yet, treat all tracks as new.

3. Classify tracks that have `audio_url` populated:

| Bucket | Definition |
|--------|-----------|
| **New** | ID is in CSV (with audio_url) but NOT in production.sql |
| **Updated** | ID is in BOTH CSV and production.sql |
| **Removed** | ID is in production.sql but NOT in CSV |

Tracks without `audio_url` are **pending** — they were just appended as skeletons and need metadata before syncing. Skip them for SQL generation but include them in production.sql regeneration.

**Note:** `supabase/seed.sql` is for dev/staging only and is NOT touched by this skill.

Report the counts:
```
Sync summary:
  X new tracks to insert into Supabase
  Y existing tracks to update
  Z tracks to remove (in Supabase but not in CSV)
  W tracks pending metadata (skeleton rows, no sync yet)
```

## Step 5: Validate

For **new** tracks (have audio_url, not in production.sql):
1. Verify `ragam_id` exists in the ragams section of production.sql (or will be added as a new ragam).
2. Verify `scenarios` values are valid: `focus`, `sleep`, `meditate` (if present — may be empty for skeleton rows).
3. Verify `recorded_date` is valid YYYY-MM-DD.

For **updated** tracks:
1. Verify `ragam_id` exists.
2. Verify `scenarios` values are valid (if present).
3. No audio file check needed — audio is already on R2.

For **removed** tracks:
1. List them clearly by ID and ragam name.
2. Audio on R2 is NOT deleted (R2 cleanup is manual/separate).

Report any validation errors and stop if there are issues.

## Step 6: Generate SQL

Generate SQL using **upsert** pattern (`ON CONFLICT ... DO UPDATE`) so production.sql is idempotent and safe to re-run.

### 6a: Ragam upserts

For any ragam_id in the CSV that is not already in production.sql's ragams section, add it:

```sql
insert into ragams (id, name, description, time_of_day) values
  ('<ragam_id>', '<RagamName>', '', null)
on conflict (id) do nothing;
```

Capitalize the ragam name (e.g. `todi` → `Todi`). Leave description empty and time_of_day null for new ragams — user can fill these in later.

### 6b: Track upserts

For each track with `audio_url` populated, generate an upsert:

```sql
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('<id>', <title_or_null>, '<ragam_id>', '{<scenarios>}', '{<tags>}', '<description>', <artist_note_or_null>, '<recorded_date>', '<location>', <duration>, '<audio_url>', <free>, '<recorded_date>T00:00:00Z')
on conflict (id) do update set
  title = excluded.title,
  ragam_id = excluded.ragam_id,
  scenarios = excluded.scenarios,
  tags = excluded.tags,
  description = excluded.description,
  artist_note = excluded.artist_note,
  recorded_date = excluded.recorded_date,
  location = excluded.location,
  duration = excluded.duration,
  audio_url = excluded.audio_url,
  free = excluded.free;
```

### 6c: DELETEs for removed tracks (if any)

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

## Step 7: Write sync.sql and present for review

**Always write the generated SQL to `uploads/sync.sql`** so the user has a clear, reviewable file to copy-paste into the Supabase SQL editor. Never just print SQL inline or run it from the terminal.

1. Write all SQL (inserts, updates, deletes) to `uploads/sync.sql` with clear section comments.
2. Summarize what the file contains (N inserts, N updates, N deletes).
3. **For deletes:** Require explicit user confirmation before including in the final SQL. List each track being removed with its ragam name and title so the user can verify.

Ask the user to:
1. **Review `uploads/sync.sql`** for correctness
2. **Run it in the Supabase SQL editor** (paste and execute)
3. Confirm whether to include the DELETE block or skip it

Do NOT attempt to run SQL directly against Supabase — the user runs it manually for safety.

## Step 8: Regenerate production.sql

After user confirms the SQL was run successfully, **regenerate `supabase/production.sql` entirely from the CSV**:

1. Build the **ragams section** — collect all unique `ragam_id` values from the CSV and generate upsert statements with `ON CONFLICT DO NOTHING`. Capitalize the ragam name. Preserve descriptions for ragams that already had them in the previous production.sql.
2. Rebuild the **tracks section** from the CSV (include ALL rows with `audio_url`, using upsert pattern):
   - Group tracks by `ragam_id`
   - Sort groups alphabetically by ragam name
   - Within each group, sort tracks by `recorded_date` (newest first)
   - Write a comment header per group: `-- <RagamName> (<N> tracks)`
   - Write upsert statements (INSERT ... ON CONFLICT DO UPDATE)
3. Write the complete file with a header comment noting this is for production only.

**`supabase/seed.sql` is NOT modified** — it remains the dev/staging seed with placeholder data.

## Step 9: Summary

Report:
- **Discovered:** N new audio files renamed and uploaded to R2
- **Inserted:** X new tracks into Supabase
- **Updated:** Y tracks with metadata changes
- **Removed:** Z tracks flagged/deleted (or "0 — skipped by user")
- **Pending:** W skeleton rows awaiting metadata in Google Sheets
- **production.sql:** regenerated with N total tracks
- Remind user:
  - If new audio was discovered: **copy tracks.csv back to Google Sheets** to get the new rows with audio_url
  - Verify tracks on the app (check explore page)
  - If running against staging, they may need to run the same SQL on production
  - R2 audio for removed tracks is NOT auto-deleted — clean up manually if needed

## Important notes

- **CSV is the source of truth** — if a track is not in the CSV, it will be flagged for removal from Supabase
- **Raw audio discovery is automatic** — drop files named `{ragam}.m4a` (or `{ragam}_anything.ext`) into the folder and the skill finds them
- **Naming convention is enforced** — raw files are renamed to `{ragam}_{mmddyyyy}.{ext}` before upload
- **Audio is upload-once** — tracks with `audio_url` already populated are never re-uploaded
- **Skeleton rows are not synced to Supabase** — they need metadata first (at minimum `scenarios`). They are included in production.sql for completeness.
- **seed.sql is dev/staging only** — never modified by this skill. production.sql is the production equivalent, generated entirely from the CSV.
- **R2 is shared** between staging and production — uploads are immediately available to both
- **Supabase is NOT shared** — user may need to run the SQL on both staging and production databases
- **Audio files should NOT be committed to git** — they live on R2 only
- **The `uploads/` folder is gitignored** — safe to drop files there
- **R2 audio is never auto-deleted** — removing a track from the CSV removes it from Supabase but leaves the file on R2. Manual cleanup via `npx wrangler r2 object delete ragaflow-audio/tracks/<filename> --remote`

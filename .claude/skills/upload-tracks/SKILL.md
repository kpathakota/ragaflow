---
name: upload-tracks
description: "Upload audio tracks to Cloudflare R2 and insert metadata into Supabase. Use when the user wants to upload new tracks, add recordings, or batch-import audio content."
argument-hint: <folder_path> [--dry-run]
allowed-tools: [Read, Glob, Grep, Bash, Write, Edit]
---

# Upload Tracks to Ragaflow

Uploads audio files from a local folder to Cloudflare R2, generates SQL INSERT statements for Supabase, and updates `supabase/seed.sql`.

## Arguments

- `$ARGUMENTS` — required. Path to a folder containing audio files and optionally a `tracks.csv` metadata file.
- Append `--dry-run` to preview commands without executing them.
- Examples:
  - `/upload-tracks uploads/`
  - `/upload-tracks uploads/ --dry-run`
  - `/upload-tracks ~/Desktop/new-tracks/`

## Constants

- **R2 bucket:** `ragaflow-audio`
- **R2 public URL:** `https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/`
- **Track path:** `tracks/<filename>`
- **Supported formats:** `.m4a`, `.mp3`, `.flac`, `.opus`, `.wav`
- **Content types:** m4a=`audio/mp4`, mp3=`audio/mpeg`, flac=`audio/flac`, opus=`audio/ogg`, wav=`audio/wav`

## Step 1: Parse arguments and scan folder

1. Extract `<folder_path>` and check for `--dry-run` flag.
2. Verify the folder exists.
3. Find all audio files in the folder (`.m4a`, `.mp3`, `.flac`, `.opus`, `.wav`).
4. Report how many files were found. If zero, stop with a helpful message.

## Step 2: Load or collect metadata

Look for a `tracks.csv` file in the folder.

### If `tracks.csv` exists:

Parse it. The CSV format is:

```csv
filename,id,ragam_id,title,scenarios,tags,description,artist_note,recorded_date,location,duration,free
Bhairavi_440Hz.m4a,bhairavi-new-01,bhairavi,,focus;meditate,grounding;warmth,A morning session...,Notes from Gautam...,2026-03-15,Home studio Portland,2700,true
```

**Field notes:**
- `filename` — must match an audio file in the folder
- `id` — unique track ID (kebab-case, e.g. `bhairavi-focus-03`)
- `ragam_id` — must match an existing ragam in `supabase/seed.sql` (bhairavi, neelambari, sahana, hindolam, mohanam, kalyani, todi)
- `title` — optional (leave empty for null). If absent, date + location identify the track.
- `scenarios` — semicolon-separated: `focus;meditate;sleep`
- `tags` — semicolon-separated: `grounding;warmth;contemplative`
- `description` — 1-2 sentences, editorial context. Always visible on cards and session player.
- `artist_note` — Gautam's voice: scene, poetry, session context. Expandable on session player. Optional.
- `recorded_date` — YYYY-MM-DD format
- `location` — evocative editorial text (e.g. "Before sunrise, Chennai"), not just a city name
- `duration` — in seconds. If 0 or empty, attempt to auto-detect with ffprobe.
- `free` — `true` or `false`

### If no `tracks.csv`:

Ask the user for metadata for each file. Present the list of required and optional fields. Offer to create a `tracks.csv` template they can fill out.

## Step 3: Validate metadata

For each track:
1. Verify `filename` matches an actual audio file in the folder.
2. Verify `ragam_id` exists in `supabase/seed.sql` ragams section.
3. Verify `id` doesn't already exist in `supabase/seed.sql` tracks section.
4. Verify `scenarios` values are valid: `focus`, `sleep`, `meditate`.
5. Verify `recorded_date` is valid YYYY-MM-DD.
6. If `duration` is 0 or empty, try to detect it:
   ```bash
   ffprobe -v error -show_entries format=duration -of csv=p=0 "<filepath>"
   ```
   Round to nearest integer. If ffprobe is not available, ask the user.

Report any validation errors and stop if there are issues.

## Step 4: Upload audio files to R2

For each audio file, run:

```bash
npx wrangler r2 object put ragaflow-audio/tracks/<filename> \
  --file <local-path> \
  --content-type <content-type> \
  --remote
```

Map content types:
- `.m4a` → `audio/mp4`
- `.mp3` → `audio/mpeg`
- `.flac` → `audio/flac`
- `.opus` → `audio/ogg`
- `.wav` → `audio/wav`

**If `--dry-run`:** Print each wrangler command but don't execute it.

Wait for each upload to complete before proceeding. Report success/failure per file.

## Step 5: Generate SQL INSERT statements

Generate SQL matching the exact format in `supabase/seed.sql`:

```sql
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('<id>', <title_or_null>, '<ragam_id>', '{<scenarios>}', '{<tags>}', '<description>', <artist_note_or_null>, '<recorded_date>', '<location>', <duration>, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/<filename>', <free>, '<recorded_date>T00:00:00Z');
```

**Formatting rules:**
- `title`: use `'<value>'` if present, `null` if empty
- `artist_note`: use `'<value>'` if present, `null` if empty. Escape single quotes by doubling them (`''`).
- `scenarios`: PostgreSQL array literal `'{focus,meditate}'` (comma-separated, no spaces)
- `tags`: PostgreSQL array literal `'{grounding,warmth}'`
- `free`: `true` or `false` (no quotes)
- `created_at`: use `recorded_date` + `T00:00:00Z`
- Escape any single quotes in text fields by doubling them (`it''s`)

## Step 6: Present SQL for review

Print the complete SQL INSERT block. Ask the user to:
1. **Review the SQL** for correctness
2. **Run it in the Supabase SQL editor** (paste and execute)

Do NOT attempt to run SQL directly against Supabase — the user runs it manually for safety.

## Step 7: Update seed.sql

After user confirms the SQL was run successfully:
1. Read `supabase/seed.sql`
2. Find the appropriate ragam section (e.g. `-- Bhairavi (5 tracks)`)
3. Append the new INSERT statements under the correct ragam section
4. Update the track count in the section comment (e.g. `5 tracks` → `6 tracks`)
5. If tracks span multiple ragams, update each section

## Step 8: Summary

Report:
- Number of files uploaded to R2
- Number of tracks inserted into Supabase
- Files modified (`supabase/seed.sql`)
- Remind user to verify tracks appear on the app (check explore page)

## Important notes

- **Never delete existing tracks** — this skill only adds new ones
- **R2 is shared** between staging and production — uploads are immediately available to both
- **Supabase is NOT shared** — user may need to run the SQL on both staging and production databases
- **Audio files should NOT be committed to git** — they live on R2 only
- **The `uploads/` folder is gitignored** — safe to drop files there

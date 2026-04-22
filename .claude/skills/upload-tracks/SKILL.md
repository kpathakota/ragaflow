---
name: upload-tracks
description: "Sync track metadata from tracks.csv to Supabase and upload new audio to R2. Use when the user wants to upload new tracks, update track metadata, or sync the Google Sheet export to the database."
argument-hint: "[context about what's new]"
allowed-tools: [Read, Glob, Bash, Write, Edit]
---

# Sync Tracks to Ragaflow

Two-phase workflow for getting audio content into Ragaflow. The CSV (`supabase/tracks.csv`) is the **single source of truth** for all track metadata.

## Folder layout

```
ragaflow/
├── audio/                ← local archive of all renamed tracks (gitignored)
├── uploads/              ← temporary drop zone for raw audio (gitignored, should be mostly empty)
├── supabase/
│   ├── tracks.csv        ← source of truth for track metadata (the ONE copy)
│   ├── sync.sql          ← generated SQL to run in Supabase SQL editor
│   ├── production.sql    ← regenerated after sync is confirmed run
│   └── ...
```

## Phase 1: Upload new audio

**Trigger:** There are audio files in `uploads/`.

```
User drops raw audio (e.g. Bilahari.m4a) into uploads/
    ↓
/upload-tracks
    ↓ rename → upload to R2 → move to audio/ → append skeleton rows to supabase/tracks.csv
    ↓ uploads/ is empty again
    ↓
User copies updated tracks.csv back to Google Sheet, fills in metadata
```

### Step 1.1: Discover new raw audio files

Scan `uploads/` for audio files (`.m4a`, `.mp3`, `.flac`, `.opus`, `.wav`).

1. Load `supabase/tracks.csv` if it exists. If it doesn't exist, create it with just the header row.
2. Collect all `filename` values already in the CSV — these are **known files**.
3. For each audio file in `uploads/` that is NOT a known filename:
   a. **Parse ragam from the filename.** The file must start with a valid ragam name (e.g. `todi.m4a`, `bhairavi_session3.m4a`, `mohanam something.m4a`). Match case-insensitively against ragam IDs in `supabase/production.sql` (or from existing CSV ragam_ids). New ragam IDs are allowed — they will be added to production.sql automatically with a capitalized name and no description. If no ragam can be parsed, report an error and skip the file.
   b. **Rename to convention.** Use the file's modification date (from `stat`) to build the new name: `{ragam}_{mmddyyyy}.{ext}`. If that name already exists (collision — same ragam, same date), append a letter suffix: `{ragam}_{mmddyyyy}a.{ext}`, `{ragam}_{mmddyyyy}b.{ext}`, etc.
   c. **Rename the local file** with `mv` (still in `uploads/`).
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

### Step 1.2: Upload new audio to R2

For each newly discovered audio file:

```bash
npx wrangler r2 object put ragaflow-audio/tracks/<new_filename> \
  --file uploads/<new_filename> \
  --content-type <content-type> \
  --remote
```

Content type mapping:
- `.m4a` → `audio/mp4`
- `.mp3` → `audio/mpeg`
- `.flac` → `audio/flac`
- `.opus` → `audio/ogg`
- `.wav` → `audio/wav`

Report success/failure per file.

### Step 1.3: Move to audio/ archive

After successful R2 upload, move each file from `uploads/` to `audio/`:
```bash
mv uploads/<new_filename> audio/<new_filename>
```

### Step 1.4: Append skeleton rows to tracks.csv

For each newly discovered and uploaded file, append a row to `supabase/tracks.csv`:

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

### Step 1.5: Phase 1 summary

Report:
```
Uploaded N new tracks to R2 and archived in audio/:
  bilahari_04162026.m4a (bilahari-01, 2008s)

Skeleton rows appended to supabase/tracks.csv.
Copy tracks.csv back to Google Sheets to fill in metadata (scenarios, tags, title, etc.).
Run /upload-tracks again after metadata is filled in.
```

**Phase 1 stops here.** Do NOT proceed to Phase 2 in the same run if new audio was just uploaded — the user needs to fill in metadata first.

## Phase 2: Sync metadata to Supabase

**Trigger:** No new audio in `uploads/`, and user has updated the CSV with metadata.

```
User downloads updated CSV from Google Sheets → overwrites supabase/tracks.csv
    ↓
/upload-tracks
    ↓ validate all tracks have scenarios → diff against production.sql → generate supabase/sync.sql
    ↓
User reviews sync.sql and runs it in Supabase SQL editor
    ↓
User confirms → production.sql is regenerated
```

### Step 2.0: Ingest downloaded CSV

If the user mentions downloading a new CSV from Google Sheets (e.g. `TrackRepo - tracks-0416.csv`):

1. The downloaded file may be in `uploads/`, `supabase/`, or `~/Downloads/`. Find it.
2. Overwrite `supabase/tracks.csv` with its contents.
3. **Delete the downloaded file** — there should only ever be ONE `tracks.csv` at `supabase/tracks.csv`. No copies.

### Step 2.1: Load and validate CSV

1. Parse `supabase/tracks.csv`. The CSV format is:

```csv
filename,id,ragam_id,title,scenarios,tags,description,artist_note,recorded_date,location,duration,free,audio_url
todi_04062026.m4a,todi-04,todi,Fiery Todi,focus;meditate,intense;spacious,,,2026-04-06,Home,1329,true,https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/todi_04062026.m4a
```

**Field notes:**
- `filename` — the audio filename on R2 (e.g. `todi_04062026.m4a`)
- `id` — unique track ID (e.g. `todi-04`)
- `ragam_id` — must match an existing ragam or will be auto-added
- `title` — optional (leave empty for null)
- `scenarios` — semicolon-separated: `focus;meditate;sleep`
- `tags` — semicolon-separated: `grounding;warmth;contemplative`
- `description` — 1-2 sentences, editorial context
- `artist_note` — Gautam's voice. Optional.
- `recorded_date` — YYYY-MM-DD format
- `location` — evocative editorial text (e.g. "Before sunrise, Chennai")
- `duration` — in seconds
- `free` — `true` or `false`
- `audio_url` — full R2 URL

2. **Completeness gate:** Check that **every** track with `audio_url` has at least `scenarios` filled in. If any are missing, report which tracks need attention and **stop**:

```
Cannot generate sync.sql — the following tracks are missing scenarios:
  karnatabehag-01 (karnatabehag_04122026.m4a)
  poornachandrika-01 (poornachandrika_04122026.m4a)

Fill in metadata in Google Sheets and re-download the CSV.
```

Do NOT generate sync.sql with incomplete tracks.

3. Validate all tracks:
   - `scenarios` values are valid: `focus`, `sleep`, `meditate`
   - `recorded_date` is valid YYYY-MM-DD
   - `ragam_id` exists in production.sql or will be auto-added as a new ragam

### Step 2.2: Diff against production.sql

1. Read `supabase/production.sql` and extract all existing track IDs. If `production.sql` doesn't exist yet, treat all tracks as new.

2. Classify tracks:

| Bucket | Definition |
|--------|-----------|
| **New** | ID is in CSV but NOT in production.sql |
| **Updated** | ID is in BOTH CSV and production.sql |
| **Removed** | ID is in production.sql but NOT in CSV |

Report:
```
Sync summary:
  X new tracks to insert
  Y existing tracks to update
  Z tracks to remove (in Supabase but not in CSV)
```

### Step 2.3: Generate SQL

Generate SQL using **upsert** pattern (`ON CONFLICT ... DO UPDATE`) so it's idempotent and safe to re-run.

#### Ragam upserts

Include **all** ragams from the CSV. Use `ON CONFLICT DO UPDATE` to update descriptions and time_of_day. Preserve existing descriptions from production.sql for ragams that already have them.

```sql
insert into ragams (id, name, description, time_of_day) values
  ('<ragam_id>', '<RagamName>', '<description>', <time_of_day>)
on conflict (id) do update set
  description = excluded.description,
  time_of_day = excluded.time_of_day;
```

#### Track upserts

For each track, generate an upsert:

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

#### DELETEs for removed tracks (if any)

```sql
-- Removed tracks (review carefully!)
-- <id> (<ragam_name>)
delete from tracks where id in ('<id1>', '<id2>');
```

**Formatting rules:**
- `title`: use `'<value>'` if present, `null` if empty
- `artist_note`: use `'<value>'` if present, `null` if empty
- `scenarios`: PostgreSQL array literal `'{focus,meditate}'` (comma-separated, no spaces)
- `tags`: PostgreSQL array literal `'{grounding,warmth}'`
- `free`: `true` or `false` (no quotes)
- `created_at` (INSERTs only): use `recorded_date` + `T00:00:00Z`
- Escape single quotes in text fields by doubling them (`it''s`)

### Step 2.4: Write sync.sql

**Always write the generated SQL to `supabase/sync.sql`.** Never just print SQL inline or run it from the terminal.

1. Write all SQL (ragam upserts, track upserts, deletes) to `supabase/sync.sql` with clear section comments.
2. Summarize what the file contains.
3. **For deletes:** Require explicit user confirmation. List each track being removed.

Ask the user to:
1. Review `supabase/sync.sql`
2. Run it in the Supabase SQL editor
3. Confirm it ran successfully

Do NOT attempt to run SQL directly against Supabase.

### Step 2.5: Regenerate production.sql (after user confirms)

**Only after the user confirms sync.sql was run successfully**, regenerate `supabase/production.sql` entirely from the CSV:

1. Build the **ragams section** — all unique ragam_ids, with `ON CONFLICT DO UPDATE` for descriptions. Preserve existing descriptions from the previous production.sql.
2. Rebuild the **tracks section** from the CSV:
   - Group tracks by `ragam_id`
   - Sort groups alphabetically by ragam name
   - Within each group, sort tracks by `recorded_date` (newest first)
   - Write a comment header per group: `-- <RagamName> (<N> tracks)`
   - Write upsert statements (INSERT ... ON CONFLICT DO UPDATE)
3. Write with a header comment noting this is for production only.

**`supabase/seed.sql` is NOT modified.**

### Step 2.6: Phase 2 summary

Report:
```
  Inserted: X new tracks
  Updated: Y tracks with metadata changes
  Removed: Z tracks (or "0 — skipped by user")
  production.sql: regenerated with N total tracks
```

Remind user:
- Verify tracks on the app (check explore page)
- If running against staging, may need to run same SQL on production

## Re-uploading edited audio

If the user says they've re-edited audio for an existing track, the file will be in `uploads/` with the same conventional name. Handle this as a special case:

1. Upload the file to R2 (overwriting the existing object)
2. Move to `audio/` (overwriting the local copy)
3. Update duration in `supabase/tracks.csv` if it changed
4. Continue with normal Phase 1 or Phase 2 flow

## Constants

- **R2 bucket:** `ragaflow-audio`
- **R2 public URL:** `https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/`
- **Track path in R2:** `tracks/<filename>`
- **Supported audio formats:** `.m4a`, `.mp3`, `.flac`, `.opus`, `.wav`
- **Content types:** m4a=`audio/mp4`, mp3=`audio/mpeg`, flac=`audio/flac`, opus=`audio/ogg`, wav=`audio/wav`
- **Naming convention:** `{ragam}_{mmddyyyy}.{ext}` (e.g. `todi_04062026.m4a`)

## Important notes

- **CSV is the source of truth** — if a track is not in the CSV, it will be flagged for removal from Supabase
- **One tracks.csv** — there should only ever be one copy, at `supabase/tracks.csv`. Downloaded CSVs from Google Sheets are ingested into it and deleted.
- **Completeness gate** — sync.sql is never generated if any track is missing `scenarios`
- **Phase 1 and Phase 2 don't mix** — if new audio was uploaded, stop after Phase 1. Don't generate sync.sql in the same run.
- **production.sql is only regenerated after user confirms sync.sql was run** — never optimistically
- **uploads/ should be mostly empty** — raw files get processed and moved to audio/
- **audio/ is the local archive** — all renamed tracks live here permanently (gitignored)
- **seed.sql is dev/staging only** — never modified by this skill
- **R2 is shared** between staging and production — uploads are immediately available to both
- **Supabase is NOT shared** — user may need to run SQL on both staging and production
- **R2 audio is never auto-deleted** — removing a track from CSV removes it from Supabase but leaves the file on R2

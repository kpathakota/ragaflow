-- Production data (generated from tracks.csv)
-- Run this on the PRODUCTION Supabase project only.
-- seed.sql is for dev/staging — do not mix them.

-- Ragams
insert into ragams (id, name, description, time_of_day) values
  ('asaveri', 'Asaveri', '', null),
  ('hamsanadam', 'Hamsanadam', '', null),
  ('hamsanandi', 'Hamsanandi', '', null),
  ('kambhoji', 'Kambhoji', '', null),
  ('kannadagowla', 'Kannadagowla', '', null),
  ('karnatabehag', 'Karnatabehag', '', null),
  ('kedaragowla', 'Kedaragowla', '', null),
  ('khamas', 'Khamas', '', null),
  ('navarasakannada', 'Navarasakannada', '', null),
  ('poornachandrika', 'Poornachandrika', '', null),
  ('suddhadhanyasi', 'Suddhadhanyasi', '', null),
  ('todi', 'Todi', 'A majestic morning raga of quiet intensity. Its slow, deliberate phrases demand full attention and reward it with profound stillness.', 'morning')
on conflict (id) do nothing;

-- Tracks

-- Asaveri (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('asaveri-01', 'A Sweet Asaveri', 'asaveri', '{meditate}', '{contemplative,expansive}', '', 'During the week prior to this, an instrumentalist rendered - for the sake of a small handful of mridangam students - a song in this raga, with its ''curved'' (''vakra'') prayogas (passages) - and, spontaneously singing kalpana swaras (''dream notes'') thereafter (startling everyone a bit...) led to attempting to think through the raga on the fly here.', '2026-04-03', 'Home, Earth', 994, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/asaveri_04072026.m4a', true, '2026-04-03T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

-- Hamsanadam (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('hamsanadam-01', 'Eventually Elevated Hamsanadam', 'hamsanadam', '{meditate}', '{open,majestic,aligned}', '', '*Swan sound*, this raga name would have it, programmatically...', '2026-03-27', 'Home, Portland', 1540, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/hamsanadam_04072026.m4a', true, '2026-03-27T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

-- Hamsanandi (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('hamsanandi-01', 'Hamsanandi, hang on...', 'hamsanandi', '{meditate}', '{searching,pointed,dreamy}', 'A hindustani-style rendition in mishram', '*Swan bliss*, this raga name would have it, programmatically. I suppose I can imagine a swan blissfully singing this (with an effort...)', '2026-03-27', 'Home, Earth', 1185, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/hamsanandi_04072026.m4a', true, '2026-03-27T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

-- Kambhoji (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('kambhoji-01', 'Kambhoji Prelude ( ... to what?)', 'kambhoji', '{focus}', '{energetic,uplifting,expansive}', '', 'This session occurred in the midst of the preparations for an unexpected gathering.', '2026-01-23', 'Home, Portland', 1626, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/kambhoji_04072026.m4a', true, '2026-01-23T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

-- Kannadagowla (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('kannadagowla-01', 'A Kannadagowla in Rupakam', 'kannadagowla', '{sleep,meditate}', '{calm,soft,serene}', 'A meditation on this wistful ragam was on order today.', 'The cold of the morning was just beginning to break when we sat down to record. As the air warmed, so did we but it lead to a nice build up in vibes.', '2026-03-23', 'By the couch, near the fireplace', 543, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/kannadagowla_03262026.m4a', true, '2026-03-23T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

-- Karnatabehag (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('karnatabehag-01', null, 'karnatabehag', '{}', '{}', '', null, '2026-04-12', '', 1007, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/karnatabehag_04122026.m4a', true, '2026-04-12T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

-- Kedaragowla (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('kedaragowla-01', 'A Kedaragowla *slowly approaching* (''mandakranta'')', 'kedaragowla', '{sleep}', '{settled,multifaceted,wellrounded}', '', 'Inspired by listening to a serenely musical family collectively render three different, carefully crafted (and remembered) songs in this raga.', '2026-03-23', 'Home, Portland', 628, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/kedaragowla_03262026.m4a', true, '2026-03-23T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

-- Khamas (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('khamas-01', 'Meandering Khamas', 'khamas', '{focus}', '{playful,explorative,uplifting}', '', 'Tried some slow/fast transitions that didn''t work completely.', '2026-04-03', 'Home, Earth', 939, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/khamas_04072026.m4a', true, '2026-04-03T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

-- Navarasakannada (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('navarasakannada-01', 'Every Emotion Navarasakannada', 'navarasakannada', '{meditate}', '{playful,fast,contemplative}', '', 'The kids were playing around, creating a pillow fort while we recorded which clearly added to the presentation of this ragam.', '2026-01-19', 'Home, Portland', 2339, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/navarasakannada_04072026.m4a', false, '2026-01-19T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

-- Poornachandrika (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('poornachandrika-01', null, 'poornachandrika', '{}', '{}', '', null, '2026-04-12', '', 1587, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/poornachandrika_04122026.m4a', true, '2026-04-12T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

-- Suddhadhanyasi (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('suddhadhanyasi-01', 'Simple Suddhadhanyasi', 'suddhadhanyasi', '{meditate}', '{sparse,expansive}', '', 'A fancy name for a very common ''scale'' - the so-called *minor pentatonic*, here approached quite straightforwardly.', '2026-01-23', 'Home, Earth', 1860, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/suddhadhanyasi_04072026.m4a', true, '2026-01-23T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

-- Todi (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('todi-01', 'Fiery Todi', 'todi', '{focus,meditate}', '{intense,spacious,uplifting}', '', 'The mridangam''s toppi really opened up in this one. I''m happy with it. Gautam''s really bringing it in this one and I keep coming back to it for one more play.', '2026-03-26', 'Home, Oregon', 1329, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/todi_03262026.m4a', true, '2026-03-26T00:00:00Z')
on conflict (id) do update set
  title = excluded.title, ragam_id = excluded.ragam_id, scenarios = excluded.scenarios, tags = excluded.tags, description = excluded.description, artist_note = excluded.artist_note, recorded_date = excluded.recorded_date, location = excluded.location, duration = excluded.duration, audio_url = excluded.audio_url, free = excluded.free;

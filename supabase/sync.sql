-- Sync staging/dev to match production data
-- Run this in the STAGING Supabase SQL editor
-- Generated 2026-04-21

BEGIN;

-- 1. Reset rasika preferences (text fields, not FK-constrained — would go stale)
UPDATE rasikas SET
  favorite_tracks = '{}',
  favorite_ragams = '{}',
  default_focus_track = NULL,
  default_sleep_track = NULL,
  default_meditate_track = NULL;

-- 2. Clear old seed data (order matters: tracks reference ragams)
TRUNCATE tracks CASCADE;
TRUNCATE ragams CASCADE;

-- 3. Insert production ragams
insert into ragams (id, name, description, time_of_day) values
  ('asaveri', 'Asaveri', 'A plaintive morning raga steeped in devotion and quiet longing. Its gently descending phrases carry the weight of surrender, evoking the stillness before dawn breaks.', 'morning'),
  ('bilahari', 'Bilahari', 'A radiant morning raga brimming with optimism and confident energy. Its bright, ascending phrases feel like sunlight streaming through an open window — joyful, clear, and uplifting.', 'morning'),
  ('hamsanadam', 'Hamsanadam', 'A rare and luminous raga of crystalline purity, built on just five notes. Its swan-like grace carries an effortless serenity that transcends complexity.', null),
  ('hamsanandi', 'Hamsanandi', 'A hauntingly beautiful twilight raga that blurs the line between longing and peace. Its distinctive phrases create an atmosphere of deep introspection, perfect for the liminal hours between day and night.', 'evening'),
  ('kambhoji', 'Kambhoji', 'A majestic evening raga of noble bearing and emotional depth. Beloved across centuries, its warm, expansive phrases evoke devotion, valor, and the golden light of dusk.', 'evening'),
  ('kannadagowla', 'Kannadagowla', 'A raga of solemn grandeur and meditative gravity. Its deliberate, weighty phrases unfold like a slow ritual, drawing the listener into a space of reverent contemplation.', null),
  ('karnatabehag', 'Karnatabehag', 'A sweet and lyrical raga that blossoms in the late evening hours. Its graceful, lilting phrases carry a romantic tenderness — intimate, unhurried, and deeply expressive.', 'evening'),
  ('kedaragowla', 'Kedaragowla', 'A raga of serene beauty that mingles devotion with quiet joy. Its flowing phrases feel like a gentle river at twilight — steady, calming, and subtly luminous.', 'evening'),
  ('khamas', 'Khamas', 'A playful yet tender evening raga alive with romantic charm. Its light, dancing phrases carry a bittersweet sweetness, like firelight flickering on a warm night.', 'evening'),
  ('navarasakannada', 'Navarasakannada', 'A versatile raga capable of expressing all nine emotions, from heroism to compassion. Its expansive melodic canvas makes every phrase a journey through the full spectrum of human feeling.', null),
  ('poornachandrika', 'Poornachandrika', 'A moonlit raga of soft radiance and gentle wonder. Its luminous phrases evoke the beauty of a full moon night — calm, enchanting, and quietly transcendent.', 'night'),
  ('suddhadhanyasi', 'Suddhadhanyasi', 'A deeply moving raga of pathos and tender melancholy. Its simple, unadorned phrases pierce straight to the heart, evoking compassion, longing, and the beauty of impermanence.', null),
  ('todi', 'Todi', 'A majestic morning raga of quiet intensity. Its slow, deliberate phrases demand full attention and reward it with profound stillness.', 'morning');

-- 4. Insert production tracks

-- Asaveri (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('asaveri-01', 'A Sweet Asaveri', 'asaveri', '{meditate}', '{contemplative,expansive}', '', 'During the week prior to this, an instrumentalist rendered - for the sake of a small handful of mridangam students - a song in this raga, with its ''curved'' (''vakra'') prayogas (passages) - and, spontaneously singing kalpana swaras (''dream notes'') thereafter (startling everyone a bit...) led to attempting to think through the raga on the fly here.', '2026-04-03', 'Home, Earth', 994, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/asaveri_04072026.m4a', true, '2026-04-03T00:00:00Z');

-- Bilahari (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('bilahari-01', 'Reliving the past (in fives)', 'bilahari', '{focus}', '{explorative,energetic}', 'A playful and joyful ragam that just leant itself to a cycle of fives (or tens) AKA kanda chapu.', 'There was a ''tautness'' to this session that we''ll want to dive into more and more', '2026-04-13', '', 2008, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/bilahari_04162026.m4a', true, '2026-04-13T00:00:00Z');

-- Hamsanadam (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('hamsanadam-01', 'Eventually Elevated Hamsanadam', 'hamsanadam', '{meditate}', '{open,majestic,aligned}', '', '*Swan sound*, this raga name would have it, programmatically...', '2026-03-27', 'Home, Portland', 1540, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/hamsanadam_04072026.m4a', true, '2026-03-27T00:00:00Z');

-- Hamsanandi (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('hamsanandi-01', 'Hamsanandi, hang on...', 'hamsanandi', '{meditate}', '{searching,pointed,dreamy}', 'A hindustani-style rendition in mishram', '*Swan bliss*, this raga name would have it, programmatically. I suppose I can imagine a swan blissfully singing this (with an effort...)', '2026-03-27', 'Home, Earth', 1185, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/hamsanandi_04072026.m4a', true, '2026-03-27T00:00:00Z');

-- Kambhoji (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('kambhoji-01', 'Kambhoji Prelude ( ... to what?)', 'kambhoji', '{focus}', '{energetic,uplifting,expansive}', '', 'This session occurred in the midst of the preparations for an unexpected gathering.', '2026-01-23', 'Home, Portland', 1626, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/kambhoji_04072026.m4a', true, '2026-01-23T00:00:00Z');

-- Kannadagowla (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('kannadagowla-01', 'A Kannadagowla in Rupakam', 'kannadagowla', '{sleep,meditate}', '{calm,soft,serene}', 'A meditation on this wistful ragam was on order today.', 'The cold of the morning was just beginning to break when we sat down to record. As the air warmed, so did we but it lead to a nice build up in vibes.', '2026-03-23', 'By the couch, near the fireplace', 543, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/kannadagowla_03262026.m4a', true, '2026-03-23T00:00:00Z');

-- Karnatabehag (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('karnatabehag-01', null, 'karnatabehag', '{meditate}', '{short,sweet,punchy}', '', 'New mridangam, new sounds.', '2026-04-10', 'Portland, OR', 1007, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/karnatabehag_04122026.m4a', true, '2026-04-10T00:00:00Z');

-- Kedaragowla (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('kedaragowla-01', 'A Kedaragowla *slowly approaching* (''mandakranta'')', 'kedaragowla', '{sleep}', '{settled,multifaceted,wellrounded}', '', 'Inspired by listening to a serenely musical family collectively render three different, carefully crafted (and remembered) songs in this raga.', '2026-03-23', 'Home, Portland', 628, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/kedaragowla_03262026.m4a', true, '2026-03-23T00:00:00Z');

-- Khamas (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('khamas-01', 'Meandering Khamas', 'khamas', '{focus}', '{playful,explorative,uplifting}', '', 'Tried some slow/fast transitions that didn''t work completely.', '2026-04-03', 'Home, Earth', 939, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/khamas_04072026.m4a', true, '2026-04-03T00:00:00Z');

-- Navarasakannada (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('navarasakannada-01', 'Every Emotion Navarasakannada', 'navarasakannada', '{meditate}', '{playful,fast,contemplative}', '', 'The kids were playing around, creating a pillow fort while we recorded which clearly added to the presentation of this ragam.', '2026-01-19', 'Home, Portland', 2339, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/navarasakannada_04072026.m4a', true, '2026-01-19T00:00:00Z');

-- Poornachandrika (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('poornachandrika-01', 'Keep in mind', 'poornachandrika', '{meditate,focus}', '{fast,playful,joyful}', '', null, '2026-04-10', 'Portland, OR', 1587, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/poornachandrika_04122026.m4a', true, '2026-04-10T00:00:00Z');

-- Suddhadhanyasi (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('suddhadhanyasi-01', 'Simple Suddhadhanyasi', 'suddhadhanyasi', '{meditate}', '{sparse,expansive}', '', 'A fancy name for a very common ''scale'' - the so-called *minor pentatonic*, here approached quite straightforwardly.', '2026-01-23', 'Home, Earth', 1860, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/suddhadhanyasi_04072026.m4a', true, '2026-01-23T00:00:00Z');

-- Todi (1 track)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('todi-01', 'Fiery Todi', 'todi', '{focus,meditate}', '{intense,spacious,uplifting}', '', 'The mridangam''s toppi really opened up in this one. I''m happy with it. Gautam''s really bringing it in this one and I keep coming back to it for one more play.', '2026-03-26', 'Home, Oregon', 1329, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/todi_03262026.m4a', true, '2026-03-26T00:00:00Z');

COMMIT;

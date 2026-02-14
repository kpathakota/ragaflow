-- Ragams
insert into ragams (id, name, description, time_of_day) values
  ('bhairavi', 'Bhairavi', 'A profound and expressive raga often called the queen of ragas. Its rich, emotive phrases have been used for centuries in devotional and contemplative music.', 'morning'),
  ('neelambari', 'Neelambari', 'The quintessential lullaby raga, used for centuries to induce sleep. Its gentle, descending phrases calm the nervous system.',  'night'),
  ('sahana', 'Sahana', 'A deeply emotive raga of longing and surrender. Its contemplative phrases draw the listener inward, ideal for breathwork and presence.', 'evening');

-- Tracks
insert into tracks (id, title, ragam_id, scenarios, tags, description, duration, audio_url, free, created_at) values
  ('bhairavi-focus-01', 'Morning Bhairavi — Deep Focus', 'bhairavi', '{focus}', '{grounding,concentration,warmth}', 'A grounding Bhairavi improvisation with percussion. Its rich phrases sharpen concentration and sustain deep focus.', 2700, '/audio/focus/Bhairavi_440Hz_with_percussion.m4a', true, '2025-01-01T00:00:00Z'),
  ('neelambari-sleep-01', 'Neelambari Lullaby', 'neelambari', '{sleep}', '{calm,surrender,warmth}', 'The quintessential lullaby raga with gentle percussion. Its descending phrases calm the nervous system and ease you into rest.', 3600, '/audio/sleep/Neelambari_440Hz_with_percussion.mp3', true, '2025-01-01T00:00:00Z'),
  ('sahana-meditate-01', 'Sahana — Contemplation', 'sahana', '{meditate}', '{contemplative,longing,surrender}', 'A deeply emotive Sahana improvisation for meditation. Its contemplative phrases draw the listener inward, ideal for breathwork and presence.', 3600, '/audio/meditate/Sahana_440Hz_with_percussion.mp3', true, '2025-01-01T00:00:00Z');

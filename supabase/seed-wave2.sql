-- Wave 2: 9 additional tracks (3 focus, 3 sleep, 3 meditate)
-- All audio_url points to the single available file on R2 for dev/staging

-- Ragams (upsert so this is safe to run whether or not seed.sql was run first)
insert into ragams (id, name, description, time_of_day) values
  ('bhairavi', 'Bhairavi', 'A profound and expressive raga often called the queen of ragas. Its rich, emotive phrases have been used for centuries in devotional and contemplative music.', 'morning'),
  ('neelambari', 'Neelambari', 'The lullaby raga, used for centuries to induce sleep. Its gentle, descending phrases calm the nervous system.', 'night'),
  ('sahana', 'Sahana', 'An emotive raga of longing and surrender. Its contemplative phrases draw the listener inward, ideal for breathwork and presence.', 'evening'),
  ('hindolam', 'Hindolam', 'A pentatonic raga of deep serenity. Its simple, swinging phrases create a meditative space that requires no effort to enter.', 'morning'),
  ('mohanam', 'Mohanam', 'A bright, uplifting pentatonic raga. Its joyful, ascending phrases energize the mind and lift the spirit without overstimulating.', 'afternoon'),
  ('kalyani', 'Kalyani', 'An expansive, luminous raga associated with auspiciousness. Its wide-ranging phrases open the chest and create a feeling of spaciousness.', 'evening'),
  ('todi', 'Todi', 'A majestic morning raga of quiet intensity. Its slow, deliberate phrases demand full attention and reward it with profound stillness.', 'morning')
on conflict (id) do nothing;

-- Focus tracks (3)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('kalyani-focus-03', 'Kalyani — Open Sky', 'kalyani', '{focus}', '{luminous,steady,open}', 'A mid-morning Kalyani with long, ascending phrases that open like a clearing sky. The brightness sustains attention without urgency.', null, '2025-04-12', 'Spring morning, home studio', 2700, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/Bhairavi_440Hz_with_percussion.m4a', true, '2025-04-12T00:00:00Z'),
  ('todi-focus-02', null, 'todi', '{focus}', '{deliberate,intense,solitary}', 'A solo Todi recorded on a cold, clear morning. The deliberate pacing and quiet intensity create a deep container for undistracted work.', 'The house was empty and the heater was off. Something about the cold sharpened every note.', '2025-04-20', 'Cold morning, Portland', 2700, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/Bhairavi_440Hz_with_percussion.m4a', true, '2025-04-20T00:00:00Z'),
  ('sahana-focus-02', 'Sahana — Afternoon Flow', 'sahana', '{focus}', '{flowing,afternoon,gentle}', 'An afternoon Sahana with a continuous, unhurried flow. The phrases connect seamlessly, creating a current that carries attention forward without effort.', null, '2025-05-03', 'Afternoon session, Sellwood', 2700, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/Bhairavi_440Hz_with_percussion.m4a', false, '2025-05-03T00:00:00Z');

-- Sleep tracks (3)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('neelambari-sleep-04', 'Neelambari — River at Night', 'neelambari', '{sleep}', '{flowing,river,dissolving}', 'Recorded beside a river at night. The water sounds and Neelambari''s descending phrases merge into a single lulling texture.', 'The Kaveri was low that night. You could hear every ripple. I tuned to the river, not the other way around.', '2025-04-08', 'Riverside, Srirangam', 5400, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/Bhairavi_440Hz_with_percussion.m4a', true, '2025-04-08T00:00:00Z'),
  ('hindolam-sleep-02', null, 'hindolam', '{sleep}', '{pentatonic,weightless,sparse}', 'A late-night Hindolam with long gaps of silence between phrases. Each note arrives like a slow exhale, then fades completely before the next.', null, '2025-04-25', 'Late night, home studio', 5400, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/Bhairavi_440Hz_with_percussion.m4a', true, '2025-04-25T00:00:00Z'),
  ('bhairavi-sleep-02', null, 'bhairavi', '{sleep}', '{warmth,minimal,candlelight}', 'A candlelit Bhairavi, barely louder than a whisper. The warmth of the raga and the near-silence of the room create a cocoon for rest.', null, '2025-05-10', 'Candlelit session, Portland', 5400, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/Bhairavi_440Hz_with_percussion.m4a', true, '2025-05-10T00:00:00Z');

-- Meditate tracks (3)
insert into tracks (id, title, ragam_id, scenarios, tags, description, artist_note, recorded_date, location, duration, audio_url, free, created_at) values
  ('hindolam-meditate-03', 'Hindolam — Breath Cycle', 'hindolam', '{meditate}', '{breath,rhythmic,grounding}', 'A Hindolam paced to match a slow breathing cycle. Each phrase rises on the inhale and descends on the exhale, guiding the listener into rhythm.', 'I set a metronome to my own breath rate before recording. Then I turned it off and let the body keep time.', '2025-04-15', 'Morning practice, home studio', 3600, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/Bhairavi_440Hz_with_percussion.m4a', true, '2025-04-15T00:00:00Z'),
  ('mohanam-meditate-02', null, 'mohanam', '{meditate}', '{sunrise,hopeful,warm}', 'A sunrise Mohanam at Marina Beach. The rising sun and the ascending raga move together, filling the space with quiet optimism.', 'The fishermen were already out. Their boats were small dark shapes against the orange. I played facing east.', '2025-05-01', 'Sunrise, Marina Beach, Chennai', 3600, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/Bhairavi_440Hz_with_percussion.m4a', true, '2025-05-01T00:00:00Z'),
  ('sahana-meditate-03', 'Sahana — Still Water', 'sahana', '{meditate}', '{stillness,lake,presence}', 'An early morning Sahana beside a still lake. The water reflected everything — the light, the sound, the silence between phrases.', null, '2025-05-15', 'Lakeside, Ooty', 3600, 'https://pub-1a2eea0965e14d279ebdbbe8bd7c34bf.r2.dev/tracks/Bhairavi_440Hz_with_percussion.m4a', false, '2025-05-15T00:00:00Z');

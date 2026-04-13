-- Backfill artist_note for all seed tracks that were inserted with NULL
UPDATE tracks SET artist_note = CASE id
  WHEN 'bhairavi-focus-01' THEN 'The mridangam player and I had been practicing together for weeks. That morning everything locked in — the rhythm became invisible, just a pulse you could think inside of.'
  WHEN 'bhairavi-sleep-01' THEN 'It had been raining all day and I didn''t want to play anything structured. I just followed the sound of the rain and let Bhairavi fill in the spaces between drops.'
  WHEN 'bhairavi-focus-02' THEN 'Sunday mornings are when I practice the most demanding material. This one started as a technical exercise and turned into something I actually wanted to listen back to.'
  WHEN 'neelambari-sleep-01' THEN 'My grandmother used to hum Neelambari to put us to sleep. I never learned it from her formally — it just lived in my ear all these years. This is my version of her lullaby.'
  WHEN 'neelambari-sleep-02' THEN 'I was experimenting with how much silence a raga can hold before it stops being music. Neelambari held more than I expected.'
  WHEN 'neelambari-sleep-03' THEN 'Thanjavur is where so much of this music was codified. Playing Neelambari there felt less like performing and more like remembering something ancient.'
  WHEN 'sahana-meditate-01' THEN 'Sahana always takes me somewhere I wasn''t planning to go. This morning it went to a place of real longing — not sadness, just the ache of paying close attention to something beautiful.'
  WHEN 'sahana-focus-01' THEN 'Portland in December is all grey sky and soft light. Sahana fits that mood perfectly — it doesn''t try to brighten anything, just sits with you in the overcast.'
  WHEN 'sahana-sleep-01' THEN 'Everyone else was out celebrating. I stayed home and played Sahana as the year ended. It felt like the right way to let go of everything that year held.'
  WHEN 'hindolam-meditate-01' THEN 'Five notes. That''s all Hindolam gives you. But in that courtyard with the jasmine and the evening breeze, five notes were more than enough.'
  WHEN 'hindolam-focus-01' THEN 'I play Hindolam when I need to clear my own head before a long day. This one did exactly that — by the end I felt like the fog had lifted.'
  WHEN 'hindolam-sleep-01' THEN 'I kept playing softer and softer until I couldn''t tell where the music ended and the rain began. That''s when I knew it was done.'
  WHEN 'hindolam-meditate-02' THEN 'The house smelled like sambar and coffee. My parents were visiting. I played this before anyone else woke up, just grateful for the morning.'
  WHEN 'hindolam-focus-02' THEN 'Sellwood disappears in the fog some mornings. You can''t see past the yard. That kind of containment is perfect for Hindolam — nowhere to go, nothing to prove.'
  WHEN 'mohanam-focus-01' THEN 'One of those rare November days in Portland where the sun comes out and everyone goes a little crazy with happiness. The raga caught that energy.'
  WHEN 'mohanam-focus-02' THEN 'Weekend mornings with no agenda are when the best sessions happen. No pressure, no clock — just the raga and the tala finding each other.'
  WHEN 'mohanam-focus-03' THEN 'I brought a small recorder to my favorite coffee shop and played quietly in the corner. The barista asked what raga it was. That made my day.'
  WHEN 'kalyani-focus-01' THEN 'End of the year, looking back at everything. Kalyani felt right — it''s a raga that holds both joy and gravity at the same time.'
  WHEN 'kalyani-focus-02' THEN 'Snow absorbs sound. Playing Kalyani in that silence felt like the notes had nowhere to go but inward. The mountain was listening.'
  WHEN 'kalyani-sleep-01' THEN 'Kalyani is usually a daytime raga but I couldn''t sleep and it''s what came out. Played very slowly, it became something completely different — weightless.'
  WHEN 'todi-focus-01' THEN 'Todi on a Saturday morning is my version of going to the gym. It''s demanding, it requires your full attention, and you feel completely different afterward.'
  WHEN 'todi-meditate-02' THEN 'Mylapore mornings are sacred. Musicians have been playing Todi at this hour in this neighborhood for hundreds of years. I''m just the latest in a long line.'
  WHEN 'todi-sleep-01' THEN 'My teacher would say you shouldn''t play Todi at midnight. But rules in music are just suggestions once you''ve internalized them. This one wanted to be played.'
  ELSE artist_note
END
WHERE artist_note IS NULL;

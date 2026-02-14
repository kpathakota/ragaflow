import type { Ragam, Track } from "@/lib/types";

export const ragams: Ragam[] = [
  {
    id: "bhairavi",
    name: "Bhairavi",
    description:
      "A profound and expressive raga often called the queen of ragas. Its rich, emotive phrases have been used for centuries in devotional and contemplative music.",
    tradition: "both",
    time_of_day: "morning",
  },
  {
    id: "neelambari",
    name: "Neelambari",
    description:
      "The quintessential lullaby raga, used for centuries to induce sleep. Its gentle, descending phrases calm the nervous system.",
    tradition: "carnatic",
    time_of_day: "night",
  },
  {
    id: "sahana",
    name: "Sahana",
    description:
      "A deeply emotive raga of longing and surrender. Its contemplative phrases draw the listener inward, ideal for breathwork and presence.",
    tradition: "carnatic",
    time_of_day: "evening",
  },
];

export const tracks: Track[] = [
  {
    id: "bhairavi-focus-01",
    title: "Morning Bhairavi — Deep Focus",
    ragam_id: "bhairavi",
    scenarios: ["focus"],
    tags: ["grounding", "concentration", "warmth"],
    description:
      "A grounding Bhairavi improvisation with percussion. Its rich phrases sharpen concentration and sustain deep focus.",
    duration: 2700,
    audio_url: "/audio/focus/Bhairavi_440Hz_with_percussion.m4a",
    download_url: null,
    free: true,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "neelambari-sleep-01",
    title: "Neelambari Lullaby",
    ragam_id: "neelambari",
    scenarios: ["sleep"],
    tags: ["calm", "surrender", "warmth"],
    description:
      "The quintessential lullaby raga with gentle percussion. Its descending phrases calm the nervous system and ease you into rest.",
    duration: 3600,
    audio_url: "/audio/sleep/Neelambari_440Hz_with_percussion.mp3",
    download_url: null,
    free: true,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "sahana-meditate-01",
    title: "Sahana — Contemplation",
    ragam_id: "sahana",
    scenarios: ["meditate"],
    tags: ["contemplative", "longing", "surrender"],
    description:
      "A deeply emotive Sahana improvisation for meditation. Its contemplative phrases draw the listener inward, ideal for breathwork and presence.",
    duration: 3600,
    audio_url: "/audio/meditate/Sahana_440Hz_with_percussion.mp3",
    download_url: null,
    free: true,
    created_at: "2025-01-01T00:00:00Z",
  },
];

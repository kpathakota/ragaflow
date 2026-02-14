export type Scenario = "focus" | "sleep" | "meditate";

export type Ragam = {
  id: string;
  name: string;
  description: string;
  tradition: "carnatic" | "hindustani" | "both";
  time_of_day: string | null;
};

export type Track = {
  id: string;
  title: string;
  ragam_id: string;
  scenarios: Scenario[];
  tags: string[];
  description: string;
  duration: number; // seconds
  audio_url: string;
  download_url: string | null;
  free: boolean;
  created_at: string;
};

export type RasikaPreferences = {
  id: string;
  rasika_id: string;
  favorite_tracks: string[];
  favorite_ragams: string[];
  default_focus_track: string | null;
  default_sleep_track: string | null;
  default_meditate_track: string | null;
};

export type ListeningSession = {
  id: string;
  rasika_id: string;
  track_id: string;
  scenario: Scenario;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
};

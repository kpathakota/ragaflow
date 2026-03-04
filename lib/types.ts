export type Scenario = "focus" | "sleep" | "meditate";

export type Ragam = {
  id: string;
  name: string;
  description: string;
  time_of_day: string | null;
};

export type Track = {
  id: string;
  title: string | null;
  ragam_id: string;
  scenarios: Scenario[];
  tags: string[];
  description: string;
  artist_note: string | null;
  recorded_date: string | null;
  location: string | null;
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
  default_focus_duration: number | null;
  default_sleep_duration: number | null;
  default_meditate_duration: number | null;
  custom_duration: number | null;
};

export type ListeningSession = {
  id: string;
  rasika_id: string;
  track_id: string;
  scenario: Scenario;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  intended_duration_seconds: number | null;
  completed: boolean | null;
};

export type Certification = {
  id: string;
  rasika_id: string;
  ragam_id: string;
  level: 1 | 2 | 3 | 4;
  total_seconds: number;
};

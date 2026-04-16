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

export type Rasika = {
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
  subscription_status: "free" | "active" | "canceled" | "past_due" | "expired" | "lifetime";
  polar_customer_id: string | null;
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

export type AnalyticsEventType =
  | "app_open"
  | "scenario_view"
  | "auth_error"
  | "playback_error";

export type AnalyticsEvent = {
  id: string;
  anonymous_id: string;
  rasika_id: string | null;
  event_type: AnalyticsEventType;
  platform: "web" | "ios";
  metadata: Record<string, unknown>;
  created_at: string;
};

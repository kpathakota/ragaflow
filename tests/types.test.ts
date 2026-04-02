import { describe, it, expect } from "vitest";
import type {
  Scenario,
  Ragam,
  Track,
  Rasika,
  ListeningSession,
  Certification,
} from "@/lib/types";

describe("Type definitions", () => {
  it("Scenario type accepts valid values", () => {
    const scenarios: Scenario[] = ["focus", "sleep", "meditate"];
    expect(scenarios).toHaveLength(3);
  });

  it("Ragam shape is correct", () => {
    const ragam: Ragam = {
      id: "r1",
      name: "Yaman",
      description: "Evening raga of devotion",
      time_of_day: "evening",
    };
    expect(ragam.id).toBe("r1");
    expect(ragam.time_of_day).toBe("evening");
  });

  it("Ragam allows null time_of_day", () => {
    const ragam: Ragam = {
      id: "r2",
      name: "Bhairavi",
      description: "Universal raga",
      time_of_day: null,
    };
    expect(ragam.time_of_day).toBeNull();
  });

  it("Track shape includes all required fields", () => {
    const track: Track = {
      id: "t1",
      title: null,
      ragam_id: "r1",
      scenarios: ["focus", "meditate"],
      tags: ["grounding", "calm"],
      description: "A peaceful morning session",
      artist_note: null,
      recorded_date: "2025-12-01",
      location: "Portland studio",
      duration: 2700,
      audio_url: "https://example.com/track.opus",
      download_url: null,
      free: true,
      created_at: "2025-12-01T00:00:00Z",
    };
    expect(track.scenarios).toContain("focus");
    expect(track.title).toBeNull();
    expect(track.free).toBe(true);
  });

  it("Track can appear under multiple scenarios", () => {
    const track: Track = {
      id: "t2",
      title: "Dawn Session",
      ragam_id: "r1",
      scenarios: ["focus", "sleep", "meditate"],
      tags: [],
      description: "Works for everything",
      artist_note: "A special session",
      recorded_date: null,
      location: null,
      duration: 5400,
      audio_url: "https://example.com/track2.opus",
      download_url: "https://example.com/track2.flac",
      free: false,
      created_at: "2025-12-01T00:00:00Z",
    };
    expect(track.scenarios).toHaveLength(3);
    expect(track.free).toBe(false);
  });

  it("Rasika has subscription status field", () => {
    const rasika: Rasika = {
      id: "1",
      rasika_id: "user-123",
      favorite_tracks: ["t1", "t2"],
      favorite_ragams: ["r1"],
      default_focus_track: "t1",
      default_sleep_track: null,
      default_meditate_track: null,
      default_focus_duration: 1500,
      default_sleep_duration: null,
      default_meditate_duration: null,
      custom_duration: 30,
      subscription_status: "free",
      polar_customer_id: null,
    };
    expect(rasika.subscription_status).toBe("free");
    expect(rasika.favorite_tracks).toHaveLength(2);
  });

  it("Rasika subscription_status accepts all valid values", () => {
    const statuses: Rasika["subscription_status"][] = [
      "free",
      "active",
      "canceled",
      "past_due",
      "expired",
      "lifetime",
    ];
    expect(statuses).toHaveLength(6);
  });

  it("ListeningSession shape is correct", () => {
    const session: ListeningSession = {
      id: "s1",
      rasika_id: "user-123",
      track_id: "t1",
      scenario: "focus",
      started_at: "2025-12-01T10:00:00Z",
      ended_at: "2025-12-01T10:25:00Z",
      duration_seconds: 1500,
      intended_duration_seconds: 1500,
      completed: true,
    };
    expect(session.completed).toBe(true);
    expect(session.duration_seconds).toBe(1500);
  });

  it("ListeningSession allows null ended_at (in-progress)", () => {
    const session: ListeningSession = {
      id: "s2",
      rasika_id: "user-123",
      track_id: "t1",
      scenario: "sleep",
      started_at: "2025-12-01T22:00:00Z",
      ended_at: null,
      duration_seconds: 0,
      intended_duration_seconds: null,
      completed: null,
    };
    expect(session.ended_at).toBeNull();
    expect(session.completed).toBeNull();
  });

  it("Certification has level 1-4", () => {
    const cert: Certification = {
      id: "c1",
      rasika_id: "user-123",
      ragam_id: "r1",
      level: 3,
      total_seconds: 360_000,
    };
    expect(cert.level).toBe(3);
    expect(cert.total_seconds).toBe(360_000);
  });
});

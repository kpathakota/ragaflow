import Testing
import Foundation
@testable import RagaflowModels

@Suite("Track model")
struct TrackTests {

    // MARK: - displayName

    @Test("displayName returns title when present")
    func displayNameWithTitle() {
        let track = makeTrack(title: "Morning Bhairav")
        #expect(track.displayName == "Morning Bhairav")
    }

    @Test("displayName ignores empty title, falls back to date · location")
    func displayNameEmptyTitle() {
        let track = makeTrack(title: "", recordedDate: "Jan 1", location: "Studio")
        #expect(track.displayName == "Jan 1 · Studio")
    }

    @Test("displayName returns Untitled for empty title with no date or location")
    func displayNameEmptyTitleNoFallback() {
        let track = makeTrack(title: "", recordedDate: nil, location: nil)
        #expect(track.displayName == "Untitled")
    }

    @Test("displayName falls back to date · location")
    func displayNameFallback() {
        let track = makeTrack(title: nil, recordedDate: "Jan 12", location: "Portland")
        #expect(track.displayName == "Jan 12 · Portland")
    }

    @Test("displayName with only date")
    func displayNameDateOnly() {
        let track = makeTrack(title: nil, recordedDate: "Jan 12", location: nil)
        #expect(track.displayName == "Jan 12")
    }

    @Test("displayName with only location")
    func displayNameLocationOnly() {
        let track = makeTrack(title: nil, recordedDate: nil, location: "Portland")
        #expect(track.displayName == "Portland")
    }

    @Test("displayName returns Untitled when nothing available")
    func displayNameUntitled() {
        let track = makeTrack(title: nil, recordedDate: nil, location: nil)
        #expect(track.displayName == "Untitled")
    }

    // MARK: - durationFormatted

    @Test("durationFormatted for minutes under 60")
    func durationMinutes() {
        let track = makeTrack(duration: 1500) // 25 min
        #expect(track.durationFormatted == "25m")
    }

    @Test("durationFormatted for exactly 1 hour")
    func durationExactHour() {
        let track = makeTrack(duration: 3600)
        #expect(track.durationFormatted == "1h")
    }

    @Test("durationFormatted for hours and minutes")
    func durationHoursMinutes() {
        let track = makeTrack(duration: 5400) // 1h 30m
        #expect(track.durationFormatted == "1h 30m")
    }

    @Test("durationFormatted for 0 seconds")
    func durationZero() {
        let track = makeTrack(duration: 0)
        #expect(track.durationFormatted == "0m")
    }

    // MARK: - JSON decoding

    @Test("decodes from snake_case JSON")
    func jsonDecoding() throws {
        let json = """
        {
            "id": "t1",
            "title": "Morning Session",
            "ragam_id": "r1",
            "scenarios": ["focus", "meditate"],
            "tags": ["grounding", "calm"],
            "description": "A calming morning raga",
            "artist_note": "Recorded at dawn",
            "recorded_date": "2025-01-15",
            "location": "Portland, OR",
            "duration": 2700,
            "audio_url": "https://example.com/track.opus",
            "download_url": null,
            "free": true,
            "created_at": "2025-01-15T08:00:00Z"
        }
        """.data(using: .utf8)!

        let track = try JSONDecoder().decode(Track.self, from: json)
        #expect(track.id == "t1")
        #expect(track.title == "Morning Session")
        #expect(track.ragamId == "r1")
        #expect(track.scenarios == [.focus, .meditate])
        #expect(track.tags == ["grounding", "calm"])
        #expect(track.artistNote == "Recorded at dawn")
        #expect(track.recordedDate == "2025-01-15")
        #expect(track.location == "Portland, OR")
        #expect(track.duration == 2700)
        #expect(track.free == true)
        #expect(track.downloadUrl == nil)
    }

    @Test("decodes with null title")
    func jsonDecodingNullTitle() throws {
        let json = """
        {
            "id": "t2",
            "title": null,
            "ragam_id": "r1",
            "scenarios": ["sleep"],
            "tags": [],
            "description": "Evening wind down",
            "artist_note": null,
            "recorded_date": null,
            "location": null,
            "duration": 5400,
            "audio_url": "https://example.com/track2.opus",
            "download_url": null,
            "free": false,
            "created_at": "2025-02-01T20:00:00Z"
        }
        """.data(using: .utf8)!

        let track = try JSONDecoder().decode(Track.self, from: json)
        #expect(track.title == nil)
        #expect(track.artistNote == nil)
        #expect(track.recordedDate == nil)
        #expect(track.location == nil)
        #expect(track.free == false)
    }

    // MARK: - Helpers

    private func makeTrack(
        title: String? = "Test",
        recordedDate: String? = "Jan 1",
        location: String? = "Studio",
        duration: Int = 1800
    ) -> Track {
        Track(
            id: "test-id",
            title: title,
            ragamId: "ragam-1",
            scenarios: [.focus],
            tags: ["calm"],
            description: "Test track",
            artistNote: nil,
            recordedDate: recordedDate,
            location: location,
            duration: duration,
            audioUrl: "https://example.com/audio.opus",
            downloadUrl: nil,
            free: true,
            createdAt: "2025-01-01T00:00:00Z"
        )
    }
}

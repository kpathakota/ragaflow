import Testing
import Foundation
@testable import RagaflowModels

@Suite("ListeningSession model")
struct ListeningSessionTests {

    @Test("decodes from JSON with all fields")
    func jsonDecodingFull() throws {
        let json = """
        {
            "id": "sess-1",
            "rasika_id": "user-1",
            "track_id": "track-1",
            "scenario": "focus",
            "started_at": "2025-03-01T10:00:00Z",
            "ended_at": "2025-03-01T10:25:00Z",
            "duration_seconds": 1500,
            "intended_duration_seconds": 1500,
            "completed": true
        }
        """.data(using: .utf8)!

        let session = try JSONDecoder().decode(ListeningSession.self, from: json)
        #expect(session.id == "sess-1")
        #expect(session.rasikaId == "user-1")
        #expect(session.trackId == "track-1")
        #expect(session.scenario == .focus)
        #expect(session.durationSeconds == 1500)
        #expect(session.intendedDurationSeconds == 1500)
        #expect(session.completed == true)
    }

    @Test("decodes with null optional fields")
    func jsonDecodingPartial() throws {
        let json = """
        {
            "id": "sess-2",
            "rasika_id": "user-1",
            "track_id": "track-2",
            "scenario": "sleep",
            "started_at": "2025-03-01T22:00:00Z",
            "ended_at": null,
            "duration_seconds": 0,
            "intended_duration_seconds": null,
            "completed": null
        }
        """.data(using: .utf8)!

        let session = try JSONDecoder().decode(ListeningSession.self, from: json)
        #expect(session.endedAt == nil)
        #expect(session.intendedDurationSeconds == nil)
        #expect(session.completed == nil)
    }
}

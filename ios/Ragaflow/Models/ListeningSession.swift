import Foundation

struct ListeningSession: Codable, Identifiable {
    let id: String
    let rasikaId: String
    let trackId: String
    let scenario: Scenario
    let startedAt: String
    var endedAt: String?
    var durationSeconds: Int
    var intendedDurationSeconds: Int?
    var completed: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case rasikaId = "rasika_id"
        case trackId = "track_id"
        case scenario
        case startedAt = "started_at"
        case endedAt = "ended_at"
        case durationSeconds = "duration_seconds"
        case intendedDurationSeconds = "intended_duration_seconds"
        case completed
    }
}

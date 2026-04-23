import Foundation

struct Track: Codable, Identifiable, Equatable {
    let id: String
    let title: String?
    let ragamId: String
    let scenarios: [Scenario]
    let tags: [String]
    let description: String
    let artistNote: String?
    let recordedDate: String?
    let location: String?
    let duration: Int // seconds
    let audioUrl: String
    let downloadUrl: String?
    let free: Bool
    let featured: Bool
    let featuredScenarios: [String]
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, title, scenarios, tags, description, duration, free, featured
        case ragamId = "ragam_id"
        case artistNote = "artist_note"
        case recordedDate = "recorded_date"
        case location
        case audioUrl = "audio_url"
        case downloadUrl = "download_url"
        case featuredScenarios = "featured_scenarios"
        case createdAt = "created_at"
    }

    /// Display name: title if available, otherwise "recorded date · location"
    var displayName: String {
        if let title, !title.isEmpty { return title }
        let parts = [recordedDate, location].compactMap { $0 }
        return parts.isEmpty ? "Untitled" : parts.joined(separator: " · ")
    }

    /// Duration formatted as "Xm" or "Xh Ym"
    var durationFormatted: String {
        let minutes = duration / 60
        if minutes < 60 { return "\(minutes)m" }
        let hours = minutes / 60
        let remaining = minutes % 60
        return remaining > 0 ? "\(hours)h \(remaining)m" : "\(hours)h"
    }
}

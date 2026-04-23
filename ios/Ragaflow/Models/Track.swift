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
    var featured: Bool = false
    var featuredScenarios: [String] = []
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

    init(
        id: String, title: String?, ragamId: String, scenarios: [Scenario],
        tags: [String], description: String, artistNote: String?,
        recordedDate: String?, location: String?, duration: Int,
        audioUrl: String, downloadUrl: String?, free: Bool,
        featured: Bool = false, featuredScenarios: [String] = [],
        createdAt: String
    ) {
        self.id = id; self.title = title; self.ragamId = ragamId
        self.scenarios = scenarios; self.tags = tags; self.description = description
        self.artistNote = artistNote; self.recordedDate = recordedDate
        self.location = location; self.duration = duration; self.audioUrl = audioUrl
        self.downloadUrl = downloadUrl; self.free = free; self.featured = featured
        self.featuredScenarios = featuredScenarios; self.createdAt = createdAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decodeIfPresent(String.self, forKey: .title)
        ragamId = try c.decode(String.self, forKey: .ragamId)
        scenarios = try c.decode([Scenario].self, forKey: .scenarios)
        tags = try c.decode([String].self, forKey: .tags)
        description = try c.decode(String.self, forKey: .description)
        artistNote = try c.decodeIfPresent(String.self, forKey: .artistNote)
        recordedDate = try c.decodeIfPresent(String.self, forKey: .recordedDate)
        location = try c.decodeIfPresent(String.self, forKey: .location)
        duration = try c.decode(Int.self, forKey: .duration)
        audioUrl = try c.decode(String.self, forKey: .audioUrl)
        downloadUrl = try c.decodeIfPresent(String.self, forKey: .downloadUrl)
        free = try c.decode(Bool.self, forKey: .free)
        featured = try c.decodeIfPresent(Bool.self, forKey: .featured) ?? false
        featuredScenarios = try c.decodeIfPresent([String].self, forKey: .featuredScenarios) ?? []
        createdAt = try c.decode(String.self, forKey: .createdAt)
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

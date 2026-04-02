import Foundation

struct Rasika: Codable, Identifiable, Equatable {
    let id: String
    let rasikaId: String
    var favoriteTracks: [String]
    var favoriteRagams: [String]
    var defaultFocusTrack: String?
    var defaultSleepTrack: String?
    var defaultMeditateTrack: String?
    var defaultFocusDuration: Int?
    var defaultSleepDuration: Int?
    var defaultMeditateDuration: Int?
    var customDuration: Int?
    var subscriptionStatus: SubscriptionStatus
    var polarCustomerId: String?

    enum CodingKeys: String, CodingKey {
        case id
        case rasikaId = "rasika_id"
        case favoriteTracks = "favorite_tracks"
        case favoriteRagams = "favorite_ragams"
        case defaultFocusTrack = "default_focus_track"
        case defaultSleepTrack = "default_sleep_track"
        case defaultMeditateTrack = "default_meditate_track"
        case defaultFocusDuration = "default_focus_duration"
        case defaultSleepDuration = "default_sleep_duration"
        case defaultMeditateDuration = "default_meditate_duration"
        case customDuration = "custom_duration"
        case subscriptionStatus = "subscription_status"
        case polarCustomerId = "polar_customer_id"
    }

    func defaultTrack(for scenario: Scenario) -> String? {
        switch scenario {
        case .focus: defaultFocusTrack
        case .sleep: defaultSleepTrack
        case .meditate: defaultMeditateTrack
        }
    }

    func defaultDuration(for scenario: Scenario) -> Int? {
        switch scenario {
        case .focus: defaultFocusDuration
        case .sleep: defaultSleepDuration
        case .meditate: defaultMeditateDuration
        }
    }
}

enum SubscriptionStatus: String, Codable {
    case free
    case active
    case canceled
    case pastDue = "past_due"
    case expired
    case lifetime
}

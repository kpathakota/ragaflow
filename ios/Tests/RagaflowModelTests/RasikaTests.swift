import Testing
import Foundation
@testable import RagaflowModels

@Suite("Rasika model")
struct RasikaTests {

    // MARK: - Default helpers

    @Test("defaultTrack returns correct track per scenario")
    func defaultTrackPerScenario() {
        let rasika = makeRasika(
            focusTrack: "t-focus",
            sleepTrack: "t-sleep",
            meditateTrack: "t-meditate"
        )
        #expect(rasika.defaultTrack(for: .focus) == "t-focus")
        #expect(rasika.defaultTrack(for: .sleep) == "t-sleep")
        #expect(rasika.defaultTrack(for: .meditate) == "t-meditate")
    }

    @Test("defaultTrack returns nil when not set")
    func defaultTrackNil() {
        let rasika = makeRasika()
        #expect(rasika.defaultTrack(for: .focus) == nil)
        #expect(rasika.defaultTrack(for: .sleep) == nil)
        #expect(rasika.defaultTrack(for: .meditate) == nil)
    }

    @Test("defaultDuration returns correct duration per scenario")
    func defaultDurationPerScenario() {
        let rasika = makeRasika(
            focusDuration: 1500,
            sleepDuration: 2700,
            meditateDuration: 600
        )
        #expect(rasika.defaultDuration(for: .focus) == 1500)
        #expect(rasika.defaultDuration(for: .sleep) == 2700)
        #expect(rasika.defaultDuration(for: .meditate) == 600)
    }

    @Test("defaultDuration returns nil when not set")
    func defaultDurationNil() {
        let rasika = makeRasika()
        #expect(rasika.defaultDuration(for: .focus) == nil)
    }

    // MARK: - SubscriptionStatus

    @Test("subscription statuses decode correctly", arguments: [
        ("free", SubscriptionStatus.free),
        ("active", SubscriptionStatus.active),
        ("canceled", SubscriptionStatus.canceled),
        ("past_due", SubscriptionStatus.pastDue),
        ("expired", SubscriptionStatus.expired),
        ("lifetime", SubscriptionStatus.lifetime),
    ])
    func subscriptionDecoding(raw: String, expected: SubscriptionStatus) throws {
        let json = "\"\(raw)\"".data(using: .utf8)!
        let status = try JSONDecoder().decode(SubscriptionStatus.self, from: json)
        #expect(status == expected)
    }

    // MARK: - JSON decoding

    @Test("decodes full rasika from JSON")
    func jsonDecoding() throws {
        let json = """
        {
            "id": "row-1",
            "rasika_id": "user-uuid",
            "favorite_tracks": ["t1", "t2"],
            "favorite_ragams": ["r1"],
            "default_focus_track": "t1",
            "default_sleep_track": null,
            "default_meditate_track": null,
            "default_focus_duration": 1500,
            "default_sleep_duration": null,
            "default_meditate_duration": null,
            "custom_duration": 30,
            "subscription_status": "active",
            "polar_customer_id": "pol_123"
        }
        """.data(using: .utf8)!

        let rasika = try JSONDecoder().decode(Rasika.self, from: json)
        #expect(rasika.rasikaId == "user-uuid")
        #expect(rasika.favoriteTracks == ["t1", "t2"])
        #expect(rasika.favoriteRagams == ["r1"])
        #expect(rasika.defaultFocusTrack == "t1")
        #expect(rasika.defaultSleepTrack == nil)
        #expect(rasika.customDuration == 30)
        #expect(rasika.subscriptionStatus == .active)
        #expect(rasika.polarCustomerId == "pol_123")
    }

    // MARK: - Helpers

    private func makeRasika(
        focusTrack: String? = nil,
        sleepTrack: String? = nil,
        meditateTrack: String? = nil,
        focusDuration: Int? = nil,
        sleepDuration: Int? = nil,
        meditateDuration: Int? = nil
    ) -> Rasika {
        Rasika(
            id: "row-1",
            rasikaId: "user-1",
            favoriteTracks: [],
            favoriteRagams: [],
            defaultFocusTrack: focusTrack,
            defaultSleepTrack: sleepTrack,
            defaultMeditateTrack: meditateTrack,
            defaultFocusDuration: focusDuration,
            defaultSleepDuration: sleepDuration,
            defaultMeditateDuration: meditateDuration,
            customDuration: nil,
            subscriptionStatus: .free,
            polarCustomerId: nil
        )
    }
}

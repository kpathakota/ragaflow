import Testing
import Foundation
@testable import RagaflowModels

@Suite("Certification tier logic")
struct CertificationTests {

    // MARK: - TierInfo.from

    @Test("0 seconds = no tier, next tier is bronze")
    func zeroSeconds() {
        let info = TierInfo.from(totalSeconds: 0)
        #expect(info.currentTier == nil)
        #expect(info.nextTier == .bronze)
        #expect(info.progressPercent == 0)
    }

    @Test("halfway to bronze")
    func halfwayToBronze() {
        let info = TierInfo.from(totalSeconds: 18_000) // 5 hours
        #expect(info.currentTier == nil)
        #expect(info.nextTier == .bronze)
        #expect(info.progressPercent == 50.0)
    }

    @Test("exactly at bronze threshold")
    func exactlyBronze() {
        let info = TierInfo.from(totalSeconds: 36_000) // 10 hours
        #expect(info.currentTier == .bronze)
        #expect(info.nextTier == .silver)
    }

    @Test("between bronze and silver")
    func betweenBronzeAndSilver() {
        let info = TierInfo.from(totalSeconds: 108_000) // 30 hours
        #expect(info.currentTier == .bronze)
        #expect(info.nextTier == .silver)
        // progress = (108000 - 36000) / (180000 - 36000) * 100 = 72000/144000 * 100 = 50%
        #expect(info.progressPercent == 50.0)
    }

    @Test("exactly at silver threshold")
    func exactlySilver() {
        let info = TierInfo.from(totalSeconds: 180_000) // 50 hours
        #expect(info.currentTier == .silver)
        #expect(info.nextTier == .gold)
    }

    @Test("exactly at gold threshold")
    func exactlyGold() {
        let info = TierInfo.from(totalSeconds: 360_000) // 100 hours
        #expect(info.currentTier == .gold)
        #expect(info.nextTier == .platinum)
    }

    @Test("exactly at platinum threshold")
    func exactlyPlatinum() {
        let info = TierInfo.from(totalSeconds: 900_000) // 250 hours
        #expect(info.currentTier == .platinum)
        #expect(info.nextTier == nil)
        #expect(info.progressPercent == 100)
    }

    @Test("beyond platinum")
    func beyondPlatinum() {
        let info = TierInfo.from(totalSeconds: 1_200_000) // 333 hours
        #expect(info.currentTier == .platinum)
        #expect(info.nextTier == nil)
        #expect(info.progressPercent == 100)
    }

    // MARK: - CertificationTier properties

    @Test("tier thresholds are correct", arguments: [
        (CertificationTier.bronze, 36_000),
        (CertificationTier.silver, 180_000),
        (CertificationTier.gold, 360_000),
        (CertificationTier.platinum, 900_000),
    ])
    func tierThresholds(tier: CertificationTier, expected: Int) {
        #expect(tier.threshold == expected)
    }

    @Test("tier labels are correct", arguments: [
        (CertificationTier.bronze, "Bronze"),
        (CertificationTier.silver, "Silver"),
        (CertificationTier.gold, "Gold"),
        (CertificationTier.platinum, "Platinum"),
    ])
    func tierLabels(tier: CertificationTier, expected: String) {
        #expect(tier.label == expected)
    }

    // MARK: - computeCountableSeconds

    @Test("focus: completed session counts")
    func focusCompleted() {
        #expect(computeCountableSeconds(scenario: .focus, durationSeconds: 1500, completed: true) == 1500)
    }

    @Test("focus: incomplete session does not count")
    func focusIncomplete() {
        #expect(computeCountableSeconds(scenario: .focus, durationSeconds: 1500, completed: false) == 0)
    }

    @Test("sleep: always counts regardless of completion")
    func sleepAlwaysCounts() {
        #expect(computeCountableSeconds(scenario: .sleep, durationSeconds: 3600, completed: false) == 3600)
        #expect(computeCountableSeconds(scenario: .sleep, durationSeconds: 3600, completed: true) == 3600)
    }

    @Test("meditate: counts if >= 5 minutes")
    func meditateAboveThreshold() {
        #expect(computeCountableSeconds(scenario: .meditate, durationSeconds: 300, completed: false) == 300)
        #expect(computeCountableSeconds(scenario: .meditate, durationSeconds: 600, completed: true) == 600)
    }

    @Test("meditate: does not count if < 5 minutes")
    func meditateBelowThreshold() {
        #expect(computeCountableSeconds(scenario: .meditate, durationSeconds: 299, completed: false) == 0)
        #expect(computeCountableSeconds(scenario: .meditate, durationSeconds: 0, completed: true) == 0)
    }

    // MARK: - Certification JSON decoding

    @Test("decodes certification from JSON")
    func jsonDecoding() throws {
        let json = """
        {
            "id": "cert-1",
            "rasika_id": "user-1",
            "ragam_id": "ragam-1",
            "level": 2,
            "total_seconds": 200000
        }
        """.data(using: .utf8)!

        let cert = try JSONDecoder().decode(Certification.self, from: json)
        #expect(cert.id == "cert-1")
        #expect(cert.rasikaId == "user-1")
        #expect(cert.ragamId == "ragam-1")
        #expect(cert.level == 2)
        #expect(cert.totalSeconds == 200000)
    }
}

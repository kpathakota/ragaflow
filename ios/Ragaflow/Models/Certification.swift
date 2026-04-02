import SwiftUI

struct Certification: Codable, Identifiable, Equatable {
    let id: String
    let rasikaId: String
    let ragamId: String
    var level: Int // 1-4
    var totalSeconds: Int

    enum CodingKeys: String, CodingKey {
        case id
        case rasikaId = "rasika_id"
        case ragamId = "ragam_id"
        case level
        case totalSeconds = "total_seconds"
    }
}

// MARK: - Tier logic (mirrors lib/certifications.ts)

enum CertificationTier: Int, CaseIterable {
    case bronze = 1
    case silver = 2
    case gold = 3
    case platinum = 4

    var label: String {
        switch self {
        case .bronze: "Bronze"
        case .silver: "Silver"
        case .gold: "Gold"
        case .platinum: "Platinum"
        }
    }

    var threshold: Int {
        switch self {
        case .bronze: 36_000    // 10 hours
        case .silver: 180_000   // 50 hours
        case .gold: 360_000     // 100 hours
        case .platinum: 900_000 // 250 hours
        }
    }

    var color: Color {
        switch self {
        case .bronze: Color(red: 0.72, green: 0.45, blue: 0.20)
        case .silver: Color(red: 0.63, green: 0.66, blue: 0.72)
        case .gold: Color(red: 0.92, green: 0.79, blue: 0.15)
        case .platinum: Color(red: 0.69, green: 0.55, blue: 0.93)
        }
    }
}

struct TierInfo {
    let currentTier: CertificationTier?
    let nextTier: CertificationTier?
    let progressPercent: Double

    static func from(totalSeconds: Int) -> TierInfo {
        var current: CertificationTier?
        for tier in CertificationTier.allCases.reversed() {
            if totalSeconds >= tier.threshold {
                current = tier
                break
            }
        }

        let nextIndex = (current?.rawValue ?? 0) + 1
        let next = CertificationTier(rawValue: nextIndex)

        let bandStart = current?.threshold ?? 0
        let bandEnd = next?.threshold ?? CertificationTier.platinum.threshold

        let progress: Double
        if bandEnd == bandStart {
            progress = 100
        } else {
            progress = min(100, Double(totalSeconds - bandStart) / Double(bandEnd - bandStart) * 100)
        }

        return TierInfo(currentTier: current, nextTier: next, progressPercent: progress)
    }
}

// MARK: - Session counting rules (mirrors computeCountableSeconds)

func computeCountableSeconds(scenario: Scenario, durationSeconds: Int, completed: Bool) -> Int {
    switch scenario {
    case .focus:
        return completed ? durationSeconds : 0
    case .sleep:
        return durationSeconds
    case .meditate:
        return durationSeconds >= 300 ? durationSeconds : 0
    }
}

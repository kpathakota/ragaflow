import SwiftUI

enum Scenario: String, Codable, CaseIterable, Identifiable {
    case focus
    case sleep
    case meditate

    var id: String { rawValue }

    var label: String {
        switch self {
        case .focus: "Focus"
        case .sleep: "Sleep"
        case .meditate: "Meditate"
        }
    }

    var subtitle: String {
        switch self {
        case .focus: "Sharpen your mind with ragas for deep work"
        case .sleep: "Drift into rest with soothing evening ragas"
        case .meditate: "Find stillness with ragas for contemplation"
        }
    }

    /// Matches web scenario-config.ts accent colors
    var accentColor: Color {
        switch self {
        case .focus: Color(red: 0.79, green: 0.65, blue: 0.30)    // #C9A54C gold
        case .sleep: Color(red: 0.69, green: 0.53, blue: 0.47)    // #B08878 brown
        case .meditate: Color(red: 0.54, green: 0.61, blue: 0.45) // #8A9B72 sage
        }
    }

    /// Lighter variant for text on dark backgrounds
    var accentColorLight: Color {
        switch self {
        case .focus: Color(red: 0.85, green: 0.72, blue: 0.40)    // lighter gold
        case .sleep: Color(red: 0.78, green: 0.62, blue: 0.56)    // lighter brown
        case .meditate: Color(red: 0.64, green: 0.71, blue: 0.55) // lighter sage
        }
    }
}

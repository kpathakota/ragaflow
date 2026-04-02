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

    var accentColor: Color {
        switch self {
        case .focus: .blue
        case .sleep: .indigo
        case .meditate: Color(red: 0.96, green: 0.75, blue: 0.03) // amber
        }
    }

    var accentColorLight: Color {
        switch self {
        case .focus: Color(red: 0.38, green: 0.65, blue: 1.0) // blue-400
        case .sleep: Color(red: 0.51, green: 0.51, blue: 1.0) // indigo-400
        case .meditate: Color(red: 0.98, green: 0.82, blue: 0.28) // amber-400
        }
    }
}

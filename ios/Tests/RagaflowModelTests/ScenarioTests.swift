import Testing
import Foundation
@testable import RagaflowModels

@Suite("Scenario enum")
struct ScenarioTests {

    @Test("labels are capitalized")
    func labels() {
        #expect(Scenario.focus.label == "Focus")
        #expect(Scenario.sleep.label == "Sleep")
        #expect(Scenario.meditate.label == "Meditate")
    }

    @Test("subtitles are non-empty")
    func subtitles() {
        for scenario in Scenario.allCases {
            #expect(!scenario.subtitle.isEmpty)
        }
    }

    @Test("raw values match database strings")
    func rawValues() {
        #expect(Scenario.focus.rawValue == "focus")
        #expect(Scenario.sleep.rawValue == "sleep")
        #expect(Scenario.meditate.rawValue == "meditate")
    }

    @Test("id equals rawValue")
    func idMatchesRaw() {
        for scenario in Scenario.allCases {
            #expect(scenario.id == scenario.rawValue)
        }
    }

    @Test("CaseIterable includes all 3 scenarios")
    func allCases() {
        #expect(Scenario.allCases.count == 3)
    }

    @Test("decodes from JSON string")
    func jsonDecoding() throws {
        let json = "\"focus\"".data(using: .utf8)!
        let scenario = try JSONDecoder().decode(Scenario.self, from: json)
        #expect(scenario == .focus)
    }
}

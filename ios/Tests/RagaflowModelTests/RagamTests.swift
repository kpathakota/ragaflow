import Testing
import Foundation
@testable import RagaflowModels

@Suite("Ragam model")
struct RagamTests {

    @Test("decodes from snake_case JSON")
    func jsonDecoding() throws {
        let json = """
        {
            "id": "ragam-1",
            "name": "Bhairavi",
            "description": "A raga of devotion and surrender",
            "time_of_day": "morning"
        }
        """.data(using: .utf8)!

        let ragam = try JSONDecoder().decode(Ragam.self, from: json)
        #expect(ragam.id == "ragam-1")
        #expect(ragam.name == "Bhairavi")
        #expect(ragam.description == "A raga of devotion and surrender")
        #expect(ragam.timeOfDay == "morning")
    }

    @Test("decodes with null time_of_day")
    func jsonDecodingNullTime() throws {
        let json = """
        {
            "id": "ragam-2",
            "name": "Yaman",
            "description": "Evening raga of peace",
            "time_of_day": null
        }
        """.data(using: .utf8)!

        let ragam = try JSONDecoder().decode(Ragam.self, from: json)
        #expect(ragam.timeOfDay == nil)
    }

    @Test("Equatable conformance")
    func equatable() {
        let a = Ragam(id: "r1", name: "Bhairavi", description: "test", timeOfDay: nil)
        let b = Ragam(id: "r1", name: "Bhairavi", description: "test", timeOfDay: nil)
        let c = Ragam(id: "r2", name: "Yaman", description: "test", timeOfDay: nil)
        #expect(a == b)
        #expect(a != c)
    }
}

import Foundation

struct Ragam: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let description: String
    let timeOfDay: String?

    enum CodingKeys: String, CodingKey {
        case id, name, description
        case timeOfDay = "time_of_day"
    }
}

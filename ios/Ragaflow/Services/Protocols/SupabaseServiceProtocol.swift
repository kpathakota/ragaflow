import Foundation
import Supabase

protocol SupabaseServiceProtocol: AnyObject {
    // Auth state
    var currentUser: User? { get }
    var isLoading: Bool { get }
    var isAuthenticated: Bool { get }

    // Auth actions
    func initialize() async
    func signIn(email: String, password: String) async throws
    func signUp(email: String, password: String) async throws
    func signOut() async throws

    // Ragams
    func fetchAllRagams() async throws -> [Ragam]
    func fetchRagam(id: String) async throws -> Ragam?

    // Tracks
    func fetchAllTracks() async throws -> [Track]
    func fetchTracks(scenario: Scenario) async throws -> [Track]
    func fetchTrack(id: String) async throws -> Track?

    // Rasika
    func fetchRasika() async throws -> Rasika?

    // Favorites
    func toggleFavoriteTrack(trackId: String) async throws -> [String]
    func toggleFavoriteRagam(ragamId: String) async throws -> [String]

    // Defaults
    func setDefaultTrack(scenario: Scenario, trackId: String, durationSeconds: Int?) async throws

    // Sessions
    func startListeningSession(trackId: String, scenario: Scenario, intendedDurationSeconds: Int?) async throws -> String?
    func endListeningSession(sessionId: String, durationSeconds: Int, completed: Bool) async throws

    // Certifications
    func upsertCertification(ragamId: String, additionalSeconds: Int) async throws

    // Stats
    func fetchListeningSessions() async throws -> [ListeningSession]
    func fetchCertifications() async throws -> [Certification]
}

import Foundation
import Supabase

@Observable
final class MockSupabaseService: SupabaseServiceProtocol {
    // MARK: - Auth state

    var currentUser: User?
    var isLoading = false

    // MARK: - Configurable return values

    var ragams: [Ragam] = []
    var tracks: [Track] = []
    var rasika: Rasika?
    var certifications: [Certification] = []
    var listeningSessions: [ListeningSession] = []

    // MARK: - Call tracking

    var signInCalled = false
    var signUpCalled = false
    var signOutCalled = false
    var toggleFavoriteTrackCalls: [String] = []
    var toggleFavoriteRagamCalls: [String] = []
    var setDefaultTrackCalls: [(scenario: Scenario, trackId: String, durationSeconds: Int?)] = []
    var startSessionCalls: [(trackId: String, scenario: Scenario, duration: Int?)] = []
    var endSessionCalls: [(sessionId: String, durationSeconds: Int, completed: Bool)] = []
    var upsertCertCalls: [(ragamId: String, additionalSeconds: Int)] = []

    // MARK: - Error injection

    var errorToThrow: Error?

    // MARK: - Auth actions

    func initialize() async {
        isLoading = false
    }

    func signIn(email: String, password: String) async throws {
        if let error = errorToThrow { throw error }
        signInCalled = true
    }

    func signUp(email: String, password: String) async throws {
        if let error = errorToThrow { throw error }
        signUpCalled = true
    }

    func signOut() async throws {
        if let error = errorToThrow { throw error }
        signOutCalled = true
        currentUser = nil
    }

    // MARK: - Ragams

    func fetchAllRagams() async throws -> [Ragam] {
        if let error = errorToThrow { throw error }
        return ragams
    }

    func fetchRagam(id: String) async throws -> Ragam? {
        if let error = errorToThrow { throw error }
        return ragams.first { $0.id == id }
    }

    // MARK: - Tracks

    func fetchAllTracks() async throws -> [Track] {
        if let error = errorToThrow { throw error }
        return tracks
    }

    func fetchTracks(scenario: Scenario) async throws -> [Track] {
        if let error = errorToThrow { throw error }
        return tracks.filter { $0.scenarios.contains(scenario) }
    }

    func fetchTrack(id: String) async throws -> Track? {
        if let error = errorToThrow { throw error }
        return tracks.first { $0.id == id }
    }

    // MARK: - Rasika

    func fetchRasika() async throws -> Rasika? {
        if let error = errorToThrow { throw error }
        return rasika
    }

    // MARK: - Favorites

    func toggleFavoriteTrack(trackId: String) async throws -> [String] {
        if let error = errorToThrow { throw error }
        toggleFavoriteTrackCalls.append(trackId)

        guard var r = rasika else { return [] }
        if let index = r.favoriteTracks.firstIndex(of: trackId) {
            r.favoriteTracks.remove(at: index)
        } else {
            r.favoriteTracks.append(trackId)
        }
        rasika = r
        return r.favoriteTracks
    }

    func toggleFavoriteRagam(ragamId: String) async throws -> [String] {
        if let error = errorToThrow { throw error }
        toggleFavoriteRagamCalls.append(ragamId)

        guard var r = rasika else { return [] }
        if let index = r.favoriteRagams.firstIndex(of: ragamId) {
            r.favoriteRagams.remove(at: index)
        } else {
            r.favoriteRagams.append(ragamId)
        }
        rasika = r
        return r.favoriteRagams
    }

    // MARK: - Defaults

    func setDefaultTrack(scenario: Scenario, trackId: String, durationSeconds: Int?) async throws {
        if let error = errorToThrow { throw error }
        setDefaultTrackCalls.append((scenario, trackId, durationSeconds))
    }

    // MARK: - Sessions

    func startListeningSession(trackId: String, scenario: Scenario, intendedDurationSeconds: Int?) async throws -> String? {
        if let error = errorToThrow { throw error }
        startSessionCalls.append((trackId, scenario, intendedDurationSeconds))
        return "mock-session-\(startSessionCalls.count)"
    }

    func endListeningSession(sessionId: String, durationSeconds: Int, completed: Bool) async throws {
        if let error = errorToThrow { throw error }
        endSessionCalls.append((sessionId, durationSeconds, completed))
    }

    // MARK: - Certifications

    func upsertCertification(ragamId: String, additionalSeconds: Int) async throws {
        if let error = errorToThrow { throw error }
        upsertCertCalls.append((ragamId, additionalSeconds))
    }

    // MARK: - Stats

    func fetchListeningSessions() async throws -> [ListeningSession] {
        if let error = errorToThrow { throw error }
        return listeningSessions
    }

    func fetchCertifications() async throws -> [Certification] {
        if let error = errorToThrow { throw error }
        return certifications
    }
}

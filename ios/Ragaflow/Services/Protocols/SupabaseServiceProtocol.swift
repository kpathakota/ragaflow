import Foundation
import Supabase

/// Thrown by `deleteAccount()` so the UI can distinguish the one recoverable
/// refusal (active subscription → 409) from everything else.
enum DeleteAccountError: Error {
    case activeSubscription
}

/// Outcome of classifying a `delete-account` invoke error. Pure mapping,
/// extracted so it can be unit-tested against real `FunctionsError` values.
enum DeleteAccountInvokeOutcome: Equatable {
    /// 409 — a live subscription blocks deletion.
    case activeSubscription
    /// 401 — the (freshly refreshed) token no longer resolves to a user.
    /// The account is already gone: a prior attempt succeeded server-side
    /// but its 200 was lost. Treat as deleted and clean up locally.
    case alreadyDeleted
    /// Anything else — propagate to the caller.
    case failure
}

func classifyDeleteAccountError(_ error: Error) -> DeleteAccountInvokeOutcome {
    if case let FunctionsError.httpError(code, _) = error {
        if code == 409 { return .activeSubscription }
        if code == 401 { return .alreadyDeleted }
    }
    return .failure
}

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
    func deleteAccount() async throws

    // Ragams
    func fetchAllRagams() async throws -> [Ragam]
    func fetchRagam(id: String) async throws -> Ragam?

    // Tracks
    func fetchAllTracks() async throws -> [Track]
    func fetchFeaturedTracks() async throws -> [Track]
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

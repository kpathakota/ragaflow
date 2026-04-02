import Foundation
import Supabase

@Observable
final class SupabaseService {
    static let shared = SupabaseService()

    let client: SupabaseClient

    private(set) var currentUser: User?
    private(set) var isLoading = true

    private init() {
        guard
            let urlString = Bundle.main.infoDictionary?["SUPABASE_URL"] as? String,
            let url = URL(string: urlString),
            let key = Bundle.main.infoDictionary?["SUPABASE_PUBLISHABLE_KEY"] as? String
        else {
            fatalError("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in Info.plist")
        }

        client = SupabaseClient(supabaseURL: url, supabaseKey: key)
    }

    // MARK: - Auth

    func initialize() async {
        do {
            currentUser = try await client.auth.user()
        } catch {
            currentUser = nil
        }
        isLoading = false

        // Listen for auth state changes
        Task {
            for await (event, session) in client.auth.authStateChanges {
                await MainActor.run {
                    self.currentUser = session?.user
                }
                if event == .signedIn, let userId = session?.user.id {
                    try? await ensureRasika(userId: userId)
                }
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        try await client.auth.signIn(email: email, password: password)
    }

    func signUp(email: String, password: String) async throws {
        try await client.auth.signUp(email: email, password: password)
    }

    func signOut() async throws {
        try await client.auth.signOut()
        await MainActor.run { currentUser = nil }
    }

    // MARK: - Ragams

    func fetchAllRagams() async throws -> [Ragam] {
        try await client.from("ragams").select().execute().value
    }

    func fetchRagam(id: String) async throws -> Ragam? {
        try? await client.from("ragams").select().eq("id", value: id).single().execute().value
    }

    // MARK: - Tracks

    func fetchAllTracks() async throws -> [Track] {
        try await client.from("tracks").select().execute().value
    }

    func fetchTracks(scenario: Scenario) async throws -> [Track] {
        try await client.from("tracks")
            .select()
            .contains("scenarios", value: [scenario.rawValue])
            .execute()
            .value
    }

    func fetchTrack(id: String) async throws -> Track? {
        try? await client.from("tracks").select().eq("id", value: id).single().execute().value
    }

    // MARK: - Rasika

    func fetchRasika() async throws -> Rasika? {
        guard let userId = currentUser?.id else { return nil }
        return try? await client.from("rasikas")
            .select()
            .eq("rasika_id", value: userId.uuidString)
            .single()
            .execute()
            .value
    }

    func ensureRasika(userId: UUID) async throws {
        let existing: Rasika? = try? await client.from("rasikas")
            .select()
            .eq("rasika_id", value: userId.uuidString)
            .single()
            .execute()
            .value

        if existing == nil {
            struct NewRasika: Encodable {
                let rasika_id: String
                let favorite_tracks: [String]
                let favorite_ragams: [String]
                let subscription_status: String
            }

            try await client.from("rasikas")
                .insert(NewRasika(
                    rasika_id: userId.uuidString,
                    favorite_tracks: [],
                    favorite_ragams: [],
                    subscription_status: "free"
                ))
                .execute()
        }
    }

    // MARK: - Favorites

    func toggleFavoriteTrack(trackId: String) async throws -> [String] {
        guard let userId = currentUser?.id else { return [] }

        var rasika = try await fetchRasika()
        guard var favorites = rasika?.favoriteTracks else { return [] }

        if let index = favorites.firstIndex(of: trackId) {
            favorites.remove(at: index)
        } else {
            favorites.append(trackId)
        }

        try await client.from("rasikas")
            .update(["favorite_tracks": favorites])
            .eq("rasika_id", value: userId.uuidString)
            .execute()

        return favorites
    }

    func toggleFavoriteRagam(ragamId: String) async throws -> [String] {
        guard let userId = currentUser?.id else { return [] }

        let rasika = try await fetchRasika()
        guard var favorites = rasika?.favoriteRagams else { return [] }

        if let index = favorites.firstIndex(of: ragamId) {
            favorites.remove(at: index)
        } else {
            favorites.append(ragamId)
        }

        try await client.from("rasikas")
            .update(["favorite_ragams": favorites])
            .eq("rasika_id", value: userId.uuidString)
            .execute()

        return favorites
    }

    // MARK: - Defaults

    func setDefaultTrack(scenario: Scenario, trackId: String, durationSeconds: Int?) async throws {
        guard let userId = currentUser?.id else { return }

        var update: [String: AnyJSON] = [:]
        switch scenario {
        case .focus:
            update["default_focus_track"] = .string(trackId)
            update["default_focus_duration"] = durationSeconds.map { .integer($0) } ?? .null
        case .sleep:
            update["default_sleep_track"] = .string(trackId)
            update["default_sleep_duration"] = durationSeconds.map { .integer($0) } ?? .null
        case .meditate:
            update["default_meditate_track"] = .string(trackId)
            update["default_meditate_duration"] = durationSeconds.map { .integer($0) } ?? .null
        }

        try await client.from("rasikas")
            .update(update)
            .eq("rasika_id", value: userId.uuidString)
            .execute()
    }

    // MARK: - Sessions

    func startListeningSession(trackId: String, scenario: Scenario, intendedDurationSeconds: Int?) async throws -> String? {
        guard let userId = currentUser?.id else { return nil }

        struct NewSession: Encodable {
            let rasika_id: String
            let track_id: String
            let scenario: String
            let intended_duration_seconds: Int?
        }

        struct InsertResult: Decodable {
            let id: String
        }

        let result: InsertResult = try await client.from("listening_sessions")
            .insert(NewSession(
                rasika_id: userId.uuidString,
                track_id: trackId,
                scenario: scenario.rawValue,
                intended_duration_seconds: intendedDurationSeconds
            ))
            .select("id")
            .single()
            .execute()
            .value

        return result.id
    }

    func endListeningSession(sessionId: String, durationSeconds: Int, completed: Bool) async throws {
        struct SessionUpdate: Encodable {
            let ended_at: String
            let duration_seconds: Int
            let completed: Bool
        }

        try await client.from("listening_sessions")
            .update(SessionUpdate(
                ended_at: ISO8601DateFormatter().string(from: Date()),
                duration_seconds: durationSeconds,
                completed: completed
            ))
            .eq("id", value: sessionId)
            .execute()
    }

    // MARK: - Certifications

    func upsertCertification(ragamId: String, additionalSeconds: Int) async throws {
        guard additionalSeconds > 0, let userId = currentUser?.id else { return }

        struct CertRow: Decodable {
            let id: String
            let total_seconds: Int
            let level: Int
        }

        let existing: CertRow? = try? await client.from("certifications")
            .select("id, total_seconds, level")
            .eq("rasika_id", value: userId.uuidString)
            .eq("ragam_id", value: ragamId)
            .single()
            .execute()
            .value

        let newTotal = (existing?.total_seconds ?? 0) + additionalSeconds
        let tierInfo = TierInfo.from(totalSeconds: newTotal)
        let newLevel = max(tierInfo.currentTier?.rawValue ?? 0, existing?.level ?? 0)

        if let existing {
            try await client.from("certifications")
                .update(["total_seconds": newTotal, "level": max(newLevel, 1)])
                .eq("id", value: existing.id)
                .execute()
        } else {
            struct NewCert: Encodable {
                let rasika_id: String
                let ragam_id: String
                let total_seconds: Int
                let level: Int
            }
            try await client.from("certifications")
                .insert(NewCert(
                    rasika_id: userId.uuidString,
                    ragam_id: ragamId,
                    total_seconds: newTotal,
                    level: max(newLevel, 1)
                ))
                .execute()
        }
    }

    // MARK: - Listening Stats

    func fetchListeningSessions() async throws -> [ListeningSession] {
        guard let userId = currentUser?.id else { return [] }
        return try await client.from("listening_sessions")
            .select()
            .eq("rasika_id", value: userId.uuidString)
            .execute()
            .value
    }

    func fetchCertifications() async throws -> [Certification] {
        guard let userId = currentUser?.id else { return [] }
        return try await client.from("certifications")
            .select()
            .eq("rasika_id", value: userId.uuidString)
            .execute()
            .value
    }
}

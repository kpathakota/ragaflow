import Foundation

@Observable
@MainActor
final class ProfileViewModel {
    private let supabase: SupabaseServiceProtocol

    var rasika: Rasika?
    var certifications: [Certification] = []
    var ragams: [String: Ragam] = [:]
    var totalListeningSeconds: Int = 0
    var sessionCount: Int = 0
    var isLoading = true

    // Account deletion (docs/account-deletion-design.md)
    enum DeleteAccountFailure {
        case activeSubscription
        case generic
    }

    var showDeleteConfirmation = false
    var isDeletingAccount = false
    var deleteAccountFailure: DeleteAccountFailure?

    init(supabase: SupabaseServiceProtocol) {
        self.supabase = supabase
    }

    // MARK: - Computed

    var userEmail: String? {
        supabase.currentUser?.email
    }

    var subscriptionStatus: SubscriptionStatus {
        rasika?.subscriptionStatus ?? .free
    }

    var formattedListeningTime: String {
        formatListeningTime(totalListeningSeconds)
    }

    // MARK: - Actions

    func loadData() async {
        do {
            async let rasikaResult = supabase.fetchRasika()
            async let certsResult = supabase.fetchCertifications()
            async let ragamsResult = supabase.fetchAllRagams()
            async let sessionsResult = supabase.fetchListeningSessions()

            let (fetchedRasika, fetchedCerts, fetchedRagams, sessions) = try await (rasikaResult, certsResult, ragamsResult, sessionsResult)

            rasika = fetchedRasika
            certifications = fetchedCerts
            ragams = Dictionary(uniqueKeysWithValues: fetchedRagams.map { ($0.id, $0) })
            totalListeningSeconds = sessions.reduce(0) { $0 + $1.durationSeconds }
            sessionCount = sessions.count
        } catch {}
        isLoading = false
    }

    func signOut() async {
        try? await supabase.signOut()
    }

    /// Returns true when the account was deleted (caller dismisses to the
    /// signed-out Home). On failure the account is intact and an alert-ready
    /// failure reason is set.
    func deleteAccount() async -> Bool {
        isDeletingAccount = true
        defer { isDeletingAccount = false }

        do {
            try await supabase.deleteAccount()
            return true
        } catch DeleteAccountError.activeSubscription {
            deleteAccountFailure = .activeSubscription
        } catch {
            deleteAccountFailure = .generic
        }
        return false
    }

    // MARK: - Formatting

    func formatListeningTime(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }
}

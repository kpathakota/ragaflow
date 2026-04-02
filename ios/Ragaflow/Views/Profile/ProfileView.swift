import SwiftUI

struct ProfileView: View {
    @Environment(SupabaseService.self) private var supabase

    @State private var rasika: Rasika?
    @State private var certifications: [Certification] = []
    @State private var ragams: [String: Ragam] = [:]
    @State private var totalListeningSeconds: Int = 0
    @State private var sessionCount: Int = 0
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            if isLoading {
                ProgressView()
                    .padding(.top, 100)
            } else {
                VStack(spacing: 24) {
                    // Account info
                    accountSection

                    // Stats
                    statsSection

                    // Subscription status
                    subscriptionSection

                    // Certifications
                    if !certifications.isEmpty {
                        certificationsSection
                    }

                    // Sign out
                    Button(role: .destructive) {
                        Task { try? await supabase.signOut() }
                    } label: {
                        Text("Sign Out")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemGray6))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding()
            }
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.large)
        .task {
            await loadData()
        }
    }

    @ViewBuilder
    private var accountSection: some View {
        if let email = supabase.currentUser?.email {
            VStack(spacing: 4) {
                Text(email)
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }

    private var statsSection: some View {
        HStack(spacing: 16) {
            statBox(
                value: formatListeningTime(totalListeningSeconds),
                label: "Listening time"
            )
            statBox(
                value: "\(sessionCount)",
                label: "Sessions"
            )
        }
    }

    private func statBox(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.semibold)
                .monospacedDigit()
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder
    private var subscriptionSection: some View {
        let status = rasika?.subscriptionStatus ?? .free

        VStack(spacing: 8) {
            switch status {
            case .active, .lifetime:
                HStack {
                    Image(systemName: "star.fill")
                        .foregroundStyle(.green)
                    Text(status == .lifetime ? "Lifetime" : "Premium")
                        .fontWeight(.medium)
                        .foregroundStyle(.green)
                }
            case .canceled:
                Text("Canceled — access until period ends")
                    .font(.subheadline)
                    .foregroundStyle(.orange)
            case .pastDue:
                Text("Payment past due")
                    .font(.subheadline)
                    .foregroundStyle(.red)
            case .free, .expired:
                VStack(spacing: 8) {
                    Text("Go Premium")
                        .font(.headline)
                    Text("$5/mo · $30/yr · $100 lifetime")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    // TODO M4: StoreKit purchase buttons
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder
    private var certificationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("CERTIFICATIONS")
                .font(.caption)
                .fontWeight(.medium)
                .tracking(1)
                .foregroundStyle(.secondary)

            ForEach(certifications) { cert in
                let ragamName = ragams[cert.ragamId]?.name ?? "Unknown"
                let tierInfo = TierInfo.from(totalSeconds: cert.totalSeconds)

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(ragamName)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Spacer()
                        if let tier = tierInfo.currentTier {
                            Text(tier.label)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundStyle(tier.color)
                        }
                    }

                    // Progress bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule()
                                .fill(Color(.systemGray5))
                            Capsule()
                                .fill(tierInfo.currentTier?.color ?? .gray)
                                .frame(width: geo.size.width * tierInfo.progressPercent / 100)
                        }
                    }
                    .frame(height: 6)

                    if let next = tierInfo.nextTier {
                        Text("Next: \(next.label)")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func loadData() async {
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

    private func formatListeningTime(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }
}

import SwiftUI

struct ProfileView: View {
    @Environment(SupabaseService.self) private var supabase

    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: ProfileViewModel?

    var body: some View {
        ScrollView {
            if let vm = viewModel {
                if vm.isLoading {
                    ProgressView()
                        .padding(.top, 100)
                } else {
                    VStack(spacing: 24) {
                        // Account info
                        accountSection(vm: vm)

                        // Stats
                        statsSection(vm: vm)

                        // Certifications
                        if !vm.certifications.isEmpty {
                            certificationsSection(vm: vm)
                        }

                        // Sign out
                        Button(role: .destructive) {
                            Task {
                                await vm.signOut()
                                dismiss()
                            }
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
            } else {
                ProgressView()
                    .padding(.top, 100)
            }
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.large)
        .onAppear {
            if viewModel == nil {
                let vm = ProfileViewModel(supabase: supabase)
                viewModel = vm
                Task { await vm.loadData() }
            }
        }
    }

    @ViewBuilder
    private func accountSection(vm: ProfileViewModel) -> some View {
        if let email = vm.userEmail {
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

    private func statsSection(vm: ProfileViewModel) -> some View {
        HStack(spacing: 16) {
            statBox(
                value: vm.formattedListeningTime,
                label: "Listening time"
            )
            statBox(
                value: "\(vm.sessionCount)",
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
    private func certificationsSection(vm: ProfileViewModel) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("CERTIFICATIONS")
                .font(.caption)
                .fontWeight(.medium)
                .tracking(1)
                .foregroundStyle(.secondary)

            ForEach(vm.certifications) { cert in
                let ragamName = vm.ragams[cert.ragamId]?.name ?? "Unknown"
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
}

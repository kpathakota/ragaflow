import SwiftUI

struct ScenarioCard: View {
    let scenario: Scenario

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(scenario.label)
                    .font(.title3)
                    .fontWeight(.medium)
                    .foregroundStyle(scenario.accentColorLight)
                Text(scenario.subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemGray6).opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(scenario.accentColor.opacity(0.4), lineWidth: 1)
                )
        )
    }
}

struct ExploreCard: View {
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Explore")
                    .font(.title3)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.green.opacity(0.8))
                Text("Browse all tracks by ragam, tag, or mood")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemGray6).opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(Color.green.opacity(0.4), lineWidth: 1)
                )
        )
    }
}

struct QuickPlayRow: View {
    let scenario: Scenario
    let track: Track
    let durationMinutes: Int?

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(scenario.accentColor)
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: "play.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(.white)
                }

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(scenario.label)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(scenario.accentColorLight)
                    if let durationMinutes {
                        Text("· \(durationMinutes)m")
                            .font(.subheadline)
                            .foregroundStyle(scenario.accentColorLight)
                    }
                }
                Text(track.displayName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemGray6).opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(scenario.accentColor.opacity(0.4), lineWidth: 1)
                )
        )
    }
}

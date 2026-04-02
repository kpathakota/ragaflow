import SwiftUI

struct TrackCard: View {
    let track: Track
    let ragamName: String?
    let isFavorite: Bool
    let scenario: Scenario?
    var onToggleFavorite: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Top line: ragam name + favorite
            HStack {
                if let ragamName {
                    Text(ragamName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                }
                Spacer()
                if let onToggleFavorite {
                    Button(action: onToggleFavorite) {
                        Image(systemName: isFavorite ? "heart.fill" : "heart")
                            .foregroundStyle(isFavorite ? .red : .secondary)
                            .font(.system(size: 14))
                    }
                    .buttonStyle(.plain)
                }
            }

            // Metadata line: date · location, duration
            HStack(spacing: 4) {
                if let date = track.recordedDate {
                    Text(date)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if track.recordedDate != nil && track.location != nil {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let location = track.location {
                    Text(location)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer()
                Text(track.durationFormatted)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Description
            Text(track.description)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            // Tags
            if !track.tags.isEmpty {
                HStack(spacing: 6) {
                    ForEach(track.tags.prefix(4), id: \.self) { tag in
                        Text(tag)
                            .font(.caption2)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color(.systemGray5))
                            .clipShape(Capsule())
                    }
                }
            }

            // Premium badge
            if !track.free {
                Text("Premium")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(.purple)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6).opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(
                            (scenario?.accentColor ?? Color.gray).opacity(0.2),
                            lineWidth: 1
                        )
                )
        )
    }
}

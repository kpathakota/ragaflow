import SwiftUI

struct TrackCard: View {
    let track: Track
    let ragamName: String?
    let isFavorite: Bool
    let scenario: Scenario?
    var isFeatured: Bool = false
    var onToggleFavorite: (() -> Void)?

    /// Headline: title if present, otherwise "date · location" fallback
    private var headline: String {
        track.displayName
    }

    /// Subtitle: "date · location" when title is present (otherwise nil)
    private var subtitle: String? {
        guard track.title != nil, !((track.title ?? "").isEmpty) else { return nil }
        let parts = [formattedDate, track.location].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    /// Format recordedDate as "Mon DD" (e.g. "Jan 15") matching web
    private var formattedDate: String? {
        guard let raw = track.recordedDate else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: raw) else { return raw }
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Top line: headline + favorite
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(headline)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                    if let subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
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

            // Metadata line: Featured badge · duration · ragam · tags (first 3) · Premium
            HStack(spacing: 4) {
                if isFeatured {
                    Text("Featured")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundStyle(Color(red: 0.79, green: 0.65, blue: 0.30)) // gold
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            Capsule()
                                .fill(Color(red: 0.79, green: 0.65, blue: 0.30).opacity(0.15))
                        )
                }
                Text("\(track.duration / 60)min")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if let ragamName {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(ragamName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                ForEach(track.tags.prefix(3), id: \.self) { tag in
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(tag)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if !track.free {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("Premium")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(Color(red: 0.79, green: 0.65, blue: 0.30)) // gold
                }
                Spacer()
            }

            // Description
            Text(track.description)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)
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

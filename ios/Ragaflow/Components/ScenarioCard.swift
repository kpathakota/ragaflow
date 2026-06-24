import SwiftUI

// MARK: - Warm palette
//
// Mirrors the web home redesign tokens (web/app/page.tsx,
// components/tonight-invitation.tsx). Kept here so every Home subview shares one
// source of truth for the cream-on-warm-black look.

extension Color {
    /// Page background — warm near-black (#0F0B07).
    static let warmBackground = Color(red: 15 / 255, green: 11 / 255, blue: 7 / 255)
    /// Card surface (#1C1611).
    static let warmCard = Color(red: 28 / 255, green: 22 / 255, blue: 17 / 255)
    /// Primary warm cream text (#E6DCCA).
    static let warmCream = Color(red: 230 / 255, green: 220 / 255, blue: 202 / 255)
    /// Sign-in pill background (#292524).
    static let warmPill = Color(red: 41 / 255, green: 37 / 255, blue: 36 / 255)
    /// Favorites accent (#C96A4C).
    static let warmFavorite = Color(red: 201 / 255, green: 106 / 255, blue: 76 / 255)
}

// MARK: - Tonight invitation
//
// Time-aware featured-track card. Mirrors web TonightInvitation.

struct TonightInvitationCard: View {
    let track: Track
    let scenario: Scenario
    let durationMinutes: Int?
    let eyebrowLabel: String

    private var durationMin: Int { durationMinutes ?? track.duration / 60 }
    private var firstTag: String? {
        track.tags.first { $0 != scenario.rawValue } ?? track.tags.first
    }
    private var accent: Color { scenario.accentColor }
    private var accentLight: Color { scenario.accentColorLight }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(eyebrowLabel.uppercased())
                .font(.system(size: 11, weight: .medium))
                .tracking(1.5)
                .foregroundStyle(Color.warmCream.opacity(0.40))
                .padding(.leading, 2)

            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 14) {
                    Circle()
                        .fill(accent)
                        .frame(width: 48, height: 48)
                        .overlay {
                            Image(systemName: "play.fill")
                                .font(.system(size: 15))
                                .foregroundStyle(.white)
                        }

                    VStack(alignment: .leading, spacing: 3) {
                        Text(track.title ?? "Untitled track")
                            .font(.system(size: 18, weight: .medium, design: .serif))
                            .italic()
                            .foregroundStyle(Color.warmCream)
                            .lineLimit(2)
                        HStack(spacing: 6) {
                            Text("\(durationMin)m").monospacedDigit()
                            Text("·")
                            Text(scenario.rawValue)
                            if let firstTag {
                                Text("·")
                                Text(firstTag)
                            }
                        }
                        .font(.system(size: 12))
                        .foregroundStyle(Color.warmCream.opacity(0.62))
                    }

                    Spacer(minLength: 0)
                }

                if let note = track.artistNote, !note.isEmpty {
                    Text("\u{201C}\(note)\u{201D}")
                        .font(.system(size: 13, design: .serif))
                        .italic()
                        .foregroundStyle(accentLight.opacity(0.88))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(EdgeInsets(top: 18, leading: 18, bottom: 16, trailing: 18))
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                LinearGradient(
                    colors: [accent.opacity(0.078), Color.warmCard],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .strokeBorder(accent.opacity(0.33), lineWidth: 1)
            )
        }
    }
}

// MARK: - Scenario card

struct HomeScenarioCard: View {
    let scenario: Scenario

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(scenario.label)
                .font(.system(size: 22, weight: .medium, design: .serif))
                .foregroundStyle(scenario.accentColor)
            Text(scenario.subtitle)
                .font(.system(size: 13))
                .foregroundStyle(Color.warmCream.opacity(0.62))
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
        .padding(.vertical, 18)
        .background(Color.warmCard)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(scenario.accentColor.opacity(0.30), lineWidth: 1)
        )
    }
}

// MARK: - Footer tiles

struct ExploreFooterTile: View {
    var body: some View {
        FooterTile(
            eyebrow: "EXPLORE",
            eyebrowColor: Color.warmCream.opacity(0.40),
            value: Text("All tracks")
        )
    }
}

struct FavoritesFooterTile: View {
    let count: Int

    var body: some View {
        FooterTile(
            eyebrow: "\u{2665} FAVORITES",
            eyebrowColor: Color.warmFavorite,
            value: Text("\(count) track\(count == 1 ? "" : "s")")
        )
    }
}

private struct FooterTile: View {
    let eyebrow: String
    let eyebrowColor: Color
    let value: Text

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(eyebrow)
                .font(.system(size: 10, weight: .medium))
                .tracking(1.4)
                .foregroundStyle(eyebrowColor)
            value
                .font(.system(size: 13))
                .monospacedDigit()
                .foregroundStyle(Color.warmCream)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .strokeBorder(Color.warmCream.opacity(0.14), lineWidth: 1)
        )
    }
}

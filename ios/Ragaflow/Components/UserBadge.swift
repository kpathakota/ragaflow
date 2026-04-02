import SwiftUI

struct UserBadge: View {
    @Environment(SupabaseService.self) private var supabase

    var body: some View {
        if let user = supabase.currentUser {
            let initial = (user.email?.prefix(1).uppercased()) ?? "?"
            Circle()
                .fill(Color(.systemGray5))
                .frame(width: 32, height: 32)
                .overlay {
                    Text(initial)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                }
        }
    }
}

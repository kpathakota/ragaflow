import SwiftUI

struct ContentView: View {
    @Environment(SupabaseService.self) private var supabase

    var body: some View {
        Group {
            if supabase.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.black)
            } else if supabase.currentUser == nil {
                AuthView()
            } else {
                MainTabView()
            }
        }
    }
}

struct MainTabView: View {
    var body: some View {
        NavigationStack {
            HomeView()
        }
    }
}

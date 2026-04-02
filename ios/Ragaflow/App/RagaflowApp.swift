import SwiftUI

@main
struct RagaflowApp: App {
    @State private var supabase = SupabaseService.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(supabase)
                .preferredColorScheme(.dark)
                .task {
                    await supabase.initialize()
                }
        }
    }
}

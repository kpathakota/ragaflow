# Ragaflow iOS

Native iOS client for Ragaflow, built with SwiftUI. Shares the same Supabase backend as the web app.

## Setup

1. Open Xcode → Create new project → **App** (SwiftUI lifecycle, iOS 17+)
2. Copy all files from `Ragaflow/` into the Xcode project
3. Add Supabase Swift SDK: File → Add Package Dependencies → `https://github.com/supabase/supabase-swift` (version 2.0.0+)
4. Copy `Configuration/Secrets.xcconfig.example` to `Configuration/Debug.xcconfig` and `Configuration/Release.xcconfig`, fill in your Supabase credentials
5. In Xcode project settings, set the Debug and Release configurations to use the respective `.xcconfig` files
6. Build and run

## Architecture

- **Models/** — Swift structs mirroring `lib/types.ts` from the web app
- **Services/** — `SupabaseService` singleton (auth, data access, favorites, sessions, certifications)
- **Views/** — SwiftUI views organized by feature (Home, Auth, Scenarios, Player, Explore, Profile)
- **Components/** — Reusable UI (ScenarioCard, TrackCard, UserBadge, FlowLayout)
- **Configuration/** — xcconfig files for Supabase env vars (gitignored)

## Milestones

- **M1 (current):** Shell + auth + navigation + all screens with data. No audio.
- **M2:** Audio streaming via AVPlayer, background playback, lock screen controls
- **M3:** Feature parity with web (all interactions wired up)
- **M4:** Apple IAP via StoreKit 2
- **M5:** Offline downloads

See `docs/ios-plan.md` in the web repo for the full implementation plan.


Structure:                                                                                                                                                                                                                                                                 
  ios/                                                                                                                                                                                                                                                                       
  ├── .gitignore                                                                                                                                                                                                                                                             
  ├── README.md                          ← Setup instructions                                                                                                                                                                                                                
  └── Ragaflow/                                                                                                                                                                                                                                                              
      ├── App/                                                                                                                                                                                                                                                               
      │   ├── RagaflowApp.swift          ← @main, initializes Supabase
      │   └── ContentView.swift          ← Auth gate → Home                                                                                                                                                                                                                  
      ├── Models/                        ← Mirrors lib/types.ts exactly                                                                                                                                                                                                      
      │   ├── Scenario.swift             ← Enum + colors (blue/indigo/amber)                                                                                                                                                                                                 
      │   ├── Ragam.swift                                                                                                                                                                                                                                                    
      │   ├── Track.swift                ← displayName, durationFormatted helpers                                                                                                                                                                                            
      │   ├── Rasika.swift               ← SubscriptionStatus enum                                                                                                                                                                                                         
      │   ├── ListeningSession.swift                                                                                                                                                                                                                                         
      │   └── Certification.swift        ← TierInfo, computeCountableSeconds                                                                                                                                                                                               
      ├── Services/                                                                                                                                                                                                                                                          
      │   └── SupabaseService.swift      ← All data access (auth, CRUD, favorites, sessions, certs)                                                                                                                                                                          
      ├── Views/                                                                                                                                                                                                                                                             
      │   ├── Auth/AuthView.swift        ← Email sign-in/sign-up                                                                                                                                                                                                             
      │   ├── Home/HomeView.swift        ← Quick play defaults + scenario cards + explore                                                                                                                                                                                  
      │   ├── Scenarios/TrackListView.swift  ← Track list per scenario                                                                                                                                                                                                       
      │   ├── Player/SessionPlayerView.swift ← Timer + controls + completion + set-default                                                                                                                                                                                   
      │   ├── Explore/ExploreView.swift  ← Grouped by ragam, tag filter with FlowLayout                                                                                                                                                                                      
      │   └── Profile/ProfileView.swift  ← Stats, certs, subscription status, sign-out                                                                                                                                                                                       
      ├── Components/                                                                                                                                                                                                                                                        
      │   ├── ScenarioCard.swift         ← + ExploreCard + QuickPlayRow                                                                                                                                                                                                      
      │   ├── TrackCard.swift            ← Reusable track card with heart + tags                                                                                                                                                                                             
      │   └── UserBadge.swift            ← Initial circle                                                                                                                                                                                                                    
      ├── Configuration/                                                                                                                                                                                                                                                     
      │   ├── Debug.xcconfig             ← Staging Supabase creds (gitignored)                                                                                                                                                                                               
      │   ├── Release.xcconfig           ← Production creds (gitignored)                                                                                                                                                                                                     
      │   └── Secrets.xcconfig.example   ← Template to copy                                                                                                                                                                                                                  
      └── Resources/                                       
          ├── Info.plist                 ← Reads xcconfig vars + background audio mode                                                                                                                                                                                       
          └── Package.swift.reference    ← SPM dependency instructions                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                             
  To get this running in Xcode:                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                             
  1. Create a new Xcode project (App → SwiftUI → iOS 17+, bundle ID io.ragaflow.app)                                                                                                                                                                                         
  2. Copy the Ragaflow/ contents into the project                                                                                                                                                                                                                            
  3. Add SPM dependency: https://github.com/supabase/supabase-swift (2.0.0+)                                                                                                                                                                                                 
  4. Fill in Debug.xcconfig with your staging Supabase URL + key                                                                                                                                                                                                           
  5. Point the project's Debug config to Debug.xcconfig in project settings                                                                                                                                                                                                  
  6. Build & run                        
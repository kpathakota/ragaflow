import SwiftUI

struct SessionPlayerView: View {
    let trackId: String
    let scenario: Scenario
    let initialDuration: Int? // minutes
    var autoplay: Bool = false

    @Environment(SupabaseService.self) private var supabase
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var viewModel: SessionPlayerViewModel?
    @State private var breathing = false

    @Environment(\.dismiss) private var dismiss

    private var playButtonSize: CGFloat { horizontalSizeClass == .regular ? 88 : 64 }
    private var checkmarkSize: CGFloat { horizontalSizeClass == .regular ? 112 : 80 }
    private var timerFontSize: CGFloat { horizontalSizeClass == .regular ? 72 : 56 }

    /// Meditate and sleep get a slow breathing orb (mirrors web `animate-breathe`).
    private var isBreathingScenario: Bool { scenario == .meditate || scenario == .sleep }
    private var breathingActive: Bool { isBreathingScenario && !reduceMotion }

    var body: some View {
        Group {
            if let vm = viewModel {
                if vm.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let track = vm.track {
                    playerContent(track: track, vm: vm)
                } else {
                    Text("Track not found")
                        .foregroundStyle(.secondary)
                }
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    if let vm = viewModel {
                        Task { await vm.toggleFavorite() }
                    }
                } label: {
                    Image(systemName: viewModel?.isFavorite == true ? "heart.fill" : "heart")
                        .foregroundStyle(viewModel?.isFavorite == true ? .red : .secondary)
                }
                .accessibilityLabel(viewModel?.isFavorite == true ? "Unfavorite" : "Favorite")
                .opacity(supabase.currentUser != nil ? 1 : 0)
                .disabled(supabase.currentUser == nil)
            }
        }
        .onAppear {
            if viewModel == nil {
                let vm = SessionPlayerViewModel(
                    trackId: trackId,
                    scenario: scenario,
                    initialDuration: initialDuration,
                    autoplay: autoplay,
                    supabase: supabase,
                    audio: AudioService.shared
                )
                viewModel = vm
                vm.setupRemoteCommands()
                Task { await vm.loadData() }
            }
        }
        .onDisappear {
            viewModel?.teardownRemoteCommands()
        }
    }

    @ViewBuilder
    private func playerContent(track: Track, vm: SessionPlayerViewModel) -> some View {
        VStack(spacing: 0) {
            // Track info
            VStack(alignment: .leading, spacing: 8) {
                Text(vm.displayName)
                    .font(.title2)
                    .fontWeight(.semibold)
                Text(track.description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineSpacing(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal)
            .padding(.top, 8)

            // Visual zone
            Spacer()

            ZStack {
                Circle()
                    .fill(scenario.accentColor)
                    .opacity(breathingActive && breathing ? 0.28 : (isBreathingScenario ? 0.16 : 0.20))
                    .scaleEffect(breathingActive && breathing ? 1.14 : 1.0)
                    .containerRelativeFrame([.horizontal, .vertical]) { length, axis in
                        if horizontalSizeClass == .regular {
                            return length * 0.35
                        }
                        return 220
                    }
                    .blur(radius: 60)
                    .animation(
                        breathingActive ? .easeInOut(duration: 4).repeatForever(autoreverses: true) : nil,
                        value: breathing
                    )
                    .onAppear { if breathingActive { breathing = true } }

                // Artist note
                if let note = track.artistNote, vm.sessionState != .complete {
                    VStack(alignment: .leading, spacing: 8) {
                        Button {
                            withAnimation { vm.noteExpanded.toggle() }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: vm.noteExpanded ? "chevron.up" : "chevron.down")
                                    .font(.caption2)
                                Text("From the session")
                                    .font(.caption)
                            }
                            .foregroundStyle(.tertiary)
                        }

                        if vm.noteExpanded {
                            Text(note)
                                .font(.subheadline)
                                .italic()
                                .foregroundStyle(.secondary)
                                .lineSpacing(4)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .offset(y: horizontalSizeClass == .regular ? 140 : 80)
                }
            }

            Spacer()

            // Controls
            controlsSection(track: track, vm: vm)
                .padding(.bottom, 32)
        }
    }

    @ViewBuilder
    private func controlsSection(track: Track, vm: SessionPlayerViewModel) -> some View {
        VStack(spacing: 20) {
            switch vm.sessionState {
            case .idle:
                // Duration picker
                HStack(spacing: 8) {
                    ForEach(vm.fixedDurations, id: \.self) { d in
                        durationPill("\(d)m", isSelected: vm.duration == d && !vm.isFullTrack) {
                            vm.selectFixedDuration(d)
                        }
                    }
                    // Full track pill
                    if track.duration > 0 {
                        durationPill("Full track", isSelected: vm.isFullTrack) {
                            vm.selectFullTrack()
                        }
                    }
                    // Custom pill
                    durationPill(
                        vm.customDuration != nil && !vm.fixedDurations.contains(vm.customDuration!) ? "\(vm.customDuration!)m" : "...",
                        isSelected: !vm.isFullTrack && vm.customDuration != nil && vm.duration == vm.customDuration && !vm.fixedDurations.contains(vm.duration)
                    ) {
                        vm.showCustomInput.toggle()
                    }
                }

                // Custom duration input
                if vm.showCustomInput {
                    HStack(spacing: 8) {
                        TextField("1–120", text: Bindable(vm).customInputText)
                            .keyboardType(.numberPad)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: horizontalSizeClass == .regular ? 120 : 80)
                        Text("min")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Button("Set") {
                            vm.applyCustomDuration()
                        }
                        .font(.subheadline)
                        .foregroundStyle(scenario.accentColor)
                    }
                }

                // Play button
                Button {
                    Task { await vm.startSession() }
                } label: {
                    Circle()
                        .fill(scenario.accentColor)
                        .frame(width: playButtonSize, height: playButtonSize)
                        .overlay {
                            Image(systemName: "play.fill")
                                .font(horizontalSizeClass == .regular ? .title : .title2)
                                .foregroundStyle(.white)
                        }
                }

                // Invisible spacer to match "reset" text height
                Text("reset")
                    .font(.subheadline)
                    .hidden()

            case .running, .paused:
                // Large timer in accent color
                Text(vm.timerDisplay)
                    .font(.system(size: timerFontSize, weight: .light))
                    .monospacedDigit()
                    .foregroundStyle(scenario.accentColorLight)

                // Ragam name beneath the timer
                if let ragam = vm.ragam {
                    Text(ragam.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                }

                // Play/Pause button with circular progress ring
                ZStack {
                    Circle()
                        .stroke(Color(.systemGray4), lineWidth: 3)
                    Circle()
                        .trim(from: 0, to: vm.progress)
                        .stroke(scenario.accentColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .animation(.linear(duration: 1), value: vm.progress)

                    Button {
                        if vm.sessionState == .running { vm.pause() }
                        else { vm.resume() }
                    } label: {
                        Circle()
                            .fill(scenario.accentColor)
                            .frame(width: playButtonSize, height: playButtonSize)
                            .overlay {
                                Image(systemName: vm.sessionState == .running ? "pause.fill" : "play.fill")
                                    .font(horizontalSizeClass == .regular ? .title : .title2)
                                    .foregroundStyle(.white)
                            }
                    }
                }
                .frame(width: playButtonSize + 24, height: playButtonSize + 24)

                // Reset
                Button {
                    Task { await vm.stop() }
                } label: {
                    Text("reset")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                }

            case .complete:
                completionView(track: track, vm: vm)
            }
        }
    }

    private func durationPill(_ label: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(isSelected ? scenario.accentColor : Color(.systemGray5))
                .foregroundStyle(isSelected ? .white : .primary)
                .clipShape(Capsule())
        }
    }

    @ViewBuilder
    private func completionView(track: Track, vm: SessionPlayerViewModel) -> some View {
        VStack(spacing: 24) {
            Circle()
                .fill(scenario.accentColor.opacity(0.2))
                .frame(width: checkmarkSize, height: checkmarkSize)
                .overlay {
                    Image(systemName: "checkmark")
                        .font(horizontalSizeClass == .regular ? .largeTitle : .title)
                        .foregroundStyle(scenario.accentColorLight)
                }

            VStack(spacing: 4) {
                Text("\(vm.duration) minutes of \(scenario.label.lowercased())")
                    .font(.headline)
                    .foregroundStyle(scenario.accentColorLight)
                Text(vm.displayName)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if vm.showDefaultPrompt && !vm.defaultSet {
                VStack(spacing: 12) {
                    Text("Set as your default for \(scenario.label)?")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    HStack(spacing: 12) {
                        Button("Yes") {
                            Task { await vm.setDefault() }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(scenario.accentColor)

                        Button("No thanks") {
                            vm.showDefaultPrompt = false
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            if vm.defaultSet {
                Text("Default set! Quick-play from home.")
                    .font(.subheadline)
                    .foregroundStyle(.green)
            }

            HStack(spacing: 16) {
                Button("New session") {
                    vm.restart()
                }
                .buttonStyle(.borderedProminent)
                .tint(scenario.accentColor)

                Button("Back to list") {
                    dismiss()
                }
                .buttonStyle(.bordered)
            }
        }
    }
}

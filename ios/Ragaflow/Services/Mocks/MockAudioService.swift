import Foundation
@testable import Ragaflow

@Observable
final class MockAudioService: AudioServiceProtocol {
    // MARK: - State

    var isPlaying = false
    var currentTrackId: String?

    var onRemotePause: (() -> Void)?
    var onRemoteResume: (() -> Void)?

    // MARK: - Call tracking

    var playCalls: [(url: URL, trackId: String)] = []
    var pauseCallCount = 0
    var resumeCallCount = 0
    var stopCallCount = 0
    var fadeCalls: [TimeInterval] = []
    var resetVolumeCallCount = 0
    var nowPlayingUpdates: [(title: String, duration: TimeInterval, elapsed: TimeInterval)] = []

    // MARK: - Playback

    func play(url: URL, trackId: String) {
        playCalls.append((url, trackId))
        isPlaying = true
        currentTrackId = trackId
    }

    func pause() {
        pauseCallCount += 1
        isPlaying = false
    }

    func resume() {
        resumeCallCount += 1
        isPlaying = true
    }

    func stop() {
        stopCallCount += 1
        isPlaying = false
        currentTrackId = nil
    }

    // MARK: - Volume fade

    func startVolumeFade(duration: TimeInterval) {
        fadeCalls.append(duration)
    }

    func resetVolume() {
        resetVolumeCallCount += 1
    }

    // MARK: - Now Playing

    func updateNowPlaying(title: String, artist: String, duration: TimeInterval, elapsed: TimeInterval) {
        nowPlayingUpdates.append((title, duration, elapsed))
    }
}

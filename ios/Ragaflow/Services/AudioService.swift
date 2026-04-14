import AVFoundation
import MediaPlayer

@Observable
final class AudioService {
    static let shared = AudioService()

    private(set) var isPlaying = false
    private(set) var currentTrackId: String?

    private var player: AVQueuePlayer?
    private var looper: AVPlayerLooper?
    private var fadeTimer: Timer?

    private init() {
        configureAudioSession()
        configureRemoteCommands()
    }

    // MARK: - Playback

    func play(url: URL, trackId: String) {
        stop()

        let item = AVPlayerItem(url: url)
        let queuePlayer = AVQueuePlayer(items: [item])
        looper = AVPlayerLooper(player: queuePlayer, templateItem: item)
        player = queuePlayer

        queuePlayer.play()
        isPlaying = true
        currentTrackId = trackId
    }

    func pause() {
        player?.pause()
        isPlaying = false
    }

    func resume() {
        player?.play()
        isPlaying = true
    }

    func stop() {
        fadeTimer?.invalidate()
        fadeTimer = nil
        player?.pause()
        looper = nil
        player = nil
        isPlaying = false
        currentTrackId = nil
        clearNowPlaying()
    }

    // MARK: - Volume fade (sleep scenario)

    /// Fades volume from current level to 0 over `duration` seconds.
    func startVolumeFade(duration: TimeInterval) {
        guard let player, duration > 0 else { return }

        let startVolume = player.volume
        let steps = Int(duration) // 1 step per second
        guard steps > 0 else { return }
        let decrement = startVolume / Float(steps)
        var remaining = steps

        fadeTimer?.invalidate()
        fadeTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            remaining -= 1
            if remaining <= 0 {
                player.volume = 0
                timer.invalidate()
                self?.fadeTimer = nil
            } else {
                player.volume = max(0, startVolume - decrement * Float(steps - remaining))
            }
        }
    }

    func resetVolume() {
        fadeTimer?.invalidate()
        fadeTimer = nil
        player?.volume = 1.0
    }

    // MARK: - Now Playing

    func updateNowPlaying(title: String, artist: String = "Ragaflow", duration: TimeInterval, elapsed: TimeInterval) {
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: title,
            MPMediaItemPropertyArtist: artist,
            MPMediaItemPropertyPlaybackDuration: duration,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: elapsed,
            MPNowPlayingInfoPropertyPlaybackRate: isPlaying ? 1.0 : 0.0,
        ]
        info[MPMediaItemPropertyMediaType] = MPMediaType.music.rawValue
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func clearNowPlaying() {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    // MARK: - Audio session

    private func configureAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
        } catch {
            // Audio session config failed — playback may not work in background
        }
    }

    // MARK: - Remote commands (lock screen / Control Center)

    private func configureRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()

        center.playCommand.addTarget { [weak self] _ in
            self?.resume()
            return .success
        }

        center.pauseCommand.addTarget { [weak self] _ in
            self?.pause()
            return .success
        }

        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            if self.isPlaying { self.pause() } else { self.resume() }
            return .success
        }
    }
}

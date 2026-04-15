import AVFoundation
import MediaPlayer

@Observable
final class AudioService {
    static let shared = AudioService()

    private(set) var isPlaying = false
    private(set) var currentTrackId: String?

    /// Called when playback state changes from remote commands (lock screen).
    /// SessionPlayerView observes this to sync its own state.
    var onRemotePause: (() -> Void)?
    var onRemoteResume: (() -> Void)?

    private var player: AVQueuePlayer?
    private var looper: AVPlayerLooper?
    private var fadeTimer: Timer?
    private var audioSessionActive = false

    private init() {
        configureRemoteCommands()
    }

    // MARK: - Playback

    func play(url: URL, trackId: String) {
        stop()
        activateAudioSession()

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
        deactivateAudioSession()
    }

    // MARK: - Volume fade (sleep scenario)

    /// Fades volume from current level to 0 over `duration` seconds.
    func startVolumeFade(duration: TimeInterval) {
        guard player != nil, duration > 0 else { return }

        let startVolume = player?.volume ?? 1.0
        let steps = Int(duration)
        guard steps > 0 else { return }
        let decrement = startVolume / Float(steps)
        var remaining = steps

        fadeTimer?.invalidate()

        // Schedule on main RunLoop explicitly to avoid background thread issues
        let timer = Timer(timeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self, let player = self.player else {
                timer.invalidate()
                return
            }
            remaining -= 1
            if remaining <= 0 {
                player.volume = 0
                timer.invalidate()
                self.fadeTimer = nil
            } else {
                player.volume = max(0, startVolume - decrement * Float(steps - remaining))
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        fadeTimer = timer
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

    private func activateAudioSession() {
        guard !audioSessionActive else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            audioSessionActive = true
        } catch {
            // Audio session activation failed — background playback may not work
        }
    }

    private func deactivateAudioSession() {
        guard audioSessionActive else { return }
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            audioSessionActive = false
        } catch {
            // Deactivation failed — other apps' audio may not resume
        }
    }

    // MARK: - Remote commands (lock screen / Control Center)

    private func configureRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()

        center.playCommand.addTarget { [weak self] _ in
            self?.resume()
            self?.onRemoteResume?()
            return .success
        }

        center.pauseCommand.addTarget { [weak self] _ in
            self?.pause()
            self?.onRemotePause?()
            return .success
        }

        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            if self.isPlaying {
                self.pause()
                self.onRemotePause?()
            } else {
                self.resume()
                self.onRemoteResume?()
            }
            return .success
        }
    }
}

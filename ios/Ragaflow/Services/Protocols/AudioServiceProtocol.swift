import Foundation

protocol AudioServiceProtocol: AnyObject {
    var isPlaying: Bool { get }
    var currentTrackId: String? { get }

    var onRemotePause: (() -> Void)? { get set }
    var onRemoteResume: (() -> Void)? { get set }

    func play(url: URL, trackId: String)
    func pause()
    func resume()
    func stop()

    func startVolumeFade(duration: TimeInterval)
    func resetVolume()

    func updateNowPlaying(title: String, artist: String, duration: TimeInterval, elapsed: TimeInterval)
}

extension AudioServiceProtocol {
    func updateNowPlaying(title: String, duration: TimeInterval, elapsed: TimeInterval) {
        updateNowPlaying(title: title, artist: "Ragaflow", duration: duration, elapsed: elapsed)
    }
}

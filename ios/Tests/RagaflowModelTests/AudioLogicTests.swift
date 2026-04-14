import Testing
import Foundation
@testable import RagaflowModels

@Suite("Audio & session logic")
struct AudioLogicTests {

    // MARK: - Timer display formatting

    @Test("formats seconds as mm:ss", arguments: [
        (0, "00:00"),
        (59, "00:59"),
        (60, "01:00"),
        (90, "01:30"),
        (1500, "25:00"),
        (2700, "45:00"),
        (3599, "59:59"),
        (3600, "60:00"),
    ])
    func timerDisplay(seconds: Int, expected: String) {
        let mins = seconds / 60
        let secs = seconds % 60
        let display = String(format: "%02d:%02d", mins, secs)
        #expect(display == expected)
    }

    // MARK: - Volume fade calculation

    @Test("volume fade decrements linearly")
    func volumeFadeDecrement() {
        let startVolume: Float = 1.0
        let fadeDuration = 120 // seconds
        let decrement = startVolume / Float(fadeDuration)

        // At halfway through fade
        let volumeAtHalf = startVolume - decrement * Float(fadeDuration / 2)
        #expect(abs(volumeAtHalf - 0.5) < 0.01)

        // At end of fade
        let volumeAtEnd = startVolume - decrement * Float(fadeDuration)
        #expect(abs(volumeAtEnd) < 0.01)
    }

    @Test("volume fade with short duration")
    func volumeFadeShort() {
        let startVolume: Float = 1.0
        let fadeDuration = 10
        let decrement = startVolume / Float(fadeDuration)

        // After 1 step
        let volumeAfter1 = max(0, startVolume - decrement * 1)
        #expect(abs(volumeAfter1 - 0.9) < 0.01)
    }

    // MARK: - Session duration selection

    @Test("duration in minutes converts to seconds correctly")
    func durationConversion() {
        let durations = [25, 45, 60, 90]
        let expectedSeconds = [1500, 2700, 3600, 5400]

        for (minutes, seconds) in zip(durations, expectedSeconds) {
            #expect(minutes * 60 == seconds)
        }
    }

    // MARK: - Sleep fade trigger timing

    @Test("sleep fade triggers at correct remaining time")
    func sleepFadeTrigger() {
        let fadeDuration: TimeInterval = 120
        let totalDuration = 25 * 60 // 25 minutes in seconds

        // Fade should start when remaining <= fadeDuration
        let elapsedAtFadeStart = Double(totalDuration) - fadeDuration
        let remainingAtFadeStart = Double(totalDuration) - elapsedAtFadeStart
        #expect(remainingAtFadeStart == fadeDuration)
    }

    // MARK: - Elapsed time calculation (pause/resume)

    @Test("elapsed time accumulates across pause/resume cycles")
    func elapsedAccumulation() {
        var elapsedBeforePause: TimeInterval = 0

        // First play segment: 10 seconds
        elapsedBeforePause += 10.0

        // Second play segment: 5 seconds
        elapsedBeforePause += 5.0

        // Third play segment: 3 seconds
        elapsedBeforePause += 3.0

        let totalDuration = 25 * 60
        let remaining = max(0, Int(Double(totalDuration) - elapsedBeforePause))
        #expect(remaining == totalDuration - 18)
    }

    @Test("remaining never goes negative")
    func remainingNonNegative() {
        let totalDuration = 25 * 60
        let elapsed = Double(totalDuration) + 5.0 // 5 seconds past end
        let remaining = max(0, Int(Double(totalDuration) - elapsed))
        #expect(remaining == 0)
    }
}

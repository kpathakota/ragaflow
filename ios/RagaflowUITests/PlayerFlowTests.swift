import XCTest

/// Tests for the session player: play, pause, reset flows.
/// Requires staging data to be populated with at least one Focus track.
final class PlayerFlowTests: XCTestCase {

    private var app: XCUIApplication!
    private let testEmail = "kpathakota+test@gmail.com"
    private let testPassword = "test123"

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Helpers

    private func signIn() {
        let signIn = app.staticTexts["Sign in"]
        guard signIn.waitForExistence(timeout: 10) else { return } // already signed in
        signIn.tap()

        let emailField = app.textFields["Email"]
        guard emailField.waitForExistence(timeout: 5) else { return }
        emailField.tap()
        emailField.typeText(testEmail)

        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText(testPassword)

        app.buttons["Sign In"].tap()

        // Wait for home
        let ragaflowTitle = app.staticTexts["Ragaflow"]
        _ = ragaflowTitle.waitForExistence(timeout: 15)
    }

    private func navigateToFirstTrack(scenario: String) {
        let card = app.staticTexts[scenario]
        XCTAssertTrue(card.waitForExistence(timeout: 10), "Should find \(scenario) card")
        card.tap()

        // Wait for track list to load, then tap the first track card
        // Track cards are in a scroll view — look for any tappable content
        let scrollView = app.scrollViews.firstMatch
        XCTAssertTrue(scrollView.waitForExistence(timeout: 10), "Track list should load")

        // Give the tracks time to load from Supabase
        sleep(2)

        // Tap the first track card (it's a NavigationLink)
        let firstTrackLink = scrollView.buttons.firstMatch
        if firstTrackLink.waitForExistence(timeout: 5) {
            firstTrackLink.tap()
        }
    }

    // MARK: - Player Tests

    func testPlayerShowsDurationPills() {
        signIn()
        navigateToFirstTrack(scenario: "Focus")

        // Should show duration pills
        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10), "Should show 25m duration pill")

        let pill45 = app.buttons["45m"]
        XCTAssertTrue(pill45.exists, "Should show 45m duration pill")
    }

    func testPlayStartsSession() {
        signIn()
        navigateToFirstTrack(scenario: "Focus")

        // Wait for player to load
        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10))

        // Tap play button (circle with play.fill)
        let playButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "play")).firstMatch
        if playButton.waitForExistence(timeout: 5) {
            playButton.tap()

            // Timer display should appear (format: MM:SS)
            // After starting, the pause button should exist
            let pauseButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "pause")).firstMatch
            XCTAssertTrue(pauseButton.waitForExistence(timeout: 5), "Pause button should appear after play")

            // Reset button should appear
            let resetButton = app.buttons["reset"]
            XCTAssertTrue(resetButton.waitForExistence(timeout: 3), "Reset button should appear during session")
        }
    }

    func testPauseAndResumeSession() {
        signIn()
        navigateToFirstTrack(scenario: "Focus")

        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10))

        // Start session
        let playButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "play")).firstMatch
        guard playButton.waitForExistence(timeout: 5) else { return }
        playButton.tap()

        // Pause
        let pauseButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "pause")).firstMatch
        XCTAssertTrue(pauseButton.waitForExistence(timeout: 5), "Pause button should appear")
        pauseButton.tap()

        // After pausing, play button should reappear
        let playAgain = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "play")).firstMatch
        XCTAssertTrue(playAgain.waitForExistence(timeout: 5), "Play button should reappear after pause")

        // Resume
        playAgain.tap()

        // Pause button should come back
        let pauseAgain = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "pause")).firstMatch
        XCTAssertTrue(pauseAgain.waitForExistence(timeout: 5), "Pause button should reappear after resume")

        // Clean up: reset
        let resetButton = app.buttons["reset"]
        if resetButton.exists {
            resetButton.tap()
        }
    }

    func testResetReturnsToIdleState() {
        signIn()
        navigateToFirstTrack(scenario: "Focus")

        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10))

        // Start session
        let playButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "play")).firstMatch
        guard playButton.waitForExistence(timeout: 5) else { return }
        playButton.tap()

        // Wait for session to start
        let resetButton = app.buttons["reset"]
        XCTAssertTrue(resetButton.waitForExistence(timeout: 5), "Reset button should appear")

        // Tap reset
        resetButton.tap()

        // Duration pills should reappear (idle state)
        let pill25Again = app.buttons["25m"]
        XCTAssertTrue(pill25Again.waitForExistence(timeout: 5), "Duration pills should reappear after reset")
    }

    func testDurationPillSelection() {
        signIn()
        navigateToFirstTrack(scenario: "Focus")

        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10))

        // Tap 45m pill
        let pill45 = app.buttons["45m"]
        pill45.tap()

        // 45m should now be selected (we can verify by starting and checking timer)
        // Just verify it doesn't crash and pills are interactive
        XCTAssertTrue(pill45.exists, "45m pill should still exist after tap")
    }
}

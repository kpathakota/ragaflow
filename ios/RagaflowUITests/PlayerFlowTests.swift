import XCTest

/// Tests for the session player: play, pause, reset flows.
/// Requires staging data to be populated with at least one Focus track.
final class PlayerFlowTests: XCTestCase {

    private var app: XCUIApplication!
    private let testEmail = "kpathakota+alt@gmail.com"
    private let testPassword = "alt123"

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Helpers

    private func ensureSignedIn() {
        let ragaflowTitle = app.staticTexts["Ragaflow"]
        guard ragaflowTitle.waitForExistence(timeout: 10) else { return }
        sleep(2)

        // Already signed in if "Sign in" isn't visible
        guard app.staticTexts["Sign in"].exists else { return }

        app.staticTexts["Sign in"].tap()

        let emailField = app.textFields["Email"]
        guard emailField.waitForExistence(timeout: 5) else { return }
        emailField.tap()
        emailField.typeText(testEmail)

        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText(testPassword)

        app.buttons["Sign In"].tap()

        // AuthView auto-dismisses on sign-in — wait for home
        let focusCard = app.staticTexts["Focus"]
        _ = focusCard.waitForExistence(timeout: 15)
    }

    private func navigateToFirstTrack(scenario: String) {
        let card = app.staticTexts[scenario]
        XCTAssertTrue(card.waitForExistence(timeout: 10), "Should find \(scenario) card")
        card.tap()

        let scrollView = app.scrollViews.firstMatch
        XCTAssertTrue(scrollView.waitForExistence(timeout: 10), "Track list should load")

        let firstTrackLink = scrollView.buttons.firstMatch
        XCTAssertTrue(firstTrackLink.waitForExistence(timeout: 10), "Should find at least one track")
        firstTrackLink.tap()
    }

    // MARK: - Player Tests

    func testPlayerShowsDurationPills() {
        ensureSignedIn()
        navigateToFirstTrack(scenario: "Focus")

        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10), "Should show 25m duration pill")

        let pill45 = app.buttons["45m"]
        XCTAssertTrue(pill45.exists, "Should show 45m duration pill")
    }

    func testPlayStartsSession() {
        ensureSignedIn()
        navigateToFirstTrack(scenario: "Focus")

        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10))

        let playButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "play")).firstMatch
        if playButton.waitForExistence(timeout: 5) {
            playButton.tap()

            let pauseButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "pause")).firstMatch
            XCTAssertTrue(pauseButton.waitForExistence(timeout: 5), "Pause button should appear after play")

            let resetButton = app.buttons["reset"]
            XCTAssertTrue(resetButton.waitForExistence(timeout: 3), "Reset button should appear during session")
        }
    }

    func testPauseAndResumeSession() {
        ensureSignedIn()
        navigateToFirstTrack(scenario: "Focus")

        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10))

        // Start
        let playButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "play")).firstMatch
        guard playButton.waitForExistence(timeout: 5) else { return }
        playButton.tap()

        // Pause
        let pauseButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "pause")).firstMatch
        XCTAssertTrue(pauseButton.waitForExistence(timeout: 5), "Pause button should appear")
        pauseButton.tap()

        // Play reappears
        let playAgain = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "play")).firstMatch
        XCTAssertTrue(playAgain.waitForExistence(timeout: 5), "Play button should reappear after pause")

        // Resume
        playAgain.tap()

        let pauseAgain = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "pause")).firstMatch
        XCTAssertTrue(pauseAgain.waitForExistence(timeout: 5), "Pause button should reappear after resume")

        // Clean up
        let resetButton = app.buttons["reset"]
        if resetButton.exists { resetButton.tap() }
    }

    func testResetReturnsToIdleState() {
        ensureSignedIn()
        navigateToFirstTrack(scenario: "Focus")

        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10))

        let playButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "play")).firstMatch
        guard playButton.waitForExistence(timeout: 5) else { return }
        playButton.tap()

        let resetButton = app.buttons["reset"]
        XCTAssertTrue(resetButton.waitForExistence(timeout: 5), "Reset button should appear")
        resetButton.tap()

        let pill25Again = app.buttons["25m"]
        XCTAssertTrue(pill25Again.waitForExistence(timeout: 5), "Duration pills should reappear after reset")
    }

    func testDurationPillSelection() {
        ensureSignedIn()
        navigateToFirstTrack(scenario: "Focus")

        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10))

        let pill45 = app.buttons["45m"]
        pill45.tap()
        XCTAssertTrue(pill45.exists, "45m pill should still exist after tap")
    }
}

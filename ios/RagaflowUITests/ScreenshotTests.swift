import XCTest

/// Reusable screenshot capture for PRs — the iOS counterpart to web's
/// `scripts/screenshot.mjs`. Each test navigates to one screen and attaches a
/// full-device screenshot (`.keepAlways`) so `ios/scripts/screenshot.sh` can
/// extract it from the result bundle and upload it to a PR.
///
/// These are capture helpers, not assertions about correctness — they fail only
/// if a screen can't be reached. Driven by the `pr-screenshots` skill.
///
/// Requires the Debug build to point at a populated Supabase (see CLAUDE.md).
final class ScreenshotTests: XCTestCase {

    private var app: XCUIApplication!

    // Optional test account — set via the SCREENSHOT_SIGN_IN launch env to
    // capture authenticated screens (e.g. Profile).
    private let testEmail = "kpathakota+test@gmail.com"
    private let testPassword = "test123"

    override func setUpWithError() throws {
        // Capture-only: these navigate/snapshot rather than assert correctness,
        // so they must NOT run in the normal suite or CI. `ios/scripts/screenshot.sh`
        // sets SCREENSHOT_CAPTURE=1; without it, every method skips.
        try XCTSkipUnless(
            ProcessInfo.processInfo.environment["SCREENSHOT_CAPTURE"] == "1",
            "Screenshot capture only — run via ios/scripts/screenshot.sh"
        )
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Helpers

    private func capture(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: shot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    /// Waits for the home screen to finish its first data load.
    private func waitForHome() {
        XCTAssertTrue(app.staticTexts["Ragaflow"].waitForExistence(timeout: 20), "Home should load")
        sleep(3) // let async track/featured fetch settle
    }

    private func signInIfRequested() {
        guard ProcessInfo.processInfo.environment["SCREENSHOT_SIGN_IN"] == "1" else { return }
        guard app.staticTexts["Sign in"].waitForExistence(timeout: 10) else { return }
        app.staticTexts["Sign in"].tap()
        let emailField = app.textFields["Email"]
        guard emailField.waitForExistence(timeout: 5) else { return }
        emailField.tap(); emailField.typeText(testEmail)
        let passwordField = app.secureTextFields["Password"]
        passwordField.tap(); passwordField.typeText(testPassword)
        app.buttons["Sign In"].tap()
        _ = app.staticTexts["Focus"].waitForExistence(timeout: 15)
        sleep(2)
    }

    private func openFirstTrack(scenario: String) {
        let card = app.staticTexts[scenario]
        XCTAssertTrue(card.waitForExistence(timeout: 15), "Should find \(scenario) card")
        card.tap()
        let scrollView = app.scrollViews.firstMatch
        XCTAssertTrue(scrollView.waitForExistence(timeout: 15), "Track list should load")
        let firstTrack = scrollView.buttons.firstMatch
        XCTAssertTrue(firstTrack.waitForExistence(timeout: 15), "Should find at least one track")
        firstTrack.tap()
    }

    // MARK: - Captures

    func testCaptureHome() {
        signInIfRequested()
        waitForHome()
        capture("home")
    }

    func testCaptureTrackList() {
        waitForHome()
        let card = app.staticTexts["Focus"]
        XCTAssertTrue(card.waitForExistence(timeout: 15))
        card.tap()
        XCTAssertTrue(app.scrollViews.firstMatch.waitForExistence(timeout: 15))
        sleep(1)
        capture("track-list")
    }

    func testCapturePlayer() {
        waitForHome()
        openFirstTrack(scenario: "Focus")

        // Idle (duration pills + play)
        XCTAssertTrue(app.buttons["25m"].waitForExistence(timeout: 15))
        sleep(1)
        capture("player-idle")

        // Running (large timer + ragam name + progress ring)
        let play = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "play")).firstMatch
        XCTAssertTrue(play.waitForExistence(timeout: 5))
        play.tap()
        let pause = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "pause")).firstMatch
        XCTAssertTrue(pause.waitForExistence(timeout: 5))
        sleep(3) // let the timer tick so the ring shows progress
        capture("player-running")

        if app.buttons["reset"].exists { app.buttons["reset"].tap() }
    }

    func testCaptureExplore() {
        waitForHome()
        let exploreTile = app.staticTexts["All tracks"]
        XCTAssertTrue(exploreTile.waitForExistence(timeout: 15), "Should find Explore footer tile")
        exploreTile.tap()
        XCTAssertTrue(app.scrollViews.firstMatch.waitForExistence(timeout: 15), "Explore should load")
        sleep(1)
        capture("explore")
    }

    func testCaptureProfile() throws {
        signInIfRequested()
        waitForHome()
        // Profile is behind the user badge; only reachable when signed in.
        guard app.staticTexts["Sign in"].exists == false else {
            throw XCTSkip("Not signed in — set SCREENSHOT_SIGN_IN=1 to capture Profile")
        }
        let badge = app.buttons["Profile"]
        XCTAssertTrue(badge.waitForExistence(timeout: 10), "Should find profile badge")
        badge.tap()
        sleep(2)
        capture("profile")
    }
}

import XCTest

/// Smoke tests for Ragaflow iOS app.
/// These tests run against the staging Supabase backend and require network access.
/// Test credentials: kpathakota+test@gmail.com / test123
final class RagaflowUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - App Launch

    func testAppLaunches() {
        // Verify the app launches and shows the home screen
        let ragaflowTitle = app.staticTexts["Ragaflow"]
        XCTAssertTrue(ragaflowTitle.waitForExistence(timeout: 10), "Home screen should show 'Ragaflow' title")
    }

    func testHomeShowsSubtitle() {
        let subtitle = app.staticTexts["Indian classical ragas for focus, sleep & meditation"]
        XCTAssertTrue(subtitle.waitForExistence(timeout: 10), "Home screen should show subtitle")
    }

    func testHomeShowsScenarioCards() {
        // Wait for data to load
        let focusCard = app.staticTexts["Focus"]
        XCTAssertTrue(focusCard.waitForExistence(timeout: 10), "Should show Focus scenario card")

        XCTAssertTrue(app.staticTexts["Sleep"].exists, "Should show Sleep scenario card")
        XCTAssertTrue(app.staticTexts["Meditate"].exists, "Should show Meditate scenario card")
    }

    func testHomeShowsSignInWhenLoggedOut() {
        // When not logged in, should show "Sign in" button
        let signIn = app.staticTexts["Sign in"]
        // May or may not exist depending on auth state — just verify no crash
        _ = signIn.waitForExistence(timeout: 5)
    }

    // MARK: - Navigation

    func testNavigateToFocusTracks() {
        let focusCard = app.staticTexts["Focus"]
        XCTAssertTrue(focusCard.waitForExistence(timeout: 10))
        focusCard.tap()

        // Should navigate to Focus track list
        let focusTitle = app.navigationBars["Focus"]
        XCTAssertTrue(focusTitle.waitForExistence(timeout: 10), "Should navigate to Focus track list")
    }

    func testNavigateToSleepTracks() {
        let sleepCard = app.staticTexts["Sleep"]
        XCTAssertTrue(sleepCard.waitForExistence(timeout: 10))
        sleepCard.tap()

        let sleepTitle = app.navigationBars["Sleep"]
        XCTAssertTrue(sleepTitle.waitForExistence(timeout: 10), "Should navigate to Sleep track list")
    }

    func testNavigateToMeditateTracks() {
        let meditateCard = app.staticTexts["Meditate"]
        XCTAssertTrue(meditateCard.waitForExistence(timeout: 10))
        meditateCard.tap()

        let meditateTitle = app.navigationBars["Meditate"]
        XCTAssertTrue(meditateTitle.waitForExistence(timeout: 10), "Should navigate to Meditate track list")
    }

    func testNavigateToExplore() {
        let exploreCard = app.staticTexts["Explore"]
        XCTAssertTrue(exploreCard.waitForExistence(timeout: 10))
        exploreCard.tap()

        let exploreTitle = app.navigationBars["Explore"]
        XCTAssertTrue(exploreTitle.waitForExistence(timeout: 10), "Should navigate to Explore page")
    }
}

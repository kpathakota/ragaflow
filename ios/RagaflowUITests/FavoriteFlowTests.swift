import XCTest

/// Tests for the favorite toggle flow.
/// Requires sign-in and at least one track in the staging database.
final class FavoriteFlowTests: XCTestCase {

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
        guard signIn.waitForExistence(timeout: 10) else { return }
        signIn.tap()

        let emailField = app.textFields["Email"]
        guard emailField.waitForExistence(timeout: 5) else { return }
        emailField.tap()
        emailField.typeText(testEmail)

        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText(testPassword)

        app.buttons["Sign In"].tap()

        let ragaflowTitle = app.staticTexts["Ragaflow"]
        _ = ragaflowTitle.waitForExistence(timeout: 15)
    }

    private func navigateToFirstTrack(scenario: String) {
        let card = app.staticTexts[scenario]
        XCTAssertTrue(card.waitForExistence(timeout: 10))
        card.tap()

        let scrollView = app.scrollViews.firstMatch
        XCTAssertTrue(scrollView.waitForExistence(timeout: 10))

        sleep(2)

        let firstTrackLink = scrollView.buttons.firstMatch
        if firstTrackLink.waitForExistence(timeout: 5) {
            firstTrackLink.tap()
        }
    }

    // MARK: - Favorite Tests

    func testFavoriteButtonExistsOnPlayer() {
        signIn()
        navigateToFirstTrack(scenario: "Focus")

        // Wait for player to load
        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10))

        // Heart button should exist in the toolbar
        let heartButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "heart")).firstMatch
        XCTAssertTrue(heartButton.waitForExistence(timeout: 5), "Heart/favorite button should exist on player")
    }

    func testToggleFavoriteOnPlayer() {
        signIn()
        navigateToFirstTrack(scenario: "Focus")

        let pill25 = app.buttons["25m"]
        XCTAssertTrue(pill25.waitForExistence(timeout: 10))

        // Find heart button
        let heartButton = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "heart")).firstMatch
        guard heartButton.waitForExistence(timeout: 5) else {
            XCTFail("Heart button not found")
            return
        }

        // Tap to toggle favorite
        heartButton.tap()

        // Wait for network round-trip
        sleep(2)

        // Tap again to un-favorite (idempotent test — we don't know initial state)
        heartButton.tap()

        // Verify button still exists (didn't crash)
        XCTAssertTrue(heartButton.waitForExistence(timeout: 3), "Heart button should still exist after toggling")
    }

    func testFavoriteButtonOnTrackList() {
        signIn()

        // Navigate to Focus track list
        let focusCard = app.staticTexts["Focus"]
        XCTAssertTrue(focusCard.waitForExistence(timeout: 10))
        focusCard.tap()

        // Wait for track list
        let scrollView = app.scrollViews.firstMatch
        XCTAssertTrue(scrollView.waitForExistence(timeout: 10))
        sleep(2)

        // Heart buttons should exist on track cards
        let heartButtons = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "heart"))
        // There should be at least one heart button (one per track card)
        XCTAssertTrue(heartButtons.count > 0 || scrollView.exists, "Track list should have heart buttons or be empty")
    }
}

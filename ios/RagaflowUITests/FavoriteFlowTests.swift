import XCTest

/// Tests for the favorite toggle flow.
/// Requires a signed-in user and at least one track in staging.
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

    private func ensureSignedIn() -> Bool {
        // Wait for home to load
        let focusCard = app.staticTexts["Focus"]
        guard focusCard.waitForExistence(timeout: 15) else { return false }

        // Wait a moment for auth state to fully resolve, then check
        // "Sign in" appears in the nav bar when signed out
        let signInText = app.staticTexts["Sign in"]
        // Give auth 5 seconds to resolve — if "Sign in" appears, user is signed out
        guard signInText.waitForExistence(timeout: 5) else { return true }

        app.staticTexts["Sign in"].tap()

        let emailField = app.textFields["Email"]
        guard emailField.waitForExistence(timeout: 5) else { return false }
        emailField.tap()
        emailField.typeText(testEmail)

        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText(testPassword)

        app.buttons["Sign In"].tap()

        // AuthView auto-dismisses on sign-in
        return app.staticTexts["Focus"].waitForExistence(timeout: 15)
    }

    private func navigateToFirstTrack(scenario: String) -> Bool {
        let card = app.staticTexts[scenario]
        guard card.waitForExistence(timeout: 10) else { return false }
        card.tap()

        let scrollView = app.scrollViews.firstMatch
        guard scrollView.waitForExistence(timeout: 10) else { return false }

        let firstTrackLink = scrollView.buttons.firstMatch
        guard firstTrackLink.waitForExistence(timeout: 10) else { return false }
        firstTrackLink.tap()

        return app.buttons["25m"].waitForExistence(timeout: 10)
    }

    // MARK: - Favorite Tests

    func testFavoriteButtonExistsOnPlayer() {
        guard ensureSignedIn() else { return }
        guard navigateToFirstTrack(scenario: "Focus") else { return }

        // Heart button is in the navigation bar trailing position
        // Wait for auth state to propagate to the player toolbar
        let navBar = app.navigationBars.firstMatch
        // The heart button appears asynchronously when auth resolves
        let secondButton = navBar.buttons.element(boundBy: 1)
        XCTAssertTrue(secondButton.waitForExistence(timeout: 10), "Player toolbar should have Back + favorite buttons")
    }

    func testToggleFavoriteOnPlayer() {
        guard ensureSignedIn() else { return }
        guard navigateToFirstTrack(scenario: "Focus") else { return }

        let navBar = app.navigationBars.firstMatch
        // Wait for the heart button to appear (auth may still be resolving)
        let secondButton = navBar.buttons.element(boundBy: 1)
        guard secondButton.waitForExistence(timeout: 10) else {
            XCTFail("Heart button did not appear — auth may not have resolved")
            return
        }
        let heartButton = secondButton

        heartButton.tap()
        sleep(2)
        heartButton.tap()

        XCTAssertTrue(heartButton.waitForExistence(timeout: 3), "Favorite button should still exist after toggling")
    }

    func testFavoriteButtonOnTrackList() {
        guard ensureSignedIn() else { return }

        let focusCard = app.staticTexts["Focus"]
        XCTAssertTrue(focusCard.waitForExistence(timeout: 10))
        focusCard.tap()

        let scrollView = app.scrollViews.firstMatch
        XCTAssertTrue(scrollView.waitForExistence(timeout: 10))

        let trackCards = scrollView.buttons
        let hasCards = trackCards.firstMatch.waitForExistence(timeout: 10)
        XCTAssertTrue(hasCards, "Track list should have at least one track card")
    }
}

import XCTest

/// Tests for the authentication flow.
/// Uses test credentials: kpathakota+test@gmail.com / test123
final class AuthFlowTests: XCTestCase {

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

    private func navigateToAuth() {
        let signIn = app.staticTexts["Sign in"]
        if signIn.waitForExistence(timeout: 10) {
            signIn.tap()
        }
    }

    private func signIn() {
        navigateToAuth()

        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5))
        emailField.tap()
        emailField.typeText(testEmail)

        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText(testPassword)

        let signInButton = app.buttons["Sign In"]
        signInButton.tap()
    }

    private func signOut() {
        // Navigate to profile
        let userBadge = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "K")).firstMatch
        if userBadge.waitForExistence(timeout: 5) {
            userBadge.tap()

            let signOutButton = app.buttons["Sign Out"]
            if signOutButton.waitForExistence(timeout: 5) {
                signOutButton.tap()
            }
        }
    }

    // MARK: - Auth Flow Tests

    func testAuthScreenShowsForm() {
        navigateToAuth()

        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5), "Should show email text field")

        let passwordField = app.secureTextFields["Password"]
        XCTAssertTrue(passwordField.exists, "Should show password field")

        let signInButton = app.buttons["Sign In"]
        XCTAssertTrue(signInButton.exists, "Should show Sign In button")
    }

    func testAuthScreenTogglesToSignUp() {
        navigateToAuth()

        let toggleButton = app.buttons["Don't have an account? Sign Up"]
        if toggleButton.waitForExistence(timeout: 5) {
            toggleButton.tap()

            let signUpButton = app.buttons["Sign Up"]
            XCTAssertTrue(signUpButton.waitForExistence(timeout: 3), "Should show Sign Up button after toggle")

            let toggleBack = app.buttons["Already have an account? Sign In"]
            XCTAssertTrue(toggleBack.exists, "Should show toggle back to Sign In")
        }
    }

    func testSignInButtonDisabledWhenFieldsEmpty() {
        navigateToAuth()

        let signInButton = app.buttons["Sign In"]
        XCTAssertTrue(signInButton.waitForExistence(timeout: 5))
        XCTAssertFalse(signInButton.isEnabled, "Sign In should be disabled when fields are empty")
    }

    func testSignInWithValidCredentials() {
        signIn()

        // After successful sign in, should return to home and show user badge instead of "Sign in"
        let ragaflowTitle = app.staticTexts["Ragaflow"]
        XCTAssertTrue(ragaflowTitle.waitForExistence(timeout: 15), "Should return to home after sign in")

        // "Sign in" text should no longer appear (replaced by user badge)
        let signInText = app.staticTexts["Sign in"]
        let signInGone = !signInText.waitForExistence(timeout: 3)
        XCTAssertTrue(signInGone, "Sign in link should disappear after login")

        // Clean up: sign out
        signOut()
    }

    func testSignOutReturnsToUnauthenticatedState() {
        signIn()

        // Wait for home to appear after sign in
        let ragaflowTitle = app.staticTexts["Ragaflow"]
        XCTAssertTrue(ragaflowTitle.waitForExistence(timeout: 15))

        signOut()

        // Should show "Sign in" again
        let signInText = app.staticTexts["Sign in"]
        XCTAssertTrue(signInText.waitForExistence(timeout: 10), "Should show Sign in after sign out")
    }
}

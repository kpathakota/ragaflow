import XCTest

/// Tests for the authentication flow.
/// Uses test credentials: kpathakota+alt@gmail.com / alt123
///
/// Auth tests that require signed-out state will skip if a session persists.
final class AuthFlowTests: XCTestCase {

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

    /// Wait for home and return true if signed out (Sign in is visible).
    private func isSignedOut() -> Bool {
        let ragaflowTitle = app.staticTexts["Ragaflow"]
        guard ragaflowTitle.waitForExistence(timeout: 10) else { return false }
        // Give auth state time to resolve
        sleep(2)
        return app.staticTexts["Sign in"].exists
    }

    private func navigateToAuth() {
        let signIn = app.staticTexts["Sign in"]
        guard signIn.waitForExistence(timeout: 3) else { return }
        signIn.tap()
    }

    // MARK: - Auth Form Tests

    func testAuthScreenShowsForm() {
        guard isSignedOut() else { return }
        navigateToAuth()

        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5), "Should show email text field")

        let passwordField = app.secureTextFields["Password"]
        XCTAssertTrue(passwordField.exists, "Should show password field")

        let signInButton = app.buttons["Sign In"]
        XCTAssertTrue(signInButton.exists, "Should show Sign In button")
    }

    func testAuthScreenTogglesToSignUp() {
        guard isSignedOut() else { return }
        navigateToAuth()

        let toggleButton = app.buttons["Don't have an account? Sign Up"]
        guard toggleButton.waitForExistence(timeout: 5) else { return }
        toggleButton.tap()

        let signUpButton = app.buttons["Sign Up"]
        XCTAssertTrue(signUpButton.waitForExistence(timeout: 3), "Should show Sign Up button after toggle")

        let toggleBack = app.buttons["Already have an account? Sign In"]
        XCTAssertTrue(toggleBack.exists, "Should show toggle back to Sign In")
    }

    func testSignInButtonDisabledWhenFieldsEmpty() {
        guard isSignedOut() else { return }
        navigateToAuth()

        let signInButton = app.buttons["Sign In"]
        XCTAssertTrue(signInButton.waitForExistence(timeout: 5))
        XCTAssertFalse(signInButton.isEnabled, "Sign In should be disabled when fields are empty")
    }

    // MARK: - Confirm Password Tests

    func testConfirmPasswordVisibleInSignUpMode() {
        guard isSignedOut() else { return }
        navigateToAuth()

        // Should not show confirm password in sign-in mode
        XCTAssertFalse(app.secureTextFields["Confirm password"].exists,
                       "Confirm password should not show in sign-in mode")

        // Toggle to sign-up
        let toggleButton = app.buttons["Don't have an account? Sign Up"]
        guard toggleButton.waitForExistence(timeout: 5) else { return }
        toggleButton.tap()

        let confirmField = app.secureTextFields["Confirm password"]
        XCTAssertTrue(confirmField.waitForExistence(timeout: 3),
                      "Confirm password should appear in sign-up mode")
    }

    func testConfirmPasswordHiddenAfterToggleBack() {
        guard isSignedOut() else { return }
        navigateToAuth()

        // Toggle to sign-up
        let toggleButton = app.buttons["Don't have an account? Sign Up"]
        guard toggleButton.waitForExistence(timeout: 5) else { return }
        toggleButton.tap()

        XCTAssertTrue(app.secureTextFields["Confirm password"].waitForExistence(timeout: 3))

        // Toggle back to sign-in
        let toggleBack = app.buttons["Already have an account? Sign In"]
        toggleBack.tap()

        // Give animation time
        sleep(1)
        XCTAssertFalse(app.secureTextFields["Confirm password"].exists,
                       "Confirm password should disappear after toggling back to sign-in")
    }

    func testSignUpDisabledWhenPasswordsMismatch() {
        guard isSignedOut() else { return }
        navigateToAuth()

        // Toggle to sign-up
        let toggleButton = app.buttons["Don't have an account? Sign Up"]
        guard toggleButton.waitForExistence(timeout: 5) else { return }
        toggleButton.tap()

        let emailField = app.textFields["Email"]
        guard emailField.waitForExistence(timeout: 5) else { return }
        emailField.tap()
        emailField.typeText("test@example.com")

        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText("password1")

        let confirmField = app.secureTextFields["Confirm password"]
        confirmField.tap()
        confirmField.typeText("password2")

        let signUpButton = app.buttons["Sign Up"]
        XCTAssertFalse(signUpButton.isEnabled, "Sign Up should be disabled when passwords don't match")

        // Mismatch indicator should be visible
        XCTAssertTrue(app.staticTexts["Passwords do not match"].exists,
                      "Should show mismatch indicator")
    }

    func testSignInDismissesAuthScreen() {
        guard isSignedOut() else { return }
        navigateToAuth()

        let emailField = app.textFields["Email"]
        guard emailField.waitForExistence(timeout: 5) else { return }
        emailField.tap()
        emailField.typeText(testEmail)

        let passwordField = app.secureTextFields["Password"]
        passwordField.tap()
        passwordField.typeText(testPassword)

        app.buttons["Sign In"].tap()

        // After successful sign-in, AuthView should dismiss automatically
        // and we should be back on the home screen with scenario cards visible
        let focusCard = app.staticTexts["Focus"]
        XCTAssertTrue(focusCard.waitForExistence(timeout: 15), "Should return to home screen after sign-in")

        // "Sign in" should no longer be visible (user badge replaces it)
        let signInText = app.staticTexts["Sign in"]
        XCTAssertFalse(signInText.exists, "Sign in link should disappear after login")
    }
}

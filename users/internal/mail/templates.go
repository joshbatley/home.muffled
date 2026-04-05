package mail

import "fmt"

func WelcomeIntranet(fromName, intranetURL string) (subject, body string) {
	subject = "Welcome to home.muffled intranet"
	body = fmt.Sprintf(`You've been invited to the home.muffled intranet.

%s

Sign in with your email and the password provided by your administrator.
If you need to reset your password, use the forgot-password flow on the sign-in page.

— %s
`, intranetURL, fromName)
	return subject, body
}

func PasswordReset(resetURL string) (subject, body string) {
	subject = "Password reset"
	body = fmt.Sprintf(`You requested a password reset for your intranet account.

Open this link to set a new password (it expires soon):

%s

If you did not request this, you can ignore this email.
`, resetURL)
	return subject, body
}

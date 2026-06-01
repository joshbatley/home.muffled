export function welcomeIntranet(fromName: string, intranetURL: string) {
  return {
    subject: "Welcome to home.muffled intranet",
    body: `You've been invited to the home.muffled intranet.

${intranetURL}

Sign in with your email and the password provided by your administrator.
If you need to reset your password, use the forgot-password flow on the sign-in page.

— ${fromName}
`,
  };
}

export function passwordReset(resetURL: string) {
  return {
    subject: "Password reset",
    body: `You requested a password reset for your intranet account.

Open this link to set a new password (it expires soon):

${resetURL}

If you did not request this, you can ignore this email.
`,
  };
}

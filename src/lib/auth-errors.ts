type AuthFailure = { code?: string; status?: number; name?: string };

// Map documented Auth codes, never display raw provider messages or payloads.
export function authFailureMessage(
  error: AuthFailure,
  operation: "signup" | "login",
) {
  switch (error.code) {
    case "over_email_send_rate_limit":
      return "This Supabase project has reached its confirmation-email limit (over_email_send_rate_limit). Stop retrying for now. Ask the project owner to configure custom SMTP, or have the owner create your course account in the Supabase dashboard without sending an invitation.";
    case "email_address_not_authorized":
      return "This project's default email service cannot send a confirmation to this address (email_address_not_authorized). The project owner must configure custom SMTP or create a confirmed course account in the Supabase dashboard.";
    case "email_not_confirmed":
      return "Confirm your email before signing in (email_not_confirmed). If no confirmation arrived, ask the project owner to check email delivery; creating the same account again will not fix delivery.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "Email account registration is disabled for this Supabase project. Contact the project owner.";
    case "weak_password":
      return "This password does not meet the project's password policy. Choose a stronger password with at least 12 characters.";
    case "email_address_invalid":
      return "Enter a valid email address supported by the project's email provider.";
    case "user_already_exists":
      return "Account creation could not be completed. If you registered before, try signing in or contact your administrator.";
    case "over_request_rate_limit":
    case "over_email_rate_limit":
      return "Too many authentication requests. Pause before trying again; repeatedly clicking will extend the problem.";
  }
  if (error.status === 429)
    return "Supabase is limiting authentication requests. Pause before retrying and ask the project owner to check Auth rate limits.";
  if (error.status === 401 || error.status === 403)
    return "Supabase rejected this app's authentication request. Check that .env.local contains the matching project URL and public publishable key, then restart Vite.";
  if (
    error.name === "AuthRetryableFetchError" ||
    error.name === "AuthSessionMissingError" ||
    error.status === 0
  )
    return "The authentication service could not be reached. Check your connection and Supabase project URL, then try again.";
  if (error.status && error.status >= 500)
    return "Supabase could not complete the authentication request. Ask the project owner to check the Auth logs and email provider configuration.";
  return operation === "signup"
    ? "Account creation failed. Ask the project owner to check the Supabase Auth logs for this attempt. Your password has not been cleared, so you can retry after the cause is fixed."
    : "Sign-in failed. Check your email and password, then try again.";
}

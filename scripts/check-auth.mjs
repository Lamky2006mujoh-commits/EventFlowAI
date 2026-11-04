// Read-only diagnostics. Never attempts signup or prints a public/private API key.
import { resolveBackendConfig } from "../src/lib/config.ts";

const config = resolveBackendConfig(process.env);
if (config.configurationError) throw new Error(config.configurationError);
if (config.mode !== "supabase")
  throw new Error("Set VITE_APP_MODE=supabase for real account checks.");
const response = await fetch(`${config.url}/auth/v1/settings`, {
  headers: { apikey: config.key },
  signal: AbortSignal.timeout(10000),
});
if (!response.ok)
  throw new Error(
    `Auth settings request returned HTTP ${response.status}. Check the project URL/key pair and project availability.`,
  );
const settings = await response.json();
console.log(`Project: ${new URL(config.url).hostname}`);
console.log("PASS: public URL/key can reach Supabase Auth.");
console.log(
  `Email provider: ${settings.external?.email ? "enabled" : "disabled"}`,
);
console.log(`New signups: ${settings.disable_signup ? "disabled" : "enabled"}`);
console.log(
  `Email confirmation: ${settings.mailer_autoconfirm ? "off (email ownership is not verified)" : "required"}`,
);
console.log(
  "This read-only check does not send an email or test SMTP delivery.",
);
console.log(
  "If signup returns over_email_send_rate_limit, check the shared project email quota.",
);
console.log(
  "If signup returns email_address_not_authorized, configure custom SMTP or provision known course accounts through the project dashboard.",
);

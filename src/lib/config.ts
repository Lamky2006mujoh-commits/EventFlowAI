export function resolveBackendConfig(env: Record<string, string | undefined>) {
  const mode = env.VITE_APP_MODE || "supabase";
  const url = env.VITE_SUPABASE_URL?.trim() || "";
  const key =
    (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim() ||
    "";
  let configurationError: string | null = null;
  if (mode !== "supabase" && mode !== "demo") {
    configurationError = "VITE_APP_MODE must be supabase or demo.";
  } else if (mode === "supabase") {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol) || !key)
        throw new Error();
    } catch {
      configurationError =
        "Set a valid VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart the app.";
    }
  }
  return { mode, url, key, configurationError };
}

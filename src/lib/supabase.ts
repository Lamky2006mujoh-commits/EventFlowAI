import { createClient } from "@supabase/supabase-js";
import { resolveBackendConfig } from "./config.ts";

export const backendConfig = resolveBackendConfig(import.meta.env ?? {});
export const supabase =
  backendConfig.mode === "supabase" && !backendConfig.configurationError
    ? createClient(backendConfig.url, backendConfig.key)
    : null;

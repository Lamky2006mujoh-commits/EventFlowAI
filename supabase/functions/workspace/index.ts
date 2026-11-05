import { createClient } from "@supabase/supabase-js";
import { createWorkspaceHandler } from "../_shared/workspace-handler.ts";
Deno.serve(createWorkspaceHandler(createClient, (key) => Deno.env.get(key)));

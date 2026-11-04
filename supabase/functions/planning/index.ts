import { createClient } from "@supabase/supabase-js";
import { createPlanningHandler } from "../_shared/planning-handler.ts";
Deno.serve(createPlanningHandler(createClient, (key) => Deno.env.get(key)));

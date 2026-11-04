import {
  emptyPlanning,
  planningRequestSchema,
  planningSchema,
} from "./planning.ts";
import { briefDataSchema } from "./contracts.ts";
import { preparePlanning, PlanningError } from "./planning-service.ts";
import { generateStructured, GenerationError } from "./gemini.ts";
export function createPlanningHandler(
  createClient: typeof import("@supabase/supabase-js").createClient,
  env: (key: string) => string | undefined,
) {
  return async (req: Request) => {
    const origin = req.headers.get("origin");
    const allowed = (
      env("ALLOWED_ORIGINS") ??
      "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
    )
      .split(",")
      .map((s) => s.trim());
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Vary: "Origin",
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    if (origin && allowed.includes(origin))
      headers["Access-Control-Allow-Origin"] = origin;
    const respond = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers });
    if (origin && !allowed.includes(origin))
      return respond({ error: "Origin not allowed." }, 403);
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (req.method !== "POST") return respond({ error: "Use POST." }, 405);
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer "))
      return respond({ error: "Sign in to continue." }, 401);
    try {
      const raw = await req.text();
      if (raw.length > 40000)
        return respond({ error: "Request too large." }, 413);
      let json;
      try {
        json = JSON.parse(raw);
      } catch {
        return respond({ error: "Invalid JSON." }, 400);
      }
      const parsed = planningRequestSchema.safeParse(json);
      if (!parsed.success)
        return respond({ error: "Invalid planning request." }, 400);
      const client = createClient(
        env("SUPABASE_URL")!,
        env("SUPABASE_ANON_KEY")!,
        {
          global: {
            headers: { Authorization: authorization },
            fetch: (input, init) =>
              fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
          },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || !auth.user)
        return respond(
          { error: "Your session expired. Please sign in again." },
          401,
        );
      const { data: member, error: memberError } = await client
        .from("agency_members")
        .select("agency_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (memberError) throw memberError;
      if (!member)
        return respond(
          { error: "Ask your administrator to add you to an agency." },
          403,
        );
      const input = parsed.data;
      const { data: brief, error: briefError } = await client
        .from("briefs")
        .select("version,data")
        .eq("id", input.briefId)
        .eq("agency_id", member.agency_id)
        .maybeSingle();
      if (briefError) throw briefError;
      if (!brief)
        return respond({ error: "Brief not found in your agency." }, 404);
      const { data: row, error: loadError } = await client
        .from("brief_planning")
        .select("state")
        .eq("brief_id", input.briefId)
        .maybeSingle();
      if (loadError) throw loadError;
      const state = planningSchema.parse(
        row?.state ?? emptyPlanning(brief.version),
      );
      if (input.action === "load") return respond(state);
      const payload = await preparePlanning(
        input,
        state,
        { version: brief.version, data: briefDataSchema.parse(brief.data) },
        (schema, data) =>
          generateStructured(schema, data, {
            apiKey: env("GEMINI_API_KEY") ?? "",
            model: env("GEMINI_MODEL") ?? "",
            timeoutMs: 60000,
            maxAttempts: 2,
            thinkingLevel:
              env("GEMINI_MODEL") === "gemini-3.5-flash"
                ? "minimal"
                : undefined,
          }),
      );
      const { data, error } = await client.rpc("save_planning", {
        p_brief_id: input.briefId,
        p_action: input.action,
        p_expected_revision: input.expectedRevision,
        p_brief_version: input.briefVersion,
        p_payload: payload,
        p_confirm: "confirm" in input ? input.confirm : false,
      });
      if (error) {
        if (
          error.message.includes("conflict") ||
          error.message.includes("Brief changed")
        )
          return respond(
            {
              error:
                "Planning or brief version conflict. Reload before saving.",
            },
            409,
          );
        throw error;
      }
      return respond(planningSchema.parse(data));
    } catch (error) {
      if (error instanceof PlanningError)
        return respond({ error: error.message }, 409);
      if (error instanceof GenerationError)
        return respond({ error: error.message }, 502);
      return respond(
        {
          error: "Planning request failed. Check backend setup and try again.",
        },
        500,
      );
    }
  };
}

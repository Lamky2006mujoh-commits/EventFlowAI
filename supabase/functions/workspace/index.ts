import { createClient } from "@supabase/supabase-js";
import { requestSchema, workspaceSchema } from "../_shared/contracts.ts";

const publicErrors = new Set([
  "Agency membership required",
  "Invalid brief data",
  "Brief not found in your agency",
  "Brief version conflict. Reload before saving",
  "Administrator permission required",
  "Invalid role",
  "Member not found in your agency",
  "Keep at least one agency administrator",
  "Invalid member details",
  "Account cannot be added. Confirm registration and agency eligibility",
]);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const allowed = (
    Deno.env.get("ALLOWED_ORIGINS") ??
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
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowed.includes(origin))
    return respond({ error: "Origin not allowed." }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return respond({ error: "Use POST." }, 405);
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    return respond({ error: "Sign in to continue." }, 401);
  try {
    const text = await req.text();
    if (text.length > 32000)
      return respond({ error: "Request is too large." }, 413);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return respond({ error: "Invalid JSON." }, 400);
    }
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success)
      return respond(
        {
          error:
            "Invalid request. Check required fields, event date, attendees, and budget.",
        },
        400,
      );
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
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
    const { data: me, error: membershipError } = await client
      .from("agency_members")
      .select("*")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!me)
      return respond(
        { error: "Ask your administrator to add you to an agency." },
        403,
      );
    const input = parsed.data;
    if (input.action === "workspace") {
      const [agency, members, briefs] = await Promise.all([
        client.from("agencies").select("name").eq("id", me.agency_id).single(),
        client
          .from("agency_members")
          .select("user_id,display_name,role")
          .eq("agency_id", me.agency_id),
        client
          .from("briefs")
          .select("*,brief_versions(*)")
          .eq("agency_id", me.agency_id)
          .order("updated_at", { ascending: false }),
      ]);
      for (const result of [agency, members, briefs])
        if (result.error) throw result.error;
      const output = workspaceSchema.parse({
        session: {
          id: me.user_id,
          name: me.display_name,
          agencyId: me.agency_id,
          agencyName: agency.data!.name,
          role: me.role,
        },
        members: members.data!.map((m) => ({
          id: m.user_id,
          name: m.display_name,
          role: m.role,
        })),
        briefs: briefs.data!.map((b) => ({
          id: b.id,
          agencyId: b.agency_id,
          data: b.data,
          version: b.version,
          updatedAt: b.updated_at,
          author: b.author,
          needsReview: b.needs_review,
          history: b.brief_versions.map(
            (v: {
              version: number;
              data: unknown;
              author: string;
              created_at: string;
            }) => ({
              version: v.version,
              data: v.data,
              author: v.author,
              createdAt: v.created_at,
            }),
          ),
        })),
      });
      return respond(output);
    }
    if (input.action === "save") {
      const result = await client.rpc("save_brief", {
        p_data: input.data,
        p_id: input.id ?? null,
        p_expected_version: input.expectedVersion ?? null,
      });
      if (result.error) throw result.error;
      return respond({ id: result.data });
    }
    if (input.action === "delete") {
      const result = await client.rpc("delete_brief", { p_id: input.id });
      if (result.error) throw result.error;
      return respond({ success: true });
    }
    if (input.action === "addMember") {
      const result = await client.rpc("add_agency_member", {
        p_email: input.email,
        p_name: input.name,
        p_role: input.role,
      });
      if (result.error) throw result.error;
      return respond({ success: true });
    }
    if (input.action === "removeMember") {
      const result = await client.rpc("remove_agency_member", {
        p_member_id: input.memberId,
      });
      if (result.error) throw result.error;
      return respond({ success: true });
    }
    const result = await client.rpc("change_member_role", {
      p_member_id: input.memberId,
      p_role: input.role,
    });
    if (result.error) throw result.error;
    return respond({ success: true });
  } catch (error) {
    const message =
      typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
    if (publicErrors.has(message))
      return respond(
        { error: message },
        message.includes("conflict") ? 409 : 403,
      );
    return respond(
      {
        error:
          "The workspace request failed. Check backend setup and try again.",
      },
      500,
    );
  }
});

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  registrationSchema,
  requestSchema,
  workspaceSchema,
  type ApiRequest,
  type BriefData,
} from "../../supabase/functions/_shared/contracts.ts";

export class SessionExpiredError extends Error {
  constructor() {
    super("Your session has ended. Please sign in again.");
  }
}
export class AccessRevokedError extends SessionExpiredError {
  constructor() {
    super();
    this.message =
      "Your account has no agency access. Ask your administrator to add you.";
  }
}
export function createWorkspaceApi(
  client: Pick<SupabaseClient, "auth" | "functions">,
) {
  let sessionRevision = 0;
  async function request(body: ApiRequest) {
    const revision = sessionRevision;
    const { data, error } = await client.functions.invoke("workspace", {
      body: requestSchema.parse(body),
    });
    if (revision !== sessionRevision) throw new SessionExpiredError();
    if (error) {
      let message = "Request failed. Check your connection and try again.";
      if (error.context instanceof Response) {
        if (error.context.status === 401) throw new SessionExpiredError();
        const response = await error.context.json().catch(() => null);
        if (
          error.context.status === 403 &&
          response?.error === "Ask your administrator to add you to an agency."
        )
          throw new AccessRevokedError();
        if (typeof response?.error === "string") message = response.error;
      }
      throw new Error(message);
    }
    return data;
  }
  const api = {
    async load() {
      return workspaceSchema.parse(await request({ action: "workspace" }));
    },
    async restore() {
      const { data, error } = await client.auth.getSession();
      if (error) throw new SessionExpiredError();
      return data.session ? api.load() : null;
    },
    async login(email: string, password: string) {
      const { error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error)
        throw new Error(
          "Sign-in failed. Check your email and password, then try again.",
        );
      try {
        return await api.load();
      } catch (error) {
        await client.auth.signOut({ scope: "local" });
        throw error;
      }
    },
    async logout() {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw new Error("Could not sign out. Please try again.");
    },
    async register(name: string, email: string, password: string) {
      const input = registrationSchema.parse({
        name,
        email: email.trim(),
        password,
      });
      const { error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { display_name: input.name } },
      });
      if (error)
        throw new Error(
          "Account creation failed. Check your details or contact your administrator.",
        );
      // Registration never grants agency access or an administrator role.
      const { error: logoutError } = await client.auth.signOut({
        scope: "local",
      });
      if (logoutError)
        throw new Error(
          "Account submitted, but the session could not be cleared. Sign out before continuing.",
        );
    },
    onSessionEnd(listener: () => void) {
      const { data } = client.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          sessionRevision += 1;
          listener();
        }
      });
      return () => data.subscription.unsubscribe();
    },
    async save(
      data: BriefData,
      id?: string,
      expectedVersion?: number,
    ): Promise<string> {
      const result = await request({
        action: "save",
        data,
        id,
        expectedVersion,
      });
      if (typeof result?.id !== "string")
        throw new Error("The server returned an invalid brief ID.");
      return result.id;
    },
    async remove(id: string) {
      await request({ action: "delete", id });
    },
    async changeRole(memberId: string, role: "admin" | "member") {
      await request({ action: "role", memberId, role });
    },
    async addMember(email: string, name: string, role: "admin" | "member") {
      await request({ action: "addMember", email, name, role });
    },
    async removeMember(memberId: string) {
      await request({ action: "removeMember", memberId });
    },
  };
  return api;
}

import { createClient } from "@supabase/supabase-js";
import {
  workspaceSchema,
  type ApiRequest,
  type BriefData,
} from "../../supabase/functions/_shared/contracts";
import { demo } from "./demo";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const liveMode = import.meta.env.VITE_APP_MODE === "supabase";
export const configurationError =
  liveMode && (!url || !key)
    ? "Supabase mode requires a project URL and a publishable key."
    : null;
const client =
  liveMode && !configurationError ? createClient(url!, key!) : null;
async function request(body: ApiRequest) {
  if (!client) throw new Error("Supabase is not configured.");
  const { data, error } = await client.functions.invoke("workspace", { body });
  if (error) {
    let message =
      "Request failed. Check your connection and sign in again if your session expired.";
    if (error.context instanceof Response) {
      const response = await error.context.json().catch(() => null);
      if (typeof response?.error === "string") message = response.error;
    }
    throw new Error(message);
  }
  return data;
}
export const api = {
  async load() {
    return client
      ? workspaceSchema.parse(await request({ action: "workspace" }))
      : demo.load();
  },
  async restore() {
    if (configurationError) throw new Error(configurationError);
    if (!client) return demo.restore();
    const { data, error } = await client.auth.getSession();
    if (error)
      throw new Error("Could not restore your session. Please sign in again.");
    return data.session ? this.load() : null;
  },
  async login(email: string, password: string, persona: string) {
    if (configurationError) throw new Error(configurationError);
    if (!client) return demo.login(persona);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error)
      throw new Error(
        "Sign-in failed. Check your email and password, then try again.",
      );
    return this.load();
  },
  async logout() {
    if (client) {
      const { error } = await client.auth.signOut();
      if (error) throw new Error("Could not sign out. Please try again.");
    } else demo.logout();
  },
  async save(
    data: BriefData,
    id?: string,
    expectedVersion?: number,
  ): Promise<string> {
    if (!client) return demo.save(data, id, expectedVersion);
    const result = await request({ action: "save", data, id, expectedVersion });
    if (typeof result?.id !== "string")
      throw new Error("The server returned an invalid brief ID.");
    return result.id;
  },
  async remove(id: string) {
    if (client) await request({ action: "delete", id });
    else demo.remove(id);
  },
  async changeRole(memberId: string, role: "admin" | "member") {
    if (client) await request({ action: "role", memberId, role });
    else demo.changeRole(memberId, role);
  },
};

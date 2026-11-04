import type { PlanningRequest } from "../../supabase/functions/_shared/planning.ts";
import { backendConfig, supabase } from "./supabase.ts";
import { createWorkspaceApi } from "./workspace-api.ts";
import { demo } from "./demo.ts";

export { SessionExpiredError } from "./workspace-api.ts";
export const liveMode = backendConfig.mode === "supabase";
export const configurationError = backendConfig.configurationError;
const live = supabase ? createWorkspaceApi(supabase) : null;
function backend() {
  if (configurationError) throw new Error(configurationError);
  if (!live) throw new Error("Supabase is not configured.");
  return live;
}
export const api = {
  async planning(input: PlanningRequest) {
    return liveMode ? backend().planning(input) : demo.planning(input);
  },
  async load() {
    return liveMode ? backend().load() : demo.load();
  },
  async restore() {
    if (configurationError) throw new Error(configurationError);
    return liveMode ? backend().restore() : demo.restore();
  },
  async login(email: string, password: string, persona: string) {
    return liveMode ? backend().login(email, password) : demo.login(persona);
  },
  async logout() {
    if (liveMode) await backend().logout();
    else demo.logout();
  },
  async register(name: string, email: string, password: string) {
    return backend().register(name, email, password);
  },
  onSessionEnd(listener: () => void) {
    return live ? live.onSessionEnd(listener) : () => {};
  },
  async save(...args: Parameters<typeof demo.save>) {
    return liveMode ? backend().save(...args) : demo.save(...args);
  },
  async remove(id: string) {
    if (liveMode) await backend().remove(id);
    else demo.remove(id);
  },
  async changeRole(...args: Parameters<typeof demo.changeRole>) {
    if (liveMode) await backend().changeRole(...args);
    else demo.changeRole(...args);
  },
  async addMember(email: string, name: string, role: "admin" | "member") {
    return backend().addMember(email, name, role);
  },
  async removeMember(memberId: string) {
    return backend().removeMember(memberId);
  },
};

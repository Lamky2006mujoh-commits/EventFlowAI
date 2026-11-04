import { z } from "zod";
import {
  briefDataSchema,
  workspaceSchema,
  type BriefData,
  type Workspace,
} from "../../supabase/functions/_shared/contracts.ts";

const STORAGE = "eventflow.sprint2.v1";
const SESSION = "eventflow.sprint2.session";
export const demoPeople = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    name: "Quỳnh Hương",
    agencyId: "a2000000-0000-4000-8000-000000000001",
    agencyName: "Flow Studio",
    role: "admin" as const,
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    name: "Bảo Chí",
    agencyId: "a2000000-0000-4000-8000-000000000001",
    agencyName: "Flow Studio",
    role: "member" as const,
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    name: "Alex Nguyen",
    agencyId: "a2000000-0000-4000-8000-000000000002",
    agencyName: "Northstar Events",
    role: "admin" as const,
  },
];
const storeSchema = z.array(workspaceSchema);
const example: BriefData = {
  title: "Beyond the ordinary",
  client: "Nova Technologies",
  eventType: "Product launch",
  date: "2026-11-26",
  venue: "GEM Center, Ho Chi Minh City",
  attendees: 200,
  budget: 120000000,
  objectives:
    "Introduce Nova’s new product to partners and press. Create hands-on experiences and build meaningful connections.",
  audience:
    "Technology partners, industry press, and prospective enterprise customers.",
  constraints: "",
};
function initial(): Workspace[] {
  return [demoPeople[0], demoPeople[2]].map((person, index) => {
    const data = {
      ...example,
      ...(index
        ? {
            title: "A new perspective",
            client: "Northstar Client",
            eventType: "Conference" as const,
          }
        : {}),
    };
    const now = new Date().toISOString();
    return {
      session: person,
      members: demoPeople
        .filter((p) => p.agencyId === person.agencyId)
        .map((p) => ({ id: p.id, name: p.name, role: p.role })),
      briefs: [
        {
          id: `b1000000-0000-4000-8000-00000000000${index + 1}`,
          agencyId: person.agencyId,
          data,
          version: 1,
          updatedAt: now,
          author: person.name,
          needsReview: false,
          history: [{ version: 1, data, author: person.name, createdAt: now }],
        },
      ],
    };
  });
}
function readStore(): Workspace[] {
  const raw = localStorage.getItem(STORAGE);
  if (raw === null) {
    const seeded = initial();
    localStorage.setItem(STORAGE, JSON.stringify(seeded));
    return seeded;
  }
  const result = storeSchema.safeParse(JSON.parse(raw));
  if (!result.success)
    throw new Error(
      "Saved demo data could not be read. Clear this site’s demo storage to start again.",
    );
  return result.data;
}
function context() {
  const id = sessionStorage.getItem(SESSION);
  const person = demoPeople.find((p) => p.id === id);
  if (!person)
    throw new Error("Your demo session ended. Please sign in again.");
  const store = readStore();
  const workspace = store.find((w) => w.session.agencyId === person.agencyId);
  const member = workspace?.members.find((m) => m.id === id);
  if (!workspace || !member)
    throw new Error("You do not have access to this agency.");
  return { store, workspace, person, member };
}
export const demo = {
  login(id: string) {
    if (!demoPeople.some((p) => p.id === id))
      throw new Error("Choose a valid demo account.");
    sessionStorage.setItem(SESSION, id);
    return this.load();
  },
  logout() {
    sessionStorage.removeItem(SESSION);
  },
  restore() {
    return sessionStorage.getItem(SESSION) ? this.load() : null;
  },
  load(): Workspace {
    const { workspace, person, member } = context();
    return workspaceSchema.parse({
      ...workspace,
      session: { ...person, role: member.role },
    });
  },
  save(data: BriefData, id?: string, expectedVersion?: number) {
    const parsed = briefDataSchema.parse(data);
    const { store, workspace, person } = context();
    const now = new Date().toISOString();
    if (id) {
      const brief = workspace.briefs.find((b) => b.id === id);
      if (!brief) throw new Error("Brief not found in your agency.");
      if (brief.version !== expectedVersion)
        throw new Error(
          "This brief changed in another tab. Reload it before saving.",
        );
      brief.version += 1;
      brief.data = parsed;
      brief.author = person.name;
      brief.updatedAt = now;
      brief.needsReview = true;
      brief.history.push({
        version: brief.version,
        data: parsed,
        author: person.name,
        createdAt: now,
      });
    } else {
      id = crypto.randomUUID();
      workspace.briefs.unshift({
        id,
        agencyId: person.agencyId,
        data: parsed,
        version: 1,
        updatedAt: now,
        author: person.name,
        needsReview: false,
        history: [
          { version: 1, data: parsed, author: person.name, createdAt: now },
        ],
      });
    }
    localStorage.setItem(STORAGE, JSON.stringify(storeSchema.parse(store)));
    return id;
  },
  remove(id: string) {
    const { store, workspace } = context();
    if (!workspace.briefs.some((b) => b.id === id))
      throw new Error("Brief not found in your agency.");
    workspace.briefs = workspace.briefs.filter((b) => b.id !== id);
    localStorage.setItem(STORAGE, JSON.stringify(store));
  },
  changeRole(memberId: string, role: "admin" | "member") {
    const { store, workspace, member } = context();
    if (member.role !== "admin")
      throw new Error("Only agency administrators can update roles.");
    const target = workspace.members.find((m) => m.id === memberId);
    if (!target) throw new Error("Member not found in your agency.");
    if (
      target.role === "admin" &&
      role === "member" &&
      workspace.members.filter((m) => m.role === "admin").length === 1
    )
      throw new Error("Keep at least one agency administrator.");
    target.role = role;
    localStorage.setItem(STORAGE, JSON.stringify(store));
  },
};

import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { demo, demoPeople } from "../src/lib/demo.ts";
import {
  briefDataSchema,
  readiness,
  requestSchema,
  workspaceSchema,
} from "../supabase/functions/_shared/contracts.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
}
beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
  globalThis.sessionStorage = new MemoryStorage();
});
const admin = demoPeople[0].id;
const member = demoPeople[1].id;
const other = demoPeople[2].id;
function data() {
  return demo.login(admin).briefs[0].data;
}

test("required fields, invalid dates, and budget/attendee boundaries", () => {
  const valid = data();
  assert.equal(briefDataSchema.safeParse(valid).success, true);
  for (const patch of [
    { title: " " },
    { client: "" },
    { date: "2026-02-30" },
    { budget: 0 },
    { budget: -1 },
    { budget: Infinity },
    { attendees: 0 },
    { attendees: 1.5 },
    { attendees: NaN },
    { objectives: "short" },
    { venue: "" },
  ]) {
    assert.equal(
      briefDataSchema.safeParse({ ...valid, ...patch }).success,
      false,
      JSON.stringify(patch),
    );
  }
  assert.equal(
    briefDataSchema.safeParse({ ...valid, attendees: 1, budget: 1 }).success,
    true,
  );
});
test("create, edit by another member, preserve historical values and attribution", () => {
  const original = data();
  const id = demo.save(original);
  assert.match(id, /^[0-9a-f-]{36}$/);
  demo.login(member);
  demo.save({ ...original, budget: original.budget + 10 }, id, 1);
  const brief = demo.load().briefs.find((b) => b.id === id);
  assert.equal(brief.version, 2);
  assert.equal(brief.history.length, 2);
  assert.equal(brief.history[0].data.budget, original.budget);
  assert.equal(brief.history[0].author, demoPeople[0].name);
  assert.equal(brief.history[1].author, demoPeople[1].name);
  assert.equal(brief.needsReview, true);
  assert.ok(Date.parse(brief.updatedAt));
});
test("stale edits fail without appending or overwriting history", () => {
  const original = data();
  const id = demo.save(original);
  demo.save({ ...original, budget: 10 }, id, 1);
  assert.throws(
    () => demo.save({ ...original, budget: 20 }, id, 1),
    /another tab/,
  );
  const saved = demo.load().briefs.find((b) => b.id === id);
  assert.equal(saved.data.budget, 10);
  assert.equal(saved.history.length, 2);
});
test("demo agency filtering rejects foreign brief writes and deletes", () => {
  const workspace = demo.login(admin);
  const brief = workspace.briefs[0];
  const otherWorkspace = demo.login(other);
  assert.ok(
    otherWorkspace.briefs.every(
      (b) => b.agencyId !== workspace.session.agencyId,
    ),
  );
  assert.throws(() => demo.save(brief.data, brief.id, 1), /not found/);
  assert.throws(() => demo.remove(brief.id), /not found/);
  assert.throws(() => demo.changeRole(member, "admin"), /not found/);
  assert.equal(demo.login(admin).briefs.length, workspace.briefs.length);
});
test("ordinary members cannot change roles, and the last admin is retained", () => {
  demo.login(member);
  assert.throws(
    () => demo.changeRole(member, "admin"),
    /Only agency administrators/,
  );
  demo.login(admin);
  assert.throws(() => demo.changeRole(admin, "member"), /at least one/);
  demo.changeRole(member, "admin");
  demo.changeRole(admin, "member");
  assert.equal(demo.load().session.role, "member");
  assert.throws(
    () => demo.changeRole(admin, "admin"),
    /Only agency administrators/,
  );
});
test("session restoration, logout, and an invalid session", () => {
  assert.equal(demo.restore(), null);
  demo.login(admin);
  assert.equal(demo.restore().session.id, admin);
  demo.logout();
  assert.throws(() => demo.load(), /session ended/);
  assert.throws(() => demo.login("invalid"), /valid demo account/);
});
test("missing optional information produces clarifications; complete brief is ready", () => {
  const valid = data();
  assert.equal(
    readiness({ ...valid, audience: "", constraints: "" }).length,
    2,
  );
  assert.equal(
    readiness({ ...valid, constraints: "None confirmed" }).length,
    0,
  );
});
test("invalid saves and storage failures do not report success or alter saved data", () => {
  const original = data();
  const count = demo.load().briefs.length;
  assert.throws(() => demo.save({ ...original, budget: -1 }));
  assert.equal(demo.load().briefs.length, count);
  const write = localStorage.setItem.bind(localStorage);
  localStorage.setItem = () => {
    throw new Error("Storage full");
  };
  assert.throws(() => demo.save(original), /Storage full/);
  localStorage.setItem = write;
  assert.equal(demo.load().briefs.length, count);
});
test("delete removes history with the brief and other briefs remain", () => {
  const valid = data();
  const id = demo.save(valid);
  demo.save({ ...valid, title: "Changed title" }, id, 1);
  demo.remove(id);
  assert.equal(
    demo.load().briefs.some((b) => b.id === id),
    false,
  );
  assert.equal(demo.load().briefs.length, 1);
});
test("shared request and response contracts reject invalid data and accept database timestamps", () => {
  assert.equal(
    requestSchema.safeParse({ action: "role", memberId: member, role: "owner" })
      .success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ action: "save", data: { ...data(), budget: 0 } })
      .success,
    false,
  );
  const workspace = demo.load();
  workspace.briefs[0].updatedAt = "2026-11-04T09:00:00+00:00";
  workspace.briefs[0].history[0].createdAt = "2026-11-04T09:00:00.123456+00:00";
  assert.equal(workspaceSchema.safeParse(workspace).success, true);
});

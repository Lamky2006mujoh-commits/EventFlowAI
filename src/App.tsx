import PlanningPanel from "./components/PlanningPanel";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  briefDataSchema,
  readiness,
  type Brief,
  type BriefData,
  type Workspace,
} from "../supabase/functions/_shared/contracts";
import { api, liveMode, SessionExpiredError } from "./lib/api";
import AuthScreen from "./components/AuthScreen";
import MemberForm from "./components/MemberForm";
import SignupRequests from "./components/SignupRequests";
import type { SignupQueue } from "../supabase/functions/_shared/contracts";
import VersionChanges from "./components/VersionChanges";
import "./App.css";

type Page = "overview" | "briefs" | "members" | "form" | "detail" | "guide";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
const date = (s: string) =>
  new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const timestamp = (s: string) =>
  new Date(s).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    year: "numeric",
  });
const initials = (s: string) =>
  s
    .split(" ")
    .slice(-2)
    .map((n) => n[0])
    .join("");
const blank: BriefData = {
  title: "",
  client: "",
  eventType: "Conference",
  date: "",
  venue: "",
  attendees: 100,
  budget: 50000000,
  objectives: "",
  audience: "",
  constraints: "",
};

function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`button ${secondary ? "secondary" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Field({
  label,
  error,
  children,
  optional,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}{" "}
        {optional ? (
          <small>Optional</small>
        ) : (
          <span className="required">*</span>
        )}
      </span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
function Status({ brief }: { brief: Brief }) {
  return (
    <span
      className={`badge ${readiness(brief.data).length ? "amber" : "green"}`}
    >
      {readiness(brief.data).length ? "Needs details" : "Ready for planning"}
    </span>
  );
}
function BriefForm({
  brief,
  onSave,
  onCancel,
  busy,
  onDirtyChange,
}: {
  brief?: Brief;
  onSave: (data: BriefData) => void;
  onCancel: () => void;
  busy: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [data, setData] = useState<BriefData>(brief?.data ?? blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(data) !== JSON.stringify(brief?.data ?? blank);
  useEffect(() => {
    onDirtyChange(dirty);
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (dirty) window.addEventListener("beforeunload", warn);
    return () => {
      onDirtyChange(false);
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty, onDirtyChange]);
  function update<K extends keyof BriefData>(key: K, value: BriefData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    const result = briefDataSchema.safeParse(data);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    setErrors({});
    onSave(result.data);
  }
  return (
    <form onSubmit={submit} className="editor-layout" noValidate>
      <div className="panel editor-panel">
        <div className="section-heading">
          <span className="step-number">01</span>
          <div>
            <h3>The essentials</h3>
            <p>Give your event a name and a place to begin.</p>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Event name" error={errors.title}>
            <input
              disabled={busy}
              value={data.title}
              maxLength={160}
              placeholder="e.g. Nova product launch 2026"
              onChange={(e) => update("title", e.target.value)}
              aria-invalid={Boolean(errors.title)}
            />
          </Field>
          <Field label="Client / organization" error={errors.client}>
            <input
              disabled={busy}
              value={data.client}
              maxLength={160}
              placeholder="Who are we creating this for?"
              onChange={(e) => update("client", e.target.value)}
            />
          </Field>
          <Field label="Event type" error={errors.eventType}>
            <select
              disabled={busy}
              value={data.eventType}
              onChange={(e) =>
                update("eventType", e.target.value as BriefData["eventType"])
              }
            >
              {briefDataSchema.shape.eventType.options.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Event date" error={errors.date}>
            <input
              disabled={busy}
              type="date"
              value={data.date}
              onInput={(e) => update("date", e.currentTarget.value)}
              onChange={(e) => update("date", e.target.value)}
            />
          </Field>
          <Field label="Venue / proposed location" error={errors.venue}>
            <input
              disabled={busy}
              value={data.venue}
              maxLength={300}
              placeholder="City, region or country — e.g. TP.HCM or Việt Nam"
              onChange={(e) => update("venue", e.target.value)}
            />
          </Field>
          <Field label="Expected attendees" error={errors.attendees}>
            <input
              disabled={busy}
              type="number"
              min="1"
              max="100000"
              step="1"
              value={Number.isNaN(data.attendees) ? "" : data.attendees}
              onChange={(e) => update("attendees", e.target.valueAsNumber)}
            />
          </Field>
          <Field label="Client budget (VND)" error={errors.budget}>
            <input
              disabled={busy}
              type="number"
              min="1"
              max="1000000000000"
              value={Number.isNaN(data.budget) ? "" : data.budget}
              onChange={(e) => update("budget", e.target.valueAsNumber)}
            />
          </Field>
        </div>
        <div className="section-heading second">
          <span className="step-number">02</span>
          <div>
            <h3>The bigger picture</h3>
            <p>Help your team understand what success looks like.</p>
          </div>
        </div>
        <Field label="Event objectives" error={errors.objectives}>
          <textarea
            disabled={busy}
            rows={4}
            value={data.objectives}
            maxLength={5000}
            placeholder="What should this event achieve?"
            onChange={(e) => update("objectives", e.target.value)}
          />
        </Field>
        <Field label="Audience profile" optional error={errors.audience}>
          <textarea
            disabled={busy}
            rows={3}
            value={data.audience}
            maxLength={2000}
            placeholder="Who is attending? Interests, expectations, accessibility needs…"
            onChange={(e) => update("audience", e.target.value)}
          />
        </Field>
        <Field label="Planning constraints" optional error={errors.constraints}>
          <textarea
            disabled={busy}
            rows={3}
            value={data.constraints}
            maxLength={5000}
            placeholder="Venue access, dietary requirements, technical limits, things to avoid…"
            onChange={(e) => update("constraints", e.target.value)}
          />
        </Field>
        {Object.keys(errors).length > 0 && (
          <p className="error" role="alert">
            Please check the highlighted fields before saving.
          </p>
        )}
        <div className="form-actions">
          <Button secondary onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Check size={16} />
            )}
            {brief ? `Save version ${brief.version + 1}` : "Create brief"}
          </Button>
        </div>
      </div>
      <aside className="editor-aside">
        <div className="tip-card">
          <Sparkles size={24} />
          <h3>A good brief opens doors.</h3>
          <p>
            Start with what you know. You can add detail as the conversation
            develops.
          </p>
          <ul>
            <li>
              <Check size={15} />
              Required fields keep plans grounded
            </li>
            <li>
              <Check size={15} />
              Every edit keeps the previous version
            </li>
            <li>
              <Check size={15} />
              Optional details improve readiness
            </li>
          </ul>
        </div>
        {brief && (
          <div className="panel small-panel">
            <History size={20} />
            <h4>You’re editing version {brief.version}</h4>
            <p>
              Saving creates a new version with your name and timestamp.
              Previous versions stay available. Any dependent planning outputs
              will need review.
            </p>
          </div>
        )}
        <div className="small-note">
          <ShieldCheck size={17} />
          Visible to your agency workspace
        </div>
      </aside>
    </form>
  );
}

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [signupState, setSignupState] = useState<{
    userId: string;
    data: SignupQueue;
  } | null>(null);
  const [signupError, setSignupError] = useState("");
  const [signupRevision, setSignupRevision] = useState(0);
  const signupQueue =
    signupState && signupState.userId === workspace?.session.id
      ? signupState.data
      : null;
  useEffect(() => {
    const userId = workspace?.session.id;
    if (!liveMode || !userId || workspace?.session.role !== "admin") return;
    let active = true,
      inFlight = false;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await api.signupQueue();
        if (active) {
          setSignupState({ userId, data });
          setSignupError("");
        }
      } catch (e) {
        if (active) {
          setSignupError(
            e instanceof Error ? e.message : "Could not load signup requests.",
          );
          if (e instanceof SessionExpiredError) {
            setWorkspace(null);
            setSignupState(null);
            setSignupError("");
          }
        }
      } finally {
        inFlight = false;
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    const focus = () => void load();
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [workspace?.session.id, workspace?.session.role, signupRevision]);
  const [page, setPage] = useState<Page>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [version, setVersion] = useState<number | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [planningDirty, setPlanningDirty] = useState(false);
  const [briefDirty, setBriefDirty] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const unsubscribe = api.onSessionEnd(() => {
      if (active) {
        setWorkspace(null);
        setSignupState(null);
        setSignupError("");
        setSelectedId(null);
        setPage("overview");
        setNotice("");
      }
    });
    void (async () => {
      try {
        const restored = await api.restore();
        if (active) {
          setWorkspace(restored);
          setBusy(false);
        }
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not restore your session. Please sign in again.",
          );
          setBusy(false);
        }
      }
    })();
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        setWorkspace(null);
        setSignupState(null);
        setSignupError("");
        setSelectedId(null);
        setPage("overview");
      }
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function confirmDiscard() {
    return (
      !(planningDirty || briefDirty) ||
      window.confirm(
        `Discard unsaved ${briefDirty ? "brief" : "proposal"} edits? Saved versions will remain available.`,
      )
    );
  }
  function navigate(next: Page, id: string | null = null) {
    if (busy || !confirmDiscard()) return;
    setPage(next);
    setSelectedId(id);
    setVersion(null);
    setError("");
    setNotice("");
    setDeletePending(false);
    setDeleteText("");
    setQuery("");
    setFilter("all");
  }
  if (!workspace)
    return (
      <AuthScreen
        busy={busy}
        error={error}
        notice={notice}
        onRegister={async (name, email, password, agencyCode) => {
          let registered = false;
          await run(async () => {
            await api.register(name, email, password, agencyCode);
            registered = true;
            setNotice(
              "If your registration was accepted, your agency administrator will see your pending request. Confirm your email and wait for approval before signing in.",
            );
          });
          return registered;
        }}
        onLogin={(email, password, persona) => {
          void run(async () => {
            setSignupState(null);
            setSignupError("");
            setWorkspace(await api.login(email, password, persona));
            setPage("overview");
          });
        }}
      />
    );
  const { session, briefs, members } = workspace;
  const selected = briefs.find((b) => b.id === selectedId);
  const readyCount = briefs.filter(
    (b) => readiness(b.data).length === 0,
  ).length;
  const filtered = briefs.filter(
    (b) =>
      `${b.data.title} ${b.data.client}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "ready"
          ? readiness(b.data).length === 0
          : readiness(b.data).length > 0)),
  );
  const ordered = [...filtered].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const viewing = selected?.history.find((v) => v.version === version);
  const details = viewing?.data ?? selected?.data;
  const titles: Record<Page, string> = {
    overview: "Workspace overview",
    briefs: "Client briefs",
    members: "Agency members",
    form: selected ? "Edit client brief" : "Create a client brief",
    detail: "Brief details",
    guide: "Your workspace guide",
  };
  function openBrief(id: string) {
    navigate("detail", id);
  }
  async function refresh() {
    setWorkspace(await api.load());
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-icon">
            <Leaf size={22} />
          </span>
          eventflow<span className="brand-ai">AI</span>
        </a>
        <div className="agency-card">
          <span className="agency-icon">
            <Building2 size={19} />
          </span>
          <div>
            <strong>{session.agencyName}</strong>
            <span>Agency workspace</span>
          </div>
          <ShieldCheck size={15} />
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "briefs", label: "Client briefs", icon: FileText },
              { id: "members", label: "Members & roles", icon: Users },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              disabled={busy}
              className={`nav-item ${page === item.id || (item.id === "briefs" && ["form", "detail"].includes(page)) ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={18} />
              {item.label}
              {item.id === "members" &&
                session.role === "admin" &&
                !!signupQueue?.pendingCount && (
                  <span
                    className="nav-count"
                    aria-label="Pending signup requests"
                  >
                    {signupQueue.pendingCount}
                  </span>
                )}
              {item.id === "briefs" && (
                <span className="nav-count">{briefs.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Sparkles size={19} />
          <h4>From brief to possibility.</h4>
          <p>A clear starting point for your team’s next big idea.</p>
          <button disabled={busy} onClick={() => navigate("guide")}>
            Explore the demo <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === "guide" ? "active" : ""}`}
            disabled={busy}
            onClick={() => navigate("guide")}
          >
            <CircleHelp size={18} />
            Demo guide
          </button>
          <div className="profile">
            <span className="avatar">{initials(session.name)}</span>
            <div>
              <strong>{session.name}</strong>
              <span>
                {session.role === "admin" ? "Administrator" : "Agency member"}
              </span>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              title="Sign out"
              disabled={busy}
              onClick={() => {
                if (!confirmDiscard()) return;
                void run(async () => {
                  await api.logout();
                  setWorkspace(null);
                  setSignupState(null);
                  setSignupError("");
                  setPage("overview");
                });
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={14} />
            <span>{titles[page]}</span>
          </div>
          <button
            className="icon-button"
            aria-label="Refresh workspace"
            title="Refresh workspace"
            disabled={busy || briefDirty || planningDirty}
            onClick={() => {
              void run(refresh);
            }}
          >
            <RefreshCw size={17} />
          </button>
          <span className={`mode-label ${liveMode ? "live" : ""}`}>
            <span />
            {liveMode ? "Supabase configured" : "Local demo"}
          </span>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {page === "overview"
                  ? "LET’S MAKE SOMETHING MEMORABLE"
                  : session.agencyName.toUpperCase()}
              </span>
              <h1>
                {page === "overview"
                  ? "A little clarity. A great beginning."
                  : titles[page]}
              </h1>
              <p>
                {page === "overview"
                  ? "Your next great event starts with the details. Bring them all together here."
                  : page === "briefs"
                    ? "One home for your clients’ ideas, objectives, and expectations."
                    : page === "members"
                      ? "The people behind the plans. Keep access simple and intentional."
                      : page === "form"
                        ? "Capture the essentials. Leave room for the extraordinary."
                        : page === "detail"
                          ? "Everything your team needs to understand the event."
                          : "A small, focused workflow you can present from start to finish."}
              </p>
            </div>
            {(page === "overview" || page === "briefs") && (
              <Button disabled={busy} onClick={() => navigate("form")}>
                <Plus size={17} />
                New brief
              </Button>
            )}
            {(page === "detail" || page === "form") && (
              <Button
                secondary
                disabled={busy}
                onClick={() => navigate("briefs")}
              >
                <ArrowLeft size={16} />
                All briefs
              </Button>
            )}
          </div>
          {!liveMode && (
            <div className="demo-strip">
              <span>
                <span className="status-dot" />
                Demo workspace · browser storage · simulated permissions
              </span>
              <button onClick={() => navigate("guide")} disabled={busy}>
                How it works <ArrowUpRight size={13} />
              </button>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <button
                aria-label="Dismiss error"
                className="icon-button"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="success" role="status">
              <CheckCircle2 size={18} />
              {notice}
            </div>
          )}
          {liveMode &&
            session.role === "admin" &&
            !!signupQueue?.pendingCount &&
            page !== "members" && (
              <div className="signup-notification" role="status">
                <span>
                  {signupQueue.pendingCount} new signup request
                  {signupQueue.pendingCount === 1 ? "" : "s"} awaiting review.
                </span>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => navigate("members")}
                >
                  Review signup requests
                </button>
              </div>
            )}
          {liveMode &&
            session.role === "admin" &&
            signupError &&
            page !== "members" &&
            page !== "overview" && (
              <p className="error" role="alert">
                Signup notifications unavailable: {signupError}
              </p>
            )}
          {page === "overview" && (
            <>
              {liveMode && session.role === "admin" && (
                <section
                  className="panel signup-review"
                  aria-label="Pending signup applicants"
                >
                  <div className="planning-heading">
                    <div>
                      <h3>Pending signup applicants</h3>
                      <p>
                        People requesting to join your agency. No email search
                        required.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => navigate("members")}
                    >
                      Review all signup requests
                    </button>
                  </div>
                  {signupError ? (
                    <p className="error" role="alert">
                      Could not load applicants: {signupError}
                    </p>
                  ) : !signupQueue ? (
                    <p role="status">Loading applicants…</p>
                  ) : (
                    <>
                      <p>
                        {signupQueue.pendingCount} pending signup request
                        {signupQueue.pendingCount === 1 ? "" : "s"}
                      </p>
                      {!signupQueue.pendingCount && (
                        <p className="muted">
                          No one is waiting to join this agency. Share your
                          agency registration code from Members &amp; roles with
                          new applicants.
                        </p>
                      )}
                      <ul
                        className="signup-pending-list"
                        aria-label="Pending applicants"
                      >
                        {signupQueue.requests
                          .filter((request) => request.status === "pending")
                          .slice(0, 5)
                          .map((request) => (
                            <li className="signup-request" key={request.id}>
                              <div>
                                <strong>{request.name}</strong>
                                <p>{request.email}</p>
                                <p className="muted">
                                  Requested{" "}
                                  {new Date(request.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <span
                                className={
                                  "badge " +
                                  (request.emailConfirmed ? "green" : "amber")
                                }
                              >
                                {request.emailConfirmed
                                  ? "Ready for review"
                                  : "Waiting for email confirmation"}
                              </span>
                            </li>
                          ))}
                      </ul>
                      {signupQueue.pendingCount > 5 && (
                        <p className="muted">
                          Showing the latest 5 applicants. Open review to see
                          more requests.
                        </p>
                      )}
                    </>
                  )}
                </section>
              )}
              <div className="overview-grid">
                <section className="welcome-card">
                  <div>
                    <span className="eyebrow">YOUR IDEAS, TAKING SHAPE</span>
                    <h2>
                      Big moments.
                      <br />
                      <em>Thoughtful beginnings.</em>
                    </h2>
                    <p>
                      Capture a client’s vision, fill in the gaps,
                      <br />
                      and give every event a confident start.
                    </p>
                    <Button onClick={() => navigate("form")} disabled={busy}>
                      Create your next brief <ArrowUpRight size={17} />
                    </Button>
                  </div>
                  <div className="hero-art" aria-hidden="true">
                    <div className="orbit orbit-one" />
                    <div className="orbit orbit-two" />
                    <div className="art-card">
                      <span className="art-card-icon">
                        <CalendarDays size={25} />
                      </span>
                      <span className="art-line" />
                      <span className="art-line short" />
                      <div className="art-check">
                        <Check size={12} />
                        The beginning of something great
                      </div>
                    </div>
                    <span className="art-star">
                      <Sparkles size={29} />
                    </span>
                    <span className="art-dot" />
                  </div>
                </section>
                <section className="panel workspace-summary">
                  <span className="section-kicker">WORKSPACE AT A GLANCE</span>
                  <div>
                    <span className="summary-icon">
                      <FileText size={20} />
                    </span>
                    <span>
                      <strong>{briefs.length}</strong>
                      <small>Total briefs</small>
                    </span>
                  </div>
                  <div>
                    <span className="summary-icon green">
                      <CheckCircle2 size={20} />
                    </span>
                    <span>
                      <strong>{readyCount}</strong>
                      <small>Ready for planning</small>
                    </span>
                  </div>
                  <div>
                    <span className="summary-icon amber">
                      <ClipboardList size={20} />
                    </span>
                    <span>
                      <strong>{briefs.length - readyCount}</strong>
                      <small>Need a few more details</small>
                    </span>
                  </div>
                </section>
              </div>
              <div className="section-title">
                <div>
                  <h2>
                    Recent briefs{" "}
                    <span className="count-pill">{briefs.length}</span>
                  </h2>
                  <p>A starting point for every memorable event.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigate("briefs")}
                >
                  View all briefs <ArrowRight size={15} />
                </button>
              </div>
              <div className="brief-cards">
                {[...briefs]
                  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                  .slice(0, 3)
                  .map((brief, i) => (
                    <button
                      key={brief.id}
                      className="brief-card panel"
                      onClick={() => openBrief(brief.id)}
                    >
                      <div className={`card-cover cover-${i % 3}`}>
                        <span className="cover-pattern" />
                        <span className="card-type">
                          {brief.data.eventType}
                        </span>
                        <ArrowUpRight size={20} />
                      </div>
                      <div className="brief-card-body">
                        <div className="client-label">{brief.data.client}</div>
                        <h3>{brief.data.title}</h3>
                        <p>
                          <CalendarDays size={14} />
                          {date(brief.data.date)}
                          <span>·</span>
                          <Users size={14} />
                          {brief.data.attendees}
                        </p>
                        <div className="brief-card-footer">
                          <Status brief={brief} />
                          <span>v{brief.version}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                <button
                  className="new-brief-card"
                  onClick={() => navigate("form")}
                >
                  <span>
                    <Plus size={24} />
                  </span>
                  <h3>A new possibility</h3>
                  <p>Start with a client brief.</p>
                </button>
              </div>
              <div className="bottom-note">
                <ShieldCheck size={18} />
                <span>
                  <strong>A shared space, a clear record.</strong> Briefs belong
                  to your agency, and every saved edit keeps its history.
                </span>
              </div>
            </>
          )}
          {page === "briefs" && (
            <section className="panel list-panel">
              <div className="list-toolbar">
                <div className="search-box">
                  <Search size={17} />
                  <input
                    aria-label="Search briefs"
                    placeholder="Search by event or client…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter briefs by readiness"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All briefs</option>
                  <option value="ready">Ready for planning</option>
                  <option value="missing">Needs details</option>
                </select>
                <span className="muted">
                  {filtered.length} brief{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>EVENT / CLIENT</th>
                      <th>EVENT DATE</th>
                      <th>BUDGET</th>
                      <th>READINESS</th>
                      <th>VERSION</th>
                      <th>
                        <span className="sr-only">Open brief</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.map((brief) => (
                      <tr key={brief.id}>
                        <td>
                          <button
                            className="table-title"
                            onClick={() => openBrief(brief.id)}
                          >
                            {brief.data.title}
                          </button>
                          <span className="table-subtitle">
                            {brief.data.client}
                          </span>
                        </td>
                        <td>{date(brief.data.date)}</td>
                        <td>{money(brief.data.budget)}</td>
                        <td>
                          <Status brief={brief} />
                        </td>
                        <td>
                          <span className="version-tag">v{brief.version}</span>
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Open ${brief.data.title}`}
                            onClick={() => openBrief(brief.id)}
                          >
                            <ArrowUpRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!filtered.length && (
                <div className="empty-state">
                  <Search size={30} />
                  <h3>
                    {briefs.length
                      ? "No matching briefs"
                      : "Your first brief starts here"}
                  </h3>
                  <p>
                    {briefs.length
                      ? "Try a different search or readiness filter."
                      : "Create a brief to capture your client’s vision."}
                  </p>
                </div>
              )}
            </section>
          )}
          {page === "form" && (
            <BriefForm
              key={selected?.id ?? "new"}
              brief={selected}
              busy={busy}
              onDirtyChange={setBriefDirty}
              onCancel={() =>
                navigate(selected ? "detail" : "briefs", selected?.id)
              }
              onSave={(data) => {
                void run(async () => {
                  const id = await api.save(
                    data,
                    selected?.id,
                    selected?.version,
                  );
                  // The write has committed. Leave the form even if the read
                  // below fails, so retrying cannot create a duplicate brief.
                  setSelectedId(null);
                  setPage("briefs");
                  setVersion(null);
                  setNotice(
                    selected
                      ? `Version ${selected.version + 1} saved. Previous versions are preserved.`
                      : `Brief created successfully. ID: ${id}`,
                  );
                  await refresh();
                  setSelectedId(id);
                  setPage("detail");
                });
              }}
            />
          )}
          {page === "detail" && selected && details && (
            <div className="detail-layout">
              <section className="panel brief-detail">
                <div className="detail-title">
                  <div>
                    <span className="client-label">{details.client}</span>
                    <h2>{details.title}</h2>
                    <p className="muted brief-id">Brief ID: {selected.id}</p>
                  </div>
                  <span className="version-tag">
                    v{viewing?.version ?? selected.version}
                    {viewing && viewing.version !== selected.version
                      ? " · Historical"
                      : " · Current"}
                  </span>
                </div>
                <div className="detail-meta">
                  <div>
                    <CalendarDays size={18} />
                    <span>
                      EVENT DATE<strong>{date(details.date)}</strong>
                    </span>
                  </div>
                  <div>
                    <Users size={18} />
                    <span>
                      ATTENDEES
                      <strong>{details.attendees.toLocaleString()}</strong>
                    </span>
                  </div>
                  <div>
                    <Building2 size={18} />
                    <span>
                      CLIENT BUDGET<strong>{money(details.budget)}</strong>
                    </span>
                  </div>
                  <div>
                    <MapPin size={18} />
                    <span>
                      VENUE<strong>{details.venue}</strong>
                    </span>
                  </div>
                </div>
                <span className="badge neutral">{details.eventType}</span>
                {(["objectives", "audience", "constraints"] as const).map(
                  (field) => (
                    <div className="detail-section" key={field}>
                      <h3>
                        {
                          {
                            objectives: "Event objectives",
                            audience: "Audience profile",
                            constraints: "Planning constraints",
                          }[field]
                        }
                      </h3>
                      <p className={!details[field] ? "muted" : ""}>
                        {details[field] || "Not provided yet."}
                      </p>
                    </div>
                  ),
                )}
                {selected.needsReview && (
                  <div className="review-note">
                    <History size={18} />
                    <p>
                      <strong>Planning outputs need review.</strong>The brief
                      has changed since its first version. Any dependent
                      concepts or proposals must be checked against the latest
                      brief. Generate new concepts from the latest saved
                      version.
                    </p>
                  </div>
                )}
                {!viewing && (
                  <PlanningPanel
                    key={selected.id + ":" + selected.version}
                    brief={selected}
                    onDirtyChange={setPlanningDirty}
                    onSessionError={(e) => {
                      void run(async () => {
                        throw e;
                      });
                    }}
                  />
                )}
                <VersionChanges
                  brief={selected}
                  version={viewing?.version ?? selected.version}
                />
                <div className="detail-footer">
                  <span className="muted">
                    Saved by {viewing?.author ?? selected.author} ·{" "}
                    {timestamp(viewing?.createdAt ?? selected.updatedAt)}
                  </span>
                  <Button
                    secondary
                    disabled={busy}
                    onClick={() => navigate("form", selected.id)}
                  >
                    <Pencil size={15} />
                    Edit current brief
                  </Button>
                </div>
                {session.role === "admin" && (
                  <div className="delete-area">
                    {deletePending ? (
                      <>
                        <p>
                          Delete this brief and all {selected.history.length}{" "}
                          saved versions? Type <strong>DELETE</strong> to
                          confirm.
                        </p>
                        <label
                          className="sr-only"
                          htmlFor="delete-confirmation"
                        >
                          Type DELETE to confirm deletion
                        </label>
                        <input
                          id="delete-confirmation"
                          value={deleteText}
                          onChange={(e) => setDeleteText(e.target.value)}
                          placeholder="DELETE"
                        />
                        <button
                          className="danger-button"
                          disabled={busy || deleteText !== "DELETE"}
                          onClick={() => {
                            void run(async () => {
                              await api.remove(selected.id);
                              await refresh();
                              setPage("briefs");
                              setSelectedId(null);
                              setDeletePending(false);
                              setDeleteText("");
                              setNotice("Brief and version history deleted.");
                            });
                          }}
                        >
                          Delete permanently
                        </button>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => {
                            setDeletePending(false);
                            setDeleteText("");
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="text-button muted"
                        disabled={busy}
                        onClick={() => setDeletePending(true)}
                      >
                        <Trash2 size={14} />
                        Delete brief
                      </button>
                    )}
                  </div>
                )}
              </section>
              <aside>
                <div className="panel readiness-panel">
                  <h3>
                    <Sparkles size={17} />
                    Brief readiness
                  </h3>
                  <Status brief={selected} />
                  <p className="muted">
                    {readiness(selected.data).length
                      ? "The essentials are saved. A few details can make planning clearer."
                      : "All planning fields are filled. This checks completeness, not event feasibility."}
                  </p>
                  {readiness(selected.data).map((item) => (
                    <div className="readiness-item" key={item.field}>
                      <span className="amber-dot" />
                      <div>
                        <strong>{item.field}</strong>
                        <p>
                          <span>Suggested clarification</span>
                          {item.suggestion}
                        </p>
                      </div>
                    </div>
                  ))}
                  <p className="small-note">
                    Checks use the current version, even while viewing history.
                  </p>
                </div>
                <div className="panel history-panel">
                  <h3>
                    <History size={17} />
                    Version history
                  </h3>
                  <p className="muted">Every saved version, kept intact.</p>
                  {[...selected.history].reverse().map((v) => (
                    <button
                      key={v.version}
                      className={`history-row ${(version ?? selected.version) === v.version ? "selected" : ""}`}
                      disabled={busy}
                      onClick={() => {
                        if (confirmDiscard())
                          setVersion(
                            v.version === selected.version ? null : v.version,
                          );
                      }}
                    >
                      <span className="history-dot" />
                      <span>
                        <strong>
                          Version {v.version}{" "}
                          {v.version === selected.version && (
                            <small>Current</small>
                          )}
                        </strong>
                        <span>{v.author}</span>
                        <small>{timestamp(v.createdAt)}</small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
              </aside>
            </div>
          )}
          {page === "members" && (
            <>
              <div className="panel members-intro">
                <ShieldCheck size={24} />
                <div>
                  <h3>One agency. The right access.</h3>
                  <p>
                    {session.role === "admin"
                      ? "Administrators can change member roles. Keep at least one administrator in the workspace."
                      : "You can view your team. Only agency administrators can change roles."}
                  </p>
                </div>
              </div>
              {session.role === "admin" && liveMode && (
                <SignupRequests
                  queue={signupError ? null : signupQueue}
                  error={signupError}
                  busy={busy}
                  onReload={() => setSignupRevision((v) => v + 1)}
                  onReview={async (id, decision) => {
                    let saved = false;
                    await run(async () => {
                      await api.reviewSignup(id, decision);
                      saved = true;
                      setSignupRevision((v) => v + 1);
                      setNotice(
                        decision === "approve"
                          ? "Signup approved. Member access saved."
                          : "Signup rejected. Decision saved.",
                      );
                      await refresh();
                    });
                    return saved;
                  }}
                />
              )}
              {session.role === "admin" && liveMode && (
                <MemberForm
                  busy={busy}
                  onAdd={async (email, name) => {
                    let saved = false;
                    await run(async () => {
                      await api.addMember(email, name, "member");
                      saved = true;
                      setNotice(
                        `${name} was added to your agency as a member.`,
                      );
                      await refresh();
                    });
                    return saved;
                  }}
                />
              )}
              <section className="panel table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>TEAM MEMBER</th>
                      <th>AGENCY</th>
                      <th>ROLE</th>
                      {session.role === "admin" && liveMode && <th>ACCESS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <div className="member-name">
                            <span className="avatar">
                              {initials(member.name)}
                            </span>
                            <strong>
                              {member.name}{" "}
                              {member.id === session.id && (
                                <span className="muted">(you)</span>
                              )}
                            </strong>
                          </div>
                        </td>
                        <td>{session.agencyName}</td>
                        <td>
                          <select
                            aria-label={`Role for ${member.name}`}
                            value={member.role}
                            disabled={session.role !== "admin" || busy}
                            onChange={(e) => {
                              const role = e.target.value as "admin" | "member";
                              void run(async () => {
                                await api.changeRole(member.id, role);
                                await refresh();
                                setNotice(
                                  `${member.name} is now an ${role === "admin" ? "administrator" : "agency member"}.`,
                                );
                              });
                            }}
                          >
                            <option value="admin">Administrator</option>
                            <option value="member">Member</option>
                          </select>
                        </td>
                        {session.role === "admin" && liveMode && (
                          <td>
                            {removeMemberId === member.id ? (
                              <div className="member-remove">
                                <span>Remove agency access?</span>
                                <button
                                  className="danger-button"
                                  disabled={busy}
                                  onClick={() => {
                                    void run(async () => {
                                      await api.removeMember(member.id);
                                      setRemoveMemberId(null);
                                      await refresh();
                                      setNotice(
                                        `${member.name} no longer has access to this agency.`,
                                      );
                                    });
                                  }}
                                >
                                  Confirm removal
                                </button>
                                <button
                                  className="text-button"
                                  onClick={() => setRemoveMemberId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                className="text-button"
                                disabled={busy || member.id === session.id}
                                onClick={() => setRemoveMemberId(member.id)}
                                aria-label={`Remove ${member.name}`}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <div className="bottom-note">
                <Users size={18} />
                <span>
                  Members create and edit briefs. Administrators also manage
                  roles.{" "}
                  {liveMode
                    ? "Access is enforced by the backend."
                    : "Demo permissions are simulated in this browser."}
                </span>
              </div>
            </>
          )}
          {page === "guide" && (
            <section className="panel guide">
              <span className="badge neutral">
                SPRINT 3 · CONCEPT & PROPOSAL
              </span>
              <h2>From a saved brief to an editable proposal.</h2>
              <p>
                Review the brief workflow, compare concepts, then create and
                edit a proposal. Every saved proposal version remains available.
              </p>
              <ol>
                <li>
                  <strong>Sign in to your agency.</strong> Use your registered
                  email and password. Your agency membership determines whether
                  you are an administrator or team member.
                </li>
                <li>
                  <strong>Create a client brief.</strong> Enter event details
                  and a positive budget. Save to see the generated brief ID.
                </li>
                <li>
                  <strong>Edit the brief.</strong> Change the budget or
                  objectives. Save a new version and open the previous version
                  in history.
                </li>
                <li>
                  <strong>Check readiness.</strong> Leave audience or
                  constraints empty to see suggested clarifications. Fill them
                  to make the brief ready for planning.
                </li>
                <li>
                  <strong>Create a proposal.</strong> Open the latest saved
                  brief, generate concepts, compare their themes and
                  assumptions, select one, then generate and edit a proposal.
                  Save a new version or export the latest saved content.
                  Regeneration requires confirmation.
                </li>
                <li>
                  <strong>Check member permissions.</strong> Try role controls
                  as an administrator, then sign in as a member.
                </li>
                <li>
                  <strong>Verify agency protection.</strong> Sign out and use a
                  test account belonging to a different agency. Its workspace
                  must contain only its own briefs.
                </li>
              </ol>
              <div className="review-note">
                <ShieldCheck size={22} />
                <p>
                  <strong>
                    {liveMode ? "Supabase mode" : "About local demo mode"}
                  </strong>
                  {liveMode
                    ? "Real accounts use Supabase Auth. Database policies protect each agency’s briefs and history. Membership changes take effect on subsequent server requests."
                    : "Browser storage provides no real authentication or security boundary. Use sample data only. Supabase Auth, agency policies, and a validated backend are included for optional setup."}
                </p>
              </div>
              <Button onClick={() => navigate("briefs")}>
                Open client briefs <ArrowRight size={16} />
              </Button>
            </section>
          )}
          <footer className="page-footer">
            <span>Thoughtfully planned. Beautifully brought together.</span>
            <span>EventFlow AI · Sprint 03</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { api, liveMode, SessionExpiredError } from "../lib/api";
import {
  planningSchema,
  proposalDataSchema,
  proposalText,
  type Planning,
  type PlanningRequest,
  type ProposalData,
} from "../../supabase/functions/_shared/planning";
import type { Brief } from "../../supabase/functions/_shared/contracts";
const labels: Record<keyof ProposalData, string> = {
  title: "Proposal title",
  objectives: "Objectives",
  audience: "Audience",
  theme: "Theme",
  agenda: "Agenda",
  assumptions: "Preliminary assumptions",
};
export default function PlanningPanel({
  brief,
  onSessionError,
  onDirtyChange,
}: {
  brief: Brief;
  onSessionError: (error: Error) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [state, setState] = useState<Planning | null>(null);
  const [draft, setDraft] = useState<ProposalData | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<{
    message: string;
    action: () => void;
  } | null>(null);
  const [snapshot, setSnapshot] = useState<number | null>(null);
  const mounted = useRef(false);
  const dirty =
    !!draft && JSON.stringify(draft) !== JSON.stringify(state?.proposal?.data);
  const stale = !!state && state.briefVersion !== brief.version;
  const currentProposal =
    !!state?.proposal &&
    state.proposal.briefVersion === brief.version &&
    state.proposal.conceptId === state.selectedId &&
    !stale;
  useEffect(() => {
    onDirtyChange(dirty);
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (dirty) window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      onDirtyChange(false);
    };
  }, [dirty, onDirtyChange]);
  const reportSessionError = useEffectEvent(onSessionError);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    api
      .planning({ action: "load", briefId: brief.id })
      .then((s) => {
        if (active) {
          setState(s);
          setDraft(s.proposal?.data ?? null);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          if (e instanceof SessionExpiredError) reportSessionError(e);
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [brief.id, brief.version]); // Reload only when the saved source brief changes.
  async function execute(input: PlanningRequest) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const s = planningSchema.parse(await api.planning(input));
      if (mounted.current) {
        setState(s);
        setDraft(s.proposal?.data ?? null);
        setSnapshot(null);
        setNotice(
          input.action === "load"
            ? "Planning reloaded."
            : "Saved successfully.",
        );
      }
    } catch (e) {
      if (mounted.current) {
        setError(
          e instanceof Error ? e.message : "Request failed. Please retry.",
        );
        if (e instanceof SessionExpiredError) onSessionError(e);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function ask(message: string, action: () => void) {
    setConfirmation({ message, action });
  }
  function act(
    action: "generateConcepts" | "generateProposal" | "select",
    conceptId?: string,
  ) {
    if (!state) return;
    const input = {
      action,
      briefId: brief.id,
      briefVersion: brief.version,
      expectedRevision: state.revision,
      ...(action === "select" ? { conceptId: conceptId! } : { confirm: true }),
    } as PlanningRequest;
    const go = () => void execute(input);
    if (
      dirty ||
      (action === "generateConcepts" && state.concepts.length) ||
      (action === "generateProposal" && state.proposal)
    )
      ask(
        "Continue? Unsaved edits will be discarded. Regeneration replaces current content and preserves previously saved proposal versions.",
        go,
      );
    else go();
  }
  async function exportSaved() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const latest = await api.planning({ action: "load", briefId: brief.id });
      if (!mounted.current) return;
      if (!latest.proposal)
        throw new Error("Save a proposal before exporting.");
      const blob = new Blob([proposalText(latest.proposal)], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "proposal-v" + latest.proposal.version + ".txt";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Exported latest saved proposal v" +
          latest.proposal.version +
          ". Unsaved edits are excluded.",
      );
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : "Export failed.");
        if (e instanceof SessionExpiredError) onSessionError(e);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const viewed = state?.history.find((p) => p.version === snapshot);
  return (
    <section
      className="planning-panel panel"
      aria-labelledby="planning-title"
      aria-busy={busy}
    >
      <div className="planning-heading">
        <div>
          <span className="eyebrow">SPRINT 3 · AI CONCEPT & PROPOSAL</span>
          <h3 id="planning-title">Turn your brief into a proposal</h3>
          <p>
            Using saved brief version {brief.version}. AI suggestions need human
            review.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            dirty
              ? ask(
                  "Reload and discard unsaved edits?",
                  () => void execute({ action: "load", briefId: brief.id }),
                )
              : void execute({ action: "load", briefId: brief.id })
          }
        >
          Reload planning
        </button>
      </div>
      {!liveMode && (
        <p className="review-note">
          Demo mode: sample templates are used. No Gemini request is made.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error} You can retry the action or reload planning.
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {busy && (
        <p role="status">Working… AI generation may take up to two minutes.</p>
      )}
      {confirmation && (
        <div
          className="planning-confirm"
          role="alertdialog"
          aria-modal="false"
          aria-label="Confirm replacement"
        >
          <p>{confirmation.message}</p>
          <button
            className="button"
            onClick={() => {
              const fn = confirmation.action;
              setConfirmation(null);
              fn();
            }}
          >
            Confirm replacement
          </button>
          <button
            className="button secondary"
            onClick={() => setConfirmation(null)}
          >
            Cancel
          </button>
        </div>
      )}
      {stale && (
        <p className="review-note">
          The brief changed. These concepts and the saved proposal need review.
          Generate new concepts to continue.
        </p>
      )}
      <button
        className="button"
        disabled={busy || !state || !!confirmation}
        onClick={() => act("generateConcepts")}
      >
        {state?.concepts.length ? "Regenerate concepts" : "Generate concepts"}
      </button>
      <div className="concept-grid" data-count={state?.concepts.length ?? 0}>
        {state?.concepts.map((c) => (
          <article
            key={c.id}
            className={
              "concept-card " + (state.selectedId === c.id ? "selected" : "")
            }
          >
            <span className="badge neutral">
              {state.selectedId === c.id ? "Selected concept" : "Concept"}
            </span>
            <h4>{c.title}</h4>
            <p>{c.theme}</p>
            <h5>Activities</h5>
            <ul>
              {c.activities.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <h5>Assumptions · to confirm</h5>
            <ul>
              {c.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <button
              className="button secondary"
              disabled={
                busy || stale || state.selectedId === c.id || !!confirmation
              }
              onClick={() => act("select", c.id)}
            >
              {state.selectedId === c.id ? "Selected" : "Select concept"}
            </button>
          </article>
        ))}
      </div>
      {!!state?.concepts.length && (
        <button
          className="button"
          disabled={busy || !state.selectedId || stale || !!confirmation}
          onClick={() => act("generateProposal")}
        >
          {state.proposal ? "Regenerate proposal" : "Generate proposal"}
        </button>
      )}
      {state?.proposal && draft && (
        <div className="proposal-editor">
          <div className="planning-heading">
            <h3>
              Proposal · v{state.proposal.version} · {state.proposal.status}
            </h3>
            <span>
              {dirty ? "Unsaved edits" : "Saved"} · {state.proposal.author}
            </span>
          </div>
          {!currentProposal && (
            <p className="review-note">
              Saved proposal belongs to an earlier brief or concept. Generate a
              current proposal to edit. Export includes the saved source
              version.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = proposalDataSchema.safeParse(draft);
              if (!parsed.success) {
                setError(
                  "Complete all proposal sections (maximum 5000 characters each).",
                );
                return;
              }
              void execute({
                action: "saveProposal",
                briefId: brief.id,
                briefVersion: brief.version,
                expectedRevision: state.revision,
                data: parsed.data,
              });
            }}
          >
            {Object.entries(labels).map(([key, label]) => (
              <label className="field" key={key}>
                <span>{label}</span>
                <textarea
                  rows={key === "title" ? 2 : 4}
                  maxLength={5000}
                  required
                  disabled={busy || !currentProposal || !!confirmation}
                  value={draft[key as keyof ProposalData]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <div className="form-actions">
              <button
                className="button"
                disabled={busy || !dirty || !currentProposal || !!confirmation}
              >
                Save new proposal version
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busy || !!confirmation}
                onClick={() => void exportSaved()}
              >
                Export latest saved (.txt)
              </button>
            </div>
          </form>
          <label className="field">
            <span>Saved version history</span>
            <select
              value={snapshot ?? ""}
              onChange={(e) =>
                setSnapshot(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Choose a saved version to inspect</option>
              {[...state.history].reverse().map((p) => (
                <option key={p.version} value={p.version}>
                  v{p.version} · {p.author} ·{" "}
                  {new Date(p.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          {viewed && (
            <pre className="proposal-snapshot">{proposalText(viewed)}</pre>
          )}
        </div>
      )}
    </section>
  );
}

import { useState } from "react";
import type { SignupQueue } from "../../supabase/functions/_shared/contracts";

export default function SignupRequests({
  queue,
  error,
  busy,
  onReload,
  onReview,
}: {
  queue: SignupQueue | null;
  error: string;
  busy: boolean;
  onReload: () => void;
  onReview: (id: string, decision: "approve" | "reject") => Promise<boolean>;
}) {
  const [decision, setDecision] = useState<{
    id: string;
    name: string;
    action: "approve" | "reject";
  } | null>(null);
  const pending = queue?.requests.filter((r) => r.status === "pending") ?? [],
    history = queue?.requests.filter((r) => r.status !== "pending") ?? [];
  return (
    <section className="panel signup-review" aria-label="Signup requests">
      <div className="planning-heading">
        <div>
          <h3>Signup requests</h3>
          <p>
            Review new registrations before granting agency access. Approval
            always assigns the Member role.
          </p>
        </div>
        <button className="button secondary" disabled={busy} onClick={onReload}>
          Refresh signup requests
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!queue && !error && <p role="status">Loading signup requests…</p>}
      {queue && (
        <>
          <label className="field">
            <span>Agency registration code</span>
            <input
              aria-label="Agency registration code"
              readOnly
              value={queue.registrationCode}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <p className="muted">
            Share this code with employees who should request access to your
            agency. The code does not grant membership.
          </p>
          <p role="status">
            {queue.pendingCount} pending signup request
            {queue.pendingCount === 1 ? "" : "s"}. Refreshes automatically every
            30 seconds and when you return to this window.
          </p>
          {!pending.length && <p>No pending requests.</p>}
          {pending.map((r) => (
            <article className="signup-request" key={r.id}>
              <div>
                <h4>{r.name}</h4>
                <p>{r.email}</p>
                <p className="muted">
                  Registered {new Date(r.createdAt).toLocaleString()}
                </p>
                <span
                  className={"badge " + (r.emailConfirmed ? "green" : "amber")}
                >
                  {r.emailConfirmed
                    ? "Email confirmed"
                    : "Waiting for email confirmation"}
                </span>
              </div>
              <div className="signup-actions">
                <button
                  className="button"
                  disabled={busy || !r.emailConfirmed || !!decision}
                  onClick={() =>
                    setDecision({ id: r.id, name: r.name, action: "approve" })
                  }
                  aria-label={"Approve " + r.name}
                >
                  Approve as Member
                </button>
                <button
                  className="button secondary"
                  disabled={busy || !!decision}
                  onClick={() =>
                    setDecision({ id: r.id, name: r.name, action: "reject" })
                  }
                  aria-label={"Reject " + r.name}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
          {decision && (
            <div
              className="planning-confirm"
              role="alertdialog"
              aria-label="Confirm signup decision"
            >
              <p>
                {decision.action === "approve"
                  ? "Approve " + decision.name + " and grant Member access?"
                  : "Reject " +
                    decision.name +
                    "? No agency access will be granted."}
              </p>
              <button
                className="button"
                disabled={busy}
                onClick={async () => {
                  if (await onReview(decision.id, decision.action))
                    setDecision(null);
                }}
              >
                Confirm{" "}
                {decision.action === "approve" ? "approval" : "rejection"}
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setDecision(null)}
              >
                Cancel
              </button>
            </div>
          )}
          <details className="signup-history">
            <summary>Signup review history ({history.length})</summary>
            {!history.length && <p>No reviewed requests.</p>}
            {history.map((r) => (
              <article className="signup-request" key={r.id}>
                <div>
                  <strong>{r.name}</strong>
                  <p>{r.email}</p>
                  <p>
                    {r.status === "approved"
                      ? "Approved as Member"
                      : "Rejected"}{" "}
                    by {r.reviewerName} ·{" "}
                    {r.reviewedAt
                      ? new Date(r.reviewedAt).toLocaleString()
                      : ""}
                  </p>
                </div>
              </article>
            ))}
            <p className="muted">
              The latest 100 requests are displayed, with pending requests
              first. Decisions are saved in the database.
            </p>
          </details>
        </>
      )}
    </section>
  );
}

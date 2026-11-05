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
  const [query, setQuery] = useState("");
  const [confirmationFilter, setConfirmationFilter] = useState("all");
  const matches = (r: SignupQueue["requests"][number]) =>
    `${r.name} ${r.email}`.toLowerCase().includes(query.trim().toLowerCase());
  const pending =
      queue?.requests.filter(
        (r) =>
          r.status === "pending" &&
          matches(r) &&
          (confirmationFilter === "all" ||
            r.emailConfirmed === (confirmationFilter === "confirmed")),
      ) ?? [],
    history =
      queue?.requests.filter((r) => r.status !== "pending" && matches(r)) ?? [];
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
          <h4>Pending applicants</h4>
          <p className="muted">
            Names and emails appear below automatically. Searching is optional.
          </p>
          <details className="signup-filters">
            <summary>Search or filter applicants</summary>
            <div className="form-grid">
              <label className="field">
                <span>Search signup requests</span>
                <input
                  type="search"
                  value={query}
                  maxLength={160}
                  placeholder="Name or email"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Filter pending requests</span>
                <select
                  value={confirmationFilter}
                  onChange={(e) => setConfirmationFilter(e.target.value)}
                >
                  <option value="all">All pending requests</option>
                  <option value="confirmed">Email confirmed</option>
                  <option value="unconfirmed">
                    Waiting for email confirmation
                  </option>
                </select>
              </label>
            </div>
            <p className="muted">
              Search applies to the latest 100 loaded requests. The pending
              count includes all requests.
            </p>
          </details>
          {!pending.length && (
            <p>
              {query.trim() || confirmationFilter !== "all"
                ? "No pending requests match your filters."
                : "No pending requests."}
            </p>
          )}
          {!queue.pendingCount &&
            !query.trim() &&
            confirmationFilter === "all" && (
              <p className="muted">
                New registrations using this agency's code appear here,
                including accounts waiting for email confirmation. Accounts
                created before signup requests were enabled do not appear
                automatically; add an existing confirmed account through Members
                &amp; roles.
              </p>
            )}
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

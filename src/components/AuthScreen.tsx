import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Leaf,
  LoaderCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { registrationSchema } from "../../supabase/functions/_shared/contracts";
import { configurationError, liveMode } from "../lib/api";
import { demoPeople } from "../lib/demo";

export default function AuthScreen({
  onLogin,
  onRegister,
  busy,
  error,
  notice,
}: {
  onLogin: (email: string, password: string, persona: string) => void;
  onRegister: (name: string, email: string, password: string) => Promise<boolean>;
  busy: boolean;
  error: string;
  notice: string;
}) {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [persona, setPersona] = useState(demoPeople[0].id);
  const [validation, setValidation] = useState("");
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <Leaf size={23} />
          </span>
          eventflow<span className="brand-ai">AI</span>
        </div>
        <div className="login-copy">
          <span className="eyebrow">
            YOUR AGENCY. YOUR TEAM. YOUR NEXT EVENT.
          </span>
          <h1>
            Great events
            <br />
            start with
            <br />
            <em>a clear brief.</em>
          </h1>
          <p>
            One shared workspace for your agency. Clear requirements, protected
            client data, and a record of every change.
          </p>
          <div className="auth-permissions">
            <div>
              <ShieldCheck size={20} />
              <span>
                <strong>Administrator</strong>Manage agency members and roles.
                Create and edit briefs.
              </span>
            </div>
            <div>
              <Users size={20} />
              <span>
                <strong>Team member</strong>Create, edit, and track your
                agency’s client briefs.
              </span>
            </div>
            <div>
              <CalendarDays size={20} />
              <span>
                <strong>Agency protection</strong>Only authorized members can
                access your company’s data.
              </span>
            </div>
          </div>
        </div>
        <span className="login-foot">
          From the first idea to the final detail.
        </span>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <span className="badge neutral">SPRINT 02 · AGENCY WORKSPACE</span>
          <h2>
            {registering
              ? "Create your account."
              : "Welcome to your workspace."}
          </h2>
          <p className="muted">
            {liveMode
              ? "Admins and team members sign in with their own account. Your agency determines your role."
              : "Sample accounts only. This mode simulates authentication."}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setValidation("");
              if (!registering) {
                onLogin(email, password, persona);
                return;
              }
              const parsed = registrationSchema.safeParse({
                name,
                email: email.trim(),
                password,
              });
              if (!parsed.success) {
                setValidation(parsed.error.issues[0].message);
                return;
              }
              const registered = await onRegister(
                parsed.data.name,
                parsed.data.email,
                parsed.data.password,
              );
              if (registered) setPassword("");
            }}
          >
            {liveMode ? (
              <>
                {registering && (
                  <label className="field">
                    <span>Full name</span>
                    <input
                      required
                      autoComplete="name"
                      maxLength={160}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                )}
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    required
                    minLength={registering ? 12 : undefined}
                    maxLength={registering ? 128 : undefined}
                    autoComplete={
                      registering ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                {registering && (
                  <p className="small-note">
                    Use at least 12 characters. Confirm your email after
                    registering, then ask your agency administrator for access.
                  </p>
                )}
              </>
            ) : (
              <label className="field">
                <span>Demo account</span>
                <select
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                >
                  {demoPeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.agencyName} · {p.role}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(validation || error || configurationError) && (
              <p className="error" role="alert">
                {validation || error || configurationError}
              </p>
            )}
            <button
              className="button"
              type="submit"
              disabled={busy || Boolean(configurationError)}
            >
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <ArrowRight size={17} />
              )}
              {liveMode
                ? registering
                  ? "Create account"
                  : "Sign in"
                : "Enter demo workspace"}
            </button>
          </form>
          {notice && (
            <p className="success" role="status">
              {notice}
            </p>
          )}
          {liveMode && (
            <button
              className="text-button auth-switch"
              disabled={busy}
              onClick={() => {
                setRegistering(!registering);
                setValidation("");
                setPassword("");
              }}
            >
              {registering
                ? "Already registered? Sign in"
                : "New team member? Create an account"}
            </button>
          )}
          <div className="login-note">
            <ShieldCheck size={20} />
            <p>
              {liveMode
                ? "Registration never grants agency or administrator access automatically. An agency administrator must add your registered email."
                : "Local demo data is stored in this browser and provides no security boundary. Use sample data only."}
            </p>
          </div>
        </div>
        <span className="login-panel-foot">
          Made for people who bring people together.
        </span>
      </section>
    </div>
  );
}

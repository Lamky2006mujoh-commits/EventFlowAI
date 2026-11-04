import { useState } from "react";
import { Plus } from "lucide-react";

export default function MemberForm({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (email: string, name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <form
      className="panel member-add-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onAdd(email.trim(), name.trim())) {
          setName("");
          setEmail("");
        }
      }}
    >
      <h3>Add a registered team member</h3>
      <p className="muted">
        Ask them to create an account and confirm their email first. New members
        start with the Member role.
      </p>
      <div className="form-grid">
        <label className="field">
          <span>Member name</span>
          <input
            required
            minLength={2}
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Registered email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      </div>
      <button className="button" type="submit" disabled={busy}>
        <Plus size={15} />
        Add member
      </button>
    </form>
  );
}

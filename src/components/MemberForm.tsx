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
      <h3>Add an existing account</h3>
      <p className="muted">
        For older confirmed accounts without a signup request. Review new
        registrations above. Added accounts start with the Member role.
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

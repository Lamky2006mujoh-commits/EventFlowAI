import {
  briefChanges,
  type Brief,
} from "../../supabase/functions/_shared/contracts";

const money = (value: string | number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
export default function VersionChanges({
  brief,
  version,
}: {
  brief: Brief;
  version: number;
}) {
  const current = brief.history.find((v) => v.version === version);
  const previous = brief.history.find((v) => v.version === version - 1);
  if (!current) return null;
  const changes = previous ? briefChanges(previous.data, current.data) : [];
  return (
    <section className="version-changes" aria-label="Changes in this version">
      <h3>What changed in version {version}</h3>
      <p className="muted">
        {current.author} · {new Date(current.createdAt).toLocaleString()}
      </p>
      {!previous ? (
        <p>Initial brief created.</p>
      ) : changes.length === 0 ? (
        <p>No field values changed in this saved version.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>FIELD</th>
                <th>PREVIOUS VALUE</th>
                <th>NEW VALUE</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c) => (
                <tr key={c.field}>
                  <th scope="row">{c.label}</th>
                  <td>
                    {c.field === "budget"
                      ? money(c.before)
                      : String(c.before || "Not provided")}
                  </td>
                  <td>
                    {c.field === "budget"
                      ? money(c.after)
                      : String(c.after || "Not provided")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

import { useState } from "react";
import type { Brief } from "../../supabase/functions/_shared/contracts";
import {
  venueSearchArea,
  venueUnitLabels,
  venueQuantityText,
  type VenueSearch,
  type SelectedVenue,
} from "../../supabase/functions/_shared/venues";
import { englishPlanningText } from "../../supabase/functions/_shared/english";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(n);
const suggestionPrefix = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https://www.google.com data:; base-uri 'none'; form-action 'none';"><base target="_blank">`;
const validQuantity = (quantity: number) =>
  Number.isInteger(quantity) && quantity >= 1 && quantity <= 100000;
export default function VenuePicker({
  brief,
  search,
  selected,
  busy,
  onSearch,
  onSelect,
}: {
  brief: Brief;
  search: VenueSearch | null;
  selected: SelectedVenue | null;
  busy: boolean;
  onSearch: (preferences: string) => void;
  onSelect: (venueId: string, quantity: number) => void;
}) {
  const [preferences, setPreferences] = useState(""),
    [quantities, setQuantities] = useState<Record<string, number>>({}),
    [fitOnly, setFitOnly] = useState(false);
  const area = venueSearchArea(brief.data.venue),
    stale = search?.briefVersion !== brief.version;
  const quantityFor = (v: VenueSearch["options"][number]) =>
    quantities[v.id] ??
    (selected?.venue.id === v.id && selected.briefVersion === brief.version
      ? selected.quantity
      : undefined) ??
    (v.price.unit === "person"
      ? brief.data.attendees
      : v.price.unit === "hour"
        ? 4
        : 1);
  const results =
    search?.options.filter(
      (v) =>
        !fitOnly ||
        ((v.capacity === null || v.capacity >= brief.data.attendees) &&
          (v.price.max === null ||
            !validQuantity(quantityFor(v)) ||
            v.price.max * quantityFor(v) <= brief.data.budget)),
    ) ?? [];
  return (
    <section className="venue-picker" aria-label="Find and select a venue">
      <div className="planning-heading">
        <div>
          <h3>Find and compare venues</h3>
          <p>
            <strong>{area.area}</strong> ·{" "}
            {area.scope === "nationwide"
              ? "Search across Vietnam"
              : "Search the entire area and nearby cities"}
          </p>
          <p>
            {brief.data.attendees.toLocaleString("en-US")} people ·{" "}
            {brief.data.eventType} · Date {brief.data.date}
          </p>
        </div>
      </div>
      <label className="field">
        <span>Additional venue preferences</span>
        <input
          aria-label="Additional venue preferences"
          maxLength={1000}
          value={preferences}
          disabled={busy}
          placeholder="For example: outdoor space, parking, or an LED screen…"
          onChange={(e) => setPreferences(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={() => onSearch(preferences)}
      >
        {search ? "Search venues again" : "Find venues on the web"}
      </button>
      <p className="muted">
        Search uses the location in your brief. Sourced prices and estimates are
        labeled separately; confirm availability, deposits and additional fees
        with the venue.
      </p>
      {selected && (
        <div className="selected-venue-note">
          <strong>Selected venue: {selected.venue.name}</strong>
          <p>
            {selected.venue.address} ·{" "}
            {venueQuantityText(selected.quantity, selected.venue.price.unit)}
          </p>
          {selected.briefVersion !== brief.version && (
            <p className="error">
              The brief changed. Search and select a venue again for the current
              version.
            </p>
          )}
        </div>
      )}
      {search && (
        <>
          <div className="venue-results-heading">
            <p>{englishPlanningText(search.summary)}</p>
            <span className="muted">
              {search.method === "demo"
                ? "Sample data, not an actual quote"
                : "Web search"}{" "}
              · Checked {new Date(search.checkedAt).toLocaleString("en-US")}
            </span>
            <label className="venue-filter">
              <input
                type="checkbox"
                checked={fitOnly}
                onChange={(e) => setFitOnly(e.target.checked)}
              />{" "}
              Only show options within budget and without known capacity
              shortfalls
            </label>
          </div>
          {stale && (
            <p className="review-note">
              These results belong to an older brief version. Search again
              before selecting.
            </p>
          )}
          {!results.length && (
            <p className="review-note">
              No venues match the current filter. Clear the filter or broaden
              your preferences.
            </p>
          )}
          <div className="venue-grid">
            {results.map((v) => {
              const quantity = quantityFor(v),
                chosen =
                  selected?.venue.id === v.id &&
                  selected.quantity === quantity &&
                  selected.briefVersion === brief.version;
              const total =
                v.price.max === null || !validQuantity(quantity)
                  ? null
                  : v.price.max * quantity;
              return (
                <article
                  className={"venue-card " + (chosen ? "chosen" : "")}
                  key={v.id}
                >
                  <div className="planning-heading">
                    <h4>{v.name}</h4>
                    <span
                      className={
                        "badge " +
                        (v.price.kind === "reference" ? "green" : "amber")
                      }
                    >
                      {v.price.kind === "reference"
                        ? "Sourced reference price"
                        : v.price.kind === "estimate"
                          ? "AI estimate"
                          : "Quote required"}
                    </span>
                  </div>
                  <p>{v.address}</p>
                  <p>
                    <strong>Capacity: </strong>
                    {v.capacity === null
                      ? "Not published; confirmation required"
                      : v.capacity.toLocaleString("en-US") + " people"}
                    {v.capacity !== null &&
                      v.capacity < brief.data.attendees && (
                        <span className="field-error">
                          {" "}
                          · Below the brief attendee count
                        </span>
                      )}
                  </p>
                  <p className="venue-price">
                    {v.price.min === null
                      ? "No public price"
                      : money(v.price.min) +
                        (v.price.max !== v.price.min
                          ? " – " + money(v.price.max!)
                          : "") +
                        " / " +
                        venueUnitLabels[v.price.unit]}
                  </p>
                  <p>{englishPlanningText(v.price.notes)}</p>
                  {v.price.evidence && (
                    <details className="venue-evidence">
                      <summary>Original source quote</summary>
                      <blockquote>{v.price.evidence}</blockquote>
                    </details>
                  )}
                  <p>{englishPlanningText(v.suitability)}</p>
                  {!!v.included.length && (
                    <>
                      <h5>Included services</h5>
                      <ul>
                        {v.included.map((text, i) => (
                          <li key={i}>{englishPlanningText(text)}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <h5>Conditions / to confirm</h5>
                  <ul>
                    {v.conditions.map((text, i) => (
                      <li key={i}>{englishPlanningText(text)}</li>
                    ))}
                  </ul>
                  <p className="muted">
                    Availability and booking have not been checked.
                  </p>
                  <div className="venue-source-links">
                    {v.sources.map((s, i) => (
                      <a
                        key={s.url + i}
                        href={s.url}
                        title={s.title}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Source {i + 1}: View source
                      </a>
                    ))}
                    <a
                      href={
                        "https://www.google.com/maps/search/?api=1&query=" +
                        encodeURIComponent(v.name + " " + v.address)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on map
                    </a>
                  </div>
                  <div className="venue-selection">
                    <label className="field">
                      <span>Quantity ({venueUnitLabels[v.price.unit]})</span>
                      <input
                        aria-label={"Rental quantity for " + v.name}
                        type="number"
                        min={1}
                        max={100000}
                        step={1}
                        value={Number.isNaN(quantity) ? "" : quantity}
                        disabled={busy || stale}
                        onChange={(e) =>
                          setQuantities({
                            ...quantities,
                            [v.id]: e.target.valueAsNumber,
                          })
                        }
                      />
                    </label>
                    <p>
                      {!validQuantity(quantity)
                        ? "Enter a whole-number quantity from 1 to 100,000 before selecting."
                        : total === null
                          ? "The provisional budget allocation will be retained until a quote is available."
                          : "Estimate at the upper price: " + money(total)}
                    </p>
                    {total !== null && total > brief.data.budget && (
                      <p className="error">
                        This venue cost alone exceeds the brief budget.
                      </p>
                    )}
                    <button
                      type="button"
                      className="button secondary"
                      disabled={
                        busy || stale || chosen || !validQuantity(quantity)
                      }
                      onClick={() => onSelect(v.id, quantity)}
                    >
                      {chosen ? "Selected venue" : "Use this venue"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {search.searchSuggestions && (
            <iframe
              className="venue-search-suggestions"
              title="Google Search suggestions"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              srcDoc={suggestionPrefix + search.searchSuggestions}
            />
          )}
        </>
      )}
    </section>
  );
}

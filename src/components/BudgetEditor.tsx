import {
  budgetCategories,
  budgetCategoryLabels,
  budgetTotals,
  baselineBudget,
  budgetSchema,
  type Budget,
  type BudgetItem,
} from "../../supabase/functions/_shared/budget";
import { englishPlanningText } from "../../supabase/functions/_shared/english";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(n);
export default function BudgetEditor({
  budget,
  limit,
  attendees,
  disabled,
  onChange,
}: {
  budget?: Budget;
  limit: number;
  attendees: number;
  disabled: boolean;
  onChange: (budget: Budget) => void;
}) {
  if (!budget)
    return (
      <section className="budget-editor">
        <h3>Itemized estimated budget</h3>
        <p>
          This older version has no cost breakdown. Start with an allocation
          from the brief budget, then adjust it before saving.
        </p>
        <button
          type="button"
          className="button secondary"
          disabled={disabled}
          onClick={() => onChange(baselineBudget(limit, attendees))}
        >
          Add estimated budget
        </button>
      </section>
    );
  const totals = budgetTotals(budget, limit),
    valid = budgetSchema.safeParse(budget).success;
  const update = (index: number, patch: Partial<BudgetItem>) =>
    onChange({
      ...budget,
      items: budget.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  const missing = budgetCategories.filter(
    (c) => !budget.items.some((i) => i.category === c),
  );
  return (
    <section className="budget-editor" aria-label="Estimated budget">
      <div className="planning-heading">
        <div>
          <h3>Itemized estimated budget</h3>
          <p>
            Brief budget: <strong>{money(limit)}</strong> · VND · All
            unconfirmed prices are estimates.
          </p>
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={disabled || budget.items.length >= 40}
          onClick={() =>
            onChange({
              ...budget,
              items: [
                ...budget.items,
                {
                  category: "other",
                  description: "New cost item",
                  quantity: 1,
                  unit: "package",
                  unitCost: 0,
                  notes: "Estimate; supplier quote required.",
                },
              ],
            })
          }
        >
          Add cost item
        </button>
      </div>
      <div className="budget-items">
        {budget.items.map((item, index) => (
          <article
            className="budget-item"
            key={index}
            aria-label={"Cost item " + (index + 1)}
          >
            <div className="budget-item-heading">
              <label className="field">
                <span>Cost category</span>
                <select
                  aria-label={"Cost category " + (index + 1)}
                  value={item.category}
                  disabled={disabled}
                  onChange={(e) =>
                    update(index, {
                      category: e.target.value as BudgetItem["category"],
                    })
                  }
                >
                  {budgetCategories.map((c) => (
                    <option key={c} value={c}>
                      {budgetCategoryLabels[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Description</span>
                <input
                  aria-label={"Cost description " + (index + 1)}
                  maxLength={300}
                  required
                  value={englishPlanningText(item.description)}
                  disabled={disabled}
                  onChange={(e) =>
                    update(index, { description: e.target.value })
                  }
                />
              </label>
              <button
                type="button"
                className="text-button"
                aria-label={"Remove cost item " + (index + 1)}
                disabled={disabled || budget.items.length === 1}
                onClick={() =>
                  onChange({
                    ...budget,
                    items: budget.items.filter((_, i) => i !== index),
                  })
                }
              >
                ×
              </button>
            </div>
            <div className="budget-item-values">
              <label className="field">
                <span>Quantity</span>
                <input
                  aria-label={"Cost quantity " + (index + 1)}
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  required
                  value={item.quantity}
                  disabled={disabled}
                  onChange={(e) =>
                    update(index, { quantity: e.target.valueAsNumber || 0 })
                  }
                />
              </label>
              <label className="field">
                <span>Unit</span>
                <input
                  aria-label={"Cost unit " + (index + 1)}
                  maxLength={40}
                  required
                  value={englishPlanningText(item.unit)}
                  disabled={disabled}
                  onChange={(e) => update(index, { unit: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Unit cost (VND)</span>
                <input
                  aria-label={"Unit cost " + (index + 1)}
                  type="number"
                  min={0}
                  max={1e12}
                  step={1}
                  required
                  value={item.unitCost}
                  disabled={disabled}
                  onChange={(e) =>
                    update(index, { unitCost: e.target.valueAsNumber || 0 })
                  }
                />
              </label>
              <div className="budget-line-total">
                <span>Line total</span>
                <strong>{money(item.quantity * item.unitCost)}</strong>
              </div>
            </div>
            <label className="field budget-note">
              <span>Notes / estimate basis</span>
              <input
                aria-label={"Cost notes " + (index + 1)}
                maxLength={1000}
                value={englishPlanningText(item.notes)}
                disabled={disabled}
                onChange={(e) => update(index, { notes: e.target.value })}
              />
            </label>
          </article>
        ))}
      </div>
      <div className="budget-percentages">
        <label className="field">
          <span>Contingency (%)</span>
          <input
            aria-label="Contingency (%)"
            type="number"
            min={0}
            max={50}
            step="any"
            required
            disabled={disabled}
            value={budget.contingencyPercent}
            onChange={(e) =>
              onChange({
                ...budget,
                contingencyPercent: e.target.valueAsNumber || 0,
              })
            }
          />
        </label>
        <label className="field">
          <span>Estimated additional tax (%)</span>
          <input
            aria-label="Estimated additional tax (%)"
            type="number"
            min={0}
            max={100}
            step="any"
            required
            disabled={disabled}
            value={budget.taxPercent}
            onChange={(e) =>
              onChange({ ...budget, taxPercent: e.target.valueAsNumber || 0 })
            }
          />
        </label>
      </div>
      <dl className="budget-totals" aria-live="polite">
        <div>
          <dt>Subtotal</dt>
          <dd>{money(totals.subtotal)}</dd>
        </div>
        <div>
          <dt>Contingency</dt>
          <dd>{money(totals.contingency)}</dd>
        </div>
        <div>
          <dt>Estimated tax</dt>
          <dd>{money(totals.tax)}</dd>
        </div>
        <div className="budget-grand-total">
          <dt>Estimated total</dt>
          <dd>{money(totals.total)}</dd>
        </div>
        <div className={totals.overBudget ? "budget-over" : "budget-under"}>
          <dt>{totals.overBudget ? "Over budget" : "Remaining budget"}</dt>
          <dd>{money(Math.abs(totals.remaining))}</dd>
        </div>
      </dl>
      {totals.overBudget && (
        <p className="error" role="status">
          The estimated total exceeds the brief budget. Adjust costs or update
          the brief before finalizing.
        </p>
      )}
      {!valid && (
        <p className="error" role="alert">
          Check quantities, unit costs, percentages and budget limits before
          saving.
        </p>
      )}
      {!!missing.length && (
        <p className="muted">
          Not allocated:{" "}
          {missing.map((c) => budgetCategoryLabels[c]).join(", ")}. Add these if
          they are in scope for the event.
        </p>
      )}
      <label className="field">
        <span>Budget assumptions</span>
        <textarea
          aria-label="Budget assumptions"
          rows={3}
          maxLength={2000}
          value={englishPlanningText(budget.assumptions)}
          disabled={disabled}
          onChange={(e) => onChange({ ...budget, assumptions: e.target.value })}
        />
      </label>
      <p className="muted">
        Tax is calculated on the subtotal plus contingency. A 0% rate may mean
        tax is unconfirmed or included; explain the basis. Avoid counting
        services already included in a venue package twice.
      </p>
    </section>
  );
}

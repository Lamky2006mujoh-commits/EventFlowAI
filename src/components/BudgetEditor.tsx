import {
  budgetCategories,
  budgetCategoryLabels,
  budgetTotals,
  baselineBudget,
  budgetSchema,
  type Budget,
  type BudgetItem,
} from "../../supabase/functions/_shared/budget";
const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
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
        <h3>Ngân sách dự kiến theo hạng mục</h3>
        <p>
          Phiên bản cũ chưa có bảng chi phí. Bạn có thể khởi tạo phân bổ từ ngân
          sách brief rồi điều chỉnh trước khi lưu.
        </p>
        <button
          type="button"
          className="button secondary"
          disabled={disabled}
          onClick={() => onChange(baselineBudget(limit, attendees))}
        >
          Thêm bảng ngân sách dự kiến
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
    <section className="budget-editor" aria-label="Ngân sách dự kiến">
      <div className="planning-heading">
        <div>
          <h3>Ngân sách dự kiến theo hạng mục</h3>
          <p>
            Ngân sách brief: <strong>{money(limit)}</strong> · VND · Mọi giá
            chưa xác nhận đều là ước tính.
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
                  description: "Chi phí mới",
                  quantity: 1,
                  unit: "gói",
                  unitCost: 0,
                  notes: "Ước tính, cần báo giá.",
                },
              ],
            })
          }
        >
          Thêm hạng mục
        </button>
      </div>
      <div className="budget-items">
        {budget.items.map((item, index) => (
          <article
            className="budget-item"
            key={index}
            aria-label={"Hạng mục " + (index + 1)}
          >
            <div className="budget-item-heading">
              <label className="field">
                <span>Nhóm chi phí</span>
                <select
                  aria-label={"Nhóm chi phí " + (index + 1)}
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
                <span>Nội dung</span>
                <input
                  aria-label={"Nội dung chi phí " + (index + 1)}
                  maxLength={300}
                  required
                  value={item.description}
                  disabled={disabled}
                  onChange={(e) =>
                    update(index, { description: e.target.value })
                  }
                />
              </label>
              <button
                type="button"
                className="text-button"
                aria-label={"Xóa hạng mục " + (index + 1)}
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
                <span>Số lượng</span>
                <input
                  aria-label={"Số lượng chi phí " + (index + 1)}
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
                <span>Đơn vị</span>
                <input
                  aria-label={"Đơn vị chi phí " + (index + 1)}
                  maxLength={40}
                  required
                  value={item.unit}
                  disabled={disabled}
                  onChange={(e) => update(index, { unit: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Đơn giá (VND)</span>
                <input
                  aria-label={"Đơn giá chi phí " + (index + 1)}
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
                <span>Thành tiền</span>
                <strong>{money(item.quantity * item.unitCost)}</strong>
              </div>
            </div>
            <label className="field budget-note">
              <span>Ghi chú / cơ sở ước tính</span>
              <input
                aria-label={"Ghi chú chi phí " + (index + 1)}
                maxLength={1000}
                value={item.notes}
                disabled={disabled}
                onChange={(e) => update(index, { notes: e.target.value })}
              />
            </label>
          </article>
        ))}
      </div>
      <div className="budget-percentages">
        <label className="field">
          <span>Dự phòng (%)</span>
          <input
            aria-label="Dự phòng (%)"
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
          <span>Thuế bổ sung dự kiến (%)</span>
          <input
            aria-label="Thuế bổ sung dự kiến (%)"
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
          <dt>Tạm tính</dt>
          <dd>{money(totals.subtotal)}</dd>
        </div>
        <div>
          <dt>Dự phòng</dt>
          <dd>{money(totals.contingency)}</dd>
        </div>
        <div>
          <dt>Thuế dự kiến</dt>
          <dd>{money(totals.tax)}</dd>
        </div>
        <div className="budget-grand-total">
          <dt>Tổng dự kiến</dt>
          <dd>{money(totals.total)}</dd>
        </div>
        <div className={totals.overBudget ? "budget-over" : "budget-under"}>
          <dt>
            {totals.overBudget ? "Vượt ngân sách" : "Còn lại trong ngân sách"}
          </dt>
          <dd>{money(Math.abs(totals.remaining))}</dd>
        </div>
      </dl>
      {totals.overBudget && (
        <p className="error" role="status">
          Tổng dự kiến vượt ngân sách brief. Điều chỉnh chi phí hoặc cập nhật
          brief trước khi chốt.
        </p>
      )}
      {!valid && (
        <p className="error" role="alert">
          Kiểm tra số lượng, đơn giá, tỷ lệ và giới hạn ngân sách trước khi lưu.
        </p>
      )}
      {!!missing.length && (
        <p className="muted">
          Chưa phân bổ: {missing.map((c) => budgetCategoryLabels[c]).join(", ")}
          . Bổ sung nếu thuộc phạm vi sự kiện.
        </p>
      )}
      <label className="field">
        <span>Giả định ngân sách</span>
        <textarea
          aria-label="Giả định ngân sách"
          rows={3}
          maxLength={2000}
          value={budget.assumptions}
          disabled={disabled}
          onChange={(e) => onChange({ ...budget, assumptions: e.target.value })}
        />
      </label>
      <p className="muted">
        Thuế tính trên tạm tính cộng dự phòng. Tỷ lệ 0% có thể là chưa xác nhận
        hoặc giá đã bao gồm thuế; ghi rõ cơ sở. Kiểm tra tránh tính trùng dịch
        vụ trong gói địa điểm.
      </p>
    </section>
  );
}

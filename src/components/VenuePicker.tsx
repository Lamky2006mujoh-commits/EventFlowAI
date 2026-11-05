import { useState } from "react";
import type { Brief } from "../../supabase/functions/_shared/contracts";
import {
  venueSearchArea,
  venueUnitLabels,
  type VenueSearch,
  type SelectedVenue,
} from "../../supabase/functions/_shared/venues";
const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
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
    <section className="venue-picker" aria-label="Tìm và chọn địa điểm">
      <div className="planning-heading">
        <div>
          <h3>Tìm & đề xuất địa điểm</h3>
          <p>
            <strong>{area.area}</strong> ·{" "}
            {area.scope === "nationwide"
              ? "Tìm trên toàn Việt Nam"
              : "Tìm toàn khu vực và các thành phố lân cận"}
          </p>
          <p>
            {brief.data.attendees.toLocaleString("vi-VN")} khách ·{" "}
            {brief.data.eventType} · Ngày {brief.data.date}
          </p>
        </div>
      </div>
      <label className="field">
        <span>Tiêu chí địa điểm bổ sung</span>
        <input
          aria-label="Tiêu chí địa điểm bổ sung"
          maxLength={1000}
          value={preferences}
          disabled={busy}
          placeholder="Ví dụ: ngoài trời, có bãi đỗ xe, cần màn hình LED…"
          onChange={(e) => setPreferences(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={() => onSearch(preferences)}
      >
        {search ? "Tìm lại địa điểm" : "Tìm địa điểm trên web"}
      </button>
      <p className="muted">
        Phạm vi lấy từ địa điểm trong brief. Giá có nguồn và giá ước tính được
        gắn nhãn riêng; ngày trống, đặt cọc và phí phát sinh cần xác nhận với
        địa điểm.
      </p>
      {selected && (
        <div className="selected-venue-note">
          <strong>Địa điểm đã chọn: {selected.venue.name}</strong>
          <p>
            {selected.venue.address} · {selected.quantity}{" "}
            {venueUnitLabels[selected.venue.price.unit]}
          </p>
          {selected.briefVersion !== brief.version && (
            <p className="error">
              Brief đã thay đổi. Hãy tìm và chọn lại địa điểm cho phiên bản hiện
              tại.
            </p>
          )}
        </div>
      )}
      {search && (
        <>
          <div className="venue-results-heading">
            <p>{search.summary}</p>
            <span className="muted">
              {search.method === "demo"
                ? "Dữ liệu mẫu, không phải báo giá thực tế"
                : "Tìm trên web"}{" "}
              · Kiểm tra {new Date(search.checkedAt).toLocaleString("vi-VN")}
            </span>
            <label className="venue-filter">
              <input
                type="checkbox"
                checked={fitOnly}
                onChange={(e) => setFitOnly(e.target.checked)}
              />{" "}
              Chỉ hiện lựa chọn không vượt ngân sách và đủ sức chứa đã biết
            </label>
          </div>
          {stale && (
            <p className="review-note">
              Kết quả thuộc phiên bản brief cũ. Tìm lại trước khi lựa chọn.
            </p>
          )}
          {!results.length && (
            <p className="review-note">
              Không có địa điểm phù hợp với bộ lọc hiện tại. Bỏ bộ lọc hoặc thử
              tiêu chí rộng hơn.
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
                        ? "Giá tham khảo có nguồn"
                        : v.price.kind === "estimate"
                          ? "Ước tính AI"
                          : "Cần liên hệ báo giá"}
                    </span>
                  </div>
                  <p>{v.address}</p>
                  <p>
                    <strong>Sức chứa: </strong>
                    {v.capacity === null
                      ? "Chưa công bố, cần xác nhận"
                      : v.capacity.toLocaleString("vi-VN") + " khách"}
                    {v.capacity !== null &&
                      v.capacity < brief.data.attendees && (
                        <span className="field-error">
                          {" "}
                          · Chưa đủ số khách trong brief
                        </span>
                      )}
                  </p>
                  <p className="venue-price">
                    {v.price.min === null
                      ? "Chưa có giá công khai"
                      : money(v.price.min) +
                        (v.price.max !== v.price.min
                          ? " – " + money(v.price.max!)
                          : "") +
                        " / " +
                        venueUnitLabels[v.price.unit]}
                  </p>
                  <p>{v.price.notes}</p>
                  {v.price.evidence && (
                    <blockquote className="venue-evidence">
                      {v.price.evidence}
                    </blockquote>
                  )}
                  <p>{v.suitability}</p>
                  {!!v.included.length && (
                    <>
                      <h5>Dịch vụ bao gồm</h5>
                      <ul>
                        {v.included.map((text, i) => (
                          <li key={i}>{text}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <h5>Điều kiện / cần xác nhận</h5>
                  <ul>
                    {v.conditions.map((text, i) => (
                      <li key={i}>{text}</li>
                    ))}
                  </ul>
                  <p className="muted">
                    Chưa kiểm tra tình trạng trống hoặc đặt chỗ.
                  </p>
                  <div className="venue-source-links">
                    {v.sources.map((s, i) => (
                      <a
                        key={s.url + i}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Nguồn {i + 1}: {s.title || "Xem thông tin"}
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
                      Xem vị trí trên bản đồ
                    </a>
                  </div>
                  <div className="venue-selection">
                    <label className="field">
                      <span>Số lượng ({venueUnitLabels[v.price.unit]})</span>
                      <input
                        aria-label={"Số lượng thuê " + v.name}
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
                        ? "Nhập số lượng nguyên từ 1 đến 100.000 trước khi chọn."
                        : total === null
                          ? "Sẽ giữ khoản dự trù trong ngân sách, chờ báo giá."
                          : "Dự trù theo mức cao: " + money(total)}
                    </p>
                    {total !== null && total > brief.data.budget && (
                      <p className="error">
                        Riêng chi phí này đã vượt ngân sách brief.
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
                      {chosen ? "Đã chọn địa điểm" : "Dùng địa điểm này"}
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

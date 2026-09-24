// Strict parsers. Anything that is not exactly the expected shape returns null,
// so the caller has to refuse instead of coercing ("12a" is not 12).

const QUANTITY = /^\d+(\.\d+)?$/;
const MONEY = /^\$(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?:\s*\/\s*([A-Za-z]+))?$/;

export function parseQuantity(text: string): number | null {
  const t = text.trim();
  return QUANTITY.test(t) ? Number(t) : null;
}

export function parseItemNo(text: string): number | null {
  const t = text.trim();
  return /^\d+$/.test(t) ? Number(t) : null;
}

/** "$1,195.20" -> { cents: 119520 }. "$68.00 /bag" -> { cents: 6800, per: "bag" }. */
export function parseMoney(text: string): { cents: number; per: string | null } | null {
  const m = MONEY.exec(text.trim());
  if (!m) return null;
  const dollars = Number(m[1].replace(/,/g, ""));
  return { cents: dollars * 100 + Number(m[2]), per: m[3] ?? null };
}

export function centsToNumber(cents: number): number {
  return cents / 100;
}

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-NZ");
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, "0")}`;
}

/** qty × unit price in cents, or null if qty has more precision than we can multiply exactly. */
export function multiplyCents(qty: number, unitCents: number): number | null {
  const scaled = qty * unitCents;
  const rounded = Math.round(scaled);
  return Math.abs(scaled - rounded) < 1e-6 ? rounded : null;
}

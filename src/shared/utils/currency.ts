//normilizer for old expenses without currency
export function normalizeCurrency(c?: string | null): string {
  const v = (c ?? "").trim().toUpperCase();
  return v.length ? v : "EUR";
}

//returns YYYY-MM
export function currentMonth(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

//from YYYY-MM returns {start: "YYYY-MM-01", endExclusive: "YYYY-MM+1-01"}
export function monthRange(month: string): {
  start: string;
  endExclusive: string;
} {
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);

  const start = `${yStr}-${mStr}-01`;

  //next month
  const next = new Date(y, m, 1); //using m gives next month (JS months are 0 based)
  const ny = next.getFullYear();
  const nm = String(next.getMonth() + 1).padStart(2, '0');

  const endExclusive = `${ny}-${nm}-01`;
  return { start, endExclusive };
}

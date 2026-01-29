import { normalizeCurrency } from "../utils/currency";

const FX_URL = 'https://api.frankfurter.dev/v1';   //stable public endpoint

type FxResponse = {
    amount: number;
    base: string;
    date: string;
    rates: Record<string, number>;
};

const rateCache = new Map<string, number>();

function cacheKey(date: string, from: string, to: string) {
    return `${date}|${from}|${to}`;
}

//returns fx rate (from - to) for a given date
export async function getFxRate(date: string, from: string, to: string): Promise<number> {
    const f = normalizeCurrency(from);
    const t = normalizeCurrency(to);
    if (f === t) return 1;

    const key = cacheKey(date, f, t);
    const cached = rateCache.get(key);
    if (cached != null) return cached;

    const url = `${FX_URL}/${date}?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FX API request failed (${res.status}).`);

    const data = (await res.json()) as FxResponse;
    const rate = Number(data?.rates?.[t]);

    if (!Number.isFinite(rate) || rate <= 0) throw new Error("FX rate missing/invalid in response.");

    rateCache.set(key, rate);
    return rate;
}

//converter
export async function convertAmount(date: string, amount: number, from: string, to: string): Promise<number> {
    const f = normalizeCurrency(from);
    const t = normalizeCurrency(to);
    if (!Number.isFinite(amount)) return 0;
    if (f === t) return amount;

    const rate = await getFxRate(date, f, t);
    return amount * rate;
}
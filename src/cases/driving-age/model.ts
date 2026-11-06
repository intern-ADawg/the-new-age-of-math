export const PARAMS = {
  chauffeuring_miles_per_year: 6000,
  delay_years: 2,
  cost_per_mile_usd: 0.6637,
  insurance_increase_per_year_usd: 4050,
  rate_age_16: 3.5,
  rate_age_18: 7.0,
  rate_age_19: 8.8,
};

export const APPENDIX_B: Record<number, number> = {
  14: 0.3,
  15: 0.8,
  16: 3.5,
  17: 5.4,
  18: 7.0,
  19: 8.8,
};

export function evaluate(params?: Partial<typeof PARAMS>) {
  const p = { ...PARAMS, ...params };
  return {
    A: p.chauffeuring_miles_per_year * p.delay_years * p.cost_per_mile_usd,
    B: p.insurance_increase_per_year_usd * p.delay_years,
  };
}

export function evaluateTwist(params?: Partial<typeof PARAMS>) {
  const p = { ...PARAMS, ...params };
  const out = evaluate(p);
  return {
    ...out,
    twist_note: `Naive safety read: rate climbs from ${p.rate_age_16.toFixed(1)} (age 16) to ${p.rate_age_18.toFixed(1)} (age 18) to ${p.rate_age_19.toFixed(1)} (age 19) per 100,000 people — NOT a per-mile risk rate, and S8's per-mile ages 16–17 vs 18–19 comparison points the opposite direction.`,
  };
}

export function near(a: number, b: number, tol: number) {
  return Math.abs(a - b) <= tol;
}

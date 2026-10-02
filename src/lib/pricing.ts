// Prices (FR-7). One source of truth for the home summary, pricing page and sign-up.

export const FAMILY = {
  monthly: { price: 5.99, per: "month", label: "Monthly" },
  annual: { price: 47.99, per: "year", label: "Annual" },
} as const;

export const FAMILY_TRIAL_DAYS = 14;

/** Schools: the first 30 pupils are always free, then a flat per-pupil price. */
export const SCHOOL_FREE_PUPILS = 30;
export const SCHOOL_PER_PUPIL = 2.4;

export const annualSaving = () => {
  const yearOfMonthly = FAMILY.monthly.price * 12;
  return Math.round(((yearOfMonthly - FAMILY.annual.price) / yearOfMonthly) * 100);
};

export const annualAsMonthly = () => FAMILY.annual.price / 12;

export function schoolCost(pupils: number): number {
  if (!Number.isFinite(pupils) || pupils <= SCHOOL_FREE_PUPILS) return 0;
  return Math.round((pupils - SCHOOL_FREE_PUPILS) * SCHOOL_PER_PUPIL * 100) / 100;
}

export const gbp = (n: number, dp = 2) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

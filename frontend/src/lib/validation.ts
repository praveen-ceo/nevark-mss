// ---------------------------------------------------------------------------
// Nevark MSS — shared form validation utilities
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Regex constants (also used by backend — kept in sync)
// ---------------------------------------------------------------------------

export const PHONE_RE  = /^[6-9]\d{9}$/;
export const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GSTIN_RE  = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{3}$/;
export const PAN_RE    = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_RE   = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// ---------------------------------------------------------------------------
// Atomic validators — each returns an error string or "" if valid
// ---------------------------------------------------------------------------

export const V = {
  required: (v: string | null | undefined, label = "This field"): string =>
    !v?.trim() ? `${label} is required.` : "",

  minLen: (min: number, label = "This field") =>
    (v: string | null | undefined): string =>
      v && v.trim().length < min ? `${label} must be at least ${min} characters.` : "",

  email: (v: string | null | undefined): string =>
    v && !EMAIL_RE.test(v) ? "Enter a valid email address." : "",

  phone: (v: string | null | undefined): string =>
    v && !PHONE_RE.test(v)
      ? "Enter a valid 10-digit Indian mobile number (starts with 6–9)."
      : "",

  gstin: (v: string | null | undefined): string =>
    v && !GSTIN_RE.test(v.toUpperCase())
      ? "Enter a valid 15-character GSTIN (e.g. 27AAPFU0939F1ZV)."
      : "",

  pan: (v: string | null | undefined): string =>
    v && !PAN_RE.test(v.toUpperCase())
      ? "Enter a valid PAN (e.g. ABCDE1234F)."
      : "",

  ifsc: (v: string | null | undefined): string =>
    v && !IFSC_RE.test(v.toUpperCase())
      ? "Enter a valid IFSC code (e.g. HDFC0001234)."
      : "",

  positive: (v: string | number | null | undefined, label = "Value"): string =>
    v !== "" && v !== null && v !== undefined && +v <= 0
      ? `${label} must be greater than 0.`
      : "",

  nonNegative: (v: string | number | null | undefined, label = "Value"): string =>
    v !== "" && v !== null && v !== undefined && +v < 0
      ? `${label} cannot be negative.`
      : "",

  dateOrder: (start: string, end: string): string =>
    start && end && end < start ? "End date cannot be before start date." : "",

  /** Run multiple validators and return the first error found */
  chain:
    (...fns: Array<(v: string) => string>) =>
    (v: string): string => {
      for (const fn of fns) {
        const err = fn(v);
        if (err) return err;
      }
      return "";
    },
};

// ---------------------------------------------------------------------------
// Inline error component helper (returns className string for consistency)
// ---------------------------------------------------------------------------

export const ERR_CLS =
  "text-xs text-red-500 mt-0.5 block leading-tight";

// Input border highlight when error exists
export function inputErrCls(base: string, hasError: boolean): string {
  return hasError
    ? base.replace("border-gray-200", "border-red-400")
           .replace("border-gray-300", "border-red-400") + " bg-red-50"
    : base;
}

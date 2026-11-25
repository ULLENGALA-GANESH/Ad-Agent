export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: any }
  | ClassValue[];

/**
 * Combines class names safely without external dependencies.
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string" || typeof input === "number") {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.join(" ");
}

/**
 * Formats seconds or numbers into human-readable duration strings (e.g. 1.5s, 2m 14s).
 */
export function formatDuration(duration: number | string | undefined | null): string {
  if (duration === undefined || duration === null) return "0s";
  const num = typeof duration === "string" ? parseFloat(duration) : duration;
  if (isNaN(num) || num < 0) return "0s";
  if (num < 1 && num > 0) return `${Math.round(num * 1000)}ms`;
  if (num < 60) return `${num.toFixed(1)}s`;
  const mins = Math.floor(num / 60);
  const remSecs = Math.round(num % 60);
  return `${mins}m ${remSecs}s`;
}

/** Joins class names, skipping falsy values. Layout classes only: colour and type come from components. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

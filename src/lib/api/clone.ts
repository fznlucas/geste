/** The mock tables are module constants: callers get copies so nothing can mutate them by accident. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

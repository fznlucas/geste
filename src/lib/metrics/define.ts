/**
 * A metric is a function with its definition next to it (docs/admin-v2/06 §2): the tooltip on a KPI
 * reads `fn.definition`, so the words and the code never disagree.
 */
export type Metric<F extends (...args: never[]) => unknown> = F & { readonly definition: string };

export function metric<F extends (...args: never[]) => unknown>(definition: string, fn: F): Metric<F> {
  return Object.assign(fn, { definition });
}

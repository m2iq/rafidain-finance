/**
 * Sanitizes free-text search input before it's interpolated into a
 * PostgREST `.or("col.ilike.%term%,...")` filter string. Without this,
 * a search term containing `,`/`(`/`)` can inject extra filter clauses,
 * and `%`/`_` are unescaped ilike wildcards.
 */
export function sanitizeIlikeTerm(term: string): string {
  return term
    .replace(/[,()]/g, '')
    .replace(/[%_\\]/g, (c) => `\\${c}`);
}

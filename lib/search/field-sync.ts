/**
 * When the header search field should take its value from the URL. The field is a client component in the root
 * layout, so it cannot read the query while rendering and syncs after hydration. That first sync must not overwrite
 * what the shopper typed in the meantime; every later URL change (a search, Back/Forward, a filter) does update it.
 *
 * `previous` is the URL last synced (null before the first sync), `next` the current one, and `edited` whether the
 * shopper has changed the field or the department since the page loaded. Comparing URLs (not counting runs) keeps a
 * repeated effect for the same URL, such as React's development double run, from overwriting anything.
 */
export function shouldSyncFieldFromUrl(previous: string | null, next: string, edited: boolean): boolean {
  if (previous === next) return false;
  if (previous === null) return !edited;
  return true;
}

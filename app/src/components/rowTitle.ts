// The title text of a list row that was tapped (ListRow: button > text column > first span), for the shared-element
// route transition. Null when the tap was not on a row.
export function rowTitle(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  return target.closest('li')?.querySelector(':scope > button > span.min-w-0 > span:first-child') ?? null;
}

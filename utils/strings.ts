/*
  Tolerates undefined/null rather than throwing. Callers pass values looked up
  out of po_name_map.json, and a PO label absent from that map yields undefined
  — which threw "Cannot read properties of undefined (reading 'charAt')" and
  500'd the entire gene page. Returning "" lets the caller fall back to the raw
  label instead of taking the page down.
*/
export const capitalizeFirstLetter = (original?: string | null): string => {
  if (!original) return ""
  return original.charAt(0).toUpperCase() + original.slice(1)
}

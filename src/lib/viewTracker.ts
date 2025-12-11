// Global view tracker for badge counts
// Stores viewed item ids per category in localStorage and exposes helpers

const KEY_PREFIX = "viewed:";

export type ViewCategory = "file" | "booking" | "inventory" | "todo" | "payroll" | "alert";

function getKey(category: ViewCategory) {
  return `${KEY_PREFIX}${category}`;
}

export function getViewedSet(category: ViewCategory): Set<string> {
  const raw = localStorage.getItem(getKey(category)) || "[]";
  try {
    const arr = JSON.parse(raw);
    return new Set<string>(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set<string>();
  }
}

export function markViewed(category: ViewCategory, id: string) {
  const set = getViewedSet(category);
  set.add(String(id));
  localStorage.setItem(getKey(category), JSON.stringify(Array.from(set)));
  // Emit event for cross-component updates
  window.dispatchEvent(new Event("storage"));
}

export function isViewed(category: ViewCategory, id: string): boolean {
  return getViewedSet(category).has(String(id));
}

export function unmarkViewed(category: ViewCategory, id: string) {
  const set = getViewedSet(category);
  set.delete(String(id));
  localStorage.setItem(getKey(category), JSON.stringify(Array.from(set)));
  // Emit event for cross-component updates
  window.dispatchEvent(new Event("storage"));
}

export function clearViewed(category: ViewCategory) {
  localStorage.removeItem(getKey(category));
}

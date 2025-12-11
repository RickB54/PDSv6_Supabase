export const HELP_BLOCKED_STORAGE_KEY = 'help_blocked_topics_employee';

export function getBlockedTopicsForEmployees(): string[] {
  try {
    const raw = localStorage.getItem(HELP_BLOCKED_STORAGE_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function setBlockedTopicsForEmployees(ids: string[]): void {
  localStorage.setItem(HELP_BLOCKED_STORAGE_KEY, JSON.stringify(ids));
  // Notify listeners to recompute if needed
  try { window.dispatchEvent(new Event('storage')); } catch {}
}


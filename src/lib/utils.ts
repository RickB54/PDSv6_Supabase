import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date/time string or object to Eastern Time (MA/NH) 
 * in 12-hour format (AM/PM).
 */
export const formatETTime = (date: Date | string) => {
  if (!date) return "";
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    }).format(d);
  } catch (e) {
    return d.toLocaleTimeString();
  }
};

/**
 * Formats a date/time string or object to a full date in Eastern Time.
 */
export const formatETDate = (date: Date | string) => {
  if (!date) return "";
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York'
    }).format(d);
  } catch (e) {
    return d.toLocaleDateString();
  }
};

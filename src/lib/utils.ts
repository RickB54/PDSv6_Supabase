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

/**
 * Generates a logical invoice number based on current timestamp (YMMDDHHmm)
 * This fits within 32-bit integer limits (max 2,147,483,647) and provides clear reasoning.
 * Example for May 1, 2026 8:25pm: 605012025
 */
export const generateInvoiceNumber = () => {
  const now = new Date();
  const yearLastDigit = String(now.getFullYear()).slice(-1);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  // Max value will be around 912312359 (Dec 31, 2029)
  return parseInt(`${yearLastDigit}${month}${day}${hour}${minute}`);
};

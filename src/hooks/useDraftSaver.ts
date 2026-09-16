/**
 * useDraftSaver — Abandoned draft capture hook for Booking & Contact forms
 *
 * Saves a lightweight draft to Supabase via the upsert-booking-draft edge function
 * once the visitor has entered enough contact info (name + phone OR email).
 *
 * Fire conditions:
 *   - Blur on name, email, phone, message, etc. (immediate, cancels pending debounce)
 *   - 2.5 s debounce after form data changes
 *   - Never per-keystroke; never before threshold is met; never during real submission
 *
 * Conversion: call markConverted(id) from handleSubmit on success.
 * The edge function patches status → 'converted'.
 * Session key is then cleared from sessionStorage.
 */

import { useRef, useCallback, useEffect } from "react";
import supabase from "@/lib/supabase";

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_SESSION_KEY = "_pds_draft_sid";
const DEBOUNCE_MS = 2500;
const MIN_NAME_LEN = 2;

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidPhone(p?: string): boolean {
  if (!p) return false;
  return p.replace(/\D/g, "").length >= 10;
}

function isValidEmail(e?: string): boolean {
  if (!e) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function hasSufficientContact(name?: string, phone?: string, email?: string): boolean {
  return (
    Boolean(name && name.trim().length >= MIN_NAME_LEN) &&
    (isValidPhone(phone) || isValidEmail(email))
  );
}

function getOrCreateSessionId(storageKey: string): string {
  try {
    let sid = sessionStorage.getItem(storageKey);
    if (!sid) {
      sid = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(storageKey, sid);
    }
    return sid;
  } catch {
    return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ── Hook types ────────────────────────────────────────────────────────────────
export interface DraftFormData {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  make?: string;
  model?: string;
  year?: string;
  color?: string;
  package?: string;
  message?: string;
  preferredTiming?: string;
}

export interface UseDraftSaverOptions {
  source?: "booking" | "contact";
}

export interface UseDraftSaverReturn {
  /** Attach to onBlur of contact/form inputs */
  onContactBlur: () => void;
  /** Call with the real booking/prospect ID after successful form submission */
  markConverted: (recordId?: string) => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useDraftSaver(
  formData: DraftFormData,
  addOns: string[] = [],
  vehicleType: string = "",
  date: Date | undefined = undefined,
  isSubmitting: boolean = false,
  isTestMode: boolean = false,
  options: UseDraftSaverOptions = { source: "booking" }
): UseDraftSaverReturn {
  const source = options.source || "booking";
  const storageKey = `${BASE_SESSION_KEY}_${source}`;

  // Refs for stable callbacks (avoid stale closures in debounce timer)
  const formDataRef = useRef(formData);
  const addOnsRef = useRef(addOns);
  const vehicleTypeRef = useRef(vehicleType);
  const dateRef = useRef(date);
  const isSubmittingRef = useRef(isSubmitting);
  const isTestModeRef = useRef(isTestMode);
  const sourceRef = useRef(source);
  const storageKeyRef = useRef(storageKey);

  // Keep refs in sync on every render
  useEffect(() => { formDataRef.current = formData; });
  useEffect(() => { addOnsRef.current = addOns; });
  useEffect(() => { vehicleTypeRef.current = vehicleType; });
  useEffect(() => { dateRef.current = date; });
  useEffect(() => { isSubmittingRef.current = isSubmitting; });
  useEffect(() => { isTestModeRef.current = isTestMode; });
  useEffect(() => { sourceRef.current = source; });
  useEffect(() => { storageKeyRef.current = storageKey; });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Core save function (reads from refs — always fresh data) ───────────────
  const fireSave = useCallback(async () => {
    // Guards
    if (isSubmittingRef.current) return; // Real submission in progress
    if (isTestModeRef.current) return;   // Admin test/mock fill — never save

    const fd = formDataRef.current;
    if (!hasSufficientContact(fd.name, fd.phone, fd.email)) return;

    const sid = getOrCreateSessionId(storageKeyRef.current);

    try {
      const { error } = await supabase.functions.invoke("upsert-booking-draft", {
        body: {
          session_id: sid,
          name: fd.name?.trim() || null,
          email: fd.email?.trim() || null,
          phone: fd.phone?.trim() || null,
          address: fd.address?.trim() || null,
          city: fd.city?.trim() || null,
          vehicle_make: fd.make || null,
          vehicle_model: fd.model || null,
          vehicle_year: fd.year || null,
          vehicle_type: vehicleTypeRef.current || null,
          vehicle_color: fd.color || null,
          service_package: fd.package || null,
          add_ons: addOnsRef.current.length > 0 ? addOnsRef.current : null,
          preferred_date: dateRef.current ? dateRef.current.toISOString() : null,
          source: sourceRef.current,
          message: fd.message?.trim() || null,
          preferred_timing: fd.preferredTiming?.trim() || null,
        },
      });

      if (error) {
        console.debug("[DraftSaver] save suppressed:", error.message);
      }
    } catch (err) {
      console.debug("[DraftSaver] network error (silent):", err);
    }
  }, []); // Stable — only reads refs

  // ── Debounced save (triggered by form data changes) ────────────────────────
  useEffect(() => {
    if (!hasSufficientContact(formData.name, formData.phone, formData.email)) return;
    if (isSubmitting || isTestMode) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(fireSave, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [
    formData.name, formData.email, formData.phone,
    formData.address, formData.city, formData.make, formData.model,
    formData.year, formData.color, formData.package, formData.message, formData.preferredTiming,
    addOns, vehicleType, date,
    isSubmitting, isTestMode,
    fireSave,
  ]);

  // ── Blur handler (immediate — cancels any pending debounce) ────────────────
  const onContactBlur = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    fireSave();
  }, [fireSave]);

  // ── Conversion — call after a successful form submission ───────────────────
  const markConverted = useCallback(async (recordId?: string) => {
    let sid: string | null = null;
    const currentKey = storageKeyRef.current;
    try {
      sid = sessionStorage.getItem(currentKey);
    } catch {
      return;
    }

    if (!sid) return;

    try {
      await supabase.functions.invoke("upsert-booking-draft", {
        body: {
          session_id: sid,
          status: "converted",
          booking_id: recordId || null,
        },
      });
      console.log(`[DraftSaver] Draft marked converted (${sourceRef.current}) →`, recordId);
    } catch (err) {
      console.debug("[DraftSaver] convert error (non-critical):", err);
    } finally {
      try { sessionStorage.removeItem(currentKey); } catch {}
    }
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return { onContactBlur, markConverted };
}

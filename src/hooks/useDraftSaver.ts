/**
 * useDraftSaver — Abandoned booking draft capture hook
 *
 * Saves a lightweight draft to Supabase via the upsert-booking-draft edge function
 * once the visitor has entered enough contact info (name + phone OR email).
 *
 * Fire conditions:
 *   - Blur on name, email, or phone fields (immediate, cancels pending debounce)
 *   - 2.5 s debounce after any formData/addOns/vehicleType/date change
 *   - Never per-keystroke; never before threshold is met; never during real submission
 *
 * Conversion: call markConverted(bookingId) from handleSubmit on success.
 * The edge function patches status → 'converted' and booking_id → real booking id.
 * Session key is then cleared from sessionStorage.
 */

import { useRef, useCallback, useEffect } from "react";
import supabase from "@/lib/supabase";

// ── Constants ─────────────────────────────────────────────────────────────────
const SESSION_STORAGE_KEY = "_pds_draft_sid";
const DEBOUNCE_MS = 2500;
const MIN_NAME_LEN = 2;

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidPhone(p: string): boolean {
  return p.replace(/\D/g, "").length >= 10;
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function hasSufficientContact(name: string, phone: string, email: string): boolean {
  return (
    name.trim().length >= MIN_NAME_LEN &&
    (isValidPhone(phone) || isValidEmail(email))
  );
}

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    // sessionStorage unavailable (e.g. private mode with cookie blocking)
    return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ── Hook types ────────────────────────────────────────────────────────────────
export interface DraftFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  make: string;
  model: string;
  year: string;
  color: string;
  package: string;
}

export interface UseDraftSaverReturn {
  /** Attach to onBlur of name, email, and phone inputs */
  onContactBlur: () => void;
  /** Call with the real booking ID after successful form submission */
  markConverted: (bookingId: string) => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useDraftSaver(
  formData: DraftFormData,
  addOns: string[],
  vehicleType: string,
  date: Date | undefined,
  isSubmitting: boolean,
  isTestMode: boolean
): UseDraftSaverReturn {
  // Refs for stable callbacks (avoid stale closures in debounce timer)
  const formDataRef = useRef(formData);
  const addOnsRef = useRef(addOns);
  const vehicleTypeRef = useRef(vehicleType);
  const dateRef = useRef(date);
  const isSubmittingRef = useRef(isSubmitting);
  const isTestModeRef = useRef(isTestMode);

  // Keep refs in sync on every render
  useEffect(() => { formDataRef.current = formData; });
  useEffect(() => { addOnsRef.current = addOns; });
  useEffect(() => { vehicleTypeRef.current = vehicleType; });
  useEffect(() => { dateRef.current = date; });
  useEffect(() => { isSubmittingRef.current = isSubmitting; });
  useEffect(() => { isTestModeRef.current = isTestMode; });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Core save function (reads from refs — always fresh data) ───────────────
  const fireSave = useCallback(async () => {
    // Guards
    if (isSubmittingRef.current) return; // Real submission in progress
    if (isTestModeRef.current) return;   // Admin test/mock fill — never save

    const fd = formDataRef.current;
    if (!hasSufficientContact(fd.name, fd.phone, fd.email)) return;

    const sid = getOrCreateSessionId();

    try {
      const { error } = await supabase.functions.invoke("upsert-booking-draft", {
        body: {
          session_id: sid,
          name: fd.name.trim() || null,
          email: fd.email.trim() || null,
          phone: fd.phone.trim() || null,
          address: fd.address.trim() || null,
          vehicle_make: fd.make || null,
          vehicle_model: fd.model || null,
          vehicle_year: fd.year || null,
          vehicle_type: vehicleTypeRef.current || null,
          vehicle_color: fd.color || null,
          service_package: fd.package || null,
          add_ons: addOnsRef.current.length > 0 ? addOnsRef.current : null,
          preferred_date: dateRef.current ? dateRef.current.toISOString() : null,
        },
      });

      if (error) {
        // Rate limited or network failure — silent, never block the user
        console.debug("[DraftSaver] save suppressed:", error.message);
      }
    } catch (err) {
      // Best-effort: network errors are expected and should never surface to the user
      console.debug("[DraftSaver] network error (silent):", err);
    }
  }, []); // Stable — only reads refs

  // ── Debounced save (triggered by formData/addOns/vehicleType/date changes) ──
  useEffect(() => {
    // Don't schedule if threshold not met (no unnecessary timer allocation)
    if (!hasSufficientContact(formData.name, formData.phone, formData.email)) return;
    if (isSubmitting || isTestMode) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(fireSave, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [
    formData.name, formData.email, formData.phone,
    formData.address, formData.make, formData.model,
    formData.year, formData.color, formData.package,
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

  // ── Conversion — call after a successful real booking submission ────────────
  const markConverted = useCallback(async (bookingId: string) => {
    let sid: string | null = null;
    try {
      sid = sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return; // sessionStorage unavailable — nothing to convert
    }

    if (!sid) return; // No draft was ever saved this session

    try {
      await supabase.functions.invoke("upsert-booking-draft", {
        body: {
          session_id: sid,
          status: "converted",
          booking_id: bookingId,
        },
      });
      console.log("[DraftSaver] Draft marked converted → booking", bookingId);
    } catch (err) {
      // Non-critical — the booking already succeeded; this is audit-only
      console.debug("[DraftSaver] convert error (non-critical):", err);
    } finally {
      // Always clear the session key so a fresh form visit creates a new draft
      try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
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

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const SHOP_LAT = 42.7224;
const SHOP_LNG = -71.1529;
const SHOP_ADDRESS = "54 Boston Street, Methuen MA 01844";

export interface DestinationFeeInlineProps {
  /** The customer's full address string to calculate from */
  address: string;
  /** Called whenever a new fee is calculated (miles, fee in $) */
  onFeeCalculated?: (miles: number, fee: number) => void;
  /** Display mode — 'booking' shows $ added to total; 'informational' is softer messaging */
  mode?: 'booking' | 'informational';
  /** If true, the address came from a prior step so we show a read-only "already applied" notice */
  alreadyApplied?: boolean;
  alreadyAppliedMiles?: number;
  alreadyAppliedFee?: number;
  theme?: 'light' | 'dark';
}

function calcFee(miles: number): number {
  if (miles <= 1) return 0;
  return Math.round(miles * 4);
}

export const DestinationFeeInline: React.FC<DestinationFeeInlineProps> = ({
  address,
  onFeeCalculated,
  mode = 'booking',
  alreadyApplied = false,
  alreadyAppliedMiles = 0,
  alreadyAppliedFee = 0,
  theme = 'light',
}) => {
  const [status, setStatus] = useState<'idle' | 'calculating' | 'done' | 'error'>('idle');
  const [miles, setMiles] = useState<number | null>(null);
  const [fee, setFee] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAddressRef = useRef('');

  const isDark = theme === 'dark';

  // ── If fee was already applied upstream (from Services page) ──────────────
  if (alreadyApplied) {
    return (
      <div className={`mt-2 px-3 py-2.5 rounded-lg border flex items-center gap-2.5 text-xs font-semibold
        ${isDark
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
        <CheckCircle className="h-4 w-4 shrink-0 text-amber-500" />
        <span>
          Destination fee already calculated from Services page:&nbsp;
          <strong>${alreadyAppliedFee}</strong>
          {alreadyAppliedMiles > 0 && ` (${alreadyAppliedMiles} mi)`}
          &nbsp;— included in your total.
        </span>
      </div>
    );
  }

  // ── Auto-calculate on address change (debounced 900ms) ────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = address?.trim() || '';
    if (!trimmed || trimmed.length < 5) {
      setStatus('idle');
      setMiles(null);
      setFee(0);
      if (onFeeCalculated) onFeeCalculated(0, 0);
      return;
    }

    // Don't recalculate if address hasn't meaningfully changed
    if (trimmed === lastAddressRef.current) return;

    debounceRef.current = setTimeout(async () => {
      lastAddressRef.current = trimmed;
      setStatus('calculating');
      setErrorMsg('');

      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const geoData = await geoRes.json();
        if (!geoData || geoData.length === 0) {
          setStatus('error');
          setErrorMsg('Address not found — please check it and try again.');
          setMiles(null);
          setFee(0);
          if (onFeeCalculated) onFeeCalculated(0, 0);
          return;
        }

        const lat = parseFloat(geoData[0].lat);
        const lon = parseFloat(geoData[0].lon);

        let drivingMiles = 0;
        try {
          const routeRes = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${lon},${lat};${SHOP_LNG},${SHOP_LAT}?overview=false`
          );
          const routeData = await routeRes.json();
          if (routeData?.routes?.length > 0) {
            drivingMiles = Math.max(0.1, Math.round((routeData.routes[0].distance / 1609.344) * 10) / 10);
          }
        } catch {
          // Haversine fallback
          const R = 3958.8;
          const dLat = (lat - SHOP_LAT) * (Math.PI / 180);
          const dLon = (lon - SHOP_LNG) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(SHOP_LAT * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
          drivingMiles = Math.max(0.1, Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 0.83 * 10) / 10);
        }

        const calculatedFee = calcFee(drivingMiles);
        setMiles(drivingMiles);
        setFee(calculatedFee);
        setStatus('done');
        if (onFeeCalculated) onFeeCalculated(drivingMiles, calculatedFee);
      } catch (e) {
        setStatus('error');
        setErrorMsg('Distance service unavailable. Fee will be calculated manually.');
        if (onFeeCalculated) onFeeCalculated(0, 0);
      }
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [address]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <p className={`mt-1.5 text-[11px] flex items-center gap-1.5 font-medium
        ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <MapPin className="h-3 w-3 shrink-0" />
        Enter your address above to see your destination fee from our shop.
      </p>
    );
  }

  if (status === 'calculating') {
    return (
      <p className={`mt-1.5 text-[11px] flex items-center gap-1.5 font-medium animate-pulse
        ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
        Calculating distance from {SHOP_ADDRESS}…
      </p>
    );
  }

  if (status === 'error') {
    return (
      <p className={`mt-1.5 text-[11px] flex items-center gap-1.5 font-medium
        ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
        {errorMsg}
      </p>
    );
  }

  // status === 'done'
  if (miles !== null && miles <= 1) {
    return (
      <div className={`mt-2 px-3 py-2.5 rounded-lg border flex items-center gap-2.5 text-xs font-semibold
        ${isDark
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
        <span>
          You're within 1 mile of our shop ({miles} mi) - <strong>no destination fee!</strong>
        </span>
      </div>
    );
  }

  // > 1 mile — show fee
  return (
    <div className={`mt-2 px-3 py-3 rounded-lg border space-y-1
      ${isDark
        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
        : 'bg-amber-50 border-amber-300 text-amber-900'
      }`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          {miles} miles from our shop (54 Boston St, Methuen MA)
        </span>
        <span className={`text-sm font-black ml-3 shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
          ${fee} fee
        </span>
      </div>
      <p className={`text-[11px] font-medium leading-relaxed
        ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>
        {mode === 'booking'
          ? `A $${fee} destination fee has been added to your total. This covers travel to your location.`
          : `When you book, a $${fee} destination fee will be added to cover travel to your location. No surprises!`
        }
      </p>
    </div>
  );
};

export default DestinationFeeInline;

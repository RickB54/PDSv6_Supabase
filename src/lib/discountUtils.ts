export const calculateDiscount = (price: number, discountValue: number, discountType: 'percentage' | 'percent' | 'fixed' | 'dollar' | 'custom' | string): number => {
  if (!price || !discountValue) return 0;
  if (discountType === 'fixed' || discountType === 'dollar' || discountType === 'custom') {
    return Math.round(discountValue);
  }
  return Math.round(price * (discountValue / 100));
};

export const applyDiscount = (price: number, discountValue: number, discountType: 'percentage' | 'percent' | 'fixed' | 'dollar' | 'custom' | string): number => {
  if (!price) return 0;
  const discountAmount = calculateDiscount(price, discountValue, discountType);
  return Math.max(0, Math.round(price - discountAmount));
};

export interface BookingPricingResult {
  subtotal: number;
  discountAmount: number;
  total: number;
}

/**
 * Shared canonical pricing calculator for bookings.
 * Guarantees subtotal - discountAmount === total across all UI modals, lists, logs, and PDFs.
 */
export const calculateBookingPricing = (
  subtotal: number,
  discountValue: number,
  discountType: string
): BookingPricingResult => {
  const safeSubtotal = Math.max(0, Math.round(subtotal || 0));
  const discountAmount = calculateDiscount(safeSubtotal, discountValue, discountType);
  const total = Math.max(0, safeSubtotal - discountAmount);

  return {
    subtotal: safeSubtotal,
    discountAmount,
    total
  };
};



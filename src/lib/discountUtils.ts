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
  servicePrice: number;
  addonsTotal: number;
  subtotal: number;
  discountAmount: number;
  discountedServicePrice: number;
  destinationFee: number;
  total: number;
}

/**
 * Shared canonical pricing calculator for bookings, estimates, and invoices.
 * Enforces rule: ALL discounts apply to DETAIL SERVICES ONLY, NOT add-ons!
 * Formula:
 * - discountAmount = discount applied to servicePrice ONLY
 * - discountedServicePrice = servicePrice - discountAmount
 * - subtotal = servicePrice + addonsTotal
 * - total = discountedServicePrice + addonsTotal + destinationFee
 */
export const calculateBookingPricing = (
  servicePrice: number,
  discountValue: number = 0,
  discountType: string = 'percent',
  addonsTotal: number = 0,
  destinationFee: number = 0
): BookingPricingResult => {
  const addons = Math.max(0, Math.round(addonsTotal || 0));
  const destFee = Math.max(0, Math.round(destinationFee || 0));
  const svcPrice = Math.max(0, Math.round(servicePrice || 0));

  const discountAmount = calculateDiscount(svcPrice, discountValue, discountType);
  const discountedServicePrice = Math.max(0, svcPrice - discountAmount);
  const subtotal = svcPrice + addons;
  const total = Math.max(0, discountedServicePrice + addons + destFee);

  return {
    servicePrice: svcPrice,
    addonsTotal: addons,
    subtotal,
    discountAmount,
    discountedServicePrice,
    destinationFee: destFee,
    total
  };
};



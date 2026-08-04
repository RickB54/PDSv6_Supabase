export const calculateDiscount = (price: number, discountValue: number, discountType: 'percentage' | 'percent' | 'fixed' | 'dollar' | string): number => {
  if (!price) return 0;
  if (!discountValue) return 0;
  if (discountType === 'fixed' || discountType === 'dollar') return discountValue;
  // Calculate percentage and round to nearest whole dollar to prevent messy decimals
  return Math.round(price * (discountValue / 100));
};

export const applyDiscount = (price: number, discountValue: number, discountType: 'percentage' | 'percent' | 'fixed' | 'dollar' | string): number => {
  if (!price) return 0;
  const discountAmount = calculateDiscount(price, discountValue, discountType);
  return Math.max(0, price - discountAmount);
};

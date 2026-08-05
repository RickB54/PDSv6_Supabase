export const calculateDiscount = (price: number, discountValue: number, discountType: 'percentage' | 'percent' | 'fixed' | 'dollar' | string): number => {
  if (!price) return 0;
  if (!discountValue) return 0;
  if (discountType === 'fixed' || discountType === 'dollar') return Math.ceil(discountValue);
  
  return Math.ceil(price * (discountValue / 100));
};

export const applyDiscount = (price: number, discountValue: number, discountType: 'percentage' | 'percent' | 'fixed' | 'dollar' | string): number => {
  if (!price) return 0;
  const discountAmount = calculateDiscount(price, discountValue, discountType);
  return Math.max(0, Math.ceil(price) - discountAmount);
};

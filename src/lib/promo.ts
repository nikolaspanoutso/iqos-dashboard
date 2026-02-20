/**
 * Checks if a shop name indicates a Promo shop based on the " (*)" suffix.
 */
export function isPromo(shopName: string): boolean {
  if (!shopName) return false;
  return shopName.trim().endsWith('(*)');
}

/**
 * Adds or removes the " (*)" suffix from a shop name.
 */
export function togglePromoSuffix(shopName: string, status: boolean): string {
  if (!shopName) return "";
  
  const suffix = ' (*)';
  const cleanName = shopName.replace(' (*)', '').trim();
  
  if (status) {
    return `${cleanName}${suffix}`;
  } else {
    return cleanName;
  }
}

/**
 * Checks if a shop name indicates a Promo shop based on a trailing asterisk.
 * Returns true if it ends with '*' or ' (*)'
 */
export function isPromo(shopName: string): boolean {
  if (!shopName) return false;
  const name = shopName.trim();
  return name.endsWith('*') || name.endsWith('(*)');
}

/**
 * Adds or removes the '*' suffix from a shop name.
 */
export function togglePromoSuffix(shopName: string, status: boolean): string {
  if (!shopName) return "";
  
  const suffix = '*';
  // Remove both variants if present
  let cleanName = shopName.replace(' (*)', '').trim();
  if (cleanName.endsWith('*')) {
      cleanName = cleanName.slice(0, -1).trim();
  }
  
  if (status) {
    return `${cleanName}${suffix}`;
  } else {
    return cleanName;
  }
}

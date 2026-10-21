/**
 * Frontend Utilities
 */

export function formatPrice(price: number | string): string {
  return Number(price || 0).toFixed(2);
}

export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

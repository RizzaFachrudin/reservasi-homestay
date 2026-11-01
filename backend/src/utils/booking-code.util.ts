/**
 * Generate unique booking code
 * Format: HSR-YYYYMMDD-XXXX
 * Example: HSR-20241028-A1B2
 */
export const generateBookingCode = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  // Generate random alphanumeric string (4 characters)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `HSR-${year}${month}${day}-${random}`;
};

/**
 * Validate booking code format
 */
export const isValidBookingCode = (code: string): boolean => {
  const pattern = /^HSR-\d{8}-[A-Z0-9]{4}$/;
  return pattern.test(code);
};

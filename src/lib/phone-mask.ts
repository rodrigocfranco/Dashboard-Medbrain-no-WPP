import type { Row } from './db';

const PHONE_COLUMNS = [
  'phone',
  'referrer_phone',
  'referred_phone',
  'telefone_usuario',
  'session_id',
];

const PHONE_REGEX = /^\d{10,13}$/;

export function maskPhone(phone: string): string {
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 10) return phone;

  // Format: +55 11 9****-1234
  if (digits.length >= 12) {
    const country = digits.slice(0, 2);
    const area = digits.slice(2, 4);
    const last4 = digits.slice(-4);
    return `+${country} ${area} 9****-${last4}`;
  }

  // 11 digits (BR mobile without country code)
  if (digits.length === 11) {
    const area = digits.slice(0, 2);
    const last4 = digits.slice(-4);
    return `(${area}) 9****-${last4}`;
  }

  // 10 digits (BR landline)
  const area = digits.slice(0, 2);
  const last4 = digits.slice(-4);
  return `(${area}) ****-${last4}`;
}

export function maskPhoneColumns(rows: Row[]): Row[] {
  if (!rows || rows.length === 0) return rows;

  return rows.map((row) => {
    const masked = { ...row };
    for (const key of Object.keys(masked)) {
      const value = masked[key];
      if (typeof value !== 'string') continue;

      const isPhoneColumn = PHONE_COLUMNS.includes(key.toLowerCase());
      const looksLikePhone = key === 'session_id' ? PHONE_REGEX.test(value) : isPhoneColumn;

      if (looksLikePhone || isPhoneColumn) {
        masked[key] = maskPhone(value);
      }
    }
    return masked;
  });
}

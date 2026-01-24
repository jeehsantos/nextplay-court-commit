// Common validation utilities for forms across the application

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 * Requirements: At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates phone number (New Zealand format)
 */
export const validatePhoneNZ = (phone: string): boolean => {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, "");
  
  // NZ phone numbers: 
  // Mobile: 02x xxx xxxx (10 digits)
  // Landline: 0x xxx xxxx (9 digits)
  const mobileRegex = /^02[0-9]{8}$/;
  const landlineRegex = /^0[3-9][0-9]{7}$/;
  
  return mobileRegex.test(cleaned) || landlineRegex.test(cleaned);
};

/**
 * Validates URL format
 */
export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitizes user input to prevent XSS
 * Note: React already escapes content by default, but this is for extra safety
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/**
 * Validates numeric input (positive numbers only)
 */
export const validatePositiveNumber = (value: string | number): boolean => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
};

/**
 * Validates price format (max 2 decimal places)
 */
export const validatePrice = (price: string | number): boolean => {
  const priceStr = typeof price === "number" ? price.toString() : price;
  const priceRegex = /^\d+(\.\d{1,2})?$/;
  return priceRegex.test(priceStr) && parseFloat(priceStr) >= 0;
};

/**
 * Validates time format (HH:MM)
 */
export const validateTime = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Validates date is not in the past
 */
export const validateFutureDate = (date: Date | string): boolean => {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate >= today;
};

/**
 * Validates string length
 */
export const validateLength = (
  str: string,
  min: number,
  max?: number
): { isValid: boolean; error?: string } => {
  if (str.length < min) {
    return {
      isValid: false,
      error: `Must be at least ${min} characters`,
    };
  }
  if (max && str.length > max) {
    return {
      isValid: false,
      error: `Must be no more than ${max} characters`,
    };
  }
  return { isValid: true };
};

/**
 * Validates credit card number (basic Luhn algorithm)
 */
export const validateCreditCard = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\s/g, "");
  
  if (!/^\d+$/.test(cleaned)) return false;
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Validates postal code (New Zealand format)
 */
export const validatePostalCodeNZ = (postalCode: string): boolean => {
  // NZ postal codes are 4 digits
  const postalRegex = /^\d{4}$/;
  return postalRegex.test(postalCode);
};

/**
 * Rate limiting helper for form submissions
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canAttempt(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

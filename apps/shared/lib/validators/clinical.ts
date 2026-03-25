// ============================================================
// ATTENDING AI - Clinical Data Validators
// apps/shared/lib/validators/clinical.ts
//
// Healthcare-specific validation for MRN, ICD-10, NPI, LOINC,
// CPT, RxNorm, DEA, DOB, phone numbers.
// ============================================================

export interface ValidationResult {
  valid: boolean;
  value: string;
  normalized?: string;
  errors: string[];
  warnings: string[];
}

// ---- MRN ----

export function validateMRN(
  mrn: string,
  options: { prefix?: string; minLength?: number; maxLength?: number } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = mrn?.trim() || '';
  if (!trimmed) return { valid: false, value: '', errors: ['MRN is required'], warnings };

  const minLen = options.minLength || 3;
  const maxLen = options.maxLength || 20;
  if (trimmed.length < minLen) errors.push(`MRN must be at least ${minLen} characters`);
  if (trimmed.length > maxLen) errors.push(`MRN must be at most ${maxLen} characters`);
  if (!/^[A-Za-z0-9\-._]+$/.test(trimmed)) errors.push('MRN may only contain letters, numbers, dashes, dots, and underscores');
  if (options.prefix && !trimmed.startsWith(options.prefix)) errors.push(`MRN must start with prefix: ${options.prefix}`);
  if (/^0+$/.test(trimmed)) warnings.push('MRN is all zeros — likely a placeholder');

  return { valid: errors.length === 0, value: trimmed, normalized: trimmed.toUpperCase(), errors, warnings };
}

// ---- ICD-10-CM ----

export function validateICD10(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = code?.trim().toUpperCase() || '';
  if (!trimmed) return { valid: false, value: '', errors: ['ICD-10 code is required'], warnings };

  const normalized = trimmed.replace(/\./g, '');
  if (!/^[A-TV-Z]\d{2}[A-Z0-9]{0,4}$/.test(normalized)) {
    errors.push('Invalid ICD-10-CM format. Expected: letter + 2 digits + optional 0-4 chars (e.g., E11.65, J18.9)');
  }
  const display = normalized.length > 3 ? normalized.slice(0, 3) + '.' + normalized.slice(3) : normalized;
  if (['Z99', 'R69', 'Z039'].includes(normalized.slice(0, 3))) warnings.push('This appears to be a non-specific/placeholder code');

  return { valid: errors.length === 0, value: trimmed, normalized: display, errors, warnings };
}

// ---- NPI ----

export function validateNPI(npi: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = npi?.trim().replace(/[\s-]/g, '') || '';
  if (!trimmed) return { valid: false, value: '', errors: ['NPI is required'], warnings };
  if (!/^\d{10}$/.test(trimmed)) { errors.push('NPI must be exactly 10 digits'); return { valid: false, value: trimmed, errors, warnings }; }
  if (trimmed[0] !== '1' && trimmed[0] !== '2') errors.push('NPI must start with 1 (individual) or 2 (organization)');
  if (!luhnCheck('80840' + trimmed)) errors.push('NPI failed Luhn check digit validation');

  const type = trimmed[0] === '1' ? 'individual' : 'organization';
  return { valid: errors.length === 0, value: trimmed, normalized: trimmed, errors, warnings: [...warnings, `Type: ${type} provider`] };
}

function luhnCheck(num: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i], 10);
    if (alternate) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// ---- LOINC ----

export function validateLOINC(code: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = code?.trim() || '';
  if (!trimmed) return { valid: false, value: '', errors: ['LOINC code is required'], warnings: [] };
  if (!/^\d{1,5}-\d$/.test(trimmed)) errors.push('Invalid LOINC format. Expected: 1-5 digits, dash, check digit (e.g., 2160-0)');
  return { valid: errors.length === 0, value: trimmed, normalized: trimmed, errors, warnings: [] };
}

// ---- CPT ----

export function validateCPT(code: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = code?.trim().toUpperCase() || '';
  if (!trimmed) return { valid: false, value: '', errors: ['CPT code is required'], warnings: [] };
  if (!/^\d{4}[0-9FTU]$/.test(trimmed)) errors.push('Invalid CPT format. Expected: 5 digits or 4 digits + F/T/U (e.g., 99213, 0001F)');
  return { valid: errors.length === 0, value: trimmed, normalized: trimmed, errors, warnings: [] };
}

// ---- RxNorm ----

export function validateRxNorm(rxcui: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = rxcui?.trim() || '';
  if (!trimmed) return { valid: false, value: '', errors: ['RxNorm RXCUI is required'], warnings: [] };
  if (!/^\d{3,8}$/.test(trimmed)) errors.push('Invalid RxNorm RXCUI format. Expected: 3-8 digits');
  return { valid: errors.length === 0, value: trimmed, normalized: trimmed, errors, warnings: [] };
}

// ---- DEA ----

export function validateDEA(dea: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = dea?.trim().toUpperCase() || '';
  if (!trimmed) return { valid: false, value: '', errors: ['DEA number is required'], warnings: [] };
  if (!/^[ABCDFGM][A-Z]\d{7}$/.test(trimmed)) {
    errors.push('Invalid DEA format. Expected: 2 letters + 7 digits (e.g., AB1234567)');
    return { valid: false, value: trimmed, errors, warnings: [] };
  }
  const digits = trimmed.slice(2).split('').map(Number);
  const sum1 = digits[0] + digits[2] + digits[4];
  const sum2 = digits[1] + digits[3] + digits[5];
  const checkDigit = (sum1 + sum2 * 2) % 10;
  if (checkDigit !== digits[6]) errors.push('DEA check digit validation failed');

  return { valid: errors.length === 0, value: trimmed, normalized: trimmed, errors, warnings: [] };
}

// ---- Date of Birth ----

export function validateDOB(dob: string | Date): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let date: Date;
  if (dob instanceof Date) {
    date = dob;
  } else {
    const str = String(dob).trim();
    if (/^\d{8}$/.test(str)) {
      date = new Date(`${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [m, d, y] = str.split('/');
      date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    } else {
      date = new Date(str);
    }
  }

  if (isNaN(date.getTime())) return { valid: false, value: String(dob), errors: ['Invalid date format'], warnings };

  const now = new Date();
  const ageYears = (now.getTime() - date.getTime()) / (365.25 * 86_400_000);
  if (date > now) errors.push('Date of birth cannot be in the future');
  if (ageYears > 130) errors.push('Date of birth indicates age over 130 years');
  if (ageYears > 110 && errors.length === 0) warnings.push('Patient age exceeds 110 years — verify accuracy');
  if (date.getFullYear() < 1900) warnings.push('Date of birth before 1900 — verify accuracy');

  return { valid: errors.length === 0, value: String(dob), normalized: date.toISOString().slice(0, 10), errors, warnings };
}

// ---- Phone ----

export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = phone?.trim() || '';
  if (!trimmed) return { valid: false, value: '', errors: ['Phone number is required'], warnings: [] };

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) errors.push('Phone number must have at least 10 digits');
  if (digits.length > 15) errors.push('Phone number must not exceed 15 digits');

  let normalized: string;
  if (digits.length === 10) normalized = `+1${digits}`;
  else if (digits.length === 11 && digits.startsWith('1')) normalized = `+${digits}`;
  else normalized = `+${digits}`;

  return { valid: errors.length === 0, value: trimmed, normalized, errors, warnings: [] };
}

// ---- Composite ----

export function validateClinicalRecord(record: Record<string, any>, rules: Record<string, string>): {
  valid: boolean; fields: Record<string, ValidationResult>; errorCount: number; warningCount: number;
} {
  const fields: Record<string, ValidationResult> = {};
  let errorCount = 0;
  let warningCount = 0;

  const validators: Record<string, (v: string) => ValidationResult> = {
    mrn: validateMRN, icd10: validateICD10, npi: validateNPI, loinc: validateLOINC,
    cpt: validateCPT, rxnorm: validateRxNorm, dea: validateDEA, dob: validateDOB, phone: validatePhone,
  };

  for (const [fieldName, validatorName] of Object.entries(rules)) {
    const value = record[fieldName];
    const validator = validators[validatorName];
    if (!validator) { fields[fieldName] = { valid: false, value: String(value), errors: [`Unknown validator: ${validatorName}`], warnings: [] }; errorCount++; continue; }
    if (value === null || value === undefined || value === '') continue;

    const result = validator(String(value));
    fields[fieldName] = result;
    errorCount += result.errors.length;
    warningCount += result.warnings.length;
  }

  return { valid: errorCount === 0, fields, errorCount, warningCount };
}

export default {
  validateMRN, validateICD10, validateNPI, validateLOINC, validateCPT,
  validateRxNorm, validateDEA, validateDOB, validatePhone, validateClinicalRecord,
};

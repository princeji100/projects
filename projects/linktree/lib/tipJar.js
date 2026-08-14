/**
 * Centralized Tip Jar Validation and Sanitization Engine
 * Zero paid-API, server-validated UPI tip jar configuration.
 */

// Reasonable bounds for safe configuration
const MAX_UPI_LENGTH = 100;
const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 200;
const MAX_TIP_AMOUNT = 100000; // ₹1,00,000 max single tip

// VPA regex: user part @ handle part, alphanumeric with allowed separators, no whitespace/protocols
const VPA_REGEX = /^[a-zA-Z0-9.\-_]{1,64}@[a-zA-Z0-9.\-]{2,35}$/;
const AMOUNT_REGEX = /^\d+(\.\d{1,2})?$/;

/**
 * Validates a UPI ID / Virtual Payment Address (VPA).
 *
 * @param {string | null | undefined} value
 * @returns {{ ok: boolean, upiId?: string, error?: string }}
 */
export function validateUpiId(value) {
  if (value === null || value === undefined || typeof value !== 'string') {
    return { ok: false, error: 'UPI ID must be a valid text string' };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: 'UPI ID cannot be empty' };
  }

  if (trimmed.length > MAX_UPI_LENGTH) {
    return { ok: false, error: `UPI ID cannot exceed ${MAX_UPI_LENGTH} characters` };
  }

  // Reject URLs, script tags, or control characters
  if (
    trimmed.includes('://') ||
    trimmed.includes('<') ||
    trimmed.includes('>') ||
    trimmed.includes(' ') ||
    trimmed.includes('\t') ||
    trimmed.includes('\n')
  ) {
    return { ok: false, error: 'UPI ID contains invalid characters or URLs' };
  }

  // Must have exactly one '@'
  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { ok: false, error: 'UPI ID must contain exactly one "@" separator (e.g. username@bank)' };
  }

  const [account, handle] = parts;
  if (!account || !handle) {
    return { ok: false, error: 'UPI ID must have both an account name and a handle' };
  }

  if (!VPA_REGEX.test(trimmed)) {
    return { ok: false, error: 'Invalid UPI ID format (e.g. name@okhdfcbank or 9876543210@paytm)' };
  }

  return { ok: true, upiId: trimmed };
}

/**
 * Validates and normalizes an optional suggested tip amount in INR.
 *
 * @param {string | number | null | undefined} value
 * @returns {{ ok: boolean, amount: string, error?: string }}
 */
export function normalizeTipAmount(value) {
  if (value === null || value === undefined || value === '') {
    return { ok: true, amount: '' };
  }

  const str = String(value).trim();
  if (!str) {
    return { ok: true, amount: '' };
  }

  // Reject currency symbols, commas, negative signs, exponent notation
  if (
    str.includes('₹') ||
    str.includes('$') ||
    str.includes(',') ||
    str.includes('-') ||
    str.toLowerCase().includes('e')
  ) {
    return { ok: false, amount: '', error: 'Amount must be a clean numeric value without currency symbols or commas' };
  }

  if (!AMOUNT_REGEX.test(str)) {
    return { ok: false, amount: '', error: 'Amount must be a positive number with up to 2 decimal places' };
  }

  const parsed = parseFloat(str);
  if (isNaN(parsed) || parsed <= 0) {
    return { ok: false, amount: '', error: 'Tip amount must be greater than zero' };
  }

  if (parsed > MAX_TIP_AMOUNT) {
    return { ok: false, amount: '', error: `Tip amount cannot exceed ₹${MAX_TIP_AMOUNT.toLocaleString('en-IN')}` };
  }

  // Store normalized string representation
  return { ok: true, amount: str };
}

/**
 * Sanitizes and validates the full Tip Jar configuration object.
 *
 * @param {Object} raw
 * @returns {{ ok: boolean, config?: Object, error?: string }}
 */
export function sanitizeTipJarConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      ok: true,
      config: {
        enabled: false,
        upiId: '',
        name: '',
        amount: '',
        message: '',
      },
    };
  }

  const enabled = Boolean(
    raw.enabled === true ||
    raw.enabled === 'true' ||
    raw.enabled === '1' ||
    raw.enabled === 1 ||
    raw.enabled === 'on'
  );

  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, MAX_NAME_LENGTH) : '';
  const message = typeof raw.message === 'string' ? raw.message.trim().slice(0, MAX_MESSAGE_LENGTH) : '';

  const amountRes = normalizeTipAmount(raw.amount);
  if (!amountRes.ok) {
    return { ok: false, error: amountRes.error };
  }

  const rawUpiId = typeof raw.upiId === 'string' ? raw.upiId.trim() : '';

  if (enabled) {
    if (!rawUpiId) {
      return { ok: false, error: 'A valid UPI ID is required when Tip Jar is enabled' };
    }

    const upiRes = validateUpiId(rawUpiId);
    if (!upiRes.ok) {
      return { ok: false, error: upiRes.error };
    }

    return {
      ok: true,
      config: {
        enabled: true,
        upiId: upiRes.upiId,
        name,
        amount: amountRes.amount,
        message,
      },
    };
  }

  // When disabled: preserve previously entered metadata without blocking save
  let cleanUpi = '';
  if (rawUpiId) {
    const upiRes = validateUpiId(rawUpiId);
    cleanUpi = upiRes.ok ? upiRes.upiId : rawUpiId.slice(0, MAX_UPI_LENGTH);
  }

  return {
    ok: true,
    config: {
      enabled: false,
      upiId: cleanUpi,
      name,
      amount: amountRes.amount,
      message,
    },
  };
}

/**
 * Builds a deterministic, generic UPI payment intent URI (upi://pay?...).
 * Uses URLSearchParams for safe encoding of all parameters without raw string interpolation.
 *
 * @param {Object} config
 * @param {string} [config.upiId] - Mandatory VPA
 * @param {string} [config.name] - Optional Payee Name
 * @param {string} [config.amount] - Optional Amount in INR
 * @param {string} [config.message] - Optional Payment Note
 * @returns {string} - e.g. "upi://pay?pa=creator%40upi&pn=Prince&am=100&tn=Chai&cu=INR"
 */
export function buildUpiPaymentUri(config) {
  if (!config || typeof config !== 'object') {
    return '';
  }

  const rawUpiId = typeof config.upiId === 'string' ? config.upiId.trim() : '';
  const upiRes = validateUpiId(rawUpiId);
  if (!upiRes.ok || !upiRes.upiId) {
    return '';
  }

  const params = new URLSearchParams();
  params.set('pa', upiRes.upiId);

  if (typeof config.name === 'string' && config.name.trim()) {
    params.set('pn', config.name.trim().slice(0, MAX_NAME_LENGTH));
  }

  if (config.amount) {
    const amountRes = normalizeTipAmount(config.amount);
    if (amountRes.ok && amountRes.amount) {
      params.set('am', amountRes.amount);
    }
  }

  if (typeof config.message === 'string' && config.message.trim()) {
    params.set('tn', config.message.trim().slice(0, MAX_MESSAGE_LENGTH));
  }

  params.set('cu', 'INR');

  return `upi://pay?${params.toString()}`;
}


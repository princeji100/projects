/**
 * Platform Owner / Admin Configuration & Authorization
 */

export const DEFAULT_ADMIN_EMAIL = 'princesrivastav216@gmail.com';

export function getAdminEmail() {
  const envAdmin = process.env.ADMIN_EMAIL;
  if (envAdmin && typeof envAdmin === 'string' && envAdmin.trim()) {
    return envAdmin.toLowerCase().trim();
  }
  return DEFAULT_ADMIN_EMAIL.toLowerCase().trim();
}

export function isUserAdmin(email) {
  if (!email || typeof email !== 'string') return false;
  const adminEmail = getAdminEmail();
  return email.toLowerCase().trim() === adminEmail;
}

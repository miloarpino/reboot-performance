import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const PASSWORD_RECOVERY_COOKIE = "reboot-password-recovery";
export const PASSWORD_RECOVERY_MAX_AGE_SECONDS = 10 * 60;

type PasswordValidation = { valid: true } | { valid: false; message: string };

export function validateNewPassword(password: string, confirmation: string): PasswordValidation {
  if (password !== confirmation) {
    return { valid: false, message: "Les deux mots de passe ne correspondent pas." };
  }

  if (
    password.length < 12
    || !/[a-z]/.test(password)
    || !/[A-Z]/.test(password)
    || !/\d/.test(password)
    || !/[^A-Za-z0-9\s]/.test(password)
    || /\s/.test(password)
  ) {
    return {
      valid: false,
      message: "Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial, sans espace."
    };
  }

  return { valid: true };
}

export function getPasswordRecoveryRedirectUrl() {
  const configuredOrigin = process.env.APP_URL;
  const origin = process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : configuredOrigin;

  if (!origin) {
    throw new Error("PASSWORD_RECOVERY_APP_URL_MISSING");
  }

  const redirectUrl = new URL("/auth/callback", origin);
  const isLocalDevelopment = redirectUrl.protocol === "http:" && redirectUrl.hostname === "localhost";
  if (redirectUrl.protocol !== "https:" && !isLocalDevelopment) {
    throw new Error("PASSWORD_RECOVERY_APP_URL_INVALID");
  }

  redirectUrl.searchParams.set("flow", "recovery");
  return redirectUrl.toString();
}

export function createPasswordRecoveryCookieValue(userId: string) {
  const expiresAt = Date.now() + PASSWORD_RECOVERY_MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}.${randomUUID()}`;
  return `${payload}.${signRecoveryPayload(payload)}`;
}

export function isValidPasswordRecoveryCookie(value: string | undefined, userId: string) {
  if (!value) return false;

  const [cookieUserId, expiresAtRaw, nonce, signature, ...extra] = value.split(".");
  if (!cookieUserId || !expiresAtRaw || !nonce || !signature || extra.length) return false;
  if (cookieUserId !== userId) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;

  const expected = signRecoveryPayload(`${cookieUserId}.${expiresAtRaw}.${nonce}`);
  const receivedBytes = Buffer.from(signature, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

export function passwordRecoveryCookieOptions() {
  return {
    httpOnly: true,
    maxAge: PASSWORD_RECOVERY_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

function signRecoveryPayload(payload: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("PASSWORD_RECOVERY_SIGNING_KEY_MISSING");
  }

  return createHmac("sha256", secret).update(payload).digest("hex");
}

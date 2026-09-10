import type { VerifiedUser } from "./admin-access";

interface AuthError {
  message: string;
}

export interface PasswordAuthGateway {
  signInWithPassword(credentials: { email: string; password: string }): Promise<{ error: AuthError | null }>;
}

export interface LogoutAuthGateway {
  signOut(options: { scope: "local" }): Promise<{ error: AuthError | null }>;
}

export type AuthActionResult = { ok: true } | { ok: false; error: string };

export async function loginWithPassword(
  auth: PasswordAuthGateway,
  email: string,
  password: string,
): Promise<AuthActionResult> {
  try {
    const { error } = await auth.signInWithPassword({ email, password });
    return error ? { ok: false, error: "Invalid email or password." } : { ok: true };
  } catch {
    return { ok: false, error: "Invalid email or password." };
  }
}

export async function logoutLocally(
  auth: LogoutAuthGateway,
  user: VerifiedUser | null,
): Promise<AuthActionResult> {
  if (!user) return { ok: true };
  try {
    const { error } = await auth.signOut({ scope: "local" });
    return error ? { ok: false, error: "Unable to sign out. Please try again." } : { ok: true };
  } catch {
    return { ok: false, error: "Unable to sign out. Please try again." };
  }
}

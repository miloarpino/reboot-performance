import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  createPasswordRecoveryCookieValue,
  PASSWORD_RECOVERY_COOKIE,
  passwordRecoveryCookieOptions
} from "../../../lib/auth/password-recovery";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flow = request.nextUrl.searchParams.get("flow");

  if (!code || flow !== "recovery") {
    return invalidRecoveryRedirect(request);
  }

  const successUrl = new URL("/reset-password", request.url);
  const response = NextResponse.redirect(successUrl);
  response.headers.set("Cache-Control", "private, no-store");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !publishableKey) {
    return invalidRecoveryRedirect(request);
  }

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof response.cookies.set>[2] }>) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user || !data.session) {
    return invalidRecoveryRedirect(request);
  }

  response.cookies.set(
    PASSWORD_RECOVERY_COOKIE,
    createPasswordRecoveryCookieValue(data.user.id),
    passwordRecoveryCookieOptions()
  );
  return response;
}

function invalidRecoveryRedirect(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?error=recovery_link_invalid", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(PASSWORD_RECOVERY_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

import { NextResponse } from "next/server";
import packageJson from "../../../package.json";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
      || process.env.VERCEL_GIT_COMMIT_SHA
      || packageJson.version,
    builtAt: process.env.VERCEL_GIT_COMMIT_SHA ? null : packageJson.version
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// HTTP Basic auth over the whole app. The studio triggers paid image generation on
// every run, so it must not sit open on the internet.
//
// Deliberately NOT protected:
//   /lp/*        tailored landing pages — the entire point is to send them to a prospect
//   /ben-*.png   brand assets those pages load
//
// In production the app refuses to serve at all if APP_USER/APP_PASSWORD are unset,
// rather than silently running unauthenticated. In development auth is skipped unless
// they are set, so `npm run dev` needs no setup.

const PUBLIC_PREFIXES = ["/lp/", "/ben-", "/_next/", "/favicon"];

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Ben Ad Studio", charset="UTF-8"' },
  });
}

/** Constant-time-ish comparison; avoids leaking length/prefix through timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const user = process.env.APP_USER;
  const pass = process.env.APP_PASSWORD;

  if (!user || !pass) {
    if (process.env.NODE_ENV === "production") {
      console.error("[auth] APP_USER/APP_PASSWORD are not set — refusing to serve in production.");
      return new NextResponse(
        "This deployment is not configured. Set APP_USER and APP_PASSWORD.",
        { status: 503 },
      );
    }
    return NextResponse.next(); // development convenience only
  }

  const header = req.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return unauthorized();

  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }
  const i = decoded.indexOf(":");
  if (i < 0) return unauthorized();

  const ok = safeEqual(decoded.slice(0, i), user) && safeEqual(decoded.slice(i + 1), pass);
  return ok ? NextResponse.next() : unauthorized();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

// Edge of the app, runs before routing:
//  1. Locale routing — English is unprefixed (/collections/men → internal /en/…),
//     Urdu/Hindi are prefixed (/ur/…, /hi/…); /en/… redirects to the canonical URL.
//     A saved language cookie redirects unprefixed URLs to the visitor's language.
//  2. Optimistic auth redirects (no session cookie → login). This is a UX layer
//     only; every protected page, Server Action and API re-checks server-side.
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isSupportedLocale } from "./i18n/config.js";
import { localizeHref, splitLocale } from "./i18n/navigation.js";

const SESSION_COOKIES = ["__Host-4bro_session", "4bro_session"];
const hasSessionCookie = (request) => SESSION_COOKIES.some((name) => request.cookies.has(name));

// Friendly department URLs → canonical collection pages.
const SHORTCUTS = { "/men": "/collections/men", "/women": "/collections/women", "/kids": "/collections/kids", "/accessories": "/collections/accessories" };

export function proxy(request) {
  const { pathname, search } = request.nextUrl;

  // ── Admin & API: auth gate only, never localised ─────────────────────────
  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/admin") && !hasSessionCookie(request)) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Please sign in to continue." } }, { status: 401 });
    }
    return NextResponse.next();
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname !== "/admin/login" && !hasSessionCookie(request)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // ── Storefront ───────────────────────────────────────────────────────────
  if (pathname === `/${DEFAULT_LOCALE}` || pathname.startsWith(`/${DEFAULT_LOCALE}/`)) {
    const canonical = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(new URL(`${canonical}${search}`, request.url), 308);
  }

  const { locale, path } = splitLocale(pathname);

  if (SHORTCUTS[path]) {
    return NextResponse.redirect(new URL(`${localizeHref(SHORTCUTS[path], locale)}${search}`, request.url), 308);
  }

  // Remembered language (set by the language menu): an unprefixed English URL
  // sends a returning Urdu/Hindi visitor to the same page in their language.
  // Explicit /ur/… and /hi/… URLs always win; crawlers have no cookie.
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (locale === DEFAULT_LOCALE && saved !== DEFAULT_LOCALE && isSupportedLocale(saved) && request.method === "GET") {
    return NextResponse.redirect(new URL(`${localizeHref(path, saved)}${search}`, request.url), 307);
  }

  const needsSession = ["/account", "/checkout"].some((root) => path === root || path.startsWith(`${root}/`));
  if (needsSession && !hasSessionCookie(request)) {
    const loginUrl = new URL(localizeHref("/login", locale), request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (locale === DEFAULT_LOCALE) {
    return NextResponse.rewrite(new URL(`/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}${search}`, request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and files with an extension (images, robots.txt, sitemap.xml…).
  matcher: ["/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};

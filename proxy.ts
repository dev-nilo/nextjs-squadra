import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_FUTS_RECENTES, lembrarFut, slugDoCaminho } from "@/lib/grupo";

/**
 * Keeps the Supabase session fresh for Server Components. They can read the
 * auth cookies but can't write them, so an expired access token would look
 * like a signed-out user on a server-rendered page. Here, before the page
 * renders, getUser() refreshes the token if needed and the new cookies go
 * out with the response.
 *
 * It also remembers the Grupos opened on this device, most recent first, so
 * `/` reopens the last one. A slug the user isn't in is skipped when read.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  await supabase.auth.getUser();

  const slug = slugSeguro(request.nextUrl.pathname);
  if (slug) {
    response.cookies.set(COOKIE_FUTS_RECENTES, lembrarFut(request.cookies.get(COOKIE_FUTS_RECENTES)?.value, slug), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
    });
  }
  return response;
}

function slugSeguro(pathname: string): string | null {
  try {
    return slugDoCaminho(pathname);
  } catch {
    return null; // malformed percent-encoding
  }
}

export const config = {
  // The server-rendered pages that read the session. The rest of the app
  // (sign-in, invites) reads it in the browser, which refreshes it on its own.
  matcher: ["/", "/g/:path*"],
};

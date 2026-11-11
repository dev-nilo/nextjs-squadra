import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the Supabase session fresh for Server Components. They can read the
 * auth cookies but can't write them, so an expired access token would look
 * like a signed-out user on a server-rendered page. Here, before the page
 * renders, getUser() refreshes the token if needed and the new cookies go
 * out with the response.
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
  return response;
}

export const config = {
  // Only the server-rendered pages that read the session. The rest of the app
  // reads it in the browser, which refreshes it on its own.
  matcher: ["/g/:slug/partidas/:path*"],
};

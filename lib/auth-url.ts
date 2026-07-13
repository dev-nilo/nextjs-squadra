/**
 * Base URL for auth redirects (email confirmation, OAuth, etc.).
 * Prefer NEXT_PUBLIC_SITE_URL in production so emails don't point at localhost.
 */
export function getAuthSiteUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    // In the browser, always use the current origin unless an explicit site URL is set
    // and matches production deployments.
    const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
    if (configured && !window.location.hostname.includes("localhost")) {
      return configured
    }
    return window.location.origin
  }

  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
}

export function getEmailRedirectTo(): string {
  return `${getAuthSiteUrl()}/auth/callback`
}

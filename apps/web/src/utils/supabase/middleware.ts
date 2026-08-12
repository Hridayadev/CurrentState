import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Creates a Supabase server client wired to the request's cookies, then
 * refreshes the session if it is close to expiring. Call this from the root
 * `middleware.ts` and return the response object as-is.
 */
export const createClient = async (request: NextRequest) => {
  // Skip session handling on the auth callback — there is no session yet while
  // the code is being exchanged, and getUser() would error on it.
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    // Do not run any code between createServerClient and auth.getUser() —
    // the refresh token is exchanged here to keep the session alive.
    await supabase.auth.getUser();
  } catch {
    // No session yet (e.g. first visit, signed out). Nothing to refresh.
  }

  // IMPORTANT: you *must* return the supabaseResponse object as-is
  return supabaseResponse;
};

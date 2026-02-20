import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 1. Agent API Security (X-AGENT-SECRET)
    // Only applies to /api/agent and /api/ideas (if accessed by agent)
    if (request.nextUrl.pathname.startsWith('/api')) {
        const agentSecret = request.headers.get('x-agent-secret');
        const serverSecret = process.env.AGENT_SECRET;

        // If header is present, validate it
        if (agentSecret) {
            if (agentSecret !== serverSecret) {
                return NextResponse.json({ error: 'Unauthorized Agent' }, { status: 401 });
            }
            // Valid agent, allow pass-through
            return response;
        }
        // If no header, fall through to Supabase Session check (for human usage of API)
    }

    // 2. Supabase Auth for Humans
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isLoginPage = request.nextUrl.pathname.startsWith('/login');
    const isPublicAsset = request.nextUrl.pathname.includes('.'); // images, etc.

    // Rule: If not logged in and trying to access protected route (everything except /login)
    if (!user && !isLoginPage && !isPublicAsset) {
        // Allow API routes to fail with 401 instead of redirecting if it's an API call
        if (request.nextUrl.pathname.startsWith('/api')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Redirect humans to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Rule: If logged in and on login page, redirect to global
    if (user && isLoginPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/global'
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}

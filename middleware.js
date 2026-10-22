// an example nextJS middleware router that does server-side validation on all traffic to secure pages
import { NextResponse } from "next/server";
import { verifyTideCloakToken } from './lib/tideJWT';

// Developer should list all secure pages and their respective allowed roles
const routesRoles = [
  { URLStart: "/user", role: 'offline_access' },
  { URLStart: "/admin", role: 'offline_access' },
  { URLStart: "/databaseExposure", role: 'offline_access' },
  { URLStart: "/tender", role: 'offline_access' }
];

export async function middleware(req) {
  // Preview mode (SIMULATED server-side check). In real mode this is the TideCloak JWT/role check
  // (verifyTideCloakToken below): a UI check is not authorization, the server must enforce it.
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE !== "0") {
    const persona = req.cookies?.get("sim_persona")?.value;
    if (!["vendor", "procurement", "itadmin", "ai"].includes(persona)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    const p = req.nextUrl.pathname;
    if (p.startsWith("/admin") && persona !== "procurement") {
      return NextResponse.redirect(new URL("/home?denied=admin", req.url));
    }
    if (p.startsWith("/user") && persona !== "vendor") {
      return NextResponse.redirect(new URL("/home?denied=user", req.url));
    }
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  
  var requiredRole = null;
  
  for (const { URLStart, role } of routesRoles) {
    if (pathname.startsWith(URLStart)) {
	    requiredRole = role;
		console.debug("[Middleware] Found role " + requiredRole);
		break;
    }
  }

  // Only protect routes starting with /protected
  if (requiredRole == null) {
	console.debug("[Middleware] skip next");
    return NextResponse.next();
  }
  
  try {
    // Extract token from cookie "kcToken"
    const token = req.cookies?.get('kcToken')?.value;

    if (!token) {
      console.debug("[Middleware] No token found -> redirecting to /");
      return NextResponse.redirect(new URL("/", req.url));
    }

    const origin = process.env.SYSTEM_URL_OVERRIDE ?? req.nextUrl.origin
    const user = await verifyTideCloakToken(origin, token, requiredRole);
    
    if (user) {
  	  return NextResponse.next();
    }
  
    throw "Token verification failed.";
  } catch (err) {
	console.error("[Middleware] ", err);
    return NextResponse.redirect(new URL("/auth/redirect?auth=failed", req.url));
  }
  
}

//Which routes the middleware should run on:
export const config = {
  matcher: ["/home/:path*", "/user/:path*", "/admin/:path*", "/databaseExposure/:path*", "/tender/:path*"]
};

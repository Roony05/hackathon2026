"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "../components/button";
import { useAuth } from "../context/AuthProvider";

/**
 * Top navigation bar shown after login.
 */
export default function Nav() {
  const auth = useAuth();
  const { backgroundProcessing } = auth;
  const pathname = usePathname();
  const router   = useRouter();

  // Navigate only if we aren't already on that route and not processing
  const handleNavigate = (route) => {
    if (!backgroundProcessing && pathname !== route) router.push(route);
  };

  // Utility to highlight the active button
  const getButtonClasses = (route) =>
    pathname === route ? "vault-nav-link active" : "vault-nav-link";

  // Hide nav on landing & failure pages
  if (pathname === "/" || pathname === "/fail") return null;

  // Preview only: hide links the simulated persona cannot open
  const pv = auth.preview;
  const showUser = !pv || pv.persona === "vendor";
  const showAdmin = !pv || pv.persona === "procurement";

  return (
    <nav style={{ top: process.env.NEXT_PUBLIC_PREVIEW_MODE === "1" ? 44 : 0 }} className="sticky z-40flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950/70 px-6 py-3 backdrop-blur-xl shadow-[0_1px_24px_rgba(245,196,81,0.12)]">
      {/* Logo → home page */}
      <Link href="/home" className="inline-block">
        <span className="mr-4 cursor-pointer text-xl font-bold tracking-tight text-gradient-gold">🔒 Sealed Tender</span>
      </Link>

      <button
        onClick={() => handleNavigate("/tender")}
        disabled={backgroundProcessing}
        className={`${getButtonClasses("/tender")} ${
          backgroundProcessing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        Tender Board
      </button>

      {showUser && (
      <button
        onClick={() => handleNavigate("/user")}
        disabled={backgroundProcessing}
        className={`${getButtonClasses("/user")} ${
          backgroundProcessing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        My Sealed Bid
      </button>
      )}

      <button
        onClick={() => handleNavigate("/databaseExposure")}
        disabled={backgroundProcessing}
        className={`${getButtonClasses("/databaseExposure")} ${
          backgroundProcessing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        Insider View
      </button>

      {showAdmin && (
      <button
        onClick={() => handleNavigate("/admin")}
        disabled={backgroundProcessing}
        className={`${getButtonClasses("/admin")} ${
          backgroundProcessing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        Tender Committee
      </button>
      )}

      {pv && pv.persona && (
        <span className="ml-auto flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
          Signed in (simulated) as <strong>{pv.personaLabel}</strong>
          <button type="button" onClick={() => pv.switchPersona()} className="rounded-full border border-amber-300/50 px-2 py-0.5 font-semibold hover:bg-amber-300/20">Switch</button>
        </span>
      )}

      <Button className={pv && pv.persona ? "" : "ml-auto"} onClick={() => auth.logout()}>Logout</Button>
    </nav>
  );
}

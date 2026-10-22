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

      <button
        onClick={() => handleNavigate("/user")}
        disabled={backgroundProcessing}
        className={`${getButtonClasses("/user")} ${
          backgroundProcessing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        My Sealed Bid
      </button>

      <button
        onClick={() => handleNavigate("/databaseExposure")}
        disabled={backgroundProcessing}
        className={`${getButtonClasses("/databaseExposure")} ${
          backgroundProcessing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        Insider View
      </button>

      <button
        onClick={() => handleNavigate("/admin")}
        disabled={backgroundProcessing}
        className={`${getButtonClasses("/admin")} ${
          backgroundProcessing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        Tender Committee
      </button>

      <Button className="ml-auto" onClick={() => auth.logout()}>Logout</Button>
    </nav>
  );
}

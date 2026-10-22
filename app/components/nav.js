"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { FaLock } from "react-icons/fa";
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
    <nav style={{ top: process.env.NEXT_PUBLIC_PREVIEW_MODE !== "0" ? 32 : 0 }} className="sticky z-40 flex h-14 flex-wrap items-center gap-1 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 px-6">
      {/* Logo → home page */}
      <Link href="/home" className="mr-4 inline-flex items-center gap-2">
        <FaLock className="h-3.5 w-3.5 text-neutral-100" />
        <span className="cursor-pointer text-sm font-semibold tracking-tight text-neutral-100">Sealed Tender</span>
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
        <span className="ml-auto mr-2 flex items-center gap-2 rounded-full border border-[#1f1f1f] bg-[#111] px-3 py-1 text-xs text-neutral-400">
          Signed in (simulated) as <strong className="font-medium text-neutral-100">{pv.personaLabel}</strong>
          <button type="button" onClick={() => pv.switchPersona()} className="rounded-full border border-[#2e2e2e] px-2 py-0.5 font-medium text-neutral-200 transition hover:bg-[#1a1a1a]">Switch</button>
        </span>
      )}

      <Button className={pv && pv.persona ? "" : "ml-auto"} onClick={() => auth.logout()}>Logout</Button>
    </nav>
  );
}

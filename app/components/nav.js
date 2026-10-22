"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { FaLock } from "react-icons/fa";
import Button from "../components/button";
import { useEffect } from "react";
import { useAuth } from "../context/AuthProvider";
import { releaseScrollIfIdle } from "./loadingSquare";

const SIDE = { vendor: ["Seller", "pill-seller"], procurement: ["Buyer", "pill-buyer"], ai: ["AI", "pill-ai"], itadmin: ["Platform", "pill-platform"] };

/**
 * Top navigation bar shown after login.
 */
export default function Nav() {
  const auth = useAuth();
  const { backgroundProcessing } = auth;
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => { releaseScrollIfIdle(); }, [pathname]);

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
    <nav style={{ top: process.env.NEXT_PUBLIC_PREVIEW_MODE !== "0" ? 32 : 0 }} className="sticky z-40 flex h-14 flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-6">
      {/* Logo → home page */}
      <Link href="/home" className="mr-4 inline-flex items-center gap-2">
        <FaLock className="h-3.5 w-3.5 text-indigo-600" />
        <span className="cursor-pointer text-sm font-semibold tracking-tight text-slate-900">Sealed Tender</span>
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
        <span className="ml-auto mr-2 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
          {SIDE[pv.persona] && <span className={`pill ${SIDE[pv.persona][1]}`}>{SIDE[pv.persona][0]}</span>}
          <strong className="font-medium text-slate-900">{pv.personaLabel}</strong>
          <button type="button" onClick={() => pv.switchPersona()} className="rounded-full border border-slate-200 px-2 py-0.5 font-medium text-slate-700 transition hover:bg-slate-100">Switch</button>
        </span>
      )}

      <Button className={pv && pv.persona ? "" : "ml-auto"} onClick={() => auth.logout()}>Logout</Button>
    </nav>
  );
}

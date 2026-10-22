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
    pathname === route ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100";

  // Hide nav on landing & failure pages
  if (pathname === "/" || pathname === "/fail") return null;

  return (
    <nav className="flex items-center gap-4 border-b border-gray-200 px-8 py-4">
      {/* Logo → home page */}
      <Link href="/home" className="inline-block">
        <span className="text-xl font-bold text-gray-800 cursor-pointer">🔒 Sealed Tender</span>
      </Link>

      <button
        onClick={() => handleNavigate("/tender")}
        disabled={backgroundProcessing}
        className={`px-4 py-2 rounded transition ${getButtonClasses("/tender")} ${
          backgroundProcessing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        Tender Board
      </button>

      <button
        onClick={() => handleNavigate("/user")}
        disabled={backgroundProcessing}
        className={`px-4 py-2 rounded transition ${getButtonClasses("/user")} ${
          backgroundProcessing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        My Sealed Bid
      </button>

      <button
        onClick={() => handleNavigate("/databaseExposure")}
        disabled={backgroundProcessing}
        className={`px-4 py-2 rounded transition ${getButtonClasses("/databaseExposure")} ${
          backgroundProcessing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        Insider View
      </button>

      <button
        onClick={() => handleNavigate("/admin")}
        disabled={backgroundProcessing}
        className={`px-4 py-2 rounded transition ${getButtonClasses("/admin")} ${
          backgroundProcessing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        Tender Committee
      </button>

      <Button onClick={() => auth.logout()}>Logout</Button>
    </nav>
  );
}

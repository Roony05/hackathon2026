"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaClipboardList, FaLock, FaDatabase, FaUsers } from "react-icons/fa";
import { useAuth } from "../context/AuthProvider";
import { Vi } from "../tenderStory";

export default function HomePage() {
  const auth = useAuth();
  const { backgroundProcessing } = auth;
  const [showHomeAccordion, setShowHomeAccordion] = useState(false);
  const [denied, setDenied] = useState(null);
  useEffect(() => {
    if (!auth.preview) return;
    setDenied(new URLSearchParams(window.location.search).get("denied"));
  }, [auth.preview]);

  const demos = [
    { title: "Tender Board",     sub: "Tender, phase and every bid",        href: "/tender",           icon: FaClipboardList },
    { title: "My Sealed Bid",    sub: "Seal your price and delivery",   href: "/user",             icon: FaLock          },
    { title: "Insider View",     sub: "What a DBA really sees", href: "/databaseExposure", icon: FaDatabase      },
    { title: "Tender Committee", sub: "3-of-5 motions change rules",            href: "/admin",            icon: FaUsers         },
  ];

  return (
    <main className="container mx-auto max-w-screen-lg px-4 py-12">
      {denied && (
        <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          Access denied by policy (simulated server-side check): your persona cannot open /{denied}.
        </div>
      )}
      {/* Hero */}
      <section className="max-w-2xl">
        <span className="inline-block rounded-full border border-[#2e2e2e] px-3 py-1 text-xs font-medium uppercase tracking-wider text-neutral-400">
          Sealed two-envelope bidding
        </span>
        <h1 className="mt-4 !text-3xl font-semibold leading-tight tracking-tight text-neutral-100">
          Sealed bids nobody can open early
        </h1>
        <p className="mt-2"><Vi>Hồ sơ thầu không ai mở trộm được</Vi></p>
        <p className="mt-4 text-sm text-neutral-400">Insiders can peek at bids or move deadlines; here no single person can.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/tender" className="btn-gold">Tender Board</Link>
          <Link href="/user" className="btn-ghost">My Sealed Bid</Link>
        </div>
      </section>

      {/* Demo tiles */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {demos.map(({ title, sub, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={(e) => {
              if (backgroundProcessing) {
                e.preventDefault();
              }
            }}
            className={`group block h-full ${backgroundProcessing ? "pointer-events-none cursor-not-allowed opacity-50" : ""}`}
          >
            <div className="flex h-full flex-col gap-2 lift rounded-2xl border border-[#1f1f1f] bg-[#111] p-5 shadow-[0_1px_2px_rgba(0,0,0,.4)]">
              <Icon className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-semibold tracking-tight text-neutral-100">{title}</span>
              <span className="text-sm text-neutral-500">{sub}</span>
            </div>
          </Link>
        ))}
      </div>

</main>
  );
}

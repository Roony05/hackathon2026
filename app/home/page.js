"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaClipboardList, FaLock, FaDatabase, FaUsers, FaBuilding, FaStore, FaServer } from "react-icons/fa";
import { useAuth } from "../context/AuthProvider";

const WHO = [
  { pill: "pill-buyer", tag: "Buyer", name: "Lotus Industries", sub: "Posts the tender. Committee opens bids at 3/5.", icon: FaBuilding, tone: "bg-indigo-50 text-indigo-600" },
  { pill: "pill-seller", tag: "Sellers", name: "5 bidders", sub: "Submit sealed envelopes.", icon: FaStore, tone: "bg-emerald-50 text-emerald-600" },
  { pill: "pill-platform", tag: "Platform", name: "Sealed Tender", sub: "Stores ciphertext only. Can't peek.", icon: FaServer, tone: "bg-slate-100 text-slate-600" },
];

const HOW = ["Buyer posts tender", "Sellers seal bids", "Committee signs 3/5", "Envelopes open & rank"];

export default function HomePage() {
  const auth = useAuth();
  const { backgroundProcessing } = auth;
  const [denied, setDenied] = useState(null);
  useEffect(() => {
    if (!auth.preview) return;
    setDenied(new URLSearchParams(window.location.search).get("denied"));
  }, [auth.preview]);

  const demos = [
    { title: "Tender Board",     sub: "Tender and every bid", href: "/tender",           icon: FaClipboardList },
    { title: "My Sealed Bid",    sub: "Seal price and delivery", href: "/user",          icon: FaLock          },
    { title: "Insider View",     sub: "What a DBA really sees", href: "/databaseExposure", icon: FaDatabase    },
    { title: "Tender Committee", sub: "3-of-5 motions",       href: "/admin",            icon: FaUsers         },
  ];

  return (
    <main className="container mx-auto max-w-screen-lg px-4 py-12">
      {denied && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Access denied by policy (simulated server-side check): your persona cannot open /{denied}.
        </div>
      )}
      {/* Hero */}
      <section className="max-w-2xl">
        <h1 className="!text-4xl font-semibold leading-tight tracking-tight">
          Sealed bids nobody can open early
        </h1>
        <p className="mt-3 text-base text-slate-600">No single insider can peek at bids or move deadlines.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/tender" className="btn-gold">Tender Board</Link>
          <Link href="/user" className="btn-ghost">My Sealed Bid</Link>
        </div>
      </section>

      {/* Who's who */}
      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-slate-500">Who's who</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {WHO.map(({ pill, tag, name, sub, icon: Icon, tone }) => (
          <div key={tag} className="lift rounded-2xl border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.06)]">
            <div className="flex items-center justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
              <span className={`pill ${pill}`}>{tag}</span>
            </div>
            <div className="mt-4 text-base font-semibold tracking-tight">{name}</div>
            <div className="mt-1 text-sm text-slate-600">{sub}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-slate-500">How it works</h2>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HOW.map((t, i) => (
          <li key={t} className="flex items-center gap-3 rounded-2xl border border-[#e6e8ec] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.06)]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold !text-white">{i + 1}</span>
            <span className="text-sm font-medium">{t}</span>
          </li>
        ))}
      </ol>

      {/* Destinations */}
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="flex h-full flex-col gap-1 lift rounded-2xl border border-[#e6e8ec] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.06)]">
              <Icon className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold tracking-tight">{title}</span>
              <span className="text-xs text-slate-500">{sub}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

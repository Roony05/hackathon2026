"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaClipboardList, FaLock, FaDatabase, FaUsers } from "react-icons/fa";
import AccordionBox from "../components/accordionBox";
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
    { title: "Tender Board",     sub: "The tender, its phase and every bid",        href: "/tender",           icon: FaClipboardList },
    { title: "My Sealed Bid",    sub: "Vendor A submits price and delivery time",   href: "/user",             icon: FaLock          },
    { title: "Insider View",     sub: "What a DBA or procurement head really sees", href: "/databaseExposure", icon: FaDatabase      },
    { title: "Tender Committee", sub: "3-of-5 motions change the rules",            href: "/admin",            icon: FaUsers         },
  ];

  return (
    <main className="container mx-auto max-w-screen-lg px-4 py-12">
      {denied && (
        <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          Access denied by policy (simulated server-side check): your persona cannot open /{denied}.
        </div>
      )}
      {/* Hero */}
      <section className="max-w-2xl">
        <span className="inline-block rounded-md border border-[#2e2e2e] px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-neutral-400">
          Sealed two-envelope bidding
        </span>
        <h1 className="mt-4 !text-3xl font-semibold leading-tight tracking-tight text-neutral-100">
          Sealed bids nobody can open early
        </h1>
        <p className="mt-2"><Vi>Hồ sơ thầu không ai mở trộm được</Vi></p>
        <p className="mt-4 text-sm leading-relaxed text-neutral-400">
          <span className="font-medium text-neutral-200">The problem:</span> in bid rigging, an insider peeks at competitors' prices and tips off a
          favoured vendor, or quietly extends the deadline for them. With ordinary login and backend permissions, the DBA or the
          procurement head can do exactly that - and nobody would know.
        </p>
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
            <div className="flex h-full flex-col gap-2 rounded-lg border border-[#1f1f1f] bg-[#111] p-5 transition-colors group-hover:border-[#2e2e2e]">
              <Icon className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-semibold tracking-tight text-neutral-100">{title}</span>
              <span className="text-sm text-neutral-500">{sub}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Toggle emoji */}
      <div className="relative mb-2 mt-10 flex justify-center">
        <button
          onClick={() => setShowHomeAccordion(!showHomeAccordion)}
          className="text-xl opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Toggle explanation"
        >
          {showHomeAccordion ? "🤯" : "🤔"}
        </button>
      </div>

      {/* Accordion content */}
      <AccordionBox title="Why nobody can rig this tender" isOpen={showHomeAccordion}>
        <p>
          Three properties combine so that no single insider, however senior, can peek at a bid or change the rules alone:
        </p>

        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>BYOiD login</strong> - vendors and committee members prove who they are without passwords being stored anywhere, so there is no credential database to steal or abuse.</li>
          <li><strong>Quorum-guarded rules</strong> - opening the financial envelopes or closing submissions is a role change that needs 3 of 5 committee signatures; no single person has god-mode.</li>
          <li><strong>Edge decryption</strong> - a price decrypts only in the browser of a role holder, and only after the quorum grants it; anywhere else it is ciphertext.</li>
        </ul>

        <p className="mt-2">Pick a screen above to watch each safeguard in action.</p>
      </AccordionBox>
    </main>
  );
}

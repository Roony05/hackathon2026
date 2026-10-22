"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { FaClipboardList, FaLock, FaDatabase, FaUsers } from "react-icons/fa";
import AccordionBox from "../components/accordionBox";
import TiltCard from "../components/TiltCard";
import { useAuth } from "../context/AuthProvider";
import { Vi } from "../tenderStory";

const Vault3D = dynamic(() => import("../components/Vault3D"), { ssr: false, loading: () => <div className="h-full w-full" /> });

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
        <div className="mb-6 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          Access denied by policy (simulated server-side check): your persona cannot open /{denied}.
        </div>
      )}
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid items-center gap-8 md:grid-cols-2"
      >
        <div>
          <span className="inline-block rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-200">
            Sealed two-envelope bidding
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-gradient-gold md:text-5xl">
            Sealed bids nobody can open early
          </h1>
          <p className="mt-2"><Vi>Hồ sơ thầu không ai mở trộm được</Vi></p>
          <p className="mt-5 max-w-xl text-slate-300">
            <span className="font-semibold text-slate-100">The problem:</span> in bid rigging, an insider peeks at competitors' prices and tips off a
            favoured vendor, or quietly extends the deadline for them. With ordinary login and backend permissions, the DBA or the
            procurement head can do exactly that - and nobody would know.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/tender" className="btn-gold">Tender Board</Link>
            <Link href="/user" className="btn-ghost">My Sealed Bid</Link>
          </div>
        </div>
        <div className="glass-strong glow-gold h-[420px] overflow-hidden">
          <Vault3D state="sealed" signatures={1} className="h-full w-full" />
        </div>
      </motion.section>

      {/* Toggle emoji */}
      <div className="relative mb-2 mt-10 flex justify-center">
        <button
          onClick={() => setShowHomeAccordion(!showHomeAccordion)}
          className="text-2xl hover:scale-110 transition-transform"
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

        <p className="mt-2">Pick a screen below to watch each safeguard in action.</p>
      </AccordionBox>

      {/* Demo tiles */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {demos.map(({ title, sub, href, icon: Icon }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <Link
              href={href}
              onClick={(e) => {
                if (backgroundProcessing) {
                  e.preventDefault();
                }
              }}
              className={`group block h-full ${backgroundProcessing ? "pointer-events-none cursor-not-allowed opacity-50" : ""}`}
            >
              <TiltCard className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 shadow-[0_0_20px_rgba(245,196,81,0.2)]">
                  <Icon className="h-7 w-7 text-amber-300 transition-transform duration-200 group-hover:scale-110" />
                </span>
                <span className="text-lg font-semibold tracking-tight text-slate-100">{title}</span>
                <span className="text-sm text-slate-400">{sub}</span>
              </TiltCard>
            </Link>
          </motion.div>
        ))}
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { FaClipboardList, FaLock, FaDatabase, FaUsers } from "react-icons/fa";
import AccordionBox from "../components/accordionBox";
import { useAuth } from "../context/AuthProvider";
import { Vi } from "../tenderStory";

export default function HomePage() {
  const auth = useAuth();
  const { backgroundProcessing } = auth;
  const [showHomeAccordion, setShowHomeAccordion] = useState(false);

  const demos = [
    { title: "Tender Board",     sub: "The tender, its phase and every bid",        href: "/tender",           icon: FaClipboardList },
    { title: "My Sealed Bid",    sub: "Vendor A submits price and delivery time",   href: "/user",             icon: FaLock          },
    { title: "Insider View",     sub: "What a DBA or procurement head really sees", href: "/databaseExposure", icon: FaDatabase      },
    { title: "Tender Committee", sub: "3-of-5 motions change the rules",            href: "/admin",            icon: FaUsers         },
  ];

  return (
    <main className="container mx-auto max-w-screen-lg px-4 py-12">
      <h1 className="text-center text-3xl font-bold">Sealed Tender</h1>
      <p className="text-center"><Vi>Hồ sơ thầu không ai mở trộm được</Vi></p>
      <p className="mx-auto mb-4 mt-4 max-w-2xl text-center text-gray-600">
        <span className="font-semibold">The problem:</span> in bid rigging, an insider peeks at competitors' prices and tips off a
        favoured vendor, or quietly extends the deadline for them. With ordinary login and backend permissions, the DBA or the
        procurement head can do exactly that - and nobody would know.
      </p>

      {/* Toggle emoji */}
      <div className="relative mb-2 flex justify-center">
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
        {demos.map(({ title, sub, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={(e) => {
              if (backgroundProcessing) {
                e.preventDefault();
              }
            }}
            className={`group ${backgroundProcessing ? 'pointer-events-none' : ''}`}
          >
            <div className={`flex h-full flex-col items-center justify-center gap-3
                            rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center
                            shadow-sm transition-all duration-200
                            group-hover:border-blue-500 group-hover:bg-blue-50 group-hover:shadow-md
                            ${backgroundProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Icon className="h-10 w-10 text-gray-600 transition-transform duration-200 group-hover:scale-105 group-hover:text-blue-600" />
              <span className="text-lg font-semibold tracking-tight text-gray-800 group-hover:text-blue-700">
                {title}
              </span>
              <span className="text-sm text-gray-500">{sub}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

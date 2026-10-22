"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaLock, FaCheckCircle, FaShieldAlt, FaKey, FaUsers, FaMicrochip } from "react-icons/fa";
import { useAuth } from "../context/AuthProvider";
import { LoadingSquareFullPage } from "../components/loadingSquare";
import { TENDER, VENDORS, formatVND, canOpen } from "../tenderStory";

const STEPS = [
  { n: 1, label: "Bidding open", },
  { n: 2, label: "Closed & sealed" },
  { n: 3, label: "Financial envelopes opened" },
];

const FAKE_SNIPPETS = [
  "q7Zk2sT9vXn0LwB4mR8eJc1Y…",
  "Hf3pD6uQa9GzE5tN2oKx7Vb0…",
  "mW8cL1rYj4SgA6dP3iUe9Zh2…",
  "T5nB0xKq7VfC2aMw8LsJ4oRe…",
];

const looksEncrypted = (v) => typeof v === "string" && v.length >= 24 && /[^0-9\s]/.test(v);

const COULDNT = "Couldn't open in this session";
const NOT_SUBMITTED = "Not submitted yet";

const ATTEMPTS = [
  { who: "Procurement head asked IT for the price column", result: "Got ciphertext" },
  { who: "IT admin exported the whole database", result: "Ciphertext only" },
  { who: "Procurement head drafted \"extend deadline for Vendor D\"", result: "Stuck at 1/5 signatures" },
  { who: "AI evaluation agent requested prices before opening", result: "No decrypt role - refused" },
];

export default function TenderBoard() {
  const auth = useAuth();
  const { authenticated, contextLoading } = auth;

  const pv = auth.preview; // simulated-persona layer; undefined in real mode
  const isVendorView = !pv || pv.persona === "vendor";
  const canWritePrice = !!auth.hasOneRole("_tide_cc.selfencrypt");
  const canReadPrice = !!auth.hasOneRole("_tide_cc.selfdecrypt") && isVendorView;
  const canReadTech = !!auth.hasOneRole("_tide_dob.selfdecrypt") && isVendorView;
  const phase = pv ? pv.tenderPhase : canReadPrice ? 3 : canWritePrice ? 1 : 2;

  const ccClaim = contextLoading ? undefined : auth.getValueFromIdToken("cc");
  const dobClaim = contextLoading ? undefined : auth.getValueFromIdToken("dob");

  const [techA, setTechA] = useState(null);
  const [priceA, setPriceA] = useState(null);
  const [decryptFailed, setDecryptFailed] = useState(false);
  const [aiResult, setAiResult] = useState(null); // simulated AI evaluator output
  const aiPrices = pv && pv.persona === "ai" && phase === 3 && aiResult && aiResult.allow ? aiResult.prices : null;

  // Decrypt Vendor A's real envelopes once the auth context is ready
  useEffect(() => {
    if (contextLoading || !authenticated) return;
    let cancelled = false;

    (async () => {
      const items = [];
      const keys = [];
      if (canReadTech && looksEncrypted(dobClaim)) {
        items.push({ encrypted: dobClaim, tags: ["dob"] });
        keys.push("tech");
      }
      if (phase === 3 && isVendorView && looksEncrypted(ccClaim)) {
        items.push({ encrypted: ccClaim, tags: ["cc"] });
        keys.push("price");
      }
      if (items.length === 0) {
        setTechA(null);
        setPriceA(null);
        setDecryptFailed(false);
        return;
      }
      try {
        const out = await auth.doDecrypt(items);
        if (cancelled) return;
        keys.forEach((k, i) => {
          if (k === "tech") setTechA(out?.[i] ?? null);
          else setPriceA(out?.[i] ?? null);
        });
        setDecryptFailed(false);
      } catch (e) {
        if (!cancelled) setDecryptFailed(true);
      }
    })();

    return () => { cancelled = true; };
  }, [contextLoading, authenticated, phase, canReadTech, ccClaim, dobClaim, isVendorView]);

  if (contextLoading) return <LoadingSquareFullPage />;

  const estimate = TENDER.estimateVND;
  const pct = (price) => {
    const n = Number(String(price).replace(/[^0-9]/g, ""));
    if (!n) return null;
    const d = ((n - estimate) / estimate) * 100;
    return `${d >= 0 ? "+" : ""}${d.toFixed(1)}% vs estimate`;
  };

  // Build rows
  const simSnippets = {};
  let si = 0;
  const showOthers = phase === 3 && !(pv && pv.persona === "ai" && !aiPrices);
  const rows = Object.entries(VENDORS).map(([key, v]) => {
    if (v.you) {
      const submitted = looksEncrypted(ccClaim);
      const techSubmitted = looksEncrypted(dobClaim);
      let tech;
      if (!techSubmitted) tech = NOT_SUBMITTED;
      else if (!canReadTech) tech = null;
      else if (techA != null) tech = `${techA} days`;
      else if (decryptFailed) tech = COULDNT;
      else tech = "…";

      let price = null;
      let priceStatus = "sealed";
      if (!submitted) priceStatus = "none";
      else if (phase === 3) {
        const aiA = aiPrices ? aiPrices.find((p) => p.key === key) : null;
        if (aiA && aiA.price != null) { price = aiA.price; priceStatus = "open"; }
        else if (!isVendorView) priceStatus = "sealed";
        else if (priceA != null) { price = priceA; priceStatus = "open"; }
        else if (decryptFailed) priceStatus = "failed";
        else priceStatus = "pending";
      }
      return {
        key, v, you: true, tech, techSealed: techSubmitted && !canReadTech,
        techSnippet: techSubmitted ? dobClaim.slice(0, 24) + "…" : null,
        price, priceStatus,
        snippet: submitted ? ccClaim.slice(0, 24) + "…" : null,
        priceNum: price != null ? Number(String(price).replace(/[^0-9]/g, "")) : null,
      };
    }
    const snippet = FAKE_SNIPPETS[si++ % FAKE_SNIPPETS.length];
    return {
      key, v, you: false, tech: `${v.deliveryDays} days`, techSealed: false,
      price: showOthers ? v.priceVND : null,
      priceStatus: showOthers ? "open" : "sealed",
      snippet,
      priceNum: showOthers ? v.priceVND : null,
    };
  });

  let ordered = rows;
  let lowestKey = null;
  if (phase === 3) {
    ordered = [...rows].sort((a, b) => {
      if (a.priceNum == null && b.priceNum == null) return 0;
      if (a.priceNum == null) return 1;
      if (b.priceNum == null) return -1;
      return a.priceNum - b.priceNum;
    });
    const first = ordered.find((r) => r.priceNum != null);
    lowestKey = first ? first.key : null;
  }

  const requestPrices = () => {
    const r = pv.readOpenedPrice();
    if (!r.allow) { setAiResult({ allow: false, reason: r.reason, rule: r.rule }); return; }
    const ranked = [...r.prices].filter((p) => p.price).sort((a, b) => a.price - b.price);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    const avg = ranked.reduce((t, p) => t + p.price, 0) / (ranked.length || 1);
    const summary = best
      ? `Ranked ${ranked.length} bids by price: ${ranked.map((p, i) => `${i + 1}. ${p.name} (${formatVND(p.price)})`).join("; ")}. Lowest is ${best.name} at ${(((best.price - estimate) / estimate) * 100).toFixed(1)}% vs the buyer's estimate; the spread to the highest (${worst.name}) is ${formatVND(worst.price - best.price)}, and the mean bid is ${formatVND(Math.round(avg))}. Recommendation: shortlist ${best.name} subject to technical review.`
      : "No priced bids were available.";
    setAiResult({ allow: true, prices: r.prices, reason: r.reason, rule: r.rule, summary });
  };

  const SIDE = { vendor: ["Seller", "pill-seller"], procurement: ["Buyer", "pill-buyer"], ai: ["AI", "pill-ai"], itadmin: ["Platform", "pill-platform"] };
  const chip = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
  const sealedChip = (
    <span className={chip + " chip-sealed"}>🔒 Sealed</span>
  );
  const card = "rounded-2xl border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.06)]";
  const liftCard = card + " lift";

  return (
    <main className="flex-grow w-full pt-8 pb-16">
      <div className="container mx-auto max-w-screen-lg px-4 space-y-6">

        {/* Header */}
        <section className={card}>
          <div className="flex flex-wrap items-center gap-2"><span className="pill pill-buyer">Buyer: Lotus Industries</span><span className="text-xs font-medium uppercase tracking-wider text-slate-400">{TENDER.id}</span></div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">{TENDER.title}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#1f1f1f] pt-4 text-sm text-neutral-300">
            <span className="tabular-nums">{formatVND(TENDER.estimateVND)}</span><span className="text-neutral-600">·</span>
            <span>{TENDER.deadline}</span><span className="text-neutral-600">·</span>
            <span>{TENDER.quorum.required} of {TENDER.quorum.total} signatures</span>
          </p>
        </section>

        {/* Phase stepper */}
        <section className={card}>
          <h2 className="text-base font-semibold tracking-tight text-neutral-100">Tender phase</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, idx) => {
              const active = s.n === phase;
              const done = s.n < phase;
              return (
                <li key={s.n} className="relative">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold !text-white ${
                        active ? "bg-indigo-600" : done ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    >{s.n}</span>
                    <span className={`h-px flex-1 ${idx === STEPS.length - 1 ? "bg-transparent" : done ? "bg-emerald-300" : "bg-slate-200"}`} />
                  </div>
                  <div className="mt-2 pr-4">
                    <span className={`flex items-center gap-1.5 text-sm font-medium ${active ? "text-indigo-700" : done ? "text-slate-700" : "text-neutral-500"}`}>
                      {done && <FaCheckCircle className="h-3 w-3 text-emerald-500" />}
                      {s.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 border-t border-[#eef0f3] pt-4 text-xs text-neutral-500">
            Steps change only by 3/5 committee motion.{" "}
            <Link href="/admin" className="text-neutral-300 underline">Tender Committee</Link>
          </p>
        </section>

        {/* Bids table */}
        <section className={card}>
          <h2 className="text-base font-semibold tracking-tight text-neutral-100">Bids</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f] text-xs uppercase tracking-wider text-neutral-500">
                  <th className="py-2 pr-4 font-medium">Vendor</th>
                  <th className="py-2 pr-4 font-medium">Technical envelope<span className="block text-[11px] font-normal normal-case tracking-normal">Delivery time</span></th>
                  <th className="py-2 pr-4 font-medium">Financial envelope<span className="block text-[11px] font-normal normal-case tracking-normal">Bid price</span></th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((r) => {
                  const isLowest = phase === 3 && r.key === lowestKey;
                  return (
                    <tr key={r.key} className="border-b border-[#1f1f1f] align-top transition-colors hover:bg-[#141414]">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-neutral-100">{r.v.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1"><span className="pill pill-seller">Seller</span><span className={chip + " chip-sealed"}>{r.you ? "real · TideCloak-encrypted" : "simulated"}</span></div>
                      </td>
                      <td className="py-3 pr-4">
                        {r.techSealed ? (
                          <div className="space-y-1">
                            {sealedChip}
                            <div className="break-all font-mono text-xs text-neutral-500">{r.techSnippet}</div>
                          </div>
                        ) : (
                          <span className={r.tech === COULDNT || r.tech === NOT_SUBMITTED ? "italic text-neutral-500" : "tabular-nums text-neutral-200"}>{r.tech}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {r.priceStatus === "open" && (
                          <div>
                            <div className="font-medium tabular-nums text-neutral-100">{formatVND(r.price)}</div>
                            <div className="text-xs tabular-nums text-neutral-500">{pct(r.price)}</div>
                          </div>
                        )}
                        {r.priceStatus === "sealed" && (
                          <div className="space-y-1">
                            {sealedChip}
                            <div className="break-all font-mono text-xs text-neutral-500">{r.snippet}</div>
                          </div>
                        )}
                        {r.priceStatus === "none" && <span className="italic text-neutral-500">{NOT_SUBMITTED}</span>}
                        {r.priceStatus === "failed" && <span className="italic text-neutral-500">{COULDNT}</span>}
                        {r.priceStatus === "pending" && <span className="text-neutral-500">…</span>}
                      </td>
                      <td className="py-3">
                        {isLowest ? (
                          <span className={chip + " chip-open"}>Lowest</span>
                        ) : r.priceStatus === "open" ? (
                          <span className="text-neutral-300">Opened</span>
                        ) : r.priceStatus === "none" ? (
                          <span className="text-neutral-500">No bid</span>
                        ) : (
                          <span className="text-neutral-400">Sealed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {phase === 3 && (
            <p className="mt-3 text-xs text-neutral-500">Lowest price first, vs buyer estimate.</p>
          )}
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Who tried to break the rules */}
          <div className={card}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight text-neutral-100">{pv ? "Access log" : "Who tried to break the rules"}</h2>
              <span className={chip + " shrink-0 chip-pending"}>{pv ? "live · simulated policy" : "illustrative"}</span>
            </div>
            {pv ? (
              <ul className="mt-3 max-h-80 divide-y divide-[#1f1f1f] overflow-y-auto text-xs">
                {pv.accessLog.length === 0 && <li className="py-2 italic text-neutral-500">No checks yet.</li>}
                {pv.accessLog.map((e, i) => (
                  <li key={i} className="py-2">
                    <span className={chip + " mr-2 " + (e.result === "ALLOW" ? "chip-open" : "chip-denied")}>{e.result}</span>
                    <span className="font-mono text-neutral-500">{e.t}</span> {SIDE[e.persona] && <span className={"pill mr-1 " + SIDE[e.persona][1]}>{SIDE[e.persona][0]}</span>}<span className="font-medium text-neutral-200">{e.persona}</span>{" "}
                    <span className="font-mono text-neutral-400">{e.action}</span>
                    <div className="mt-1 text-neutral-400">{e.reason}</div>
                    {e.rule && <div className="italic text-neutral-500">rule: {e.rule}</div>}
                  </li>
                ))}
              </ul>
            ) : (
            <ul className="mt-3 divide-y divide-[#1f1f1f] text-sm">
              {ATTEMPTS.map((a) => (
                <li key={a.who} className="py-2.5">
                  <span className="text-neutral-300">{a.who}</span>
                  <span className="font-medium text-rose-700"> {"->"} {a.result}</span>
                </li>
              ))}
            </ul>
            )}
          </div>

          {/* Why this can't be rigged */}
          <div className={card}>
            <h2 className="text-base font-semibold tracking-tight text-neutral-100">Why this can't be rigged</h2>
            <ul className="mt-3 space-y-3 text-sm text-neutral-400">
              <li className="flex gap-2"><FaKey className="mt-1 shrink-0 text-neutral-500" /><span><strong className="font-medium text-neutral-200">Keys no one holds</strong></span></li>
              <li className="flex gap-2"><FaUsers className="mt-1 shrink-0 text-neutral-500" /><span><strong className="font-medium text-neutral-200">Rules change by 3-of-5 quorum</strong></span></li>
              <li className="flex gap-2"><FaMicrochip className="mt-1 shrink-0 text-neutral-500" /><span><strong className="font-medium text-neutral-200">Decrypts only in your browser</strong></span></li>
            </ul>
          </div>
        </div>

        {pv && pv.persona === "ai" && (
          <section className={card}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight text-neutral-100">AI evaluator</h2>
              <span className={chip + " chip-pending"}>simulated AI</span>
            </div>
            <button type="button" onClick={requestPrices} className="btn-gold mt-3">Request bid prices</button>
            {aiResult && !aiResult.allow && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                DENY: {aiResult.reason}. <span className="italic">rule: {aiResult.rule}</span>
              </p>
            )}
            {aiResult && aiResult.allow && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <p className="font-medium">ALLOW: {aiResult.reason}</p>
                <p className="mt-1 text-neutral-300">{aiResult.summary}</p>
                <p className="mt-1 text-xs italic text-neutral-500">Simulated locally; no model called.</p>
              </div>
            )}
          </section>
        )}

        {/* Navigation buttons */}
        <div className="flex flex-wrap gap-3">
          {canOpen(pv?.persona, "/user") && (
            <Link href="/user" className="btn-ghost">
              <FaLock /> My Sealed Bid
            </Link>
          )}
          {canOpen(pv?.persona, "/databaseExposure") && (
            <Link href="/databaseExposure" className="btn-ghost">
              <FaShieldAlt /> Insider View
            </Link>
          )}
          {canOpen(pv?.persona, "/admin") && (
            <Link href="/admin" className="btn-ghost">
              <FaUsers /> Tender Committee
            </Link>
          )}
        </div>

        <p className="text-xs text-neutral-500">
          Prototype: only Vendor A's envelopes are real; the rest is simulated.
        </p>
      </div>
    </main>
  );
}

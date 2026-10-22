"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaLock, FaCheckCircle, FaShieldAlt, FaKey, FaUsers, FaMicrochip } from "react-icons/fa";
import { useAuth } from "../context/AuthProvider";
import { LoadingSquareFullPage } from "../components/loadingSquare";
import { TENDER, VENDORS, formatVND, Vi } from "../tenderStory";

const STEPS = [
  { n: 1, label: "Bidding open", vi: "Đang nhận hồ sơ" },
  { n: 2, label: "Closed & sealed", vi: "Đã đóng thầu" },
  { n: 3, label: "Financial envelopes opened", vi: "Đã mở túi tài chính" },
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
  { who: "Procurement head asked IT for the price column", result: "Got ciphertext", vi: "Trưởng phòng mua sắm xin cột giá - chỉ nhận được bản mã" },
  { who: "IT admin exported the whole database", result: "Ciphertext only", vi: "Quản trị IT xuất toàn bộ CSDL - chỉ có bản mã" },
  { who: "Procurement head drafted \"extend deadline for Vendor D\"", result: "Stuck at 1/5 signatures", vi: "Dự thảo gia hạn cho nhà thầu D - kẹt ở 1/5 chữ ký" },
  { who: "AI evaluation agent requested prices before opening", result: "No decrypt role - refused", vi: "Tác tử AI đòi xem giá trước khi mở thầu - bị từ chối" },
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

  const chip = "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium";
  const sealedChip = (
    <span className={chip + " border border-[#2e2e2e] bg-[#1a1a1a] text-neutral-300"}>🔒 Sealed</span>
  );
  const card = "rounded-lg border border-[#1f1f1f] bg-[#111] p-5";

  return (
    <main className="flex-grow w-full pt-8 pb-16">
      <div className="container mx-auto max-w-screen-lg px-4 space-y-6">

        {/* Header */}
        <section className={card}>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Tender {TENDER.id}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">{TENDER.title}</h1>
          <Vi>{TENDER.titleVi}</Vi>
          <dl className="mt-5 grid gap-x-8 gap-y-4 border-t border-[#1f1f1f] pt-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs text-neutral-500">Buyer</dt>
              <dd className="mt-0.5 text-neutral-200">{TENDER.buyer}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Method</dt>
              <dd className="mt-0.5 text-neutral-200">{TENDER.method}</dd>
              <Vi>{TENDER.methodVi}</Vi>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Estimate</dt>
              <dd className="mt-0.5 tabular-nums text-neutral-200">{formatVND(TENDER.estimateVND)}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Submission deadline</dt>
              <dd className="mt-0.5 text-neutral-200">{TENDER.deadline}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Rule changes need</dt>
              <dd className="mt-0.5 text-neutral-200">
                {TENDER.quorum.required} of {TENDER.quorum.total} committee signatures
              </dd>
            </div>
          </dl>
        </section>

        {/* Phase stepper */}
        <section className={card}>
          <h2 className="text-base font-semibold tracking-tight text-neutral-100">Tender phase</h2>
          <Vi>Giai đoạn đấu thầu (suy ra từ vai trò thật trong TideCloak)</Vi>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, idx) => {
              const active = s.n === phase;
              const done = s.n < phase;
              return (
                <li key={s.n} className="relative">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        active ? "bg-white" : done ? "bg-emerald-400" : "bg-[#2e2e2e]"
                      }`}
                    />
                    <span className={`h-px flex-1 ${idx === STEPS.length - 1 ? "bg-transparent" : done ? "bg-emerald-400/40" : "bg-[#1f1f1f]"}`} />
                  </div>
                  <div className="mt-2 pr-4">
                    <span className={`flex items-center gap-1.5 text-sm font-medium ${active ? "text-white" : done ? "text-neutral-300" : "text-neutral-500"}`}>
                      {done && <FaCheckCircle className="h-3 w-3 text-emerald-400" />}
                      {s.label}
                    </span>
                    <Vi>{s.vi}</Vi>
                    {active && <p className="mt-1 text-xs font-medium text-neutral-300">Current phase</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 border-t border-[#1f1f1f] pt-4 text-xs text-neutral-500">
            Changing steps requires a committee motion with 3/5 signatures.{" "}
            <Link href="/admin" className="text-neutral-300 underline underline-offset-2">Tender Committee</Link>
          </p>
        </section>

        {/* Bids table */}
        <section className={card}>
          <h2 className="text-base font-semibold tracking-tight text-neutral-100">Bids</h2>
          <Vi>Hồ sơ dự thầu</Vi>
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
                    <tr key={r.key} className="border-b border-[#1f1f1f] align-top transition-colors hover:bg-[#161616]">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-neutral-100">{r.v.name}</div>
                        {r.you && <Vi>{r.v.nameVi}</Vi>}
                        <span className={chip + " mt-1 " + (r.you ? "bg-[#1a1a1a] text-neutral-200" : "bg-[#1a1a1a] text-neutral-500")}>
                          {r.you ? "real · TideCloak-encrypted" : "simulated"}
                        </span>
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
                          <span className={chip + " bg-emerald-500/10 text-emerald-400"}>Lowest</span>
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
            <p className="mt-3 text-xs text-neutral-500">Sorted by price, lowest first. Percentages are relative to the buyer's estimate of {formatVND(estimate)}.</p>
          )}
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Who tried to break the rules */}
          <div className={card}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight text-neutral-100">{pv ? "Access log" : "Who tried to break the rules"}</h2>
              <span className={chip + " shrink-0 bg-amber-500/10 text-amber-400"}>{pv ? "live · simulated policy" : "illustrative"}</span>
            </div>
            <Vi>{pv ? "Nhật ký truy cập (mô phỏng)" : "Ai đã thử phá luật"}</Vi>
            {pv ? (
              <ul className="mt-3 max-h-80 divide-y divide-[#1f1f1f] overflow-y-auto text-xs">
                {pv.accessLog.length === 0 && <li className="py-2 italic text-neutral-500">No checks yet. Act as a persona and entries appear here.</li>}
                {pv.accessLog.map((e, i) => (
                  <li key={i} className="py-2">
                    <span className={chip + " mr-2 " + (e.result === "ALLOW" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>{e.result}</span>
                    <span className="font-mono text-neutral-500">{e.t}</span> <span className="font-medium text-neutral-200">{e.persona}</span>{" "}
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
                  <span className="font-medium text-rose-400"> {"->"} {a.result}</span>
                  <Vi className="text-xs">{a.vi}</Vi>
                </li>
              ))}
            </ul>
            )}
          </div>

          {/* Why this can't be rigged */}
          <div className={card}>
            <h2 className="text-base font-semibold tracking-tight text-neutral-100">Why this can't be rigged</h2>
            <Vi>Vì sao không thể thông thầu</Vi>
            <ul className="mt-3 space-y-3 text-sm text-neutral-400">
              <li className="flex gap-2"><FaKey className="mt-1 shrink-0 text-neutral-500" /><span><strong className="font-medium text-neutral-200">Keys no one holds.</strong> The decryption key never exists in one place, so there is nothing for an insider to steal.</span></li>
              <li className="flex gap-2"><FaUsers className="mt-1 shrink-0 text-neutral-500" /><span><strong className="font-medium text-neutral-200">Rules change only by quorum.</strong> Opening envelopes or closing submissions needs 3 of 5 committee signatures.</span></li>
              <li className="flex gap-2"><FaMicrochip className="mt-1 shrink-0 text-neutral-500" /><span><strong className="font-medium text-neutral-200">Decryption only at the edge.</strong> A price decrypts in the browser of the role holder, never on the server.</span></li>
            </ul>
            <p className="mt-4 border-t border-[#1f1f1f] pt-4 text-sm text-neutral-300">
              With ordinary login and backend permissions, whoever runs the database is the person you have to trust - that is exactly how bid rigging happens.
            </p>
          </div>
        </div>

        {pv && pv.persona === "ai" && (
          <section className={card}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight text-neutral-100">AI evaluator</h2>
              <span className={chip + " bg-amber-500/10 text-amber-400"}>simulated AI</span>
            </div>
            <Vi>Tác tử AI chấm thầu (mô phỏng)</Vi>
            <button type="button" onClick={requestPrices} className="btn-gold mt-3">Request bid prices</button>
            {aiResult && !aiResult.allow && (
              <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                DENY: {aiResult.reason}. <span className="italic">rule: {aiResult.rule}</span>
              </p>
            )}
            {aiResult && aiResult.allow && (
              <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                <p className="font-medium">ALLOW: {aiResult.reason}</p>
                <p className="mt-1 text-neutral-300">{aiResult.summary}</p>
                <p className="mt-1 text-xs italic text-neutral-500">Generated locally by the simulated AI from the opened prices. No model was called.</p>
              </div>
            )}
          </section>
        )}

        {/* Navigation buttons */}
        <div className="flex flex-wrap gap-3">
          <Link href="/user" className="btn-ghost">
            <FaLock /> My Sealed Bid
          </Link>
          <Link href="/databaseExposure" className="btn-ghost">
            <FaShieldAlt /> Insider View
          </Link>
          <Link href="/admin" className="btn-ghost">
            <FaUsers /> Tender Committee
          </Link>
        </div>

        <p className="text-xs text-neutral-500">
          Prototype: Vendor A's envelopes are real TideCloak-encrypted data; competitor bids and committee members 2-5 are simulated.
        </p>
      </div>
    </main>
  );
}

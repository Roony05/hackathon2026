"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import TiltCard from "../components/TiltCard";
import { FaLock, FaCheckCircle, FaShieldAlt, FaKey, FaUsers, FaMicrochip } from "react-icons/fa";
import { useAuth } from "../context/AuthProvider";
import { LoadingSquareFullPage } from "../components/loadingSquare";
import { TENDER, VENDORS, formatVND, Vi } from "../tenderStory";

const Vault3D = dynamic(() => import("../components/Vault3D"), { ssr: false, loading: () => <div className="h-full w-full" /> });

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

  const canWritePrice = !!auth.hasOneRole("_tide_cc.selfencrypt");
  const canReadPrice = !!auth.hasOneRole("_tide_cc.selfdecrypt");
  const canReadTech = !!auth.hasOneRole("_tide_dob.selfdecrypt");
  const phase = canReadPrice ? 3 : canWritePrice ? 1 : 2;

  const ccClaim = contextLoading ? undefined : auth.getValueFromIdToken("cc");
  const dobClaim = contextLoading ? undefined : auth.getValueFromIdToken("dob");

  const [techA, setTechA] = useState(null);
  const [priceA, setPriceA] = useState(null);
  const [decryptFailed, setDecryptFailed] = useState(false);

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
      if (phase === 3 && looksEncrypted(ccClaim)) {
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
  }, [contextLoading, authenticated, phase, canReadTech, ccClaim, dobClaim]);

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
        if (priceA != null) { price = priceA; priceStatus = "open"; }
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
      price: phase === 3 ? v.priceVND : null,
      priceStatus: phase === 3 ? "open" : "sealed",
      snippet,
      priceNum: phase === 3 ? v.priceVND : null,
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

  return (
    <main className="flex-grow w-full pt-6 pb-16">
      <div className="container mx-auto max-w-screen-lg px-4 space-y-6">

        {/* Header card */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="glass-strong grid gap-6 p-6 md:grid-cols-[1fr_280px]">
          <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-300">Tender {TENDER.id}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-100">{TENDER.title}</h1>
          <Vi>{TENDER.titleVi}</Vi>
          <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Buyer</dt>
              <dd className="font-medium text-gray-800">{TENDER.buyer}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Method</dt>
              <dd className="font-medium text-gray-800">{TENDER.method}</dd>
              <Vi>{TENDER.methodVi}</Vi>
            </div>
            <div>
              <dt className="text-gray-500">Estimate</dt>
              <dd className="font-medium text-gray-800">{formatVND(TENDER.estimateVND)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Submission deadline</dt>
              <dd className="font-medium text-gray-800">{TENDER.deadline}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Rule changes need</dt>
              <dd className="font-medium text-gray-800">
                {TENDER.quorum.required} of {TENDER.quorum.total} committee signatures
              </dd>
            </div>
          </dl>
          </div>
          <div className={`h-[260px] overflow-hidden rounded-2xl border border-white/10 bg-black/20 ${phase === 3 ? "glow-emerald" : "glow-gold"}`}>
            <Vault3D state={phase === 3 ? "open" : "sealed"} signatures={phase === 3 ? 3 : phase === 2 ? 3 : 1} className="h-full w-full" />
          </div>
        </motion.section>

        {/* Phase stepper */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="glass p-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Tender phase</h2>
          <Vi>Giai đoạn đấu thầu (suy ra từ vai trò thật trong TideCloak)</Vi>
          <ol className="mt-4 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => {
              const active = s.n === phase;
              const done = s.n < phase;
              return (
                <li
                  key={s.n}
                  className={`rounded-2xl border p-4 ${
                    active
                      ? (s.n === 3 ? "glow-emerald bg-emerald-400/10" : "glow-gold bg-amber-300/10")
                      : done
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/10 bg-white/5 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                        active ? (s.n === 3 ? "bg-emerald-400 text-slate-900 shadow-[0_0_14px_rgba(52,211,153,0.7)]" : "bg-amber-400 text-slate-900 shadow-[0_0_14px_rgba(245,196,81,0.7)]") : done ? "bg-emerald-500 text-slate-900" : "bg-white/15 text-slate-300"
                      }`}
                    >
                      {done ? <FaCheckCircle /> : s.n}
                    </span>
                    <span className="font-semibold text-gray-900">{s.label}</span>
                  </div>
                  <Vi>{s.vi}</Vi>
                  {active && <p className={`mt-2 text-xs font-semibold uppercase tracking-wide ${s.n === 3 ? "text-emerald-300" : "text-amber-300"}`}>Current phase</p>}
                  <p className="mt-2 text-xs text-gray-600">
                    Changing steps requires a committee motion with 3/5 signatures.{" "}
                    <Link href="/admin" className="text-blue-600 underline">Tender Committee</Link>
                  </p>
                </li>
              );
            })}
          </ol>
        </motion.section>

        {/* Bids table */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="glass p-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Bids</h2>
          <Vi>Hồ sơ dự thầu</Vi>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full overflow-hidden rounded-xl text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-2 pr-4 font-semibold">Vendor</th>
                  <th className="py-2 pr-4 font-semibold">Technical envelope<span className="block text-xs font-normal text-gray-500">Delivery time</span></th>
                  <th className="py-2 pr-4 font-semibold">Financial envelope<span className="block text-xs font-normal text-gray-500">Bid price</span></th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((r) => {
                  const isLowest = phase === 3 && r.key === lowestKey;
                  return (
                    <tr key={r.key} className={`border-b border-white/5 align-top transition hover:bg-white/5 ${isLowest ? "bg-emerald-400/10 shadow-[inset_0_0_30px_rgba(52,211,153,0.18)]" : ""}`}>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-900">{r.v.name}</div>
                        {r.you && <Vi>{r.v.nameVi}</Vi>}
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.you ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {r.you ? "real · TideCloak-encrypted" : "simulated"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {r.techSealed ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-xs font-semibold text-amber-300">🔒 Sealed</span>
                            <div className="break-all font-mono text-xs text-gray-400">{r.techSnippet}</div>
                          </div>
                        ) : (
                          <span className={r.tech === COULDNT || r.tech === NOT_SUBMITTED ? "text-gray-500 italic" : "text-gray-900"}>{r.tech}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {r.priceStatus === "open" && (
                          <div>
                            <div className="font-semibold text-emerald-300">{formatVND(r.price)}</div>
                            <div className="text-xs text-gray-500">{pct(r.price)}</div>
                          </div>
                        )}
                        {r.priceStatus === "sealed" && (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-xs font-semibold text-amber-300">🔒 Sealed</span>
                            <div className="break-all font-mono text-xs text-gray-400">{r.snippet}</div>
                          </div>
                        )}
                        {r.priceStatus === "none" && <span className="italic text-gray-500">{NOT_SUBMITTED}</span>}
                        {r.priceStatus === "failed" && <span className="italic text-gray-500">{COULDNT}</span>}
                        {r.priceStatus === "pending" && <span className="text-gray-400">…</span>}
                      </td>
                      <td className="py-3">
                        {isLowest ? (
                          <span className="inline-block rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">Lowest evaluated price</span>
                        ) : r.priceStatus === "open" ? (
                          <span className="text-gray-700">Opened</span>
                        ) : r.priceStatus === "none" ? (
                          <span className="text-gray-500">No bid</span>
                        ) : (
                          <span className="text-gray-700">Sealed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {phase === 3 && (
            <p className="mt-3 text-xs text-gray-500">Sorted by price, lowest first. Percentages are relative to the buyer's estimate of {formatVND(estimate)}.</p>
          )}
        </motion.section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Who tried to break the rules */}
          <TiltCard className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Who tried to break the rules</h2>
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">illustrative</span>
            </div>
            <Vi>Ai đã thử phá luật</Vi>
            <ul className="mt-3 space-y-3 text-sm">
              {ATTEMPTS.map((a) => (
                <li key={a.who} className="border-l-4 border-red-300 pl-3">
                  <span className="text-gray-800">{a.who}</span>
                  <span className="font-semibold text-red-700"> {"->"} {a.result}</span>
                  <Vi className="text-xs">{a.vi}</Vi>
                </li>
              ))}
            </ul>
          </TiltCard>

          {/* Why this can't be rigged */}
          <TiltCard className="p-6">
            <h2 className="text-xl font-bold text-gray-900">Why this can't be rigged</h2>
            <Vi>Vì sao không thể thông thầu</Vi>
            <ul className="mt-3 space-y-3 text-sm text-gray-800">
              <li className="flex gap-2"><FaKey className="mt-1 shrink-0 text-blue-700" /><span><strong>Keys no one holds.</strong> The decryption key never exists in one place, so there is nothing for an insider to steal.</span></li>
              <li className="flex gap-2"><FaUsers className="mt-1 shrink-0 text-blue-700" /><span><strong>Rules change only by quorum.</strong> Opening envelopes or closing submissions needs 3 of 5 committee signatures.</span></li>
              <li className="flex gap-2"><FaMicrochip className="mt-1 shrink-0 text-blue-700" /><span><strong>Decryption only at the edge.</strong> A price decrypts in the browser of the role holder, never on the server.</span></li>
            </ul>
            <p className="mt-4 text-sm font-medium text-gray-900">
              With ordinary login and backend permissions, whoever runs the database is the person you have to trust - that is exactly how bid rigging happens.
            </p>
          </TiltCard>
        </div>

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

        <p className="text-xs text-gray-500">
          Prototype: Vendor A's envelopes are real TideCloak-encrypted data; competitor bids and committee members 2-5 are simulated.
        </p>
      </div>
    </main>
  );
}

"use client";

// PREVIEW MODE: a fully simulated auth / crypto / approvals layer so the whole GUI
// can be clicked through without TideCloak. Enabled only when
// NEXT_PUBLIC_PREVIEW_MODE is not "0" (simulated mode is the default; see app/context/AuthProvider.js).

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import appService from "../../lib/appService";
import { VENDORS } from "../tenderStory";

export const PREVIEW_BASE_URL = "http://preview.local";
export const PREVIEW_REALM = "tidecloak-demo";
const VUID = "preview-vuid";
const USER_ID = "preview-user-1";
const STORAGE_KEY = "sealedTenderPreviewState.v1";
const BANNER_HEIGHT = 32;

const OTHER_BLOBS = {
  "testuser1": {
    "dob": "AQAAAAEAAAABRgAAACS9kjd+p9JceASgDD8ZJohTbp2q41G40hHCOPvNT0HPA5p1CJhWSDAThTALxE+sAh2BM5yA/HP+enjFpYtFiiZiFp13eEEIAAAAPO4baAAAAAAAAAAAQAAAAITlASV5Ik9pnCCTJFAv0dc4LYGNxZkbB1uyNGxSzWkQhMxwVglZy8xgS1G792wkXN1e/zfXBmBcZEC1B0zxlQs=",
    "cc": "AQAAAAEAAAABSwAAACCSi7I24CTr/Hl+ItmWQn1bY62fN6sqS7SmzBd+J5Iy4soIax1SUZdp1+IAjdAIskm0KhlMxCq+4DUdpH9jORtIsDJKB5vAJaQKOggAAAA/7htoAAAAAAAAAABAAAAAhLdDVwJAAxpENRDsCtiIbOmhPEX6s7VjFBaOcL7jM94ZPlpEJmaFVBzPQDol/EU2WSYuWX99UBzE3BTHGsnDAQ=="
  },
  "testuser2": {
    "dob": "AQAAAAEAAAABRgAAAJEvRQaMRAC3vEiLJksOSJYCfa7u6QEDsP0RoS5JLIX39HS1yFGMILJemDUV1hQTDaFpoOtLiA8n7hNqwmhhObZyJm1d1LEIAAAAd+4baAAAAAAAAAAAQAAAAET3qUFdGaazKnem/kEqb9VLlMyGMQ8SbUXySF5QjtaNTz6qhBghRBdaE2Gg7+TO0qOc9nY1+7xbgyPciGS4NwU=",
    "cc": "AQAAAAEAAAABTAAAACqycDiT4bqTG3oaB4bUCUsQrFepIE5aw8sCIRp9b6H0dfS3i7dL5LySnTahDmvpmJSfcDigOBTtcelyXfIwi0MiTD5+v4w95st9zzMIAAAAeu4baAAAAAAAAAAAQAAAALMrQKyRIuN4DFkw+fctrddTyz/VO1LeD2ss6PasjuqOfUeipQ7bR46tHOF8wFwMCoI+ZMXMUsnJ7ychWT84xQg="
  },
  "testuser3": {
    "dob": "AQAAAAEAAAABRgAAADs+CwUTIhxtdA3Or+9AUXWuiHYcOGbJjuD5E7fS8eAzbibsQxeOkymjwub/LSWFsNp6EapzO9IYzlgzuY2prQCalw1+Nw8IAAAAtu4baAAAAAAAAAAAQAAAANLuTIXynW7uAbNfjbjckAxnE77+nWn7q9LImnBJyqx5cPmoy/pckSUpsh4Yjv3BXu2Sny/W+51YjWjkx4amBQc=",
    "cc": "AQAAAAEAAAABTAAAAKddd6lHNaB2/WyIUBvoq+jXroNJuqBTlbekYgrMvXui1T3YbIlFKQ9TiNGnNIAJOLOk6pwqynnWxU/PlZd+5ySKq4HqOT6rs6Ol9NMIAAAAue4baAAAAAAAAAAAQAAAAOABiEUOTizbd0jShonezP24iVEJEmWh7kZLeqi3bUr877at0lO4M6LngbRMiETPOLK4C1qx3dVG6CbYTH58JwI="
  },
  "testuser4": {
    "dob": "AQAAAAEAAAABRgAAAB74ttzmyNndjGI+oYlhL4A2tKQoXwee3TBW5ZW68YYmQ0FRurczlLqcMJZQIebp60K9rWFamDwxrr15ykaZ8gnH9f4+JioIAAAA5u4baAAAAAAAAAAAQAAAAE1CX13tdVRs+PFMfDdE8xMZIJ7CNpVCoOzEeUXLe5TIhPinUCzeum0WgbPILEdOggv0J6MrkXMO2u7GKoHDswU=",
    "cc": "AQAAAAEAAAABTAAAAGdzlaqTEYovmZZVJ3uQPWkxocc2pdoF5k9FNERne13ZveS0eBY3RJ1pc0X4hK6czAviPdATVZZeVgsV9qx5JLNoa5sA+eWRYrOA/TsIAAAA6e4baAAAAAAAAAAAQAAAAJ4vb86b8xR+AMPoeDftefkux+nIw9Xdu7bg3qwRENHt7y3oY6WmY53JlOOmoXAJnzoZgzA/9LgKIqkk4yf66Ac="
  }
};

const ROLE_IDS = {
  "_tide_dob.selfencrypt": "role-id-dob-selfencrypt",
  "_tide_dob.selfdecrypt": "role-id-dob-selfdecrypt",
  "_tide_cc.selfencrypt": "role-id-cc-selfencrypt",
  "_tide_cc.selfdecrypt": "role-id-cc-selfdecrypt",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function mintCiphertext() {
  let s = "AQAAAAEAAAAB";
  while (s.length < 230) s += B64[Math.floor(Math.random() * 64)];
  return s + "==";
}

// ---- SIMULATED personas + policy engine (stand-in for TideCloak realm roles + Fabric-signed tokens) ----
export const PERSONAS = {
  vendor: { id: "vendor", label: "Vendor A · bidder", vi: "Nhà thầu A · bên dự thầu", realmRoles: ["vendor"], blurb: "Seals a price and delivery time." },
  procurement: { id: "procurement", label: "You · Procurement head (member #1)", vi: "Trưởng phòng mua sắm · thành viên hội đồng #1", realmRoles: ["committee-member", "procurement-head"], blurb: "Tables and signs motions." },
  finance: { id: "finance", label: "Alice · Finance", vi: "Alice · Tài chính", realmRoles: ["committee-member"], blurb: "Committee member #2." },
  technical: { id: "technical", label: "Ben · Technical lead", vi: "Ben · Trưởng kỹ thuật", realmRoles: ["committee-member"], blurb: "Committee member #3." },
  audit: { id: "audit", label: "Carlos · Internal audit", vi: "Carlos · Kiểm toán nội bộ", realmRoles: ["committee-member"], blurb: "Committee member #4." },
  independent: { id: "independent", label: "Dana · Independent member", vi: "Dana · Thành viên độc lập", realmRoles: ["committee-member"], blurb: "Committee member #5." },
  itadmin: { id: "itadmin", label: "IT admin / DBA", vi: "Quản trị IT / DBA", realmRoles: ["it-admin"], blurb: "Sees the database, ciphertext only." },
  ai: { id: "ai", label: "AI evaluation agent", vi: "Tác tử AI chấm thầu", realmRoles: ["ai-agent"], blurb: "Reads prices only after opening." },
};
export const COMMITTEE_IDS = ["procurement", "finance", "technical", "audit", "independent"];
const isCommittee = (p) => COMMITTEE_IDS.includes(p);
const COOKIE = "sim_persona";
function setPersonaCookie(id) {
  try { document.cookie = id ? `${COOKIE}=${id}; path=/` : `${COOKIE}=; path=/; max-age=0`; } catch {}
}
function readPersonaCookie() {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
    return m && PERSONAS[m[1]] ? m[1] : null;
  } catch { return null; }
}
const phaseOf = (roles) => (roles.includes("_tide_cc.selfdecrypt") ? 3 : roles.includes("_tide_cc.selfencrypt") ? 1 : 2);
const nowStr = () => new Date().toTimeString().slice(0, 8);

/** SIMULATED policy decision point. In real mode TideCloak + Fabric-signed tokens decide this. */
export function checkAccess(action, c = {}) {
  const p = c.persona;
  const vr = c.vendorRoles || [];
  const A = (reason, rule) => ({ allow: true, reason, rule });
  const D = (reason, rule) => ({ allow: false, reason, rule });
  const [kind, arg] = action.split(":");
  const who = PERSONAS[p]?.label || "anonymous";
  const quorumRule = "role change needs 3/5 committee quorum";
  switch (kind) {
    case "decrypt": {
      const rule = `requires _tide_${arg}.selfdecrypt in a Fabric-signed token`;
      if (c.foreign) return D("ciphertext belongs to another vendor's key", "each row is sealed under its owner's key; no role unlocks it");
      if (p !== "vendor") return D(`${who} holds no envelope roles`, rule);
      if (!vr.includes(`_tide_${arg}.selfdecrypt`)) return D(`role _tide_${arg}.selfdecrypt not granted`, rule);
      return A("role present; decrypts in the browser", rule);
    }
    case "encrypt": {
      const rule = `requires _tide_${arg}.selfencrypt in a Fabric-signed token`;
      if (p !== "vendor") return D(`${who} holds no envelope roles`, rule);
      if (!vr.includes(`_tide_${arg}.selfencrypt`)) return D(`role _tide_${arg}.selfencrypt not granted (envelope closed)`, rule);
      return A("write-only role present", rule);
    }
    case "bid.submit":
      return p === "vendor" ? A("vendor submits own bid", "requires realm role vendor") : D(`${who} is not a bidder`, "requires realm role vendor");
    case "open":
      if (arg === "/user") return p === "vendor" ? A("bidder opens own sealed bid", "route /user requires realm role vendor") : D(`${who} is not a bidder`, "route /user requires realm role vendor");
      if (arg === "/admin") return isCommittee(p) ? A("committee member", "route /admin requires realm role committee-member") : D(`${who} is not a committee member`, "route /admin requires realm role committee-member");
      return A("ciphertext view is open to all signed-in users", "route allowed for any persona");
    case "motion.table":
      return isCommittee(p) ? A("committee member may draft a motion", "requires realm role committee-member") : D(`${who} cannot table motions`, "requires realm role committee-member");
    case "motion.sign":
      if (!isCommittee(p)) return D(`${who} cannot sign motions`, "requires realm role committee-member");
      if (c.signed) return D("already signed", "one signature per committee member");
      return A("signature recorded", "requires realm role committee-member");
    case "motion.commit":
      if (!isCommittee(p)) return D(`${who} cannot commit`, quorumRule);
      return c.ready ? A("3/5 signatures collected", quorumRule) : D(`needs 3 distinct committee signatures (have ${c.signerCount ?? 0})`, quorumRule);
    case "committee.elevate":
      return isCommittee(p) ? A("committee member joins the committee", "requires realm role committee-member") : D(`${who} cannot join the committee`, "requires realm role committee-member");
    case "ai.readPrices":
      if (p !== "ai") return D(`${who} is not the AI agent`, "requires realm role ai-agent");
      return c.phase === 3 ? A("financial envelopes were opened by quorum", "prices readable only in phase 3 (_tide_cc.selfdecrypt granted)") : D("envelopes still sealed (phase " + c.phase + ")", "prices readable only in phase 3 (_tide_cc.selfdecrypt granted)");
    case "db.export":
      return p === "itadmin" ? A("export allowed, ciphertext only", "DB access exposes ciphertext, never keys") : D(`${who} has no DB access`, "requires realm role it-admin");
    default:
      return D("unknown action", "default deny");
  }
}

const adminsOf = (s) => s.admins || (s.isAdmin ? ["procurement"] : []);

function freshState() {
  return {
    persona: null,
    log: [],
    roles: ["_tide_dob.selfencrypt", "_tide_dob.selfdecrypt", "_tide_cc.selfencrypt"],
    isAdmin: false,
    plain: { dob: "45", cc: "12450000000" },
    ct: { dob: mintCiphertext(), cc: mintCiphertext() },
    requests: [],
    nextReq: 1,
  };
}

function loadState() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.roles && s.ct && s.plain) return { persona: null, log: [], ...s };
    }
  } catch {}
  return freshState();
}

function saveState(s) {
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function resetPreviewState() {
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch {}
  try { window.localStorage.removeItem("approvals"); } catch {}
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function buildUser(s) {
  return {
    id: USER_ID,
    username: "demouser",
    email: "demouser@tidecloak.com",
    enabled: true,
    emailVerified: false,
    attributes: { vuid: [VUID], dob: [s.ct.dob], cc: [s.ct.cc], tideInvitable: ["true"] },
  };
}

function buildUsers(s) {
  const others = Object.entries(OTHER_BLOBS).map(([username, v], i) => ({
    id: `preview-user-other-${i + 1}`,
    username,
    email: `${username}@tidecloak.com`,
    enabled: true,
    emailVerified: false,
    attributes: { dob: [v.dob], cc: [v.cc] },
  }));
  return [buildUser(s), ...others];
}

function toCR(cr) {
  return {
    id: cr.id,
    entityType: "USER",
    status: "PENDING",
    readyToCommit: (cr.signers || []).length >= 3,
    role: cr.role,
    actionType: cr.action,
    userRecord: [{ accessDraft: `${cr.action} realm role ${cr.role} for user demouser (preview draft ${cr.id})` }],
  };
}

/**
 * Creates the mock backend bound to a state ref. All handlers read/write through
 * `get()` / `mutate(fn)` so they are always working on the latest state.
 */
function createBackend(get, mutate, guard) {
  // Handles the same-origin /api/* routes
  async function handleApi(path, search, init) {
    const params = new URLSearchParams(search);
    const s = get();
    await sleep(120);
    switch (path) {
      case "/api/getUserByVuid":
        return json({ ok: true, user: params.get("vuid") === VUID ? buildUser(s) : null });
      case "/api/getUsers":
        if (s.persona === "itadmin") guard("db.export");
        return json({ ok: true, users: buildUsers(s) });
      case "/api/checkAdminRole":
        return json({ ok: true, isAdmin: adminsOf(s).includes(s.persona), user: buildUser(s) });
      case "/api/commitAdminRole": {
        const r = guard("committee.elevate");
        if (!r.allow) return json({ ok: false, error: r.reason }, 403);
        await sleep(700);
        mutate((x) => ({ ...x, isAdmin: true, admins: Array.from(new Set([...adminsOf(x), x.persona])) }));
        return json({ ok: true });
      }
      case "/api/getRealmRoles": {
        const names = (params.get("names") || "").split(",").map((n) => n.trim()).filter(Boolean);
        const roles = {};
        names.forEach((n) => { roles[n] = { id: ROLE_IDS[n] || `role-id-${n}`, name: n, composite: false, clientRole: false }; });
        return json({ ok: true, roles });
      }
      case "/api/assignRealmRoles":
        mutate((x) => ({ ...x, roles: Array.from(new Set([...x.roles, "_tide_dob.selfencrypt", "_tide_dob.selfdecrypt", "_tide_cc.selfencrypt"])) }));
        return json({ ok: true });
      case "/api/updateUser": {
        const r = guard("bid.submit");
        if (!r.allow) return json({ ok: false, error: r.reason }, 403);
        let body = {};
        try { body = JSON.parse(init?.body || "{}"); } catch {}
        const attrs = body?.user?.attributes || {};
        const pick = (v) => (Array.isArray(v) ? v[0] : v);
        mutate((x) => {
          const ct = { ...x.ct };
          const dob = pick(attrs.dob);
          const cc = pick(attrs.cc);
          if (typeof dob === "string" && dob) ct.dob = dob;
          if (typeof cc === "string" && cc) ct.cc = cc;
          return { ...x, ct };
        });
        return json({ ok: true });
      }
      case "/api/tidecloakConfig":
        return json({ realm: PREVIEW_REALM, "auth-server-url": PREVIEW_BASE_URL, resource: "preview" });
      case "/api/inviteUser":
        return json({ ok: true });
      case "/api/updateCustomDomainURL":
        return json({ ok: true });
      default:
        return json({ ok: true, preview: true });
    }
  }

  // Handles `${baseURL}/admin/realms/...` calls made by lib/appService.js
  async function handleKeycloak(pathname, init) {
    const method = (init?.method || "GET").toUpperCase();
    let body = {};
    try { body = init?.body ? JSON.parse(init.body) : {}; } catch {}
    await sleep(150);
    const s = get();

    if (/\/iga\/change-requests$/.test(pathname) && method === "GET") {
      return json(s.requests.map(toCR));
    }
    let m = pathname.match(/\/iga\/change-requests\/([^/]+)\/(approve|deny|commit)$/);
    if (m && method === "POST") {
      const [, id, action] = m;
      const cr = s.requests.find((r) => r.id === id);
      if (!cr) return json({ error: "not found" }, 404);
      if (action === "approve") {
        if (body && body.requestModel) {
          const r = guard("motion.sign", { label: `${cr.action} ${cr.role}`, signed: (cr.signers || []).includes(s.persona) });
          if (!r.allow) return json({ error: r.reason }, 403);
          mutate((x) => ({ ...x, requests: x.requests.map((q) => (q.id === id ? { ...q, signers: Array.from(new Set([...(q.signers || []), x.persona])) } : q)) }));
          return json({ mode: "recorded" });
        }
        return json({ mode: "needs-approval", requestModel: btoa("preview-enclave-carrier-" + id) });
      }
      if (action === "deny") {
        mutate((x) => ({ ...x, requests: x.requests.filter((r) => r.id !== id) }));
        return json({});
      }
      // commit: apply the role change, then drop the request
      {
        const r = guard("motion.commit", { ready: (cr.signers || []).length >= 3, signerCount: (cr.signers || []).length, label: `${cr.action} ${cr.role}` });
        if (!r.allow) return json({ error: r.reason }, 403);
      }
      mutate((x) => {
        const roles = cr.action === "GRANT"
          ? Array.from(new Set([...x.roles, cr.role]))
          : x.roles.filter((r) => r !== cr.role);
        return { ...x, roles, requests: x.requests.filter((r) => r.id !== id) };
      });
      return json({});
    }
    m = pathname.match(/\/users\/[^/]+\/role-mappings\/realm$/);
    if (m && (method === "POST" || method === "DELETE")) {
      const list = Array.isArray(body) ? body : [];
      {
        const r = guard("motion.table", { label: `${method === "POST" ? "GRANT" : "REVOKE"} ${list.map((l) => l.name).join(",")}` });
        if (!r.allow) return json({ error: r.reason }, 403);
      }
      mutate((x) => {
        let next = x.nextReq;
        const added = list.map((r) => ({
          id: `cr-${next++}`,
          role: r.name,
          action: method === "POST" ? "GRANT" : "REVOKE",
          readyToCommit: false,
          signers: [],
        }));
        return { ...x, nextReq: next, requests: [...x.requests, ...added] };
      });
      return json({});
    }
    if (/\/role-mappings$/.test(pathname)) {
      return json({ realmMappings: s.roles.map((n) => ({ id: ROLE_IDS[n], name: n })) });
    }
    if (/\/users\?q=vuid/.test(pathname) || /\/users$/.test(pathname)) {
      return json(buildUsers(s));
    }
    return json({});
  }

  async function secureFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url || String(input);
    const u = new URL(url, window.location.origin);
    return handleKeycloak(u.pathname, init);
  }

  return { handleApi, secureFetch };
}

let fetchPatched = false;
function installFetchPatch(backendRef) {
  if (fetchPatched || typeof window === "undefined") return;
  fetchPatched = true;
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
      if (raw) {
        const u = new URL(raw, window.location.origin);
        if (u.origin === window.location.origin && u.pathname.startsWith("/api/")) {
          const reqInit = init || (typeof input === "object" && !(input instanceof URL) ? { method: input.method } : undefined);
          return backendRef.current.handleApi(u.pathname, u.search, reqInit);
        }
      }
    } catch (e) {
      console.error("[preview] fetch intercept error", e);
    }
    return realFetch(input, init);
  };
}

function PreviewBanner() {
  return (
    <>
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: BANNER_HEIGHT, zIndex: 100000,
          boxSizing: "border-box", padding: "0 12px", background: "#fffbeb", borderBottom: "1px solid #fde68a",
          color: "#b45309", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "#fbbf24", flexShrink: 0 }} />
        <span>Simulated TideCloak — sign-in, roles and checks are simulated</span>
      </div>
      <div style={{ height: BANNER_HEIGHT, flexShrink: 0 }} aria-hidden="true" />
    </>
  );
}

export function PreviewAuthProvider({ Context, children }) {
  const [ready, setReady] = useState(false);
  const [st, setSt] = useState(() => freshState());
  const [backgroundProcessing, setBackgroundProcessing] = useState(false);
  const stRef = useRef(st);
  const readyRef = useRef(false);

  const mutate = useCallback((fn) => {
    const next = fn(stRef.current);
    stRef.current = next;
    setSt(next);
    saveState(next);
    return next;
  }, []);
  const get = useCallback(() => stRef.current, []);

  const logAccess = useCallback((entry) => {
    const e = { t: nowStr(), persona: stRef.current.persona || "anonymous", ...entry };
    mutate((x) => ({ ...x, log: [e, ...(x.log || [])].slice(0, 50) }));
  }, [mutate]);

  // Runs the simulated policy check AND records it in the access log.
  const guard = useCallback((action, extra = {}) => {
    const cur = stRef.current;
    const r = checkAccess(action, { persona: cur.persona, vendorRoles: cur.roles, phase: phaseOf(cur.roles), ...extra });
    logAccess({ action: extra.label ? `${action} (${extra.label})` : action, result: r.allow ? "ALLOW" : "DENY", reason: r.reason, rule: r.rule });
    return r;
  }, [logAccess]);

  const backendRef = useRef(null);
  if (!backendRef.current) backendRef.current = createBackend(get, mutate, guard);

  const pathname = usePathname();
  const lastLogged = useRef("");
  const personaNow = st.persona;
  useEffect(() => {
    if (!ready || !personaNow) return;
    const denied = new URLSearchParams(window.location.search).get("denied");
    const key = `${personaNow}|${pathname}|${denied || ""}`;
    if (lastLogged.current === key) return;
    lastLogged.current = key;
    if (pathname === "/home" && denied) guard(`open:/${denied}`, { label: "blocked by server-side check" });
    else if (pathname.startsWith("/user")) guard("open:/user");
    else if (pathname.startsWith("/admin")) guard("open:/admin");
    else if (pathname.startsWith("/databaseExposure")) guard("open:/databaseExposure");
  }, [ready, personaNow, pathname, guard]);

  // Set during render so they are in place before child effects run
  if (typeof window !== "undefined") {
    installFetchPatch(backendRef);
    appService.setSecureFetch(backendRef.current.secureFetch);
  }

  useEffect(() => {
    let loaded = loadState();
    const cp = readPersonaCookie();
    if (cp !== loaded.persona) loaded = { ...loaded, persona: cp }; // cookie is the source of truth (middleware reads it)
    stRef.current = loaded;
    setSt(loaded);
    saveState(loaded);
    readyRef.current = true;
    setReady(true);
  }, []);

  // _tide_* envelope roles belong to Vendor A. The committee page (procurement) needs to see them as the
  // motion target, so it gets a read-only view; every other persona sees none.
  const hasRole = (role) => {
    const cur = stRef.current;
    if (role.startsWith("_tide_")) return (cur.persona === "vendor" || isCommittee(cur.persona)) && cur.roles.includes(role);
    return !!PERSONAS[cur.persona]?.realmRoles.includes(role);
  };

  const doEncrypt = async (items) => {
    await sleep(600);
    const out = [];
    for (const it of items) {
      const tag = it.tags?.[0];
      const r = guard(`encrypt:${tag}`);
      if (!r.allow) throw new Error(`Preview: ${r.reason}; cannot encrypt.`);
    }
    for (const it of items) {
      const tag = it.tags[0];
      const ct = mintCiphertext();
      mutate((x) => ({ ...x, plain: { ...x.plain, [tag]: String(it.data) }, ct: { ...x.ct, [tag]: ct } }));
      out.push(ct);
    }
    return out;
  };

  const doDecrypt = async (items) => {
    await sleep(600);
    const out = [];
    for (const it of items) {
      const tag = it.tags?.[0];
      const cur = stRef.current;
      const r = guard(`decrypt:${tag}`, { foreign: it.encrypted !== cur.ct[tag] });
      if (r.allow) {
        out.push(cur.plain[tag]);
      } else {
        throw new Error(`Preview: cannot decrypt (${r.reason}).`);
      }
    }
    return out;
  };

  const approveTideRequests = async (reqs) => {
    await sleep(700);
    return reqs.map((r) => ({ id: r.id, approved: { request: new Uint8Array([80, 82, 69, 86, 73, 69, 87]) } }));
  };

  const noop = async () => {};
  const hasOneRole = (role) => hasRole(role);

  const switchPersona = () => {
    setPersonaCookie(null);
    mutate((x) => ({ ...x, persona: null }));
    window.location.href = "/";
  };

  // SIMULATED: AI agent asks for opened prices; policy decides.
  const readOpenedPrice = () => {
    const r = guard("ai.readPrices");
    if (!r.allow) return { ...r, prices: null };
    const cur = stRef.current;
    const prices = Object.entries(VENDORS).map(([key, v]) => ({
      key,
      name: v.name,
      price: v.you ? Number(String(cur.plain.cc).replace(/[^0-9]/g, "")) || null : v.priceVND,
      deliveryDays: v.you ? Number(cur.plain.dob) || null : v.deliveryDays,
    }));
    return { ...r, prices };
  };

  const preview = {
    persona: st.persona,
    personaLabel: PERSONAS[st.persona]?.label || null,
    vendorRoles: st.roles,
    tenderPhase: phaseOf(st.roles),
    accessLog: st.log || [],
    logAccess,
    switchPersona,
    readOpenedPrice,
    signersFor: (requestId) => ((st.requests || []).find((r) => r.id === requestId)?.signers) || [],
    committee: COMMITTEE_IDS.map((id) => ({ id, label: PERSONAS[id].label })),
  };

  const value = {
    preview,
    // state
    authenticated: ready,
    isInitializing: false,
    contextLoading: !ready,
    isInitialized: true,
    setIsInitialized: () => {},
    baseURL: PREVIEW_BASE_URL,
    realm: PREVIEW_REALM,
    backgroundProcessing,
    setBackgroundProcessing,
    // roles
    hasOneRole,
    hasRealmRole: hasRole,
    hasClientRole: (role) => (role === "tide-realm-admin" ? adminsOf(stRef.current).includes(stRef.current.persona) : false),
    // tokens
    getValueFromToken: (key) => (key === "vuid" ? VUID : key === "preferred_username" ? "demouser" : undefined),
    getValueFromIdToken: (key) => (key === "dob" ? stRef.current.ct.dob : key === "cc" ? stRef.current.ct.cc : key === "vuid" ? VUID : undefined),
    getToken: async () => "preview-fake-access-token",
    getConfig: () => ({ realm: PREVIEW_REALM, "auth-server-url": PREVIEW_BASE_URL }),
    // crypto + approvals
    doEncrypt,
    doDecrypt,
    approveTideRequests,
    // refresh (no-ops)
    refreshToken: noop,
    forceRefreshToken: noop,
    updateToken: noop,
    forceUpdateToken: noop,
    // session
    login: () => { window.location.href = "/home"; },
    logout: () => { setPersonaCookie(null); window.location.href = "/"; },
    secureFetch: backendRef.current.secureFetch,
    _previewVersion: st,
  };

  return (
    <Context.Provider value={value}>
      <PreviewBanner />
      {children}
    </Context.Provider>
  );
}

/** Simulated Tide enclave sign-in shown at "/" in preview mode. */
export function PreviewLanding() {
  const [clearing, setClearing] = useState(false);
  const pick = (id) => {
    const s = loadState();
    saveState({ ...s, persona: id });
    setPersonaCookie(id);
    window.location.href = "/home";
  };
  const Row = ({ id, name, line }) => (
    <button key={id} type="button" onClick={() => pick(id)} className="block w-full rounded-xl border border-[#e6e8ec] bg-white p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#d5d9e0] hover:shadow-[0_8px_24px_rgba(16,24,40,.08)] motion-reduce:transform-none">
      <div className="text-sm font-medium text-slate-900">{name}</div>
      <div className="text-xs text-slate-500">{line}</div>
    </button>
  );
  const Group = ({ pill, tag, title, children }) => (
    <section className="space-y-2">
      <div className="flex items-center gap-2"><span className={"pill " + pill}>{tag}</span><span className="text-xs text-slate-500">{title}</span></div>
      {children}
    </section>
  );
  return (
    <main className="flex-grow w-full px-4 py-12">
      <div className="mx-auto w-full max-w-md space-y-5 rounded-2xl border border-[#e6e8ec] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.06)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Sign in with Tide</h2>
          <span className="pill chip-pending">simulated</span>
        </div>
        <Group pill="pill-buyer" tag="Buyer" title="Lotus Industries (procuring entity)">
          <Row id="procurement" name="Tender committee · You, Procurement head" line="Member #1 · needs 3/5 to act" />
          <Row id="finance" name="Tender committee · Alice, Finance" line="Member #2 · needs 3/5 to act" />
          <Row id="technical" name="Tender committee · Ben, Technical lead" line="Member #3 · needs 3/5 to act" />
          <Row id="audit" name="Tender committee · Carlos, Internal audit" line="Member #4 · needs 3/5 to act" />
          <Row id="independent" name="Tender committee · Dana, Independent member" line="Member #5 · needs 3/5 to act" />
          <Row id="ai" name="AI evaluator" line="Ranks bids after opening" />
        </Group>
        <Group pill="pill-seller" tag="Sellers" title="bidders">
          <Row id="vendor" name="Vendor A (you)" line="Submits a sealed bid" />
          <div className="rounded-xl border border-dashed border-[#e6e8ec] bg-slate-50 p-3 text-sm text-slate-400">Vendors B–E · simulated</div>
        </Group>
        <Group pill="pill-platform" tag="Platform" title="Sealed Tender operator">
          <Row id="itadmin" name="IT admin / DBA" line="Runs the servers, sees only ciphertext" />
        </Group>
        <button
          type="button"
          disabled={clearing}
          onClick={() => { setClearing(true); resetPreviewState(); window.location.reload(); }}
          className="btn-ghost !h-8 text-xs"
        >
          Reset demo state
        </button>
      </div>
    </main>
  );
}

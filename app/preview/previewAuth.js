"use client";

// PREVIEW MODE: a fully simulated auth / crypto / approvals layer so the whole GUI
// can be clicked through without TideCloak. Enabled only when
// NEXT_PUBLIC_PREVIEW_MODE === "1" (see app/context/AuthProvider.js).

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import appService from "../../lib/appService";

export const PREVIEW_BASE_URL = "http://preview.local";
export const PREVIEW_REALM = "tidecloak-demo";
const VUID = "preview-vuid";
const USER_ID = "preview-user-1";
const STORAGE_KEY = "sealedTenderPreviewState.v1";
const BANNER_HEIGHT = 44;

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

function freshState() {
  return {
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
      if (s && s.roles && s.ct && s.plain) return s;
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
    readyToCommit: !!cr.readyToCommit,
    role: cr.role,
    actionType: cr.action,
    userRecord: [{ accessDraft: `${cr.action} realm role ${cr.role} for user demouser (preview draft ${cr.id})` }],
  };
}

/**
 * Creates the mock backend bound to a state ref. All handlers read/write through
 * `get()` / `mutate(fn)` so they are always working on the latest state.
 */
function createBackend(get, mutate) {
  // Handles the same-origin /api/* routes
  async function handleApi(path, search, init) {
    const params = new URLSearchParams(search);
    const s = get();
    await sleep(120);
    switch (path) {
      case "/api/getUserByVuid":
        return json({ ok: true, user: params.get("vuid") === VUID ? buildUser(s) : null });
      case "/api/getUsers":
        return json({ ok: true, users: buildUsers(s) });
      case "/api/checkAdminRole":
        return json({ ok: true, isAdmin: s.isAdmin, user: buildUser(s) });
      case "/api/commitAdminRole":
        await sleep(700);
        mutate((x) => ({ ...x, isAdmin: true }));
        return json({ ok: true });
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
          mutate((x) => ({ ...x, requests: x.requests.map((r) => (r.id === id ? { ...r, readyToCommit: true } : r)) }));
          return json({ mode: "recorded" });
        }
        return json({ mode: "needs-approval", requestModel: btoa("preview-enclave-carrier-" + id) });
      }
      if (action === "deny") {
        mutate((x) => ({ ...x, requests: x.requests.filter((r) => r.id !== id) }));
        return json({});
      }
      // commit: apply the role change, then drop the request
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
      mutate((x) => {
        let next = x.nextReq;
        const added = list.map((r) => ({
          id: `cr-${next++}`,
          role: r.name,
          action: method === "POST" ? "GRANT" : "REVOKE",
          readyToCommit: false,
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
          boxSizing: "border-box", padding: "3px 8px", textAlign: "center", lineHeight: 1.25,
          background: "#fbbf24", color: "#451a03", borderBottom: "2px solid #b45309",
          fontSize: 12, fontWeight: 600, display: "flex", flexDirection: "column", justifyContent: "center",
        }}
      >
        <div>PREVIEW MODE — simulated locally, not connected to TideCloak</div>
        <div style={{ fontWeight: 400, fontStyle: "italic" }}>CHẾ ĐỘ XEM TRƯỚC — mô phỏng, không kết nối TideCloak</div>
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

  const backendRef = useRef(null);
  if (!backendRef.current) backendRef.current = createBackend(get, mutate);

  // Set during render so they are in place before child effects run
  if (typeof window !== "undefined") {
    installFetchPatch(backendRef);
    appService.setSecureFetch(backendRef.current.secureFetch);
  }

  useEffect(() => {
    const loaded = loadState();
    stRef.current = loaded;
    setSt(loaded);
    saveState(loaded);
    readyRef.current = true;
    setReady(true);
  }, []);

  const hasRole = (role) => stRef.current.roles.includes(role);

  const doEncrypt = async (items) => {
    await sleep(600);
    const out = [];
    for (const it of items) {
      const tag = it.tags?.[0];
      if (!stRef.current.roles.includes(`_tide_${tag}.selfencrypt`)) {
        throw new Error(`Preview: missing role _tide_${tag}.selfencrypt, cannot encrypt.`);
      }
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
      if (cur.roles.includes(`_tide_${tag}.selfdecrypt`) && it.encrypted === cur.ct[tag]) {
        out.push(cur.plain[tag]);
      } else {
        throw new Error(`Preview: cannot decrypt (no _tide_${tag}.selfdecrypt role or not an envelope this session can open).`);
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

  const value = {
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
    hasClientRole: (role) => (role === "tide-realm-admin" ? stRef.current.isAdmin : false),
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
    logout: () => { window.location.href = "/"; },
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

/** Simple landing card shown at "/" in preview mode. */
export function PreviewLanding() {
  const [clearing, setClearing] = useState(false);
  return (
    <main className="flex-grow w-full pt-6 pb-16">
      <div className="w-full px-8 max-w-screen-md mx-auto">
        <div className="bg-amber-50 border border-amber-300 rounded shadow p-6 space-y-4">
          <div className="text-xl font-bold text-gray-800">🔒 Sealed Tender</div>
          <h2 className="text-3xl font-bold">Preview mode</h2>
          <p>
            The Tide network is not used here. Login, encryption and committee approvals are all simulated locally in your browser so you can click through every screen.
          </p>
          <p className="text-sm italic text-gray-600">Chế độ xem trước: mọi thứ được mô phỏng cục bộ.</p>
          <div className="flex items-center gap-4">
            <Link href="/home" className="inline-block rounded bg-gray-800 px-5 py-2 text-white hover:bg-red-700">
              Enter preview
            </Link>
            <button
              type="button"
              disabled={clearing}
              onClick={() => { setClearing(true); resetPreviewState(); window.location.reload(); }}
              className="text-sm text-gray-500 underline"
            >
              Reset demo state
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

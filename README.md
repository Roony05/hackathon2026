## Project overview

**Sealed Tender is a two-envelope procurement portal where bids stay sealed until a tender-committee quorum opens them: no procurement head, IT admin, platform operator or AI agent can peek early or bend the rules alone.**

**Vision & originality**
Tendering runs on the sealed envelope, but e-procurement broke that promise: whoever runs the database holds every envelope. Sealed Tender restores it. Bids are encrypted in the vendor's browser, and tender rules (deadline, who may open what) change only when a committee quorum signs.

**Trust constraint insight**
Bid rigging rarely needs hacking. One insider reads rivals' prices and tips off a favoured vendor, or quietly extends the deadline. Such collusion was central to Vietnam's AIC and Việt Á procurement scandals. With ordinary login and backend permissions, the DBA or procurement head can do both.

**Value & impact**
Buyers get real competition and lower prices, honest vendors win on merit, and auditors get signed evidence. Example: Lotus Industries is buying 40 CNC machines (estimate ₫15bn). A vendor tipped off about a ₫12.45bn rival bid undercuts it by 1% and wins. Here, it stays ciphertext until 3 of 5 committee members sign.

**Why TideCloak matters**
- Envelopes are encrypted at the edge with TideCloak tags. Decryption needs a role in a Fabric-signed token, so the database, server and AI agents hold only ciphertext.
- Opening envelopes or re-accepting submissions is a role change that needs 3-of-5 quorum, with no backdoor commit.
- Without TideCloak, the server holds the keys and its admin becomes the new trusted party.

**Prototype & storytelling**
Vendor A seals a price nobody can reopen, not even Vendor A. The Insider View shows a leaked database as ciphertext. The committee tables a motion that takes effect only at 3/5 signatures. The Tender Board then opens envelopes and ranks bids.

---

## 🎬 Demo video

[demo.mp4](./demo.mp4) — 2 minutes.

The video is recorded in **simulated TideCloak mode** (banner visible). On 22 Oct 2026, Tide's licence service returned `Midgard.FinalizeWallet 500` during realm setup. We therefore followed the organisers' fallback instruction: *"Build this app as though TideCloak protects it. Use Tide's MCP to plan where TideCloak fits, and simulate TideCloak's sign-in, roles and access checks for now."* The plan made with Tide's MCP is in [docs/TIDECLOAK_PLAN.md](docs/TIDECLOAK_PLAN.md). Sign-in, roles and access checks are simulated exactly where TideCloak enforces them. The same screens run on real TideCloak when `NEXT_PUBLIC_PREVIEW_MODE` is unset, which is the default.

## What is real and what is simulated

| Part | Status |
|---|---|
| BYOiD login (Tide account) | Real TideCloak |
| Vendor A's technical and financial envelopes, encrypted and decrypted in the browser | Real TideCloak (tags `dob` = technical envelope, `cc` = financial envelope) |
| Committee motions: draft, sign, commit, which change Vendor A's read/write roles | Real TideCloak governance. You sign as member #1; members 2–5 are simulated, as in the TideCloak playground |
| Vendors B–E, their prices, and the "who tried to break the rules" panel | Simulated (synthetic data) |

Where each TideCloak capability fits, including the next step (Forseti policy-governed decryption by the committee), is mapped in [docs/TIDECLOAK_PLAN.md](docs/TIDECLOAK_PLAN.md). That plan was produced with Tide's MCP.

## Pages

- **Tender Board** (`/tender`): tender phases, the bids table, and the ranking once financial envelopes are opened.
- **My Sealed Bid** (`/user`): Vendor A submits the technical envelope and seals the financial envelope.
- **Insider View** (`/databaseExposure`): what a procurement head, DBA or hacker with a database dump sees.
- **Tender Committee** (`/admin`): motions to close submissions or open envelopes, which need 3 of 5 signatures.

## Setup (GitHub Codespaces, about 5 minutes)

1. Open this repository in Codespaces: **Code → Codespaces → Create codespace on main**.
2. Wait for the automatic setup. It installs `libssl-dev`, rewrites the config files with your Codespace URLs, runs `npm install`, starts TideCloak in Docker and runs the Next.js dev server.
3. The app opens on port **3000**, and TideCloak runs on port **8080** (admin console login `admin` / `password`). If the page says the TideCloak port is private, open the **Ports** tab, right-click port 8080 and set it to Public.
4. Accept the "Invitation to Bid" email mock-up, then create or link a Tide account and log in.
5. Suggested path: **My Sealed Bid** (seal a price) → **Insider View** → **Tender Committee** (join, untick *Accept submissions* and tick *Open* on the financial envelope, table the motion, review, sign, commit) → **Tender Board**.

To start again from a clean realm, run `bash reset-and-restart.sh` and restart the dev server.

### Offline preview (only if Tide's network is unavailable)

Set `NEXT_PUBLIC_PREVIEW_MODE=1` in `.env` and restart `npm run dev` to click through every screen with **simulated** login, encryption and approvals. You sign in as one of four personas (Vendor A, Procurement head, IT admin / DBA, AI evaluation agent). Each persona has its own roles, every protected action goes through an allow/deny check with a logged reason, and `middleware.js` applies a simulated server-side route check. A permanent amber "PREVIEW MODE — simulated" banner is shown, and nothing talks to TideCloak. Preview mode is off by default; the prototype itself runs on real TideCloak.

## Tóm tắt tiếng Việt

**Sealed Tender** là cổng đấu thầu "hai túi hồ sơ": giá dự thầu được mã hoá ngay trên trình duyệt của nhà thầu. Trưởng phòng mua sắm, IT admin, đơn vị vận hành nền tảng hay AI đều chỉ thấy chuỗi mã hoá. Mọi thay đổi luật thầu (đóng thầu, gia hạn, mở túi tài chính) phải được 3/5 thành viên hội đồng ký duyệt qua TideCloak, nên không một cá nhân nào có thể "thông thầu" một mình.

## Credits

Built on the [TideCloak developer playground](https://github.com/tide-foundation/tidecloak-playground) by Tide Foundation for RMIT Hackathon 2026 (Challenge 2 · UNLOCKED). All companies, people and bids in the demo are fictional.

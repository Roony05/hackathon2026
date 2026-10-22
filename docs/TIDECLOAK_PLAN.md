# Where TideCloak fits in Sealed Tender

Planned with Tide's MCP (`@tideorg/mcp` v1.9.33). Its scenario match was **`iga-admin-governance`**, and the canon files used were `feature-mapping`, `troubleshooting`, `invariants` and `agent-authority`.

## Capability map

| Sealed Tender needs… | TideCloak feature | In this prototype |
|---|---|---|
| Vendors and committee members sign in without a password store an insider could abuse | BYOiD / PRISM login (`tidebrowser` flow); each user is an anonymous `vuid` | **Real** in TideCloak mode; **simulated** persona sign-in in preview mode |
| A bid price nobody can read before opening, not even the DBA | Tag-based E2EE: `doEncrypt` / `doDecrypt` with `_tide_<tag>.selfencrypt/selfdecrypt` (tags `dob` = technical envelope, `cc` = financial envelope; the roles are kept, never renamed, per troubleshooting T-13) | **Real** (self-encryption of Vendor A's envelopes); **simulated** in preview mode |
| Rule changes (close submissions, extend the deadline, open envelopes) need several people | IGA change requests: a role grant or revoke is a draft until a T-of-N quorum signs, then committed | **Real** draft → review → sign → commit flow (members 2–5 simulated, as in the playground); **simulated** in preview mode |
| Pages and APIs refuse the wrong persona | Server-side JWT plus role verification, with DPoP-bound tokens (`middleware.js` → `verifyTideCloakToken`). A UI check is not authorization. | **Real** route check in TideCloak mode; a cookie-based persona check in `middleware.js` in preview mode |
| The committee, not just the vendor, decrypts prices at opening | **Policy-governed VVK encryption** (`IAMService.doEncrypt(data, signedPolicyBytes)`) with a **Forseti contract**: "decrypt only after the deadline AND 3-of-5 committee signatures" | **Next step.** The contract is written by us and deployed by the Tide team. The prototype instead has each vendor reveal its own envelope once the quorum grants the read role |
| An AI evaluation agent ranks bids only after opening | Agent-authority pattern: one TideCloak principal per agent role, holding one role and acting through a human-owned browser session. Agents cannot hold Tide identities headlessly (GAP-063/064). | **Simulated** `ai` persona: requests for prices are denied before phase 3 and allowed after |
| Tamper-evident record of who changed the rules | Signed change requests with an audit trail | Change-request history is real; the "access log" panel is simulated |

## Persona → roles (preview simulation)

| Persona | Realm roles | Envelope roles | Can | Cannot |
|---|---|---|---|---|
| Vendor A | `vendor` | `_tide_dob.selfencrypt/selfdecrypt`, `_tide_cc.selfencrypt` (read only after a committed motion) | Submit or seal own envelopes; read own technical envelope | Read its own sealed price before opening; see rivals' bids |
| Procurement head (committee #1) | `committee-member`, `procurement-head` | none | Table and sign motions | Open envelopes or extend the deadline alone (needs 3/5) |
| IT admin / DBA | `it-admin` | none | Export the database (ciphertext only) | Decrypt anything; grant itself roles |
| AI evaluation agent | `ai-agent` | none | Read prices after phase 3 | Read prices before opening |

## Real-mode setup notes (from the Tide MCP work order)

- **Before creating a realm**, the licence email and acceptance of Tide's Terms (https://tide.org/legal) must come from the user. Don't rely on the playground's default `email@tide.org`.
- On 22 Oct 2026, `setUpTideRealm` failed upstream with `Midgard.FinalizeWallet 500` (`TIDE-IDPEXT-VENDOR-KEYGEN_FAILED`). Following the organisers' fallback instruction, the app therefore runs in simulated mode by default. Set `NEXT_PUBLIC_PREVIEW_MODE=0` for real TideCloak.

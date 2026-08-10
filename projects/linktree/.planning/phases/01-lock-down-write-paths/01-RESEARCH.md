# Phase 1: Lock Down Write Paths — Research

**Researched:** 2026-08-10
**Phase goal:** Every write endpoint refuses strangers, oversized payloads, and abuse — the S3 bill stops being exposed to the internet
**Requirements:** SEC-11, SEC-12, SEC-01…SEC-08 (10 total)

> **Provenance note.** Two `gsd-phase-researcher` subagent runs exhausted their token budget
> without writing this file. It was produced inline by the orchestrator from direct file reads,
> two doc lookups (NextAuth v4 callbacks/pages, Vercel function limits), and one local `node`
> experiment on `atob`. Everything below is either quoted from a read file, cited to a URL, or
> marked `**UNRESOLVED**`. Nothing is asserted from memory alone.

---

## Verified Stack Facts

Read directly from `package.json`:

| Dep | Version | Relevance |
|-----|---------|-----------|
| `next` | 15.2.8 | App Router. No `export const config` body-size knob (Pages-Router-only). |
| `next-auth` | ^4.24.7 | **v4**, not v5/Auth.js. v4 callback semantics apply. |
| `@auth/mongodb-adapter` | ^3.8.0 | Adapter present ⇒ **database session strategy**, not JWT. Critical — see SEC-11. |
| `mongoose` | ^8.12.0 | Node runtime only. Confirms D-30's rejection of middleware. |
| `mongodb` | ^6.14.0 | Raw driver, used by `lib/db.js` for the adapter. Two DB clients coexist. |
| `@aws-sdk/client-s3` | ^3.758.0 | v3 modular. `ListObjectsV2Command` / `DeleteObjectsCommand` available. |
| `react-toastify` | ^11.0.5 | Already wired in `lib/upload.js:29`. All refusal UX rides this. |
| `uuid` | ^11.1.0 | Used for S3 keys. |

**No test framework.** `devDependencies` is eslint + tailwind + `@types/sortablejs` only. `scripts`
has `dev`, `build`, `start`, `lint` — no `test`. This is load-bearing for Validation Architecture below.

**No `CLAUDE.md`, no `.claude/skills/`, no `.agents/skills/`** — no project-specific agent rules to honour.

**Runtime:** node v24.14.1 locally. `atob` is a global (no import needed) — confirmed by experiment.

### Complete write-surface inventory

`find app -name route.js` + `ls action/` gives the full set of write paths. There are **five**, not three:

| Surface | File | Session today? | Gate needed |
|---------|------|---------------|-------------|
| Upload | `app/api/upload/route.js` | ✗ **none** | SEC-01,02,03,04,05 |
| Click | `app/api/click/route.js` | ✗ by design (public) | SEC-08, SEC-05 (per-IP) |
| Username claim | `action/grabusername.js` | ✓ checked | SEC-06,07, SEC-05 |
| Page save ×3 | `action/PageAction.js` | ✓ checked | SEC-05 |
| Page read | `app/api/page/route.js` | ✓ checked, GET only | none (read path) |

`SavePageSetting`, `SavePageButton`, `SavePageLinks` are three separate exports in one file — the
rate limiter must be applied to each, or to a shared wrapper. **Planner decision point.**

Upload callers: `components/forms/PageSettingForm.js:10` and `components/forms/PageLinkForm.js:8`,
both importing the single default export from `lib/upload.js`. One client-side chokepoint (D-29).

---

## SEC-11 — Invite-only allowlist (D-01…D-05)

### Current code

`app/api/auth/[...nextauth]/route.js:28-33` already has a `signIn` callback. It is a no-op:

```js
async signIn({ user, account, profile }) {
  if (user.email) { return true; }
  return false;
}
```

This is the drop-in point. The change is replacing the body, not adding a callback.

### NextAuth v4 return semantics — verified

From the [callbacks docs](https://next-auth.js.org/configuration/callbacks):
- Return `true` → sign-in proceeds.
- Return `false` → "Return false to display a default error message." Blocks sign-in.
- Return a string URL → redirect; "Redirects returned by this callback cancel the authentication flow."

From the [pages docs](https://next-auth.js.org/configuration/pages), `AccessDenied` is one of exactly
four error-page codes, and it "Usually occurs, when you restricted access through the `signIn`
callback, or `redirect` callback." **This confirms D-03's mechanism: returning `false` produces
`?error=AccessDenied`.**

The error lands on the *error* page, not the sign-in page. Sign-in-page errors are a separate list
(`OAuthSignin`, `OAuthCallback`, `CredentialsSignin`, …). To make D-03 work — the message showing on
the login page — configure `pages` in `authOptions`:

```js
pages: { signIn: '/login', error: '/login' }
```

Pointing `error` at `/login` puts `?error=AccessDenied` on the existing page. `app/(default)/login/page.js`
is already `'use client'`, so it can read the param with `useSearchParams()` and render D-03's copy.
**Caveat:** `useSearchParams()` in App Router requires a `<Suspense>` boundary or the build warns/errors
on static generation. The planner should account for that.

> Docs note the routes listed in `pages` "must really exist" — `/login` does, at
> `app/(default)/login/page.js`. The `(default)` segment is a route group and does not appear in the URL.

### The session-survival problem (D-06 interaction)

`adapter: MongoDBAdapter(clientPromise)` at line 8 means **database sessions**. Sessions live as rows
in the adapter's `sessions` collection, not in a signed cookie. This is why D-06 is right to wipe
`sessions` alongside `users`/`accounts` — dropping them invalidates every live login. With a JWT
strategy the wipe would *not* have logged anyone out. Worth stating in the plan so nobody "optimises"
the adapter collections out of the wipe list.

Second-order: `signIn` fires on login, not on every request. An allowlist removal does not evict a
live session. Out of scope for Phase 1 (allowlist is insert-only per D-05), but a real ceiling —
**worth a `ponytail:` note in the code**, and it interacts with Phase 1.5's admin remove-email UI.

`signIn` runs on the Node runtime, so mongoose is available. But the adapter uses the raw `mongodb`
client from `lib/db.js` while everything else uses mongoose via `lib/connectToDB.js`. **Planner
decision point:** read `AllowedUser` through mongoose (consistent with D-30's `lib/` helpers and the
`models?.X || model(...)` idiom) or through the already-open `clientPromise` (avoids a second
connection during the auth handshake). Recommend mongoose for consistency; the connection is
idempotent (`readyState >= 1` guard at `lib/connectToDB.js:4`).

---

## SEC-12 — The destructive wipe (D-06…D-08)

**Ordering: this runs FIRST, before any gate.** Everything else is easier afterwards — no backfill
(D-08), no username migration (D-25).

### Collections to drop

Mongoose-owned (from `models/`): `pages`, `users`, `events` — note mongoose pluralises + lowercases,
so `model('Page')` → collection `pages`.

Adapter-owned: `users`, `accounts`, `sessions`.

> **Collision worth flagging:** mongoose's `User` model → collection `users`, and the NextAuth
> MongoDB adapter *also* uses `users`. These are very likely **the same collection**, which explains
> why `models/User.js` carries an `emailVerified: Date` field (an adapter field, not an app field).
> Dropping `users` once handles both. The plan should not treat them as two separate drops and should
> not be surprised when the second drop reports "namespace not found."
> **UNRESOLVED:** not confirmed against the live Atlas database. Next check: list collections in
> Atlas before the wipe and record the actual names. A drop of a non-existent collection is
> harmless, so the risk is low either way.

### S3 bucket emptying

`DeleteObjectsCommand` caps at **1000 keys per call**, and `ListObjectsV2Command` returns at most 1000
per page — so the loop is paginate-then-batch-delete, keyed on `IsTruncated` / `NextContinuationToken`.
Both commands exist in `@aws-sdk/client-s3` v3.758. The S3 client construction is currently inline at
`app/api/upload/route.js:8-14` (region `eu-north-1`, env `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `BUCKET_NAME`).

The wipe script needs a client too, and Phase 1.5 will need one for deletes. Extracting `lib/s3.js`
is the obvious move — but note D-30's discretion clause leaves this to the planner.

**Bucket-wide delete permission** may not be on the current IAM key, which has only ever done
`PutObject`. **UNRESOLVED:** next check is whether the key has `s3:ListBucket` + `s3:DeleteObject`.
The plan should treat "wipe script errors with AccessDenied" as an expected first-run outcome with a
documented IAM fix, not as a bug.

### Shape

D-07 confirms irreversible, including the owner's own page (re-claimed after). Discretion clause in
CONTEXT.md: "it must be explicit and reviewable, not an ad-hoc shell command." A committed
`scripts/wipe.js` run via `node scripts/wipe.js` satisfies that. Recommend a required confirmation
argument (e.g. refuses to run without `--yes-destroy-everything`) so it cannot fire by accident —
this file will still be in the repo long after Phase 1.

---

## SEC-01/02/03/04 — Upload gates (D-09…D-16, D-28, D-29)

### Current handler, line by line

`app/api/upload/route.js` — 36 lines, no session check anywhere. Flow:
1. `req.formData()` (line 5)
2. `file.stream()` → `chunks[]` → `Buffer.concat(chunks)` (lines 19-22, 27)
3. `PutObjectCommand` with `ACL: 'public-read'`, `ContentType: file.type` ← **client-supplied** (line 28)
4. Returns the URL string

**The buffer already exists in memory at line 27.** D-14's magic-byte check needs no restructuring —
it reads `Buffer.concat(chunks)` before the `PutObjectCommand`.

Also note the extension is taken from `file.name` (line 16) — attacker-controlled. Once magic bytes
are authoritative, the extension should be derived from the *detected* type, not the filename.

### Gate ordering (cheapest-first, all before the S3 call)

1. **Session** (SEC-01) → 401. Use `getServerSession(authOptions)`, matching the established pattern
   at `action/PageAction.js:11` and `app/api/page/route.js:8`.
2. **Size** (SEC-02) → 413. `file.size` from the FormData entry is available *before* buffering —
   check it there and avoid reading 4 MB into memory to reject it.
3. **Magic bytes** (SEC-03) → 415. Needs the buffer; only the first 12 bytes matter.
4. **Quota** (SEC-04) → 413-or-429. One `Upload.aggregate` sum per owner.
5. **Rate limit** (SEC-05) → 429.
6. Then S3, then `Upload.create`.

D-28 fixes the status codes: **401** no session, **413** too large, **415** disallowed type. Note
the current handler returns `Response.json({error})` with an implicit **200** on the no-file branch
(line 34) — a bug in its own right, same class as SEC-08.

### Magic bytes (D-14)

Signatures needed for the three allowed formats (D-13: jpeg, png, webp; **no SVG**, no GIF):

| Format | Offset | Bytes | Note |
|--------|--------|-------|------|
| JPEG | 0 | `FF D8 FF` | 3 bytes suffice |
| PNG | 0 | `89 50 4E 47 0D 0A 1A 0A` | full 8-byte signature is standard; first 4 (`\x89PNG`) is the common short check |
| WEBP | 0 and 8 | `52 49 46 46` (`RIFF`) at 0, `57 45 42 50` (`WEBP`) at 8 | **two-part check** — RIFF alone is also WAV/AVI |

So: read 12 bytes, three comparisons. `buffer.subarray(0,4).toString('ascii')` or `readUInt32BE`
both work; no dependency. D-14's "~10 lines" estimate holds.

**Mismatch policy — planner decision.** Magic bytes are authoritative (that is the whole point of
D-14). Simplest correct behaviour: ignore `file.type` entirely for the *decision*, and set S3's
`ContentType` from the detected type rather than the client's. That closes the D-15 XSS concern
properly: today a client could send `Content-Type: image/svg+xml` on a PNG-magic file and S3 would
serve it as SVG. Detecting-then-setting removes that vector, which client-type-trusting does not.

### Quota (D-11, D-12)

`Upload { owner, key, size, url, createdAt }`. Quota = `sum(size) where owner = email`, cap 25 MB.
Check *before* the S3 put; create the record *after* a successful put. Order matters — a failed put
that already wrote a record permanently burns quota.

**Race:** two concurrent uploads can both pass the check and jointly exceed the cap. Serverless makes
this reachable. Real ceiling, small blast radius (bounded by one extra file ≤ 4 MB). Recommend a
`ponytail:` comment naming it rather than a transaction — Atlas free tier is a replica set so
transactions exist, but they are not worth it for a 4 MB overshoot.

Index `Upload { owner: 1 }` for the aggregate.

### The 4 MB cap vs Vercel (D-10)

Confirmed: Vercel Functions cap request **and** response bodies at **4.5 MB**, returning
`413 FUNCTION_PAYLOAD_TOO_LARGE`. Enforced by Vercel's infrastructure, **not** by Next.js — it cannot
be raised in `vercel.json` or app code. App Router has no `bodyParser.sizeLimit` equivalent
(that was Pages Router only).
Sources: [Vercel Functions Limits](https://vercel.com/docs/functions/limitations),
[next.js#57501](https://github.com/vercel/next.js/issues/57501),
[next.js discussion#70621](https://github.com/vercel/next.js/discussions/70621).

This *validates D-10's reasoning*: at 4 MB the app's own 413 fires first with a readable message;
above 4.5 MB the platform's opaque 413 wins before the handler ever runs. **Consequence for
validation: a >4.5 MB upload test proves nothing about our code** — it tests Vercel. The meaningful
test is 4–4.5 MB, where our gate is the one that must fire. Worth calling out so nobody writes a
6 MB test and declares SEC-02 verified.

D-29's client pre-check in `lib/upload.js` matters more than usual here: it is the only thing that
gives a good message for a 10 MB file, since the server never sees it.

---

## SEC-05 — Rate limiting (D-17…D-20)

### The TTL correctness trap — most important finding in this document

MongoDB's TTL monitor runs on a **~60 second sweep interval**, and deletion is not instantaneous even
then (it is a background pass over the index). A document whose `expiresAt` has passed can therefore
remain readable for up to a minute or more.

**Consequence: the limiter must NOT treat "document exists" as "window is active."** It must compare
`expiresAt` in its own query. Otherwise a user who hits the limit at second 0 stays blocked past the
window's real end, and — worse — a stale high `count` gets incremented instead of a fresh window
starting. A naive "upsert and read `count`" implementation is silently wrong for up to a minute per
window, which is 100% of the window for a 60/min limit.

The fix is a single atomic `findOneAndUpdate` whose **filter includes `expiresAt: { $gt: now }`**, with
`upsert: true` and `returnDocument: 'after'`. A stale doc fails the filter → upsert path → fresh
window with `count: 1`. TTL deletion becomes pure garbage collection, never correctness-bearing.

Sketch (planner refines):
```
filter: { key, expiresAt: { $gt: now } }
update: { $inc: { count: 1 }, $setOnInsert: { key, expiresAt: now + windowMs } }
opts:   { upsert: true, new: true }
→ over limit if returned count > max
```

**Upsert race:** two concurrent lambdas can both miss and both attempt an insert; one gets a
duplicate-key error (E11000) given a unique index on `key`. Standard handling is to catch E11000 and
retry once — the retry finds the winner's doc and increments it. Needs `{ key: 1 }, unique: true`.
Without the unique index there is no error, but you get two documents for one key and the limit
silently doubles. **The unique index is load-bearing, not an optimisation.**

Indexes: `{ key: 1 }` unique, and `{ expiresAt: 1 }, { expireAfterSeconds: 0 }` for TTL.

`expireAfterSeconds: 0` means "expire at the time in this field" — the standard idiom for
per-document TTL, as opposed to a fixed-age TTL. The field must hold a `Date`, not a number.

This is a **fixed window**, not sliding — cheapest thing that works, and D-19's limits have enough
headroom that boundary bursts (up to 2× at a window edge) do not matter. Worth a `ponytail:` comment.

### Keys and limits

D-18: session email when authenticated, `x-forwarded-for` IP otherwise. On Vercel, `x-forwarded-for`
may be a comma-separated chain — take the **first** entry. Namespace the key by action or a user hits
one shared bucket: `upload:alice@x.com`, `click:1.2.3.4`.

D-19 limits: upload 10/min, page save 30/min, claim 5/hour, click 60/min per IP.

### Refusal (D-20)

429 + `Retry-After`. Route handlers can set headers via `Response.json(body, { status, headers })`.
**Server actions cannot** — they return values, not responses, so `SavePageSetting` et al. must
return something like `{ success: false, error: 'rate_limited', retryAfter }` and the calling
component raises the toast. That asymmetry between the two write surfaces is exactly D-30's point,
and the planner needs to spec both shapes. The existing actions already return bare booleans
(`PageAction.js:28,30`), so their return contract is changing — check the callers.

---

## SEC-06/07 — Username validation (D-21…D-25)

`action/grabusername.js` currently validates **nothing** beyond presence (line 12) and uniqueness
(line 35). Lowercasing already happens at line 11 (`?.toLowerCase()`), consistent with D-21.

Rules: `^[a-z0-9_-]+$` (D-21), length 3–30 (D-22), reserved list = app routes
(`api`, `account`, `login`, `about`) + ~30 admin-ish words (D-23).

**Actual app routes, from `find app`:** `api`, `login`. Plus whatever else lives under `app/` — the
planner should enumerate the real directory list rather than trusting the four names in D-23, since
a route added later that collides with a claimed username is an unrecoverable conflict. Reserved list
should be a superset of the real routes.

D-24 requires one server-side source of truth shared by action and form. A single exported
`validateUsername(name) → { ok, error }` in `lib/` (D-30) called by the action, with the form calling
the same function or just rendering the action's returned error. Note the form is a client component
— importing from a `'use server'` file would be wrong, so the validator belongs in a plain `lib/`
module, not in the action file.

D-25: the wipe removes all claimed usernames, so no migration. Confirmed — nothing to grandfather.

**Pre-existing bug to avoid regressing:** line 13-15 returns `undefined` (bare `return`) when no
username is given, while every other path returns `{success, error}`. Phase 2's FIX-02 touches this
same form's success/failure branch; D-24 says keep the contract stable. Making all paths return the
object shape is in-scope cleanup and helps FIX-02.

Also visible: lines 20-23 hold the private `mongoose.connect` + `isConnected` flag that Phase 2's
FIX-09 removes. **Do not fix it here** — out of phase scope — but new code in this file must use
`lib/connectToDB.js`, not that flag.

---

## SEC-08 — `/api/click` hardening (D-26, D-27)

The whole file is 11 lines. Line 6: `const uri = atob(searchParams.get('url'));`

**Experimentally verified locally on node v24 — there are two distinct bugs, not one:**

```
null                   -> "ée"          (no throw!)
""                     -> ""            (no throw)
"abc"                  -> "i·"          (no throw)
"!!!"                  -> THROWS InvalidCharacterError
"aHR0cHM6Ly94LmNvbQ==" -> "https://x.com"
```

1. **Malformed base64 → 500.** `atob('!!!')` throws `InvalidCharacterError`; nothing catches it, so
   the route 500s. This is the bug SEC-08 names.
2. **Missing param → silent garbage, HTTP 200.** `searchParams.get('url')` returns `null` when absent,
   and `atob(null)` does **not** throw — it stringifies to `"null"` and decodes to `"ée"`. So
   `POST /api/click` with no params writes `Event { type:'click', url:'ée', page:null }` and returns
   `true`. Arguably worse than the 500: it is undetectable garbage in the analytics collection.

Any fix must handle **both**: check the param is present and non-empty *before* decoding, and wrap the
decode. Only checking for throws leaves bug 2 live. Round-tripping (`btoa(atob(x)) === x`) is the
reliable validity check, since `atob` accepts plenty of junk without complaint.

D-27: verify the `page` exists before `Event.create` — otherwise anyone can inflate `Event` with
arbitrary page names. `Page.findOne({ uri: page })` adds one indexed read per click; `uri` is already
`unique: true` (`models/Page.js:5`) so it is indexed. Return 400 on unknown page.

There is no `GET` handler and no view-event route in this file, so the click endpoint is the only
public write. Combined with the 60/min IP limit (D-19) that is the full surface.

---

## Validation Architecture

**There is no test framework in this project.** Confirmed: `package.json` `devDependencies` contains
only eslint, tailwind, and `@types/sortablejs`; `scripts` has no `test` entry. No jest, vitest,
playwright, or supertest.

**Recommendation: do not install one for Phase 1.** These are HTTP-boundary and database-behaviour
gates; the honest proof is hitting the running endpoint and observing the status code. A test
framework would mostly be scaffolding around `fetch`. The lightest thing that actually proves these
gates is a committed `scripts/verify-phase1.js` — plain node, `fetch` + `assert`, run against
`npm run dev` — printing one PASS/FAIL line per requirement.

Two things genuinely need unit-level checks because they are pure logic with sharp edges, and both
can live as `assert` self-checks inside the same script:
- `validateUsername` — charset/length/reserved boundaries (2 vs 3 vs 30 vs 31 chars).
- magic-byte sniffing — feed it crafted buffers; must accept the three real signatures and reject
  `RIFF`-without-`WEBP` and an SVG.

The rate limiter is the one thing a script cannot cheaply prove end-to-end: the 5/hour claim limit
would take an hour to observe honestly. Recommend making the window/max injectable so the check can
run a 3-request-per-2-second window, plus one manual Atlas inspection confirming both indexes exist.

### Signal per requirement

| REQ | Observable signal that proves it holds |
|-----|----------------------------------------|
| SEC-11 | Sign-in with a non-allowlisted Google account → lands on `/login?error=AccessDenied`, message rendered, **and no new row in `users`**. The DB check matters — a UI-only check would pass even if the account were created then rejected. |
| SEC-12 | After the wipe: `pages`, `events`, `accounts`, `sessions` count 0; `ListObjectsV2` on the bucket returns `KeyCount: 0`; a previously-logged-in browser is signed out on next request. |
| SEC-01 | `POST /api/upload` with no session cookie → **401**. Same request with a valid cookie → 200. |
| SEC-02 | 4.2 MB file → **413** *(not >4.5 MB — that is Vercel's 413, not ours; see D-10 note above)*. 3.9 MB file → 200. |
| SEC-03 | An SVG, and a file whose bytes are SVG but whose `Content-Type` claims `image/png` → **415** both times. Real PNG/JPEG/WEBP → 200. The spoofed case is the one that proves magic bytes are authoritative. |
| SEC-04 | Upload until `sum(size) ≥ 25 MB`, next upload refused with the D-16 message, and **no new S3 object** appears (check bucket count, not just the response). |
| SEC-05 | 11 uploads inside 60s → 11th returns **429** with a `Retry-After` header. Claim/page-save equivalents via injected short window. Plus: `RateLimit` collection has a unique index on `key` and a TTL index on `expiresAt` — verify in Atlas. |
| SEC-06 | Claiming `api`, `login`, `admin`, `root` → refused, reason shown. |
| SEC-07 | `ab` (2), `a`×31, `Bad.Name`, `has space`, `emoji🎉` → all refused; `valid_name-3` → accepted. |
| SEC-08 | `POST /api/click` with: no params → **400**; `?url=!!!` → **400**; `?url=<valid>&page=nonexistent` → **400**; valid+existing → 200 and exactly one `Event` written. **And `Event` count unchanged across all failure cases** — proving no garbage rows. |

Two cross-cutting signals worth asserting once at the end:
- `npm run build` succeeds (catches the `useSearchParams`/Suspense trap on `/login`).
- `grep` finds no new `mongoose.connect(` outside `lib/connectToDB.js` — protects Phase 2's FIX-09.

---

## Planner Decision Points

Flagged above, collected here. None are blocking; all are within the D-30 discretion clause.

1. `AllowedUser` read via mongoose vs the adapter's `clientPromise`. Recommend mongoose.
2. Extract `lib/s3.js`, or construct the client inline in the wipe script too. Recommend extracting —
   Phase 1.5's delete needs it as well.
3. Rate-limit application to `PageAction.js`'s three exports: one shared wrapper vs three call sites.
4. Whether the wipe script requires a confirmation flag. Recommend yes.
5. Whether SEC-03's fix also sets S3 `ContentType` from detected type. Recommend yes — it closes the
   spoofing vector that magic-byte checking alone leaves open.
6. Reserved-word list contents (explicit CONTEXT.md discretion) — enumerate real `app/` routes first.

## Unresolved

- **`users` collection collision** between mongoose's `User` and the NextAuth adapter. Strong
  circumstantial evidence (the `emailVerified` field in `models/User.js`) but unconfirmed against
  live Atlas. Next check: list collections in Atlas pre-wipe. Low risk — dropping a non-existent
  collection is a no-op.
- **IAM permissions** for bucket-wide list+delete. The current key has only ever done `PutObject`.
  Next check: attempt `ListObjectsV2` with the existing credentials before writing the wipe script.
- **Exact NextAuth v4 behaviour when `signIn` throws** (as opposed to returning `false`). Docs cover
  the three return values only. Not needed if the implementation returns `false` per D-03 — noted so
  the planner does not spec a throw-based design without checking.

---

*Phase: 01-lock-down-write-paths*
*Researched: 2026-08-10*

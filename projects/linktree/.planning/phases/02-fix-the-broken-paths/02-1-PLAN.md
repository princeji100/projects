---
phase: 02-fix-the-broken-paths
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - action/PageAction.js
  - action/grabusername.js
  - app/(page)/[uri]/page.js
  - app/(page)/[uri]/not-found.js
  - components/forms/UserNameForm.js
  - components/forms/PageLinkForm.js
  - components/forms/PageButtonForm.js
  - lib/socialButtons.js
  - app/(app)/account/analytics/page.js
autonomous: true
requirements:
  - FIX-01
  - FIX-02
  - FIX-03
  - FIX-04
  - FIX-05
  - FIX-06
  - FIX-07
  - FIX-08
  - FIX-09
must_haves:
  truths:
    - "SavePageLinks returns { success: true } on successful update."
    - "UserNameForm preserves user input on failed claim and displays actionable field-level errors."
    - "Visiting an unknown /username renders a 404 page with 0 view events created."
    - "Missing or broken avatars and backgrounds render graceful built-in fallbacks."
    - "params is awaited in dynamic route page.js per Next.js 15 async API."
    - "Analytics link mapping uses persistent/stable keys."
    - "Social buttons render static, purge-safe brand colors."
    - "grabusername uses shared connectToDatabase connection helper."
  artifacts:
    - path: "lib/socialButtons.js"
      provides: "Centralized social button platform icons, colors, and helpers"
    - path: "app/(page)/[uri]/not-found.js"
      provides: "Custom 404 not found page for missing profiles"
---

<objective>
Fix all nine confirmed runtime and rendering defects across the public profile, claim flow, forms, analytics, and server actions.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
@~/.gemini/antigravity/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-fix-the-broken-paths/02-CONTEXT.md
@.planning/phases/02-fix-the-broken-paths/02-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Server Actions Return Shape & DB Connection Unification (FIX-01, FIX-09)</name>
  <files>action/PageAction.js, action/grabusername.js</files>
  <read_first>action/PageAction.js, action/grabusername.js</read_first>
  <action>
    1. In `action/PageAction.js`: Update `SavePageLinks` line 96 to `return { success: true };`.
    2. In `action/grabusername.js`: Remove local `isConnected` and `mongoose.connect()`. Import `connectToDatabase` from `@/lib/connectToDB` and call `await connectToDatabase();`.
  </action>
  <verify>
    <automated>grep -q 'return { success: true }' action/PageAction.js && grep -q 'connectToDatabase' action/grabusername.js</automated>
  </verify>
  <done>
    `SavePageLinks` returns `{ success: true }` and `grabusername` uses shared `connectToDatabase`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Public Profile Page Async Params, 404 Guard, Event Logging, & Image Fallbacks (FIX-03, FIX-04, FIX-05, FIX-06)</name>
  <files>app/(page)/[uri]/page.js, app/(page)/[uri]/not-found.js</files>
  <read_first>app/(page)/[uri]/page.js</read_first>
  <action>
    1. In `app/(page)/[uri]/page.js`:
       - Await `params`: `const { uri } = await params;`
       - Query page: `const page = await Page.findOne({ uri });`
       - If `!page`: call `notFound()` from `next/navigation`.
       - Query user: `const user = await User.findOne({ email: page.owner });`
       - Create event: `await Event.create({ url: uri, page: uri, type: 'view' });` (only reached when page exists).
       - Avatar fallback: If `user?.image` exists, render Image with fallback container; if absent or empty, render a stylish fallback initials or `faUser` icon with gradient ring.
       - Background fallback: If `page?.bgType === 'image'` and `page?.bgImage`, render `backgroundImage`; else render default background gradient.
       - Link icons fallback: If `link.icon` is empty, render `faLink` placeholder icon.
    2. Create `app/(page)/[uri]/not-found.js` displaying a clean, branded 404 page ("Profile Not Found", "The linktree you are looking for does not exist", link to home `/` to claim username).
  </action>
  <verify>
    <automated>grep -q 'await params' app/\(page\)/\[uri\]/page.js && grep -q 'notFound()' app/\(page\)/\[uri\]/page.js && test -f app/\(page\)/\[uri\]/not-found.js</automated>
  </verify>
  <done>
    Unknown profiles render 404 without logging events, params is awaited, and image fallbacks handle missing URLs.
  </done>
</task>

<task type="auto">
  <name>Task 3: Username Form Error Handling & Input Preservation (FIX-02)</name>
  <files>components/forms/UserNameForm.js</files>
  <read_first>components/forms/UserNameForm.js</read_first>
  <action>
    Update `components/forms/UserNameForm.js`:
    - Track `inputValue` in local state (initialized from `searchParams.get('Choiceusername') || ''`).
    - Track `errorMessage` in local state.
    - On submit: do NOT reset form input before submission.
    - Call `handleFormSubmit(formdata)`.
    - Check `if (result?.success)`:
      - `router.push('/account?created=' + encodeURIComponent(inputValue.trim().toLowerCase()));`
    - Else:
      - Set `errorMessage = result?.error || 'Username already taken'`.
      - Keep `inputValue` in the input field so user can edit it.
      - Display the error message cleanly below the input in red text.
  </action>
  <verify>
    <automated>grep -q 'result?.success' components/forms/UserNameForm.js</automated>
  </verify>
  <done>
    `UserNameForm` preserves input on failure, displays field-level error, and only redirects when claim succeeds.
  </done>
</task>

<task type="auto">
  <name>Task 4: Social Button Brand Colors & Analytics Stable Keys (FIX-07, FIX-08)</name>
  <files>lib/socialButtons.js, components/forms/PageButtonForm.js, app/(app)/account/analytics/page.js</files>
  <read_first>components/forms/PageButtonForm.js, app/(app)/account/analytics/page.js</read_first>
  <action>
    1. Create `lib/socialButtons.js` exporting `allButtons` array with keys, labels, icons, placeholders, and static brand color classes / hex styles (`color`, `hoverBg`), plus a helper `getSocialButton(key)` with neutral fallback.
    2. Update `components/forms/PageButtonForm.js` to import `allButtons` and use static styles (not dynamic purged classes).
    3. Update `app/(app)/account/analytics/page.js`:
       - Replace `key={uuidv4()}` on line 108 with `key={link._id || link.id || `${link.url}-${index}`}`.
       - Remove unused `uuidv4` import if no longer needed.
  </action>
  <verify>
    <automated>test -f lib/socialButtons.js && ! grep -q 'key={uuidv4()}' app/\(app\)/account/analytics/page.js</automated>
  </verify>
  <done>
    Social buttons render static purge-safe brand colors and analytics link rows use stable keys.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Public Page | /username route visited by unauthenticated internet traffic |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2-01 | Denial of Service | app/(page)/[uri]/page.js | mitigate | Gated Event.create behind page existence; non-existent profiles do not bloat MongoDB events. |
</threat_model>

<verification>
Run `node --env-file=.env scripts/verify-phase2.js` and `npm run build`.
</verification>

<success_criteria>
All 9 defects resolved, build passes, test suite green.
</success_criteria>

<output>
Create `.planning/phases/02-fix-the-broken-paths/02-1-SUMMARY.md` when done
</output>

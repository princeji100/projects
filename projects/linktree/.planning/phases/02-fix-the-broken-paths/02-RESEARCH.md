# Phase 2 Technical Research: Fix the Broken Paths

## 1. Defect Analysis & Fix Strategies

### FIX-01: `SavePageLinks` Return Value
- **Location:** [`action/PageAction.js:96`](file:///home/princeji/Documents/Codes/projects/linktree/action/PageAction.js#L96)
- **Problem:** On successful database save, it returned `{ success: false }` as a placeholder.
- **Fix:** Update to `return { success: true };`. Update `components/forms/PageLinkForm.js` to inspect `result?.success` or `result?.error` cleanly.

### FIX-02: `UserNameForm` Taken Name Redirection
- **Location:** [`components/forms/UserNameForm.js:22-26`](file:///home/princeji/Documents/Codes/projects/linktree/components/forms/UserNameForm.js#L22-L26)
- **Problem:** `if (result)` checks object truthiness, so failed claim returns `{ success: false, error: '...' }` and still redirected. Also `event.target.reset()` erased the user's input before the result returned.
- **Fix:** Check `result?.success`. Only redirect on success. On failure, preserve the input value in state and render the error message (`result.error`) inline under the field.

### FIX-03, FIX-04, FIX-06: Dynamic Profile Route & 404 Handling
- **Location:** [`app/(page)/[uri]/page.js`](file:///home/princeji/Documents/Codes/projects/linktree/app/(page)/[uri]/page.js)
- **Problem:**
  - `params` was destructured synchronously without `await` (Next.js 15 warning/error).
  - Unclaimed `/username` threw a 500 error trying to read `user?.image`.
  - `Event.create` ran on line 35 before confirming `page` exists, logging phantom view events for 404 visits.
- **Fix:**
  - `const { uri } = await params;`
  - If `!page`, invoke `notFound()`.
  - Move `Event.create` after `if (!page)` guard.
  - Add `app/(page)/[uri]/not-found.js` for customized 404 visitor UX.

### FIX-05: Missing Avatar / Background & Load Failure Fallback
- **Location:** [`app/(page)/[uri]/page.js`](file:///home/princeji/Documents/Codes/projects/linktree/app/(page)/[uri]/page.js), [`components/forms/PageSettingForm.js`](file:///home/princeji/Documents/Codes/projects/linktree/components/forms/PageSettingForm.js)
- **Problem:** `next/image` crashes when `src` is null, empty string, or undefined. Broken URLs show broken image icons.
- **Fix:**
  - Provide fallback rendering when `user?.image` or `page?.bgImage` is absent.
  - Implement client fallback component or standard SVG/icon fallback for missing or errored images.

### FIX-07: Analytics Stable React Keys
- **Location:** [`app/(app)/account/analytics/page.js:108`](file:///home/princeji/Documents/Codes/projects/linktree/app/(app)/account/analytics/page.js#L108)
- **Problem:** `key={uuidv4()}` generates a random key on every render pass, thrashing the DOM.
- **Fix:** Use `key={link._id || link.id || `${link.url}-${index}`}`.

### FIX-08: Social Button Dynamic Color Purging
- **Location:** [`components/forms/PageButtonForm.js:91,136`](file:///home/princeji/Documents/Codes/projects/linktree/components/forms/PageButtonForm.js#L91), [`app/(page)/[uri]/page.js`](file:///home/princeji/Documents/Codes/projects/linktree/app/(page)/[uri]/page.js)
- **Problem:** Dynamic Tailwind class interpolations `text-${b.key}-500` get purged during `next build`.
- **Fix:** Centralize button definitions in `lib/socialButtons.js` with static CSS classes / styles and neutral fallbacks for unknown platforms.

### FIX-09: Single MongoDB Connection Path
- **Location:** [`action/grabusername.js:48-51`](file:///home/princeji/Documents/Codes/projects/linktree/action/grabusername.js#L48-L51)
- **Problem:** Used a private `isConnected` and separate `mongoose.connect()` call.
- **Fix:** Replace with `import connectToDatabase from '@/lib/connectToDB'; await connectToDatabase();`.

---
phase: 03-link-lifecycle-control
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/linkLifecycle.js
  - action/PageAction.js
  - app/(page)/[uri]/page.js
  - components/forms/PageLinkForm.js
autonomous: true
requirements:
  - LINK-01
  - LINK-02
  - LINK-03
  - LINK-04
must_haves:
  truths:
    - "lib/linkLifecycle.js is the sole source of truth for link lifecycle rules."
    - "active === false evaluates to Inactive regardless of scheduling."
    - "Public profile page filters out non-live links before rendering."
    - "SavePageLinks rejects malformed timestamps and invalid endsAt <= startsAt ranges."
    - "Legacy links without active or scheduling fields default to Live."
    - "Dashboard link cards provide active toggle, datetime scheduling, and live status badges."
  artifacts:
    - path: "lib/linkLifecycle.js"
      provides: "Unified link lifecycle evaluator, status calculator, and validation logic"
---

<objective>
Implement owner link lifecycle control: active toggling, scheduled publishing with start date/time, link expiration with end date/time, and legacy backward compatibility.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
@~/.gemini/antigravity/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-link-lifecycle-control/03-CONTEXT.md
@.planning/phases/03-link-lifecycle-control/03-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Link Lifecycle Evaluator & Validation Module (LINK-01, LINK-02, LINK-03, LINK-04)</name>
  <files>lib/linkLifecycle.js</files>
  <read_first>.planning/phases/03-link-lifecycle-control/03-CONTEXT.md</read_first>
  <action>
    Create `lib/linkLifecycle.js` exporting:
    1. `getLinkLifecycleStatus(link, now = new Date())`:
       - If `link.active === false`: return `'inactive'`
       - Parse `startsAt` and `endsAt` into Dates if present.
       - If `startsAt && startsAt > now`: return `'scheduled'`
       - If `endsAt && now >= endsAt`: return `'expired'`
       - Otherwise: return `'live'`
    2. `isLinkLive(link, now = new Date())`:
       - Returns `getLinkLifecycleStatus(link, now) === 'live'`
    3. `validateAndSanitizeLink(link)`:
       - Checks validity of `startsAt` and `endsAt` (valid Date parsing).
       - If both exist, verifies `new Date(endsAt) > new Date(startsAt)`.
       - Returns `{ ok: true, link: sanitizedLink }` or `{ ok: false, error: string }`.
  </action>
  <verify>
    <automated>test -f lib/linkLifecycle.js</automated>
  </verify>
  <done>
    `lib/linkLifecycle.js` provides single source of truth for lifecycle calculation and validation.
  </done>
</task>

<task type="auto">
  <name>Task 2: Server Action Validation & Persistence (LINK-01, LINK-02, LINK-03)</name>
  <files>action/PageAction.js</files>
  <read_first>action/PageAction.js, lib/linkLifecycle.js</read_first>
  <action>
    In `action/PageAction.js`:
    - Import `validateAndSanitizeLink` from `@/lib/linkLifecycle`.
    - In `SavePageLinks(links)`:
      - Validate each link in `links`. If any link fails validation (malformed date or `endsAt <= startsAt`), return `{ success: false, error: result.error }`.
      - Store sanitized links array (preserving `active: Boolean`, `startsAt: Date | null`, `endsAt: Date | null`).
      - Return `{ success: true }` on successful database update.
  </action>
  <verify>
    <automated>grep -q 'validateAndSanitizeLink' action/PageAction.js</automated>
  </verify>
  <done>
    `SavePageLinks` rejects invalid dates and persists sanitized link lifecycle metadata.
  </done>
</task>

<task type="auto">
  <name>Task 3: Public Page Server-Authoritative Link Filtering (LINK-01, LINK-02, LINK-03, LINK-04)</name>
  <files>app/(page)/[uri]/page.js</files>
  <read_first>app/(page)/[uri]/page.js, lib/linkLifecycle.js</read_first>
  <action>
    In `app/(page)/[uri]/page.js`:
    - Import `isLinkLive` from `@/lib/linkLifecycle`.
    - Filter `page.links` on the server before rendering:
      ```javascript
      const liveLinks = (page.links || []).filter((link) => isLinkLive(link));
      ```
    - Render `liveLinks` in the grid.
  </action>
  <verify>
    <automated>grep -q 'isLinkLive' app/\(page\)/\[uri\]/page.js</automated>
  </verify>
  <done>
    Non-live links are filtered on the server and excluded from the public page markup.
  </done>
</task>

<task type="auto">
  <name>Task 4: Dashboard Link Lifecycle Management & Status Badges (LINK-01, LINK-02, LINK-03)</name>
  <files>components/forms/PageLinkForm.js</files>
  <read_first>components/forms/PageLinkForm.js, lib/linkLifecycle.js</read_first>
  <action>
    In `components/forms/PageLinkForm.js`:
    - Import `getLinkLifecycleStatus` from `@/lib/linkLifecycle`.
    - On each link card, add:
      1. An active toggle switch (`active` boolean state).
      2. A dynamic status badge component displaying `Live`, `Inactive`, `Scheduled`, or `Expired`.
      3. A collapsible "Schedule" panel containing:
         - `startsAt` datetime-local input
         - `endsAt` datetime-local input
         - "Clear Schedule" button to reset dates to null.
    - Helper to format dates to/from datetime-local string format `YYYY-MM-DDTHH:mm`.
  </action>
  <verify>
    <automated>grep -q 'getLinkLifecycleStatus' components/forms/PageLinkForm.js</automated>
  </verify>
  <done>
    Dashboard provides full link lifecycle controls with active toggle, schedule pickers, and real-time status badges.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Public Page Rendering | Public visitor route evaluating link visibility |
| Link Mutation Action | Server action validating client-submitted dates |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-3-01 | Information Disclosure | app/(page)/[uri]/page.js | mitigate | Filter non-live links on server so hidden links are never sent in HTML |
| T-3-02 | Tampering | action/PageAction.js | mitigate | Server validates datetime ranges and invalid timestamps before persisting |
</threat_model>

<verification>
Run `node --env-file=.env scripts/verify-phase3.js` and `npm run build`.
</verification>

<success_criteria>
All link lifecycle controls, validation, filtering, and backward compatibility pass with 100% test success and a clean build.
</success_criteria>

<output>
Create `.planning/phases/03-link-lifecycle-control/03-1-SUMMARY.md` when done
</output>

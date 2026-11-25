export const meta = {
  name: 'design-explorations',
  description: 'Build a round of design explorations per cluster, each reviewed twice (motion + clarity/accessibility) and fixed',
  phases: [
    { title: 'Build', detail: 'one builder per cluster page' },
    { title: 'Review 1', detail: 'motion reviewer + clarity/accessibility reviewer per cluster' },
    { title: 'Fix 1', detail: 'builder applies review 1' },
    { title: 'Review 2', detail: 'second review of the fixed page' },
    { title: 'Fix 2', detail: 'builder applies review 2, returns board metadata' },
  ],
}

// args: {
//   root:      absolute path of the exploration folder (holds BRIEF.md, kit/, research/, the reference page)
//   scratch:   absolute path of a temp folder for screenshots
//   reference: 'actions.html, exploration A1'  (the approved reference piece)
//   role:      'a senior product designer and senior Apple motion designer building live mobile mockups for <product>'
//   size:      '390 × 844'
//   clusters:  [{ key: 'A', page: 'actions.html', name: 'actions in place', exists: false, ids: 'A1 · "…": idea (base: shop)\nA2 · …' }]
//   only:      ['A', …]  (optional)
// }
const ROOT = (args && args.root) || '/home/user/collection/docs/design/assistant'
const SCRATCH = (args && args.scratch) || '/tmp/assistant-explorations'

const CLUSTERS = (args && args.clusters) || []
const REF = (args && args.reference) || 'the reference exploration named in BRIEF.md'
const ROLE_TXT = (args && args.role) || 'a senior product designer and senior Apple motion designer building live mockups'
const SIZE = (args && args.size) || '390 × 844'

const COMMON = `You are ${ROLE_TXT}. Quality bar: Apple-level craft, calm, precise, every element earns its place.

Read first, in this order:
1. ${ROOT}/BRIEF.md (the decisions; sections 3 and 4 are binding)
2. ${ROOT}/kit/README.md (the page contract and ctx API) and skim ${ROOT}/kit/kit.js and kit/kit.css
3. ${ROOT}/${REF} — the approved reference: copy its structure, comment block style, use of ctx, motion roles and level of polish
4. every note in ${ROOT}/research/ (use what applies)

Hard rules:
- Device size ${SIZE}. One page per cluster, each exploration opened with ?screen=ID via Kit.define.
- Edit ONLY your cluster page. Do NOT edit anything in kit/, board.html, board-data.js, BRIEF.md or other cluster pages. If the kit lacks something, implement it inside your page (helpers in your <script>, styles in your <style>). If you find a kit bug, work around it and mention it in your notes.
- Do not commit, do not push, do not spawn sub-agents.
- Signature colours only through the kit's CSS tokens (never as literals). Follow every rule in the brief's decisions and bar.
- Use ctx for every timing (ctx.wait, ctx.anim, ctx.fly, ctx.scrollTo) so replay and 0.25× slow-mo work. Motion roles from ctx.ROLE; no ad-hoc curves.
- Every exploration: a comment block with its sequence at 1×; a reduced-motion version (ctx.reduced: crossfades/highlights, no travel); ends in a calm resting state. Script interactions with the kit's helpers as the reference does.
- Follow the project's type and copy rules (see the brief and kit README). Undo affordances where something changed.
- Verify with Playwright (viewport at the device size). If require('playwright') fails, install it once inside ${SCRATCH} (npm i playwright && npx playwright install chromium) and run your scripts from there: open file://${ROOT}/<page>?screen=ID&nohint, postMessage {kit:'play',speed:1}, screenshot ~6–8 moments across the timeline into ${SCRATCH}/<page-name>/ and LOOK at them (use the Read tool on the PNGs). Fix overlaps, clipping, misaligned landings, illegible text, console errors. Also load each with &reduced and check it.`

const META_SCHEMA = {
  type: 'object',
  properties: {
    page: { type: 'string' },
    laneTitle: { type: 'string', description: 'short lane title' },
    laneNote: { type: 'string', description: '1–2 sentences for the board lane card' },
    open: { type: 'string', description: 'one open question for the user to decide' },
    items: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, title: { type: 'string', description: 'short name of the idea' },
      said: { type: 'string', description: 'what is said or done, no quotes' },
      why: { type: 'string', description: 'one line: what it is good at · what it costs' } },
      required: ['id', 'title', 'said', 'why'] } },
    notes: { type: 'string', description: 'what you did, kit bugs found, anything left undone' },
  },
  required: ['page', 'laneTitle', 'laneNote', 'open', 'items', 'notes'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', description: 'one paragraph overall assessment' },
    findings: { type: 'array', items: { type: 'object', properties: {
      screen: { type: 'string' }, severity: { type: 'string', enum: ['must', 'should', 'nice'] },
      issue: { type: 'string' }, fix: { type: 'string', description: 'concrete, implementable fix with numbers where relevant' } },
      required: ['screen', 'severity', 'issue', 'fix'] } },
  },
  required: ['verdict', 'findings'],
}

const LENSES = [
  { key: 'motion', text: `You are a senior motion designer at Apple reviewing these explorations. Judge every screen on: purpose (does each move explain where something came from and went?), continuity (elements travel rather than cut), choreography and order (what leads, what follows, stagger), timing (durations by distance; entrances slower than exits; nothing too slow to wait for), easing by role (springs from ctx.ROLE, no overshoot on layout), the signature element's state language as the brief defines it, interruptibility, landing precision (does the flying thing land exactly on its target?), and the reduced-motion version. Also: does each exploration actually express its stated idea distinctly from its siblings?` },
  { key: 'clarity', text: `You are an accessibility and interaction-clarity reviewer (Apple HIG, WCAG AA). Judge every screen on: legibility and contrast of all text over every glow, veil and glass (WCAG AA 4.5:1 for body text), hierarchy and whether a first-time viewer understands what happened, information not conveyed by colour or motion alone, tap targets ≥ 44 pt for anything tappable (undo, choices), aria roles/live regions for confirmations, copy (the project rules, short, plain, buttons say what they do, consistent wording across screens), overlaps/clipping/safe areas (status bar, tab bar, home indicator), the reduced-motion version, and whether the resting end state is calm and correct (counts, lists consistent with what was said).` },
]

function buildPrompt(c) {
  return `${COMMON}

Your cluster: ${c.key} · ${c.name}. Page: ${ROOT}/${c.page}${c.exists ? ' (already exists with the reference; add the others to the same Kit.define)' : ' (create it, same skeleton as the reference page)'}. An earlier interrupted run may have left a partial version of this page: if so, read it, keep what is good, and finish it to the brief.
Explorations to build (IDs fixed):
${c.ids}

Visual freedom: keep these in today's design language (the kit's look) unless stated otherwise; you may push ONE exploration in this cluster further (new materials, type, depth, light) if it serves the idea, and say so in its "why". Make each exploration clearly distinct from its siblings — they are alternatives to compare.

When done and verified, return the board metadata.`
}

function reviewPrompt(c, lens, round) {
  return `${lens.text}

Review round ${round} of cluster ${c.key} · ${c.name}: ${ROOT}/${c.page}. Context: ${ROOT}/BRIEF.md (sections 3–5) and ${ROOT}/kit/README.md; the reference exploration is ${REF} in ${ROOT}.
Intended explorations:
${c.ids}

Do not edit any file. Inspect the code and run each exploration with Playwright (install it inside ${SCRATCH} if missing; viewport at the device size; open file://${ROOT}/${c.page}?screen=ID&nohint, then page.evaluate(() => window.postMessage({kit:'play',speed:1},'*')); screenshot many moments, also with &reduced) into ${SCRATCH}/review-${c.key}-${lens.key}-${round}/ and LOOK at the screenshots with the Read tool. Return concrete findings: 'must' = broken or wrong, 'should' = clearly better, 'nice' = polish. Be specific and give implementable fixes. ${round === 2 ? 'This is the second round: focus on what is still wrong after the first fixes, and on polish; do not repeat resolved items.' : ''}`
}

function fixPrompt(c, reviews, round) {
  const txt = reviews.filter(Boolean).map((r, i) => `## Reviewer ${LENSES[i].key}\n${r.verdict}\n` + r.findings.map(f => `- [${f.severity}] ${f.screen}: ${f.issue} → ${f.fix}`).join('\n')).join('\n\n')
  return `${COMMON}

You own cluster ${c.key} · ${c.name}: ${ROOT}/${c.page}. Intended explorations:
${c.ids}

Apply review round ${round}. Fix every 'must' and 'should'; apply 'nice' items when cheap and clearly better. If two reviewers conflict, choose the option that best serves the brief and say why in notes. Re-verify every exploration with Playwright screenshots (and &reduced) after your changes.

${txt}

Return the board metadata (updated titles/why if they changed) and in notes list what you changed and anything you deliberately did not change.`
}

const RUN = (args && args.only) ? CLUSTERS.filter(c => args.only.includes(c.key)) : CLUSTERS
log(`running ${RUN.length} clusters: ${RUN.map(c => c.key).join(', ')}`)
const results = await pipeline(
  RUN,
  c => agent(buildPrompt(c), { label: `build ${c.key}`, phase: 'Build', schema: META_SCHEMA }),
  (built, c) => parallel(LENSES.map(l => () => agent(reviewPrompt(c, l, 1), { label: `review1 ${c.key} ${l.key}`, phase: 'Review 1', schema: REVIEW_SCHEMA })))
    .then(r1 => ({ built, r1 })),
  (s, c) => agent(fixPrompt(c, s.r1, 1), { label: `fix1 ${c.key}`, phase: 'Fix 1', schema: META_SCHEMA }).then(f1 => ({ ...s, f1 })),
  (s, c) => parallel(LENSES.map(l => () => agent(reviewPrompt(c, l, 2), { label: `review2 ${c.key} ${l.key}`, phase: 'Review 2', schema: REVIEW_SCHEMA })))
    .then(r2 => ({ ...s, r2 })),
  (s, c) => agent(fixPrompt(c, s.r2, 2), { label: `fix2 ${c.key}`, phase: 'Fix 2', schema: META_SCHEMA }).then(f2 => ({ ...s, f2 })),
)

return results.map((s, i) => {
  const c = RUN[i]
  if (!s) return { key: c.key, page: c.page, failed: true }
  const sum = rs => (rs || []).filter(Boolean).map((r, j) => ({ lens: LENSES[j].key, verdict: r.verdict, counts: r.findings.reduce((a, f) => (a[f.severity] = (a[f.severity] || 0) + 1, a), {}), findings: r.findings.map(f => `[${f.severity}] ${f.screen}: ${f.issue}`) }))
  return { key: c.key, page: c.page, meta: s.f2 || s.f1 || s.built, review1: sum(s.r1), review2: sum(s.r2), notes: [s.built?.notes, s.f1?.notes, s.f2?.notes] }
})
# Kit checklist

Built by hand before any agent starts. Agents may read it, never edit it. The worked example is `docs/design/assistant/kit/` in the collection repo: start from it when the project is similar, and swap the tokens and base screens.

- [ ] **Tokens** on `:root`: colour, type, spacing, radius, shadows. **Signature colours defined once** (e.g. `--warm-1/2/3`) and read from CSS everywhere, canvas code included.
- [ ] **The frame:** one page is one device screen (e.g. 390 × 844) with a status bar, navigation and safe areas.
- [ ] **Base screens with realistic, self-consistent sample data** (times match the greeting, answers match the questions).
- [ ] **The signature element** as a component with its states (here the band: off, hairline, listening, thinking, speaking, with flare and pulse).
- [ ] **Motion roles** as real springs sampled into CSS `linear()` (layout, bounce, gentle, flight, out, fade), with their durations.
- [ ] **Helpers for recurring moves** (fly along a curve, show a transcript, a finger hold, a confirmation with undo, a camera scroll, measure before growing).
- [ ] **One timing path:** every wait and animation goes through the kit, so replay and slow-mo (0.25×) work; replay aborts the running script cleanly.
- [ ] **Reduced motion** flag (`prefers-reduced-motion` or `?reduced`).
- [ ] **Playback:** first frame on load, play on tap, `postMessage({kit:'play', speed})` from the board.
- [ ] **`Kit.define({ ID: { said, title, why, base, play(ctx) } })`**: one page per cluster, `?screen=ID`.
- [ ] **`README.md` contract:** skeleton, ctx API, rules, how to verify with Playwright.
- [ ] **The reference exploration,** built to the full bar and approved.

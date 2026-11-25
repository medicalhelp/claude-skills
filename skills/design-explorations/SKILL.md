---
name: design-explorations
description: Run a design exploration round to a high quality bar - grill the person, write a brief with a measurable motion and craft bar, research, build a shared kit and ONE reference exploration by hand, get it approved, then scale with a workflow (one builder per cluster, two review lenses, two rounds) onto a pannable board of live mockups. Use when someone asks for many design explorations, variants, directions, mockups or prototypes to compare (motion, interaction, visual), or says "make explorations", "put them on a board", "explore directions for".
---

# Design explorations

The method behind the collection's assistant explorations (40 live mobile mockups that came out excellent in motion, interaction, visual design and UX). Why it works, with evidence: `docs/design/assistant/HOW-WE-GOT-HERE.md` in the collection repo. The worked example lives next to it (`BRIEF.md`, `kit/`, `actions.html` A1, `board.html`, `REVIEW.md`).

**The principle:** taste decided up front, fixed into one reference, enforced by structure, checked by reviewers who look. Never scale before the reference is approved.

## 0. Pick the mode (ask)

- **Full:** a round of about 20–60 explorations, several clusters, motion-critical. Grill 4–6 rounds, research, kit plus reference, a workflow with 2 lenses × 2 review rounds.
- **Light:** a handful of variants of one thing. Grill 1–2 rounds, kit plus reference, one builder, one review by both lenses.

Say what the full mode costs: about 7 agents per cluster (1 build, 2×2 reviews, 2 fixes). A workflow runs at most CPUs − 2 agents at a time (max 16), so a 4-CPU cloud session runs 2, and a laptop with 8–12 cores runs 6–10. Recommend running big rounds on the laptop.

## 1. Grill (always, scaled to the task)

Use AskUserQuestion, 4 questions per round, options with a recommended first. Every answer must become a line in the brief. Never skip these decisions; each one removes a place where an agent would otherwise guess:

1. **Format:** live mockups with `?screen=ID` (default), static frames, or inside the real prototype.
2. **Device and frame:** mobile only? Sizes.
3. **Volume:** how many, in how many clusters.
4. **Visual freedom:** today's language, free, or a mix per cluster; how far the free direction goes.
5. **The signature element(s)** the person cares about (here: the presence band, its colours, states by motion), with the variants to cover.
6. **The motion moments** and their flavours (here: four arrival flavours, two off-screen patterns).
7. **Recovery and craft:** undo placement, reduced motion, typing fallback.
8. **Test beds:** which screens and content.
9. **Questions or scenarios** the explorations answer.
10. **Board captions and playback:** what was said, why / trade-off, replay and slow-mo, play when tapped.
11. **Review depth:** loops and lenses.
12. **Where it lives and how it ships:** repo path, branch, review before main.

Also ask: whether research agents may be spun up on their own (cap, e.g. 10), and the role to design as ("a senior motion designer at Apple").

## 2. Brief

Write `BRIEF.md` from `templates/BRIEF.md`:
- the problem and the core rule in one line
- the decisions (grouped)
- **a motion and craft bar with numbers:** spring roles, travel time by distance, stagger, entrances slower than exits, interruptible, a reduced-motion version for each, ending in a calm state
- **every exploration listed with an ID, its sentence and its idea,** distinct from its siblings
- deliverables, out of scope, references

Commit it.

## 3. Research (in the background, while you build the kit)

Spin up research agents for the questions where taste needs grounding: how real products do the signature element, motion recipes with numbers, the speculative or visual language. Each writes `research/<topic>.md` with sources and marks unverified claims. Fold their findings back into the kit and brief.

## 4. Kit and the reference, by hand

Build the kit yourself (see `templates/kit-checklist.md`):
- tokens (the signature colours defined once and never typed as literals)
- the screen shell and base screens with realistic sample data
- motion roles as real spring curves
- helpers for the recurring moves
- one timing path, so replay and 0.25× slow-mo work everywhere
- a `README.md` contract for agents

Then build **one** exploration to the full bar, with a comment block giving the sequence at 1×. Test it frame by frame with Playwright, look at the frames, and fix them. Build the board (copy `board.html` and `board-data.js` from the worked example; it's data-driven).

## 5. Approve before scaling

Send the person a frame strip (one PNG of 6–8 moments) and a single-file playable version (inline the kit). Ask what to change. Change it now: every change here multiplies across all explorations.

## 6. Scale with a workflow

Copy `templates/workflow.js` (parameterised), fill `args.clusters` from the brief (key, page, name, IDs with base screen and idea), and run it with the Workflow tool. It needs the person's opt-in ("use a workflow"). Per cluster: build → 2 reviewers in parallel (motion lens, clarity and accessibility lens) → fix → 2 reviewers → fix. Builders and reviewers must screenshot at the real size and look; reviewers return must, should and nice findings with implementable fixes. One owner per file; the kit is read-only for agents.

Monitor with `/workflows`, or with `tools/wf_report.py` from the worked example. Commit work in progress if a hook asks; agents don't commit.

## 7. Verify yourself

Play every exploration in a browser (5 at a time): the right screen, no console errors, 4 snapshots each. Build one contact sheet per cluster and look at it. Check the board loads every lane. Fill `board-data.js` from the workflow's returned metadata, and write `REVIEW.md` from the review summaries (must, should and nice counts per round).

## 8. Report and learn

Tell the person where to open the board, what stood out per cluster, and the open questions the builders left. Keep a run log (agent times, tool calls, screenshots) and update `HOW-WE-GOT-HERE`-style notes when the method changes.

## Pitfalls seen

- Scaling before the reference is approved, so 40 copies of a mistake.
- Colours or curves typed as literals, so the palette can't change.
- Siblings too similar: reviewers must check that each idea is distinct.
- Content that contradicts itself (a "morning" answer with an evening event, "good evening" with "dentist at 10"). The clarity lens catches it; good sample data prevents it.
- Undo and choice buttons under 44 pt, faint text over glows, overlaps with the tab bar: the most common "must" findings.
- Running a 60-agent workflow on a 4-CPU machine.

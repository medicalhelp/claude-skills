---
name: houdini-hython
description: Build, debug and check precise hard-surface 3D models (products, devices, pallets) in Houdini by writing hython scripts from a numbers spec, with measured gates and independent review. Use when the user asks to model something in Houdini, debug a hython or VEX build, export OBJ/GLB parts from Houdini, or decide how to drive Houdini from an AI agent. Not for rigs, simulations or Houdini GUI automation.
---

# Houdini by hython: a verified way to model with an agent

A pipeline that produced three gated devices (a rugged handheld, a phone, a euro pallet) on Houdini 22.0.508 Apprentice. It is deliberately **headless and scripted**: no live session, no MCP server, no third-party skill. Reasons and evidence: `references/houdini-notes.md` and the comparison in the project repo (mockup-scenes `docs/research/`). Re-evaluate if the GUI viewport becomes the bottleneck.

## Ground rules
1. **Never trust memory for node names, parameter names or menu values.** Query the installed build (see `references/docs-access.md`) or run `scripts/preflight.py` on the build script before a long run:
   `hython scripts/preflight.py BUILD.py --prelude LIB.py:VAR`: it checks every `K.mk('<type>', ..., kw=...)` node type, parameter name and menu value, and compile-checks embedded VEX snippets. It exits 1 on problems. It reads the script only; it executes nothing of the build.
2. **Numbers come from a spec file** (one JSON per device) with every number tagged `V` printed, `E` estimated, `R` recalled. The build and the gates both read it. Never hide an estimate.
3. **One closed solid per part**, exported as OBJ in millimetres (`geometry().saveToFile`). Keep 0.1 mm between stacked layers that must not touch; decals are open one-sided sheets slightly above their surface.
4. **Orientation:** Houdini winds outward faces clockwise: a fan-triangulation signed volume is negative for an outward solid. Orient every Boolean input; reverse a part whose volume is positive.
5. **Gates measure, with negative controls.** A gate script in plain Python/numpy loads the OBJs and checks: closed and manifold, winding on EVERY edge, outward, no n-gons, counts, and every spec number. For each gate write a deliberately broken copy that must fail. Have an independent reviewer try to break the gate before you trust it (a builder's gate tests what the builder thought of).
6. **Review independently** per slice (geometry-and-gates lens, then look-against-references lens), fix, and re-run ALL gates after any fix.
7. **Look at renders.** A mesh that passes every check can still shade badly (fans around cuts, grid-like reflections that are really the lighting).
8. **Safety:** never open untrusted `.hip` files; do not install MCP servers or third-party Houdini skills without reading their source; installed skills run with full agent permissions.

## Procedure
1. Collect references and the datasheet; write the spec with V/E/R tags.
2. Plan slices (structure, then fasteners/marks, then finish) and the gates in a status doc. Clay first.
3. Write the builder: a controls `null` with spare float parms; nodes read them with `ch()` expressions; a `validate()` that refuses impossible slider combinations. Reuse one library of helpers (ring/cap lofts, slabs, pucks, plates, `solid_out`) instead of copying them per device.
4. Run `preflight.py`, build, run the gate with `--selftest`.
5. Render (Blender Cycles, studio recipe), review on a self-contained HTML page, fix, repeat.

## Reusable code (reference project: mockup-scenes)
`tools/gatelib.py` (OBJ loader, mesh checks, islands), `tools/houdini/hlib.py` (orient, `solid_out`, pucks, point sets), `tools/houdini/loftlib.py` (VEX ring/cap/slab/puck), `tools/houdini/pymesh.py` (the same loft in numpy, testable without Houdini; `test_pymesh.py` compares it with the VEX). Copy the pattern, not the device numbers.

## Where the facts are
- `references/houdini-notes.md`: ~90 verified parameter, VEX and pitfall facts (PolyBevel limits and `filletshape` tokens, Divide defaults, Boolean recipes, vertex-attribute UVs, copytopoints, winding).
- `references/docs-access.md`: where to read the docs, and the Apprentice/Indie licence facts.
- `scripts/preflight.py`: the pre-flight checker.

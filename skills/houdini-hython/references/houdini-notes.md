# Houdini notes: verified facts and pitfalls (seed for our own Houdini skill)

Everything below was run in Houdini 22.0.508 (Apprentice) with hython and checked against the local docs (`references/houdini-docs`, git-ignored) unless marked otherwise. Code: `tools/houdini/hkit.py` and the three coupon scripts.

## Running it
- `hython` works headless under Apprentice (`hou.licenseCategory()` = Apprentice). Path: `/Applications/Houdini/Houdini22.0.508/Frameworks/Houdini.framework/Versions/22.0/Resources/bin/hython`. Activation: License Administrator -> Help > General > Activate Apprentice (30 days, renews).
- Geometry export: `node.geometry().saveToFile('x.obj')` works from hython on Apprentice (FBX and Alembic are blocked on Apprentice per forum posts; not tested here). Save scenes with `hou.hipFile.save('x.hipnc')`.
- Cold process: about 2.7 s wall for the curved head; the cook itself 0.2-0.4 s.
- Shell: zsh does not split an unquoted `$var`; use `${=var}`.

## Nodes and parameters
- Types: `box`, `xform` (not `transform`), `attribwrangle`, `polyextrude::2.0`, `polybevel::3.0`, `boolean::2.0`, `divide`, `merge`, `null`, `reverse`. There is no `rectangle` SOP.
- **Controls pattern:** one `null` with spare float parms; every other node reads them with `ch("/obj/<geo>/controls/<name>")` expressions (`parm.setExpression`). Numeric parm + non-number string -> `setExpression`; menu parm -> `set('token')`.
- **PolyBevel:** `group` (edge group name), `grouptype='edges'`, `offset`, `divisions`, `filletshape='round'`. **It cannot offset farther than the adjacent faces are wide**: on a dense grid a 2 mm round-over clamped to the cell size and produced NaN points. Bevel on coarse geometry first, densify afterwards.
- **Box:** `type='polymesh'` is the only type that honours divisions, and `divrate1..3` are POINTS per axis (segments + 1); `divsx..z` and `dodivs` did nothing for it. Not used in the end (see PolyBevel).
- **Divide (densify flat faces for a bend):** `brick=1`, `sizex/sizey/sizez`, `group` = prim group; defaults (`usemaxsides=1, numsides=3, convex=1, planar=1`) triangulate everything, so set `usemaxsides=0, convex=0, planar=0`. `fixsharededges=1` (default) avoids cracks.
- **PolyExtrude:** set `outputfront=1, outputback=1, outputside=1` for a closed solid; the default left out the back cap.
- **Boolean:** `booleanop='subtract'`, `subtractchoices='aminusb'`; seam edges as a group: `outputedgegroups=1, useabseamedges=1, abseamedges='name'`, then PolyBevel that group (0.15 mm, 2 divisions) for the rim chamfer. Boolean leaves n-gons and some triangles.
- Winding: Houdini winds front faces clockwise, so a fan-triangulation signed volume (`p0.dot(p1.cross(p2))/6`) is NEGATIVE for an outward-facing solid. Calibrate on a plain box before diagnosing "inside-out".

## VEX (all checked in `vex/functions`)
- `setedgegroup(int geohandle, string name, int pt0, int pt1, int value)`: the handle is `geoself()` (I had written `0`); creates the group; only valid edges are added.
- `prim_normal(geometry, prim, vector uvw)` takes a vector `{0.5, 0.5, 0}`.
- `addpoint(geoself(), vector)`, `addprim(geoself(), "poly", int points[])`; a detail wrangle with no input can generate a whole outline.
- A primitive wrangle that sets `i@group_caps = 1` creates the prim group `caps`.
- Outline-only edge group on a mesh with interior edges: first mark points that touch a side wall (`onrim`), then select edges whose both points are in the front/back plane and `onrim`.
- Bend: `@P.z -= swell * smoothstep((@P.y - y0) / len) * clamp(-@P.z / (thick/2 - roundover), 0, 1)` applied to the housing and to every cutter/insert keeps cut depths constant under a swelling surface.

## Python gotchas
- `Kit.spare(node, n=...)`: a keyword named like the positional argument collides; name positional arguments distinctively.
- A parameter set in a hython session is not live in the saved `.hipnc` unless it is an expression; the sliders on `controls` are.

## Pitfall: Bricker boundary cells (found in the side-by-side)
`divide` in Bricker mode leaves small non-planar 5-6 sided cells where its grid meets the edge of the flat face. They look fine in a wireframe and pass the audit (no open or zero-area faces), but a renderer triangulates them arbitrarily and a bright streak appears along the edge. A second `divide` (`convex=1, usemaxsides=1, numsides=4, planar=1`) after the cuts fixes it, at the price of about 60 degenerate triangles (collinear points shared with neighbours). Not helpful: `noslivers=1` (opens edges), the `clean` node (opens 238 edges), Boolean `removeinlinepoints=1` (actually "Assume seam polygons are flat", on by default: the test was meaningless), `planar` alone (no change). Better long-term options, untested: make the Bricker grid line up with the face boundary, or build the flat back from a structured grid.

## Loft in VEX (device housing)
- VEX functions cannot return arrays: write into an `export vector pts[]` parameter (`void ring(export vector pts[]; ...)`), and call it with a local array.
- `PI` is a predefined macro in VEX: do not declare it, use `M_PI`.
- A detail wrangle with no input can build a whole lofted solid: one function per ring (fixed point count), `addpoint(geoself(), vector)` per ring point, quads with `addprim(geoself(), "poly", array(a, b, c, d))`; the winding is outward when the Houdini fan volume is NEGATIVE (a `flip` parameter and a one-time self-check cover the other case).
- Lofting a side profile through squircle rings gave an all-quad housing with exact profile control and no Boolean or bevel node (11,520 quads + 2 caps for the whole Honeywell body).

## Gate lessons (slice 1)
- A volume sign is not an orientation check: one wrong-way cap among 13k faces does not change the sign. Check the winding of EVERY edge (the two faces must traverse it in opposite directions).
- A flat cap over a thin slit (3 mm wide, 81 mm long, bent) is a non-planar n-gon that renderers triangulate arbitrarily and that sags: fill it with a ladder of quads between mirrored points of the two long sides and a small fan at each rounded end.
- Profile points given in absolute z fold at some slider values: give every slider limits and keep a `validate()` that checks the z order of the profile.
- Gate sample points must scale with the variant's own dimensions and stay on flat parts (not in a groove, a fillet or a corner), or the gate reports false deviations.
- The zebra render is extremely sensitive (a 0.01 rad normal error moves a stripe by a third of its width): use it to find kinks, not to rank two correct meshes against each other.

## Filling a flat face inside a ring (slice 1 fix pass)
- A fixed point count per ring means inner rings shrink into a thin slit with skinny quads; stop the rings at a generous margin with a minimum corner radius, and fill the rest.
- The last ring has four sides: bottom and top have the same point count (arc + straight + arc) and so do left and right. That makes a structured grid possible: a Coons patch (bilinear blend of the four sides) gives exact boundary points; it must then be relaxed (Gauss-Seidel on the interior, boundary fixed, 400 iterations, in VEX) because the corner arcs start out vertical and the blended columns would bunch up 0.02 mm from the sides (aspect 103 before, 7 after).
- Orientation: with ring points in index order, the quad (a, b, c, d) of the patch runs the boundary edges in increasing index; flip it for the front cap, keep it for the back cap (and swap both when the loft is flipped).
- Aspect-ratio metrics must exclude the deliberate narrow strips (lip, round-over, groove) or they hide the real problems.
- Zebra: a pattern that does not change when the cap, the ring density and the swell blend are changed is a property of the shape, not the mesh.

## Decals and UVs (slice 2)
- A flat decal can be built by a detail wrangle: `addpoint(geoself(), vector)` per outline point and ONE `addprim(geoself(), "poly", pts)`; order the points clockwise as seen from +Z for a front-facing polygon (Houdini's front-facing winding). The gate checks `normal.z > 0.999`.
- UVs without a UV node: `setpointattrib(geoself(), "uv", pointnumber, vector)` in the same wrangle; the OBJ export writes them as `vt` and Blender imports an active UV layer. Verified by checking the four corners.
- A rounded edge with few segments makes tiny edges: a 0.05 mm round with 4 segments gives 0.02 mm edges; give the slider a lower limit (0.08 mm) rather than more segments.
- A part that sits in a seat needs its own gaps as sliders (side, bottom, top recess), and the thickness is derived (seat depth - recess - bottom gap); `validate_glass()` refuses a slab thinner than its edge round.

## Measuring a gap (slice 2 lessons)
- Distance to the nearest point of the WHOLE neighbour is not a gap: it picks whichever surface is closer (the floor for a part that hovers). Build one BVH of the seat wall faces (|normal z| < 0.3, between floor and lip start) for the side gap and one of the floor faces for the bottom gap, and use only the vertices that face each.
- Where a ring hits its minimum radius the gap grows to about x1.41 on the diagonal; where a lip rounds away the wall ends. Both are by design: the safety-critical bound is the MINIMUM (never below the design gap), the maximum only needs a loose limit.
- A gate must have negative controls: copies with one deliberate defect each (shifted part, inside-out solid, part too low, decal off the flat) that it has to reject; one crashed instead of failing, which is also a way a gate can hide a problem.
- Put the validation in the builder too: refuse slider combinations that break an invariant (decals within 0.3 mm of the rounded edge, glass thinner than its edge round, sliders outside their range) instead of letting the gate find them later.

## Boolean cut-outs: what worked and what did not (slice 3 proof)
- **Flared cutter instead of a bevel on the seam:** build the cutter flat (rounded prism, floor to `rim` below the surface), then PolyExtrude its outer cap outward with `dist = rim + 0.5` and `inset = -(rim + 0.5)` (negative inset = outset): a 45 degree flare that crosses the surface plane at an angle (no coincident faces) and leaves a chamfer of width `rim` with no PolyBevel on the Boolean result.
- **Fuse the cutter before cutting:** `fuse::2.0` (`tol3d` 0.01) then `clean` (`deldegengeo`, `degentol` 0.0005) on each cutter. A Bricker-densified floor can leave near-duplicate points (0.0006 mm) where a grid line crosses an arc point; they become wall slivers (aspect 3,000) after the Boolean.
- **Boolean settings:** `detriangulate` tokens `none | unchanged | all` (default all); "Collapse tiny seam-adjacent edges" (`collapsetinyedges`, `lengththreshold`): 0.08 mm is the largest safe value here; "Output primitive groups": `outputprimgroups=1`, `useaoutsideb=1` + `aoutsideb='a_surface'` (the remaining housing faces), `usebinsidea=1` + `binsidea='pocket'`.
- **Local remesh:** select the housing faces near the cutters with `xyzdist(1, primuv(0, "P", @primnum, {0.5, 0.5, 0})) < R` in a primitive wrangle (input 1 = the cutters) restricted to the `a_surface` group, then `remesh` with that group, `targetsize` 0.6, `iterations` 3 and **`smoothing` 0** (the default 0.1 moves surface vertices off the analytic surface: 4.84 degree tilt = a visible speck). The group's boundary stays; neighbours gain vertices and become n-gons, so triangulate only the n-gons (`primvertexcount > 4` group, `divide` max sides 3, avoid small angles) and do not use "max 4 sides" (44 self-intersections).
- **Measure shading, not only shape:** a face on the back surface should have the analytic normal `(0, g'(y), -1)`; the max deviation (and the count above 2 degrees) found a speck that the aspect and angle numbers could not.
- Long thin triangle fans around a Boolean cut are valid and pass every mesh check, yet draw bright spikes in smooth shading: look at renders.

## Added from the iPhone and pallet builds (2026-11-26, Houdini 22.0.508)
- **PolyBevel `filletshape` menu tokens are `none | solid | crease | chamfer | round`.** A straight 45-degree cut is `chamfer` (not `straight`: that token is invalid and the set fails). Check menu values with `node.parm('filletshape').menuItems()`; the pre-flight script does it for you.
- **Vertex attributes:** set a per-vertex attribute (for example `uv`) with an `attribwrangle` whose `class` is `vertex`: `v@uv = ...` creates a vertex attribute; use `point(0, "P", vertexpoint(0, @vtxnum))` and `prim_normal(0, vertexprim(0, @vtxnum), {0.5, 0.5, 0})` for the position and face normal. A point-class wrangle cannot give different UVs to faces that share a point.
- **OBJ export keeps vertex `uv` as `vt`** (de-duplicated: a box with 24 vertices may write only 24 or fewer `vt` lines). `grep -c "^vt "` is a quick check.
- **Instancing many small parts (nail heads):** `copytopoints::2.0` with a source part and a points SOP (made with a Python SOP: `geo.createPoint().setPosition(...)`); with no `N`/`orient` on the points it only translates. For an upside-down copy, flip the source with an `xform` (`rx=180`) and use a second copytopoints.
- **Triangulate only the n-gons a bevel or Boolean left:** a primitive wrangle `if (primvertexcount(0, @primnum) > 4) i@group_ngon = 1;` then `divide` with `group='ngon', convex=1, usemaxsides=1, numsides=3, planar=0, avoidsmallangles=1`.
- **Booleans want outward solids:** orient every input first (reverse when the fan signed volume is positive: Houdini negative = outward). A Boolean on a closed all-quad slab with round pockets leaves triangles only around the cuts (about 13% of faces for 13 cuts).
- **Chamfer only part of an edge:** subtract a square bar rotated 45 degrees about the edge axis (a box of side `c*sqrt(2)`, `rx=45`, centred on the edge corner removes a triangle with legs `c`) over the wanted span; then bevel the remaining edges.
- **A bevel group must be recomputed after another bevel or Boolean:** the edge groups from before no longer match the new edges.
- **Face orientation by transform:** `xform` with `rx=90` turns the local +Z to -Y; `rx=-90` to +Y; `ry=-90` to -X; `ry=90` to +X; `rx=180` flips Z. Check one part before placing twelve.
- **Parameter errors fail late:** `Parm.set` raises only for a bad menu token or type; a wrong name returns `None` from `node.parm(name)`. Prefer `tools/preflight.py` before a long build.
- **Part layout:** build one closed solid per part and export one OBJ per part (`geometry().saveToFile`); merge only identical-material copies. Gate counts (for example 78 nail heads) with a connected-components count on the OBJ, not by trusting the builder.
- **Gaps between stacked parts:** keep 0.1 mm between layers that must not touch (z-fighting); decals one thin layer above their surface (0.02 to 0.05 mm) and treat them as open one-sided sheets in the gate and the GLB (double-sided).

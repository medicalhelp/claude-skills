# Where to read Houdini facts (in order of trust)

1. **The installed build itself (most trusted).** Ask hython, do not trust memory:
   - node types and versions: `hou.sopNodeTypeCategory().nodeTypes().keys()`; a node's parameters: create it in a temp `geo` and print `[(p.name(), p.parmTemplate().type()) for p in n.parms()]`; a menu: `n.parm('x').menuItems()`; a parameter's default: `n.parm('x').eval()`;
   - the pre-flight script `scripts/preflight.py` does this for every node type and parameter a build script names.
2. **The local help archive (same version as the install).** `.../Houdini.framework/Versions/22.0/Resources/houdini/help/*.zip` (for example `nodes.zip`, `hom.zip`, `vex.zip`, `commands.zip`). Unzip the ones you need into a git-ignored folder (the mockup-scenes repo uses `references/houdini-docs/{nodes,hom,vex,model}`) and `grep` them: it is faster and more exact than a web search.
3. **SideFX's agent-friendly online docs (official).** `https://www.sidefx.com/llms.txt` points to the latest docs; `https://www.sidefx.com/docs/houdini/llms.txt` is the version index (H22.0 at the time of writing; every link is a `.md` page, including `hom/index.md`, `ref/api.md`, `commands/index.md`). Check the build number against `hou.applicationVersionString()`: the online docs follow the newest build.
4. **Your own verified notes:** `references/houdini-notes.md` (every line was run on Houdini 22.0.508 Apprentice).
5. **Community skills, MCP servers, forums, blogs: last, and as hints only.** Re-check any fact against 1 or 2 before relying on it.

# Licence facts that matter (read the current EULA before relying on them)
- Houdini Apprentice is free, personal and non-commercial only; scenes save as `.hipnc`; renders are watermarked unless `.picnc`; hython works headless on Apprentice (verified on 22.0.508; the licence must be activated once in the GUI License Administrator). Karma XPU on Apple Silicon is CPU-only (stated for 21; not confirmed for 22).
- If work may become commercial: Houdini Indie (about $299 a year, revenue limit under $100K) or move the geometry core to another tool. Decide before building more devices.

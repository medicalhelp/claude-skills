"""Pre-flight check for hython build scripts: finds wrong node types, wrong parameter names and invalid menu values BEFORE a long build, and compile-checks embedded VEX snippets.
  hython preflight.py BUILD_SCRIPT.py [--prelude module_path.py:VAR ...] [--vex-only]
It reads the script's AST (nothing is executed): every call  X.mk('<type>', '<name>', inputs, kw=value, **{'class': 'detail'})  or  .createNode('<type>')  with a constant node type is checked against the installed Houdini:
  - the node type exists in the SOP category (versioned names such as polybevel::3.0 are accepted),
  - every keyword (and every constant key of a **{...} dict) is a parameter (or parameter tuple) of that node type,
  - a constant string given to a menu parameter is one of its menu items.
String constants that look like VEX (contain @P, chf(, addpoint(, setedgegroup(, i@, v@ ...) are compile-checked in an attribwrangle (class guessed from the text); library functions defined in other strings can be supplied with --prelude path.py:VARNAME (the variable is prepended, like the build does).
Exit code 0 = clean, 1 = problems. Run it with the installed hython, for example
  /Applications/Houdini/Houdini22.0.508/Frameworks/Houdini.framework/Versions/22.0/Resources/bin/hython preflight.py tools/houdini/pallet_hou.py --prelude tools/houdini/loftlib.py:LOFT_LIB"""
import sys, ast, re, os, importlib.util
import hou
args = sys.argv[1:]
if not args: print(__doc__); sys.exit(2)
script = args[0]; preludes = [args[i + 1] for i, a in enumerate(args) if a == '--prelude']; vex_only = '--vex-only' in args
src = open(script).read(); tree = ast.parse(src)
geo = hou.node('/obj').createNode('geo', 'preflight_tmp'); problems = []; seen_types = {}
def node_info(t):
    if t in seen_types: return seen_types[t]
    try: n = geo.createNode(t)
    except Exception as e:
        seen_types[t] = None; return None
    info = {p.name(): p for p in n.parms()}; tuples = {pt.name() for pt in n.parmTuples()}
    seen_types[t] = (n, info, tuples); return seen_types[t]
def const(node): return node.value if isinstance(node, ast.Constant) else None
def check_call(call, tname):
    info = node_info(tname)
    if info is None: problems.append((call.lineno, f'unknown SOP node type {tname!r}')); return
    n, parms, tuples = info
    kws = [(k.arg, k.value) for k in call.keywords if k.arg]
    for k in call.keywords:
        if k.arg is None and isinstance(k.value, ast.Dict):
            for kk, vv in zip(k.value.keys, k.value.values):
                if isinstance(kk, ast.Constant) and isinstance(kk.value, str): kws.append((kk.value, vv))
    skip = {'inp', 'name'}
    for name, val in kws:
        if name in skip: continue
        if name not in parms and name not in tuples: problems.append((call.lineno, f'{tname}: no parameter {name!r}')); continue
        p = parms.get(name); v = const(val)
        if p is not None and isinstance(v, str):
            try:
                items = p.menuItems() if p.parmTemplate().type() == hou.parmTemplateType.Menu else ()
            except Exception: items = ()
            if items and v not in items and 'ch(' not in v: problems.append((call.lineno, f'{tname}.{name}: {v!r} is not a menu item (choices: {list(items)})'))
if not vex_only:
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            f = node.func; fname = f.attr if isinstance(f, ast.Attribute) else (f.id if isinstance(f, ast.Name) else None)
            if fname == 'mk' and len(node.args) >= 1 and const(node.args[0]) is not None and isinstance(const(node.args[0]), str): check_call(node, const(node.args[0]))
            elif fname == 'createNode' and node.args and isinstance(const(node.args[0]), str) and const(node.args[0]) not in ('geo', 'null_'): check_call(node, const(node.args[0]))
# ---- VEX snippets ----
def load_var(spec):
    path, var = spec.rsplit(':', 1); m = importlib.util.spec_from_file_location('prelude_mod', path); mod = importlib.util.module_from_spec(m); m.loader.exec_module(mod); return getattr(mod, var)
prelude = '\n'.join(load_var(p) for p in preludes)
DEFRE = re.compile(r'^\s*(void|float|int|vector|vector2|vector4|string|matrix3|matrix)\s+\w+\s*\(', re.M)
auto_lib = '\n'.join(n.value for n in ast.walk(tree) if isinstance(n, ast.Constant) and isinstance(n.value, str) and len(n.value) > 40 and DEFRE.search(n.value) and 'addpoint(geoself()' not in n.value.split('{')[0])      # strings that define VEX functions: tried as a prefix when a snippet calls a function defined in another string
MARK = re.compile(r'@P|\bchf\(|\bchi\(|addpoint\(|addprim\(|setedgegroup\(|\b[ivfs]@\w+|geoself\(\)|prim_normal\(')
def guess_class(s):
    if 'vertexpoint(' in s or '@vtxnum' in s: return 'vertex'
    if 'addpoint(' in s and 'ptnum' not in s: return 'detail'
    if '@primnum' in s or 'primpoints(' in s: return 'primitive'
    return 'point'
wr = geo.createNode('attribwrangle', 'vex_check')
for node in ast.walk(tree):
    if isinstance(node, ast.Constant) and isinstance(node.value, str) and len(node.value) > 40 and MARK.search(node.value):
        s = node.value
        if '%' in s and 'cos' not in s and 'chf' not in s and 'addpoint' not in s: continue
        for variant in (s, prelude + '\n' + s if prelude else None, auto_lib + '\n' + s if auto_lib and auto_lib != s else None):
            if variant is None: continue
            wr.parm('class').set(guess_class(variant)); wr.parm('snippet').set(variant)
            try: wr.cook(force=True)
            except hou.OperationFailed: pass
            errs = list(wr.errors()) + [m for c in wr.children() for m in list(c.errors()) + list(c.warnings())]
            errs = [e for e in errs if not e.strip().startswith('Invalid source')] or errs if any('Invalid source' not in e for e in errs) else errs
            if not errs: break
        else:
            problems.append((node.lineno, 'VEX snippet does not compile: ' + ' | '.join(e.strip().splitlines()[0] for e in errs[:2])))
for ln, msg in sorted(problems): print(f'{script}:{ln}: {msg}')
print('preflight:', 'CLEAN' if not problems else f'{len(problems)} problem(s)'); sys.exit(1 if problems else 0)

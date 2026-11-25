# claude-skills

Claude Code skills, one source of truth for every project and machine.

| Skill | What it does |
|---|---|
| `design-explorations` | Runs a design exploration round to a high bar: grill, brief with a measurable motion bar, research, a kit and one reference piece by hand, approval, then a builder and reviewers onto a board of live mockups. Worked examples: the assistant explorations (`medicalhelp/collection`, `docs/design/assistant/`) and the timeline reel (`medicalhelp/timeline-reel`). |

## Install on the Mac (once)

```sh
git clone https://github.com/medicalhelp/claude-skills ~/Projects/claude-skills
mkdir -p ~/.claude/skills
ln -s ~/Projects/claude-skills/skills/design-explorations ~/.claude/skills/design-explorations
```

The link means a `git pull` in `~/Projects/claude-skills` updates the skill everywhere. Claude Code then offers it in every repo, or by name: `/design-explorations`.

## In a cloud session

Cloud sessions can't see the Mac's `~/.claude`. Ask Claude to add the `medicalhelp/claude-skills` repo to the session and read `skills/<name>/SKILL.md`.

## Editing a skill

Change it here, commit, push, then `git pull` on each machine. Don't copy skill folders into other repos; point to this one.

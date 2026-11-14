# Extras from the terminal chapters

| File | Chapter | How to use it |
|---|---|---|
| `careful.config.toml` | 3.2 | A read-only profile. Copy it into your Codex home folder (`~/.codex/`), then run `codex exec -p careful "..."`. |
| `course.rules` | 3.3 | Rules that forbid `rm` and `git push`. Put it in `~/.codex/rules/`. Rules match the start of a command, so they're guard rails, not a security boundary. |
| `findings-schema.json` | 5.4 | `codex exec --output-schema findings-schema.json -o findings.json "Review books.js and app.js..." < /dev/null` gives you JSON a script can read. Still check each finding. |
| `pre-push` | 5.6 | A git hook: runs `npm test`, then `codex review --base origin/main`, and blocks the push on a P1 finding. Copy it to `.git/hooks/pre-push` and make it executable (`chmod +x`). It uses the Codex CLI that ships inside the ChatGPT app on a Mac; change `CODEX=` if yours lives elsewhere. |

Scripts that run `codex exec` should end with `< /dev/null`. Otherwise Codex waits for extra input on stdin.

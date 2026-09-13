# Tectoniq

A web app that helps people solve **Tectonic** puzzles (also sold as **Suguru**).

MVP: create a puzzle, then play it. Solving assistance — hints, a solver, difficulty
rating — comes later and is deliberately not built yet.

## Commands

| Command           | What it does                                                 |
| ----------------- | ------------------------------------------------------------ |
| `pnpm dev`        | Dev server on :5173                                          |
| `pnpm verify`     | **The quality gate.** Check, typecheck, unit test, build     |
| `pnpm check`      | Format, lint and type-check `.ts` — Oxfmt + Oxlint, one pass |
| `pnpm check:fix`  | Fix whatever Oxfmt and Oxlint can fix                        |
| `pnpm typecheck`  | `vue-tsc` — the only thing that type-checks SFC templates    |
| `pnpm test`       | Unit tests                                                   |
| `pnpm test:watch` | Unit tests in watch mode                                     |
| `pnpm test:e2e`   | Playwright end-to-end tests                                  |

`pnpm verify` is the contract. CI runs exactly this command — if they ever diverge,
the factory's quality gate is a lie. **Never report work as done without a passing
`pnpm verify`.**

E2E needs browsers installed once: `pnpm exec playwright install chromium`.
It is not part of `verify` on purpose — it is slow, and it belongs to the QA stage.

## The toolchain

[Vite+](https://viteplus.dev) (`vp`) unifies dev, build, test, lint and format, so
there is no ESLint and no Prettier here. Lint and format settings live in the `lint`
and `fmt` keys of `vite.config.ts`, not in separate dotfiles. Oxfmt does honour
`// prettier-ignore`, which is what keeps the grid-shaped array literals readable.

Two constraints worth knowing before you change any of it, both established by
experiment rather than by reading docs:

- **`vp check` does not type-check SFC templates.** A component given a prop of
  entirely the wrong type passes `vp check` and is caught only by `vue-tsc`. Both
  steps are in `verify` for that reason — dropping `pnpm typecheck` would silently
  cost you every template type error in the app.
- **TypeScript is pinned to 5.9.3 because of `vue-tsc`, not because of the linter.**
  TS 7 repackaged its exports and `vue-tsc` (3.3.10, the latest) still resolves
  `typescript/lib/tsc`, so it crashes outright on TS 7. Retry the bump when
  `vue-tsc` ships TS 7 support; nothing else in the tree objects.

## The rules of Tectonic

All three matter, and the third is the one people forget:

1. The grid is partitioned into **cages** of 1 to 5 cells.
2. A cage of _N_ cells contains each digit **1..N exactly once**.
3. **No two equal digits may touch — including diagonally.**

Rule 3 is what makes this not Sudoku, and it is what makes the puzzle solvable at
all: without it the cages would be independent of each other.

## Architecture

The app is a static front end. There is no backend, and one should not be added
without a ticket that argues for it — a constraint solver in a Web Worker would
keep the app deployable as static files.

```
src/domain/      Pure TypeScript. No Vue, no DOM. Fully unit tested.
src/components/  Vue components. Presentation only.
src/App.vue      Composition root.
e2e/             Playwright specs.
work/<issue>/    Factory artifacts per ticket (see below).
```

`src/domain/` is the load-bearing part and must stay free of framework imports.
Cells are addressed by a flat row-major **index** (`row * width + col`), which keeps
cell identity a plain number and makes violations cheap to compare and render.

A `Board` holds only player entries; givens live on the `Puzzle`. `valueAt()`
resolves the given first, so **a given can never be overwritten**. Preserve that.

### Conventions

- TypeScript is strict, with `noUncheckedIndexedAccess`. Indexed reads are
  `T | undefined` — handle it rather than asserting it away.
- Oxfmt owns formatting: no semicolons, single quotes, 100 columns. Don't argue with
  it, run `pnpm check:fix`. Grid-shaped array literals are wrapped in
  `// prettier-ignore` because their visual layout carries meaning.
- Domain functions return **all** problems they find, not the first, so the UI can
  show them together.
- Commits follow the rules in [Committing](#committing) below.

## Committing

These six rules are absolute. They apply to every commit, by anyone, human or
agent.

1. **Never commit while `pnpm verify` is failing.** Not "I'll fix it in the next
   commit" — run it, get it green, then commit.
2. **Use conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `test:`,
   `refactor:`. Add a scope where it sharpens things: `feat(domain):`.
3. **The title says concisely what changes.** Imperative mood, no trailing full
   stop.
4. **Never sign or co-sign a commit.** No `Co-Authored-By`, no `Signed-off-by`, no
   generated-with trailers, no attribution of any kind.
5. The body can be used to add extra explanation to the _what_ and _why_, and nothing else. Do not list
   changes the diff already tell you. Use it for the reasoning a reader cannot
   reconstruct. If there is no such reasoning, leave the body out entirely; a bare title is a perfectly good commit.
6. Use no more than 72 columns in the body. Wrap at 72, not 80 or 100. The title is
   always one line, and the body is always wrapped at 72.

## Pull requests

Use `/pr`. It updates the branch's existing pull request rather than opening a
second one, and it writes the body from the full branch diff instead of from the
commit messages — messages state intent, and the diff is where intent and reality
are caught disagreeing.

The body follows `.github/PULL_REQUEST_TEMPLATE.md`, which GitHub also applies to
pull requests opened by hand in the browser. Titles follow the commit-title rules
above.

Opening a pull request publishes to a public repository, so `/pr` shows the body and
waits for a human yes before submitting. Merging is a human gate and never an
agent's to take.

## The factory

Tickets are GitHub Issues. Agents move them through stages; a single `stage:` label
says where a ticket is, so the board is never ambiguous.

```
stage:spec → stage:awaiting-approval → stage:build → stage:qa → stage:review → stage:done
```

Flags: `blocked` (needs a human), `qa:failed` / `review:failed` (back to build).

Run `./scripts/setup-labels.sh` once to create these labels.

### Two human gates

**Spec approval** and **merge**. Everything between is agents. Spec approval is
where the leverage is: most bad agent output traces to a ticket that was
underspecified and an agent that guessed instead of asking.

### Stages

| Stage  | Command       | Status        |
| ------ | ------------- | ------------- |
| Spec   | `/spec <n>`   | Built         |
| Build  | `/build <n>`  | Built         |
| QA     | `/qa <n>`     | Not built yet |
| Review | `/review <n>` | Not built yet |
| Board  | `/factory`    | Built         |

Later stages are deliberately absent. Each one gets written only after the stage
before it has been run on real tickets enough times that its output stops needing
correction. Automating a prompt you are still fixing just produces wrong answers
faster.

### Handoff is by file, never by conversation

Every stage reads and writes `work/<issue>/`, so any stage can be re-run cold by a
fresh agent with no memory of what came before. If a stage needs context that only
exists in a chat transcript, that stage is broken.

### Rules for every agent working here

1. **Never invent a requirement.** If the ticket doesn't say, it goes in the spec's
   Open Questions and the ticket gets `blocked`. Guessing is the failure mode this
   whole system exists to prevent.
2. **Never claim done without a passing `pnpm verify`.** Paste the result.
3. **Respect Out of scope.** If the ticket says not to touch it, don't — even if it
   looks broken. Note it and move on.
4. **Append to `work/<issue>/notes.md`** as you go, for whoever picks this up next.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

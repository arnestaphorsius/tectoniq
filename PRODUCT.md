# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is someone part-way through a **Tectonic** (or **Suguru**) puzzle
from a newspaper or puzzle book, with the paper in front of them, and stuck. They
open Tectoniq to transcribe that grid and get unstuck.

Two consequences of that situation, both confirmed:

- Tectoniq is a **tool used alongside the paper**, not a replacement for it. The
  session begins with a puzzle that already exists elsewhere, and the person may be
  looking at two surfaces at once.
- **Transcription is a chore standing between the user and what they came for.** It
  is not the reason they opened the app.

No other audience has been confirmed. Setters constructing puzzles to publish are
not the primary user.

## Product Purpose

Help people solve Tectonic puzzles.

The MVP is deliberately narrower than the purpose: **create a puzzle, then play
it**. The first piece of solving assistance has shipped: a staged hint on the play
screen. A solver and difficulty rating are not built yet and are deferred on
purpose, not forgotten.

Success is that the player **understands the next step** in their own puzzle. A grid
that gets filled in without the person following why is not success.

## Positioning

**Tectoniq teaches the deduction.** When solving assistance arrives, a hint explains
_why_ a digit must be what it is, in terms of the three rules — not merely which
cell to reveal. Revealing a cell is what a neighbouring puzzle app can copy; being
able to state the reasoning is the claim.

This positioning is confirmed as the intended direction and is **only partly
implemented**. The staged hint explains its digit in terms of the rules, but only
for five strategies and only on the sample puzzle. That is a first step, not the
claim: nothing user-facing may yet say that Tectoniq teaches the deduction.

## Operating Context

The workflow the product exists to serve:

1. The user has a partly-solved Tectonic on paper.
2. They **draw the cage layout** into the editor — the cages are what a Tectonic
   grid _is_ before any clue is written in — and can check that no cell has been
   left out of one.
3. They enter the **givens** (the printed clues). _Not built yet._
4. They **play** the puzzle, entering digits and seeing rule violations flagged.
5. They ask for a **hint**, which points at a cell, then explains why its digit is
   forced. _Built for the sample puzzle only._

**Device class is deliberately undecided.** Phone, tablet, and desktop are to be
treated as equal; no future work may privilege one over the others without a
decision that changes this line. Note that both input models are already assumed by
the code — the play grid is keyboard-driven, the cage editor is pointer/touch-drag —
so neither is speculative.

Terminology in use, and the only vocabulary for these things: **cage** (a region of
1–5 cells), **given** (a printed clue, never overwritable), **entry** (a digit the
player wrote), **violation** (a broken rule the app names), **hint** (a staged pointer
to the next deduction), **strategy** (one named way of deducing a digit).

## Capabilities and Constraints

**The rules of Tectonic**, all three load-bearing:

1. The grid is partitioned into cages of 1 to 5 cells.
2. A cage of _N_ cells contains each digit 1.._N_ exactly once.
3. No two equal digits may touch — including diagonally.

Rule 3 is what makes this not Sudoku, and what makes the puzzle solvable at all;
without it the cages would be independent.

**Built today:**

- Playing one hard-coded sample puzzle: select a cell (pointer or arrow keys), enter
  digits 1–5, clear with Backspace/Delete, press a digit twice to take it back.
  Givens can be selected but never overwritten.
- Violations are flagged per cell as they occur, on **both** ends of a conflict, so
  the player can see what their digit collided with. All problems are reported
  together, never just the first.
- Drawing a cage layout in the editor by pointer drag, on a resizable grid. The
  editor opens on a blank grid: a grid of one-cell cages passes every structural
  check but can never be solved, so offering it as the starting point would imply
  the work was already done.
- Checking a drawn layout on demand, which reports every cell not yet in a cage and
  marks each one — except when nothing has been drawn at all, which is said in words.
- Asking for a hint on the play screen. It comes in stages: first it marks the cell
  to look at and asks whether the player can work it out; then it explains, in the
  rules' own words, why that cell's digit is forced, highlights the cells that force
  it, and offers to fill it in. The explanation never names the digit, so it is not
  shown until the player fills it in. Five strategies are known: Full Block, Unique,
  Crown, Naked Single, and Hidden Single. When the board breaks a rule, has a cell
  with no digit left, or defeats every strategy, the hint says so instead.

**Not built, and not to be implied as built:** placing givens, playing a puzzle you
drew, hints on a drawn puzzle, the harder strategies such as naked pairs, spotting an
entry that is legal but wrong, any persistence, a solver, difficulty rating,
undo/redo, and taking a cell back out of a cage.

**The layout check is structural only.** It answers whether every cell is in a cage
of 1 to 5 connected cells, and nothing else. It does **not** check that the puzzle
can be solved, or that a solution is unique — a layout can pass it and provably have
no solution. Nothing in the product may word this as "valid" or "ready to play".

**Technical constraints:**

- **Static front end, no backend.** Adding one requires a ticket that argues for it.
  A constraint solver belongs in a Web Worker precisely so the app stays deployable
  as static files.
- Grid sizes run 3–12 per side; the editor opens on 5×5.
- Digits never exceed 5, because a cage never exceeds 5 cells.

**Open product decisions — record, do not resolve by assumption:**

- **Persistence is deferred, not rejected.** A transcribed puzzle losing itself on
  reload is MVP scope. It should eventually survive a reload — a person mid-way
  through a paper puzzle will come back to it — and link-sharing is a likely shape.
  The no-backend constraint above still stands, so any answer is local (localStorage
  or URL encoding).
- Which device class, if any, becomes primary.

## Brand Commitments

The name is **Tectoniq**. The app currently carries the line "Help for Tectonic &
Suguru puzzles". Both are existing facts in the code rather than commitments the
author has declared binding — the name is settled; the tagline has not been ratified
as final copy.

There is no logo, no wordmark, no voice or tone guide, and no brand asset of any
kind. None may be assumed to exist.

## Evidence on Hand

- `src/domain/samplePuzzle.ts` — one real 4×5 sample puzzle with givens. This is the
  only puzzle content in the project.
- `CLAUDE.md` — the authoritative statement of the rules, the architecture, and the
  development process.
- `src/domain/hintCopy.ts` — every word a hint shows the player, including the
  explanation for each strategy.

**Absences future work must not fabricate:** no users, no usage data, no
testimonials, no reviews, no press, no case studies, no pricing or licensing, no
public deployment or URL, no imagery, no illustrations, no photography.

## Product Principles

1. **The paper is the source of truth; the app earns its place by explaining.** The
   user already has the puzzle. What they do not have is the reasoning.
2. **Never fill in for the player.** Assistance names a rule and a reason. A digit
   handed over without its justification defeats the purpose.
3. **Transcription is overhead — minimise it, never celebrate it.** Every step
   between "I have a paper puzzle" and "I am playing it" is a cost.
4. **Say everything that is wrong, at both ends.** Problems are reported in full and
   in place, so the player can see the collision rather than hunt for it.
5. **Static, local, and self-contained.** No backend, no account, no round trip. The
   product must remain a thing you can open and use.

## Accessibility & Inclusion

**WCAG 2.2 AA is a binding requirement.** Keyboard parity, contrast, visible focus,
target sizes, and screen-reader semantics are all in scope and are auditable
obligations, not aspirations.

One known, recorded defect against it: **cage drawing in the editor is pointer-only**
— press, drag, release — so a keyboard user cannot draw a cage at all. The play grid
is fully keyboard-driven, which makes the editor the outlier. This is a gap to close,
not an accepted trade.

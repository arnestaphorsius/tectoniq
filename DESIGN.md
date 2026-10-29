---
name: Tectoniq
description: A quiet, print-derived interface for transcribing and solving Tectonic puzzles
colors:
  ink: '#1a1d23'
  paper: '#fbfaf7'
  rule: '#c9c5bd'
  cage-rule: '#1a1d23'
  given: '#1a1d23'
  entry: '#2f6f9f'
  bad: '#b4342a'
  hint: '#b7791f'
  control-rule: '#8a867e'
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '1.75rem'
    fontWeight: 700
    letterSpacing: '-0.02em'
  numeral:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '1.25rem'
    fontWeight: 400
    fontFeature: 'tabular-nums'
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '1rem'
    fontWeight: 400
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '0.9rem'
    fontWeight: 400
rounded:
  none: '0'
spacing:
  '2xs': '0.25rem'
  xs: '0.5rem'
  sm: '0.75rem'
  md: '1rem'
  lg: '1.5rem'
  xl: '2.5rem'
  offScale: '0.35rem'
components:
  cell:
    width: 'clamp(1.75rem, (100cqi - 4px) / var(--cols), 5rem)'
    height: '{components.cell.width}'
    textColor: '{colors.entry}'
    typography: '{typography.numeral}'
    rounded: '{rounded.none}'
  cell-given:
    width: '{components.cell.width}'
    height: '{components.cell.width}'
    textColor: '{colors.given}'
    typography: '{typography.numeral}'
    rounded: '{rounded.none}'
  cell-editor:
    width: '{components.cell.width}'
    height: '{components.cell.width}'
    rounded: '{rounded.none}'
  button:
    height: '2.5rem'
    padding: '0 1rem'
    typography: '{typography.body}'
    rounded: '{rounded.none}'
  input:
    width: '3rem'
    height: '2.5rem'
    padding: '0 0.5rem'
    typography: '{typography.body}'
    rounded: '{rounded.none}'
---

# Design System: Tectoniq

## Overview

**Creative North Star: "The Newsprint Companion"**

Tectoniq is the second sheet on the table. The first is a Tectonic torn out of a
newspaper, part-solved in pencil, and the person holding it is stuck. Everything in
this system follows from that: the app borrows the _logic_ of the printed puzzle page
— what was printed versus what you wrote, a boundary that is real versus a fold that
is merely adjacent — so that a player can move between paper and screen without
re-learning how to read a grid.

**The metaphor governs logic, not texture.** This is the constraint that keeps the
system honest, and it is binding: Tectoniq must read as modern software that
understands print, never as a nostalgia piece. There is no paper grain, no sepia, no
halftone, no torn edges, no typewriter or old-style serif, no faux-newsprint colour
cast. `--paper` (#fbfaf7) is warm by roughly two points of a hex digit and nothing
more; it is a considered off-white, not a stain. The distinction earns its keep the
moment someone proposes a texture: if the change makes the app look _older_, it has
misread the North Star.

Density is low and the composition is a single centred column, with one exception: on
a wide screen the number pad sits beside the play grid. Nothing competes with
the grid, because the grid is the only thing on screen a person actually came for.
Interaction is **precise and unhurried** — every mark lands exactly where it should,
nothing is springy, nothing is celebrated. There are currently no transitions or
animations anywhere in the project, and that quiet is a feature of the current
character rather than an oversight to correct on sight.

**Key Characteristics:**

- Meaning is carried by **line weight** before colour: 1px hairline for adjacency, 2px ink for a real cage boundary.
- **Two hands, two colours.** Printed clues are ink; what the player wrote is blue.
- A single system font stack, one size ramp, **tabular numerals** in every grid.
- Fully square. No radius anywhere in the project, and no elevation: nothing is lifted off the page.
- The **only** width-independent media query in the codebase is `prefers-color-scheme`; every token has a light and a dark value.

## Colors

A warm off-white and a near-black do all the structural work; exactly three chromatic
colours exist, and each is a load-bearing signal with one meaning rather than brand:
blue is the player's hand, red is something broken, amber is where a hint points.

### Primary

- **Entry Blue** (#2f6f9f light / #7db8e0 dark): the digits the _player_ wrote. It appears on nothing else in the app, and it doubles as the selection outline (3px, inset) so the ring reads as "your cursor" in the same voice as your digits. Contrast against paper is 5.17:1 in light and 8.30:1 in dark.

### Secondary

- **Violation Red** (#b4342a light / #e8776d dark): something is wrong. It marks the small triangle on a cell named by a broken rule, and it colours the editor's size refusal message. Contrast against paper is 5.81:1 in light and 6.17:1 in dark.

### Tertiary

- **Hint Amber** (#b7791f light / #e0b053 dark, `--hint`): where a hint is pointing, and only while a hint is on screen. It is never text and never a digit — it appears as a tint mixed into Paper behind a cell, and as the target's inner ring. Against paper it is 3.49:1 in light and 8.89:1 in dark, so the ring clears the 3:1 non-text minimum; it is too weak for text in light, which is one more reason it never carries any.

### Neutral

- **Ink** (#1a1d23 light / #e8e6e1 dark): all body text and headings. 16.17:1 in light, 14.25:1 in dark.
- **Paper** (#fbfaf7 light / #16181c dark): the page and both grid backgrounds. Warm off-white, never pure white.
- **Cage Rule** (identical in value to Ink): the 2px boundary of a cage and the outer frame of a grid. It is a _separate token_ from Ink on purpose — it names a structural role, so a future system can change how a cage edge looks without touching body text.
- **Given** (identical in value to Ink): digits the puzzle printed. Separate from Ink for the same reason.
- **Hairline** (#c9c5bd light / #3a3f47 dark, `--rule`): the 1px divider between adjacent cells inside a single cage. Deliberately faint — it must never compete with a cage boundary.
- **Control Rule** (#8a867e light / #6f747c dark, `--control-rule`): the 1px edge of a button or field. 3.47:1 against paper in light and 3.78:1 in dark, so it clears the 3:1 non-text minimum the Hairline does not, while staying far below the grid's 16:1 ink.
- **Wash** (`--wash`, `color-mix` of Ink into Paper at 7% light / 9% dark): a neutral tint, never a hue. It fills a pressed control and the cage being drawn during a drag, and nothing else.

### Named Rules

**The Three Signals Rule.** Each chromatic colour has exactly one meaning — Entry Blue
the player's hand, Violation Red a broken rule, Hint Amber where a hint points — and
none may be borrowed for another. A fourth chromatic colour needs a meaning none of
the three can carry, and a decision that says so.

**The Two Hands Rule.** A digit's colour says _who wrote it_, never how it is doing.
Ink means the puzzle printed it; Entry Blue means the player wrote it. No third party
gets a colour, and neither of those two colours may be borrowed for anything that is
not a digit — with the single established exception of the selection outline, which is
Entry Blue because it belongs to the player's hand.

**The Red Means Broken Rule.** Violation Red appears only where something is actually
wrong — a broken rule of Tectonic, or an input the app refused. It is never a brand
colour, never a heading, never an accent, never decoration, and never "the danger
colour" applied to a destructive button that has not yet gone wrong.

**The Both-Themes Rule.** Every colour token is declared twice: once in `:root` and
once in the `prefers-color-scheme: dark` block of `src/style.css`. A token defined in
only one theme is a defect, not a shortcut. Audit test: every custom property in
`:root` has a counterpart in the dark block, and the two blocks have identical key
sets.

## Typography

**Display / Body / Numeral Font:** the platform UI stack — `ui-sans-serif, system-ui,
-apple-system, 'Segoe UI', sans-serif`. One family for everything; there is no second
face and no web font is loaded.

**Character:** the type is intentionally anonymous. A newspaper puzzle's numerals are
not expressive and neither are these — the reader's attention belongs to the
arrangement of digits, not their drawing. Choosing the system stack also means the app
inherits the reader's own OS rendering, which is the most "modern and fresh" a
typeface can be without being a statement.

### Hierarchy

- **Display** (700, 1.75rem, letter-spacing -0.02em): the app title only. The negative tracking is the one typographic flourish in the system and exists to stop the wordmark from looking like a browser default.
- **Numeral** (400, 1.25rem, `tabular-nums`): every digit inside a grid cell. A _given_ is set at weight 600 in the same size.
- **Body** (400, 1rem): inherited by every button and input via `font: inherit`. There is no separate control typography.
- **Label** (400, 0.9rem): the tagline (at 0.7 opacity), the editor's field labels, and the size refusal message.

### Named Rules

**The Tabular Rule.** Every digit rendered in a grid uses `font-variant-numeric:
tabular-nums`. A digit that shifts its neighbours when it changes is a bug, not a
style. Audit test: no grid cell's width changes when its contents change from empty to
`1` to `4`.

**The Printed-Not-Painted Rule.** A given is distinguished from a player entry
_twice over_ — by colour (Ink vs Entry Blue) and by weight (600 vs 400). The redundancy
is required, not belt-and-braces: it is what keeps the distinction legible in
greyscale, under colour-vision deficiency, and in the dark theme. Never reduce it to
colour alone.

## Layout

A single centred column, with one exception: the play screen's number pad, which sits
beside the grid when the viewport is wide enough (see The Pad Beside Rule). `body` is
plain block layout — the page is top-anchored rather than centred in the viewport,
because a stack whose height changes with the grid moved the puzzle up and down the
screen every time you switched screens or resized it. `.page` is `max-width: var(--measure)` (52rem — the 800px grid ceiling
plus the page's two 1rem gutters, so the content box is exactly 800px) with `margin-inline:
auto`, `grid-template-columns: minmax(0, 1fr)`, and `2.5rem 1rem` padding. The play
screen widens it to `--measure-play` (65rem) so that the pad's column is _added_ to the
grid's 800px rather than taken out of it. There is no sidebar, no shell, and no header
chrome beyond the title and tagline; the pad is a control on the puzzle, not a sidebar.

Every screen is **two blocks**: the chrome you navigate with (title, tagline, screen
switcher) and the work you came for (the grid, and whatever it says about itself). They
are `2.5rem` apart, and everything inside a block is bound to it by a much smaller gap.
That contrast is what makes the squint test resolve to those two before anything else.

**Spacing rhythm** runs 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2.5rem, declared as `--space-2xs`
through `--space-xl` in `:root`, with one off-scale step at 0.35rem used for button
vertical padding and the gap inside a label. That 0.35rem is the only value that does
not sit on the 0.25rem grid; treat it as incumbent, not as licence to add more. The
steps carry meaning: `2xs`–`xs` bind a group, `sm` ties a grid to its status line, `md`
separates title from navigation, `lg` separates a control group from its grid, and `xl`
is the one big break between chrome and work.

**Responsive behaviour is the fluid cell.** Both grids sit inside a `.grid-frame` —
`container-type: inline-size`, `width: 100%`, `max-width: var(--grid-max)`,
`overflow-x: auto` — and size their cell from the space that frame offers:

```css
--cell: clamp(var(--cell-floor), (100cqi - 4px) / var(--cols), var(--cell-max));
```

The rule is now **identical in both grids, to the character**: a cage should be the size
while you draw it that it will be while you play it. The 4px is the grid's own 2px frame
on each side. Digit size and the violation marker are both derived from `--cell`, so a
cell keeps its proportions as it narrows.

There are **three width-based branches in the codebase and no more**: this `clamp`, the
frame's `max-width`, and the one width media query that moves the number pad beside the
grid. The cap sits on the frame rather than as a second `min()` term in the
clamp because `100cqi` _is_ the frame's inline size — capping the frame makes the ceiling
bind through arithmetic that is already there, and keeps the thing that scrolls the same
as the thing that centres. Apart from the pad's query, `prefers-color-scheme` is the only
`@media` rule.

### Named Rules

**The One Column Rule.** Every screen is a single centred column of stacked blocks, with
exactly one exception, The Pad Beside Rule below. There is no other multi-column layout,
no sidebar, and no dashboard shell in this product. The exception does not license a
second one: anything else proposed beside the grid needs its own decision.

**The Pad Beside Rule.** At a viewport of **66.5rem (1064px) and wider**, the play screen's
number pad sits to the right of the grid, top-aligned with it, `--pad-gap` (`--space-lg`)
away — the step that separates a control group from its grid. Below that it sits under the grid, between
the grid and the hint panel. The hint panel stays under the grid in both layouts: it
explains the grid, so it belongs to the grid's column, not the pad's.

The breakpoint is not a guess at what "desktop" means. `--measure-play` is the narrowest
page on which the grid can still reach its full 800px with the pad beside it, and
`src/style.css` sums it from the tokens it is made of, so it follows any of them:

```
--grid-max 50rem + --pad-gap 1.5rem + --pad-width 11.5rem + 2 × --space-md 1rem = 65rem
```

The breakpoint is that plus **1.5rem of room for a scrollbar**. A media query measures
the viewport including a classic scrollbar (17px on Windows, or on macOS set to always
show them), which the page cannot use. At exactly 65rem such a page would be 17px too
narrow and scroll sideways.

That is what keeps the identical-size rule above intact. Below the breakpoint the pad
is under the grid, so the grid has the whole column, exactly as in the editor; at the
breakpoint and up both grids are at their ceilings. A cage is therefore the same size
in both screens at every viewport. A lower breakpoint would put the pad beside a grid
that is smaller than the editor's, and must not be chosen without giving up that rule.
Custom properties do not work in media queries, so the 66.5rem is a literal kept in step
by hand. `e2e/number-pad.spec.ts` fails if it no longer clears `--measure-play` by a
scrollbar. A `rem` in a media query is the browser's default font size, not the page's,
which is the behaviour wanted here: the layout follows the reader's zoom setting.

Beside the pad the grid's frame is fitted to the grid instead of filling its column, or
a narrow grid would sit in the middle of an 800px column with the pad far off at its
edge. This needs no measuring: from the breakpoint up the page is exactly
`--measure-play` wide, so the grid's column is always `--grid-max`. The play screen sets
`--grid-fit: 1`, and the grid then gives its frame a `min-width` of the cell's own clamp
evaluated for that column — the grid's sizing stays inside the grid, read from the
puzzle it is given. The hint panel's column is then the grid's width. The hint gives no width of its own to that
column (`width: 0; min-width: 100%`), so a long sentence can never widen it and push the
grid and pad sideways.

**The Cell Floor Rule.** A grid cell fills the column it is given, up to its fixed
ceiling, and never renders below `--cell-floor` (1.75rem / 28px). Below that the
**frame** scrolls; the page never does. 28px is chosen twice over: it clears the 24px
WCAG 2.2 target-size minimum, and it is tuned so a full 12×12 grid still fits a 375px
phone with no scrolling at all — the scroll container is the safety net for narrower
viewports and heavy zoom, not the normal case. Audit test: at any viewport from 320px
up, `document.documentElement.scrollWidth` equals `window.innerWidth`.

**The Grid Ceiling Rule.** A cell never exceeds `--cell-max` (5rem / 80px) and a grid's
border box never exceeds `--grid-max` (50rem / 800px). Whichever binds first wins, and
the grid's own 2px frame counts inside the 800 — so the full 80px cell is reachable up
to **nine** columns, ten columns gives 79.6px, and from there up it is the grid cap that
decides and the cell shrinks to suit (66.3px at the 12-column maximum). That is the only
way both limits can hold at once; it is not an off-by-four to be "fixed" by raising the
cap to 804px. Both ceilings are declared in rem so the grid scales under text zoom with
the rest of the system instead of stranding at a fixed pixel size. Audit test: at a wide
viewport no cell's bounding box exceeds 80px and no grid's exceeds 800px.

**Known limit, recorded:** the editor grid carries `touch-action: none` so that a touch
drag draws a cage instead of scrolling. When the frame does scroll — below roughly a
370px viewport at 12 columns — a touch user cannot pan it by dragging on the grid
itself. This is the residue of the drag-versus-pan conflict, deliberately pushed below
every real phone width rather than solved.

**Known limit, recorded:** there is no way to take a cell back out of a cage. Before
the editor opened on a blank grid this could not arise — every cell was always in
some cage, so erasing meant nothing — but now a misdrawn cage can only be fixed by
drawing over it or by re-applying the size to start again. An erase gesture was
considered and deferred: click-to-unassign collides with click-to-make-a-cage-of-one,
and a Draw/Erase toggle would add the screen's first mode.

## Elevation & Depth

**There is no elevation in this project.** Nothing casts a shadow: no `box-shadow`
has an offset or a blur. The one `box-shadow` declaration is the hint target's 2px
inset ring, which is a stroke that happens to be drawn that way — it lets the ring sit
inside the cell alongside the selection's inset outline without either moving the
grid's geometry. Depth is expressed entirely by **stroke weight and colour**: a 1px hairline in `--rule`
says two cells are merely adjacent; a 2px stroke in `--cage-rule` says a real boundary
falls here. The grid's outer frame is the same 2px ink, so a cage edge and the edge of
the puzzle are the same kind of statement.

**This flatness is the current state, not a locked invariant.** It has not been ruled
out that later work introduces elevation — a lifted panel, a drag shadow, a
state-response lift. What follows it, however, _is_ binding, because it is what the
grid's readability depends on.

### Named Rules

**The Weight-Is-Semantic Rule.** Border weight in a grid means something specific and
may not be used for emphasis. 1px hairline = adjacency inside a cage. 2px ink = a cage
boundary or the edge of the puzzle. Thickening a border to make something look more
important corrupts the only depth signal the grid has. Audit test: every 2px Ink stroke
in a grid coincides with an actual cage edge computed by `cageEdges()`. The hint
target's ring is not a border: it is Hint Amber, inset, and present only while a hint
is on screen.

## Shapes

Fully square. There is no `border-radius` declaration anywhere in the project — not on
buttons, not on inputs, not on cells, not on the grid frame — and the result is
consistent rather than accidental.

The form language is **strokes and right angles**. Cells are squares with borders;
cages are drawn by promoting four independent per-cell edge classes
(`edge-top` / `-right` / `-bottom` / `-left`) to 2px, so a cage silhouette emerges from
per-cell decisions rather than being drawn as an outline. The one non-rectangular shape
in the whole system is the violation marker: a 0.7rem right triangle in a cell's
top-right corner, built from a CSS border trick, with its hypotenuse one of only two
diagonal lines in the app. The other is the hint's stroke through a cell losing digits
to an elimination (see Hint marks).

The zero radius is recorded as the established state and is not sealed shut; if a later
pass introduces curvature, it must do so as a deliberate system-wide decision, never as
one rounded button.

## Components

Everything below is written against a single character line: **precise and unhurried**.

### Grid Cell (signature component)

The one thing in Tectoniq that is genuinely designed, and the component every other
decision serves.

- **Shape:** a square that fills its column up to 5rem (80px), the same in both grids, and never falls below 1.75rem — see The Cell Floor Rule and The Grid Ceiling Rule. Zero radius, contents centred with `place-items: center`.
- **Borders:** 1px `--rule` on all sides by default; each side independently promoted to 2px `--cage-rule` when `cageEdges()` says a cage boundary falls there.
- **Empty:** an empty cell contains no child nodes at all — deliberately, so it genuinely matches `:not(:empty)` logic and carries no stray whitespace node.
- **Player entry:** Entry Blue, weight 400, `tabular-nums`.
- **Given:** Ink, weight 600. Selectable but never writable.
- **Selected:** `outline: 3px solid var(--entry)` with `outline-offset: -3px`, so the ring sits _inside_ the cell and never disturbs the grid's geometry. Selection and keyboard focus are the same thing — the selected cell carries `tabindex="0"` and holds real DOM focus.
- **Candidates:** digits the player has marked as possible in an empty cell. Each digit has a fixed place on a 3×3 grid inside the cell, like the five on a die — 1 top-left, 2 top-right, 3 centre, 4 bottom-left, 5 bottom-right — so the eye always looks in the same spot for the same digit. They are Entry Blue, because the player wrote them (The Two Hands Rule), at weight 400 and a size derived from `--cell` (a 4.6th of it, never under 0.5rem). The places are drawn for the eye only and are `aria-hidden`; a screen reader is told "candidates 1, 3, 5" in one phrase. A cell holding a digit shows no candidates, and a given never takes any.
- **Only the player changes candidates.** Placing a digit hides its cell's candidates rather than clearing them, and taking the digit out — Erase, Backspace, or pressing the digit again — shows them again, so trying a digit costs the player nothing. Marking a candidate on a cell with a digit replaces the digit, whatever the number: the digit comes out, the kept candidates show again, and the one pressed is marked among them — marked, never toggled off, so the press always ends with it showing. That makes a wrong digit quick to take back without leaving Candidate mode. A clear on a cell with no digit takes its candidates out. Nothing else is touched — not even a candidate the new digit rules out next door. The marks are a record of the player's thinking, and tidying them would be the app doing the deduction for them (Product Principle 2).
- **Known limit, recorded:** at the 1.75rem cell floor (a 12-wide grid on a phone) candidates are barely legible. Scaling them up would break the cell's proportions, so this is accepted rather than solved.

### Hint marks

What the grid shows while a hint is on screen. They are **fills, never outlines**, so
they cannot be mistaken for the selection (an inset outline) or the violation marker (a
corner triangle), and a cell can carry the selection and a mark at once.

- **Target** — the cell the hint is about: Hint Amber at 34% into Paper, plus a 2px inset Hint Amber ring, so it stands apart from the reasons in greyscale too. It stays marked through every stage.
- **Reason** — a cell that makes the case for the step on show: Hint Amber at 16% into Paper, no ring.
- **Losing** — a cell an elimination rules digits out of: one 3px diagonal stroke, bottom-left to top-right, in Ink at 55%. A pattern rather than a fill, so it reads apart from the reasons in greyscale, and it sits on the background image while the fills sit on the background colour, so a target that is also losing shows both.
- **Dead** — an open cell with no digit left that fits: Violation Red at 22% into Paper. Red, because a dead end is something actually wrong (The Red Means Broken Rule).
- **Nothing is marked on its own.** Every mark arrives with the hint panel's sentence and goes the moment the hint is closed, filled in, or the board changes.

### Violation Marker (signature component)

- **Form:** a 0.7rem right triangle in the top-right corner, in Violation Red, drawn with `border-top` / `border-left` on a zero-size element.
- **Why a corner mark and not a red digit:** a recoloured digit reads as a styling choice and says nothing about which cell to look at. The marker states "this digit is part of a broken rule".
- **Placement rule:** it appears on **both** ends of a conflict, givens included, because seeing what your digit collided with is the entire point.
- **Semantics:** `role="status"`, `aria-label="breaks a rule"`.
- **Reused in the editor** to mean "this cell is in no cage", so that _named by a problem_ looks the same on both screens. Two differences, both deliberate: it is `aria-hidden` there, because the result line already states how many cells are left and a screenful of live regions would talk over it; and it carries `pointer-events: none`, so it can never become a target for a cage drag.
- **Not shown when every cell is undrawn.** Marking all 144 cells of an untouched 12×12 applies the danger colour to something that has not gone wrong — the same argument as The Red Means Broken Rule. A grid nobody has started is reported in words alone.

### Controls

One style, `.control` in `src/style.css`, shared by every button and field. It is
built from the grid's own language rather than from a component library: a square,
a 1px `--control-rule` stroke, a Paper fill, Ink text, no radius, no shadow.

- **Size:** 2.5rem (40px) tall, clearing the 24px WCAG 2.2 target minimum with room.
- **Hover:** the stroke goes to full Ink. **Active:** the Wash fills it. **Focus:** a 2px Ink outline at 2px offset — the same ring as the screen switcher.
- **Refused:** a field whose value was refused takes a `--bad` stroke and `aria-invalid`, and is tied to the refusal sentence by `aria-describedby`. That is Violation Red on an input the app actually refused, which The Red Means Broken Rule permits.
- **Fields** are centred, `tabular-nums`, and have no spinner — the arrow keys still step them, `inputmode="numeric"` and `min`/`max` are kept, and Enter applies them.
- **Never filled.** No control gets a primary treatment: a filled button would out-contrast the grid, which inverts the whole system.

**Presets** are joined into one segmented group (shared 1px edges), because three
sizes are one choice. The joining and the current-choice mark are the shared
`.segmented` rule in `src/style.css`, which the number pad's mode toggle uses too. The size the grid is currently at is marked the way the
screen switcher marks the current screen — weight 600, an Ink stroke, and a 2px Ink
rule along the bottom drawn inside the button — plus `aria-current`. Presets and
the custom fields share one line where there is room, and wrap to two on a phone.

### Number Pad

The play screen's way to enter digits by pointer or touch, after the NYT Sudoku pad. It is
built entirely from `.control`; it adds no style of its own. Without it a phone could not
enter a digit at all, because tapping a cell opens no keyboard.

- **Contents:** a **Normal | Candidate** mode toggle across the top, then the digits
  **1–5** and **Erase**. All five digits are always enabled,
  whatever the selected cell's cage size, because the keyboard accepts them too and the
  violation marker is what says a digit is too big. A key does exactly what the same key
  on the keyboard does, including taking a digit back when it is pressed twice.
- **Erase** is drawn as ⌫ so it fits a square key at phone width, and is named "Erase"
  by `aria-label` and `title`.
- **Beside the grid** (66.5rem and wider): an 11.5rem (`--pad-width`) column of 1 2 3 /
  4 5 Erase, three columns of 3.5rem (`--pad-key-beside`) square keys, `--space-xs`
  apart.
- **Under the grid:** one row of 1–5 and Erase, six 2.5rem square keys `--space-xs` apart.
  That is 17.5rem (280px), which fits a 320px viewport inside the page's gutters.
- **One branch, not two.** The pad's columns and key size are the custom properties
  `--pad-columns` and `--pad-key`, defaulting to the row. The play screen's one media
  query sets them, so the pad has no width branch of its own.
- **Never disabled.** A press with no cell selected, or on a given, does nothing — the
  same as the keyboard. Disabling the pad instead made all six keys grey out and
  return every time the selection crossed a given, which drew the eye off the board
  while the player was only moving around it. The given's own Ink and weight already
  say why nothing happened.
- **One write path.** The pad writes through the grid's own `press()`, the same function
  the keyboard uses, so a pad key and a keyboard key cannot come to behave differently.
- **It never takes the selection away.** A click on the pad is exempt from the
  click-outside rule that drops the selection. After a pointer press, focus goes back
  to the selected cell, so the arrow keys keep working after a click. A key reached
  with Tab and activated from the keyboard keeps focus, so a keyboard user stays on the
  pad. Focus is handed back rather than never taken: preventing the `mousedown` also
  stops Firefox from showing the key as pressed. Handing it back does not scroll, or
  each tap on the pad below a grid would scroll a phone back up to it.
- **The keyboard works from the pad.** With focus on a pad key, digits, Backspace,
  Delete, the arrow keys, Escape and Space go to the grid's own key handler, so a key
  does the same wherever focus is. A digit leaves focus on the pad; an arrow key moves
  the selection and focus follows it into the grid, because selection and focus are the
  same thing. Space switches mode there too, rather than pressing the focused key, so
  Enter is how a pad key is pressed from the keyboard. Tab leaves the pad.
- **The mode toggle** is a `.segmented` pair, joined and marked like the editor's presets: the current
  mode at weight 600 with an Ink stroke and a 2px Ink rule inside along its bottom, plus
  `aria-pressed`. It is set at the Label size (0.9rem) with `--space-xs` padding, which
  is what lets "Candidate" fit half of the 11.5rem beside the grid; it spans the keys
  and never widens them, because `--measure-play` is summed from the pad's width.
- **In Candidate mode** each key's digit moves to the place its candidate takes in a
  cell — both draw on the shared `.die` rule in `src/style.css` — at a third of the
  key's size, so the pad shows what a press will draw. Erase
  keeps its glyph in the middle.
- **Modes and shortcuts.** In Normal mode a digit is written; in Candidate mode it is
  marked, or unmarked when already marked. **Space** switches mode. **Shift and a
  digit** marks one candidate in either mode, read from the physical key, because with
  Shift held a US English keyboard types `!` for 1. A layout that needs Shift to type a
  digit at all, such as French AZERTY, still types the digit there; its players switch
  mode with Space. Erase and Backspace take out a cell's digit, which brings its
  candidates back into sight; from a cell with no digit, they take the candidates out.
- **A held key presses once.** Space switches mode once, and a digit, Shift and a
  digit, or a clear presses once, however long the key is held; a held candidate
  would otherwise flip on and off, and a held Backspace would take out the digit and
  then the candidates under it. The repeats are still kept from scrolling the page.
  A held arrow key moves on every repeat, as it always has.
- **Shortcuts are left alone.** Space or a digit with Ctrl, Alt or Meta is a chord —
  Ctrl and Space switches input source on many systems, Ctrl and 1 switches tab — so
  the grid does nothing with it, and Shift and Space is left alone too. Ctrl and Alt
  together are read as AltGr, which Windows reports that way and which types
  characters, so it is not a chord. The arrow keys and the clears work with any
  modifier, as before the pad.

### Hint Panel

The play screen's staged hint: one main button and a close control above, the text
it reveals below.

- **The button never moves.** It walks every stage — Hint, Why?, Next, Fill in — from
  the same spot and at one width. The close control has a column of its own beside it,
  and the text that comes and goes sits underneath, so nothing above it changes.
- **Held to the grid's width.** The panel is exactly as wide as the grid, capped at a
  34rem measure, so its text lines up with the grid's edges at every width. Under the
  grid the play screen works the width out from the grid's own cell clamp (its
  `--grid-width`); beside the pad the grid's column already has that width.
- **Text flush left, buttons centred.** An explanation runs to several lines, and a
  centred paragraph gives the eye no edge to come back to. The buttons stay on the
  axis that the grid and pad share.
- **Its own group under the pad.** Below the breakpoint the panel is `--space-lg` off
  the pad, the step between control groups, so it does not read as another row of keys.
- **Steps are counted** ("Step 1 of 2", Label size at 0.7 opacity) when a hint takes
  more than one step to explain, so a player pressing Next knows how far there is to go.
  A hint explained in a single step shows no count.

### Drawing feedback

The editor grid carries a crosshair cursor, and while a drag is in progress the
cage it is drawing is filled with the Wash. The tint is read back from the committed
layout, so a cell `withCells` refused is never shown as taken, and it clears the
moment the pointer is released. No transition: it is precise and unhurried, like
everything else.

A blank editor that has not been checked says, under the grid, "Drag across cells to
draw a cage." — the one moment the screen has to explain itself, because an empty
grid gives no clue that it wants dragging.

### Screen Switcher

Two text controls in a `1.5rem` flex row, above the active screen. They are set as
text, not as filled buttons: as native buttons they were the highest-contrast objects
on the page and beat the grid in the squint test, which inverts the whole system.

The current screen is marked **three ways over** — full ink against 0.7 opacity, weight
600, and a 2px `--ink` rule beneath it — plus `aria-current="page"`. The redundancy is
the same argument as the Printed-Not-Painted Rule: it has to survive greyscale, a
dropped colour, and a screen reader. The inactive item at 0.7 opacity computes to
6.11:1 against paper in light and 7.73:1 in dark.

This is a hierarchy treatment, not a control: navigation stays text so it never
competes with the editor's Controls below it.

### Messages

- **Refusal** (editor size validation): Violation Red, `0.9rem`, `role="alert"`, no icon, no border, no background panel. A sentence, in red, where the problem is.
- **Check result — problem** (editor layout check): Violation Red, `0.9rem`, same bare treatment. It names what is missing and what to do about it: "7 cells are not in a cage yet. Drag across them to draw one."
- **Check result — pass**: the same region in **Ink, never green**. This is the rule most likely to be "fixed" by someone later, so the reason is written down: each of the three chromatic colours already has a meaning and none of them is success (The Three Signals Rule), a fourth would break The Both-Themes Rule's audit, and celebrating a result contradicts the North Star's _nothing is celebrated_. The pass and problem states also differ in wording, so the message is legible with no colour at all.
- **The check result region is rendered always and left empty** until a check runs, unlike Refusal, which is `v-if`'d. A polite `role="status"` must be in the DOM before its content changes to be announced; `role="alert"` is announced on insertion. Do not harmonise the two — they are different roles with different rules. An empty paragraph generates no line box, so nothing shifts.
- **Wording discipline.** The passing sentence says the layout is _complete_, never that the puzzle is _valid_ or _solvable_. Structural completeness is not solvability: a layout can pass every check here and still have no solution. A unit test asserts the copy contains neither "solv" nor "valid" so this cannot quietly erode.

## Do's and Don'ts

### Do:

- **Do** carry meaning in line weight first: 1px `--rule` for adjacency, 2px `--cage-rule` for a real boundary.
- **Do** set `font-variant-numeric: tabular-nums` on every digit rendered in a grid.
- **Do** distinguish a given from a player entry by **both** colour and weight (600 vs 400), never by colour alone.
- **Do** declare every new colour token twice — in `:root` and in the `prefers-color-scheme: dark` block.
- **Do** hold selection outlines inside the cell with a negative `outline-offset`, so focus never changes the grid's geometry.
- **Do** meet WCAG 2.2 AA — it is a binding product requirement (PRODUCT.md), not an aspiration. Every text colour currently in the system clears it: Ink 16.17:1 / 14.25:1, Entry Blue 5.17:1 / 8.30:1, Violation Red 5.81:1 / 6.17:1 against paper.
- **Do** keep the grid the only thing on screen with real presence — if a control out-contrasts it, the control is wrong, not the grid.
- **Do** take spacing from `--space-*`, and let the size of a gap say what belongs together.
- **Do** take a grid's limits from `--cell-floor`, `--cell-max` and `--grid-max` rather than typing a number into a `clamp`.
- **Do** derive anything sized against a cell — the digit, the marker — from `--cell`, so it holds its proportion as the grid narrows.

### Don't:

- **Don't** build the generic SaaS dashboard — card-on-grey with an 8px radius, an indigo primary, a sidebar shell. This is the project's binding anti-reference.
- **Don't** read "Newsprint" as texture. No paper grain, no sepia, no halftone, no torn edges, no nostalgic serifs, no faux-print colour cast. The metaphor is about printed-vs-written logic; the app must look current.
- **Don't** use Entry Blue on anything that is not a player-entered digit or the player's selection ring.
- **Don't** use Hint Amber for anything but where a hint points, and never as text: at 3.49:1 in light it is a mark, not a type colour.
- **Don't** use Violation Red decoratively, as a brand colour, or on anything that is not actually wrong.
- **Don't** introduce a success colour. A passing check is stated in Ink and in its wording; green would be a fourth chromatic colour in a system whose three each mean one thing, and it would celebrate a result.
- **Don't** thicken a border for emphasis — 2px means "cage boundary" and nothing else.
- **Don't** style a button or field outside `.control`, and don't give one a fill. A second control style is drift; a filled one out-contrasts the grid.
- **Don't** assume `--rule` (#c9c5bd, 1.65:1 against paper) satisfies the 3:1 non-text contrast threshold. It does not. The cage boundary at 16:1 is what carries the structural meaning; if the hairline ever becomes load-bearing on its own, it needs a new value.
- **Don't** add a second font family or load a web font without a decision that says why one family stopped being enough.
- **Don't** let a grid widen the page. A grid that cannot fit scrolls inside its own frame; the document's scroll width must always equal the viewport's.
- **Don't** give a grid or its frame a cyclic width. `width: 100%` on a centred item in an `auto` grid track collapses the container query to the content's own width, which silently defeats the fluid cell — it was the first thing to go wrong when this was built.

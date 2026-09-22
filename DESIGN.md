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
    padding: '0.35rem 0.75rem'
    typography: '{typography.body}'
    rounded: '{rounded.none}'
  input:
    width: '4rem'
    padding: '0.25rem'
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

Density is low and the composition is a single centred column. Nothing competes with
the grid, because the grid is the only thing on screen a person actually came for.
Interaction is **precise and unhurried** — every mark lands exactly where it should,
nothing is springy, nothing is celebrated. There are currently no transitions or
animations anywhere in the project, and that quiet is a feature of the current
character rather than an oversight to correct on sight.

**Key Characteristics:**

- Meaning is carried by **line weight** before colour: 1px hairline for adjacency, 2px ink for a real cage boundary.
- **Two hands, two colours.** Printed clues are ink; what the player wrote is blue.
- A single system font stack, one size ramp, **tabular numerals** in every grid.
- Fully square. No radius anywhere in the project, and no shadow anywhere either.
- The **only** width-independent media query in the codebase is `prefers-color-scheme`; every token has a light and a dark value.

## Colors

A warm off-white and a near-black do all the structural work; exactly two chromatic
colours exist, and both of them are load-bearing signals rather than brand.

### Primary

- **Entry Blue** (#2f6f9f light / #7db8e0 dark): the digits the _player_ wrote. It appears on nothing else in the app, and it doubles as the selection outline (3px, inset) so the ring reads as "your cursor" in the same voice as your digits. Contrast against paper is 5.17:1 in light and 8.30:1 in dark.

### Secondary

- **Violation Red** (#b4342a light / #e8776d dark): something is wrong. It marks the small triangle on a cell named by a broken rule, and it colours the editor's size refusal message. Contrast against paper is 5.81:1 in light and 6.17:1 in dark.

### Neutral

- **Ink** (#1a1d23 light / #e8e6e1 dark): all body text and headings. 16.17:1 in light, 14.25:1 in dark.
- **Paper** (#fbfaf7 light / #16181c dark): the page and both grid backgrounds. Warm off-white, never pure white.
- **Cage Rule** (identical in value to Ink): the 2px boundary of a cage and the outer frame of a grid. It is a _separate token_ from Ink on purpose — it names a structural role, so a future system can change how a cage edge looks without touching body text.
- **Given** (identical in value to Ink): digits the puzzle printed. Separate from Ink for the same reason.
- **Hairline** (#c9c5bd light / #3a3f47 dark, `--rule`): the 1px divider between adjacent cells inside a single cage. Deliberately faint — it must never compete with a cage boundary.

### Named Rules

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

A single centred column, and nothing else. `body` is plain block layout — the page is
top-anchored rather than centred in the viewport, because a stack whose height changes
with the grid moved the puzzle up and down the screen every time you switched screens
or resized it. `.page` is `max-width: var(--measure)` (52rem — the 800px grid ceiling
plus the page's two 1rem gutters, so the content box is exactly 800px) with `margin-inline:
auto`, `grid-template-columns: minmax(0, 1fr)`, and `2.5rem 1rem` padding. There is no
sidebar, no shell, and no header chrome beyond the title and tagline.

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

There are **two width-based branches in the codebase and no more**: this `clamp`, and the
frame's `max-width`. The cap sits on the frame rather than as a second `min()` term in the
clamp because `100cqi` _is_ the frame's inline size — capping the frame makes the ceiling
bind through arithmetic that is already there, and keeps the thing that scrolls the same
as the thing that centres. There is still no width media query anywhere, and
`prefers-color-scheme` is still the only `@media` rule.

### Named Rules

**The One Column Rule.** Every screen is a single centred column of stacked blocks.
There is no multi-column layout, no sidebar, and no dashboard shell in this product.

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

**There are no shadows in this project.** Not one `box-shadow` declaration exists.
Depth is expressed entirely by **stroke weight and colour**: a 1px hairline in `--rule`
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
important corrupts the only depth signal the grid has. Audit test: every 2px stroke in
a grid coincides with an actual cage edge computed by `cageEdges()`.

## Shapes

Fully square. There is no `border-radius` declaration anywhere in the project — not on
buttons, not on inputs, not on cells, not on the grid frame — and the result is
consistent rather than accidental.

The form language is **strokes and right angles**. Cells are squares with borders;
cages are drawn by promoting four independent per-cell edge classes
(`edge-top` / `-right` / `-bottom` / `-left`) to 2px, so a cage silhouette emerges from
per-cell decisions rather than being drawn as an outline. The one non-rectangular shape
in the whole system is the violation marker: a 0.7rem right triangle in a cell's
top-right corner, built from a CSS border trick, with its hypotenuse the only diagonal
line in the app.

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

### Violation Marker (signature component)

- **Form:** a 0.7rem right triangle in the top-right corner, in Violation Red, drawn with `border-top` / `border-left` on a zero-size element.
- **Why a corner mark and not a red digit:** a recoloured digit reads as a styling choice and says nothing about which cell to look at. The marker states "this digit is part of a broken rule".
- **Placement rule:** it appears on **both** ends of a conflict, givens included, because seeing what your digit collided with is the entire point.
- **Semantics:** `role="status"`, `aria-label="breaks a rule"`.
- **Reused in the editor** to mean "this cell is in no cage", so that _named by a problem_ looks the same on both screens. Two differences, both deliberate: it is `aria-hidden` there, because the result line already states how many cells are left and a screenful of live regions would talk over it; and it carries `pointer-events: none`, so it can never become a target for a cage drag.
- **Not shown when every cell is undrawn.** Marking all 144 cells of an untouched 12×12 applies the danger colour to something that has not gone wrong — the same argument as The Red Means Broken Rule. A grid nobody has started is reported in words alone.

### Buttons — provisional

**Not yet designed.** The only CSS applied is `padding: 0.35rem 0.75rem`,
`font: inherit`, and `cursor: pointer`; everything else is native browser chrome.
This is recorded as unfinished, not as a decision, so no future work should cite it as
"the button style". A designed control should come from the line-weight language above
rather than from a component library, and this is the most likely place for the system
to earn the "modern and fresh" the North Star demands.

### Inputs — provisional

**Not yet designed.** `width: 4rem`, `padding: 0.25rem`, `font: inherit`, native
`<input type="number">` otherwise. The size fields carry `inputmode="numeric"` and
`min`/`max`, which is behaviour worth preserving through any restyle.

### Screen Switcher

Two text controls in a `1.5rem` flex row, above the active screen. They are set as
text, not as filled buttons: as native buttons they were the highest-contrast objects
on the page and beat the grid in the squint test, which inverts the whole system.

The current screen is marked **three ways over** — full ink against 0.7 opacity, weight
600, and a 2px `--ink` rule beneath it — plus `aria-current="page"`. The redundancy is
the same argument as the Printed-Not-Painted Rule: it has to survive greyscale, a
dropped colour, and a screen reader. The inactive item at 0.7 opacity computes to
6.11:1 against paper in light and 7.73:1 in dark.

This is a hierarchy treatment, not a designed control. The editor's presets, size
fields, Apply button and Check the layout button are still native browser chrome and
still provisional. The check button is deliberately not given a primary treatment: a
filled control there would out-contrast the grid, which inverts the whole system.

### Messages

- **Refusal** (editor size validation): Violation Red, `0.9rem`, `role="alert"`, no icon, no border, no background panel. A sentence, in red, where the problem is.
- **Check result — problem** (editor layout check): Violation Red, `0.9rem`, same bare treatment. It names what is missing and what to do about it: "7 cells are not in a cage yet. Drag across them to draw one."
- **Check result — pass**: the same region in **Ink, never green**. This is the rule most likely to be "fixed" by someone later, so the reason is written down: exactly two chromatic colours exist in this system and neither is a success colour, a third would break The Both-Themes Rule's audit, and celebrating a result contradicts the North Star's _nothing is celebrated_. The pass and problem states also differ in wording, so the message is legible with no colour at all.
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
- **Don't** use Violation Red decoratively, as a brand colour, or on anything that is not actually wrong.
- **Don't** introduce a success colour. A passing check is stated in Ink and in its wording; green would be a third chromatic colour in a system that has exactly two, and it would celebrate a result.
- **Don't** thicken a border for emphasis — 2px means "cage boundary" and nothing else.
- **Don't** cite the current buttons and inputs as the system's control style. They are native browser defaults, recorded as provisional.
- **Don't** assume `--rule` (#c9c5bd, 1.65:1 against paper) satisfies the 3:1 non-text contrast threshold. It does not. The cage boundary at 16:1 is what carries the structural meaning; if the hairline ever becomes load-bearing on its own, it needs a new value.
- **Don't** add a second font family or load a web font without a decision that says why one family stopped being enough.
- **Don't** let a grid widen the page. A grid that cannot fit scrolls inside its own frame; the document's scroll width must always equal the viewport's.
- **Don't** give a grid or its frame a cyclic width. `width: 100%` on a centred item in an `auto` grid track collapses the container query to the content's own width, which silently defeats the fluid cell — it was the first thing to go wrong when this was built.

# zk: a math slip-box in Typst

One idea per A6 card (105 × 148 mm). You read the cards digitally as a single
PDF with clickable links, and print them as real cards.

```
notes/<id>-<name>.typ   one card per file, e.g. 1a-continuous-map.typ
sources/<key>.typ     one literature note per source, e.g. munkres2000.typ
inbox/<timestamp>-<title>.typ unfiled thoughts, newest first in the PDF
lib/zk.typ              card template, links, math environments
lib/sheet.typ           4-up A4 imposition for printing
lib/remarkable.typ      card templates for drafting on a reMarkable
zk.typ                  the whole box: contents, cards, sources, tag register
zk                      helper script (typst ≥ 0.14, python3); ./zk help
```

## Capture now, file later

Start a note without choosing where it belongs:

```sh
./zk jot                            # untitled draft; opens VISUAL or EDITOR if set
./zk jot Exponential map            # optional title
./zk jot -m 'Why does this work?'    # quick capture without opening an editor
./zk inbox                          # list drafts, newest first
```

Drafts are ordinary Typst files in `inbox/`, named automatically by capture
time and title, e.g. `20261030-091500-123456-exponential-map.typ`. Titles
become lowercase words separated by hyphens; untitled drafts use `untitled`.
No ID or tags are required. Edit the title and body whenever you like;
editing the heading later does not automatically rename the file.
Without `VISUAL` or `EDITOR`, `jot` simply prints the new file's path;
`--edit` explicitly requests an editor, including when using `-m`.

**Inbox notes appear in the PDF**, after the filed notes and sources, newest
first. The contents page has an Inbox section, and each draft's header shows
INBOX and its capture date. Run `./zk build`, or keep `./zk watch` running:
`jot` updates the file inventory so the watcher picks up each new draft.
Drafts use the same Typst syntax and two-sided card layout as filed notes;
they can link to existing cards with `#zl("2a")`.

When you know where a thought belongs:

```sh
./zk next 2a                        # suggest available permanent IDs
./zk file latest 2b                 # file the most recent draft
./zk file inbox/<timestamp>-<title>.typ 2b  # or select a particular draft
```

`file` moves the draft into `notes/`, preserves its contents, and updates the
PDF inventory. It refuses an ID already in use. You can also select a draft
by its filename or a unique timestamp prefix from `./zk inbox`. There is no
need to file a draft just to read or print it.

## IDs (Folgezettel)

IDs alternate numbers and letters: `1`, `1a`, `1a1`, `1a2`, `1b`, `2`, …
To *continue* a train of thought, bump the last part (`1a` → `1b`). To
*branch* off a card, append a part (`1a` → `1a1`). IDs never change once
assigned, so a card's place in the physical box never changes either.
`./zk next 1a` suggests the next free IDs.

The top-level numbers are just starting points: currently `1` topology,
`2` Lie algebras, `3` category theory. Links between them matter more than
the tree.

An ID means "this follows from that card", not "this is a subtopic of that".
Place a new card after the card it builds on: Functor follows Category (`3`),
so it becomes `3b`. Continue (`3b` → `3c`) for the next step of the main
line; branch (`3b` → `3b1`) to dig into that one card, with examples,
special cases or a lemma it needs. A card that belongs to two areas goes
wherever you were thinking when you wrote it, with a link to the other area.

## Writing a card

Card files are named `<id>-<name>.typ`. Only the ID before the first `-`
counts: the rest is for finding files in your editor, and you can rename it
freely. A plain `<id>.typ` works too. Links always use the bare ID.

```sh
./zk new 1b Basis of a topology -t topology -t definition
```

```typst
#import "/lib/zk.typ": *

= Basis of a topology
#tags("topology", "definition")

#defn[ ... ]   #thm(name: [Urysohn])[ ... ]   #proof[ ... ]
#lemma #prop #cor #example #remark #todo

A link: #zl("1a") shows the target's title, #zl("1a")[my text] shows yours.
```

The card's ID comes from its filename, and its title is its first `=`
heading. A link to a note that doesn't exist fails the build. Every card shows its
parent (↑) and the cards that link to it (←) automatically.

Tables use two 0.25 pt hairlines below the first (header) row, with no
vertical or body-row borders. Use `table.header(...)` for that first row;
the shared template supplies the rules automatically.

### Front and back

A card has two sides. Keep the front self-contained and put the
justification on the back, so you can read the front, try to reconstruct
the back, then flip the card to check:

| Front | Back |
|---|---|
| definition | examples, non-examples, why it's defined this way |
| theorem, proposition | proof |
| construction | why it's well-defined |

Put `#overleaf` where the front should end. A card that fits on its front can
leave the back blank, which leaves room to pencil in links added after
printing. `./zk check` lists cards that use the back and fails on any that
need more than two sides.

## Literature notes

One card per source (book, paper or lecture notes) in `sources/<key>.typ`.
The key is the author's surname plus the year, in lowercase: `munkres2000`,
`humphreys1972`, `maclane1998`. Keys never look like Folgezettel IDs, and
they're filed in their own section of the box, in alphabetical order.

```sh
./zk source munkres2000 Topology -a "James R. Munkres" -y 2000 -t topology
```

A literature note is a map of the source, not a summary of it:

- **What it is**: one or two sentences on the source and why you're reading it.
- **Where things are**: sections mapped to the cards they became, e.g.
  `§18: continuous functions → #zl("1a")`. This is how you find the proof you
  skipped, or the rest of an argument, later on.
- **Takeaways**: ideas worth a card of their own, each with a page number.
  Mark each one `#todo[card]` until its card exists.

The mathematics itself goes on regular Folgezettel cards, in your own words.
Cite a source with `#cite("munkres2000")[§18]`, or use
`#cite("munkres2000")` to show its title. References are collected at the
bottom of the card's last side, above its parent and backlinks, in small,
muted type. The “Source” (or “Sources”) label is automatic; you can place
the calls anywhere in the card. The literature card then lists every card
that cites it (←). Use `#zl` for ordinary links within the main text.

## Building and printing

```sh
./zk watch               # live-rebuild build/zk.pdf while writing
./zk build               # build/zk.pdf: contents, cards, tag register
./zk card 1 1a           # build/cards/<id>.pdf: A6 for card stock
./zk sheet 1 1a 2 2a 3   # build/sheet.pdf: 4 cards per A4 with cut marks
```

For sheets, print at 100% scale (not "fit to page"). If any card has a back,
print double-sided with the flip on the long edge. The backs are mirrored
so they line up.

Notes only compile as part of `zk.typ`. In an editor preview (e.g. Tinymist),
preview `zk.typ`, not the individual note files.

## Drafting on a reMarkable Paper Pro

`./zk remarkable` builds `build/remarkable.pdf`: 50 pages of blank card
fronts, four to a page at 75% of A6 (`--pages N` for more). The page matches
the Paper Pro screen (1620 × 2160 px at 229 ppi), so it fills the display.
Upload it with the reMarkable app (desktop or mobile, or drag it onto
my.remarkable.com) and write on it like a notebook. No developer mode or SSH
needed. When it fills up, upload a fresh copy.

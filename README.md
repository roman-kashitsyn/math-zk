# zk: A6-sized math slip-box

Requires Python 3 and Typst 0.15 or newer.

## Getting started

To capture a thought before deciding where it belongs,
run `./zk jot A thought to revisit`.
This creates a Typst draft in `inbox/` and opens it if `VISUAL` or `EDITOR` is set.
When the draft is ready to become a note,
run `./zk file latest <id>` to file it
(use `./zk next 1a` to find a free ID near a related card).

If you already know where the new card belongs,
create it with `./zk new <id> Card title`, then open the new file in `notes/`.
Run `./zk source` to create a literature note in `sources/`,
then link it in the relevant cards (e.g., `#cite("source")[§1.1]`).

Keep `./zk watch` running while you edit
and open `build/zk.pdf` to see the results after each save.
Inbox drafts also appear in the PDF.
If your editor has a Typst preview, preview `zk.typ`.

Run `./zk help` for commands and `./zk help <command>` for details on creating,
filing, checking, exporting, and printing cards.

## Card conventions

Keep each card focused on one idea. Write it in your own words.

Permanent IDs alternate numbers and letters: `1`, `1a`, `1a1`, …
Continue a line of thought with `1a` → `1b`; branch from it with `1a` → `1a1`.
Keep IDs stable and link related cards.

A note's filename starts with its ID; its first heading becomes the title:

```typst
// notes/1a-example.typ
#import "/lib/zk.typ": *

= Example
#tags("topology")

Related card: #zl("1").
Source: #cite("munkres2000")[§18].
```

Links and citations must point to existing cards. Parent links and backlinks appear automatically.
See `lib/zk.typ` for math environments and formatting commands.
`zk.typ` describes PDF formatting.

## Reading and printing

`./zk build` renders a printable PDF in `build/zk.pdf`.

`./zk html --serve` builds and serves the website locally.
Inbox drafts are excluded unless you pass `--include-inbox`.

Print sheets at 100% scale.
For cards with backs, print double-sided and flip on the long edge.

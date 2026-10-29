// The whole slip-box as one document: contents, every card, tag register.
// Build it with `./zk build` (which refreshes build/notes.txt first).

#import "lib/zk.typ": *

#show: slipbox

// build/notes.txt lists `notes/<id>-<name>` and `sources/<key>`, without `.typ`.
// For notes only the ID before the first `-` counts.
#let paths = read("build/notes.txt").split("\n").map(str.trim).filter(s => s != "")
#let file(path) = (id: path.split("/").last().split("-").first(), path: path)
#let cards = paths.filter(p => p.starts-with("notes/")).map(file).sorted(key: f => id-key(f.id))
#let sources = paths.filter(p => p.starts-with("sources/")).map(file).sorted(key: f => f.id)
#let files = cards + sources

// --- Contents ---------------------------------------------------------------

#heading(outlined: false)[Contents]
#context {
  set text(size: 8pt)
  set par(justify: false)
  let entry(n, depth, id-width) = block(above: 0.45em, below: 0.45em, pad(left: depth * 0.8em, link(
    n.loc,
    [#box(width: id-width, text(font: id-font, size: 0.85em, n.id))#n.title #box(width: 1fr, repeat[.~]) #n.first],
  )))
  let notes = all-notes()
  for n in notes.filter(n => n.kind == "card") {
    entry(n, id-segments(n.id).len() - 1, 3.2em)
  }
  let lit = notes.filter(n => n.kind == "source")
  if lit.len() > 0 {
    heading(level: 2, outlined: false)[Sources]
    for n in lit { entry(n, 0, 7em) }
  }
}

// --- Cards ------------------------------------------------------------------

#for f in files {
  card(f.id, if f.path.starts-with("sources/") { "source" } else { "card" }, include f.path + ".typ")
}

// --- Register (tag → cards) -------------------------------------------------

#pagebreak(weak: true)
#set page(header: none, footer: none, margin: (x: 7mm, y: 9mm))
#heading(outlined: false)[Register]
#context {
  set text(size: 8pt)
  set par(justify: false)
  let by-tag = (:)
  for n in all-notes() {
    for t in n.tags {
      by-tag.insert(t, by-tag.at(t, default: ()) + (n,))
    }
  }
  for t in by-tag.keys().sorted() {
    block(above: 0.5em, below: 0.5em)[
      *#t* --- #by-tag.at(t).map(n => link(n.loc, id-tag(n.id))).join(" ")
    ]
  }
}

// --- Manifest for ./zk ------------------------------------------------------

#context [#metadata(all-notes().map(n => (id: n.id, first: n.first, last: n.last)))<zk-manifest>]

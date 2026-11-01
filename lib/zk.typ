// Slip-box card template and helpers.
//
// Every note lives in `notes/<id>-<name>.typ` and starts with
//
//   #import "/lib/zk.typ": *
//
//   = Continuous map
//   #tags("topology", "definition")
//
// Every literature note lives in `sources/<key>.typ` and starts with
//
//   #import "/lib/zk.typ": *
//
//   = Topology
//   #source(author: [James R. Munkres], year: 2000)
//   #tags("topology")
//
// The ID (or key) comes from the filename: `zk.typ` wraps each file in
// `card`. The title is the file's first `=` heading.
//
// Notes compile as part of `zk.typ` (PDF) or `web.typ` (HTML), which give
// links, backlinks and the register. Single PDF cards are cut out by `./zk`.

// --- Card geometry ----------------------------------------------------------

#let card-paper = "a6" // 105 × 148 mm
#let max-card-pages = 2 // front and back

#let text-font = "Libertinus Serif"
#let meta-font = "Libertinus Sans"
#let id-font = "DejaVu Sans Mono"
#let muted = rgb("#586561")
#let accent = rgb("#24594f")
#let rule = rgb("#c7d1cc")

// --- IDs --------------------------------------------------------------------

// Folgezettel IDs alternate number and letter runs: 1, 1a, 1a2, 1a2b, ...
#let id-segments(id) = id.matches(regex("\d+|[a-z]+")).map(m => m.text)

// Sort key so that 1 < 1a < 1a1 < 1a2 < 1b < 2 < 10.
#let id-key(id) = (id-segments(id)
  .map(s => if s.at(0) in "0123456789" { "0" * calc.max(0, 6 - s.len()) + s } else { s })
  .join("."))

// Folgezettel IDs start with a digit; literature keys (munkres2000) don't.
#let is-card-id(id) = id.match(regex("^\\d+(?:[a-z]+\\d+)*[a-z]*$")) != none

#let id-parent(id) = {
  if not is-card-id(id) { return none }
  let segs = id-segments(id)
  if segs.len() > 1 { segs.slice(0, -1).join() }
}

#let id-tag(id, ink: accent) = box(
  text(font: id-font, size: 0.72em, fill: ink,
    "[" + if id.starts-with("jot-") { "inbox" } else { id } + "]"),
)

// --- Introspection ----------------------------------------------------------

// Everything known about the note that starts at `start` (a <zk-note-start>
// marker): id, kind, title, tags, first and last page, and location.
#let _note-record(start) = {
  let id = start.value.id
  let end = query(<zk-note-end>).find(e => e.value == id)
  if end == none { return none }
  let inside(sel) = query(selector(sel).after(start.location()).before(end.location()))
  let titles = inside(heading.where(level: 1))
  if titles.len() == 0 { panic("note " + id + " needs a title: start it with `= Title`") }
  (
    ..start.value,
    title: titles.first().body,
    tags: inside(<zk-tags>).map(t => t.value).flatten(),
    first: if target() != "html" { start.location().page() },
    last: if target() != "html" { end.location().page() },
    loc: start.location(),
  )
}

#let all-notes() = query(<zk-note-start>).map(_note-record).filter(n => n != none)

#let find-note(id) = all-notes().find(n => n.id == id)

// The note whose card the given location belongs to.
#let note-at(loc) = {
  let before = query(selector(<zk-note-start>).before(loc))
  if before.len() > 0 { before.last().value }
}

// Notes on the page of `loc` (only meaningful inside page header/footer).
#let page-note(loc) = {
  let p = loc.page()
  let starts = query(<zk-note-start>).filter(n => n.location().page() <= p)
  if starts.len() == 0 { return none }
  _note-record(starts.last())
}

// --- Links ------------------------------------------------------------------

// Link to another card: `#zl("1a")` shows the target's title,
// `#zl("1a")[continuous]` shows your own text. Both are followed by the ID,
// which is what you use to find the card in the physical box.
// Unknown IDs are a compile error, so broken links can't slip through.
#let _link(id, body, record: true, ink: accent) = {
  if record [#metadata(id)<zk-link>]
  context {
    let target = find-note(id)
    if target == none {
      // The panic span points into this library, so name the source card.
      let from = note-at(here())
      let where = if from == none { "" } else { " in note " + from.id }
      panic("link to unknown note " + id + where)
    }
    let shown = if body == auto { target.title } else { body }
    show link: set text(fill: ink)
    link(target.loc, [#shown~#id-tag(id, ink: ink)])
  }
}

#let zl(id, ..body) = _link(id, body.pos().at(0, default: auto))

// Collect a source reference for the bottom of the card, with an automatic
// label: #cite("stillwell2008")[§1.1]. Like zl, omitting the text uses the title.
#let cite(id, ..body) = {
  [#metadata((id: id, body: body.pos().at(0, default: auto)))<zk-citation>]
  [#metadata(id)<zk-link>]
}

// --- Math environments ------------------------------------------------------

#let _env(kind, italic: false) = (name: none, body) => context {
  if target() == "html" {
    return html.elem("section", attrs: (class: "environment"), {
      strong([#kind#if name != none [ (#name)].])
      [ ]
      if italic { emph(body) } else { body }
    })
  }
  block(
    width: 100%,
    above: 1.1em,
    below: 1.1em,
    {
      text(font: meta-font, size: 0.8em, weight: "bold", fill: accent, upper(kind))
      if name != none [ (#name)]
      [.]
      [ ]
      if italic { emph(body) } else { body }
    },
  )
}

#let defn = _env("Definition")
#let thm = _env("Theorem", italic: true)
#let lemma = _env("Lemma", italic: true)
#let prop = _env("Proposition", italic: true)
#let cor = _env("Corollary", italic: true)
#let example = _env("Example")
#let remark = _env("Remark")
#let proof-outline = _env("Proof outline")

// Ends the front of the card: what follows goes on the back.
#let overleaf = context {
  if target() == "html" { html.elem("hr") } else { pagebreak() }
}

#let proof(body) = context {
  if target() == "html" {
    return html.elem("section", attrs: (class: "proof"))[
      _Proof._ #body #html.elem("span", attrs: (class: "qed"))[#sym.qed]
    ]
  }
  block(width: 100%, above: 1.1em, below: 1.1em, {
    emph[Proof.]
    [ ]
    body
    h(1fr)
    sym.qed
  })
}

// Something to come back to; rendered visibly so it isn't forgotten on paper.
#let todo(body) = text(fill: red.darken(20%))[[TODO: #body]]

// --- The card ---------------------------------------------------------------

#let separator = context {
  if target() == "html" { html.elem("hr") }
  else { line(length: 100%, stroke: 0.4pt + rule) }
}

#let _header = context {
  let n = page-note(here())
  if n == none { return }
  set text(font: meta-font, size: 7.5pt, fill: muted)
  grid(
    columns: (1fr, auto),
    align: (left + bottom, right + bottom),
    if here().page() > n.first {
      [#n.title · BACK]
    } else {
      text(tracking: 0.08em, if n.kind == "source" { "SOURCE" }
        else if n.kind == "inbox" { "INBOX" } else { "NOTE" })
    },
    text(font: id-font, size: if n.kind == "inbox" { 8pt } else { 10.5pt },
      weight: "bold", fill: accent,
      if n.kind == "inbox" {
        let date = n.id.slice(4, 12)
        date.slice(0, 4) + "-" + date.slice(4, 6) + "-" + date.slice(6, 8)
      } else { n.id }),
  )
  v(-4pt)
  separator
}

#let _footer = context {
  let n = page-note(here())
  if n == none { return }
  let index = here().page() - n.first + 1
  set text(font: meta-font, size: 7pt, fill: muted)
  grid(
    columns: (1fr, auto),
    align: (left, right),
    n.tags.join(" · "),
    if index >= max-card-pages + 1 {
      text(fill: red, weight: "bold")[TOO LONG: page #index of #max-card-pages]
    } else if here().page() < n.last [continued overleaf →],
  )
}

// Everything that links to `id`, as a list of note records.
#let _backlinks(id) = {
  let seen = ()
  for l in query(<zk-link>).filter(l => l.value == id) {
    let from = note-at(l.location())
    if from != none and from.id != id and from.id not in seen.map(s => s.id) {
      seen.push(from)
    }
  }
  seen.sorted(key: n => id-key(n.id))
}

#let _relations(id) = context {
  // The parent is implied by the ID, not written in the source, so a missing
  // parent (e.g. 2a without 2) just means no "↑" line rather than an error.
  let parent = id-parent(id)
  let back = _backlinks(id).filter(n => n.id != parent)
  let start = query(<zk-note-start>).find(n => n.value.id == id)
  let end = query(<zk-note-end>).find(n => n.value == id)
  let citations = if end == none { () } else {
    query(selector(<zk-citation>).after(start.location()).before(end.location()))
      .map(c => c.value)
  }
  if parent != none and find-note(parent) == none { parent = none }
  if parent == none and back.len() == 0 and citations.len() == 0 { return }
  if target() == "html" {
    return html.elem("footer", attrs: (class: "relations"), {
      if citations.len() > 0 {
        html.elem("p")[Sources: #citations.map(c => _link(c.id, c.body, record: false)).join([; ])]
      }
      if parent != none {
        html.elem("p")[Parent: #_link(parent, auto, record: false)]
      }
      if back.len() > 0 {
        html.elem("p")[Linked from: #back.map(n => _link(n.id, auto, record: false)).join([, ])]
      }
    })
  }
  set text(size: 8pt, fill: muted)
  set par(justify: false)
  v(1fr)
  block(breakable: false, width: 100%, {
    line(length: 100%, stroke: 0.3pt + rule)
    v(-2pt)
    if citations.len() > 0 {
      set text(font: meta-font, size: 7.5pt)
      let label = if citations.len() == 1 { "Source" } else { "Sources" }
      [#label: #citations.map(c => _link(c.id, c.body, record: false, ink: muted)).join([; ])]
      if parent != none or back.len() > 0 { parbreak() }
    }
    if parent != none [↑ #_link(parent, auto, record: false) \ ]
    if back.len() > 0 [← #back.map(n => _link(n.id, auto, record: false)).join([, ])]
  })
}

// Tags for the footer and the register: `#tags("topology", "definition")`.
#let tags(..names) = {
  for t in names.pos() {
    assert(type(t) == str, message: "tags are strings: #tags(\"topology\")")
  }
  [#metadata(names.pos())<zk-tags>]
}

// Under the title of a literature note: who wrote it and when.
// Cite it at the bottom of another card with #cite("munkres2000")[§18].
#let source(author: none, year: none, info: none) = context {
  if target() == "html" {
    return html.elem("p", attrs: (class: "source"),
      (author, year, info).filter(x => x not in (none, [])).map(x => [#x]).join[, ])
  }
  v(-0.5em)
  text(size: 9.2pt, (author, year, info).filter(x => x not in (none, [])).map(x => [#x]).join[, ])
}

// One card: `zk.typ` wraps every note file in this. `kind` is "card" for
// notes/ and "source" for sources/.
#let card(id, kind, body) = context {
  if kind == "card" {
    assert(is-card-id(id), message: "note id " + id + " is not a Folgezettel ID")
  } else {
    assert(not is-card-id(id), message: "source key " + id + " must not look like a Folgezettel ID")
  }

  if target() == "html" {
    return html.elem("article", {
      [#metadata((id: id, kind: kind))<zk-note-start>]
      html.elem("header", attrs: (class: "eyebrow"))[
        #html.elem("span")[#if kind == "card" [NOTE] else [#upper(kind)]]
        #html.elem("strong")[#id]
      ]
      html.elem("div", attrs: (class: "card-body"), body)
      html.elem("div", attrs: (class: "card-meta"), {
        context {
          let n = find-note(id)
          if n != none and n.tags.len() > 0 {
            html.elem("p", attrs: (class: "tags"), n.tags.map(t =>
              link(label("zk-tag-" + t), [#t])).join([ · ]))
          }
        }
        _relations(id)
      })
      [#metadata(id)<zk-note-end>]
    })
  }

  set page(
    paper: card-paper,
    margin: (x: 8mm, top: 14mm, bottom: 11mm),
    header: _header,
    header-ascent: 25%,
    footer: _footer,
    footer-descent: 35%,
  )
  show heading.where(level: 1): set text(font: meta-font, style: "normal")

  pagebreak(weak: true)
  [#metadata((id: id, kind: kind))<zk-note-start>]
  body
  _relations(id)
  [#metadata(id)<zk-note-end>]
}

// --- Document setup ---------------------------------------------------------

#let slipbox(body) = {
  set document(title: "Slip-box")
  set page(paper: card-paper, margin: (x: 7mm, y: 9mm))
  set text(font: text-font, size: 10pt, lang: "en")
  set par(justify: false, leading: 0.75em, spacing: 1.1em)
  set list(indent: 0.4em, tight: false, spacing: 1.1em)
  set enum(indent: 0.4em, tight: false, spacing: 1.1em)
  // Two hairlines below the first (header) row; no other table borders.
  set table(
    row-gutter: (1.5pt, 0pt),
    stroke: (_, y) => if y == 0 { (bottom: 0.25pt) }
      else if y == 1 { (top: 0.25pt) }
      else { none },
  )
  // Keep Typst's default New Computer Modern Math.
  show heading: set text(font: meta-font)
  show heading.where(level: 1): set text(font: meta-font, size: 17pt)
  show heading.where(level: 1): set block(above: 0pt, below: 1.05em)
  show heading.where(level: 2): set text(font: meta-font, size: 10pt)
  show link: set text(fill: accent)
  body
}

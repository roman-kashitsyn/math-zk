// A multi-page site from the same note bodies as the printable slip-box.
#import "lib/zk.typ": *

#let paths = read("build/web-notes.txt").split("\n").map(str.trim).filter(s => s != "")
#let file(path) = (
  id: if path.starts-with("inbox/") { "jot-" + path.split("/").last() }
      else { path.split("/").last().split("-").first() },
  kind: if path.starts-with("sources/") { "source" }
        else if path.starts-with("inbox/") { "inbox" } else { "card" },
  path: path,
)
#let cards = paths.filter(p => p.starts-with("notes/")).map(file).sorted(key: f => id-key(f.id))
#let sources = paths.filter(p => p.starts-with("sources/")).map(file).sorted(key: f => f.id)
#let inbox = paths.filter(p => p.starts-with("inbox/")).map(file).sorted(key: f => f.id).rev()

// Attach to the nearest existing ancestor, so missing intermediate IDs do
// not hide notes or turn similar prefixes (1a and 1ab) into parent/child.
#let note-tree(entries, parent: none) = {
  let parent-of(n) = {
    let p = id-parent(n.id)
    while p != none and not entries.any(e => e.id == p) { p = id-parent(p) }
    p
  }
  html.elem("ul", attrs: (class: "note-list note-tree"), {
    for n in entries.filter(n => parent-of(n) == parent) {
      html.elem("li", {
        link(n.loc)[#id-tag(n.id) #n.title]
        if entries.any(e => parent-of(e) == n.id) { note-tree(entries, parent: n.id) }
      })
    }
  })
}

#let shell(body, home: false) = {
  set text(lang: "en")
  show heading: it => html.elem("h" + str(calc.min(it.level, 6)), it.body)
  // Stylesheet links are valid in the body. Let Typst generate the head,
  // including its plain-text conversion of titles containing mathematics.
  html.elem("link", attrs: (rel: "stylesheet", href: if home { "style.css" } else { "../style.css" }))
  html.elem("header", attrs: (class: "site-header"))[
    #link(if home { "index.html" } else { "../index.html" })[Math slip-box]
    #if home {
      html.elem("a", attrs: (id: "index-view-switch", href: "?view=drawer", hidden: ""))[Card drawer]
    } else {
      html.elem("span")[Notes & connections]
    }
  ]
  html.elem("main", attrs: if home { (id: "static-index") } else { (:) }, body)
}

#asset("style.css", read("lib/web.css", encoding: none))
#asset("drawer.css", read("lib/drawer.css", encoding: none))
#asset("drawer.js", read("lib/drawer.js", encoding: none))
#asset("index.js", read("lib/index.js", encoding: none))

#document("index.html", title: [Math slip-box])[
  #html.elem("link", attrs: (rel: "stylesheet", href: "drawer.css"))
  #html.elem("script", attrs: (type: "module", src: "index.js"))
  #shell(home: true)[
    = Math slip-box
    One idea per note. Follow the links to explore the connections.

    #context {
      let notes = all-notes()
      for (kind, title) in (("card", "Notes"), ("source", "Sources"), ("inbox", "Inbox")) {
        let entries = notes.filter(n => n.kind == kind)
        if entries.len() > 0 {
          heading(level: 2, title)
          if kind == "card" {
            note-tree(entries)
          } else {
            html.elem("ul", attrs: (class: "note-list"), {
              for n in entries {
                html.elem("li", link(n.loc)[#id-tag(n.id) #n.title])
              }
            })
          }
        }
      }
      heading(level: 2)[Tags]
      let tags = notes.map(n => n.tags).flatten().dedup().sorted()
      for t in tags {
        [#html.elem("section", attrs: (class: "tag-group"), {
          heading(level: 3, t)
          html.elem("ul", attrs: (class: "note-list"), {
            for n in notes.filter(n => t in n.tags) {
              html.elem("li", link(n.loc)[#id-tag(n.id) #n.title])
            }
          })
        })#label("zk-tag-" + t)]
      }
    }
  ]
  #html.elem("section", attrs: (id: "slip-workbench", hidden: "", "aria-label": "Card drawer and reading desk"))[
    #html.elem("div", attrs: (class: "bench-layout"))[
      #html.elem("section", attrs: (class: "bench-cabinet", "aria-label": "Card drawer"))[
        #html.elem("input", attrs: (
          class: "bench-search", type: "search",
          "aria-label": "Search cards", "aria-controls": "bench-card-index",
          placeholder: "Search cards…", autocomplete: "off", spellcheck: "false",
          maxlength: "200",
        ))
        #html.elem("div", attrs: (class: "bench-drawer"))[
          #html.elem("div", attrs: (class: "bench-spines", id: "bench-card-index", "aria-label": "Card index; gray cards are on the desk"))
        ]
      ]
      #html.elem("section", attrs: (class: "bench-desk", "aria-label": "Extracted cards"))[
        #html.elem("div", attrs: (class: "bench-blotter"))[
          #html.elem("div", attrs: (class: "bench-desk-grid"))
        ]
      ]
    ]
    #html.elem("p", attrs: (class: "bench-announcement", role: "status", "aria-live": "polite", "aria-atomic": "true"))
    #html.elem("p", attrs: (class: "bench-announcement", id: "bench-keyboard-help"))[
      Drag cards onto the desk or back into the drawer; on a touch screen, hold a card to pick it up.
      Links between cards on the desk bring the linked card out beside them.
      With the keyboard, press Space to pick up a card, D for the desk or R for the drawer,
      arrow keys to position, and Enter to drop. Escape cancels.
    ]
  ]
]

#for f in cards + sources + inbox {
  let folder = f.path.split("/").first()
  document(folder + "/" + f.id + ".html", context {
    let n = find-note(f.id)
    set document(title: if n == none { [#f.id] } else { [#n.title · #f.id] })
    shell(card(f.id, f.kind, include f.path + ".typ"))
  })
}

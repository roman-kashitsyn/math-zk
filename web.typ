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

#let shell(body, home: false) = {
  set text(lang: "en")
  show heading: it => html.elem("h" + str(calc.min(it.level, 6)), it.body)
  // Stylesheet links are valid in the body. Let Typst generate the head,
  // including its plain-text conversion of titles containing mathematics.
  html.elem("link", attrs: (rel: "stylesheet", href: if home { "style.css" } else { "../style.css" }))
  html.elem("header", attrs: (class: "site-header"))[
    #link(if home { "index.html" } else { "../index.html" })[Math slip-box]
    #html.elem("span")[Notes & connections]
  ]
  html.elem("main", body)
}

#asset("style.css", read("lib/web.css", encoding: none))

#document("index.html", title: [Math slip-box], shell(home: true)[
  = Math slip-box
  One idea per note. Follow the links to explore the connections.

  #context {
    let notes = all-notes()
    for (kind, title) in (("card", "Notes"), ("source", "Sources"), ("inbox", "Inbox")) {
      let entries = notes.filter(n => n.kind == kind)
      if entries.len() > 0 {
        heading(level: 2, title)
        html.elem("ul", attrs: (class: "note-list"), {
          for n in entries {
            html.elem("li", link(n.loc)[#id-tag(n.id) #n.title])
          }
        })
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
])

#for f in cards + sources + inbox {
  let folder = f.path.split("/").first()
  document(folder + "/" + f.id + ".html", context {
    let n = find-note(f.id)
    set document(title: if n == none { [#f.id] } else { [#n.title · #f.id] })
    shell(card(f.id, f.kind, include f.path + ".typ"))
  })
}

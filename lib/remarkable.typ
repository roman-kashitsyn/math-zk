// A notebook for drafting cards on a reMarkable Paper Pro: upload the PDF
// with the reMarkable app and write on it. Driven by `./zk remarkable`,
// which passes --input pages=<n>.
//
// Each page holds four card fronts at 75% of A6, sized to the screen
// (1620 × 2160 px at 229 ppi) so the device shows the page without margins.
// The cards mirror lib/zk.typ: ID top right, title, body, tags at the foot.

#let pages = int(sys.inputs.at("pages", default: "50"))
#let scale = 0.75

#let ink = luma(110) // e-ink washes light greys out; keep the marks visible
#let faint = luma(150)

// One card front, `s` times A6. Coordinates below are mm on a real card.
#let card(s) = {
  let mm = s * 1mm
  let (w, h) = (105, 148)
  let (x0, x1) = (7, w - 7)
  let hline(y, stroke) = place(dx: x0 * mm, dy: y * mm,
    line(length: (x1 - x0) * mm, stroke: stroke))
  box(width: w * mm, height: h * mm, {
    place(rect(width: 100%, height: 100%, radius: 2 * mm, stroke: 0.6pt + ink))
    place(dx: (x1 - 24) * mm, dy: 4 * mm, // ID
      rect(width: 24 * mm, height: 8 * mm, radius: 1 * mm, stroke: 0.5pt + ink))
    hline(14, 0.5pt + ink)
    hline(24, 0.4pt + faint) // title
    // Body: 5 mm dot grid, good for both prose and diagrams.
    for y in range(29, 136, step: 5) {
      for x in range(x0 + 3, x1, step: 5) { // centred: 10, 15, ..., 95
        place(dx: x * mm - 0.3 * mm, dy: y * mm - 0.3 * mm,
          circle(radius: 0.3 * mm, fill: ink, stroke: none))
      }
    }
    hline(139, 0.4pt + faint) // tags below
  })
}

#set page(width: 1620in / 229, height: 2160in / 229, margin: 0pt)

#let sheet = align(center + horizon, grid(
  columns: 2,
  gutter: (8mm * scale, 6mm),
  ..range(4).map(_ => card(scale)),
))

#for i in range(pages) {
  if i > 0 { pagebreak() }
  sheet
}

// Imposes A6 cards from build/zk.pdf four to an A4 sheet, for printing on
// ordinary paper and cutting. Driven by `./zk sheet`, which passes
//   --input cards='[[front, back-or-null], ...]'   (page numbers in zk.pdf)
// Backs are mirrored so that duplex printing (flip on long edge) lines up.

#let cards = json(bytes(sys.inputs.at("cards", default: "[]")))
#let has-backs = cards.any(c => c.at(1) != none)

#let cell-w = 105mm
#let cell-h = 148.5mm

#set page(paper: "a4", margin: 0pt)

#let cut-marks = {
  let mark = 0.3pt + luma(50%)
  // Vertical centre line, at top and bottom edges.
  place(dx: cell-w, dy: 4mm, line(length: 6mm, angle: 90deg, stroke: mark))
  place(dx: cell-w, dy: 2 * cell-h - 10mm, line(length: 6mm, angle: 90deg, stroke: mark))
  // Horizontal centre line, at left and right edges.
  place(dx: 4mm, dy: cell-h, line(length: 6mm, stroke: mark))
  place(dx: 2 * cell-w - 10mm, dy: cell-h, line(length: 6mm, stroke: mark))
  // Centre cross.
  place(dx: cell-w - 3mm, dy: cell-h, line(length: 6mm, stroke: mark))
  place(dx: cell-w, dy: cell-h - 3mm, line(length: 6mm, angle: 90deg, stroke: mark))
}

#let card(page, col, row) = if page != none {
  place(dx: col * cell-w, dy: row * cell-h, image("/build/zk.pdf", page: page, width: cell-w))
}

#for (i, start) in range(0, cards.len(), step: 4).enumerate() {
  let batch = cards.slice(start, calc.min(start + 4, cards.len()))
  if i > 0 { pagebreak() }
  // Front: left-to-right, top-to-bottom.
  for (k, c) in batch.enumerate() { card(c.at(0), calc.rem(k, 2), calc.quo(k, 2)) }
  cut-marks
  if has-backs {
    pagebreak()
    // Back: columns swapped so each back lands behind its front.
    for (k, c) in batch.enumerate() { card(c.at(1), 1 - calc.rem(k, 2), calc.quo(k, 2)) }
  }
}

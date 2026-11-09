#import "/lib/zk.typ": *

= Classical Lie groups
#tags("lie-theory")

#table(
  columns: 2,
  table.header([*Group*], [*Definition*]),

  [$"GL"(n, F)$], [${ A in F^(n times n) : "det"(A) eq.not 0 }$],
  [$"SL"(n, F)$], [${ A in "GL"(n, F): "det"(A) = 1 }$],
  [$"O"(n)$], [${ A in bb(R)^(n times n): A A^T = 1 }$],
  [$"SO"(n)$], [${ A in "O"(n): "det"(A) = 1 }$],
  [$"U"(n)$], [${ A in bb(C)^(n times n): A dash(A)^T = 1 }$],
  [$"SU"(n)$], [${ A in "U"(n): "det"(A) = 1 }$],
  [$"Sp"(n)$], [${ A in bb(H)^(n times n): A dash(A)^T = 1 }$],
)


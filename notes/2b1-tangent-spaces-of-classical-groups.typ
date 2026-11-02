#import "/lib/zk.typ": *

= $T_1$ of classical groups
#tags("lie-theory")

#table(
  columns: 2,
  table.header([*Group*], [*Tangent space*]),

  [$"O"(n)$], [${ X in bb(R)^(n times n): X + X^T = 0 }$],
  [$"SO"(n)$], [${ X in bb(R)^(n times n): X + X^T = 0 }$],
  [$"U"(n)$], [${ X in bb(C)^(n times n): X + dash(X)^T = 0 }$],
  [$"SU"(n)$], [${ X in bb(C)^(n times n): X + X^T = 0 and "Tr"(X) = 0 }$],
  [$"Sp"(n)$], [${ X in bb(H)^(n times n): X + dash(X)^T = 0 }$],
)

#remark[
  The $"Tr"(X) = 0$ requirement for $T_1("SU"(n))$ is a consequence of
  the $det(e^X) = 1$ condition
  and the determinant of exponential formula $det(e^X) = e^("Tr"(X))$.
]

#cite("stillwell2008")[§5.1--5.3]

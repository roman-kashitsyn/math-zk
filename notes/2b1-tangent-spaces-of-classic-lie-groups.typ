#import "/lib/zk.typ": *

= Tangent spaces of classic groups
#tags("lie-theory")

The tangent space of group $G$ are all matrices $X$ that satisfy the corresponding conditions.
#table(
  columns: 3,
  table.header([*Group $G$*], [*Type of $X$*], [*Condition*]),

  [$"O"(n)$], [$bb(R)^(n times n)$], [$X + X^T = 0$],
  [$"SU"(n)$], [$bb(R)^(n times n)$], [$X + X^T = 0$],
  [$"U"(n)$], [$bb(C)^(n times n)$], [$X + dash(X)^T = 0$],
  [$"SU"(n)$], [$bb(C)^(n times n)$], [$X + X^T = 0 and "Tr"(X) = 0$],
  [$"Sp"(n)$], [$bb(H)^(n times n)$], [$X + dash(X)^T = 0$],
)

#cite("stillwell2008")[§5.1--5.3]

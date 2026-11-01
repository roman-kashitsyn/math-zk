#import "/lib/zk.typ": *

= Lie algebra

#defn[
  A _Lie algebra_ $frak(g)$ is a vector space equipped with
  a bilinear operation $[,]$ (called _Lie bracket_)
  that satisfies the following axioms:

  - Alternating property: $forall X in frak(g)$, \
    $[X, X] = 0$.
  - Jacobi identity: $forall X, Y, Z in frak(g)$, \
    $[X, [Y, Z]] + [Y, [Z, X]] + [Z, [X, Y]] = 0$.
]

#tags("lie-theory")

#cite("stillwell2008")[§4.4]

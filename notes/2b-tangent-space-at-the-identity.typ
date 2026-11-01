#import "/lib/zk.typ": *

= Tangent space at the identity

#defn[
  If $G$ is a matrix group,
  its _tangent space at the identity_ $T_1(G)$
  is the set of matrices of the form $X = A'(0)$,
  where $A(t)$ is a smooth path in $G$ such that $A(0) = bold(1)$.
]

#separator

#thm[
  $T_1(G)$ is a vector space over $bb(R)$, i.e., \
  $forall X, Y in T_1(G), r in bb(R):$ $X + Y in T_1(G)$ and $r X in T_1(G)$.
]

#separator

#proof-outline[
  - Choose smooth paths $A(t)$ and $B(t)$ in $G$
    through $bold(1)$ with derivatives $X$ and $Y$.
  - Their product $C(t) = A(t) B(t)$
    satisfies $C'(0) = X + Y$.
  - For $r in bb(R)$, the path $D(t) = A(r t)$
    satisfies $D'(0) = r X$.
]

#tags("lie-theory")

#cite("stillwell2008")[§5.4]

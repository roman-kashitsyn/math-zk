#import "/lib/zk.typ": *

= Matrix Lie group
#tags("lie-theory")

#defn[
  A _matrix Lie group_ $G$ is a set of $n times n$ matrices
  closed under inversion, multiplication, and non-singular limits.
]

#remark[
  The last condition means that if $A_1, A_2, dots.h$ converges in $G$,
  and $A = lim_(k -> infinity) A_k$ has an inverse, then $A in G$.
]

#cite("stillwell2008")[§1.1]

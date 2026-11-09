#import "/lib/zk.typ": *

= Lie bracket property
#tags("lie-theory")

#thm[
  Tangent spaces are closed under the Lie bracket:
  $ forall X, Y in T_1(G): [X, Y] = X Y - Y X in T_1(G) $
]

#proof-outline[
  - Let $A(0) = B(0) = bold(1)$, $A'(0) = X$, $B'(0) = Y$.
  - Consider path $C_s (t) = A(s) B(t) A^(-1)(s)$ for a fixed $s$.
  - Compute $C_s ' (0) = A(s) Y A^(-1)(s)$.
  - Consider $D(s) = C_s '(0) = A(s) Y A^(-1)(s)$.
  - Observe that $D(s) in T_1(G)$.
  - Observe that also $D'(0) in T_1(G)$ since \
    $D'(0) = lim_(h -> 0) frac(D(h) - D(0), h)$
    and $T_1(G)$ is a finite-dimensional vector space
    and hence closed under limits.
  - Compute $D'(0) = A'(0) Y A^(-1)(0) + A(0) Y (A^(-1))'(0)$.
  - Use $A^(-1) ' = - A^(-1) A' A^(-1)$ to deduce that \
    $D'(0) = X Y - Y X = [X, Y]$.
]

#cite("stillwell2008")[§5.4]
#import "/lib/zk.typ": *

= $T_1$ of a normal subgroup
#tags("lie-theory")

#thm[
  If $H$ is a normal subgroup of Lie matrix group $G$,
  then $T_1(H)$ is an ideal of $T_1(G)$.
]

#proof-outline[
  - Note that $T_1(H) subset.eq T_1(G)$
    since every smooth curve in $H$ is also a smooth curve in $G$.
  - Let $A(t) in G$ and $B(t) in H$ such that $A(0) = B(0) = bold(1)$,
    $A'(0) = X in T_1(G)$, $B'(0) = Y in T_1(H)$.
  - Observe that $C_s (t) = A(s) B(t) A^(-1) (s) in H$ because
    $H$ is a normal subgroup.
  - Observe that $C_s (0) = bold(1)$ and thus \
    $C_s ' (0) = A(s) Y A^(-1) (s) in T_1(H)$.
  - Observe that $D(s) = C_s ' (0)$ is a smooth path in $T_1(H)$.
  - It follows that $D'(0) = X Y - Y X in T_1(H)$ (see #zl("2b2")).
]
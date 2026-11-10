#import "/lib/zk.typ": *

= Lie algebra homomorphism kernel
#tags("lie-theory")

#thm[
  If $phi : frak(g) -> frak(g)'$ is a Lie algebra homomorphism
  and $frak(h) = { X in frak(g) : phi(X) = bold(0) }$ is its kernel,
  then $frak(h)$ is an ideal of $frak(g)$.
]

#proof-outline[
  - Observe that $phi$ preserves sums, scalar multiplication, and Lie brackets.
    - $phi(X + Y) = phi(X) + (Y)$
    - $phi(r X) = r phi(X)$
    - $phi([X, Y]) = [phi(X), phi(Y)]$
  - Show that $frak(h)$ is a subspace:
    - $forall X_1, X_2 in frak(h)$, $X_1 + X_2 in frak(h)$.
    - $forall X in frak(h)$, $r X in frak(h)$.
  - Show that $frak(h)$ is closed under Lie bracket with elements of $frak(g)$:
    $forall X in frak(h), Y in frak(g)$, $[X, Y] in frak(h)$.
]

#cite("stillwell2008")[§6.2]

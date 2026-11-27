#import "/lib/zk.typ": *

= Invariant subspace
#tags("lie-theory")

#defn[
  Let $Pi$ be a representation of a matrix Lie group $G$ acting on $V$.
  Subspace $W$ of $V$ is called _invariant_ if

  $ forall A in G, w in W: Pi(A) w in W $
]

#separator

#defn[
  An invariant subspace $W$ of $V$ is called _nontrivial_
  if $W eq.not {0}$ and  $W eq.not V$.
]

#separator

#defn[
  A representation $Pi$ with no nontrivial invariant subspaces
  is called _irreducible_.
]

#separator

#remark[
  _Invariant subspace_, _nontrivial_, and _irreducible_ are defined analogously for Lie algebra representations.
]

#cite("hall2003")[§4.1]

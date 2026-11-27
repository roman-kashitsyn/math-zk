#import "/lib/zk.typ": *

= Intertwining map
#tags("lie-theory")

#defn[
  Let $Pi$ be a representation of a matrix Lie group $G$ acting on $V$
  and $Sigma$ be a representation of $G$ acting on $W$.
  A linear map $phi.alt : V -> W$ is called an _intertwining map_ of these representations if

  $ forall A in G, v in V: phi.alt (Pi(A) v) = Sigma(A) phi.alt(v) $

]

#remark[A similar property defines an intertwining map of two Lie algebra representations.]

#separator

#defn[
  If $phi.alt$ is an invertible intertwining map, it's called an _isomorphism_ of representations.
  If there exists an isomorphism of two representations, they are called _isomorphic_.
]

#cite("hall2003")[§4.1]

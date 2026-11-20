#import "/lib/zk.typ": *

= Initial object
#tags("ct")

#defn[
  An _initial object_ in a category $cal(C)$
  is an object that has a unique arrow
  to every other object in $cal(C)$.

  $I in "ob"(cal(C))$ is initial if
  $forall X in "ob"(cal(C))$ $exists !h : I -> X$.

  #align(center, diagram($ I hom(!h, ->) & X \ $))
]

#separator

#example[
  In $"Set"$, $emptyset$ is the only initial object.
]

#cite("pierce1991")[§1.4]

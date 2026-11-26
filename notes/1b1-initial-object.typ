#import "/lib/zk.typ": *

= Initial object
#tags("ct")

#defn[
  An _initial object_ in a category $cal(C)$
  is an object that has a unique arrow
  to every other object $X$ in $cal(C)$.

  #align(center, diagram($ I hom(!, ->) & X \ $))
]

#separator

#example[
  In $"Set"$, $emptyset$ is the only initial object.
]

#cite("pierce1991")[§1.4.1]

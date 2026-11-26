#import "/lib/zk.typ": *

= Terminal object
#tags("ct")

#defn[
  A _terminal object_ $T$ in category $cal(C)$
  is an object such that for every other object $X$ in $cal(C)$,
  there is a unique arrow $X -> T$.

  #align(center, diagram($ X hom(!, ->) & T \ $))
]

#separator

#example[
  In $"Set"$, every singleton set is a terminal object.
]

#cite("pierce1991")[§1.4.2]

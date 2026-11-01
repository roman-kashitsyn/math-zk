#import "/lib/zk.typ": *

= Category
#tags("ct", "defn")

#defn[
  A _category_ $cal(C)$ is an object defined by the following components:
  + A collection (a set or a proper class) of _objects_ $"ob"(cal(C))$.
  + A collection of _arrows_ $"arr"(cal(C))$ between objects in $cal(C)$.
    For an arrow $f : A -> B$,
    where $A, B in "ob"(cal(C))$,
    $"cod"(f) = A$ denotes $f$'s source,
    and $"dom"(f) = B$ denotes its target.
  + An associative composition operator $compose$
    defined for arrows with matching source and target: \
    $forall f : A -> B, g : B -> C,  exists (g compose b) : A -> C$.
  + $forall X in "ob"(cal(C))$, an identity arrow $"id"_X : X -> X$
    that acts as a neutral element for the composition operator: \
    $forall f : A -> B, f = f compose "id"_A = "id"_B compose f$.
]

#cite("pierce1991")[§1]

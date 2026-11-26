#import "/lib/zk.typ": *

= Coproduct
#tags("ct")

#defn[
  A _coproduct_ of object $A, B in "ob"(cal(C))$
  is an object $A + B in "ob"(cal(C))$
  equipped with two arrows
  $ i_1 : A + B -> A, quad i_2 : A + B -> B $
  such that any object $C in "ob"(cal(C))$ with arrows
  $f : A -> C$ and $g : B -> C$
  has a unique mediating arrow
  $ [f, g] : A + B -> C $
  such that
  $ f = i_1 compose [f, g], quad g = i_2 compose [f, g] $

  #align(center, diagram(spacing: (3em, 3em), $
    & C
      hom("dl", f, <-, label-side: #left)
      hom("d", "<--", label: #$[f, g]$, label-side: #right, label-pos: #0.65)
      hom("dr", g, <-)
    & \
    A & A + B
      hom("l", i_1, <-, label-side: #left)
      hom("r", i_2, <-, label-side: #left)
    & B
  $))
]


#separator

#example[
  In $"Set"$, the product of sets $A$ and $B$ is their disjoint union $A union.sq B$.
]

#cite("pierce1991")[§1.5.4]

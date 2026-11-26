#import "/lib/zk.typ": *

= Product
#tags("ct")

#defn[
  A _product_ of objects $A, B in "ob"(cal(C))$
  is an object $A times B in "ob"(cal(C))$
  equipped with two arrows
  $ pi_1 : A times B -> A, quad pi_2 : A times B -> B $
  such that any object $C in "ob"(cal(C))$ with arrows
  $f : C -> A$ and $g : C -> B$
  has a unique mediating arrow
  $ chevron.l f, g chevron.r : C -> A times B $
  such that
  $ f = pi_1 compose chevron.l f, g chevron.r, quad g = pi_2 compose chevron.l f, g chevron.r $

  #align(center, diagram(spacing: (3em, 3em), $
    & C
      hom("dl", f, ->, label-side: #left)
      hom("d", "-->", label: #$chevron.l f, g chevron.r$, label-side: #right, label-pos: #0.65)
      hom("dr", g, ->)
    & \
    A & A times B
      hom("l", pi_1, ->, label-side: #left)
      hom("r", pi_2, ->, label-side: #left)
    & B
  $))
]


#separator

#example[
  In $"Set"$, the product of sets $A$ and $B$ is their Cartesian product $A times B$.
]

#cite("pierce1991")[§1.5.1]

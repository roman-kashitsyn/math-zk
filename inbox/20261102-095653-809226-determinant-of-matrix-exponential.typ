#import "/lib/zk.typ": *

= Determinant of matrix exp
#tags("lie-theory")

#thm[
  For any $X in bb(C)^(n times n)$:
 $ det(e^X) = e^("Tr"(X)) $
]

#proof-outline[
  - Convert $X$ to the upper-triangular form $X = B T B^(-1)$.
  - Notice $X^m = B T^m B^(-1)$.
  - Hence $e^X = e^(B T B^(-1)) = B e^T B^(-1)$.
  - Hence $det(e^X) = det(B) det(e^T) det(B^(-1)) = det(e^T)$.
  - Show that $det(e^T) = e^("Tr"(T))$.
]
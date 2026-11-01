#import "/lib/zk.typ": *

= Matrix representation of $HH$
#tags("lie-theory")

A quaternion $q = a + i b + j c + k d$ corresponds to a $2 times 2$ complex matrix

$ Q = mat(a + i d, -b - i c; b - i c, a - i d) = mat( alpha, -beta; dash(beta), dash(alpha)) $

where $alpha = a + i d$ and $beta = b + i c$.

$"det"(Q) = |q|^2 = a^2 + b^2 + c^2 + d^2$

#cite("stillwell2008")[§1.3]
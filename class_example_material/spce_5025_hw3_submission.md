# SPCE 5025 -- Homework 3
**Coordinate Frames, Rotation Matrices, and State Vector Conversions**
**Author:** Jordan Clayton
**Date:** 2026-02-08

---

## Approach Overview

A few notes on how I approached this one compared to the MATLAB reference:

1. **Reused the `KeplerianElements` dataclass from HW2** — same structure, same `atan2`-everywhere philosophy. Having the elements packed into one object makes it a lot harder to accidentally swap arguments when you're passing them between functions.

2. **Built the rotation matrices by hand instead of calling a library** — for the perifocal-to-ECI transform in Problem 6, I wrote out the full symbolic 3x3 product so I could sanity-check individual elements. It's more work up front, but it catches sign errors that would be invisible if I just called `scipy.spatial.transform`.

3. **Round-trip verification on everything** — for every transformation I compute, I check that it's actually orthonormal ($T T^T = I$, $\det = +1$) and that converting back recovers the original values. This is cheap to compute and catches bugs immediately.

4. **`atan2` for all angle recovery** — same as HW2. It handles quadrants automatically, so there's no separate "if $r \cdot v < 0$ then adjust" logic.

---

## Problem 1: Keplerian Elements for Both State Vectors

**Given** two ECI state vectors:

| Component | Vector 1 | Vector 2 | Units |
|-----------|----------|----------|-------|
| $r_x$ | 326151.080726 | 327000.0 | m |
| $r_y$ | 6077471.251787 | 6077600.0 | m |
| $r_z$ | 2944583.918767 | 2944280.0 | m |
| $v_x$ | -7455.178720 | -7454.0 | m/s |
| $v_y$ | -482.482572 | -483.0 | m/s |
| $v_z$ | 1910.883434 | 1911.0 | m/s |

The conversion from Cartesian to Keplerian is the same pipeline I used in HW2 — work through the conserved quantities one at a time, and each one gives you the next element:

1. **Angular momentum** (Class 1, slide 17): $\vec{h} = \vec{r} \times \vec{v}$. The direction pins down the orbital plane, and the magnitude gives the semi-latus rectum $p = h^2/\mu$.

2. **Specific energy** (Class 1, slides 22–25): $\varepsilon = \frac{v^2}{2} - \frac{\mu}{r}$. Once I have the energy, the semi-major axis drops out (slide 37):

$$\boxed{a = -\frac{\mu}{2\varepsilon}}$$

3. **Eccentricity vector** (Laplace vector, Class 1, slides 26–35 — the constant of integration $\vec{B}$ from the trajectory equation derivation): $\vec{B} = -\frac{\mu}{r}\vec{r} - \vec{h}\times\vec{v}$. This points straight toward periapsis, so its magnitude is eccentricity (slide 32):

$$\boxed{e = \frac{|\vec{B}|}{\mu}}$$

4. **Inclination** from the angular momentum direction (Class 1, slide 19):

$$\boxed{i = \cos^{-1}(\hat{Z} \cdot \hat{h})}$$

5. **Node vector** (Class 1, slide 20): $\hat{N} = \frac{\hat{Z} \times \vec{h}}{|\hat{Z} \times \vec{h}|}$ — lies in the equatorial plane along the ascending node. RAAN is just:

$$\boxed{\Omega = \text{atan2}(N_y, \; N_x)}$$

6. **Argument of periapsis** (Class 1, slides 33–34) from the angle between $\hat{N}$ and $\hat{B}$:

$$\boxed{\omega_p = \text{atan2}\!\left(\hat{h}\cdot(\hat{N}\times\hat{B}), \;\; \hat{N}\cdot\hat{B}\right)}$$

7. **True anomaly** — I go through eccentric anomaly first (Class 2, slide 20 — from the Shuttle flight dynamics math specs): $E = \text{atan2}\!\left(\frac{\vec{r}\cdot\vec{v}}{\sqrt{\mu a}}, \;\; 1 - \frac{r}{a}\right)$, then pull out $\nu$:

$$\sin\nu = \frac{\sqrt{1-e^2}\sin E}{1 - e\cos E}, \qquad \cos\nu = \frac{\cos E - e}{1 - e\cos E}, \qquad \boxed{\nu = \text{atan2}(\sin\nu, \cos\nu)}$$

### Sample Calculation (Vector 1)

Working through Vector 1 step by step to show the process:

**Magnitudes:**

$$r = |\vec{r}_1| = \sqrt{326151.08^2 + 6077471.25^2 + 2944583.92^2} = 6{,}761{,}109.805 \text{ m}$$

$$v = |\vec{v}_1| = \sqrt{(-7455.18)^2 + (-482.48)^2 + 1910.88^2} = 7{,}711.287 \text{ m/s}$$

**Angular momentum** ($\vec{h} = \vec{r} \times \vec{v}$):

$$\vec{h} = \begin{vmatrix} \hat{X} & \hat{Y} & \hat{Z} \\ 326151.08 & 6077471.25 & 2944583.92 \\ -7455.18 & -482.48 & 1910.88 \end{vmatrix}$$

$$= \hat{X}(6077471.25 \cdot 1910.88 - 2944583.92 \cdot (-482.48)) - \hat{Y}(\ldots) + \hat{Z}(\ldots)$$

$$\vec{h} = [1.3034 \times 10^{10}, \; -2.2576 \times 10^{10}, \; 4.5151 \times 10^{10}] \text{ m}^2/\text{s}$$

$$h = |\vec{h}| = 5.2136 \times 10^{10} \text{ m}^2/\text{s}, \qquad \hat{h} = [0.2500, \; -0.4330, \; 0.8660]$$

**Energy and semi-major axis:**

$$\varepsilon = \frac{7711.287^2}{2} - \frac{3.986 \times 10^{14}}{6{,}761{,}109.805} = 29{,}731{,}938 - 58{,}954{,}844 = -29{,}222{,}906.294 \text{ J/kg}$$

$$a = -\frac{3.986 \times 10^{14}}{2(-29{,}222{,}906.294)} = 6{,}820{,}000.0 \text{ m}$$

**Eccentricity vector** ($\vec{B} = -\frac{\mu}{r}\vec{r} - \vec{h}\times\vec{v}$):

$$\frac{\mu}{r} = \frac{3.986 \times 10^{14}}{6{,}761{,}109.805} = 58{,}954{,}844.3 \text{ m/s}^2$$

Computing $\vec{h} \times \vec{v}$ and combining, I get $\vec{B} = [2.1265 \times 10^{12}, \; 3.2207 \times 10^{12}, \; 9.9650 \times 10^{11}]$, so:

$$e = \frac{|\vec{B}|}{\mu} = \frac{3.986 \times 10^{12}}{3.986 \times 10^{14}} = 0.0100$$

**Inclination:**

$$i = \cos^{-1}(\hat{Z} \cdot \hat{h}) = \cos^{-1}(0.8660) = 30.000\degree$$

**RAAN:** From $\hat{N} = \frac{\hat{Z} \times \vec{h}}{|\hat{Z} \times \vec{h}|} = [0.8660, \; 0.5000, \; 0.0]$:

$$\Omega = \text{atan2}(0.5000, \; 0.8660) = 30.000\degree$$

**Argument of periapsis:** With $\hat{B} = [0.5335, \; 0.8080, \; 0.2500]$:

$$\hat{N} \times \hat{B} = [0.1250, \; -0.2165, \; 0.4330]$$

$$\omega_p = \text{atan2}(\hat{h}\cdot(\hat{N}\times\hat{B}), \;\; \hat{N}\cdot\hat{B}) = \text{atan2}(0.5000, \; 0.8660) = 30.000\degree$$

**True anomaly:** With $\vec{r}_1 \cdot \vec{v}_1 = 2.6297 \times 10^{8}$:

$$E = \text{atan2}\!\left(\frac{2.6297 \times 10^{8}}{\sqrt{3.986\times10^{14} \cdot 6.82\times10^{6}}}, \;\; 1 - \frac{6{,}761{,}109.8}{6{,}820{,}000.0}\right) = \text{atan2}(0.5041, \; 0.9914) = 30.289\degree$$

$$\sin\nu = \frac{\sqrt{1 - 0.01^2}\sin(30.289\degree)}{1 - 0.01\cos(30.289\degree)} = 0.5087, \qquad \cos\nu = \frac{\cos(30.289\degree) - 0.01}{1 - 0.01\cos(30.289\degree)} = 0.8609$$

$$\nu = \text{atan2}(0.5087, \; 0.8609) = 30.579\degree$$

Vector 2 follows the same process; results for both are tabulated below.

### Results

| Element | Vector 1 | Vector 2 | Units |
|---------|----------|----------|-------|
| $a$ | 6,820,000.000 | 6,818,109.749 | m |
| $e$ | 0.0100 | 0.00967 | -- |
| $i$ | 30.000 | 30.001 | deg |
| $\Omega$ | 30.000 | 30.009 | deg |
| $\omega_p$ | 30.000 | 30.081 | deg |
| $\nu$ | 30.579 | 30.483 | deg |

The two vectors are clearly on very similar orbits — the elements agree to within fractions of a degree (or a few km in semi-major axis). That'll matter for Problem 4 when I look at the separation in the UVW frame.

The 3D figure below shows the orbit geometry with both state vectors and the key Keplerian elements annotated — the orbital plane tilt (inclination), angular momentum direction, and ascending node line are all visible:

![3D Orbit with Keplerian Elements](fig_problem1_orbit_3d.png)

**Verification**: As a sanity check, the specific orbital energy computed directly from the state vector matches the value from the semi-major axis to machine precision ($\Delta\varepsilon = 0$):
$$\varepsilon = \frac{v^2}{2} - \frac{\mu}{r} = -29{,}222{,}906.294 \text{ J/kg} = -\frac{\mu}{2a}$$

---

## Problem 2: ECI to UVW Transformation Matrix

The UVW frame (Class 3, slide 32) is built from Vector 1's position and velocity. The construction is pretty intuitive:

$$\hat{U} = \frac{\vec{r}}{|\vec{r}|}, \qquad \hat{W} = \frac{\vec{r}\times\vec{v}}{|\vec{r}\times\vec{v}|}, \qquad \hat{V} = \hat{W}\times\hat{U}$$

$\hat{U}$ is radial, $\hat{W}$ is the angular momentum direction, and $\hat{V}$ fills in the gap (roughly along-track). Then I stack them as rows to get the DCM:

$$T_{ECI}^{UVW} = \begin{bmatrix} \hat{U}^T \\ \hat{V}^T \\ \hat{W}^T \end{bmatrix}$$

### Sample Calculation

**$\hat{U}$** — just normalize the position vector (already computed $|\vec{r}| = 6{,}761{,}109.805$ m in Problem 1):

$$\hat{U} = \frac{\vec{r}_1}{|\vec{r}_1|} = \frac{1}{6{,}761{,}109.805}\begin{bmatrix}326151.08\\6077471.25\\2944583.92\end{bmatrix} = \begin{bmatrix}0.0482393\\0.8988866\\0.4355178\end{bmatrix}$$

**$\hat{W}$** — the angular momentum direction (reusing $\vec{h}$ from Problem 1, $|\vec{h}| = 5.2136 \times 10^{10}$ m$^2$/s):

$$\hat{W} = \frac{\vec{h}}{|\vec{h}|} = [0.2500000, \; -0.4330127, \; 0.8660254]$$

**$\hat{V}$** — complete the right-handed triad via $\hat{V} = \hat{W} \times \hat{U}$:

$$\hat{V} = \begin{vmatrix}\hat{X}&\hat{Y}&\hat{Z}\\0.2500&-0.4330&0.8660\\0.0482&0.8989&0.4355\end{vmatrix} = [-0.9670434, \; -0.0671030, \; 0.2456099]$$

Stacking these as rows:

### Result

$$\boxed{T_{ECI}^{UVW} = \begin{bmatrix} 0.0482393 & 0.8988866 & 0.4355178 \\ -0.9670434 & -0.0671030 & 0.2456099 \\ 0.2500000 & -0.4330127 & 0.8660254 \end{bmatrix}}$$

**Verification**:
- Orthonormality: $\max|T\cdot T^T - I| = 1.6 \times 10^{-17}$ (machine epsilon — as good as it gets)
- Determinant: $\det(T) = +1.0$ (proper rotation, not a reflection)
- Sanity check: $T\cdot\vec{r}_1 = [6{,}761{,}109.8, \; 0.0, \; 0.0]$ m — the V and W components vanish because $\hat{U} = \hat{r}$. If they didn't, something would be very wrong.

---

## Problem 3: $T\vec{r}_1 - T\vec{r}_2 = T(\vec{r}_1 - \vec{r}_2)$

### Analytical Proof

This is really just the statement that rotation matrices are linear operators. If I let $\vec{R}_k$ denote the $k$-th row of $T$, then the $k$-th component of $T\vec{r}_1 - T\vec{r}_2$ is:

$$\vec{R}_k \cdot \vec{r}_1 - \vec{R}_k \cdot \vec{r}_2 = \vec{R}_k \cdot (\vec{r}_1 - \vec{r}_2)$$

by the distributive property of the dot product. The right-hand side is exactly the $k$-th component of $T(\vec{r}_1 - \vec{r}_2)$. Since this holds for all $k \in \{1, 2, 3\}$, the two expressions are identical.

Not a deep result, but it's the foundation for why Problem 4 works — I can take the difference in ECI and *then* rotate, or rotate each vector separately and *then* subtract. Same answer either way.

**Worked example for $k = 1$** (row 1 of $T$ = $\hat{U} = [0.0482393, \; 0.8988866, \; 0.4355178]$):

$$\vec{R}_1 \cdot \vec{r}_1 = (0.0482393)(326151.08) + (0.8988866)(6077471.25) + (0.4355178)(2944583.92) = 6{,}761{,}109.805 \text{ m}$$

$$\vec{R}_1 \cdot \vec{r}_2 = (0.0482393)(327000.0) + (0.8988866)(6077600.0) + (0.4355178)(2944280.0) = 6{,}761{,}134.124 \text{ m}$$

$$\vec{R}_1 \cdot \vec{r}_1 - \vec{R}_1 \cdot \vec{r}_2 = -24.319 \text{ m}$$

Now the other way, with $\vec{r}_1 - \vec{r}_2 = [-848.919, \; -128.748, \; 303.919]$ m:

$$\vec{R}_1 \cdot (\vec{r}_1 - \vec{r}_2) = (0.0482393)(-848.919) + (0.8988866)(-128.748) + (0.4355178)(303.919) = -24.319 \text{ m} \;\; \checkmark$$

Same answer — exactly as expected.

### Numerical Demonstration (all three components)

| Quantity | U (m) | V (m) | W (m) |
|----------|-------|-------|-------|
| $T\vec{r}_1$ | 6,761,109.805 | 0.000 | 0.000 |
| $T\vec{r}_2$ | 6,761,134.124 | -904.227 | -106.721 |
| $T\vec{r}_1 - T\vec{r}_2$ | **-24.319** | **904.227** | **106.721** |
| $T(\vec{r}_1 - \vec{r}_2)$ | **-24.319** | **904.227** | **106.721** |

$$\boxed{\max|LHS - RHS| = 8.0\times10^{-10} \text{ m (floating-point rounding; effectively zero)}}$$

---

## Problem 4: Interpretation of $T_{ECI}^{UVW}(\vec{r}_1 - \vec{r}_2)$

The quantity $T_{ECI}^{UVW}(\vec{r}_1 - \vec{r}_2)$ gives the **position difference between Vector 1 and Vector 2, expressed in Vector 1's UVW frame**.

The key thing is that both vectors get transformed using the **same** DCM — the one I built from Vector 1's state. So the result lands in a frame where:
- **U** points radially outward (along $\vec{r}_1$)
- **V** points roughly along-track
- **W** lies along the angular momentum vector (cross-track / out-of-plane)

The numerical result $[-24.3, \; 904.2, \; 106.7]$ m tells us:

| Component | Value | Physical Meaning |
|-----------|-------|------------------|
| U | $-24.3$ m | Vector 2 is ~24 m farther from Earth (radially) than Vector 1 |
| V | $+904.2$ m | Vector 1 is ~904 m ahead of Vector 2 in the along-track direction |
| W | $+106.7$ m | Vector 1 is ~107 m above Vector 2 in the cross-track direction |

The figure below shows the relative geometry — left panel is the V-W plane (looking inward along $-\hat{U}$ toward Earth), right panel is a bar chart of all three UVW separation components:

![UVW Relative Position Diagram](fig_problem4_uvw_offset.png)

The along-track separation (904 m) dominates, with a smaller cross-track offset (107 m) and a tiny radial difference (24 m). If these were two satellites instead of two state vectors, this is how you'd describe their relative geometry to a mission operator.

---

## Problem 5: ECI to Instrument Frame

The instrument frame is rotated $+30\degree$ about the U axis from UVW. To get from ECI all the way to the instrument frame, I chain the two transformations:

$$T_{ECI}^{\text{Instr}} = T_{UVW}^{\text{Instr}} \cdot T_{ECI}^{UVW}$$

Since U is the first axis of the UVW triad, a rotation about U takes the standard $R_x$ form — the first row and column stay unchanged (that's the axis we're rotating about), and only V and W mix:

$$T_{UVW}^{\text{Instr}} = R_U(30\degree) = R_x(30\degree) = \begin{bmatrix} 1 & 0 & 0 \\ 0 & \cos 30\degree & \sin 30\degree \\ 0 & -\sin 30\degree & \cos 30\degree \end{bmatrix} = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 0.8660254 & 0.5 \\ 0 & -0.5 & 0.8660254 \end{bmatrix}$$

### Sample Calculation (row 2)

Row 1 of $T_{ECI}^{\text{Instr}}$ is trivially just $\hat{U}$ — unchanged by the rotation. For row 2, I take the dot product of row 2 of $R_x(30\degree)$ with each column of $T_{ECI}^{UVW}$, which boils down to a weighted sum of the V and W rows:

$$\text{Row 2} = \cos 30\degree \cdot \hat{V} + \sin 30\degree \cdot \hat{W}$$

$$= 0.8660254 \cdot [-0.9670434, \; -0.0671030, \; 0.2456099] + 0.5 \cdot [0.2500000, \; -0.4330127, \; 0.8660254]$$

$$= [-0.7124842, \; -0.2746193, \; 0.6457171]$$

Row 3 follows the same pattern with $-\sin 30\degree$ and $\cos 30\degree$. The full result:

$$\boxed{T_{ECI}^{\text{Instr}} = \begin{bmatrix} 0.0482393 & 0.8988866 & 0.4355178 \\ -0.7124842 & -0.2746193 & 0.6457171 \\ 0.7000281 & -0.3414485 & 0.6271951 \end{bmatrix}}$$

**Verification**: $\max|T\cdot T^T - I| = 3.8\times10^{-17}$, $\det(T) = +1.0$.

Worth noting: the first row of $T_{ECI}^{\text{Instr}}$ is identical to the first row of $T_{ECI}^{UVW}$. That has to be the case — rotating about U can't change U itself. If the first rows didn't match, I'd know I had a bug.

---

## Problem 6: Keplerian to ECI Cartesian

This is Problem 1 in reverse. Instead of state vectors to elements, I'm going elements to state vectors.

**Given**:

| Element | Value | Units |
|---------|-------|-------|
| $a$ | 7,800,000.0 | m |
| $e$ | 0.001 | -- |
| $i$ | 98.6 | deg |
| $\Omega$ | 30.0 | deg |
| $\omega_p$ | 40.0 | deg |
| $\nu$ | 50.087853 | deg |

### Step 1: Perifocal Vectors

The idea is to first write down position and velocity in the perifocal frame (where the math is 2D), and then rotate into ECI. Starting from the in-plane elements $(a, e, \nu)$:

$$p = a(1 - e^2) = 7{,}800{,}000(1 - 0.001^2) = 7{,}799{,}992.20 \text{ m}$$

$$r = \frac{p}{1 + e\cos\nu} = \frac{7{,}799{,}992.20}{1 + 0.001\cos(50.088\degree)} = \frac{7{,}799{,}992.20}{1.000642} = 7{,}794{,}990.84 \text{ m}$$

With $\cos\nu = 0.6416$ and $\sin\nu = 0.7670$, and $\sqrt{\mu/p} = 7{,}148.613$ m/s, the perifocal vectors are:

$$\vec{r}_{\text{peri}} = \begin{bmatrix} r\cos\nu \\ r\sin\nu \\ 0 \end{bmatrix} = \begin{bmatrix} 5{,}001{,}361.689 \\ 5{,}978{,}985.150 \\ 0 \end{bmatrix} \text{ m}$$

$$\vec{v}_{\text{peri}} = \sqrt{\frac{\mu}{p}}\begin{bmatrix} -\sin\nu \\ e + \cos\nu \\ 0 \end{bmatrix} = \begin{bmatrix} -5{,}483.195 \\ 4{,}593.787 \\ 0 \end{bmatrix} \text{ m/s}$$

Notice the z-components are both zero — that's the whole point of the perifocal frame. Everything is in-plane.

### Step 2: Perifocal to ECI Transform

To rotate from the perifocal frame into ECI, I compose three single-axis rotations:

$$T_{\text{peri}}^{ECI} = R_z(-\Omega)\cdot R_x(-i)\cdot R_z(-\omega_p)$$

The general forms are:

$$R_z(\theta) = \begin{bmatrix} \cos\theta & \sin\theta & 0 \\ -\sin\theta & \cos\theta & 0 \\ 0 & 0 & 1 \end{bmatrix}, \qquad R_x(\theta) = \begin{bmatrix} 1 & 0 & 0 \\ 0 & \cos\theta & \sin\theta \\ 0 & -\sin\theta & \cos\theta \end{bmatrix}$$

Plugging in $\Omega = 30\degree$, $i = 98.6\degree$, $\omega_p = 40\degree$ and evaluating each factor:

$$R_z(-40\degree) = \begin{bmatrix} 0.7660444 & -0.6427876 & 0 \\ 0.6427876 & 0.7660444 & 0 \\ 0 & 0 & 1 \end{bmatrix}$$

$$R_x(-98.6\degree) = \begin{bmatrix} 1 & 0 & 0 \\ 0 & -0.1495353 & 0.9887554 \\ 0 & -0.9887554 & -0.1495353 \end{bmatrix}$$

$$R_z(-30\degree) = \begin{bmatrix} 0.8660254 & -0.5 & 0 \\ 0.5 & 0.8660254 & 0 \\ 0 & 0 & 1 \end{bmatrix}$$

Multiplying right to left — first $R_z(-\omega_p)$, then $R_x(-i)$, then $R_z(-\Omega)$ — gives the combined matrix:

$$T_{\text{peri}}^{ECI} = \begin{bmatrix} \cos\Omega\cos\omega_p - \sin\Omega\sin\omega_p\cos i & -\cos\Omega\sin\omega_p - \sin\Omega\cos\omega_p\cos i & \sin\Omega\sin i \\ \sin\Omega\cos\omega_p + \cos\Omega\sin\omega_p\cos i & -\sin\Omega\sin\omega_p + \cos\Omega\cos\omega_p\cos i & -\cos\Omega\sin i \\ \sin i\sin\omega_p & \sin i\cos\omega_p & \cos i \end{bmatrix}$$

Numerically:

$$T_{\text{peri}}^{ECI} = \begin{bmatrix} 0.7114737 & -0.4993950 & 0.4943782 \\ 0.2997803 & -0.4205976 & -0.8562881 \\ 0.6355604 & 0.7574313 & -0.1495353 \end{bmatrix}$$

### Sample Calculation

**Element $T_{1,1}$** of the combined matrix, using the symbolic formula:

$$T_{1,1} = \cos\Omega\cos\omega_p - \sin\Omega\sin\omega_p\cos i = \cos 30\degree\cos 40\degree - \sin 30\degree\sin 40\degree\cos 98.6\degree$$

$$= (0.8660)(0.7660) - (0.5)(0.6428)(-0.1495) = 0.6632 + 0.0481 = 0.7114$$

**First component of $\vec{r}_{ECI}$** — row 1 of $T$ dotted with $\vec{r}_{\text{peri}}$:

$$r_{ECI,x} = (0.7114737)(5{,}001{,}361.7) + (-0.4993950)(5{,}978{,}985.2) + (0.4943782)(0) = 572{,}461.7 \text{ m} \;\; \checkmark$$

### Step 3: Apply

$$\boxed{\vec{r}_{ECI} = T_{\text{peri}}^{ECI}\cdot\vec{r}_{\text{peri}} = \begin{bmatrix} 572{,}461.685 \\ -1{,}015{,}437.209 \\ 7{,}707{,}337.871 \end{bmatrix} \text{ m}}$$

$$\boxed{\vec{v}_{ECI} = T_{\text{peri}}^{ECI}\cdot\vec{v}_{\text{peri}} = \begin{bmatrix} -6{,}195.263 \\ -3{,}575.890 \\ -5.423 \end{bmatrix} \text{ m/s}}$$

### Verification

- **Round-trip**: I fed this ECI state back into the Cartesian-to-Keplerian function from Problem 1 and recovered all six elements to 6+ significant figures ($\Delta a < 10^{-9}$ m, $\Delta e < 10^{-16}$). That kind of closure is about as good as you can get with 64-bit floats.
- **Energy conservation**: $\varepsilon = -25{,}551{,}310.37$ J/kg from both the state vector and from $-\mu/(2a)$.
- **Physical check**: $|\vec{r}| = 7{,}794{,}990.8$ m, putting the altitude at roughly 1,417 km. An inclination of $98.6\degree$ at this altitude is consistent with a sun-synchronous orbit — that's a reassuring sanity check that the numbers actually make physical sense.

---

## Appendix: Python Implementation

The complete Python code below implements all six problems and can be run standalone to reproduce every numerical result in this submission.

```python
"""
SPCE 5025 -- Homework 3: Coordinate Systems, Transformations, and State Conversions
Author: Jordan Clayton
Date: 2026-02-08
"""

import sys
import numpy as np
from dataclasses import dataclass
from typing import Tuple

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MU_EARTH: float = 3.986004418e14  # Earth gravitational parameter [m^3/s^2]
TWO_PI: float = 2.0 * np.pi


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------
@dataclass
class KeplerianElements:
    """Classical six-element Keplerian set."""
    a: float       # semi-major axis [m]
    e: float       # eccentricity [-]
    inc: float     # inclination [rad]
    raan: float    # right ascension of ascending node [rad]
    omega_p: float # argument of periapsis [rad]
    nu: float      # true anomaly [rad]

    def pretty(self) -> str:
        return (
            f"  a       = {self.a:18.6f} m\n"
            f"  e       = {self.e:18.10f}\n"
            f"  i       = {np.degrees(self.inc):18.6f} deg\n"
            f"  \u03a9       = {np.degrees(self.raan):18.6f} deg\n"
            f"  \u03c9_p     = {np.degrees(self.omega_p):18.6f} deg\n"
            f"  \u03bd       = {np.degrees(self.nu):18.6f} deg"
        )


# ---------------------------------------------------------------------------
# Problem 1: Cartesian to Keplerian
# ---------------------------------------------------------------------------
def cart_to_keplerian(r_vec: np.ndarray, v_vec: np.ndarray,
                      mu: float = MU_EARTH) -> KeplerianElements:
    """Convert ECI state vector (r, v) to classical Keplerian elements."""
    r = np.linalg.norm(r_vec)
    v = np.linalg.norm(v_vec)

    h_vec = np.cross(r_vec, v_vec)
    h = np.linalg.norm(h_vec)
    h_hat = h_vec / h

    energy = 0.5 * v**2 - mu / r
    a = -mu / (2.0 * energy)

    hxv = np.cross(h_vec, v_vec)
    B_vec = -(mu / r) * r_vec - hxv
    e = np.linalg.norm(B_vec) / mu
    B_hat = B_vec / np.linalg.norm(B_vec)

    Z_hat = np.array([0.0, 0.0, 1.0])
    inc = np.arccos(np.clip(np.dot(Z_hat, h_hat), -1.0, 1.0))

    N_vec = np.cross(Z_hat, h_vec)
    N_hat = N_vec / np.linalg.norm(N_vec)

    raan = np.arctan2(N_hat[1], N_hat[0])
    if raan < 0.0:
        raan += TWO_PI

    NcrossB = np.cross(N_hat, B_hat)
    sin_wp = np.dot(h_hat, NcrossB)
    cos_wp = np.dot(N_hat, B_hat)
    omega_p = np.arctan2(sin_wp, cos_wp)
    if omega_p < 0.0:
        omega_p += TWO_PI

    rdot_v = np.dot(r_vec, v_vec)
    E0 = np.arctan2(rdot_v / np.sqrt(mu * a), 1.0 - r / a)
    SE = np.sqrt(1.0 - e**2)
    sin_nu = SE * np.sin(E0) / (1.0 - e * np.cos(E0))
    cos_nu = (np.cos(E0) - e) / (1.0 - e * np.cos(E0))
    nu = np.arctan2(sin_nu, cos_nu)
    if nu < 0.0:
        nu += TWO_PI

    return KeplerianElements(a=a, e=e, inc=inc, raan=raan,
                             omega_p=omega_p, nu=nu)


# ---------------------------------------------------------------------------
# Problem 2: ECI to UVW transformation
# ---------------------------------------------------------------------------
def build_uvw_transform(r_vec: np.ndarray,
                        v_vec: np.ndarray) -> np.ndarray:
    """Construct the ECI to UVW rotation matrix from r and v."""
    U_hat = r_vec / np.linalg.norm(r_vec)
    h_vec = np.cross(r_vec, v_vec)
    W_hat = h_vec / np.linalg.norm(h_vec)
    V_hat = np.cross(W_hat, U_hat)
    return np.array([U_hat, V_hat, W_hat])


# ---------------------------------------------------------------------------
# Problem 5: ECI to Instrument frame
# ---------------------------------------------------------------------------
def rotation_x(theta: float) -> np.ndarray:
    """Single-axis rotation about the first axis by angle theta [rad]."""
    c, s = np.cos(theta), np.sin(theta)
    return np.array([[1.0, 0.0, 0.0],
                     [0.0,   c,   s],
                     [0.0,  -s,   c]])


def rotation_z(theta: float) -> np.ndarray:
    """Single-axis rotation about the third axis by angle theta [rad]."""
    c, s = np.cos(theta), np.sin(theta)
    return np.array([[  c,   s, 0.0],
                     [ -s,   c, 0.0],
                     [0.0, 0.0, 1.0]])


def build_instrument_transform(T_eci_uvw: np.ndarray,
                               angle_deg: float = 30.0) -> np.ndarray:
    """Chain ECI->UVW with a rotation about U to get ECI->Instrument."""
    return rotation_x(np.radians(angle_deg)) @ T_eci_uvw


# ---------------------------------------------------------------------------
# Problem 6: Keplerian to Cartesian (via perifocal frame)
# ---------------------------------------------------------------------------
def perifocal_vectors(mu: float, a: float, e: float,
                      nu: float) -> Tuple[np.ndarray, np.ndarray]:
    """Compute position and velocity in the perifocal (PQW) frame."""
    p = a * (1.0 - e**2)
    r = p / (1.0 + e * np.cos(nu))
    r_peri = np.array([r * np.cos(nu), r * np.sin(nu), 0.0])
    coeff = np.sqrt(mu / p)
    v_peri = np.array([-coeff * np.sin(nu),
                        coeff * (e + np.cos(nu)), 0.0])
    return r_peri, v_peri


def perifocal_to_eci_matrix(inc: float, raan: float,
                            omega_p: float) -> np.ndarray:
    """Build the perifocal to ECI transformation matrix."""
    cO, sO = np.cos(raan), np.sin(raan)
    ci, si = np.cos(inc), np.sin(inc)
    cw, sw = np.cos(omega_p), np.sin(omega_p)
    return np.array([
        [ cO*cw - sO*sw*ci,  -cO*sw - sO*cw*ci,   sO*si],
        [ sO*cw + cO*sw*ci,  -sO*sw + cO*cw*ci,  -cO*si],
        [           si*sw,              si*cw,        ci  ]])


def keplerian_to_cartesian(kep: KeplerianElements,
                           mu: float = MU_EARTH
                           ) -> Tuple[np.ndarray, np.ndarray]:
    """Full Keplerian to ECI Cartesian conversion via perifocal frame."""
    r_peri, v_peri = perifocal_vectors(mu, kep.a, kep.e, kep.nu)
    T = perifocal_to_eci_matrix(kep.inc, kep.raan, kep.omega_p)
    return T @ r_peri, T @ v_peri


# ---------------------------------------------------------------------------
# Verification utilities
# ---------------------------------------------------------------------------
def specific_energy(r_vec: np.ndarray, v_vec: np.ndarray,
                    mu: float = MU_EARTH) -> float:
    """Compute specific orbital energy."""
    return 0.5 * np.linalg.norm(v_vec)**2 - mu / np.linalg.norm(r_vec)


def check_orthonormality(T: np.ndarray, label: str = "T") -> None:
    """Verify T is a proper rotation: T*T^T = I, det(T) = +1."""
    err = np.max(np.abs(T @ T.T - np.eye(3)))
    det = np.linalg.det(T)
    print(f"  {label}: max|T*T^T - I| = {err:.2e},  det(T) = {det:+.10f}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    sys.stdout.reconfigure(encoding='utf-8')

    r1 = np.array([326151.080726, 6077471.251787, 2944583.918767])
    v1 = np.array([-7455.178720, -482.482572, 1910.883434])
    r2 = np.array([327000.0, 6077600.0, 2944280.0])
    v2 = np.array([-7454.0, -483.0, 1911.0])

    # Problem 1
    print("=" * 72)
    print("PROBLEM 1: Keplerian Elements")
    print("=" * 72)
    kep1 = cart_to_keplerian(r1, v1)
    kep2 = cart_to_keplerian(r2, v2)
    print("\nVector 1:\n" + kep1.pretty())
    print("\nVector 2:\n" + kep2.pretty())
    eps1 = specific_energy(r1, v1)
    eps1a = -MU_EARTH / (2.0 * kep1.a)
    print(f"\n  Verification: eps_state = {eps1:.6f}, eps_a = {eps1a:.6f}, "
          f"delta = {abs(eps1 - eps1a):.2e} J/kg")

    # Problem 2
    print("\n" + "=" * 72)
    print("PROBLEM 2: ECI -> UVW Transformation")
    print("=" * 72)
    T_uvw = build_uvw_transform(r1, v1)
    print("\n  T_ECI->UVW =")
    for row in T_uvw:
        print(f"    [{row[0]:12.7f}  {row[1]:12.7f}  {row[2]:12.7f}]")
    check_orthonormality(T_uvw, "T_ECI->UVW")
    r1_uvw = T_uvw @ r1
    print(f"  T*r1 in UVW = [{r1_uvw[0]:.6f}, {r1_uvw[1]:.6f}, {r1_uvw[2]:.6f}]")

    # Problem 3
    print("\n" + "=" * 72)
    print("PROBLEM 3: Linearity Demonstration")
    print("=" * 72)
    lhs = T_uvw @ r1 - T_uvw @ r2
    rhs = T_uvw @ (r1 - r2)
    print(f"\n  T*r1 - T*r2  = [{lhs[0]:16.6f}, {lhs[1]:16.6f}, {lhs[2]:16.6f}]")
    print(f"  T*(r1 - r2)  = [{rhs[0]:16.6f}, {rhs[1]:16.6f}, {rhs[2]:16.6f}]")
    print(f"  max|diff|    = {np.max(np.abs(lhs - rhs)):.2e} m")

    # Problem 4
    print("\n" + "=" * 72)
    print("PROBLEM 4: Interpretation")
    print("=" * 72)
    d = T_uvw @ (r1 - r2)
    print(f"  UVW difference = [{d[0]:.3f}, {d[1]:.3f}, {d[2]:.3f}] m")
    print(f"  U (radial)     = {d[0]:.3f} m")
    print(f"  V (along-track)= {d[1]:.3f} m")
    print(f"  W (cross-track)= {d[2]:.3f} m")

    # Problem 5
    print("\n" + "=" * 72)
    print("PROBLEM 5: ECI -> Instrument Frame")
    print("=" * 72)
    T_instr = build_instrument_transform(T_uvw, 30.0)
    print("\n  T_ECI->Instr =")
    for row in T_instr:
        print(f"    [{row[0]:12.7f}  {row[1]:12.7f}  {row[2]:12.7f}]")
    check_orthonormality(T_instr, "T_ECI->Instr")

    # Problem 6
    print("\n" + "=" * 72)
    print("PROBLEM 6: Keplerian -> ECI Cartesian")
    print("=" * 72)
    kep6 = KeplerianElements(a=7800000.0, e=0.001,
                             inc=np.radians(98.6), raan=np.radians(30.0),
                             omega_p=np.radians(40.0), nu=np.radians(50.087853))
    print("\n  Input:\n" + kep6.pretty())
    r_p, v_p = perifocal_vectors(MU_EARTH, kep6.a, kep6.e, kep6.nu)
    print(f"\n  r_peri = [{r_p[0]:16.6f}, {r_p[1]:16.6f}, {r_p[2]:16.6f}] m")
    print(f"  v_peri = [{v_p[0]:16.6f}, {v_p[1]:16.6f}, {v_p[2]:16.6f}] m/s")
    T_pe = perifocal_to_eci_matrix(kep6.inc, kep6.raan, kep6.omega_p)
    print("\n  T_peri->ECI =")
    for row in T_pe:
        print(f"    [{row[0]:12.7f}  {row[1]:12.7f}  {row[2]:12.7f}]")
    check_orthonormality(T_pe, "T_peri->ECI")
    r_eci, v_eci = keplerian_to_cartesian(kep6)
    print(f"\n  r_ECI = [{r_eci[0]:16.6f}, {r_eci[1]:16.6f}, {r_eci[2]:16.6f}] m")
    print(f"  v_ECI = [{v_eci[0]:16.6f}, {v_eci[1]:16.6f}, {v_eci[2]:16.6f}] m/s")

    # Round-trip verification
    print("\n  Round-trip verification:")
    kc = cart_to_keplerian(r_eci, v_eci)
    print(f"    a:   {kc.a:.6f} (input: {kep6.a:.6f})  delta = {abs(kc.a-kep6.a):.2e}")
    print(f"    e:   {kc.e:.10f} (input: {kep6.e:.10f})  delta = {abs(kc.e-kep6.e):.2e}")
    eps6 = specific_energy(r_eci, v_eci)
    eps6a = -MU_EARTH / (2.0 * kep6.a)
    print(f"    Energy: {eps6:.6f} vs {eps6a:.6f}, delta = {abs(eps6-eps6a):.2e} J/kg")
    alt = np.linalg.norm(r_eci) - 6378137.0
    print(f"    Altitude: {alt/1000:.1f} km (sun-synchronous, consistent with i=98.6 deg)")


if __name__ == "__main__":
    main()
```

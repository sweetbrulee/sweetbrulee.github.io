---
title: 'Photorealistic Rendering'
---

### Local Illumination

### Illumination Model

---

> ambient light

- $I'=K\cdot I$

### Diffusion Model (Lambert)

---

- $I'=K\cdot I\cdot cos\alpha$

### Specular Model (Phong)

---

- $I'=K\cdot I\cdot cos^n\theta$
- $\theta:$ reflect-direction ↔ view-direction

**Blinn-Phong:**

- $I'=K\cdot I\cdot cos^n\gamma$
- $\gamma:$ halfway-direction ↔ normal-direction

### Global Model (Whitted)

---

> local illumination +
>
> environment specular light +
>
> environment transmission light

- Ray casting Algorithm
- Ray tracing Algorithm
  - Ray tree (recursive)

### Shading

---

> Here comes normal, here comes the **same-level** color.

- Flat Shading (per face)
  > polygon color + polygon normal
  - polygon color
    - **calculate polygon color with local illumination** using single polygon normal
- Smooth[Gouraud] Shading (per vertex)
  > fragment color + vertex normal
  - vertex color
    - **calculate vertex color with local illumination** using vertex normal
    - **\*interpolate vertices colors** which calculated by local illumination, and give to fragment color\*
- Phong Shading (per fragment)
  > fragment color + fragment normal
  - vertex normal
    - **\*interpolate vertices normals**, and give to\* fragment normal
  - fragment color
    - **calculate fragment color with local illumination** using fragment normal

### Texture Mapping

---

- Texture Space $[0,1]^2$
  - Geometric texture
    - Bump Mapping
    - Normal Mapping
    - Displacement Mapping
  - Color texture
    - used as color label
    - used as **coefficient** in light model
- Anti-aliasing
  - Reason: **undersampling**
  - Solution
    - Prefilter
    - Supersampling
    - Mipmap

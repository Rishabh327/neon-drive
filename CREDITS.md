# Credits

## 3D model

**2024 Koenigsegg Jesko Attack #7378** by **HYPR:IMPS 3D**
<https://sketchfab.com/3d-models/2024-koenigsegg-jesko-attack-7378-e4e966bcfdf14a8dbc6c837764cb026b>
Licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).

> This work is based on "2024 Koenigsegg Jesko Attack #7378"
> (https://sketchfab.com/3d-models/2024-koenigsegg-jesko-attack-7378-e4e966bcfdf14a8dbc6c837764cb026b)
> by HYPR:IMPS 3D (https://sketchfab.com/HYPRIMPS3D) licensed under CC-BY-4.0
> (http://creativecommons.org/licenses/by/4.0/)

Changes made for this site: geometry simplified (~515k → ~140k triangles), meshes merged and
meshopt-compressed, textures resized and converted to WebP (`scripts/process-car.mjs`); at
runtime the materials are restyled (paint, rims, glass, lights), small detail meshes are dropped,
centre-line emblems and the rear plate are hidden, and neon headlight blades are added.
Koenigsegg and Jesko are trademarks of their owner; this site is not affiliated with or endorsed
by Koenigsegg.

## Sound

All sound (rain, drone, engine, regen, UI) is synthesized live with the Web Audio API
(`src/audio/engine.ts`) — no audio files are used.

## Fonts

[Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch),
[Inter](https://fonts.google.com/specimen/Inter) and
[JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) via Google Fonts — SIL Open Font License 1.1.

## Code & libraries

[three.js](https://threejs.org) (MIT), [React Three Fiber](https://github.com/pmndrs/react-three-fiber) (MIT),
[Lenis](https://github.com/darkroomengineering/lenis) (MIT), [Zustand](https://github.com/pmndrs/zustand) (MIT),
[React](https://react.dev) (MIT), [Tailwind CSS](https://tailwindcss.com) (MIT), [Vite](https://vitejs.dev) (MIT),
[glTF Transform](https://gltf-transform.dev) (MIT) and [meshoptimizer](https://github.com/zeux/meshoptimizer) (MIT) for the build-time model pipeline.

## Data

Project and repository data is fetched at build time from the public GitHub API for
[Rishabh327](https://github.com/Rishabh327).

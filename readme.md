# Summer's Personal Space Portfolio

An interactive Three.js portfolio built as a cinematic star map. The site uses a dark space scene, scroll-driven camera movement, constellation-style research nodes, planets, satellites, project sections, and data-driven portfolio content.

## About

This project began as a technical refactor of the open-source [Solar-System-3D](https://github.com/N3rson/Solar-System-3D) repo by Karol Fryc. I used that repo as the starting point for the Vite, Three.js, camera, renderer, texture, and animation setup, then redesigned the experience into a personal portfolio site instead of a traditional solar system simulator.

The current site is focused on:

- spatial computing research
- quantum machine learning research
- research artifacts, posters, notebooks, and logs
- cinematic 3D navigation
- editable JSON-driven content

## Tech Stack

- Three.js
- Vite
- JavaScript
- HTML/CSS
- JSON content data

## Local Development

Install dependencies:

```sh
npm install
```

Run locally:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

## Content

Most personal content lives in:

```text
src/data/siteData.json
```

Images, PDFs, notebooks, and other assets are stored in:

```text
images/
notebooks/
static/
```

## Attribution

Original technical base:

- [N3rson/Solar-System-3D](https://github.com/N3rson/Solar-System-3D)

Additional space and planet assets are credited in the original project and include public/free resources such as NASA 3D Resources, Solar System Scope textures, Planet Pixel Emporium, and TurboSquid.

## License

This project keeps the original MIT license from the starter repository.

# Third-party notices and artwork

The [MIT license](LICENSE) applies to this project's application code, tests,
scripts, and documentation, except where an existing third-party notice says
otherwise. It does not relicense third-party asset packages or artwork.

## Libraries

- [Three.js](https://github.com/mrdoob/three.js): MIT.
- [Lucide](https://github.com/lucide-icons/lucide): ISC.
- [Vite](https://github.com/vitejs/vite): MIT.
- [Playwright](https://github.com/microsoft/playwright): Apache-2.0; development tools only.

Their upstream licenses remain applicable. The package lock records the versions.

## Kimi asset packages

- `public/assets/pavilion/`: Kimi design asset `01-L2-0021`, double-eave pavilion.
- `public/assets/lantern/`: Kimi design asset `02-G6-0018`, hanging lantern.

These packages were included in the original Kimi project export supplied by the
project owner. Their original README, receipts, orientation metadata, and
`THREE-LICENSE.txt` files are retained. The asset loaders have been adapted to
handle both HTTP-decoded and raw gzip responses.

The supplied export did not include a separate license granting reuse of the
models or textures. The Three.js license notice concerns Three.js code and does
not establish a license for the model or texture data. This repository's MIT
license therefore does not grant an additional license to those asset packages.

## Artwork and branding

`public/poster.png`, `public/favicon.png`, and the screenshot in `docs/preview.jpg`
are presentation artwork from or based on the project owner's lantern scene.
They are not covered by the code's MIT license. Nookvale Puzzles, HIKOO, and the
linked app listings retain their respective branding rights.

See [CREDITS.md](CREDITS.md) for the scene's provenance. No music or environmental
sound recordings are included in this repository or played by the webpage.

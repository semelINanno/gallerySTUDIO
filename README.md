# Gallery Studio

Gallery Studio is a framework-free extraction of the experimental bidirectional free-mosaic renderer developed for Govin CMS.

This repository is a standalone demonstration. It does not require Govin CMS, PHP, a database, Python, a package manager or a build step.

## Live demo on GitHub Pages

1. Upload the contents of this directory to the root of a GitHub repository.
2. Open **Settings → Pages** in that repository.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose the `main` branch and the `/ (root)` folder, then save.

GitHub will publish `index.html` as a static page. The included `.nojekyll` file prevents unnecessary Jekyll processing.

## Run locally

You can open `index.html` directly in a current browser. A local HTTP server is preferable when testing browser security policies:

```sh
php -S 127.0.0.1:8080
```

Then open `http://127.0.0.1:8080/`.

## Repository structure

- `index.html`: the demonstration and its controls;
- `styles.css`: the complete visual presentation;
- `src/free-mosaic-geometry.js`: deterministic numerical planning and validation;
- `src/gallery-studio.js`: the DOM adapter and lightbox;
- `src/demo-data.js`: locally generated SVG illustrations used when the page starts;
- `src/demo-app.js`: controls, folder loading and demo orchestration;
- `tests/free-mosaic-adaptive.test.js`: geometry regression tests;
- `images/`: a convenient place for your own local test images;
- `ROADMAP.md`: planned ideas, including the future `CUSTOMgallery` editor.

## Terminology

- **Image**: the original source file, at its native aspect ratio and resolution.
- **Tile**: the proportional representation of an image displayed in the gallery.
- **Cell**: the residual calculation area associated with a tile after placement. Cells describe available geometric space and may overlap.
- **Box**: the exclusive alignment area obtained by resolving conflicts between cells. A tile is centred inside its box during the final balancing pass.
- **Gap**: the minimum safety margin that must remain between tiles.

## What the controls do

### Target density

Target density is an approximate visual-density target, not a fixed column count. Increasing it reduces the nominal tile size and generally allows more, smaller images to appear within the same area. The planner may still vary the final dimensions to obtain a valid bidirectional composition.

### Gap

Gap is the required clear distance, in pixels, between neighbouring tiles. It is included in placement calculations and checked again by the geometry validator. It is never meant to be filled by another image or interpreted as an overlap allowance.

### Candidate window

Candidate window is the number of upcoming images that the planner may inspect before committing the next placement. A larger window gives the engine more alternatives for filling a two-dimensional cavity, but increases computation time. A smaller window is faster and follows source order more strictly.

For galleries containing 40 images or more, adaptive search treats the selected value as an upper bound and caps the effective candidate window at `6`. The interactive output displays both values when the cap applies, for example `8 → 6`. This preserves the same scoring model without allowing the search space to grow combinatorially.

### Search-size presets

The demo exposes three tabs that set a practical search budget from the number of loaded images. **Small** applies candidate window `8` and beam width `36` below 40 images; **Medium** applies `6` and `20` from 40 through 79 images; **Large** applies `4` and `12` from 80 images onward. Folder loading selects the matching tab automatically, while the two sliders remain available for manual tuning. Manual Window and Beam changes are retained separately for each tab during the current page session; reloading the page restores the defaults.

### Beam width

Beam width is the number of alternative partial compositions retained after each planning step. A wider beam explores more placement histories and uses more CPU; a narrower beam commits earlier. Its default is `36`. From 40 images onward, adaptive search caps the effective value at `20` and the interactive output reports values such as `36 → 20`.

The live metrics split the measured work into search, terminal compaction, balancing, validation and DOM application. This makes browser pauses and data-dependent search costs visible without repeating the complete plan several times.

### Useful spaces

Useful spaces is an optional negative-space constraint separate from Harmonic spaces. It asks the search to preserve meaningful clearance on at least two sides whenever the geometry permits it. With this option enabled, ordinary terminal compaction is skipped so that the final stage does not immediately consume the breathing room found by the search.

After placement is frozen, the engine derives a **cell** for every tile from neighbouring tiles and the gallery edges. Cells may overlap because each one describes the residual space seen from its own tile. Their conflicts are then resolved into non-overlapping **boxes**. A final pass centres each tile inside its box without changing its size or aspect ratio and accepts the result only when the configured gap and geometry validation still pass. The live metric reports how many tiles satisfy the final two-side audit and whether any internal separators were required.

### Diagnostic overlays

The **Diagnostic** controls only affect the visual inspection layer; they do not rerun or alter the planner.

- **Cell** draws the potentially overlapping calculation cells with dashed coloured lines.
- **Box** draws the exclusive final alignment boxes with lighter continuous lines.

Matching numeric labels identify the cell and box associated with the same tile.

### Maximum tile width

Maximum tile width limits one tile to a percentage of the gallery container. This is the direct control for collections containing many panoramic images. A value below 50% normally prevents one landscape tile from occupying an entire row, leaving room for another tile and the configured gap. It remains a geometric limit, not a promise of a fixed number of columns.

### Minimum tile scale

Minimum tile scale determines how far the planner may reduce a tile below its nominal size when filling a cavity. Lower values give the engine more freedom to combine difficult aspect ratios; higher values keep images visually larger but may increase unused space.

### Compositional style

Compositional style is independent from target density. Its range runs from **Artistic · airy** to **Compact** and controls how strongly the planner closes local cavities, rescales the terminal tiles and reduces unused space. The artistic end gives greater weight to nominal image scale and breathing room; the compact end gives greater weight to continuous filling. Intermediate values blend the two scoring strategies.

### High reverse factor

High reverse factor prevents a locally homogeneous source sequence from turning into a long run of only portrait or only landscape tiles. When such a run develops, the planner may inspect a small number of opposite-orientation images beyond the ordinary candidate window. It does not globally shuffle the collection: the wider search is activated only as an escape route from repetitive geometry.

### Harmonic spaces

Harmonic spaces makes intentional empty space part of the score instead of treating every void as an error. At the **Artistic · airy** endpoint, it:

- preserves a controlled amount of breathing room;
- discourages consecutive tiles with nearly identical widths or column starts;
- varies candidate scales and alignments deterministically;
- creates irregular but ordered row and column frontiers;
- avoids the repeated horizontal or vertical bands that can emerge from an unbalanced image set.

The effect fades progressively toward **Compact**, where continuous filling remains the priority. Harmonic spaces and High reverse factor are enabled by default in the interactive proof and can be disabled independently for comparison.

### Planning flow

The renderer:

1. reads every image aspect ratio before assigning folder image sources;
2. measures the gallery and derives nominal scales and the adaptive search budget;
3. evaluates each candidate window on both axes and scores valid placements while preserving the configured gap;
4. freezes the selected tile geometry;
5. derives potentially overlapping calculation cells from neighbouring tiles and gallery edges;
6. resolves cell conflicts into exclusive boxes, then centres each tile once inside its box;
7. validates the final geometry and applies it to the DOM;
8. for folder-loaded images, attaches the image sources on the following animation frame.

Tiles scale without distorting their source images' width-to-height ratios. The sentence is intentionally about the **ratio**, rather than preserving each source image's original pixel dimensions.

## Load all images from a folder

The download kit already contains the folder loader; you do not need to write a manifest or edit JavaScript.

1. Put all the images you want to test in one folder. You may use the included `images` directory.
2. Open `index.html` or the GitHub Pages demo.
3. Press **Load image folder**.
4. Select the folder containing the images.

The browser filters supported image files, keeps them in alphabetical filename order, measures their real width-to-height ratios and rebuilds the mosaic automatically. **Rotate order** lets you test a different starting sequence.

For security reasons, a static web page cannot silently enumerate a local folder. The visitor must select it explicitly. Files stay on the device and are displayed through temporary browser URLs; they are not uploaded to GitHub or another server. Chromium-based browsers currently provide the most complete folder-selection support.

The folder demo measures image ratios first, computes and applies the complete geometry without assigning image `src` attributes, then attaches the sources on the following animation frame. At that point every tile already has its final position, allowing native lazy loading and asynchronous decoding to operate against the real viewport instead of treating all absolute elements as initially visible.

## Minimal integration

Load the numerical engine before the DOM adapter:

```html
<link rel="stylesheet" href="styles.css">
<script src="src/free-mosaic-geometry.js"></script>
<script src="src/gallery-studio.js"></script>
```

Provide one direct child per image and declare its aspect ratio:

```html
<div class="gallery-studio" data-gallery-studio>
  <figure class="gallery-studio__item" data-aspect="1.5" data-preference="auto">
    <button class="gallery-studio__open" type="button">
      <img src="photo.jpg" alt="Description" width="1200" height="800">
      <figcaption>Optional caption</figcaption>
    </button>
  </figure>
</div>
```

Mount the adapter:

```js
const gallery = GalleryStudio.mount('[data-gallery-studio]', {
  density: 3,
  gap: 12,
  candidateWindow: 8,
  beamWidth: 36,
  maxItemWidthRatio: 0.40,
  minItemScaleRatio: 0.55,
  compactionPressure: 0.06,
  highReverseFactor: true,
  harmonicSpaces: true,
  usefulSpaces: true,
  adaptiveSearch: true
});
```

## Main options

| Option | Default | Purpose |
| --- | ---: | --- |
| `density` | `3` | Approximate visual density used to derive nominal tile size. |
| `gap` | `12` | Required distance between every pair of tiles, in pixels. |
| `candidateWindow` | `8` | Upcoming images considered at each step; adaptively capped at `6` from 40 images. |
| `beamWidth` | `36` | Partial plans kept after each step; adaptively capped at `20` from 40 images. |
| `maxItemWidthRatio` | `0.40` | Soft maximum width of an ordinary tile relative to the container. |
| `minItemScaleRatio` | `0.55` | Minimum scale relative to the nominal tile width. |
| `compactionPressure` | `0.06` | Blend from artistic breathing room (`0`) to compact filling (`1`). |
| `highReverseFactor` | `true` | Selectively looks beyond the candidate window to interrupt repeated orientations. |
| `harmonicSpaces` | `true` | Scores deliberate whitespace and geometric alternation as part of the composition. |
| `usefulSpaces` | `true` | Preserves meaningful clearance, derives overlapping cells, resolves them into exclusive boxes and performs final tile centring. |
| `adaptiveSearch` | `true` | Applies a bounded search profile to galleries with at least 40 images. Set to `false` only for exhaustive comparisons. |
| `tailCount` | `6` | Number of final tiles reopened for terminal compaction. |
| `tailScaleTolerance` | `0.2` | Permitted scale variation during terminal compaction. |
| `cavityExpansionRatio` | `1` | Permitted proportional expansion into a real cavity. |
| `balanceMinimum` | `4` | Minimum residual space before centring is attempted. |
| `balanceMaximum` | `1` | Maximum centring movement relative to tile size. |

An item may declare `data-preference="horizontal"`, `vertical` or `auto`. Preferences are soft constraints: the planner may override them when necessary to preserve a valid, compact composition.

## Geometry API

The standalone engine is available in browsers as `GovinFreeMosaicGeometry` and through CommonJS:

```js
const geometry = require('./src/free-mosaic-geometry.js');
const layout = geometry.placeAdaptive(items, options);
const result = geometry.validateLayout(layout, options.gap);
```

Main exports:

- `placeAdaptive`
- `placeRectangles`
- `compactCavities`
- `balanceVertical`
- `balanceHorizontal`
- `validateLayout`

## Test

If Node.js is available, run:

```sh
node tests/free-mosaic-adaptive.test.js
node tests/free-mosaic-performance.test.js
```

The performance regression uses 51 mixed portrait and landscape ratios, requires valid geometry, keeps the airy void ratio within a controlled band and fails if planning exceeds one second. Node.js is needed only for these optional regression tests, not to display or use the demo.

## Project status

This is an experimental release intended for inspection, benchmarking and collaboration. The planner remains deterministic and geometry-first, while adaptive search bounds the expensive harmonic exploration on large galleries. The current finalisation stage separates placement from alignment: it resolves overlapping residual cells into exclusive boxes before centring the tiles and validating the result. Large galleries should still use thumbnails to reduce image decoding and transfer costs, which are separate from the reported planning time.

## License

This project is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

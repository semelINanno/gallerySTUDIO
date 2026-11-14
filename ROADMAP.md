# Roadmap

This file documents ideas under evaluation. It does not describe features already available in the current demo.

## CUSTOMgallery

`CUSTOMgallery` is a proposed manual alternative to the automatic free-mosaic planner.

The editor would start from an empty canvas and let a user:

- add images from a library;
- drag each image to a chosen position;
- resize its visual frame;
- choose crop, focal point and framing behaviour;
- change stacking order where applicable;
- remove or replace a tile without rebuilding the whole composition;
- save the result and reproduce it deterministically.

### Responsive layouts

A single absolute layout would not work reliably across every screen size. The proposed model therefore stores one or more layouts associated with predefined viewport ranges, for example:

- mobile portrait;
- mobile landscape and small tablets;
- tablets and small desktop windows;
- ordinary desktop screens;
- wide screens.

The exact breakpoints should remain configurable. For each range, the editor may:

1. inherit and proportionally adapt the nearest layout;
2. allow the user to create an explicit override;
3. fall back to an automatic accessible layout if an override becomes invalid.

### Persistence format

The saved representation should be portable and versioned. A future JSON format may record:

- image identifier and alternative text;
- normalized `x`, `y`, width and height values;
- crop and focal-point data;
- responsive range and inheritance source;
- tile order and optional caption treatment;
- editor format version.

Normalized coordinates are preferable to raw pixels for portability, while optional minimum and maximum pixel constraints can protect readability.

### Editing and accessibility requirements

Drag and drop must not be the only editing method. Keyboard controls, numeric fields and clear focus states should provide equivalent access. The editor should warn about overlaps, inaccessible text contrast, missing alternative text and layouts that become unusable at a selected viewport size.

### Relationship with the automatic renderer

`CUSTOMgallery` should be a separate presentation mode:

- **automatic mosaic**: the engine plans placement from image ratios and tunable hyperparameters;
- **CUSTOMgallery**: the user owns the composition and the system reproduces it faithfully within the selected responsive range.

The automatic renderer may be used to create an initial draft for manual refinement, but must not silently rewrite a saved manual layout.

## Performance work

Further work planned for large collections includes:

- thumbnail generation and responsive image sources;
- optional layout precomputation;
- progressive batch rendering;
- caching by container width and image order;
- broader regression galleries with strongly varied image proportions.

## Visual rhythm versus over-compaction

The `flora/20260408` test exposed an important requirement that is not captured by void percentage alone. With the same settings (`density 3`, `gap 12 px`, `candidate window 8`, `maximum tile width 43%`, `minimum tile scale 55%`), an intermediate area became very dense while the closing rows produced the more desirable, breathable composition.

Future planning work must therefore treat **visual rhythm** as an explicit objective alongside cavity reduction:

- avoid sudden local transitions from spacious bands to tightly packed grids;
- preserve intentional negative space when it gives the composition a clearer hierarchy;
- prevent intermediate compaction from being more aggressive than the accepted terminal treatment;
- evaluate density over successive bands or neighbourhoods, not only across the complete gallery;
- distinguish the normal-flow compactor from the terminal compactor while keeping their visual language coherent;
- add regression fixtures based on `flora/20260408` so equal hyperparameters can be compared across the beginning, middle and end of one gallery.

The standalone demo now exposes this preference as **Compositional style**, a continuous range from **Artistic · airy** to **Compact**. It does not duplicate `target density`: density controls nominal tile planning, whereas compositional style regulates the strength of cavity filling, terminal refinement and scale preservation.

Further alpha/RC evaluation must still use broader regression galleries to tune the interpolation and make sure the artistic endpoint remains coherent across the beginning, middle and end of long collections.

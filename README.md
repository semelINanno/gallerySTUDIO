# gallerySTUDIO
using AI at creating algoritms to manage a website gallery



While working on a CMS photo gallery found that most common layouts did not fully address the problem I was facing:

1. Regular grids are predictable and efficient but they usually force images into fixed shapes, cropping them or altering their visual ratio.
2. Horizontal masonry preserves aspect ratios, but primarily optimizes placement along just one axis - vertical masonry is obviously just doing the same in the opposite direction.

For most business scenarios, a regular grid is perfectly adequate. Real estate listings, e-commerce catalogs and travel websites all benefit from consistency and predictability.
However dealing with photographies and artistics contents, different set of options should be considered. Firs of all, realize a layout to preserves every image's original proportions avoiding repetitive visual composition to enhance single pictures value.
The challenge was finding a deterministic way to pack images efficiently on both axes at same time.

That's the purpose of Gallery Studio (GS): an experimental AI two-dimensional image packing renderer extracted from my own CMS gallery engine and released as a standalone project.



Its interactive demo lets you:
- load a local collection of images;
- adjust density, spacing and search parameters;
- compare presets for collections of different sizes;
- inspect cells, alignment boxes and planning diagnostics;
- preserve the original aspect ratio of every image.
The renderer has no runtime dependencies and has to be intended as a standalone project. It is released under the Apache License 2.0 and can be used, modified and integrated into other projects under the terms of that license.

A personal note: I published my first CMS-driven website around twenty years ago, at time was graduating, and I have continued working with HTML and related technologies through professional work and side projects. About a year ago I started experimenting with AI-assisted development and was genuinely surprised by how much it accelerated certain coding tasks. Problems that may took me months to be managed had been solved in a few weeks.
GS is one of that. Main AI tool used during development was OpenAI Codex to write software functionalities and being supported from free version of Copilot for external communication issues.


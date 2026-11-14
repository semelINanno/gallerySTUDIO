(() => {
    'use strict';

    const grid = document.querySelector('[data-gallery-studio]');
    const images = Array.isArray(globalThis.GALLERY_STUDIO_IMAGES)
        ? globalThis.GALLERY_STUDIO_IMAGES.slice()
        : [];
    const localObjectUrls = new Set();
    if (!(grid instanceof HTMLElement) || !globalThis.GalleryStudio) return;
    const frontierLayer = document.createElement('div');
    frontierLayer.className = 'gallery-studio__space-frontiers';
    frontierLayer.setAttribute('aria-hidden', 'true');

    const renderItems = () => {
        const figures = images.map((entry, index) => {
            const figure = document.createElement('figure');
            figure.className = 'gallery-studio__item';
            figure.dataset.aspect = String(entry.aspect);
            figure.dataset.preference = entry.preference || 'auto';
            const button = document.createElement('button');
            button.className = 'gallery-studio__open';
            button.type = 'button';
            button.dataset.galleryIndex = String(index);
            button.setAttribute('aria-label', `Open ${entry.title}`);
            const image = document.createElement('img');
            // Geometry only needs the declared aspect ratio. Attach image
            // bytes after the first plan, when lazy loading can see the real
            // tile positions instead of every absolute item at the origin.
            image.dataset.src = entry.src;
            image.alt = entry.title;
            image.width = entry.width;
            image.height = entry.height;
            image.loading = 'lazy';
            image.decoding = 'async';
            image.fetchPriority = index < 4 ? 'high' : 'low';
            const caption = document.createElement('figcaption');
            caption.textContent = entry.title;
            button.append(image, caption);
            figure.append(button);
            return figure;
        });
        grid.replaceChildren(...figures, frontierLayer);
    };
    renderItems();

    const gallery = globalThis.GalleryStudio.mount(grid, {
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
        adaptiveSearch: true,
    });
    const controls = {
        density: document.querySelector('#density'),
        gap: document.querySelector('#gap'),
        window: document.querySelector('#window-size'),
        beam: document.querySelector('#beam-width'),
        maxWidth: document.querySelector('#max-width'),
        minScale: document.querySelector('#min-scale'),
        style: document.querySelector('#composition-style'),
        reverse: document.querySelector('#high-reverse-factor'),
        harmonic: document.querySelector('#harmonic-spaces'),
        useful: document.querySelector('#useful-spaces'),
    };
    const outputs = {
        density: document.querySelector('#density-output'),
        gap: document.querySelector('#gap-output'),
        window: document.querySelector('#window-output'),
        beam: document.querySelector('#beam-output'),
        maxWidth: document.querySelector('#max-width-output'),
        minScale: document.querySelector('#min-scale-output'),
        style: document.querySelector('#composition-style-output'),
    };
    const searchPresets = {
        small: { candidateWindow: 8, beamWidth: 36 },
        medium: { candidateWindow: 6, beamWidth: 20 },
        large: { candidateWindow: 4, beamWidth: 12 },
    };
    const presetButtons = Array.from(document.querySelectorAll('[data-search-preset]'));
    const presetStatus = document.querySelector('#preset-status');
    let activePreset = 'small';
    const presetForCount = (count) => (count < 40 ? 'small' : (count < 80 ? 'medium' : 'large'));
    const presetLabel = (name) => name.charAt(0).toUpperCase() + name.slice(1);
    const rememberActivePreset = () => {
        const preset = searchPresets[activePreset];
        if (!preset) return;
        preset.candidateWindow = Number(controls.window.value);
        preset.beamWidth = Number(controls.beam.value);
    };
    const selectPreset = (name, source, schedule = true) => {
        const preset = searchPresets[name];
        if (!preset) return;
        activePreset = name;
        controls.window.value = String(preset.candidateWindow);
        controls.beam.value = String(preset.beamWidth);
        presetButtons.forEach((button) => {
            button.setAttribute('aria-selected', String(button.dataset.searchPreset === name));
        });
        if (presetStatus) presetStatus.textContent = `${source} · ${presetLabel(name)}`;
        if (schedule) update();
    };
    const update = () => {
        const density = Number(controls.density.value);
        const gap = Number(controls.gap.value);
        const candidateWindow = Number(controls.window.value);
        const beamWidth = Number(controls.beam.value);
        const maxItemWidthRatio = Number(controls.maxWidth.value) / 100;
        const minItemScaleRatio = Number(controls.minScale.value) / 100;
        const compactionPressure = Number(controls.style.value) / 100;
        const highReverseFactor = controls.reverse.checked;
        const harmonicSpaces = controls.harmonic.checked;
        const usefulSpaces = controls.useful.checked;
        outputs.density.value = density.toFixed(1);
        outputs.gap.value = `${gap} px`;
        outputs.window.value = String(candidateWindow);
        outputs.beam.value = String(beamWidth);
        outputs.maxWidth.value = `${Math.round(maxItemWidthRatio * 100)}%`;
        outputs.minScale.value = `${Math.round(minItemScaleRatio * 100)}%`;
        const styleLabel = compactionPressure < 0.34
            ? 'Artistic · airy'
            : (compactionPressure > 0.66 ? 'Compact' : 'Balanced');
        outputs.style.value = `${Math.round(compactionPressure * 100)}% · ${styleLabel}`;
        gallery.setOptions({
            density,
            gap,
            candidateWindow,
            beamWidth,
            maxItemWidthRatio,
            minItemScaleRatio,
            compactionPressure,
            highReverseFactor,
            harmonicSpaces,
            usefulSpaces,
        });
    };
    Object.values(controls).forEach((control) => control.addEventListener('input', update));
    const cellBoundaries = document.querySelector('#cell-boundaries');
    const boxBoundaries = document.querySelector('#box-boundaries');
    const updateDiagnosticBoundaries = () => {
        grid.dataset.cellBoundaries = String(Boolean(cellBoundaries?.checked));
        grid.dataset.boxBoundaries = String(Boolean(boxBoundaries?.checked));
    };
    cellBoundaries?.addEventListener('input', updateDiagnosticBoundaries);
    boxBoundaries?.addEventListener('input', updateDiagnosticBoundaries);
    updateDiagnosticBoundaries();
    [controls.window, controls.beam].forEach((control) => control.addEventListener('input', () => {
        rememberActivePreset();
        if (presetStatus) presetStatus.textContent = `${presetLabel(activePreset)} · manually tuned`;
    }));
    presetButtons.forEach((button) => button.addEventListener('click', () => {
        selectPreset(button.dataset.searchPreset, 'Manual');
    }));
    selectPreset(presetForCount(images.length), 'Automatic', false);

    document.querySelector('#shuffle')?.addEventListener('click', () => {
        if (images.length < 2) return;
        images.push(images.shift());
        renderItems();
        gallery.clearCache();
        gallery.schedule();
    });

    const folderInput = document.querySelector('#folder-input');
    document.querySelector('#load-folder')?.addEventListener('click', () => folderInput?.click());

    const releaseLocalImages = () => {
        localObjectUrls.forEach((url) => URL.revokeObjectURL(url));
        localObjectUrls.clear();
    };
    const isImageFile = (file) => file.type.startsWith('image/')
        || /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(file.name);
    const measureFile = (file, index) => new Promise((resolve, reject) => {
        const src = URL.createObjectURL(file);
        const probe = new Image();
        probe.onload = () => resolve({
            id: `local-${index}-${file.name}`,
            src,
            title: file.name.replace(/\.[^.]+$/, ''),
            width: probe.naturalWidth,
            height: probe.naturalHeight,
            aspect: probe.naturalWidth / probe.naturalHeight,
            preference: 'auto',
        });
        probe.onerror = () => {
            URL.revokeObjectURL(src);
            reject(new Error(`Unable to read ${file.name}`));
        };
        probe.src = src;
    });

    folderInput?.addEventListener('change', async () => {
        const files = Array.from(folderInput.files || [])
            .filter(isImageFile)
            .sort((left, right) => (left.webkitRelativePath || left.name)
                .localeCompare(right.webkitRelativePath || right.name, undefined, { numeric: true }));
        if (!files.length) return;

        const results = await Promise.allSettled(files.map(measureFile));
        const loaded = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
        if (!loaded.length) return;
        releaseLocalImages();
        loaded.forEach((entry) => localObjectUrls.add(entry.src));
        images.splice(0, images.length, ...loaded);
        selectPreset(presetForCount(loaded.length), 'Automatic', false);
        renderItems();
        gallery.clearCache();
        update();
        folderInput.value = '';
    });

    let hydrationFrame = 0;
    const hydratePositionedImages = () => {
        cancelAnimationFrame(hydrationFrame);
        hydrationFrame = requestAnimationFrame(() => {
            grid.querySelectorAll('img[data-src]').forEach((image) => {
                image.src = image.dataset.src;
                delete image.dataset.src;
            });
        });
    };
    window.addEventListener('beforeunload', () => {
        cancelAnimationFrame(hydrationFrame);
        releaseLocalImages();
    });

    grid.addEventListener('gallery-studio:layout', (event) => {
        const detail = event.detail;
        const calculationCells = Array.isArray(detail.layout.calculationCells)
            ? detail.layout.calculationCells
            : [];
        const calculationCellNodes = calculationCells.map((cell, index) => {
            const node = document.createElement('span');
            node.className = 'gallery-studio__calculation-cell';
            node.dataset.label = `C${index + 1}`;
            node.style.setProperty('--frontier-hue', String((index * 47) % 360));
            node.style.transform = `translate3d(${cell.x}px, ${cell.y}px, 0)`;
            node.style.width = `${cell.width}px`;
            node.style.height = `${cell.height}px`;
            return node;
        });
        const boxes = Array.isArray(detail.layout.spaceCells) ? detail.layout.spaceCells : [];
        const boxNodes = boxes.map((box, index) => {
            const node = document.createElement('span');
            node.className = 'gallery-studio__space-cell';
            node.dataset.label = `B${index + 1}`;
            node.style.setProperty('--frontier-hue', String((index * 47) % 360));
            node.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
            node.style.width = `${box.width}px`;
            node.style.height = `${box.height}px`;
            return node;
        });
        const anchorNodes = (detail.layout.voidAnchors || []).flatMap((anchor, anchorIndex) => {
            const regions = Array.isArray(anchor.regions) && anchor.regions.length > 0
                ? anchor.regions
                : [anchor];
            return regions.map((region) => {
                const node = document.createElement('span');
                node.className = 'gallery-studio__space-anchor';
                node.dataset.label = `A${anchorIndex + 1}`;
                node.style.transform = `translate3d(${region.x}px, ${region.y}px, 0)`;
                node.style.width = `${region.width}px`;
                node.style.height = `${region.height}px`;
                return node;
            });
        });
        frontierLayer.replaceChildren(...calculationCellNodes, ...boxNodes, ...anchorNodes);
        document.querySelector('#metric-count').textContent = String(detail.layout.placements.length);
        document.querySelector('#metric-void').textContent = `${((detail.layout.metrics?.voidRatio || 0) * 100).toFixed(1)}%`;
        document.querySelector('#metric-time').textContent = detail.cached ? 'cached' : `${detail.duration.toFixed(1)} ms`;
        const usefulMetric = document.querySelector('#metric-useful');
        const useful = detail.layout.metrics?.usefulSpaces;
        if (usefulMetric) {
            usefulMetric.textContent = useful
                ? `${useful.satisfied}/${useful.total} useful · ${useful.anchorCount} anchors`
                : 'Useful spaces off';
        }
        const valid = document.querySelector('#metric-valid');
        valid.textContent = detail.validation.valid ? 'Geometry valid' : 'Geometry rejected';
        valid.dataset.valid = detail.validation.valid ? 'true' : 'false';
        const phase = detail.timings || {};
        const phaseMetric = document.querySelector('#metric-breakdown');
        if (phaseMetric) {
            const format = (value) => Number.isFinite(value) ? `${value.toFixed(1)} ms` : '—';
            phaseMetric.textContent = detail.cached
                ? `Cache hit · validation ${format(phase.validation)} · DOM ${format(phase.dom)} · total ${format(phase.total)}`
                : `Search ${format(phase.search)} · compaction ${format(phase.compaction)} · balance ${format(phase.balancing)} · validation ${format(phase.validation)} · DOM ${format(phase.dom)} · total ${format(phase.total)}`;
        }
        const profile = detail.layout.metrics?.searchProfile;
        if (profile) {
            const selectedWindow = Number(controls.window.value);
            const selectedBeam = Number(controls.beam.value);
            outputs.window.value = profile.adaptive && selectedWindow !== profile.candidateWindow
                ? `${selectedWindow} → ${profile.candidateWindow}`
                : String(profile.candidateWindow);
            outputs.beam.value = profile.adaptive && selectedBeam !== profile.beamWidth
                ? `${selectedBeam} → ${profile.beamWidth}`
                : String(profile.beamWidth);
        }
        hydratePositionedImages();
    });

    const dialog = document.querySelector('[data-lightbox]');
    const lightboxImage = dialog?.querySelector('[data-lightbox-image]');
    const lightboxCaption = dialog?.querySelector('[data-lightbox-caption]');
    const lightboxCounter = dialog?.querySelector('[data-lightbox-counter]');
    let active = 0;
    const show = (index) => {
        active = (index + images.length) % images.length;
        const entry = images[active];
        lightboxImage.src = entry.src;
        lightboxImage.alt = entry.title;
        lightboxCaption.textContent = entry.title;
        lightboxCounter.textContent = `${active + 1} / ${images.length}`;
    };
    const close = () => {
        if (dialog?.open) dialog.close();
        lightboxImage?.removeAttribute('src');
    };
    grid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-gallery-index]');
        if (!(button instanceof HTMLElement) || !(dialog instanceof HTMLDialogElement)) return;
        show(Number(button.dataset.galleryIndex));
        dialog.showModal();
    });
    dialog?.querySelector('[data-lightbox-previous]')?.addEventListener('click', () => show(active - 1));
    dialog?.querySelector('[data-lightbox-next]')?.addEventListener('click', () => show(active + 1));
    dialog?.querySelector('[data-lightbox-close]')?.addEventListener('click', close);
    dialog?.addEventListener('click', (event) => { if (event.target === dialog) close(); });
    dialog?.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') show(active - 1);
        if (event.key === 'ArrowRight') show(active + 1);
    });
})();

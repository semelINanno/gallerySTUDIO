(function (root, factory) {
    'use strict';

    const api = factory(root && root.GovinFreeMosaicGeometry);
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.GalleryStudio = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (geometry) {
    'use strict';

    const defaults = {
        density: 3,
        gap: 12,
        candidateWindow: 8,
        beamWidth: 36,
        maxItemWidthRatio: 0.40,
        minItemScaleRatio: 0.55,
        tailCount: 6,
        tailScaleTolerance: 0.2,
        cavityExpansionRatio: 1,
        balanceMinimum: 4,
        balanceMaximum: 1,
        compactionPressure: 0.06,
        highReverseFactor: true,
        harmonicSpaces: true,
        usefulSpaces: true,
        adaptiveSearch: true,
    };

    const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

    class FreeMosaic {
        constructor(element, options) {
            if (!(element instanceof HTMLElement)) throw new TypeError('Gallery Studio requires an HTML element.');
            if (!geometry || typeof geometry.placeAdaptive !== 'function') {
                throw new Error('GovinFreeMosaicGeometry must be loaded before Gallery Studio.');
            }
            this.element = element;
            this.options = { ...defaults, ...(options || {}) };
            this.cache = new Map();
            this.frame = 0;
            this.observer = null;
            this.lastWidth = 0;
            this.layout = null;
            this.refresh = this.refresh.bind(this);
            this.schedule = this.schedule.bind(this);
            this.observe();
            this.schedule();
        }

        items() {
            return Array.from(this.element.querySelectorAll(':scope > .gallery-studio__item'))
                .filter((item) => item instanceof HTMLElement);
        }

        source(items) {
            return items.map((item, index) => {
                const image = item.querySelector('img');
                const measured = image instanceof HTMLImageElement && image.naturalWidth > 0 && image.naturalHeight > 0
                    ? image.naturalWidth / image.naturalHeight
                    : 0;
                const declared = number(item.dataset.aspect, measured || 1);
                return {
                    id: index,
                    aspect: clamp(declared, 0.2, 5),
                    preference: item.dataset.preference || 'auto',
                };
            });
        }

        settings(width) {
            const density = clamp(number(this.options.density, defaults.density), 1, 8);
            const gap = Math.max(0, number(this.options.gap, defaults.gap));
            return {
                containerWidth: width,
                gap,
                targetColumns: density,
                targetHeight: width / density,
                maxItemWidthRatio: clamp(number(this.options.maxItemWidthRatio, defaults.maxItemWidthRatio), 0.25, 1),
                minItemScaleRatio: clamp(number(this.options.minItemScaleRatio, defaults.minItemScaleRatio), 0.25, 1),
                candidateWindow: clamp(Math.round(number(this.options.candidateWindow, defaults.candidateWindow)), 1, 20),
                beamWidth: clamp(Math.round(number(this.options.beamWidth, defaults.beamWidth)), 8, 80),
                tailCount: clamp(Math.round(number(this.options.tailCount, defaults.tailCount)), 0, 10),
                tailScaleTolerance: clamp(number(this.options.tailScaleTolerance, defaults.tailScaleTolerance), 0, 0.45),
                cavityExpansionRatio: clamp(number(this.options.cavityExpansionRatio, defaults.cavityExpansionRatio), 0, 1.5),
                verticalBalanceMinimum: Math.max(0, number(this.options.balanceMinimum, defaults.balanceMinimum)),
                verticalBalanceMaximumRatio: clamp(number(this.options.balanceMaximum, defaults.balanceMaximum), 0, 1),
                horizontalBalanceMinimum: Math.max(0, number(this.options.balanceMinimum, defaults.balanceMinimum)),
                horizontalBalanceMaximumRatio: clamp(number(this.options.balanceMaximum, defaults.balanceMaximum), 0, 1),
                compactionPressure: clamp(
                    number(this.options.compactionPressure, defaults.compactionPressure),
                    0,
                    1
                ),
                highReverseFactor: Boolean(this.options.highReverseFactor),
                harmonicSpaces: Boolean(this.options.harmonicSpaces),
                usefulSpaces: Boolean(this.options.usefulSpaces),
                adaptiveSearch: this.options.adaptiveSearch !== false,
            };
        }

        cacheKey(source, settings) {
            return JSON.stringify({
                width: Math.round(settings.containerWidth),
                source: source.map((item) => [item.id, Math.round(item.aspect * 10000), item.preference]),
                options: Object.entries(settings).filter(([key]) => key !== 'containerWidth'),
            });
        }

        refresh() {
            const items = this.items();
            const width = this.element.clientWidth;
            if (items.length === 0 || width < 1) return null;
            const source = this.source(items);
            const settings = this.settings(width);
            const key = this.cacheKey(source, settings);
            const started = performance.now();
            let layout = this.cache.get(key);
            const cached = Boolean(layout);
            if (!layout) {
                layout = geometry.placeAdaptive(source, settings);
                this.cache.set(key, layout);
                if (this.cache.size > 6) this.cache.delete(this.cache.keys().next().value);
            }
            const validationStarted = performance.now();
            const validation = geometry.validateLayout(layout, settings.gap);
            const validationDuration = performance.now() - validationStarted;
            if (!validation.valid) {
                this.element.dataset.layoutState = 'invalid';
                console.warn('Gallery Studio rejected an invalid plan.', validation.errors);
                return null;
            }
            const domStarted = performance.now();
            layout.placements.forEach((placement) => {
                const item = items[Number(placement.id)];
                if (!item) return;
                item.style.transform = `translate3d(${placement.x}px, ${placement.y}px, 0)`;
                item.style.width = `${placement.width}px`;
                item.style.height = `${placement.height}px`;
                item.dataset.crop = placement.crop ? 'true' : 'false';
            });
            this.element.style.height = `${Math.ceil(layout.containerHeight)}px`;
            this.element.dataset.layoutState = 'ready';
            this.layout = layout;
            const domDuration = performance.now() - domStarted;
            const duration = performance.now() - started;
            this.element.dispatchEvent(new CustomEvent('gallery-studio:layout', {
                bubbles: true,
                detail: {
                    layout,
                    validation,
                    cached,
                    duration,
                    timings: {
                        ...(layout.metrics?.phaseTimings || {}),
                        validation: validationDuration,
                        dom: domDuration,
                        total: duration,
                    },
                },
            }));
            return layout;
        }

        schedule() {
            cancelAnimationFrame(this.frame);
            this.frame = requestAnimationFrame(() => this.refresh());
        }

        setOptions(options) {
            this.options = { ...this.options, ...(options || {}) };
            this.schedule();
        }

        clearCache() {
            this.cache.clear();
        }

        observe() {
            this.element.querySelectorAll('img').forEach((image) => {
                if (!(image instanceof HTMLImageElement) || image.complete) return;
                image.addEventListener('load', this.schedule, { once: true });
            });
            if ('ResizeObserver' in window) {
                this.lastWidth = this.element.clientWidth;
                this.observer = new ResizeObserver((entries) => {
                    const width = Math.round(entries[0] && entries[0].contentRect.width || 0);
                    if (width === Math.round(this.lastWidth)) return;
                    this.lastWidth = width;
                    this.schedule();
                });
                this.observer.observe(this.element);
            } else {
                window.addEventListener('resize', this.schedule, { passive: true });
            }
        }

        destroy() {
            cancelAnimationFrame(this.frame);
            if (this.observer) this.observer.disconnect();
            else window.removeEventListener('resize', this.schedule);
            this.items().forEach((item) => item.removeAttribute('style'));
            this.element.removeAttribute('style');
            this.element.removeAttribute('data-layout-state');
        }
    }

    const mount = (target, options) => {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        return new FreeMosaic(element, options);
    };

    return { FreeMosaic, mount, defaults: { ...defaults } };
}));

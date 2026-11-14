'use strict';

const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const geometry = require('../src/free-mosaic-geometry.js');

// A 51-image mixture modelled after the six visual-regression pairs supplied
// for the airy, reverse-factor and harmonic-space composition. Repetition is
// intentional: real galleries commonly contain bursts of similar shots.
const aspects = [
    0.56, 1.78, 0.58, 1.62, 0.75, 1.50, 1.33, 0.60, 1.85,
    0.67, 1.45, 1.05, 0.72, 1.70, 0.55, 1.28, 1.92,
];
const images = Array.from({ length: 51 }, (_, id) => ({
    id,
    aspect: aspects[id % aspects.length],
    preference: 'auto',
}));
const options = {
    containerWidth: 2048,
    targetColumns: 3,
    targetHeight: 2048 / 3,
    gap: 12,
    candidateWindow: 8,
    maxItemWidthRatio: 0.40,
    minItemScaleRatio: 0.55,
    tailCount: 6,
    tailScaleTolerance: 0.2,
    cavityExpansionRatio: 1,
    compactionPressure: 0.06,
    highReverseFactor: true,
    harmonicSpaces: true,
    adaptiveSearch: true,
};

const started = performance.now();
const layout = geometry.placeAdaptive(images, options);
const duration = performance.now() - started;

assert.equal(layout.placements.length, images.length, 'The large plan must place all 51 images.');
assert.equal(
    geometry.validateLayout(layout, options.gap).valid,
    true,
    'The large harmonic plan must remain geometrically valid.'
);
assert.ok(
    layout.metrics.voidRatio >= 0.18 && layout.metrics.voidRatio <= 0.30,
    `The airy plan must keep a controlled breathing-room band; got ${(layout.metrics.voidRatio * 100).toFixed(1)}%.`
);
assert.ok(
    duration < 1000,
    `The 51-image planning target is below one second; got ${duration.toFixed(1)} ms.`
);
assert.deepEqual(
    layout.metrics.searchProfile,
    { adaptive: true, candidateWindow: 6, beamWidth: 20, harmonicStartLimit: 2 },
    'Large galleries must use the bounded harmonic search profile.'
);

console.log(
    `PASS: 51-tile harmonic plan in ${duration.toFixed(1)} ms, `
    + `${(layout.metrics.voidRatio * 100).toFixed(1)}% estimated void.`
);

const largeImages = Array.from({ length: 117 }, (_, id) => ({
    id: `large-${id}`,
    aspect: aspects[(id * 7) % aspects.length],
    preference: 'auto',
}));
const usefulStarted = performance.now();
const usefulLayout = geometry.placeAdaptive(largeImages, {
    ...options,
    candidateWindow: 4,
    beamWidth: 12,
    usefulSpaces: true,
});
const usefulDuration = performance.now() - usefulStarted;
assert.equal(
    geometry.validateLayout(usefulLayout, options.gap).valid,
    true,
    'The 117-image useful-space plan must remain geometrically valid.'
);
assert.ok(
    usefulLayout.metrics.usefulSpaces.balancingPasses <= 6,
    'Large useful-space galleries must use at most three frozen balancing passes.'
);
assert.ok(
    usefulLayout.metrics.phaseTimings.balancing < 400,
    `Frozen balancing should stay below 400 ms; got ${usefulLayout.metrics.phaseTimings.balancing.toFixed(1)} ms.`
);
assert.ok(
    usefulDuration < 1000,
    `The 117-image useful-space target is below one second; got ${usefulDuration.toFixed(1)} ms.`
);

console.log(
    `PASS: 117-tile useful-space plan in ${usefulDuration.toFixed(1)} ms, `
    + `balance ${usefulLayout.metrics.phaseTimings.balancing.toFixed(1)} ms.`
);

'use strict';

const assert = require('node:assert/strict');
const geometry = require('../src/free-mosaic-geometry.js');

const images = [
    1.67, 0.65, 1, 2.69, 0.63, 1.45,
    1.23, 0.48, 1.68, 1.61, 1, 2.34,
].map((aspect, id) => ({ id, aspect }));

const options = {
    containerWidth: 960,
    targetColumns: 3,
    targetHeight: 320,
    gap: 12,
    candidateWindow: 8,
    maxItemWidthRatio: 0.40,
    minItemScaleRatio: 0.55,
    tailCount: 6,
    tailScaleTolerance: 0.2,
    cavityExpansionRatio: 1,
};

const first = geometry.placeAdaptive(images, options);
const repeated = geometry.placeAdaptive(images, options);
const narrow = geometry.placeAdaptive(images, { ...options, containerWidth: 540, targetHeight: 180 });
const constrainedWide = geometry.placeAdaptive([
    { id: 'wide-a', aspect: 3.4 },
    { id: 'wide-b', aspect: 3.1 },
    { id: 'wide-c', aspect: 2.8 },
], {
    ...options,
    maxItemWidthRatio: 0.48,
    minItemScaleRatio: 0.35,
});
const artistic = geometry.placeAdaptive(images, { ...options, compactionPressure: 0.05 });
const compact = geometry.placeAdaptive(images, { ...options, compactionPressure: 0.95 });
const orientationRun = [
    2.1, 1.8, 2.4, 1.9, 2.2, 0.55, 0.62, 0.5, 0.7,
].map((aspect, id) => ({ id: `run-${id}`, aspect }));
const ordinaryRunPlan = geometry.placeAdaptive(orientationRun, {
    ...options,
    compactionPressure: 0.06,
    candidateWindow: 3,
    highReverseFactor: false,
});
const reversePlan = geometry.placeAdaptive(orientationRun, {
    ...options,
    compactionPressure: 0.06,
    candidateWindow: 3,
    highReverseFactor: true,
});
const ordinaryAiryPlan = geometry.placeAdaptive(images, {
    ...options,
    compactionPressure: 0.06,
    highReverseFactor: true,
    harmonicSpaces: false,
});
const harmonicAiryPlan = geometry.placeAdaptive(images, {
    ...options,
    compactionPressure: 0.06,
    highReverseFactor: true,
    harmonicSpaces: true,
});
const usefulAiryOptions = {
    ...options,
    compactionPressure: 0.06,
    highReverseFactor: true,
    harmonicSpaces: true,
    usefulSpaces: true,
};
const usefulAiryPlan = geometry.placeAdaptive(images, usefulAiryOptions);
const repeatedUsefulAiryPlan = geometry.placeAdaptive(images, usefulAiryOptions);

assert.deepEqual(first, repeated, 'The planner must remain deterministic.');
assert.equal(first.placements.length, images.length, 'Every image must be placed exactly once.');
assert.equal(new Set(first.placements.map((item) => item.id)).size, images.length, 'Duplicate placements are not allowed.');
assert.equal(geometry.validateLayout(first, options.gap).valid, true, 'The desktop layout must respect bounds and spacing.');
assert.equal(geometry.validateLayout(narrow, options.gap).valid, true, 'The narrow layout must respect bounds and spacing.');
assert.ok(first.containerHeight > 0 && narrow.containerHeight > 0, 'Both layouts need a measurable height.');
assert.ok(first.metrics.voidRatio >= 0 && first.metrics.voidRatio <= 1, 'The reported void ratio must be normalized.');
assert.ok(
    constrainedWide.placements.every((item) => item.width <= options.containerWidth * 0.48 + 0.001),
    'Very wide images must respect the user-selected maximum tile width.'
);
assert.equal(geometry.validateLayout(artistic, options.gap).valid, true, 'The artistic style must remain geometrically valid.');
assert.equal(geometry.validateLayout(compact, options.gap).valid, true, 'The compact style must remain geometrically valid.');
assert.notDeepEqual(
    artistic.placements,
    compact.placements,
    'The artistic and compact endpoints must produce genuinely different plans.'
);
assert.equal(
    geometry.validateLayout(reversePlan, options.gap).valid,
    true,
    'High reverse factor must preserve valid, non-overlapping geometry.'
);
assert.equal(reversePlan.placements.length, orientationRun.length, 'High reverse factor must place every image once.');
assert.equal(
    geometry.validateLayout(harmonicAiryPlan, options.gap).valid,
    true,
    'Harmonic spaces must preserve valid, non-overlapping geometry.'
);
assert.equal(harmonicAiryPlan.placements.length, images.length, 'Harmonic spaces must place every image once.');
assert.notDeepEqual(
    harmonicAiryPlan.placements,
    ordinaryAiryPlan.placements,
    'Harmonic spaces must alter the airy composition instead of acting as a cosmetic label.'
);
assert.ok(
    harmonicAiryPlan.metrics.voidRatio >= ordinaryAiryPlan.metrics.voidRatio,
    'At the artistic endpoint, harmonic spaces must preserve at least as much breathing room as the ordinary plan.'
);
assert.deepEqual(
    usefulAiryPlan,
    repeatedUsefulAiryPlan,
    'Useful spaces and void anchors must remain deterministic.'
);
assert.equal(
    geometry.validateLayout(usefulAiryPlan, options.gap).valid,
    true,
    'Useful spaces must preserve valid, non-overlapping image geometry.'
);
assert.equal(usefulAiryPlan.placements.length, images.length, 'Useful spaces must place every image exactly once.');
assert.ok(
    usefulAiryPlan.metrics.usefulSpaces.ratio >= 0.75,
    'Useful spaces must give at least three quarters of the regression set two meaningful free sides.'
);
assert.equal(
    usefulAiryPlan.voidAnchors.length,
    usefulAiryPlan.metrics.usefulSpaces.anchorCount,
    'The reported anchor count must match the protected geometry.'
);
assert.equal(
    usefulAiryPlan.voidAnchors.length,
    0,
    'Separators must remain disabled until their final-layout utility can be verified.'
);
assert.ok(
    usefulAiryPlan.metrics.usefulSpaces.centeringMovement >= 0,
    'Useful-space centring must report its movement, including a valid zero when no bounded corridor exists.'
);
assert.ok(
    usefulAiryPlan.metrics.usefulSpaces.balancingPasses <= 6,
    'Useful-space centring must remain bounded to six frozen-layout passes.'
);
const protectedRegions = usefulAiryPlan.voidAnchors.flatMap((anchor) => (
    (Array.isArray(anchor.regions) ? anchor.regions : [anchor]).map((region) => ({
        ...region,
        ownerId: anchor.ownerId ?? region.ownerId,
    }))
));
const rawOverlap = (left, right) => !(
    left.x + left.width <= right.x + 0.0001
    || right.x + right.width <= left.x + 0.0001
    || left.y + left.height <= right.y + 0.0001
    || right.y + right.height <= left.y + 0.0001
);
assert.equal(
    usefulAiryPlan.placements.some((placement) => (
        protectedRegions.some((region) => (
            String(region.ownerId) !== String(placement.id)
            && rawOverlap(placement, region)
        ))
    )),
    false,
    'Anchor-aware balancing must never consume another tile protected void region.'
);

const ownerAwareImages = [
    { id: 'scene-1', aspect: 1200 / 720 },
    { id: 'scene-2', aspect: 640 / 980, preference: 'vertical' },
    { id: 'scene-3', aspect: 1 },
    { id: 'scene-4', aspect: 1400 / 520, preference: 'horizontal' },
    { id: 'scene-5', aspect: 700 / 1120 },
    { id: 'scene-6', aspect: 1100 / 760 },
    { id: 'scene-7', aspect: 760 / 620 },
    { id: 'scene-8', aspect: 520 / 1080, preference: 'vertical' },
    { id: 'scene-9', aspect: 1280 / 800 },
    { id: 'scene-10', aspect: 900 / 560 },
    { id: 'scene-11', aspect: 1 },
    { id: 'scene-12', aspect: 1500 / 640, preference: 'horizontal' },
];
const ownerAwarePlan = geometry.placeAdaptive(ownerAwareImages, {
    ...usefulAiryOptions,
    containerWidth: 1330,
    targetHeight: 1330 / 3,
    beamWidth: 36,
});
assert.ok(
    ownerAwarePlan.metrics.usefulSpaces.centeringMovement > 0,
    'The residual-space pass must perform a measurable centring correction.'
);
assert.equal(
    ownerAwarePlan.voidAnchors.some((anchor) => {
        const owner = ownerAwarePlan.placements.find((placement) => (
            String(placement.id) === String(anchor.ownerId)
        ));
        return owner && anchor.regions.some((region) => rawOverlap(owner, region));
    }),
    false,
    'A translated anchor must remain attached to, but outside, its owner tile.'
);
assert.equal(
    geometry.validateLayout(ownerAwarePlan, usefulAiryOptions.gap).valid,
    true,
    'Owner-aware two-axis floating must preserve valid image geometry.'
);

// Regression for the shuffled demo composition that exposed a large residual
// cavity around Violet core and an off-centre Terracotta ridge.
const shuffledOwnerAwareImages = ownerAwareImages.slice(3).concat(ownerAwareImages.slice(0, 3));
const residualCellPlan = geometry.placeAdaptive(shuffledOwnerAwareImages, {
    ...usefulAiryOptions,
    containerWidth: 1115,
    targetHeight: 1115 / 3,
    beamWidth: 36,
});
assert.equal(
    residualCellPlan.spaceCells.length,
    residualCellPlan.placements.length,
    'The diagnostic output must expose one residual calculation cell per tile.'
);
const cellsById = new Map(residualCellPlan.spaceCells.map((cell) => [cell.id, cell]));
assert.equal(
    residualCellPlan.spaceCells.some((cell, index, cells) => (
        cells.slice(index + 1).some((other) => rawOverlap(cell, other))
    )),
    false,
    'Exclusive boxes must not overlap.'
);
assert.equal(
    residualCellPlan.placements.every((placement) => {
        const cell = cellsById.get(placement.id);
        return cell
            && cell.x <= placement.x + 0.0001
            && cell.y <= placement.y + 0.0001
            && cell.x + cell.width >= placement.x + placement.width - 0.0001
            && cell.y + cell.height >= placement.y + placement.height - 0.0001;
    }),
    true,
    'Every reported residual cell must contain the tile it was calculated for.'
);
assert.equal(
    residualCellPlan.placements.every((placement) => {
        const cell = cellsById.get(placement.id);
        const left = placement.x - cell.x;
        const right = cell.x + cell.width - placement.x - placement.width;
        const top = placement.y - cell.y;
        const bottom = cell.y + cell.height - placement.y - placement.height;
        return Math.abs(left - right) < 0.001 && Math.abs(top - bottom) < 0.001;
    }),
    true,
    'Every tile must be centred in its exclusive box.'
);
const byId = new Map(residualCellPlan.placements.map((placement) => [placement.id, placement]));
const violet = byId.get('scene-11');
const terracotta = byId.get('scene-9');
const violetCell = cellsById.get('scene-11');
const terracottaCell = cellsById.get('scene-9');
const violetLeftMargin = violet.x - violetCell.x;
const violetRightMargin = violetCell.x + violetCell.width
    - violet.x - violet.width;
assert.ok(
    Math.abs(violetLeftMargin - violetRightMargin)
        / Math.max(1, violetLeftMargin + violetRightMargin) < 0.08,
    'Violet core must be horizontally centred in its residual cell.'
);
const terracottaTopMargin = terracotta.y - terracottaCell.y;
const terracottaBottomMargin = terracottaCell.y + terracottaCell.height
    - terracotta.y - terracotta.height;
assert.ok(
    Math.abs(terracottaTopMargin - terracottaBottomMargin)
        / Math.max(1, terracottaTopMargin + terracottaBottomMargin) < 0.12,
    'Terracotta ridge must be vertically centred between its residual walls.'
);
assert.equal(
    geometry.validateLayout(residualCellPlan, usefulAiryOptions.gap).valid,
    true,
    'Residual-cell centring must preserve valid shuffled-demo geometry.'
);
const orientationById = new Map(orientationRun.map((item) => [
    item.id,
    item.aspect >= 1.2 ? 'landscape' : (item.aspect <= 0.84 ? 'portrait' : 'neutral'),
]));
const orientationChanges = (plan) => plan.placements.reduce((count, placement, index, placements) => {
    if (index === 0) return count;
    const previous = orientationById.get(placements[index - 1].id);
    const current = orientationById.get(placement.id);
    return count + (previous !== 'neutral' && current !== 'neutral' && previous !== current ? 1 : 0);
}, 0);
assert.ok(
    orientationChanges(reversePlan) > orientationChanges(ordinaryRunPlan),
    'High reverse factor must create more orientation changes than the ordinary candidate window.'
);

const edgeBalanced = geometry.balanceVertical([
    { id: 'portrait', x: 0, y: 0, width: 100, height: 200 },
    { id: 'below', x: 0, y: 400, width: 100, height: 100 },
], { gap: 10, minimum: 4, maximumRatio: 1, containerHeight: 500 });
const portrait = edgeBalanced.find((item) => item.id === 'portrait');
assert.equal(portrait.y, 95, 'A portrait tile at the top edge must share its vertical surplus equally.');
assert.equal(
    geometry.validateLayout({ placements: edgeBalanced, containerWidth: 100 }, 10).valid,
    true,
    'Edge balancing must preserve spacing and avoid overlap.'
);

console.log('PASS: deterministic, responsive and geometrically valid free mosaic.');

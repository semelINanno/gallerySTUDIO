(function (root, factory) {
    'use strict';

    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.GovinFreeMosaicGeometry = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const clockNow = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now());

    const finitePositive = (value, fallback) => {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? number : fallback;
    };

    const mergeSkyline = (segments) => {
        const ordered = segments
            .filter((segment) => segment.end - segment.x > 0.0001)
            .sort((left, right) => left.x - right.x);
        const merged = [];
        ordered.forEach((segment) => {
            const previous = merged[merged.length - 1];
            if (previous && Math.abs(previous.end - segment.x) < 0.0001
                && Math.abs(previous.y - segment.y) < 0.0001) {
                previous.end = segment.end;
                return;
            }
            merged.push({ x: segment.x, end: segment.end, y: segment.y });
        });
        return merged;
    };

    const heightAt = (skyline, start, end) => skyline.reduce((height, segment) => {
        if (segment.end <= start || segment.x >= end) return height;
        return Math.max(height, segment.y);
    }, 0);

    const updateSkyline = (skyline, start, end, y) => {
        const next = [];
        skyline.forEach((segment) => {
            if (segment.end <= start || segment.x >= end) {
                next.push(segment);
                return;
            }
            if (segment.x < start) next.push({ x: segment.x, end: start, y: segment.y });
            if (segment.end > end) next.push({ x: end, end: segment.end, y: segment.y });
        });
        next.push({ x: start, end, y });
        return mergeSkyline(next);
    };

    const candidateStarts = (skyline, footprintWidth, containerWidth) => {
        const starts = new Set([0, Math.max(0, containerWidth - footprintWidth)]);
        skyline.forEach((segment) => {
            starts.add(segment.x);
            starts.add(Math.max(0, segment.end - footprintWidth));
        });
        return Array.from(starts)
            .filter((start) => start >= 0 && start + footprintWidth <= containerWidth + 0.0001)
            .sort((left, right) => left - right);
    };

    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

    const aspectOf = (item) => clamp(
        finitePositive(item && item.aspect,
            finitePositive(item && item.width, 1) / finitePositive(item && item.height, 1)),
        0.2,
        5
    );

    const orientationOf = (item) => {
        const aspect = aspectOf(item);
        if (aspect >= 1.2) return 'landscape';
        if (aspect <= 0.84) return 'portrait';
        return 'neutral';
    };

    const adaptiveSettings = (options) => {
        const containerWidth = finitePositive(options && options.containerWidth, 1);
        const targetColumns = Math.round(clamp(finitePositive(options && options.targetColumns, 3), 1, 8));
        const itemCount = Math.max(0, Math.round(Number(options && options.itemCount) || 0));
        const adaptiveSearch = !options || options.adaptiveSearch !== false;
        const largeGallery = adaptiveSearch && itemCount >= 40;
        const requestedCandidateWindow = Math.round(clamp(
            finitePositive(options && options.candidateWindow, 8),
            1,
            20
        ));
        const requestedBeamWidth = Math.round(clamp(
            finitePositive(options && options.beamWidth, 36),
            8,
            80
        ));
        return {
            containerWidth,
            gap: Math.max(0, Number(options && options.gap) || 0),
            targetColumns,
            itemCount,
            adaptiveSearch,
            largeGallery,
            targetHeight: finitePositive(options && options.targetHeight, containerWidth / targetColumns),
            minResidualRatio: clamp(Number(options && options.minResidualRatio) || 0.2, 0.02, 0.8),
            maxItemWidthRatio: clamp(Number(options && options.maxItemWidthRatio) || 0.6, 0.25, 1),
            minItemScaleRatio: clamp(Number(options && options.minItemScaleRatio) || 0.55, 0.25, 1),
            candidateWindow: largeGallery ? Math.min(requestedCandidateWindow, 6) : requestedCandidateWindow,
            beamWidth: largeGallery ? Math.min(requestedBeamWidth, 20) : requestedBeamWidth,
            candidatesPerItem: largeGallery ? 12 : 18,
            harmonicStartLimit: largeGallery ? 2 : 4,
            tailBeamWidth: largeGallery ? 18 : 36,
            tailCandidatesPerItem: largeGallery ? 12 : 28,
            tailCount: Math.round(clamp(
                options && options.tailCount !== undefined ? Number(options.tailCount) : 6,
                0,
                10
            )),
            tailScaleTolerance: clamp(Number(options && options.tailScaleTolerance) || 0.2, 0, 0.45),
            cavityExpansionRatio: clamp(
                options && options.cavityExpansionRatio !== undefined
                    ? Number(options.cavityExpansionRatio)
                    : 1,
                0,
                1.5
            ),
            compactionPressure: clamp(
                options && options.compactionPressure !== undefined
                    ? Number(options.compactionPressure)
                    : 0.5,
                0,
                1
            ),
            highReverseFactor: Boolean(options && options.highReverseFactor),
            harmonicSpaces: Boolean(options && options.harmonicSpaces),
            usefulSpaces: Boolean(options && options.usefulSpaces),
            usefulSpaceDepth: finitePositive(
                options && options.usefulSpaceDepth,
                Math.max((Number(options && options.gap) || 0) * 2.5, containerWidth / targetColumns * 0.075)
            ),
            usefulSpaceCoverage: clamp(Number(options && options.usefulSpaceCoverage) || 0.4, 0.2, 0.9),
            // Separators are deliberately disabled for now. They used to be
            // created while the layout was still incomplete and were never
            // removed when later tiles made the reserved space redundant.
            usefulAnchorLimit: 0,
            usefulAnchorAreaLimit: containerWidth
                * finitePositive(options && options.targetHeight, containerWidth / targetColumns)
                * Math.max(1, itemCount / targetColumns)
                * 0.12,
            verticalBalanceMinimum: Math.max(0, Number(options && options.verticalBalanceMinimum) || 4),
            verticalBalanceMaximumRatio: clamp(Number(options && options.verticalBalanceMaximumRatio) || 1, 0, 1),
            horizontalBalanceMinimum: Math.max(0, Number(options && options.horizontalBalanceMinimum) || 4),
            horizontalBalanceMaximumRatio: clamp(Number(options && options.horizontalBalanceMaximumRatio) || 1, 0, 1),
        };
    };

    const nominalWidth = (item, settings) => {
        const aspect = aspectOf(item);
        let width = aspect * settings.targetHeight;
        if (item && item.preference === 'horizontal') width *= 1.12;
        if (item && item.preference === 'vertical') width *= 0.88;
        return clamp(
            width,
            settings.targetHeight * 0.32,
            settings.containerWidth * settings.maxItemWidthRatio
        );
    };

    const skylineRoughness = (skyline, containerWidth, height) => {
        if (height <= 0 || containerWidth <= 0) return 0;
        const average = skyline.reduce(
            (sum, segment) => sum + segment.y * ((segment.end - segment.x) / containerWidth),
            0
        );
        const variance = skyline.reduce((sum, segment) => {
            const weight = (segment.end - segment.x) / containerWidth;
            return sum + ((segment.y - average) / height) ** 2 * weight;
        }, 0);
        return Math.sqrt(variance);
    };

    const stateScore = (state, settings, complete) => {
        const height = Math.max(1, state.height);
        const boundingArea = settings.containerWidth * height;
        const voidRatio = clamp((boundingArea - state.area) / boundingArea, 0, 1);
        const roughness = skylineRoughness(state.skyline, settings.containerWidth, height);
        const fragmentation = Math.max(0, state.skyline.length - 1) / Math.max(1, settings.targetColumns * 2);
        const pressure = settings.compactionPressure;
        const completionWeight = complete
            ? 3.2 + pressure * 6.8
            : 2.8 + pressure * 3.7;
        const roughnessWeight = complete
            ? 0.55 + pressure * 1.05
            : 0.4 + pressure * 0.5;
        const scaleWeight = 1.25 - pressure * 0.87;
        const reverseWeight = settings.highReverseFactor
            ? 0.42 + (1 - pressure) * 0.78
            : 0;
        // In harmonic mode empty space is part of the composition rather than
        // an error to eliminate. The target deliberately grows towards the
        // artistic end, while compact values progressively restore filling.
        const harmonicVoidTarget = settings.harmonicSpaces
            ? 0.06 + (1 - pressure) * 0.22
            : 0;
        const voidCost = settings.harmonicSpaces
            ? (complete
                ? Math.abs(voidRatio - harmonicVoidTarget) * (2.1 + pressure * 2.4)
                : Math.max(0, voidRatio - harmonicVoidTarget) * (1.15 + pressure * 1.5))
            : voidRatio * completionWeight;
        const rhythmWeight = settings.harmonicSpaces
            ? 0.34 + (1 - pressure) * 0.86
            : 0;
        return voidCost
            + roughness * roughnessWeight
            + fragmentation * (0.04 + pressure * 0.08)
            + state.scalePenalty * scaleWeight
            + state.orderPenalty * 0.16
            + (state.orientationPenalty || 0) * reverseWeight
            + (state.rhythmPenalty || 0) * rhythmWeight
            + (settings.usefulSpaces ? (state.usefulSpacePenalty || 0) * 0.62 : 0)
            + (settings.usefulSpaces ? (state.voidAnchors?.length || 0) * 0.018 : 0);
    };

    const adaptiveCandidateIndexes = (state, settings) => {
        const limit = Math.min(settings.candidateWindow, state.remaining.length);
        const indexes = Array.from({ length: limit }, (_, index) => index);
        if (!settings.highReverseFactor
            || state.orientationRun < 2
            || !state.lastOrientation
            || state.lastOrientation === 'neutral'
            || limit >= state.remaining.length) {
            return indexes;
        }

        // Selectively look past the ordinary window only when a repeated
        // orientation needs an escape route. This avoids a global search.
        const extraLimit = Math.max(2, Math.ceil(settings.candidateWindow / 3));
        for (let index = limit; index < state.remaining.length && indexes.length < limit + extraLimit; index += 1) {
            const orientation = orientationOf(state.remaining[index]);
            if (orientation !== 'neutral' && orientation !== state.lastOrientation) indexes.push(index);
        }
        return indexes;
    };

    const uniqueNumbers = (values) => Array.from(new Set(values
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.round(value * 1000) / 1000)));

    const adaptiveCandidates = (state, item, settings) => {
        const widthNominal = nominalWidth(item, settings);
        const aspect = aspectOf(item);
        const minimumWidth = Math.max(
            settings.targetHeight * 0.28,
            widthNominal * settings.minItemScaleRatio
        );
        const maximumWidth = Math.min(
            settings.containerWidth,
            settings.containerWidth * settings.maxItemWidthRatio,
            widthNominal * 1.7
        );
        const phase = ((state.placements.length + 1) * 0.61803398875) % 1;
        const harmonicInset = settings.harmonicSpaces
            ? (settings.gap + settings.targetHeight * (0.035 + phase * 0.07)) * (1 - settings.compactionPressure)
            : 0;
        const baseStarts = [
            0,
            ...state.skyline.map((segment) => segment.x),
            ...state.skyline.map((segment) => segment.end),
        ];
        // Harmonic mode used to add two insets for every skyline segment.
        // On long galleries that multiplied the search space several times
        // over. Sample only the lowest, widest frontier segments: these are
        // the cavities that can actually influence the next visual band.
        const harmonicSegments = settings.harmonicSpaces
            ? state.skyline
                .slice()
                .sort((left, right) => left.y - right.y
                    || (right.end - right.x) - (left.end - left.x)
                    || left.x - right.x)
                .slice(0, settings.harmonicStartLimit)
            : [];
        const starts = uniqueNumbers([
            ...baseStarts,
            ...harmonicSegments.flatMap((segment) => [
                    segment.x + harmonicInset,
                    segment.end - harmonicInset,
                ]),
        ]).filter((start) => start >= 0 && start < settings.containerWidth - 0.5);
        const endpoints = uniqueNumbers([
            settings.containerWidth,
            ...state.skyline.map((segment) => segment.end),
            ...state.skyline.map((segment) => segment.x),
        ]).sort((left, right) => left - right);
        const candidates = [];

        starts.forEach((start) => {
            const widths = [widthNominal];
            if (settings.harmonicSpaces) {
                // Golden-ratio modulation reduces recurring rows and columns
                // without introducing non-deterministic randomness.
                widths.push(widthNominal * (0.76 + phase * 0.18));
            }
            endpoints.forEach((end) => {
                if (end <= start) return;
                const exact = end - start - (end < settings.containerWidth ? settings.gap : 0);
                if (exact > 0) widths.push(exact);
            });
            uniqueNumbers(widths).forEach((widthValue) => {
                const width = clamp(widthValue, minimumWidth, maximumWidth);
                if (start + width > settings.containerWidth + 0.0001) return;
                const footprintWidth = width >= settings.containerWidth - 0.0001
                    ? settings.containerWidth
                    : Math.min(settings.containerWidth - start, width + settings.gap);
                const end = start + footprintWidth;
                const y = heightAt(state.skyline, start, end);
                const height = width / aspect;
                const nextSkyline = updateSkyline(state.skyline, start, end, y + height + settings.gap);
                const nextHeight = Math.max(state.height, y + height);
                const scale = width / Math.max(1, widthNominal);
                candidates.push({
                    x: start,
                    y,
                    width,
                    height,
                    skyline: nextSkyline,
                    layoutHeight: nextHeight,
                    scalePenalty: Math.abs(Math.log(Math.max(0.01, scale))),
                });
            });
        });

        return candidates
            .sort((left, right) => {
                if (Math.abs(left.y - right.y) > 0.001) return left.y - right.y;
                if (Math.abs(left.scalePenalty - right.scalePenalty) > 0.001) {
                    return left.scalePenalty - right.scalePenalty;
                }
                return left.x - right.x;
            })
            .slice(0, settings.candidatesPerItem);
    };

    const horizontalOverlap = (left, right) => (
        left.x < right.x + right.width - 0.0001
        && left.x + left.width > right.x + 0.0001
    );

    const collides = (candidate, placements, gap) => placements.some((placement) => !(
        candidate.x + candidate.width + gap <= placement.x + 0.0001
        || placement.x + placement.width + gap <= candidate.x + 0.0001
        || candidate.y + candidate.height + gap <= placement.y + 0.0001
        || placement.y + placement.height + gap <= candidate.y + 0.0001
    ));

    const overlapLength = (startA, endA, startB, endB) => Math.max(
        0,
        Math.min(endA, endB) - Math.max(startA, startB)
    );

    const usefulSideProfile = (item, placements, settings, containerHeight = Infinity) => {
        const rightEdge = item.x + item.width;
        const bottomEdge = item.y + item.height;
        const clearances = {
            left: item.x,
            right: settings.containerWidth - rightEdge,
            top: item.y,
            bottom: Number.isFinite(containerHeight) ? containerHeight - bottomEdge : Infinity,
        };
        placements.forEach((placement) => {
            const placementRight = placement.x + placement.width;
            const placementBottom = placement.y + placement.height;
            const verticalCoverage = overlapLength(
                item.y,
                bottomEdge,
                placement.y,
                placementBottom
            ) / Math.max(1, item.height);
            if (verticalCoverage >= settings.usefulSpaceCoverage) {
                if (placementRight <= item.x + 0.0001) {
                    clearances.left = Math.min(clearances.left, item.x - placementRight);
                }
                if (placement.x >= rightEdge - 0.0001) {
                    clearances.right = Math.min(clearances.right, placement.x - rightEdge);
                }
            }
            const horizontalCoverage = overlapLength(
                item.x,
                rightEdge,
                placement.x,
                placementRight
            ) / Math.max(1, item.width);
            if (horizontalCoverage >= settings.usefulSpaceCoverage) {
                if (placementBottom <= item.y + 0.0001) {
                    clearances.top = Math.min(clearances.top, item.y - placementBottom);
                }
                if (placement.y >= bottomEdge - 0.0001) {
                    clearances.bottom = Math.min(clearances.bottom, placement.y - bottomEdge);
                }
            }
        });
        const threshold = settings.gap + settings.usefulSpaceDepth;
        const useful = {
            left: clearances.left >= threshold - 0.0001,
            right: clearances.right >= threshold - 0.0001,
            top: clearances.top >= threshold - 0.0001,
            bottom: clearances.bottom >= threshold - 0.0001,
        };
        const mask = (useful.left ? 1 : 0)
            | (useful.right ? 2 : 0)
            | (useful.top ? 4 : 0)
            | (useful.bottom ? 8 : 0);
        return {
            clearances,
            useful,
            mask,
            count: Object.values(useful).filter(Boolean).length,
        };
    };

    const usefulSideCount = (item, placements, settings, containerHeight = Infinity) => (
        usefulSideProfile(item, placements, settings, containerHeight).count
    );

    const usefulSpaceAudit = (placements, settings) => {
        const containerHeight = layoutHeight(placements);
        const sideProfiles = placements.map((item, index) => usefulSideProfile(
            item,
            placements.filter((_, otherIndex) => otherIndex !== index),
            settings,
            containerHeight
        ));
        const sideCounts = sideProfiles.map((profile) => profile.count);
        const satisfied = sideCounts.filter((count) => count >= 2).length;
        return {
            satisfied,
            total: placements.length,
            ratio: placements.length > 0 ? satisfied / placements.length : 1,
            averageSides: placements.length > 0
                ? sideCounts.reduce((sum, count) => sum + count, 0) / placements.length
                : 0,
            sideCounts,
            sideMasks: sideProfiles.map((profile) => profile.mask),
        };
    };

    const protectUsefulSpaces = (placements, settings, initialAnchors, initialAnchorArea) => {
        let result = placements.map((placement) => ({ ...placement }));
        let anchors = initialAnchors.map((anchor) => ({
            ...anchor,
            regions: Array.isArray(anchor.regions)
                ? anchor.regions.map((region) => ({ ...region }))
                : undefined,
        }));
        let anchorArea = initialAnchorArea;
        let audit = usefulSpaceAudit(result, settings);
        const bandDepth = settings.usefulSpaceDepth;
        const bandArea = settings.containerWidth * bandDepth;

        while (audit.satisfied < audit.total
            && anchors.length < settings.usefulAnchorLimit
            && anchorArea + bandArea <= settings.usefulAnchorAreaLimit) {
            const rawThresholds = audit.sideCounts.flatMap((count, index) => {
                if (count >= 2) return [];
                const item = result[index];
                return [item.y, item.y + item.height + settings.gap];
            });
            const thresholds = uniqueNumbers(rawThresholds)
                .filter((threshold) => threshold > 0.5 && threshold < layoutHeight(result) - 0.5)
                .sort((left, right) => left - right);
            const sampled = thresholds.length <= 14
                ? thresholds
                : Array.from({ length: 14 }, (_, index) => thresholds[Math.round(
                    index * (thresholds.length - 1) / 13
                )]);
            let best = null;
            uniqueNumbers(sampled).forEach((threshold) => {
                let movedCount = 0;
                const candidate = result.map((placement) => {
                    if (placement.y < threshold - 0.0001) return placement;
                    movedCount += 1;
                    return { ...placement, y: placement.y + bandDepth };
                });
                if (movedCount === 0 || movedCount === result.length) return;
                const candidateAudit = usefulSpaceAudit(candidate, settings);
                const heightIncrease = layoutHeight(candidate) - layoutHeight(result);
                if (!best
                    || candidateAudit.satisfied > best.audit.satisfied
                    || (candidateAudit.satisfied === best.audit.satisfied
                        && candidateAudit.averageSides > best.audit.averageSides + 0.0001)
                    || (candidateAudit.satisfied === best.audit.satisfied
                        && Math.abs(candidateAudit.averageSides - best.audit.averageSides) < 0.0001
                        && heightIncrease < best.heightIncrease)) {
                    best = { placements: candidate, audit: candidateAudit, threshold, heightIncrease };
                }
            });
            if (!best || (best.audit.satisfied <= audit.satisfied
                && best.audit.averageSides <= audit.averageSides + 0.0001)) break;
            result = best.placements;
            audit = best.audit;
            // L'inserimento di una fascia sposta anche gli anchor appartenenti
            // alle tessere sottostanti. Le loro regioni protette devono restare
            // solidali alle immagini che le hanno generate.
            anchors = anchors.map((anchor) => {
                if (anchor.y < best.threshold - 0.0001) return anchor;
                return {
                    ...anchor,
                    y: anchor.y + bandDepth,
                    regions: Array.isArray(anchor.regions)
                        ? anchor.regions.map((region) => ({ ...region, y: region.y + bandDepth }))
                        : undefined,
                };
            });
            const bandRegion = {
                x: 0,
                y: best.threshold,
                width: settings.containerWidth,
                height: bandDepth,
            };
            anchors.push({
                ...bandRegion,
                side: 'horizontal-band',
                area: bandArea,
                regions: [bandRegion],
            });
            anchorArea += bandArea;
        }
        return { placements: result, anchors, anchorArea, audit };
    };

    const anchoredCandidate = (state, candidate, settings, ownerId) => {
        const extra = settings.usefulSpaceDepth;
        const baseEnd = candidate.x + candidate.width
            + (candidate.x + candidate.width < settings.containerWidth - 0.0001 ? settings.gap : 0);
        let footprintStart = candidate.x;
        let footprintEnd = baseEnd;
        let side = 'right';
        if (footprintEnd + extra <= settings.containerWidth + 0.0001) {
            footprintEnd += extra;
        } else if (footprintStart - extra >= -0.0001) {
            footprintStart -= extra;
            side = 'left';
        } else {
            return null;
        }
        const y = heightAt(state.skyline, footprintStart, footprintEnd);
        const anchorArea = extra * (candidate.width + candidate.height + settings.gap + extra);
        if (state.anchorArea + anchorArea > settings.usefulAnchorAreaLimit) return null;
        const sideRegion = side === 'right'
            ? {
                x: baseEnd,
                y,
                width: extra,
                height: candidate.height + settings.gap + extra,
            }
            : {
                x: footprintStart,
                y,
                width: extra,
                height: candidate.height + settings.gap + extra,
            };
        const bottomRegion = {
            x: footprintStart,
            y: y + candidate.height + settings.gap,
            width: footprintEnd - footprintStart,
            height: extra,
        };
        return {
            ...candidate,
            y,
            skyline: updateSkyline(
                state.skyline,
                footprintStart,
                footprintEnd,
                y + candidate.height + settings.gap + extra
            ),
            layoutHeight: Math.max(state.height, y + candidate.height),
            usefulAnchor: {
                x: footprintStart,
                y,
                width: footprintEnd - footprintStart,
                height: candidate.height + settings.gap + extra,
                side,
                area: anchorArea,
                ownerId,
                // Il footprint continua a guidare la skyline; il bilanciamento
                // usa invece soltanto le due strisce di vuoto effettive, che
                // non si sovrappongono alla tessera proprietaria.
                regions: [sideRegion, bottomRegion],
            },
        };
    };

    const layoutHeight = (placements) => placements.reduce(
        (height, placement) => Math.max(height, placement.y + placement.height),
        0
    );

    const layoutArea = (placements) => placements.reduce(
        (area, placement) => area + placement.width * placement.height,
        0
    );

    const tailScore = (placements, settings, orderPenalty) => {
        const height = Math.max(1, layoutHeight(placements));
        const area = layoutArea(placements);
        const voidRatio = clamp((settings.containerWidth * height - area) / (settings.containerWidth * height), 0, 1);
        const pressure = settings.compactionPressure;
        return height / settings.containerWidth * (0.55 + pressure * 0.45)
            + voidRatio * (0.8 + pressure * 1.7)
            + orderPenalty * 0.035;
    };

    const packTailRows = (fixed, tail, settings) => {
        const packed = fixed.map((placement) => ({ ...placement }));
        let y = fixed.length > 0 ? layoutHeight(fixed) + settings.gap : 0;
        const rowSize = Math.max(2, Math.min(4, settings.targetColumns));
        for (let offset = 0; offset < tail.length; offset += rowSize) {
            const row = tail.slice(offset, offset + rowSize);
            const aspects = row.map((entry) => aspectOf(entry.item));
            const usableWidth = settings.containerWidth - settings.gap * Math.max(0, row.length - 1);
            const maximumTileWidth = settings.containerWidth * settings.maxItemWidthRatio;
            const naturalHeight = usableWidth / Math.max(0.2, aspects.reduce((sum, aspect) => sum + aspect, 0));
            let height = clamp(naturalHeight, settings.targetHeight * 0.55, settings.targetHeight * 1.25);
            const rawWidth = aspects.reduce((sum, aspect) => sum + aspect * height, 0);
            if (rawWidth > usableWidth) height *= usableWidth / rawWidth;
            const widthLimitedHeight = Math.min(...aspects.map((aspect) => maximumTileWidth / aspect));
            height = Math.min(height, widthLimitedHeight);
            const packedWidth = aspects.reduce((sum, aspect) => sum + aspect * height, 0)
                + settings.gap * Math.max(0, row.length - 1);
            let x = Math.max(0, (settings.containerWidth - packedWidth) / 2);
            row.forEach((entry, index) => {
                const width = aspects[index] * height;
                packed.push({
                    ...entry.placement,
                    x,
                    y,
                    width,
                    height,
                    crop: false,
                });
                x += width + settings.gap;
            });
            y += height + settings.gap;
        }
        return packed;
    };

    const tailBandCount = (placements, tail, settings) => {
        const tailIds = new Set(tail.map((entry) => String(entry.placement.id)));
        const tolerance = Math.max(2, settings.targetHeight * 0.08);
        const tops = placements
            .filter((placement) => tailIds.has(String(placement.id)))
            .map((placement) => placement.y)
            .sort((left, right) => left - right);
        const bands = [];
        tops.forEach((top) => {
            if (bands.length === 0 || Math.abs(top - bands[bands.length - 1]) > tolerance) {
                bands.push(top);
            }
        });
        return bands.length;
    };

    /**
     * Riapre esclusivamente la coda della composizione. A differenza della
     * skyline, questa fase conserva i rettangoli reali e può quindi usare
     * cavità ancora accessibili. I vuoti locali restano ammessi: lo scopo è
     * evitare la dispersione verticale degli ultimi elementi.
     */
    const compactTail = (placements, source, settings) => {
        if (settings.tailCount <= 0) return placements;
        const count = Math.min(
            Math.max(2, Math.round(settings.tailCount * (0.5 + settings.compactionPressure * 0.5))),
            Math.max(0, placements.length - 1)
        );
        if (count < 2) return placements;
        const fixed = placements.slice(0, -count).map((placement) => ({ ...placement }));
        const tail = placements.slice(-count).map((placement) => ({
            placement,
            item: source.find((item) => String(item.id) === String(placement.id)),
        })).filter((entry) => entry.item);
        if (tail.length < 2) return placements;

        let states = [{ placed: fixed, remaining: tail, orderPenalty: 0 }];
        for (let step = 0; step < tail.length; step += 1) {
            const expanded = [];
            states.forEach((state) => {
                state.remaining.forEach((entry, entryIndex) => {
                    const aspect = aspectOf(entry.item);
                    const nominal = nominalWidth(entry.item, settings);
                    const tolerance = settings.tailScaleTolerance
                        * (0.35 + settings.compactionPressure * 0.65);
                    const minimum = Math.max(settings.targetHeight * 0.24, nominal * (1 - tolerance));
                    const maximum = Math.min(
                        settings.containerWidth * settings.maxItemWidthRatio,
                        nominal * (1 + tolerance)
                    );
                    const occupied = state.placed;
                    const xEdges = uniqueNumbers([
                        0,
                        ...occupied.map((item) => item.x),
                        ...occupied.map((item) => item.x + item.width + settings.gap),
                    ]);
                    const yEdges = uniqueNumbers([
                        0,
                        ...occupied.map((item) => item.y),
                        ...occupied.map((item) => item.y + item.height + settings.gap),
                    ]);
                    const widths = uniqueNumbers([
                        entry.placement.width,
                        nominal,
                        nominal * (1 - tolerance),
                        nominal * (1 + tolerance),
                        ...xEdges.flatMap((start) => xEdges.map((end) => end - start - settings.gap)),
                        ...xEdges.map((start) => settings.containerWidth - start),
                    ]).filter((width) => width >= minimum - 0.001 && width <= maximum + 0.001);
                    const candidates = [];
                    widths.forEach((width) => {
                        const height = width / aspect;
                        const starts = uniqueNumbers([
                            ...xEdges,
                            ...occupied.map((item) => item.x - width - settings.gap),
                        ]).filter((x) => x >= -0.0001 && x + width <= settings.containerWidth + 0.0001);
                        const tops = uniqueNumbers([
                            ...yEdges,
                            ...occupied.map((item) => item.y + item.height - height),
                        ]).filter((y) => y >= -0.0001);
                        starts.forEach((x) => tops.forEach((y) => {
                            const candidate = { x: Math.max(0, x), y: Math.max(0, y), width, height };
                            if (!collides(candidate, occupied, settings.gap)) candidates.push(candidate);
                        }));
                    });
                    candidates
                        .sort((left, right) => {
                            const leftHeight = Math.max(layoutHeight(occupied), left.y + left.height);
                            const rightHeight = Math.max(layoutHeight(occupied), right.y + right.height);
                            if (Math.abs(leftHeight - rightHeight) > 0.001) return leftHeight - rightHeight;
                            if (Math.abs(left.y - right.y) > 0.001) return left.y - right.y;
                            return left.x - right.x;
                        })
                        .slice(0, settings.tailCandidatesPerItem)
                        .forEach((candidate) => {
                            const remaining = state.remaining.slice();
                            remaining.splice(entryIndex, 1);
                            const nextPlacement = {
                                ...entry.placement,
                                ...candidate,
                                crop: false,
                            };
                            const next = {
                                placed: occupied.concat(nextPlacement),
                                remaining,
                                orderPenalty: state.orderPenalty + entryIndex,
                            };
                            next.score = tailScore(next.placed, settings, next.orderPenalty);
                            expanded.push(next);
                        });
                });
            });
            expanded.sort((left, right) => left.score - right.score);
            states = expanded.slice(0, Math.max(8, Math.min(settings.beamWidth, settings.tailBeamWidth)));
            if (states.length === 0) return placements;
        }
        const best = states.sort((left, right) => left.score - right.score)[0];
        const rowPacked = packTailRows(fixed, tail, settings);
        const alternatives = [
            { placements, score: tailScore(placements, settings, 0) },
            { placements: rowPacked, score: tailScore(rowPacked, settings, 0) },
        ];
        if (best) alternatives.push({
            placements: best.placed,
            score: tailScore(best.placed, settings, best.orderPenalty),
        });
        alternatives.sort((left, right) => left.score - right.score);
        const selected = alternatives[0].placements;
        const expectedBands = Math.ceil(tail.length / Math.max(2, Math.min(4, settings.targetColumns)));

        // La metrica globale può preferire cavità sparse, perché riducono
        // formalmente l'altezza complessiva pur lasciando la coda "a cascata".
        // Per la chiusura della galleria diamo invece precedenza percettiva a
        // poche fasce contigue: è il comportamento atteso dall'utente e rende
        // gli ultimi elementi leggibili come un unico gruppo.
        if (tailBandCount(selected, tail, settings) > expectedBands) {
            return rowPacked;
        }
        return selected;
    };

    /**
     * Ricompone le cavità accessibili dalla coda mediante spostamenti davvero
     * bidimensionali. Gli assestamenti successivi lavorano su un solo asse per
     * volta e non possono quindi trasferire una tessera in un corridoio posto
     * contemporaneamente più in alto e lateralmente.
     *
     * Una tessera può ingrandirsi per occupare una cavità, ma conserva sempre
     * le proprie proporzioni e resta entro il limite dedicato. Ogni candidato
     * nasce dagli spigoli reali degli elementi già collocati e viene validato
     * con lo stesso padding del resto del motore. Si accettano esclusivamente
     * miglioramenti dell'altezza complessiva o della dispersione della coda.
     */
    const compactCavities = (placements, settings, source = []) => {
        if (settings.compactionPressure <= 0.01) return placements;
        if (settings.harmonicSpaces && settings.compactionPressure <= 0.15) return placements;
        const baseMovableCount = Math.max(2, settings.tailCount * 2, Math.ceil(placements.length * 0.4));
        const movableCount = Math.min(
            Math.max(2, Math.round(baseMovableCount * (0.25 + settings.compactionPressure * 0.75))),
            14,
            Math.max(0, placements.length - 1)
        );
        if (movableCount < 2) return placements;

        let result = placements.map((placement) => ({ ...placement }));
        const movableIds = new Set(result
            .slice()
            .sort((left, right) => (right.sourceIndex ?? 0) - (left.sourceIndex ?? 0))
            .slice(0, movableCount)
            .map((placement) => String(placement.id)));
        const sourceById = new Map(source.map((item) => [String(item.id), item]));
        const score = (candidate) => {
            const height = layoutHeight(candidate);
            const tailDispersion = candidate.reduce((sum, placement) => (
                movableIds.has(String(placement.id))
                    ? sum + placement.y / Math.max(1, settings.targetHeight)
                    : sum
            ), 0);
            const occupiedArea = layoutArea(candidate);
            const voidRatio = clamp(
                (settings.containerWidth * Math.max(1, height) - occupiedArea)
                / (settings.containerWidth * Math.max(1, height)),
                0,
                1
            );
            const pressure = settings.compactionPressure;
            return height * (25 + pressure * 75)
                + tailDispersion * (0.3 + pressure * 0.7)
                + voidRatio * settings.targetHeight * (0.2 + pressure * 0.8);
        };

        const maximumPasses = Math.max(1, Math.round(movableCount * (0.5 + settings.compactionPressure * 1.5)));
        for (let pass = 0; pass < maximumPasses; pass += 1) {
            const currentScore = score(result);
            let best = null;

            result.forEach((item, itemIndex) => {
                if (!movableIds.has(String(item.id))) return;
                const occupied = result.filter((placement, index) => index !== itemIndex);
                const sourceItem = sourceById.get(String(item.id));
                const aspect = sourceItem ? aspectOf(sourceItem) : item.width / Math.max(1, item.height);
                const tolerance = clamp(Number(settings.tailScaleTolerance) || 0.2, 0, 0.45)
                    * (0.35 + settings.compactionPressure * 0.65);
                const expansion = clamp(
                    settings.cavityExpansionRatio !== undefined
                        ? Number(settings.cavityExpansionRatio)
                        : 1,
                    0,
                    1.5
                ) * (0.2 + settings.compactionPressure * 0.8);
                const sourceNominalWidth = sourceItem ? nominalWidth(sourceItem, settings) : item.width;
                const minimumWidth = Math.max(
                    settings.targetHeight * 0.24,
                    settings.containerWidth * 0.16,
                    sourceNominalWidth * (1 - tolerance),
                    item.width * (1 - tolerance)
                );
                const maximumWidth = Math.min(
                    settings.containerWidth * settings.maxItemWidthRatio,
                    Math.max(
                        item.width * (1 + tolerance),
                        sourceNominalWidth * (1 + expansion)
                    )
                );
                const xEdges = uniqueNumbers([
                    0,
                    settings.containerWidth,
                    ...occupied.map((placement) => placement.x),
                    ...occupied.map((placement) => placement.x + placement.width + settings.gap),
                ]);
                const yEdges = uniqueNumbers([
                    0,
                    ...occupied.map((placement) => placement.y),
                    ...occupied.map((placement) => placement.y + placement.height + settings.gap),
                ]);
                const widths = uniqueNumbers([
                    item.width,
                    sourceNominalWidth,
                    minimumWidth,
                    maximumWidth,
                    ...xEdges.flatMap((start) => xEdges.map((end) => end - start - settings.gap)),
                    ...yEdges.flatMap((start) => yEdges.map((end) => (end - start - settings.gap) * aspect)),
                ]).filter((width) => width >= minimumWidth - 0.001 && width <= maximumWidth + 0.001);

                widths.forEach((width) => {
                    const height = width / aspect;
                    const xCandidates = uniqueNumbers([
                        0,
                        settings.containerWidth - width,
                        ...occupied.map((placement) => placement.x),
                        ...occupied.map((placement) => placement.x + placement.width + settings.gap),
                        ...occupied.map((placement) => placement.x - width - settings.gap),
                        ...occupied.map((placement) => placement.x + placement.width - width),
                    ]).filter((x) => x >= -0.0001
                        && x + width <= settings.containerWidth + 0.0001);
                    const yCandidates = uniqueNumbers([
                        0,
                        ...occupied.map((placement) => placement.y),
                        ...occupied.map((placement) => placement.y + placement.height + settings.gap),
                        ...occupied.map((placement) => placement.y - height - settings.gap),
                        ...occupied.map((placement) => placement.y + placement.height - height),
                    ]).filter((y) => y >= -0.0001 && y < item.y - 0.5);

                    xCandidates.forEach((x) => yCandidates.forEach((y) => {
                    const moved = { ...item, x: Math.max(0, x), y: Math.max(0, y), width, height };
                    if (collides(moved, occupied, settings.gap)) return;
                    const candidate = result.slice();
                    candidate[itemIndex] = moved;
                    const candidateScore = score(candidate);
                    if (candidateScore >= currentScore - 0.001) return;
                    const displacement = Math.abs(moved.x - item.x) + Math.abs(moved.y - item.y);
                    if (!best || candidateScore < best.score - 0.001
                        || (Math.abs(candidateScore - best.score) < 0.001
                            && displacement < best.displacement)) {
                        best = { placements: candidate, score: candidateScore, displacement };
                    }
                }));
                });
            });

            if (!best) break;
            result = best.placements;
        }
        return result;
    };

    /**
     * Ripartisce un disavanzo verticale quando esistono già un limite sopra
     * e uno sotto. Ogni spostamento viene verificato contro i rettangoli
     * correnti, perciò padding e assenza di sovrapposizioni restano invariati.
     */
    const balanceVertical = (placements, options) => {
        const gap = Math.max(0, Number(options && options.gap) || 0);
        const minimum = Math.max(0, Number(options && options.minimum) || 4);
        const maximumRatio = clamp(Number(options && options.maximumRatio) || 1, 0, 1);
        const result = placements.map((placement) => ({ ...placement }));
        const obstacles = Array.isArray(options && options.obstacles)
            ? options.obstacles.map((obstacle) => ({ ...obstacle, protectedVoid: true }))
            : [];
        const containerHeight = finitePositive(
            options && options.containerHeight,
            layoutHeight(result)
        );
        result
            .slice()
            .sort((left, right) => left.y - right.y)
            .forEach((ordered) => {
                const index = result.findIndex((placement) => String(placement.id) === String(ordered.id));
                const item = result[index];
                const occupied = result.filter((placement, otherIndex) => otherIndex !== index);
                const overlapping = occupied.filter((placement) => horizontalOverlap(item, placement))
                    .concat(obstacles.filter((obstacle) => horizontalOverlap(item, obstacle)));
                const clearance = (placement) => (placement.protectedVoid ? 0 : gap);
                const above = overlapping.filter((placement) => (
                    placement.y + placement.height + clearance(placement) <= item.y + 0.0001
                ));
                const below = overlapping.filter((placement) => (
                    placement.y >= item.y + item.height + clearance(placement) - 0.0001
                ));
                if (above.length === 0 && below.length === 0) return;
                // Per le tessere verticali anche i bordi superiore e inferiore
                // sono limiti reali del corridoio. In questo modo una foto corta
                // nella prima o ultima fascia ripartisce il vuoto sui due lati,
                // invece di restare ancorata al bordo alto.
                const isPortrait = item.height > item.width + 0.0001;
                if (!isPortrait && (above.length === 0 || below.length === 0)) return;
                const upper = above.length > 0
                    ? Math.max(...above.map((placement) => (
                        placement.y + placement.height + clearance(placement)
                    )))
                    : 0;
                const lower = below.length > 0
                    ? Math.min(...below.map((placement) => placement.y - clearance(placement)))
                    : containerHeight;
                const surplus = lower - upper - item.height;
                if (surplus < minimum) return;
                const ideal = upper + surplus / 2;
                const maximumShift = item.height * maximumRatio;
                const nextY = clamp(ideal, item.y - maximumShift, item.y + maximumShift);
                const candidate = { ...item, y: nextY };
                if (!collides(candidate, occupied, gap)
                    && !collides(candidate, obstacles, 0)) {
                    result[index] = candidate;
                }
            });
        return result;
    };

    /**
     * Centra ogni tessera nel corridoio orizzontale realmente libero alla
     * sua quota. I bordi del contenitore sono limiti validi; gli elementi
     * che si sovrappongono verticalmente diventano invece ostacoli. Come per
     * l'assestamento verticale, ogni proposta viene accettata soltanto se non
     * produce collisioni.
     */
    const balanceHorizontal = (placements, options) => {
        const gap = Math.max(0, Number(options && options.gap) || 0);
        const minimum = Math.max(0, Number(options && options.minimum) || 4);
        const maximumRatio = clamp(Number(options && options.maximumRatio) || 1, 0, 1);
        const containerWidth = finitePositive(options && options.containerWidth, 1);
        const result = placements.map((placement) => ({ ...placement }));
        const obstacles = Array.isArray(options && options.obstacles)
            ? options.obstacles.map((obstacle) => ({ ...obstacle, protectedVoid: true }))
            : [];
        const clearance = (placement) => (placement.protectedVoid ? 0 : gap);
        const verticalCrosses = (item, placement) => (
            item.y < placement.y + placement.height - 0.0001
            && item.y + item.height > placement.y + 0.0001
        );
        const horizontalBlockerCount = (item) => {
            const crossing = result.filter((placement) => String(placement.id) !== String(item.id)
                && verticalCrosses(item, placement))
                .concat(obstacles.filter((obstacle) => verticalCrosses(item, obstacle)));
            const hasLeft = crossing.some((placement) => (
                placement.x + placement.width + clearance(placement) <= item.x + 0.0001
            ));
            const hasRight = crossing.some((placement) => (
                placement.x >= item.x + item.width + clearance(placement) - 0.0001
            ));
            return Number(hasLeft) + Number(hasRight);
        };
        result
            .slice()
            // Prima le tessere interne, perché possiedono due riferimenti
            // reali. I bordi vengono assestati in seguito sul risultato già
            // stabilizzato e non trascinano il centro della fascia.
            .sort((left, right) => horizontalBlockerCount(right) - horizontalBlockerCount(left)
                || left.y - right.y || left.x - right.x)
            .forEach((ordered) => {
                const index = result.findIndex((placement) => String(placement.id) === String(ordered.id));
                const item = result[index];
                const occupied = result.filter((placement, otherIndex) => otherIndex !== index);
                const crossing = occupied.filter((placement) => verticalCrosses(item, placement))
                    .concat(obstacles.filter((obstacle) => verticalCrosses(item, obstacle)));
                const leftItems = crossing.filter((placement) => (
                    placement.x + placement.width + clearance(placement) <= item.x + 0.0001
                ));
                const rightItems = crossing.filter((placement) => (
                    placement.x >= item.x + item.width + clearance(placement) - 0.0001
                ));
                const left = leftItems.length > 0
                    ? Math.max(...leftItems.map((placement) => (
                        placement.x + placement.width + clearance(placement)
                    )))
                    : 0;
                const right = rightItems.length > 0
                    ? Math.min(...rightItems.map((placement) => placement.x - clearance(placement)))
                    : containerWidth;
                const surplus = right - left - item.width;
                if (surplus < minimum) return;
                const ideal = left + surplus / 2;
                const maximumShift = item.width * maximumRatio;
                const nextX = clamp(ideal, item.x - maximumShift, item.x + maximumShift);
                const candidate = { ...item, x: clamp(nextX, 0, containerWidth - item.width) };
                if (!collides(candidate, occupied, gap)
                    && !collides(candidate, obstacles, 0)) {
                    result[index] = candidate;
                }
            });
        return result;
    };

    /**
     * Bilanciamento dedicato a Useful spaces. Ogni passaggio legge una
     * fotografia immutabile del layout: le proposte non si rincorrono quindi
     * mentre vengono calcolate. Le correzioni dei due assi restano alternative,
     * tranne per il proprietario di un anchor: in quel caso viene tentata prima
     * una vera traslazione bidimensionale dentro il volume che gli era stato
     * riservato. Le proposte vengono applicate per guadagno decrescente, con
     * nuova verifica di collisioni, anchor altrui e audit dei lati utili.
     */
    const balanceUsefulSpacesFrozen = (placements, settings, sourceAnchors) => {
        let result = placements.map((placement) => ({ ...placement }));
        let anchors = sourceAnchors.map((anchor) => ({
            ...anchor,
            regions: Array.isArray(anchor.regions)
                ? anchor.regions.map((region) => ({ ...region }))
                : undefined,
        }));
        let audit = usefulSpaceAudit(result, settings);
        let acceptedPasses = 0;
        let centeringMovement = 0;
        const asymmetry = (first, second) => (
            Math.abs(first - second) / Math.max(1, first + second)
        );
        const belongsTo = (placement, item) => (
            placement.ownerId !== undefined
            && placement.ownerId !== null
            && String(placement.ownerId) === String(item.id)
        );
        const anchorRegions = (items) => items.flatMap((anchor, anchorIndex) => {
            const regions = Array.isArray(anchor.regions) && anchor.regions.length > 0
                ? anchor.regions
                : [{ x: anchor.x, y: anchor.y, width: anchor.width, height: anchor.height }];
            return regions.map((region, regionIndex) => ({
                ...region,
                id: `void-anchor-${anchorIndex}-${regionIndex}`,
                ownerId: anchor.ownerId ?? region.ownerId,
                protectedVoid: true,
            }));
        });
        const translateOwnedAnchors = (items, item, candidate) => {
            const dx = candidate.x - item.x;
            const dy = candidate.y - item.y;
            if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) return items;
            return items.map((anchor) => {
                if (!belongsTo(anchor, item)) return anchor;
                return {
                    ...anchor,
                    x: anchor.x + dx,
                    y: anchor.y + dy,
                    regions: Array.isArray(anchor.regions)
                        ? anchor.regions.map((region) => ({
                            ...region,
                            x: region.x + dx,
                            y: region.y + dy,
                        }))
                        : undefined,
                };
            });
        };
        const anchorsAreValid = (candidatePlacements, candidateAnchors) => {
            const voids = anchorRegions(candidateAnchors);
            if (voids.some((region) => (
                region.x < -0.0001
                || region.y < -0.0001
                || region.x + region.width > settings.containerWidth + 0.0001
            ))) return false;
            return !candidatePlacements.some((placement) => collides(
                placement,
                voids.filter((region) => !belongsTo(region, placement)),
                0
            ));
        };
        const clearance = (placement) => (placement.protectedVoid ? 0 : settings.gap);
        const residualWallCoverage = Math.min(settings.usefulSpaceCoverage, 0.25);
        const crossesVertically = (item, placement) => overlapLength(
            item.y,
            item.y + item.height,
            placement.y,
            placement.y + placement.height
        ) / Math.max(1, item.height) >= residualWallCoverage;
        const crossesHorizontally = (item, placement) => overlapLength(
            item.x,
            item.x + item.width,
            placement.x,
            placement.x + placement.width
        ) / Math.max(1, item.width) >= residualWallCoverage;
        const residualCells = (items, itemAnchors) => {
            const voids = anchorRegions(itemAnchors);
            const containerHeight = layoutHeight(items);
            return items.map((item, index) => {
                const occupied = items.filter((_, otherIndex) => otherIndex !== index);
                const foreignVoids = voids.filter((placement) => !belongsTo(placement, item));
                const obstacles = occupied.concat(foreignVoids);
                const horizontalCrossing = obstacles.filter((placement) => (
                    crossesVertically(item, placement)
                ));
                const leftItems = horizontalCrossing.filter((placement) => (
                    placement.x + placement.width + clearance(placement) <= item.x + 0.0001
                ));
                const rightItems = horizontalCrossing.filter((placement) => (
                    placement.x >= item.x + item.width + clearance(placement) - 0.0001
                ));
                const verticalCrossing = obstacles.filter((placement) => (
                    crossesHorizontally(item, placement)
                ));
                const above = verticalCrossing.filter((placement) => (
                    placement.y + placement.height + clearance(placement) <= item.y + 0.0001
                ));
                const below = verticalCrossing.filter((placement) => (
                    placement.y >= item.y + item.height + clearance(placement) - 0.0001
                ));
                const left = leftItems.length > 0
                    ? Math.max(...leftItems.map((placement) => (
                        placement.x + placement.width + clearance(placement)
                    )))
                    : 0;
                const right = rightItems.length > 0
                    ? Math.min(...rightItems.map((placement) => (
                        placement.x - clearance(placement)
                    )))
                    : settings.containerWidth;
                const top = above.length > 0
                    ? Math.max(...above.map((placement) => (
                        placement.y + placement.height + clearance(placement)
                    )))
                    : 0;
                const bottom = below.length > 0
                    ? Math.min(...below.map((placement) => (
                        placement.y - clearance(placement)
                    )))
                    : containerHeight;
                return {
                    id: item.id,
                    x: left,
                    y: top,
                    width: Math.max(0, right - left),
                    height: Math.max(0, bottom - top),
                    horizontalClosed: leftItems.length > 0 || rightItems.length > 0,
                    verticalClosed: above.length > 0 || below.length > 0,
                };
            });
        };

        /**
         * Trasforma le celle di calcolo, che possono sovrapporsi, in caselle
         * rettangolari esclusive. Per ogni conflitto si sottrae idealmente
         * mezzo margine di sicurezza dai due lati e si divide a meta lo spazio
         * residuo. La nuova mezzeria diventa la demarcazione comune.
         *
         * Le caselle vengono soltanto ristrette: contengono quindi sempre la
         * tessera che le ha generate e un conflitto risolto non puo riapparire
         * durante l'elaborazione delle coppie successive.
         */
        const exclusiveBoxes = (items, cells) => {
            const boxes = cells.map((cell) => ({ ...cell }));
            const halfGap = settings.gap / 2;
            const right = (rectangle) => rectangle.x + rectangle.width;
            const bottom = (rectangle) => rectangle.y + rectangle.height;
            const overlap = (firstStart, firstEnd, secondStart, secondEnd) => (
                Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart)
            );
            const trimRight = (box, boundary) => {
                box.width = Math.max(0, Math.min(right(box), boundary) - box.x);
            };
            const trimLeft = (box, boundary) => {
                const boxRight = right(box);
                box.x = Math.max(box.x, boundary);
                box.width = Math.max(0, boxRight - box.x);
            };
            const trimBottom = (box, boundary) => {
                box.height = Math.max(0, Math.min(bottom(box), boundary) - box.y);
            };
            const trimTop = (box, boundary) => {
                const boxBottom = bottom(box);
                box.y = Math.max(box.y, boundary);
                box.height = Math.max(0, boxBottom - box.y);
            };

            for (let firstIndex = 0; firstIndex < boxes.length; firstIndex += 1) {
                for (let secondIndex = firstIndex + 1; secondIndex < boxes.length; secondIndex += 1) {
                    const firstBox = boxes[firstIndex];
                    const secondBox = boxes[secondIndex];
                    const overlapX = overlap(firstBox.x, right(firstBox), secondBox.x, right(secondBox));
                    const overlapY = overlap(firstBox.y, bottom(firstBox), secondBox.y, bottom(secondBox));
                    if (overlapX <= 0.0001 || overlapY <= 0.0001) continue;

                    const firstItem = items[firstIndex];
                    const secondItem = items[secondIndex];
                    const firstBeforeSecond = firstItem.x + firstItem.width + settings.gap
                        <= secondItem.x + 0.0001;
                    const secondBeforeFirst = secondItem.x + secondItem.width + settings.gap
                        <= firstItem.x + 0.0001;
                    const firstAboveSecond = firstItem.y + firstItem.height + settings.gap
                        <= secondItem.y + 0.0001;
                    const secondAboveFirst = secondItem.y + secondItem.height + settings.gap
                        <= firstItem.y + 0.0001;
                    const separatedHorizontally = firstBeforeSecond || secondBeforeFirst;
                    const separatedVertically = firstAboveSecond || secondAboveFirst;
                    if (!separatedHorizontally && !separatedVertically) continue;

                    // Se la coppia e separata su entrambi gli assi, si usa
                    // l'asse sul quale il conflitto pesa meno in proporzione
                    // alle due celle. Cosi si conserva la maggiore area utile.
                    const horizontalCost = overlapX
                        / Math.max(1, Math.min(firstBox.width, secondBox.width));
                    const verticalCost = overlapY
                        / Math.max(1, Math.min(firstBox.height, secondBox.height));
                    const splitHorizontally = separatedHorizontally
                        && (!separatedVertically || horizontalCost <= verticalCost);

                    if (splitHorizontally) {
                        const conflictStart = Math.max(firstBox.x, secondBox.x);
                        const conflictEnd = Math.min(right(firstBox), right(secondBox));
                        const conflictMiddle = (conflictStart + conflictEnd) / 2;
                        if (firstBeforeSecond) {
                            const minimum = firstItem.x + firstItem.width + halfGap;
                            const maximum = secondItem.x - halfGap;
                            const boundary = clamp(conflictMiddle, minimum, maximum);
                            trimRight(firstBox, boundary - halfGap);
                            trimLeft(secondBox, boundary + halfGap);
                        } else {
                            const minimum = secondItem.x + secondItem.width + halfGap;
                            const maximum = firstItem.x - halfGap;
                            const boundary = clamp(conflictMiddle, minimum, maximum);
                            trimRight(secondBox, boundary - halfGap);
                            trimLeft(firstBox, boundary + halfGap);
                        }
                    } else {
                        const conflictStart = Math.max(firstBox.y, secondBox.y);
                        const conflictEnd = Math.min(bottom(firstBox), bottom(secondBox));
                        const conflictMiddle = (conflictStart + conflictEnd) / 2;
                        if (firstAboveSecond) {
                            const minimum = firstItem.y + firstItem.height + halfGap;
                            const maximum = secondItem.y - halfGap;
                            const boundary = clamp(conflictMiddle, minimum, maximum);
                            trimBottom(firstBox, boundary - halfGap);
                            trimTop(secondBox, boundary + halfGap);
                        } else {
                            const minimum = secondItem.y + secondItem.height + halfGap;
                            const maximum = firstItem.y - halfGap;
                            const boundary = clamp(conflictMiddle, minimum, maximum);
                            trimBottom(secondBox, boundary - halfGap);
                            trimTop(firstBox, boundary + halfGap);
                        }
                    }
                }
            }
            return boxes.map((box, index) => ({
                ...box,
                id: items[index].id,
                calculationCell: cells[index],
            }));
        };

        const centerInExclusiveBoxes = (items, boxes) => items.map((item, index) => {
            const box = boxes[index];
            if (!box || box.width + 0.0001 < item.width || box.height + 0.0001 < item.height) {
                return item;
            }
            return {
                ...item,
                x: box.x + (box.width - item.width) / 2,
                y: box.y + (box.height - item.height) / 2,
            };
        });

        // Ogni passaggio ricostruisce la cella libera ortogonale di ciascuna
        // tessera. Una frontiera deve coprire almeno un quarto del lato: un
        // semplice contatto di spigolo non diventa una parete dell'intera cella.
        for (let pass = 0; pass < 6; pass += 1) {
            const snapshot = result.map((placement) => ({ ...placement }));
            const snapshotVoids = anchorRegions(anchors);
            const containerHeight = layoutHeight(snapshot);
            const proposals = [];

            snapshot.forEach((item, index) => {
                const occupied = snapshot.filter((_, otherIndex) => otherIndex !== index);
                const foreignVoids = snapshotVoids.filter((placement) => !belongsTo(placement, item));
                const obstacles = occupied.concat(foreignVoids);
                const itemProposals = [];

                const horizontalCrossing = obstacles.filter((placement) => (
                    crossesVertically(item, placement)
                ));
                const leftItems = horizontalCrossing.filter((placement) => (
                    placement.x + placement.width + clearance(placement) <= item.x + 0.0001
                ));
                const rightItems = horizontalCrossing.filter((placement) => (
                    placement.x >= item.x + item.width + clearance(placement) - 0.0001
                ));
                const left = leftItems.length > 0
                    ? Math.max(...leftItems.map((placement) => (
                        placement.x + placement.width + clearance(placement)
                    )))
                    : 0;
                const right = rightItems.length > 0
                    ? Math.min(...rightItems.map((placement) => (
                        placement.x - clearance(placement)
                    )))
                    : settings.containerWidth;
                const horizontalSurplus = right - left - item.width;
                // Both sides of the residual cell are real references. When
                // no crossing tile is present, the corresponding gallery edge
                // is the recognised neighbour of the outermost column.
                const horizontalCellClosed = Number.isFinite(left)
                    && Number.isFinite(right);
                if (horizontalCellClosed
                    && horizontalSurplus >= settings.horizontalBalanceMinimum) {
                    const ideal = left + horizontalSurplus / 2;
                    const maximumShift = item.width * settings.horizontalBalanceMaximumRatio;
                    const x = clamp(ideal, item.x - maximumShift, item.x + maximumShift);
                    const gain = asymmetry(item.x - left, right - item.x - item.width)
                        - asymmetry(x - left, right - x - item.width);
                    if (gain > 0.001 && Math.abs(x - item.x) >= 0.5) {
                        itemProposals.push({ id: item.id, axis: 'x', value: x, gain, index });
                    }
                }

                const verticalCrossing = obstacles.filter((placement) => (
                    crossesHorizontally(item, placement)
                ));
                const above = verticalCrossing.filter((placement) => (
                    placement.y + placement.height + clearance(placement) <= item.y + 0.0001
                ));
                const below = verticalCrossing.filter((placement) => (
                    placement.y >= item.y + item.height + clearance(placement) - 0.0001
                ));
                const upper = above.length > 0
                    ? Math.max(...above.map((placement) => (
                        placement.y + placement.height + clearance(placement)
                    )))
                    : 0;
                const lower = below.length > 0
                    ? Math.min(...below.map((placement) => (
                        placement.y - clearance(placement)
                    )))
                    : containerHeight;
                const verticalSurplus = lower - upper - item.height;
                // The top and bottom gallery edges play the same role for the
                // first and last visual rows. This lets an outer tile centre
                // between the gallery edge and the nearest crossing row.
                const verticalCellClosed = Number.isFinite(upper)
                    && Number.isFinite(lower);
                if (verticalCellClosed
                    && verticalSurplus >= settings.verticalBalanceMinimum) {
                    const ideal = upper + verticalSurplus / 2;
                    const maximumShift = item.height * settings.verticalBalanceMaximumRatio;
                    const y = clamp(ideal, item.y - maximumShift, item.y + maximumShift);
                    const gain = asymmetry(item.y - upper, lower - item.y - item.height)
                        - asymmetry(y - upper, lower - y - item.height);
                    if (gain > 0.001 && Math.abs(y - item.y) >= 0.5) {
                        itemProposals.push({ id: item.id, axis: 'y', value: y, gain, index });
                    }
                }

                const horizontalProposal = itemProposals.find((proposal) => proposal.axis === 'x');
                const verticalProposal = itemProposals.find((proposal) => proposal.axis === 'y');
                if (horizontalProposal && verticalProposal) {
                    proposals.push({
                        id: item.id,
                        axis: 'xy',
                        values: { x: horizontalProposal.value, y: verticalProposal.value },
                        gain: horizontalProposal.gain + verticalProposal.gain,
                        index,
                    });
                }
                proposals.push(...itemProposals);
            });

            const ordered = proposals.slice().sort((leftProposal, rightProposal) => (
                rightProposal.gain - leftProposal.gain
                || leftProposal.index - rightProposal.index
                || leftProposal.axis.localeCompare(rightProposal.axis)
            ));
            let accepted = 0;
            let passMovement = 0;
            const acceptedIds = new Set();
            ordered.forEach((proposal) => {
                const proposalId = String(proposal.id);
                if (acceptedIds.has(proposalId)) return;
                const index = result.findIndex((placement) => String(placement.id) === proposalId);
                if (index < 0) return;
                const item = result[index];
                const candidate = proposal.axis === 'xy'
                    ? { ...item, ...proposal.values }
                    : { ...item, [proposal.axis]: proposal.value };
                const occupied = result.filter((_, otherIndex) => otherIndex !== index);
                if (collides(candidate, occupied, settings.gap)) return;
                const candidatePlacements = result.slice();
                candidatePlacements[index] = candidate;
                const candidateAnchors = translateOwnedAnchors(anchors, item, candidate);
                if (!anchorsAreValid(candidatePlacements, candidateAnchors)) return;
                const candidateAudit = usefulSpaceAudit(candidatePlacements, settings);
                // Il vincolo binario fondamentale resta invariato: nessuna
                // tessera perde la condizione dei due lati utili. La media dei
                // lati puo invece redistribuirsi; congelarla impedirebbe proprio
                // il centramento dello spazio residuo fra tessere adiacenti.
                if (candidateAudit.satisfied < audit.satisfied) return;
                result = candidatePlacements;
                anchors = candidateAnchors;
                audit = candidateAudit;
                acceptedIds.add(proposalId);
                accepted += 1;
                passMovement += proposal.axis === 'xy'
                    ? Math.abs(proposal.values.x - item.x) + Math.abs(proposal.values.y - item.y)
                    : Math.abs(proposal.value - item[proposal.axis]);
            });
            if (accepted === 0) break;
            acceptedPasses += 1;
            centeringMovement += passMovement;
        }
        const calculationCells = residualCells(result, anchors);
        const spaceBoxes = exclusiveBoxes(result, calculationCells);
        const centred = centerInExclusiveBoxes(result, spaceBoxes);
        const centredAnchors = anchors.map((anchor) => {
            const ownerIndex = result.findIndex((item) => belongsTo(anchor, item));
            if (ownerIndex < 0) return anchor;
            const dx = centred[ownerIndex].x - result[ownerIndex].x;
            const dy = centred[ownerIndex].y - result[ownerIndex].y;
            return {
                ...anchor,
                x: anchor.x + dx,
                y: anchor.y + dy,
                regions: Array.isArray(anchor.regions)
                    ? anchor.regions.map((region) => ({
                        ...region,
                        x: region.x + dx,
                        y: region.y + dy,
                    }))
                    : undefined,
            };
        });
        const centredValidation = validateLayout({
            placements: centred,
            containerWidth: settings.containerWidth,
            containerHeight: layoutHeight(centred),
        }, settings.gap);
        const centredAudit = centredValidation.valid ? usefulSpaceAudit(centred, settings) : null;
        const acceptsCaselle = centredValidation.valid
            && anchorsAreValid(centred, centredAnchors);
        if (acceptsCaselle) {
            centeringMovement += centred.reduce((sum, item, index) => (
                sum + Math.abs(item.x - result[index].x) + Math.abs(item.y - result[index].y)
            ), 0);
            result = centred;
            anchors = centredAnchors;
            audit = centredAudit;
        }
        return {
            placements: result,
            anchors,
            audit,
            acceptedPasses,
            centeringMovement,
            // These are deliberately the frozen cells and boxes used by the
            // simultaneous final centring. Recalculating them after movement
            // would describe a different geometry and would make a correctly
            // centred tile appear off-centre in the diagnostic overlay.
            calculationCells,
            spaceCells: spaceBoxes,
        };
    };

    /**
     * Ripartizione finale e simultanea dello spazio residuo. I bordi di immagini,
     * anchor e contenitore formano una griglia compressa; ogni rettangolo vuoto
     * viene assegnato alla tessera geometricamente piu vicina. Ne risultano
     * territori ortogonali disgiunti, anche a gradini, dentro i quali tutte le
     * tessere vengono centrate nello stesso istante.
     */
    const balanceUsefulSpacesPartitioned = (placements, settings, sourceAnchors) => {
        const original = placements.map((placement) => ({ ...placement }));
        const anchors = sourceAnchors.map((anchor) => ({
            ...anchor,
            regions: Array.isArray(anchor.regions)
                ? anchor.regions.map((region) => ({ ...region }))
                : undefined,
        }));
        const originalAudit = usefulSpaceAudit(original, settings);
        const containerHeight = layoutHeight(original);
        const ownerIndex = new Map(original.map((placement, index) => [String(placement.id), index]));
        const anchorRegions = anchors.flatMap((anchor) => {
            const regions = Array.isArray(anchor.regions) && anchor.regions.length > 0
                ? anchor.regions
                : [{ x: anchor.x, y: anchor.y, width: anchor.width, height: anchor.height }];
            return regions.map((region) => ({
                ...region,
                owner: ownerIndex.get(String(anchor.ownerId ?? region.ownerId)),
            }));
        });
        const uniqueCoordinates = (values) => {
            const sorted = values
                .filter(Number.isFinite)
                .map((value) => Math.round(value * 10000) / 10000)
                .sort((left, right) => left - right)
                .filter((value, index, items) => index === 0 || Math.abs(value - items[index - 1]) > 0.0001);
            const result = [];
            sorted.forEach((value, index) => {
                if (index > 0) {
                    const previous = sorted[index - 1];
                    if (value - previous > 0.5) result.push((previous + value) / 2);
                }
                result.push(value);
            });
            return result;
        };
        const xCoordinates = uniqueCoordinates([
            0,
            settings.containerWidth,
            ...original.flatMap((item) => [item.x, item.x + item.width]),
            ...anchorRegions.flatMap((region) => [region.x, region.x + region.width]),
        ]);
        const yCoordinates = uniqueCoordinates([
            0,
            containerHeight,
            ...original.flatMap((item) => [item.y, item.y + item.height]),
            ...anchorRegions.flatMap((region) => [region.y, region.y + region.height]),
        ]);
        const columns = Math.max(0, xCoordinates.length - 1);
        const rows = Math.max(0, yCoordinates.length - 1);
        const owners = new Int16Array(columns * rows);
        owners.fill(-1);
        const containsPoint = (rectangle, x, y) => (
            x >= rectangle.x - 0.0001
            && x <= rectangle.x + rectangle.width + 0.0001
            && y >= rectangle.y - 0.0001
            && y <= rectangle.y + rectangle.height + 0.0001
        );
        const distanceSquared = (rectangle, x, y) => {
            const dx = x < rectangle.x
                ? rectangle.x - x
                : (x > rectangle.x + rectangle.width ? x - rectangle.x - rectangle.width : 0);
            const dy = y < rectangle.y
                ? rectangle.y - y
                : (y > rectangle.y + rectangle.height ? y - rectangle.y - rectangle.height : 0);
            return dx * dx + dy * dy;
        };
        const cellIndex = (column, row) => row * columns + column;
        const overlapsRectangle = (left, right) => !(
            left.x + left.width <= right.x + 0.0001
            || right.x + right.width <= left.x + 0.0001
            || left.y + left.height <= right.y + 0.0001
            || right.y + right.height <= left.y + 0.0001
        );

        for (let row = 0; row < rows; row += 1) {
            const centerY = (yCoordinates[row] + yCoordinates[row + 1]) / 2;
            for (let column = 0; column < columns; column += 1) {
                const centerX = (xCoordinates[column] + xCoordinates[column + 1]) / 2;
                let owner = original.findIndex((item) => containsPoint(item, centerX, centerY));
                if (owner < 0) {
                    const reserved = anchorRegions.find((region) => containsPoint(region, centerX, centerY));
                    if (reserved) owner = Number.isInteger(reserved.owner) ? reserved.owner : -2;
                }
                if (owner === -1) {
                    let bestDistance = Infinity;
                    original.forEach((item, index) => {
                        const distance = distanceSquared(item, centerX, centerY);
                        if (distance < bestDistance - 0.0001
                            || (Math.abs(distance - bestDistance) < 0.0001 && index < owner)) {
                            owner = index;
                            bestDistance = distance;
                        }
                    });
                }
                owners[cellIndex(column, row)] = owner;
            }
        }

        const regionsByOwner = Array.from({ length: original.length }, () => []);
        let activeRuns = new Map();
        for (let row = 0; row < rows; row += 1) {
            const nextRuns = new Map();
            let column = 0;
            while (column < columns) {
                const owner = owners[cellIndex(column, row)];
                const start = column;
                while (column + 1 < columns && owners[cellIndex(column + 1, row)] === owner) column += 1;
                const key = `${owner}:${start}:${column + 1}`;
                const previous = activeRuns.get(key);
                const rectangle = previous
                    ? { ...previous, height: yCoordinates[row + 1] - previous.y }
                    : {
                        owner,
                        x: xCoordinates[start],
                        y: yCoordinates[row],
                        width: xCoordinates[column + 1] - xCoordinates[start],
                        height: yCoordinates[row + 1] - yCoordinates[row],
                    };
                nextRuns.set(key, rectangle);
                column += 1;
            }
            activeRuns.forEach((rectangle, key) => {
                if (!nextRuns.has(key) && rectangle.owner >= 0) regionsByOwner[rectangle.owner].push(rectangle);
            });
            activeRuns = nextRuns;
        }
        activeRuns.forEach((rectangle) => {
            if (rectangle.owner >= 0) regionsByOwner[rectangle.owner].push(rectangle);
        });

        const statistics = regionsByOwner.map((regions) => regions.reduce((summary, region) => {
            const area = region.width * region.height;
            return {
                area: summary.area + area,
                weightedX: summary.weightedX + (region.x + region.width / 2) * area,
                weightedY: summary.weightedY + (region.y + region.height / 2) * area,
            };
        }, { area: 0, weightedX: 0, weightedY: 0 }));
        const fitsTerritory = (candidate, owner) => {
            if (anchorRegions.some((region) => overlapsRectangle(candidate, region))) return false;
            // Meta del padding rimane su ciascun lato della frontiera comune:
            // due tessere centrate nei rispettivi territori conservano quindi
            // sempre l'intero gap, senza dipendere dall'ordine degli spostamenti.
            const halfGap = settings.gap / 2;
            const protectedCandidate = {
                x: Math.max(0, candidate.x - halfGap),
                y: Math.max(0, candidate.y - halfGap),
                width: Math.min(settings.containerWidth, candidate.x + candidate.width + halfGap)
                    - Math.max(0, candidate.x - halfGap),
                height: Math.min(containerHeight, candidate.y + candidate.height + halfGap)
                    - Math.max(0, candidate.y - halfGap),
            };
            for (let row = 0; row < rows; row += 1) {
                if (yCoordinates[row + 1] <= protectedCandidate.y + 0.0001
                    || yCoordinates[row] >= protectedCandidate.y + protectedCandidate.height - 0.0001) continue;
                for (let column = 0; column < columns; column += 1) {
                    if (xCoordinates[column + 1] <= protectedCandidate.x + 0.0001
                        || xCoordinates[column] >= protectedCandidate.x + protectedCandidate.width - 0.0001) continue;
                    if (owners[cellIndex(column, row)] !== owner) return false;
                }
            }
            return true;
        };
        const targets = original.map((item, index) => {
            const statistic = statistics[index];
            if (!statistic || statistic.area <= 0) return item;
            const desiredX = clamp(
                statistic.weightedX / statistic.area - item.width / 2,
                0,
                settings.containerWidth - item.width
            );
            const desiredY = clamp(
                statistic.weightedY / statistic.area - item.height / 2,
                0,
                Math.max(0, containerHeight - item.height)
            );
            let accepted = item;
            let lower = 0;
            let upper = 1;
            for (let step = 0; step < 6; step += 1) {
                const ratio = (lower + upper) / 2;
                const candidate = {
                    ...item,
                    x: item.x + (desiredX - item.x) * ratio,
                    y: item.y + (desiredY - item.y) * ratio,
                };
                if (fitsTerritory(candidate, index)) {
                    accepted = candidate;
                    lower = ratio;
                } else {
                    upper = ratio;
                }
            }
            return accepted;
        });

        // Ogni vettore viene limitato rispetto alla geometria congelata. Cosi
        // una coppia gia separata dal solo padding non annulla il movimento di
        // tutte le altre tessere; l'applicazione resta comunque simultanea.
        const safeTargets = targets.map((target, index) => {
            const item = original[index];
            let accepted = item;
            let lower = 0;
            let upper = 1;
            for (let step = 0; step < 6; step += 1) {
                const ratio = (lower + upper) / 2;
                const moved = {
                    ...item,
                    x: item.x + (target.x - item.x) * ratio,
                    y: item.y + (target.y - item.y) * ratio,
                };
                const candidate = original.map((placement, placementIndex) => (
                    placementIndex === index ? moved : placement
                ));
                const geometryValid = validateLayout({
                    placements: candidate,
                    containerWidth: settings.containerWidth,
                    containerHeight,
                }, settings.gap).valid;
                const candidateAudit = geometryValid ? usefulSpaceAudit(candidate, settings) : null;
                const preservesUsefulSides = candidateAudit
                    && candidateAudit.sideCounts.every((count, auditIndex) => (
                        count >= originalAudit.sideCounts[auditIndex]
                    ));
                if (geometryValid && preservesUsefulSides) {
                    accepted = moved;
                    lower = ratio;
                } else {
                    upper = ratio;
                }
            }
            return accepted;
        });

        const candidateAt = (ratio) => original.map((item, index) => ({
            ...item,
            x: item.x + (safeTargets[index].x - item.x) * ratio,
            y: item.y + (safeTargets[index].y - item.y) * ratio,
        }));
        let result = original;
        let acceptedRatio = 0;
        for (let step = 16; step >= 1; step -= 1) {
            const ratio = step / 16;
            const candidate = candidateAt(ratio);
            const validation = validateLayout({
                placements: candidate,
                containerWidth: settings.containerWidth,
                containerHeight,
            }, settings.gap);
            const audit = usefulSpaceAudit(candidate, settings);
            const anchorsRemainEmpty = !candidate.some((item) => (
                anchorRegions.some((region) => overlapsRectangle(item, region))
            ));
            if (validation.valid && anchorsRemainEmpty && audit.satisfied >= originalAudit.satisfied) {
                result = candidate;
                acceptedRatio = ratio;
                break;
            }
        }
        const movement = result.reduce((sum, item, index) => (
            sum + Math.abs(item.x - original[index].x) + Math.abs(item.y - original[index].y)
        ), 0);

        const rawSegments = Array.from({ length: original.length }, () => []);
        const addSegment = (owner, x1, y1, x2, y2) => {
            if (owner >= 0) rawSegments[owner].push({ x1, y1, x2, y2 });
        };
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const owner = owners[cellIndex(column, row)];
                const x1 = xCoordinates[column];
                const x2 = xCoordinates[column + 1];
                const y1 = yCoordinates[row];
                const y2 = yCoordinates[row + 1];
                if (column === 0 || owners[cellIndex(column - 1, row)] !== owner) addSegment(owner, x1, y1, x1, y2);
                if (column === columns - 1 || owners[cellIndex(column + 1, row)] !== owner) addSegment(owner, x2, y1, x2, y2);
                if (row === 0 || owners[cellIndex(column, row - 1)] !== owner) addSegment(owner, x1, y1, x2, y1);
                if (row === rows - 1 || owners[cellIndex(column, row + 1)] !== owner) addSegment(owner, x1, y2, x2, y2);
            }
        }
        const frontiers = original.map((item, index) => ({
            id: item.id,
            regions: regionsByOwner[index].map(({ owner, ...region }) => region),
            segments: rawSegments[index],
            center: statistics[index].area > 0 ? {
                x: statistics[index].weightedX / statistics[index].area,
                y: statistics[index].weightedY / statistics[index].area,
            } : { x: item.x + item.width / 2, y: item.y + item.height / 2 },
        }));
        return {
            placements: result,
            anchors,
            audit: usefulSpaceAudit(result, settings),
            acceptedPasses: acceptedRatio > 0 && movement >= 0.5 ? 1 : 0,
            centeringMovement: movement,
            spaceFrontiers: frontiers,
        };
    };

    /**
     * Pianificatore incrementale bidimensionale. A differenza del vecchio
     * percorso a gruppi, selezione, dimensionamento e collocamento si
     * alternano dopo ogni tessera. In questo modo le immagini successive
     * possono occupare i gradini realmente presenti nella frontiera.
     */
    const placeAdaptive = (items, options) => {
        const planningStarted = clockNow();
        const input = Array.isArray(items) ? items : [];
        const settings = adaptiveSettings({ ...(options || {}), itemCount: input.length });
        const source = input.map((item, index) => ({
            ...item,
            id: item && item.id !== undefined ? item.id : index,
            sourceIndex: Number.isInteger(item && item.sourceIndex) ? item.sourceIndex : index,
        }));
        let states = [{
            remaining: source,
            skyline: [{ x: 0, end: settings.containerWidth, y: 0 }],
            placements: [],
            area: 0,
            height: 0,
            scalePenalty: 0,
            orderPenalty: 0,
            orientationPenalty: 0,
            rhythmPenalty: 0,
            usefulSpacePenalty: 0,
            voidAnchors: [],
            anchorArea: 0,
            lastOrientation: '',
            orientationRun: 0,
            lastWidthRatio: 0,
            lastXRatio: -1,
        }];

        const searchStarted = clockNow();
        for (let placed = 0; placed < source.length; placed += 1) {
            const expanded = [];
            states.forEach((state) => {
                const candidateIndexes = adaptiveCandidateIndexes(state, settings);
                const records = [];
                for (const candidateIndex of candidateIndexes) {
                    const item = state.remaining[candidateIndex];
                    adaptiveCandidates(state, item, settings).forEach((candidate) => {
                        records.push({
                            candidateIndex,
                            item,
                            candidate,
                            usefulSides: settings.usefulSpaces
                                // The still-open lower frontier is not native
                                // clearance: later tiles may consume it. Count
                                // only space that already exists in the plan.
                                ? usefulSideCount(candidate, state.placements, settings, state.height)
                                : 2,
                        });
                    });
                }

                let selectedRecords = records;
                if (settings.usefulSpaces) {
                    const nativeRecords = records.filter((record) => record.usefulSides >= 2);
                    if (nativeRecords.length > 0) {
                        selectedRecords = nativeRecords;
                    } else if (state.voidAnchors.length < settings.usefulAnchorLimit) {
                        const anchoredRecords = records
                            .slice()
                            .sort((left, right) => right.usefulSides - left.usefulSides
                                || left.candidate.y - right.candidate.y
                                || left.candidate.scalePenalty - right.candidate.scalePenalty
                                || left.candidateIndex - right.candidateIndex)
                            .slice(0, Math.min(8, settings.candidatesPerItem))
                            .map((record) => ({
                                ...record,
                                candidate: anchoredCandidate(state, record.candidate, settings, record.item.id),
                                usefulSides: 2,
                            }))
                            .filter((record) => record.candidate);
                        if (anchoredRecords.length > 0) selectedRecords = anchoredRecords;
                    }
                }

                selectedRecords.forEach(({ candidateIndex, item, candidate, usefulSides }) => {
                    const orientation = orientationOf(item);
                    const repeatsOrientation = orientation !== 'neutral'
                        && orientation === state.lastOrientation;
                    const reversesOrientation = orientation !== 'neutral'
                        && state.lastOrientation
                        && state.lastOrientation !== 'neutral'
                        && orientation !== state.lastOrientation;
                    const outsideOrdinaryWindow = candidateIndex >= settings.candidateWindow;
                    const remaining = state.remaining.slice();
                    remaining.splice(candidateIndex, 1);
                    const widthRatio = candidate.width / settings.containerWidth;
                    const xRatio = candidate.x / settings.containerWidth;
                    const repeatedWidth = state.lastWidthRatio > 0
                        && Math.abs(widthRatio - state.lastWidthRatio) < 0.055;
                    const repeatedColumn = state.lastXRatio >= 0
                        && Math.abs(xRatio - state.lastXRatio) < 0.035;
                    const anchor = candidate.usefulAnchor;
                    const next = {
                        remaining,
                        skyline: candidate.skyline,
                        placements: state.placements.concat({
                            id: item.id,
                            sourceIndex: item.sourceIndex,
                            x: candidate.x,
                            y: candidate.y,
                            width: candidate.width,
                            height: candidate.height,
                            crop: false,
                        }),
                        area: state.area + candidate.width * candidate.height,
                        height: candidate.layoutHeight,
                        scalePenalty: state.scalePenalty + candidate.scalePenalty,
                        orderPenalty: state.orderPenalty + (
                            settings.highReverseFactor && reversesOrientation && outsideOrdinaryWindow
                                ? Math.min(candidateIndex, settings.candidateWindow) * 0.18
                                : candidateIndex
                        ),
                        orientationPenalty: state.orientationPenalty + (
                            settings.highReverseFactor && repeatsOrientation
                                ? Math.max(0, state.orientationRun - 1)
                                : 0
                        ),
                        rhythmPenalty: state.rhythmPenalty + (
                            settings.harmonicSpaces
                                ? (repeatedWidth ? 0.42 : 0) + (repeatedColumn ? 0.28 : 0)
                                : 0
                        ),
                        usefulSpacePenalty: state.usefulSpacePenalty + Math.max(0, 2 - usefulSides),
                        voidAnchors: anchor ? state.voidAnchors.concat(anchor) : state.voidAnchors,
                        anchorArea: state.anchorArea + (anchor?.area || 0),
                        lastOrientation: orientation === 'neutral' ? state.lastOrientation : orientation,
                        orientationRun: orientation === 'neutral'
                            ? state.orientationRun
                            : (repeatsOrientation ? state.orientationRun + 1 : 1),
                        lastWidthRatio: widthRatio,
                        lastXRatio: xRatio,
                    };
                    next.score = stateScore(next, settings, remaining.length === 0);
                    expanded.push(next);
                });
            });
            expanded.sort((left, right) => left.score - right.score);
            states = expanded.slice(0, settings.beamWidth);
            if (states.length === 0) break;
        }
        const searchDuration = clockNow() - searchStarted;

        const complete = states.filter((state) => state.remaining.length === 0);
        const best = (complete.length > 0 ? complete : states)
            .sort((left, right) => stateScore(left, settings, true) - stateScore(right, settings, true))[0];
        if (!best) {
            return { placements: [], containerWidth: settings.containerWidth, containerHeight: 0, skyline: [] };
        }
        const compactionStarted = clockNow();
        // Useful-space footprints are protected by the search skyline.
        // Repacking or balancing afterwards would silently consume them.
        const protectedSpaces = settings.usefulSpaces
            ? protectUsefulSpaces(best.placements, settings, best.voidAnchors, best.anchorArea)
            : null;
        const compacted = settings.usefulSpaces
            ? protectedSpaces.placements
            : compactCavities(
                compactTail(best.placements, source, settings),
                settings,
                source
            );
        const compactionDuration = clockNow() - compactionStarted;
        let finalAnchors = protectedSpaces?.anchors || best.voidAnchors;
        const finalAnchorArea = protectedSpaces?.anchorArea ?? best.anchorArea;
        const balancingStarted = clockNow();
        let aligned = compacted;
        let acceptedBalancingPasses = 0;
        let centeringMovement = 0;
        let finalCalculationCells = [];
        let finalSpaceCells = [];
        if (settings.usefulSpaces) {
            const frozenBalance = balanceUsefulSpacesFrozen(
                compacted,
                settings,
                finalAnchors
            );
            aligned = frozenBalance.placements;
            finalAnchors = frozenBalance.anchors;
            acceptedBalancingPasses = frozenBalance.acceptedPasses;
            centeringMovement = frozenBalance.centeringMovement;
            finalCalculationCells = frozenBalance.calculationCells;
            finalSpaceCells = frozenBalance.spaceCells;
        } else {
            // Il percorso ordinario conserva il bilanciamento storico.
            for (let pass = 0; pass < 24; pass += 1) {
                const previous = aligned;
                let next = balanceVertical(previous, {
                    gap: settings.gap,
                    minimum: settings.verticalBalanceMinimum,
                    maximumRatio: settings.verticalBalanceMaximumRatio,
                    containerHeight: layoutHeight(previous),
                });
                next = balanceHorizontal(next, {
                    gap: settings.gap,
                    minimum: settings.horizontalBalanceMinimum,
                    maximumRatio: settings.horizontalBalanceMaximumRatio,
                    containerWidth: settings.containerWidth,
                });
                const movement = next.reduce((maximum, item, index) => Math.max(
                    maximum,
                    Math.abs(item.x - previous[index].x),
                    Math.abs(item.y - previous[index].y)
                ), 0);
                aligned = next;
                if (movement < 0.5) break;
            }
        }
        const balancingDuration = clockNow() - balancingStarted;
        const finalHeight = layoutHeight(aligned);
        const finalArea = layoutArea(aligned);
        const usefulAudit = settings.usefulSpaces ? usefulSpaceAudit(aligned, settings) : null;
        const metrics = {
            voidRatio: clamp(
                (settings.containerWidth * Math.max(1, finalHeight) - finalArea)
                / (settings.containerWidth * Math.max(1, finalHeight)),
                0,
                1
            ),
            fragmentation: best.skyline.length,
            orderDisplacement: best.orderPenalty,
            searchProfile: {
                adaptive: settings.largeGallery,
                candidateWindow: settings.candidateWindow,
                beamWidth: settings.beamWidth,
                harmonicStartLimit: settings.harmonicStartLimit,
            },
            ...(usefulAudit ? {
                usefulSpaces: {
                    satisfied: usefulAudit.satisfied,
                    total: usefulAudit.total,
                    ratio: usefulAudit.ratio,
                    averageSides: usefulAudit.averageSides,
                    anchorCount: finalAnchors.length,
                    anchorAreaRatio: finalAnchorArea
                        / Math.max(1, settings.containerWidth * finalHeight),
                    balancingPasses: acceptedBalancingPasses,
                    centeringMovement,
                },
            } : {}),
        };
        // Runtime diagnostics must not change equality, JSON snapshots or
        // cache semantics of an otherwise deterministic geometry result.
        Object.defineProperty(metrics, 'phaseTimings', {
            configurable: true,
            enumerable: false,
            value: {
                search: searchDuration,
                compaction: compactionDuration,
                balancing: balancingDuration,
                geometry: clockNow() - planningStarted,
            },
        });
        return {
            placements: aligned,
            containerWidth: settings.containerWidth,
            containerHeight: finalHeight,
            skyline: best.skyline,
            metrics,
            ...(settings.usefulSpaces ? {
                voidAnchors: finalAnchors,
                calculationCells: finalCalculationCells,
                spaceCells: finalSpaceCells,
            } : {}),
        };
    };

    /**
     * Colloca rettangoli già dimensionati su una frontiera a gradini.
     * La scelta di larghezza, altezza e ritaglio appartiene al risolutore
     * estetico; questo nucleo garantisce esclusivamente geometria e padding.
     */
    const placeRectangles = (rectangles, options) => {
        const containerWidth = finitePositive(options && options.containerWidth, 1);
        const gap = Math.max(0, Number(options && options.gap) || 0);
        let skyline = [{ x: 0, end: containerWidth, y: 0 }];
        const placements = [];

        rectangles.forEach((rectangle, index) => {
            const width = Math.min(containerWidth, finitePositive(rectangle.width, containerWidth));
            const height = finitePositive(rectangle.height, 1);
            // Il margine destro fa parte dell'impronta riservata. Un'immagine
            // a tutta larghezza non richiede spazio esterno al contenitore.
            const footprintWidth = width >= containerWidth ? containerWidth : Math.min(containerWidth, width + gap);
            const starts = candidateStarts(skyline, footprintWidth, containerWidth);
            let best = null;
            starts.forEach((x) => {
                const y = heightAt(skyline, x, x + footprintWidth);
                if (best === null || y < best.y - 0.0001
                    || (Math.abs(y - best.y) < 0.0001 && x < best.x)) {
                    best = { x, y };
                }
            });
            if (best === null) best = { x: 0, y: heightAt(skyline, 0, containerWidth) };

            const placement = {
                id: rectangle.id ?? index,
                x: best.x,
                y: best.y,
                width,
                height,
            };
            placements.push(placement);
            skyline = updateSkyline(
                skyline,
                best.x,
                Math.min(containerWidth, best.x + footprintWidth),
                best.y + height + gap
            );
        });

        const containerHeight = placements.reduce(
            (height, placement) => Math.max(height, placement.y + placement.height),
            0
        );
        return { placements, containerWidth, containerHeight, skyline };
    };

    const overlapsWithGap = (left, right, gap) => !(
        left.x + left.width + gap <= right.x + 0.0001
        || right.x + right.width + gap <= left.x + 0.0001
        || left.y + left.height + gap <= right.y + 0.0001
        || right.y + right.height + gap <= left.y + 0.0001
    );

    const validateLayout = (layout, gap) => {
        const errors = [];
        const spacing = Math.max(0, Number(gap) || 0);
        layout.placements.forEach((placement, index) => {
            if (placement.x < -0.0001 || placement.y < -0.0001
                || placement.x + placement.width > layout.containerWidth + 0.0001) {
                errors.push(`La tessera ${String(placement.id)} esce dal contenitore.`);
            }
            for (let other = index + 1; other < layout.placements.length; other += 1) {
                if (overlapsWithGap(placement, layout.placements[other], spacing)) {
                    errors.push(`Le tessere ${String(placement.id)} e ${String(layout.placements[other].id)} si sovrappongono o non rispettano il padding.`);
                }
            }
        });
        return { valid: errors.length === 0, errors };
    };

    return {
        placeRectangles,
        placeAdaptive,
        compactCavities,
        balanceVertical,
        balanceHorizontal,
        validateLayout,
    };
}));

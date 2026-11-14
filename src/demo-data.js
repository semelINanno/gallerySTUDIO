(function (root) {
    'use strict';

    const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[character]));

    const svg = ({ width, height, title, start, end, accent, motif }) => {
        const safeTitle = escape(title);
        const art = motif === 'rings'
            ? `<circle cx="${width * .5}" cy="${height * .5}" r="${Math.min(width, height) * .28}" fill="none" stroke="${accent}" stroke-width="${Math.max(8, width * .035)}"/><circle cx="${width * .5}" cy="${height * .5}" r="${Math.min(width, height) * .13}" fill="${accent}" opacity=".8"/>`
            : motif === 'columns'
                ? Array.from({ length: 5 }, (_, index) => `<rect x="${width * (.08 + index * .19)}" y="${height * (.18 + (index % 2) * .12)}" width="${width * .12}" height="${height * (.68 - (index % 2) * .12)}" rx="${width * .03}" fill="${accent}" opacity="${.3 + index * .12}"/>`).join('')
                : motif === 'horizon'
                    ? `<path d="M0 ${height * .7} Q ${width * .22} ${height * .42}, ${width * .45} ${height * .66} T ${width} ${height * .55} V${height} H0Z" fill="${accent}" opacity=".76"/><circle cx="${width * .72}" cy="${height * .26}" r="${Math.min(width, height) * .12}" fill="#fff" opacity=".72"/>`
                    : `<path d="M0 ${height * .2} C ${width * .25} ${height * .05}, ${width * .32} ${height * .85}, ${width * .58} ${height * .48} S ${width * .86} ${height * .12}, ${width} ${height * .34} V${height} H0Z" fill="${accent}" opacity=".78"/>`;
        const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title id="title">${safeTitle}</title><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient><filter id="grain"><feTurbulence baseFrequency=".7" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .08"/></feComponentTransfer></filter></defs><rect width="100%" height="100%" fill="url(#g)"/>${art}<rect width="100%" height="100%" filter="url(#grain)" opacity=".4"/><text x="${width * .06}" y="${height * .91}" fill="#fff" font-family="system-ui,sans-serif" font-size="${Math.max(20, Math.min(width, height) * .065)}" font-weight="700">${safeTitle}</text></svg>`;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markup)}`;
    };

    root.GALLERY_STUDIO_IMAGES = [
        { width: 1200, height: 720, title: 'Atlantic line', start: '#17324d', end: '#2e8f9d', accent: '#f0ce78', motif: 'horizon' },
        { width: 640, height: 980, title: 'Vertical garden', start: '#12382f', end: '#78a85b', accent: '#d6f4af', motif: 'wave', preference: 'vertical' },
        { width: 920, height: 920, title: 'Solar orbit', start: '#5c2c54', end: '#e06f50', accent: '#ffd48a', motif: 'rings' },
        { width: 1400, height: 520, title: 'Wide field', start: '#20365b', end: '#8bc1dd', accent: '#eee6f8', motif: 'horizon', preference: 'horizontal' },
        { width: 700, height: 1120, title: 'Night columns', start: '#0c1526', end: '#3a5270', accent: '#78f0c0', motif: 'columns' },
        { width: 1100, height: 760, title: 'Amber passage', start: '#4d2b22', end: '#b65f35', accent: '#f0e878', motif: 'wave' },
        { width: 760, height: 620, title: 'Quiet geometry', start: '#364a62', end: '#8ca6b7', accent: '#f4f0df', motif: 'rings' },
        { width: 520, height: 1080, title: 'Blue tower', start: '#162957', end: '#3f96ca', accent: '#d7f0ff', motif: 'columns', preference: 'vertical' },
        { width: 1280, height: 800, title: 'Terracotta ridge', start: '#4e3029', end: '#c47a5a', accent: '#f8dfb4', motif: 'horizon' },
        { width: 900, height: 560, title: 'Green current', start: '#173d3a', end: '#53a47d', accent: '#e4ffcb', motif: 'wave' },
        { width: 680, height: 680, title: 'Violet core', start: '#30295c', end: '#8a67ac', accent: '#f0ce78', motif: 'rings' },
        { width: 1500, height: 640, title: 'Open horizon', start: '#28455f', end: '#d48a6e', accent: '#fff0be', motif: 'horizon', preference: 'horizontal' },
    ].map((item, index) => ({
        ...item,
        id: `scene-${index + 1}`,
        src: svg(item),
        aspect: item.width / item.height,
    }));
}(typeof globalThis !== 'undefined' ? globalThis : this));

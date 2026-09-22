/**
 * useContent.js — the local content layer.
 *
 * Every value here is derived from `src/content/site.config.js` (the single source
 * of truth, also read by `scripts/art/generate.mjs`), so the image paths these
 * hooks return are the local files the art generator writes. No network, no CMS.
 *
 * The exported API, the hook signatures and the shape of every returned object
 * are stable, so the consumers (App, GalleryRoom, StudioRoom, About,
 * ScreenReaderOverlay, RoomWarmup) keep working untouched — they simply never
 * see a loading state any more.
 */

import { useState, useEffect } from 'react';
import { projects, studioContent, awards, techLogos } from '../content/site.config.js';

const GALLERY_DIR = '/textures/gallery/';
const STUDIO_DIR = '/textures/studio/';
const ABOUT_DIR = '/textures/about/';

// The art generator only writes a `<stem>logo.webp` badge for the stems listed in
// `techLogos`. A project tech outside that set has no artwork, and useTexture()
// throws on a missing file, so unknown stems are dropped here — same guard as the
// fallback list in GalleryRoom.jsx.
const TECH_LOGO_FILES = new Set(techLogos.map(t => t.file));

// Projects (Galeria) — card art is `<projects[].art>przod` + its `_painted` twin
const localProjects = projects.map(p => ({
    id: p.id,
    title: p.title,
    front: `${GALLERY_DIR}${p.art}przod.webp`,
    painted: `${GALLERY_DIR}${p.art}przod_painted.webp`,
    url: p.url,
    description: p.description,
    techStack: (p.tech || [])
        .map(tech => `${tech}logo`)
        .filter(file => TECH_LOGO_FILES.has(file))
        .map(file => `${GALLERY_DIR}${file}.webp`)
}));

// Studio content — each screen is `<studioContent[].art>` + its `_painted` twin
const localContent = studioContent.map(c => ({
    ...c,
    frontTexture: `${STUDIO_DIR}${c.art}.webp`,
    paintedFrontTexture: `${STUDIO_DIR}${c.art}_painted.webp`
}));

/**
 * Bucket a config award into one of the three overlay slots.
 *
 * The slot names (`sotd`/`sotm`/`other`) are legacy from the upstream award
 * overlays and are kept so the 3D components don't change; the config's
 * `category` field is what actually drives the grouping.
 * @param {string} category The award's `category` from the site config
 * @returns {'sotd'|'sotm'|'other'} The matching overlay slot
 */
const getAwardCategory = (category) => {
    if (category === 'release') return 'sotd';
    if (category === 'milestone') return 'sotm';
    return 'other';
};

/** Maps config awards to the `{ label, date, image, url }` items the overlay expects. */
const mapAwardItems = (items) => items.map(a => ({
    label: a.title,
    date: a.sub,
    image: `${ABOUT_DIR}${a.file}.webp`,
    url: a.url || null
}));

// Awards (certificates shown in the About room) — same `{ sotd, sotm, other }`
// shape the old CMS query produced, including the platformConfig blocks.
// Plaques shown in the About room — same `{ sotd, sotm, other }` shape the old
// CMS query produced, including the platformConfig blocks. Slot titles describe
// what the entries actually are (open-source releases / milestones), not awards.
const localAwards = {
    sotd: {
        id: 'award-sotd',
        layout: 'certificate_grid',
        title: 'Open Source Releases',
        items: mapAwardItems(awards.filter(a => getAwardCategory(a.category) === 'sotd')),
        platformConfig: { label: 'RELEASE', color: '#1a1a1a', icon: '🏆' }
    },
    sotm: {
        id: 'award-sotm',
        layout: 'certificate_grid',
        title: 'Milestones',
        items: mapAwardItems(awards.filter(a => getAwardCategory(a.category) === 'sotm')),
        platformConfig: { label: 'MILESTONE', color: '#1a1a1a', icon: '📅' }
    },
    other: {
        id: 'award-other',
        layout: 'certificate_grid',
        title: 'More',
        items: mapAwardItems(awards.filter(a => getAwardCategory(a.category) === 'other')),
        platformConfig: { label: 'MORE', color: '#1a1a1a', icon: '👑' }
    }
};

// Same cache object the old network loader used to fill in. It is complete from
// module load on, so `loadContent()` resolves synchronously and never waits.
const cache = {
    projects: localProjects,
    content: localContent,
    awards: localAwards,
    loading: false,
    loaded: true,
    error: null
};

/**
 * No-op kept for API compatibility: the content is already local.
 * @returns {Promise<typeof cache>} A promise resolved with the local content
 */
export function loadContent() {
    return Promise.resolve(cache);
}

/**
 * @returns {boolean} Always true — the local content needs no loading
 */
export function isContentLoaded() {
    return true;
}

export function useGalleryProjects() {
    const [galleryProjects, setGalleryProjects] = useState(cache.projects);

    useEffect(() => {
        setGalleryProjects(cache.projects);
    }, []);

    return galleryProjects;
}

export function useStudioContent() {
    const [content, setContent] = useState(cache.content);

    useEffect(() => {
        setContent(cache.content);
    }, []);

    return content;
}

export function useAwards() {
    const [awardsData, setAwardsData] = useState(cache.awards);

    useEffect(() => {
        setAwardsData(cache.awards);
    }, []);

    return awardsData;
}

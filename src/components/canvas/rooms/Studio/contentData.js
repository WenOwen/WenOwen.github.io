/**
 * Studio Content Data
 * 
 * This file contains all content items for the Studio monitor tower.
 * Each item will be displayed on a monitor in the tower.
 * 
 * Platforms: 'youtube', 'blog', 'tiktok'
 * 
 * Everything shown here comes from src/content/site.config.js — the platform
 * settings (`studioPlatforms`) and the screens (`studioContent`). Nothing in
 * this file is personal: edit the config instead.
 */

import { studioPlatforms, studioContent } from '../../../../content/site.config.js';

// Platform looks for the tower: keys stay 'youtube', 'blog', 'tiktok' because
// the 3D room keys off them for the device shape and its colours.
export const PLATFORM_CONFIG = studioPlatforms;

// Every screen texture is derived from the config too:
// `art` becomes /textures/studio/<art>.webp (+ the hand-painted `_painted` variant).
export const CONTENT_DATA = studioContent.map((item) => ({
    ...item,
    frontTexture: `/textures/studio/${item.art}.webp`,
    paintedFrontTexture: `/textures/studio/${item.art}_painted.webp`,
}));

// Helper to get content by platform
export const getContentByPlatform = (platform) => {
    if (platform === 'all') return CONTENT_DATA;
    return CONTENT_DATA.filter(item => item.platform === platform);
};

// Get latest content (for "On Air" indicator)
export const getLatestContent = () => {
    return [...CONTENT_DATA].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
};

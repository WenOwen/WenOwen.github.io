/**
 * strings.js — every user-facing string in the HUD / DOM layer.
 *
 * Values are `{ en, zh }` and are resolved with `useT()` from `./locale`:
 *
 *   const t = useT();
 *   t(S.back)                       // 'Back to corridor' | '返回走廊'
 *   t(S.teleport).replace('{room}', roomName)
 *
 * Content that lives in `site.config.js` is localised there instead — this file
 * is only for the interface chrome.
 */

/* ------------------------------------------------------------------ *
 * Interface chrome
 * ------------------------------------------------------------------ */
export const S = {
    // navigation
    back: { en: 'Back to corridor', zh: '返回走廊' },
    menu: { en: 'Toggle menu', zh: '打开菜单' },
    map: { en: 'Map', zh: '地图' },
    closeMap: { en: 'Close map', zh: '关闭地图' },
    teleport: { en: 'Teleport to {room} room', zh: '传送到{room}' },

    // audio
    audio: { en: 'Audio Settings', zh: '声音设置' },
    closeAudio: { en: 'Close audio settings', zh: '关闭声音设置' },
    musicVolume: { en: 'Music volume', zh: '音乐音量' },
    sfxVolume: { en: 'SFX volume', zh: '音效音量' },
    volume: { en: 'Volume', zh: '音量' },

    // achievements
    achievements: { en: 'Achievements', zh: '成就' },
    closeAchievements: { en: 'Close achievements', zh: '关闭成就' },

    // language switch
    language: { en: 'Language', zh: '语言' },
    switchToZh: { en: 'Switch to Chinese', zh: '切换到英文' },
    langShort: { en: '中', zh: 'EN' },

    // generic
    close: { en: 'Close', zh: '关闭' },

    // entrance hint (AchievementPopup)
    audioOn: { en: 'ON', zh: '开' },
    audioOff: { en: 'OFF', zh: '关' },
};

/* ------------------------------------------------------------------ *
 * Room names (nav map, teleport buttons, screen readers)
 * ------------------------------------------------------------------ */
export const ROOM_NAMES = {
    about: { en: 'About', zh: '关于' },
    gallery: { en: 'Gallery', zh: '画廊' },
    contact: { en: 'Contact', zh: '联系' },
    studio: { en: 'Studio', zh: '工作室' },
};

/* ------------------------------------------------------------------ *
 * Achievements — label is the hint line, title is the unlock card
 * ------------------------------------------------------------------ */
export const ACHIEVEMENT_TEXT = {
    corridor_enter: {
        label: { en: 'Click a door to enter', zh: '点击门进入' },
        title: { en: 'Explorer', zh: '探索者' },
    },
    corridor_explore: {
        label: { en: 'Scroll to explore the corridor', zh: '滚动探索走廊' },
        title: { en: 'Wanderer', zh: '漫游者' },
    },
    about_fly: {
        label: { en: 'Scroll to fly through my story', zh: '滚动飞越我的故事' },
        title: { en: 'Sky Walker', zh: '云端行者' },
    },
    studio_interact: {
        label: { en: 'Drag to rotate and browse', zh: '拖动旋转浏览' },
        title: { en: 'Director', zh: '导演' },
    },
    gallery_inspect: {
        label: { en: 'Click project to inspect', zh: '点击项目查看详情' },
        title: { en: 'Art Critic', zh: '艺术评论家' },
    },
    contact_choose: {
        label: { en: 'Find a contact method', zh: '找到联系方式' },
        title: { en: 'Sociable', zh: '社交达人' },
    },
};

/* ------------------------------------------------------------------ *
 * Screen-reader overlay
 * ------------------------------------------------------------------ */
export const SR = {
    overlay: { en: 'Accessible navigation for 3D portfolio', zh: '3D 作品集的无障碍导航' },
    skip: { en: 'Skip to accessible navigation', zh: '跳到无障碍导航' },
    back: { en: 'Go back to corridor', zh: '返回走廊' },
    nav: { en: 'Portfolio rooms', zh: '作品集房间' },
    roomContent: { en: '{room} room content', zh: '{room}房间内容' },
    enterRoom: { en: 'Enter {room} room', zh: '进入{room}' },
};

export default S;

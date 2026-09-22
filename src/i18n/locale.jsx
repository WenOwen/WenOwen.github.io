/**
 * locale.jsx — the language layer.
 *
 * Two locales: `en` (default) and `zh`. The choice is persisted in localStorage
 * and, on a first visit, inferred from the browser's language.
 *
 * Two things every consumer needs:
 *
 *   const t = useT();          // resolves `{en, zh}` values from site.config.js
 *   t(identity.bio)            // -> string for the active locale
 *
 *   const suffix = useArtSuffix();   // '' for en, '_zh' for zh
 *   `/textures/gallery/${p.art}przod${suffix}.webp`
 *
 * Art is localised by generating a second set of textures with the `_zh`
 * suffix (see scripts/art/generate.mjs) rather than by swapping fonts at
 * runtime — the 3D scene uses hand-drawn Latin fonts with no CJK glyphs.
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export const LOCALES = ['en', 'zh'];
export const DEFAULT_LOCALE = 'en';

const STORAGE_KEY = 'wu5_locale';

const LocaleContext = createContext(null);

/** Best guess for a first-time visitor. */
function detectLocale() {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved && LOCALES.includes(saved)) return saved;
    } catch { /* private mode */ }
    const nav = (window.navigator?.languages?.[0] || window.navigator?.language || '').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : DEFAULT_LOCALE;
}

export function LocaleProvider({ children }) {
    const [locale, setLocaleState] = useState(detectLocale);

    const setLocale = useCallback((next) => {
        if (!LOCALES.includes(next)) return;
        setLocaleState(next);
        try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    }, []);

    const toggleLocale = useCallback(() => {
        setLocaleState((cur) => {
            const next = cur === 'en' ? 'zh' : 'en';
            try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
            return next;
        });
    }, []);

    // Keep <html lang> honest — screen readers and crawlers read it.
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
        }
    }, [locale]);

    const value = useMemo(
        () => ({ locale, setLocale, toggleLocale, isZh: locale === 'zh' }),
        [locale, setLocale, toggleLocale],
    );

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
    const ctx = useContext(LocaleContext);
    if (!ctx) throw new Error('useLocale() must be used inside <LocaleProvider>');
    return ctx;
}

/**
 * Resolve a localised value.
 * Plain strings pass through untouched, so config fields can be migrated to
 * `{ en, zh }` one at a time without breaking anything.
 */
export function pick(value, locale) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return value[locale] ?? value[DEFAULT_LOCALE] ?? '';
}

/** `const t = useT();` then `t(someConfigValue)`. */
export function useT() {
    const { locale } = useLocale();
    return useCallback((value) => pick(value, locale), [locale]);
}

/** Texture suffix for the active locale: `''` (en) or `'_zh'` (zh). */
export function useArtSuffix() {
    const { locale } = useLocale();
    return locale === 'zh' ? '_zh' : '';
}

/** Insert `suffix` before the `.webp` extension of a texture path. */
export function withSuffix(path, suffix) {
    if (!suffix) return path;
    return path.replace(/\.webp$/, `${suffix}.webp`);
}

export default LocaleProvider;

import {
    identity,
    socials,
    projects as configProjects,
    studioContent as configStudio,
    awards as configAwards,
    seo,
} from './src/content/site.config.js';

/**
 * SEO plugin — build-time JSON-LD, crawlable HTML fallback and /llms.txt.
 *
 * Every value emitted here comes from site.config.js: this file used to read a
 * hosted CMS instead, which meant the site's metadata could be overridden by
 * data that did not belong to the current owner. site.config.js is now the only
 * source, so whatever the config says is exactly what gets emitted.
 */

const SITE_URL = identity.siteUrl;
const OG_IMAGE = `${SITE_URL}/og-image.webp`;

/** Social profiles that point at a real page (mailto: entries are handled separately). */
const SOCIAL_LINKS = socials.filter(s => typeof s.url === 'string' && s.url.startsWith('http'));
const SOCIAL_URLS = SOCIAL_LINKS.map(s => s.url);

/** Gallery projects, normalised to the field names the JSON-LD builder reads. */
const PROJECTS = configProjects.map(p => ({ ...p, techStack: p.tech || [] }));

/** Content shown on the floating screens of the Studio room. */
const STUDIO = configStudio;

/** Award plaques displayed in the About room. */
const AWARDS = configAwards;

/** site.config.js defines no FAQ entries yet — the FAQPage node is skipped while this is empty. */
const FAQ_LIST = [];

// Tech stack token -> human-readable name mapping for JSON-LD.
// Covers both the texture filenames used by the assets and the short `tech`
// keys used in site.config.js.
const TECH_STACK_NAMES = {
    'reactlogo.webp': 'React',
    'htmllogo.webp': 'HTML',
    'csslogo.webp': 'CSS',
    'jslogo.webp': 'JavaScript',
    'tailwindlogo.webp': 'Tailwind CSS',
    'firebaselogo.webp': 'Firebase',
    'netlifylogo.webp': 'Netlify',
    'wordpresslogo.webp': 'WordPress',
    'elementorlogo.webp': 'Elementor',
    'phplogo.webp': 'PHP',
    python: 'Python',
    pytorch: 'PyTorch',
    numpy: 'NumPy',
    sqlite: 'SQLite',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    node: 'Node.js',
    git: 'Git',
    markdown: 'Markdown',
    html: 'HTML',
    css: 'CSS',
};

/** Everything the person node is knowledgeable about, derived from the project stacks. */
const KNOWS_ABOUT = [...new Set(PROJECTS.flatMap(p => p.techStack.map(t => TECH_STACK_NAMES[t] || t)))];

/**
 * Helper to ensure dates are in ISO-8601 format with timezone for SEO.
 */
function formatIsoDate(dateString) {
    if (!dateString) return undefined;
    if (dateString.includes('T')) return dateString; // Already has time/timezone
    return `${dateString}T12:00:00Z`; // Default to noon UTC
}

/**
 * Returns a number only when the value really is numeric — config counters are
 * written for humans ("★ 17") and must not be emitted as schema.org counters.
 */
function numericStat(value) {
    return /^\d+$/.test(String(value ?? '').trim()) ? Number(value) : undefined;
}

/**
 * Build dynamic JSON-LD structured data from site.config.js content.
 * This generates schema.org entities that AI search engines (Google AI Overviews,
 * Perplexity, Gemini) use to understand and cite content in their answers.
 */
function buildJsonLd(projects, studio, awards, faqList) {
    const graph = [];

    // --- 1. Person: Central node of the Knowledge Graph ---
    const person = {
        '@type': 'Person',
        '@id': `${SITE_URL}/#person`,
        name: identity.name,
        alternateName: [identity.handle, identity.login].filter(Boolean),
        url: SITE_URL,
        jobTitle: identity.aboutSubtitle,
        description: seo.about.description,
        knowsAbout: KNOWS_ABOUT,
        sameAs: SOCIAL_URLS
    };
    graph.push(person);

    // --- 2. WebSite ---
    const website = {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: seo.null.title,
        description: seo.null.description,
        publisher: { '@id': `${SITE_URL}/#person` }
    };
    graph.push(website);

    // --- 3. ProfilePage ---
    const profilePage = {
        '@type': 'ProfilePage',
        '@id': `${SITE_URL}/#profilepage`,
        url: SITE_URL,
        mainEntity: { '@id': `${SITE_URL}/#person` },
        about: { '@id': `${SITE_URL}/#person` }
    };
    graph.push(profilePage);

    // --- 4. FAQPage (GEO & AI search engine optimizer) ---
    if (faqList && faqList.length > 0) {
        const faqPage = {
            '@type': 'FAQPage',
            '@id': `${SITE_URL}/#faq`,
            mainEntity: faqList.map(item => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer
                }
            }))
        };
        graph.push(faqPage);
    }

    // --- 5. ItemList: Portfolio Projects (Google rich results for lists) ---
    if (projects && projects.length > 0) {
        graph.push({
            '@type': 'ItemList',
            '@id': `${SITE_URL}/#projectslist`,
            name: `Open-source projects by ${identity.name}`,
            description: seo.gallery.description,
            numberOfItems: projects.length,
            itemListElement: projects.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                    '@type': 'CreativeWork',
                    name: p.seoTitle || p.title,
                    description: p.seoDescription || p.description || '',
                    url: p.url || undefined,
                    creator: { '@id': `${SITE_URL}/#person` },
                    ...(p.techStack && p.techStack.length > 0 ? {
                        keywords: p.techStack.map(t => TECH_STACK_NAMES[t] || t).join(', ')
                    } : {}),
                }
            }))
        });

        // Individual CreativeWork entries for each project (richer detail)
        projects.forEach(p => {
            const projectSlug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            graph.push({
                '@type': 'CreativeWork',
                '@id': `${SITE_URL}/#project-${projectSlug}`,
                name: p.seoTitle || p.title,
                description: p.seoDescription || p.description || '',
                url: p.url || undefined,
                creator: { '@id': `${SITE_URL}/#person` },
                ...(p.techStack && p.techStack.length > 0 ? {
                    keywords: p.techStack.map(t => TECH_STACK_NAMES[t] || t).join(', ')
                } : {}),
            });
        });
    }

    // --- 6. Studio Content (screen -> VideoObject, notes -> Article, tools -> VideoObject) ---
    if (studio && studio.length > 0) {
        studio.forEach((s, idx) => {
            const studioSlug = `studio-item-${idx}`;
            const views = numericStat(s.views);
            const likes = numericStat(s.likes);
            const hasDuration = typeof s.duration === 'string' && /^\d+:\d+$/.test(s.duration);

            if (s.platform === 'youtube') {
                let embedUrl = undefined;
                if (s.url) {
                    const ytMatch = s.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?\/\s]{11})/);
                    if (ytMatch && ytMatch[1]) {
                        embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
                    }
                }

                graph.push({
                    '@type': 'VideoObject',
                    '@id': `${SITE_URL}/#${studioSlug}`,
                    name: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    contentUrl: s.url || undefined,
                    ...(embedUrl ? { embedUrl } : {}),
                    thumbnailUrl: s.thumbnailUrl || OG_IMAGE,
                    ...(hasDuration ? { duration: `PT${s.duration.replace(':', 'M')}S` } : {}),
                    ...(s.date ? { uploadDate: formatIsoDate(s.date) } : {}),
                    ...(views !== undefined ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WatchAction', userInteractionCount: views } } : {}),
                    author: { '@id': `${SITE_URL}/#person` },
                });
            } else if (s.platform === 'blog') {
                graph.push({
                    '@type': 'Article',
                    '@id': `${SITE_URL}/#${studioSlug}`,
                    headline: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    image: s.thumbnailUrl || OG_IMAGE,
                    ...(s.date ? { datePublished: formatIsoDate(s.date) } : {}),
                    ...(s.readTime ? { timeRequired: `PT${s.readTime.replace(' min', '')}M` } : {}),
                    author: { '@id': `${SITE_URL}/#person` },
                });
            } else if (s.platform === 'tiktok') {
                graph.push({
                    '@type': 'VideoObject',
                    '@id': `${SITE_URL}/#${studioSlug}`,
                    name: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    contentUrl: s.url || undefined,
                    thumbnailUrl: s.thumbnailUrl || OG_IMAGE,
                    ...(s.date ? { uploadDate: formatIsoDate(s.date) } : {}),
                    ...(views !== undefined ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WatchAction', userInteractionCount: views } } : {}),
                    ...(likes !== undefined ? { aggregateRating: { '@type': 'AggregateRating', ratingCount: likes } } : {}),
                    author: { '@id': `${SITE_URL}/#person` },
                });
            } else if (s.platform === 'instagram' || s.platform === 'x' || s.platform === 'linkedin') {
                graph.push({
                    '@type': 'SocialMediaPosting',
                    '@id': `${SITE_URL}/#${studioSlug}`,
                    headline: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    image: s.thumbnailUrl || OG_IMAGE,
                    ...(s.date ? { datePublished: formatIsoDate(s.date) } : {}),
                    ...(likes !== undefined ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: likes } } : {}),
                    author: { '@id': `${SITE_URL}/#person` },
                });
            } else if (s.platform === 'codrops') {
                graph.push({
                    '@type': 'Article',
                    '@id': `${SITE_URL}/#${studioSlug}`,
                    headline: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    image: s.thumbnailUrl || OG_IMAGE,
                    ...(s.date ? { datePublished: formatIsoDate(s.date) } : {}),
                    author: { '@id': `${SITE_URL}/#person` },
                });
            }
        });
    }

    // --- 7. Awards shown in the About room as schema.org CreativeWork ---
    if (awards && awards.length > 0) {
        graph.push({
            '@type': 'ItemList',
            '@id': `${SITE_URL}/#awardslist`,
            name: `Awards and recognition — ${identity.name}`,
            numberOfItems: awards.length,
            itemListElement: awards.map((a, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                    '@type': 'CreativeWork',
                    name: a.title,
                    ...(a.date ? { dateCreated: formatIsoDate(a.date) } : {}),
                    url: a.url || undefined,
                    description: a.seoDescription || a.sub || undefined,
                    creator: { '@id': `${SITE_URL}/#person` },
                }
            }))
        });
    }

    return {
        '@context': 'https://schema.org',
        '@graph': graph
    };
}

// Helper to generate the llms.txt content in clean Markdown
function buildLlmsTxt(projects, studio, awards, faqList) {
    const siteTitle = seo.null.title;
    const siteDescription = seo.null.description;
    const aboutMe = seo.about.description;

    let content = `# ${siteTitle}\n`;
    content += `> ${siteDescription}\n\n`;

    content += `## Biography / About Me\n`;
    content += `${aboutMe}\n\n`;

    content += `## Core Technologies & Skills\n`;
    content += `- ${KNOWS_ABOUT.join(', ')}.\n\n`;

    if (projects && projects.length > 0) {
        content += `## Selected Open-Source Projects\n`;
        projects.forEach(p => {
            const tech = p.techStack ? ` (Tech: ${p.techStack.map(t => TECH_STACK_NAMES[t] || t).join(', ')})` : '';
            content += `- [${p.seoTitle || p.title}](${p.url || SITE_URL}): ${p.seoDescription || p.description || ''}${tech}\n`;
        });
        content += `\n`;
    }

    if (studio && studio.length > 0) {
        content += `## Studio Content & Publications\n`;
        studio.forEach(s => {
            content += `- [${s.seoTitle || s.title} (${s.platform})](${s.url || SITE_URL}): ${s.seoDescription || s.description || ''}\n`;
        });
        content += `\n`;
    }

    if (awards && awards.length > 0) {
        content += `## Awards & Achievements\n`;
        awards.forEach(a => {
            content += `- **${a.title}** — ${a.sub || ''} ${a.url ? `[Link](${a.url})` : ''}\n`;
        });
        content += `\n`;
    }

    if (faqList && faqList.length > 0) {
        content += `## Frequently Asked Questions (FAQ)\n`;
        faqList.forEach(item => {
            content += `- **${item.question}**\n`;
            content += `  ${item.answer.replace(/\n/g, '\n  ')}\n`;
        });
    }

    return content;
}

export function generateSeoHtml() {
    const llmsContent = buildLlmsTxt(PROJECTS, STUDIO, AWARDS, FAQ_LIST);

    return {
        name: 'site-config-seo-plugin',

        // Serve llms.txt in local development mode
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url === '/llms.txt') {
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.end(llmsContent);
                } else {
                    next();
                }
            });
        },

        // This hook runs when Vite generates or serves index.html
        transformIndexHtml(html) {
            try {
                // All copy below comes straight from site.config.js
                const siteTitle = seo.null.title;
                const siteDescription = seo.null.description;
                const aboutMe = seo.about.description;

                // ====== PART 1: Build the semantic HTML string ======
                let seoHtml = `\n<div id="seo-content" class="sr-only-seo">\n`;

                seoHtml += `  <header>\n`;
                seoHtml += `    <h1>${siteTitle}</h1>\n`;
                seoHtml += `    <p>${siteDescription}</p>\n`;
                seoHtml += `  </header>\n`;

                seoHtml += `  <section id="about">\n`;
                seoHtml += `    <h2>About</h2>\n`;
                seoHtml += `    <p>${aboutMe}</p>\n`;
                SOCIAL_LINKS.forEach(s => {
                    seoHtml += `    <a href="${s.url}">${s.label}</a>\n`;
                });
                seoHtml += `  </section>\n`;

                if (PROJECTS && PROJECTS.length > 0) {
                    seoHtml += `  <section id="projects">\n    <h2>Projects</h2>\n    <ul>\n`;
                    PROJECTS.forEach(p => {
                        seoHtml += `      <li>\n        <h3>${p.seoTitle || p.title}</h3>\n        <p>${p.seoDescription || p.description || ''}</p>\n        ${p.url ? `<a href="${p.url}">Visit ${p.seoTitle || p.title}</a>\n` : ''}      </li>\n`;
                    });
                    seoHtml += `    </ul>\n  </section>\n`;
                }

                if (STUDIO && STUDIO.length > 0) {
                    seoHtml += `  <section id="studio">\n    <h2>The Studio (Content)</h2>\n    <ul>\n`;
                    STUDIO.forEach(s => {
                        seoHtml += `      <li>\n        <h3>${s.seoTitle || s.title} (${s.platform})</h3>\n        <p>${s.seoDescription || s.description || ''}</p>\n        ${s.url ? `<a href="${s.url}">View Content</a>\n` : ''}      </li>\n`;
                    });
                    seoHtml += `    </ul>\n  </section>\n`;
                }

                if (AWARDS && AWARDS.length > 0) {
                    seoHtml += `  <section id="awards">\n    <h2>Awards & Certificates</h2>\n    <ul>\n`;
                    AWARDS.forEach(a => {
                        seoHtml += `      <li>\n        <h3>${a.title}</h3>\n        <p>${a.sub || ''}</p>\n        ${a.url ? `<a href="${a.url}">Link</a>\n` : ''}      </li>\n`;
                    });
                    seoHtml += `    </ul>\n  </section>\n`;
                }

                // FAQ Section (GEO/AI search optimizer fallback)
                if (FAQ_LIST && FAQ_LIST.length > 0) {
                    seoHtml += `  <section id="faq">\n`;
                    seoHtml += `    <h2>Frequently Asked Questions (FAQ)</h2>\n`;
                    FAQ_LIST.forEach(item => {
                        seoHtml += `    <article>\n`;
                        seoHtml += `      <h3>${item.question}</h3>\n`;
                        seoHtml += `      <p>${item.answer}</p>\n`;
                        seoHtml += `    </article>\n`;
                    });
                    seoHtml += `  </section>\n`;
                }

                seoHtml += `</div>\n`;

                // ====== PART 2: Build dynamic JSON-LD ======
                const jsonLdSchemas = buildJsonLd(PROJECTS, STUDIO, AWARDS, FAQ_LIST);
                const jsonLdScript = `\n  <!-- Dynamic Structured Data (JSON-LD) — generated from site.config.js at build time -->\n  <script type="application/ld+json">\n${JSON.stringify(jsonLdSchemas, null, 2)}\n  </script>\n`;

                // ====== PART 3: Transform HTML ======
                // Update the <title> tag
                let transformedHtml = html.replace(
                    /<title>(.*?)<\/title>/,
                    `<title>${siteTitle}</title>`
                );

                // Add or replace meta description
                if (transformedHtml.includes('<meta name="description"')) {
                    transformedHtml = transformedHtml.replace(
                        /<meta name="description" content="(.*?)"\s*\/?>/,
                        `<meta name="description" content="${siteDescription}" />`
                    );
                } else {
                    transformedHtml = transformedHtml.replace(
                        '</head>',
                        `  <meta name="description" content="${siteDescription}" />\n</head>`
                    );
                }

                // Update Open Graph dynamic metadata
                transformedHtml = transformedHtml
                    .replace(
                        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
                        `<meta property="og:title" content="${siteTitle}" />`
                    )
                    .replace(
                        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
                        `<meta property="og:description" content="${siteDescription}" />`
                    );

                // Update Twitter card dynamic metadata
                transformedHtml = transformedHtml
                    .replace(
                        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
                        `<meta name="twitter:title" content="${siteTitle}" />`
                    )
                    .replace(
                        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
                        `<meta name="twitter:description" content="${siteDescription}" />`
                    );

                // Inject dynamic JSON-LD right before </head> (next to the existing static one)
                transformedHtml = transformedHtml.replace('</head>', `${jsonLdScript}</head>`);

                // Replace the static placeholder with the dynamic one to prevent duplicate #seo-content and double h1s
                if (transformedHtml.includes('id="seo-content"')) {
                    transformedHtml = transformedHtml.replace(
                        /<div id="seo-content" class="sr-only-seo">[\s\S]*?<\/div>/,
                        seoHtml
                    );
                } else {
                    // Fallback injection if the template doesn't contain the static block
                    transformedHtml = transformedHtml.replace('</body>', `${seoHtml}</body>`);
                }

                return transformedHtml;
            } catch (error) {
                console.error('SEO Plugin Error: Failed to generate SEO content', error);
                // Return original HTML on failure so we don't break the build
                return html;
            }
        },

        // Emit llms.txt to the build output directory
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'llms.txt',
                source: llmsContent
            });
        }
    };
}

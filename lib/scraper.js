/**
 * CurseForge Web Scraper
 * Scrapes modpack listings for reference when the AI needs examples.
 */
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.curseforge.com';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9'
};

/**
 * Search CurseForge for modpacks on a given platform.
 * @param {'bedrock'|'java'} platform
 * @param {string} query - Search term
 * @param {number} maxResults
 * @returns {Promise<Array<{name, url, description, downloads, updated}>>}
 */
export async function searchModpacks(platform, query = '', maxResults = 10) {
    const section = platform === 'bedrock' ? 'minecraft-bedrock' : 'minecraft';
    const searchUrl = query
        ? `${BASE_URL}/${section}/search?search=${encodeURIComponent(query)}&class=modpacks`
        : `${BASE_URL}/${section}/modpacks`;

    try {
        const response = await fetch(searchUrl, { headers: HEADERS });
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}`, results: [] };
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const results = [];

        // CurseForge project listing cards
        $('[class*="project-card"], .project-listing-row, .list-item').each((i, el) => {
            if (results.length >= maxResults) return;

            const $el = $(el);
            const name = $el.find('[class*="name"], h3, .name a').first().text().trim();
            const link = $el.find('a[href*="/modpacks/"]').first().attr('href');
            const desc = $el.find('[class*="description"], .description, p').first().text().trim();
            const downloads = $el.find('[class*="download"], .count').first().text().trim();

            if (name && link) {
                results.push({
                    name,
                    url: link.startsWith('http') ? link : `${BASE_URL}${link}`,
                    description: desc.substring(0, 200),
                    downloads: downloads || 'N/A',
                    platform
                });
            }
        });

        return { success: true, results, count: results.length, searchUrl };
    } catch (error) {
        return { success: false, error: error.message, results: [] };
    }
}

/**
 * Scrape a specific modpack page for file structure details.
 * @param {string} url - Full CurseForge modpack URL
 * @returns {Promise<object>}
 */
export async function scrapeModpackDetails(url) {
    try {
        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const name = $('h1, [class*="project-title"]').first().text().trim();
        const description = $('[class*="project-description"], .project-detail__description').first().text().trim();
        const categories = [];
        $('[class*="category"], .tag').each((_, el) => {
            categories.push($(el).text().trim());
        });

        // Try to get file listing
        const filesUrl = url.replace(/\/$/, '') + '/files';
        let files = [];
        try {
            const filesResponse = await fetch(filesUrl, { headers: HEADERS });
            if (filesResponse.ok) {
                const filesHtml = await filesResponse.text();
                const $f = cheerio.load(filesHtml);
                $f('[class*="file-row"], .project-file-listing .list-item, tr').each((i, el) => {
                    if (files.length >= 5) return;
                    const fileName = $f(el).find('[class*="file-name"], .name, td:first-child').first().text().trim();
                    const fileSize = $f(el).find('[class*="file-size"], .size').first().text().trim();
                    if (fileName) files.push({ name: fileName, size: fileSize });
                });
            }
        } catch { /* ignore file fetch errors */ }

        return {
            success: true,
            name,
            description: description.substring(0, 500),
            categories,
            recentFiles: files,
            url
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Register scraper as an LLM tool in the plugin system.
 */
export function registerScraperPlugin(pluginSystem) {
    pluginSystem.register(
        'scrape_curseforge',
        'Search CurseForge for Minecraft Bedrock or Java modpacks as reference. Use this to understand how popular mods structure their files or to find examples of specific features.',
        {
            type: 'object',
            properties: {
                platform: {
                    type: 'string',
                    enum: ['bedrock', 'java'],
                    description: 'Which platform to search'
                },
                query: {
                    type: 'string',
                    description: 'Search query (optional)'
                },
                detailUrl: {
                    type: 'string',
                    description: 'Full URL of a specific modpack to get details for (optional)'
                }
            },
            required: ['platform']
        },
        async (args) => {
            if (args.detailUrl) {
                return await scrapeModpackDetails(args.detailUrl);
            }
            return await searchModpacks(args.platform, args.query || '', 5);
        }
    );
}

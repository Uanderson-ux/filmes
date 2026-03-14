const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

const BASE_URL = 'https://apachetorrent.com';
const SITE_URL = 'https://cine-torrent.netlify.app';
const CATEGORY_PATH = '/series/'; // Targets only series

exports.handler = async function (event, context) {
    try {
        let seriesTitles = new Set();
        const today = new Date().toISOString().split('T')[0];

        // Fetch up to the first 10 pages dynamically to populate a wealthy sitemap quickly
        for (let i = 1; i <= 10; i++) {
            const url = i === 1 ? `${BASE_URL}${CATEGORY_PATH}` : `${BASE_URL}${CATEGORY_PATH}page/${i}/`;

            try {
                const html = await cloudscraper.get(url);
                const $ = cheerio.load(html);

                $('.blocoCapa a, .capaBlog a, .capaname a').each((i, el) => {
                    let link = $(el).attr('href');
                    if (link) {
                        let linkParts = link.split('/').filter(p => p.length > 0);
                        let slug = linkParts[linkParts.length - 1].split('?')[0].split('#')[0];
                        if (slug) seriesTitles.add(slug);
                    }
                });
            } catch (err) {
                console.log(`Failed fetching page ${i}: ${err.message}`);
                break; // Stop paginating on error or 404
            }
        }

        // Build XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        for (const slug of seriesTitles) {
            // Apply correct path format
            xml += `    <url>
        <loc>${SITE_URL}/filme-${slug}-torrent</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>\n`;
        }

        xml += `</urlset>`;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600'
            },
            body: xml
        };
    } catch (error) {
        console.error('Error generating sitemap series:', error.message);
        return {
            statusCode: 500,
            body: 'Error generating sitemap series'
        };
    }
};

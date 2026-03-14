const SITE_URL = 'https://cine-torrent.netlify.app';

exports.handler = async function (event, context) {
    const today = new Date().toISOString().split('T')[0];

    // This is a Sitemap Index pointing to the categorized sitemaps
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>${SITE_URL}/sitemap-filmes.xml</loc>
        <lastmod>${today}</lastmod>
    </sitemap>
    <sitemap>
        <loc>${SITE_URL}/sitemap-series.xml</loc>
        <lastmod>${today}</lastmod>
    </sitemap>
</sitemapindex>`;

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        },
        body: xml
    };
};

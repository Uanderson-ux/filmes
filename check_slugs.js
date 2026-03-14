const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

async function checkSlugs() {
    try {
        const html = await cloudscraper.get('https://apachetorrent.com/');
        const $ = cheerio.load(html);
        console.log('--- Real Slugs on Apache Torrent ---');
        $('.blocoCapa a, .capaBlog a, .capaname a').slice(0, 10).each((i, el) => {
            const link = $(el).attr('href');
            if (link) {
                const parts = link.split('/').filter(p => p.length > 0);
                const slug = parts[parts.length - 1];
                console.log(`Href: ${link} -> Slug: ${slug}`);
            }
        });
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkSlugs();

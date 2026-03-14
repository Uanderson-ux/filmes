const cloudscraper = require('cloudscraper');
const fs = require('fs');

async function test() {
    const url = 'https://apachetorrent.com/';
    console.log(`Getting: ${url}`);
    try {
        const html = await cloudscraper.get(url);
        fs.writeFileSync('page1.html', html);
        console.log('Saved page1.html');

        const cheerio = require('cheerio');
        const $ = cheerio.load(html);
        const links = [];
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && (href.includes('page') || text.match(/^\d+$/) || text === 'Próximo' || text === '»')) {
                links.push({ text, href });
            }
        });
        console.log('Possible pagination links:');
        console.log(JSON.stringify(links, null, 2));
    } catch (error) {
        console.log(`Error: ${error.message}`);
    }
}

test();

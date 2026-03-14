const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

async function testCategory() {
    try {
        console.log('Fetching Ação category...');
        const html = await cloudscraper.get('https://apachetorrent.com/category/acao/', { resolveWithFullResponse: true, simple: false });
        console.log('Status code:', html.statusCode);
        const $ = cheerio.load(html.body);
        const movies = [];
        $('#archive-content article').each((i, el) => {
            const title = $(el).find('.title h2').text().trim();
            if (title) movies.push(title);
        });
        console.log('Movies found:', movies.length);
        if (movies.length > 0) console.log('First movie:', movies[0]);
    } catch (e) {
        console.error('Error fetching category:', e.message);
    }
}
testCategory();

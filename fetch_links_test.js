const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

async function checkCategories() {
    try {
        console.log('Fetching homepage...');
        const html = await cloudscraper.get('https://apachetorrent.com/', { resolveWithFullResponse: true, simple: false });
        console.log('Got homepage status:', html.statusCode);
        const $ = cheerio.load(html.body);
        const links = [];
        $('.nav-link').each((i, el) => {
            links.push($(el).attr('href'));
        });
        console.log('Nav links found:');
        links.forEach(l => console.log(' - ' + l));

        console.log('Testing a specific category...');
        const actionHtml = await cloudscraper.get('https://apachetorrent.com/categoria/acao/', { resolveWithFullResponse: true, simple: false });
        console.log('Action category status:', actionHtml.statusCode);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
checkCategories();

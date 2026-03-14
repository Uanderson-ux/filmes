const cloudscraper = require('cloudscraper');

const urls = [
    'https://apachetorrent.com/page/2/',
    'https://apachetorrent.com/page/2',
    'https://apachetorrent.com/?paged=2',
    'https://apachetorrent.com/?page=2'
];

async function test() {
    for (const url of urls) {
        console.log(`Testing: ${url}`);
        try {
            const html = await cloudscraper.get(url);
            const count = (html.match(/capaname/g) || []).length;
            console.log(`  Found ${count} movies.`);
        } catch (error) {
            console.log(`  Error: ${error.message}`);
        }
    }
}

test();

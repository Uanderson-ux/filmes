const http = require('http');

const url = 'http://localhost:3000/api/scrape?url=' + encodeURIComponent('https://apachetorrent.com/newtopia-1a-temporada-baixar-torrent/');

http.get(url, (resp) => {
    let data = '';
    resp.on('data', (chunk) => {
        data += chunk;
    });
    resp.on('end', () => {
        const cheerio = require('cheerio');
        const $ = cheerio.load(data);
        const magnetLinks = [];
        $('a[href^="magnet:"]').each((i, el) => {
            magnetLinks.push($(el).attr('href'));
        });

        console.log(`Found ${magnetLinks.length} magnet links!`);
        if (magnetLinks.length > 0) {
            console.log(magnetLinks[0].substring(0, 100) + '...');
        } else {
            console.log('No magnet links found. Saving to test_html.txt for manual review.');
            const fs = require('fs');
            fs.writeFileSync('test_html.txt', data);
        }
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});

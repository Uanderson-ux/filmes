async function test() {
    try {
        console.log('Fetching real category page...');
        const response = await fetch('https://apachetorrent.com/categoria/acao/');
        const html = await response.text();
        require('fs').writeFileSync('real_category.html', html);
        console.log('Saved to real_category.html');
    } catch (e) {
        console.error('Error:', e.message);
    }
}
test();

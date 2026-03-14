const cloudscraper = require('cloudscraper');

async function test() {
    const targetUrl = 'https://apachetorrent.com/';
    console.log(`Testando raspagem de: ${targetUrl}`);
    try {
        const response = await cloudscraper.get(targetUrl);
        console.log('Sucesso! Recebi resposta.');
        console.log('Tamanho da resposta:', response.length);
        console.log('Primeiros 500 caracteres:', response.substring(0, 500));

        if (response.includes('blocoCapa') || response.includes('capaBlog') || response.includes('capaname')) {
            console.log('Encontrei seletores de filmes no HTML!');
        } else {
            console.log('AVISO: Não encontrei os seletores esperados no HTML.');
        }
    } catch (error) {
        console.error('ERRO na raspagem:', error.message);
    }
}

test();

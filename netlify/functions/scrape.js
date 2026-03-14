const cloudscraper = require('cloudscraper');

exports.handler = async (event, context) => {
    const targetUrl = event.queryStringParameters.url;

    if (!targetUrl) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'URL is required' })
        };
    }

    try {
        const response = await cloudscraper.get(targetUrl);
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'text/html',
                'X-Scrape-Url': targetUrl
            },
            body: response
        };
    } catch (error) {
        console.error('Error scraping:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch content: ' + error.message })
        };
    }
};

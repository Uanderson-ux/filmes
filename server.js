const express = require('express');
const cloudscraper = require('cloudscraper');
const cors = require('cors');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname)));

app.get(['/api/scrape', '/.netlify/functions/scrape'], async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'URL is required' });

    try {
        const response = await cloudscraper.get(targetUrl);
        res.send(response);
    } catch (error) {
        console.error('Error scraping:', error.message);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

// Simulate Netlify Function: /filme-*-torrent -> /.netlify/functions/movie
app.get('/filme-:slug-torrent', async (req, res) => {
    try {
        const movieConfig = require('./netlify/functions/movie.js');
        // Netlify function handler expects an event object with 'path'
        // Pass the precise path to match the Netlify regex precisely
        const event = { path: req.path };
        const result = await movieConfig.handler(event, {});

        res.status(result.statusCode).set(result.headers || {}).send(result.body);
    } catch (error) {
        console.error('Local test error for /filme/*:', error);
        res.status(500).send('Local test error');
    }
});

// Simulate Netlify Function: /sitemap.xml -> /.netlify/functions/sitemap
app.get('/sitemap.xml', async (req, res) => {
    try {
        const sitemapConfig = require('./netlify/functions/sitemap.js');
        const event = {};
        const result = await sitemapConfig.handler(event, {});

        res.status(result.statusCode).set(result.headers || {}).send(result.body);
    } catch (error) {
        console.error('Local test error for sitemap:', error);
        res.status(500).send('Local test error');
    }
});

// Simulate Netlify Function: /sitemap-filmes.xml -> /.netlify/functions/sitemap-filmes
app.get('/sitemap-filmes.xml', async (req, res) => {
    try {
        const sitemapConfig = require('./netlify/functions/sitemap-filmes.js');
        const event = {};
        const result = await sitemapConfig.handler(event, {});

        res.status(result.statusCode).set(result.headers || {}).send(result.body);
    } catch (error) {
        console.error('Local test error for sitemap filmes:', error);
        res.status(500).send('Local test error');
    }
});

// Simulate Netlify Function: /sitemap-series.xml -> /.netlify/functions/sitemap-series
app.get('/sitemap-series.xml', async (req, res) => {
    try {
        const sitemapConfig = require('./netlify/functions/sitemap-series.js');
        const event = {};
        const result = await sitemapConfig.handler(event, {});

        res.status(result.statusCode).set(result.headers || {}).send(result.body);
    } catch (error) {
        console.error('Local test error for sitemap series:', error);
        res.status(500).send('Local test error');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

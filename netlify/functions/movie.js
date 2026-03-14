const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://apachetorrent.com';

exports.handler = async function (event, context) {
    // Determine the slug from the URL. Example: /filme-bem-vindo-a-tarzana-torrent
    let cleanSlug = event.queryStringParameters && event.queryStringParameters.slug;

    if (!cleanSlug) {
        const urlPath = event.path || '';
        const slugMatch = urlPath.match(/\/filme-(.+)-torrent/);

        if (slugMatch && slugMatch[1]) {
            cleanSlug = slugMatch[1];
        } else {
            cleanSlug = urlPath.replace('/filme-', '').replace(/-torrent$/, '').replace(/^\//, '');
        }
    }

    if (!cleanSlug) {
        return {
            statusCode: 404,
            body: 'Filme não especificado ou URL inválida.'
        };
    }

    // Apache Torrent slugs end with -torrent (e.g. "bem-vindo-a-tarzana-torrent").
    const apacheSlug = `${cleanSlug}-torrent`;
    const targetUrl = `https://apachetorrent.com/${apacheSlug}/`;

    console.log(`[Movie] Path: ${urlPath} -> cleanSlug: ${cleanSlug} -> Fetching: ${targetUrl}`);

    try {
        const html = await cloudscraper.get(targetUrl);
        const $ = cheerio.load(html);

        // ── TÍTULO ──────────────────────────────────────────────────────────────────
        // apachetorrent.com usa <h1 class="my-3 h3 text-center"> ou simplesmente o primeiro h1
        let title = $('h1.my-3').text().trim()
            || $('h1.h3').text().trim()
            || $('h1').first().text().trim()
            || 'Sem título';

        // ── POSTER / IMAGEM ──────────────────────────────────────────────────────────
        // O poster costuma ser o primeiro img.img-fluid dentro do conteúdo do post
        let image = '';
        const imgCandidates = [
            $('img.img-fluid').first().attr('src'),
            $('.wp-post-image').attr('src'),
            $('.cover img').attr('src'),
            $('.post-thumbnail img').attr('src'),
            $('article img').first().attr('src'),
            $('img').first().attr('src')
        ];
        for (const src of imgCandidates) {
            if (src && !src.includes('logo') && !src.includes('icon') && src.trim() !== '') {
                image = src;
                break;
            }
        }
        if (image && !image.startsWith('http')) {
            image = BASE_URL + (image.startsWith('/') ? image : '/' + image);
        }

        // ── SINOPSE ──────────────────────────────────────────────────────────────────
        // apachetorrent.com coloca a sinopse no meta og:description e meta description
        let synopsis = '';

        // 1. Tenta a meta og:description (mais completa)
        synopsis = $('meta[property="og:description"]').attr('content') || '';

        // 2. Fallback: meta name description
        if (!synopsis) {
            synopsis = $('meta[name="description"]').attr('content') || '';
        }

        // 3. Tenta selebor específico de sinopse
        if (!synopsis) synopsis = $('.sinopse-content').text().trim();

        // 4. Busca em parágrafos que contém "Sinopse"
        if (!synopsis) {
            $('p').each((i, el) => {
                const text = $(el).text().trim();
                if (text.toLowerCase().startsWith('sinopse:') || text.toLowerCase().startsWith('sinopse ')) {
                    synopsis = text.replace(/^sinopse[:\s]*/i, '').trim();
                    return false;
                }
            });
        }

        // 5. Fallback: maior parágrafo de texto útil
        if (!synopsis) {
            let maxLen = 0;
            $('p').each((i, el) => {
                const text = $(el).text().trim();
                if (text.length > maxLen && text.length > 60 && !text.includes('magnet:') && !text.includes('http')) {
                    maxLen = text.length;
                    synopsis = text;
                }
            });
        }

        if (!synopsis) synopsis = 'Sem sinopse disponível.';

        // ── INFORMAÇÕES EXTRAS (resolução, codec, qualidade, etc.) ──────────────────
        const extraInfoItems = [];
        const addedInfoKeys = new Set();

        // Busca em parágrafos com padrão "Chave: Valor"
        const infoLabels = ['qualidade', 'idioma', 'formato', 'duração', 'duracao', 'audio', 'áudio', 'tamanho', 'resolução', 'resolucao', 'legenda', 'codec', 'genero', 'gênero', 'ano'];
        $('p').each((i, el) => {
            const text = $(el).text().trim();
            const lower = text.toLowerCase();
            for (const label of infoLabels) {
                if ((lower.startsWith(label + ':') || lower.startsWith(label + ' :')) && !addedInfoKeys.has(label)) {
                    const value = text.replace(/^[^:]+:\s*/i, '').trim();
                    const labelFormatted = label.charAt(0).toUpperCase() + label.slice(1);
                    if (value && !addedInfoKeys.has(label)) {
                        addedInfoKeys.add(label);
                        extraInfoItems.push({ label: labelFormatted, value });
                    }
                    break;
                }
            }
        });

        // Extrai infos técnicas de h2/h3 que contêm resolução, codec, etc.
        $('h2, h3').each((i, el) => {
            const text = $(el).text().trim();
            // Padrão: "Título 1080p | MKV" ou "VERSÃO DUAL ÁUDIO"
            const techMatch = text.match(/(\d{3,4}p|4K|BluRay|WEB-DL|HDTV|MKV|AVI|MP4|Dual|Dublado|Legendado)/i);
            if (techMatch && !addedInfoKeys.has('qualidade-h')) {
                addedInfoKeys.add('qualidade-h');
                extraInfoItems.push({ label: 'Qualidade', value: text });
            }
        });

        // Extrai resolução do texto geral (ex: "Resolução: 1920x1080, Codec de Vídeo: h264")
        const bodyText = $('body').text();
        const resMatch = bodyText.match(/Resolu[çc][aã]o[:\s]+([\w\d\sx,\/]+)/i);
        if (resMatch && !addedInfoKeys.has('resolucao')) {
            addedInfoKeys.add('resolucao');
            const val = resMatch[1].trim().replace(/[\n\r]+/g, '').split(',')[0].trim();
            if (val) extraInfoItems.push({ label: 'Resolução', value: val });
        }

        // ── CATEGORIAS / GÊNEROS ─────────────────────────────────────────────────────
        let genresHtml = '';
        const addedTags = new Set();

        // Tenta tags de categorias explícitas
        $('.tags-links a, .post-categories a, .cat-links a').each((i, el) => {
            const tag = $(el).text().trim();
            if (tag && !addedTags.has(tag)) {
                addedTags.add(tag);
                genresHtml += `<span>${tag}</span>`;
            }
        });

        // Tenta links de categoria dentro do texto (apachetorrent usa /categoria/xxx/ ou /filmes/xxx/)
        if (!genresHtml) {
            $('a[href*="/categoria/"], a[href*="/filmes/"], a[href*="/series/"]').each((i, el) => {
                const tag = $(el).text().trim();
                if (tag && tag.length > 1 && !addedTags.has(tag)) {
                    addedTags.add(tag);
                    genresHtml += `<span>${tag}</span>`;
                }
            });
        }

        // ── ANO ──────────────────────────────────────────────────────────────────────
        let year = '';
        const yearMatch = title.match(/\b(19|20)\d{2}\b/) || synopsis.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) year = yearMatch[0];

        // Também tenta achar em parágrafos com "Ano:"
        if (!year) {
            $('p').each((i, el) => {
                const text = $(el).text().trim();
                if (text.toLowerCase().startsWith('ano:')) {
                    year = text.replace(/^ano:\s*/i, '').trim();
                    return false;
                }
            });
        }

        // Monta o HTML das infos extras
        let extraInfoHtml = '';
        if (year) extraInfoHtml += `<span>📅 ${year}</span>`;
        for (const item of extraInfoItems) {
            extraInfoHtml += `<span>${item.label}: ${item.value}</span>`;
        }

        // ── LINKS MAGNET ─────────────────────────────────────────────────────────────
        let downloadsHtml = '';
        let downloadCount = 1;

        $('a[href^="magnet:"]').each((i, el) => {
            const magnet = $(el).attr('href');
            if (!magnet) return;

            // Tenta montar um rótulo descritivo
            let label = $(el).text().trim();

            // Remove palavras genéricas do rótulo do botão
            if (!label || /^download(\s+torrent)?$/i.test(label)) {
                // Tenta pegar o texto do elemento pai (ex: div ou p que envolve o botão)
                const parentText = $(el).parent().clone().children().remove().end().text().trim();
                if (parentText && parentText.length > 2 && parentText.length < 80) {
                    label = parentText;
                }
            }

            // Fallback: tenta usar o atributo title ou aria-label
            if (!label || /^download(\s+torrent)?$/i.test(label)) {
                label = $(el).attr('title') || $(el).attr('aria-label') || '';
            }

            // Fallback final: "Opção N"
            if (!label || /^download(\s+torrent)?$/i.test(label)) {
                label = `Opção ${downloadCount}`;
            }

            // Limpa espaços extras e quebras de linha
            label = label.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

            downloadsHtml += `
                <div class="download-item">
                    <span>${label}</span>
                    <a href="${magnet}" class="download-btn">
                        <i class="fas fa-magnet"></i> Baixar
                    </a>
                </div>
            `;
            downloadCount++;
        });

        if (downloadsHtml === '') {
            downloadsHtml = '<p style="color: var(--text-gray);">Nenhum link magnet encontrado para este título.</p>';
        }

        // ── MONTA O HTML DA PÁGINA ───────────────────────────────────────────────────
        const templatePath = path.resolve(__dirname, '../../movie.html');
        let template = fs.readFileSync(templatePath, 'utf8');

        const siteUrl = 'https://cine-torrent.netlify.app';
        const fullSeoUrl = `${siteUrl}/filme-${cleanSlug}-torrent`;

        // SEO
        template = template.replace(/\{\{seo_title\}\}/g, `Baixar ${title} Torrent | Cine Torrent`);
        template = template.replace(/\{\{seo_description\}\}/g, synopsis.substring(0, 160));
        template = template.replace(/\{\{seo_image\}\}/g, image || `${siteUrl}/og-image.jpg`);
        template = template.replace(/\{\{seo_url\}\}/g, fullSeoUrl);

        // Conteúdo
        template = template.replace(/\{\{movie_title\}\}/g, title);
        template = template.replace(/\{\{movie_image\}\}/g, image || 'https://via.placeholder.com/300x450?text=Sem+Imagem');
        template = template.replace(/\{\{movie_synopsis\}\}/g, `<p>${synopsis}</p>`);
        template = template.replace(/\{\{movie_genres_html\}\}/g, genresHtml);
        template = template.replace(/\{\{movie_year\}\}/g, extraInfoHtml);
        template = template.replace(/\{\{movie_downloads_html\}\}/g, downloadsHtml);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600'
            },
            body: template
        };

    } catch (error) {
        console.error(`Error scraping ${targetUrl}:`, error.message);
        return {
            statusCode: 500,
            body: `
                <!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Erro</title></head>
                <body style="background:#0f1014;color:#fff;font-family:sans-serif;padding:40px;text-align:center;">
                    <h1>Erro ao carregar o filme</h1>
                    <p style="color:#b3b3b3;">Não foi possível buscar os dados do filme. Tente novamente mais tarde.</p>
                    <a href="/" style="color:#2ecc13;">← Voltar ao início</a>
                </body></html>
            `
        };
    }
};

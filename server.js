const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Headers for requests
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ar,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

/**
 * Search for movies by name
 * GET /api/search?q=Spider-Man
 */
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'يرجى إدخال اسم الفيلم' });
        }

        const encodedQuery = encodeURIComponent(query);
        const url = `https://moviz-time.live/?s=${encodedQuery}`;
        
        const response = await axios.get(url, { headers, timeout: 10000 });
        const $ = cheerio.load(response.data);
        
        const movies = [];
        
        $('article.pinbox').each((index, article) => {
            const movie = {};
            
            // Extract title and link
            const titleElement = $(article).find('h2.title-2 a');
            if (titleElement.length) {
                movie.title = titleElement.text().trim();
                movie.link = titleElement.attr('href');
            }
            
            // Extract quality
            const qualityElement = $(article).find('span._quality_tag');
            movie.quality = qualityElement.length ? qualityElement.text().trim() : 'غير محدد';
            
            // Extract image
            const imgElement = $(article).find('img');
            if (imgElement.length) {
                movie.image = imgElement.attr('src');
                movie.imageAlt = imgElement.attr('alt') || '';
            }
            
            // Extract year from title
            const yearMatch = movie.title.match(/(\d{4})/);
            movie.year = yearMatch ? yearMatch[1] : 'غير محدد';
            
            // Extract movie ID from link
            const idMatch = movie.link ? movie.link.match(/\/?p=(\d+)/) : null;
            movie.id = idMatch ? idMatch[1] : null;
            
            movies.push(movie);
        });
        
        if (movies.length === 0) {
            return res.status(404).json({ error: 'لم يتم العثور على أفلام تطابق البحث' });
        }
        
        res.json({
            success: true,
            search_url: url,
            total_results: movies.length,
            movies: movies
        });
        
    } catch (error) {
        console.error('Search Error:', error.message);
        res.status(500).json({ 
            error: 'حدث خطأ أثناء البحث',
            details: error.message 
        });
    }
});

/**
 * Get movie servers and details
 * GET /api/movie?url=https://moviz-time.live/فيلم-spider-man-2023-مترجم/
 */
app.get('/api/movie', async (req, res) => {
    try {
        const movieUrl = req.query.url;
        if (!movieUrl) {
            return res.status(400).json({ error: 'يرجى إدخال رابط الفيلم' });
        }
        
        const response = await axios.get(movieUrl, { headers, timeout: 10000 });
        const $ = cheerio.load(response.data);
        
        const result = {
            movie_details: {},
            watch_servers: [],
            download_servers: [],
            iframe_servers: [],
            hd_links: [],
            suggested_movies: [],
            movie_url: movieUrl
        };
        
        // Extract movie details
        const titleElement = $('h1.title-3');
        if (titleElement.length) {
            result.movie_details.title = titleElement.text().trim();
        }
        
        // Extract details from sections
        $('p.movie_details_section').each((index, section) => {
            const ttl = $(section).find('span.ttl').text().trim().replace(':', '').trim();
            const cntt = $(section).find('span.cntt').text().trim();
            if (ttl && cntt) {
                result.movie_details[ttl] = cntt;
            }
        });
        
        // Extract watch servers
        $('#servers_tabs .server_btn').each((index, btn) => {
            result.watch_servers.push({
                number: index + 1,
                name: $(btn).text().trim(),
                type: 'مشاهدة'
            });
        });
        
        // Extract download servers
        const downloadBtn = $('a.download_btn');
        if (downloadBtn.length) {
            result.download_servers.push({
                number: 1,
                name: 'رابط صفحة التحميل',
                url: downloadBtn.attr('href'),
                type: 'تحميل'
            });
        }
        
        // Extract iframe servers
        $('iframe').each((index, iframe) => {
            const src = $(iframe).attr('data-src') || $(iframe).attr('src');
            if (src) {
                let serverName = `سيرفر المشاهدة ${index + 1}`;
                if (src.includes('vidhls.com')) serverName = 'سيرفر VidHLS';
                else if (src.includes('imovietime')) serverName = 'سيرفر IMovieTime';
                
                result.iframe_servers.push({
                    number: index + 1,
                    name: serverName,
                    url: src,
                    type: 'مشاهدة'
                });
            }
        });
        
        // Extract HD links
        const hdBtn = $('a.ahmed_btn');
        if (hdBtn.length) {
            result.hd_links.push({
                name: 'مشاهدة بجودة HD',
                url: hdBtn.attr('href'),
                type: 'مشاهدة'
            });
        }
        
        // Extract suggested movies
        $('.relatedwrap .relatedpost').slice(0, 5).each((index, post) => {
            const link = $(post).find('a');
            if (link.length) {
                result.suggested_movies.push({
                    title: link.attr('title') || '',
                    url: link.attr('href') || ''
                });
            }
        });
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        console.error('Movie Details Error:', error.message);
        res.status(500).json({ 
            error: 'حدث خطأ أثناء جلب تفاصيل الفيلم',
            details: error.message 
        });
    }
});

/**
 * Get direct download links
 * GET /api/download?url=https://moviz-time.live/download-movie/?rid=129018
 */
app.get('/api/download', async (req, res) => {
    try {
        const downloadUrl = req.query.url;
        if (!downloadUrl) {
            return res.status(400).json({ error: 'يرجى إدخال رابط التحميل' });
        }
        
        const response = await axios.get(downloadUrl, { headers, timeout: 10000 });
        const $ = cheerio.load(response.data);
        
        const result = {
            page_title: 'روابط التحميل',
            direct_links: [],
            messages: [],
            download_url: downloadUrl
        };
        
        // Extract page title
        const titleElement = $('h3.title-1');
        if (titleElement.length) {
            result.page_title = titleElement.text().trim();
        }
        
        // Extract direct download links
        $('a.download_btn').each((index, btn) => {
            const url = $(btn).attr('href');
            const text = $(btn).text().trim();
            
            if (url) {
                result.direct_links.push({
                    number: index + 1,
                    name: text,
                    url: url,
                    type: 'تحميل مباشر'
                });
            }
        });
        
        // If no download buttons found, search for all links
        if (result.direct_links.length === 0) {
            $('a[href]').each((index, link) => {
                const url = $(link).attr('href');
                const text = $(link).text().trim();
                
                if (url && (
                    url.toLowerCase().includes('download') ||
                    url.includes('dl.') ||
                    url.includes('uptobox') ||
                    url.includes('m.imovietime') ||
                    url.endsWith('.mp4') ||
                    url.endsWith('.mkv') ||
                    url.endsWith('.avi')
                )) {
                    result.direct_links.push({
                        number: index + 1,
                        name: text || `رابط ${index + 1}`,
                        url: url,
                        type: 'تحميل'
                    });
                }
            });
        }
        
        // Extract messages
        $('.textbox p').each((index, p) => {
            const text = $(p).text().trim();
            if (text && text.length > 10) {
                result.messages.push(text);
            }
        });
        
        res.json({
            success: true,
            ...result
        });
        
    } catch (error) {
        console.error('Download Links Error:', error.message);
        res.status(500).json({ 
            error: 'حدث خطأ أثناء جلب روابط التحميل',
            details: error.message 
        });
    }
});

/**
 * Download file directly (stream)
 * GET /api/download-file?url=https://example.com/file.mp4&filename=movie.mp4
 */
app.get('/api/download-file', async (req, res) => {
    try {
        const fileUrl = req.query.url;
        const filename = req.query.filename || 'movie.mp4';
        
        if (!fileUrl) {
            return res.status(400).json({ error: 'يرجى إدخال رابط الملف' });
        }
        
        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        // Stream the file
        const response = await fetch(fileUrl, { headers });
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        
        // Pipe the response to the client
        response.body.pipe(res);
        
    } catch (error) {
        console.error('File Download Error:', error.message);
        res.status(500).json({ 
            error: 'حدث خطأ أثناء تحميل الملف',
            details: error.message 
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'Moviz Time API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

/**
 * Home page
 */
app.get('/', (req, res) => {
    res.json({
        name: 'Moviz Time API',
        version: '1.0.0',
        description: 'API for searching movies and getting download links from moviz-time.live',
        endpoints: {
            search: 'GET /api/search?q=اسم_الفيلم',
            movie: 'GET /api/movie?url=رابط_الفيلم',
            download: 'GET /api/download?url=رابط_التحميل',
            downloadFile: 'GET /api/download-file?url=رابط_الملف&filename=اسم_الملف',
            health: 'GET /api/health'
        },
        example: 'https://your-api.com/api/search?q=Spider-Man'
    });
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

/**
 * 404 handler
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.url} not found`
    });
});

/**
 * Start server
 */
app.listen(PORT, () => {
    console.log(`✅ Moviz Time API running on port ${PORT}`);
    console.log(`🌐 Base URL: http://localhost:${PORT}`);
    console.log(`🔍 Search endpoint: http://localhost:${PORT}/api/search?q=Spider-Man`);
});

/**
 * Scraper d'opportunités - Version locale
 * Collecte depuis plusieurs sources et sauvegarde en CSV
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Sources à scraper
const SOURCES = [
  // APIs de test
  {
    name: 'JSONPlaceholder (Test)',
    url: 'https://jsonplaceholder.typicode.com/posts',
    type: 'api',
    transform: (data) => {
      return data.slice(0, 5).map(item => ({
        title: item.title,
        description: item.body,
        url: `https://jsonplaceholder.typicode.com/posts/${item.id}`,
        date: new Date().toISOString()
      }));
    }
  },
  
  // Sources réelles - Sénégal
  {
    name: 'DER Sénégal',
    url: 'https://der.sn/',
    type: 'html',
    selectors: {
      container: 'article, .post, .opportunity',
      title: 'h2, h3, .entry-title',
      description: '.entry-content, p',
      link: 'a',
      date: '.date, time'
    }
  },
  {
    name: 'ARCOP (ex-ARMP) Sénégal',
    url: 'http://arcop.sn',
    type: 'html',
    selectors: {
      container: 'table tr, .tender-item, article, .avis-item',
      title: 'td:first-child, .title, h3, h2',
      description: 'td:nth-child(2), .description, p',
      link: 'a',
      date: 'td:last-child, .date'
    }
  },
  {
    name: 'ADEPME',
    url: 'https://www.adepme.sn/',
    type: 'html',
    selectors: {
      container: 'div', // Structure simple, filtrage par H3
      title: 'h3, h2',
      description: 'p',
      link: 'a',
      date: 'span, .date'
    }
  },
  
  // Sources internationales
  {
    name: 'Banque Mondiale',
    url: 'https://projects.worldbank.org/en/projects-operations/procurement',
    type: 'puppeteer', // Site dynamique nécessite JavaScript
    selectors: {
      container: 'div[class*="card"], div[class*="item"], tr',
      title: 'h3, h4, .title, td:first-child',
      description: 'p, .description, td:nth-child(2)',
      link: 'a',
      date: '.date, time, td:last-child'
    }
  },
  {
    name: 'BAD - Banque Africaine de Développement',
    url: 'https://www.afdb.org/en/projects-and-operations/procurement/open-procurement-opportunities',
    type: 'puppeteer',
    selectors: {
      container: 'tr, div[class*="views-row"], div[class*="procurement"]',
      title: 'td:first-child, h3, h4, .field-content',
      description: 'td:nth-child(2), p, .description',
      link: 'a',
      date: 'td:last-child, .date, .field-content'
    }
  },
  {
    name: 'Union Européenne',
    url: 'https://ec.europa.eu/international-partnerships/funding-and-tenders_en',
    type: 'html',
    selectors: {
      container: '.call-item, article, .funding-item',
      title: '.title, h3, h2',
      description: '.description, p',
      link: 'a',
      date: '.deadline, .date'
    }
  },
  {
    name: 'PNUD Sénégal',
    url: 'https://www.sn.undp.org/',
    type: 'puppeteer',
    selectors: {
      container: 'article, div[class*="card"], div[class*="item"]',
      title: 'h2, h3, h4, .title',
      description: 'p, .description, .excerpt',
      link: 'a',
      date: 'time, .date, span[class*="date"]'
    }
  },
  {
    name: 'GIZ Sénégal',
    url: 'https://www.giz.de/en/worldwide/391.html',
    type: 'html',
    selectors: {
      container: 'article, .project',
      title: 'h2, h3',
      description: 'p, .description',
      link: 'a',
      date: '.date'
    }
  },
  {
    name: 'USAID',
    url: 'https://sn.usembassy.gov/business-opportunities/',
    type: 'puppeteer', // Site avec en-têtes volumineux, utiliser Puppeteer
    selectors: {
      container: 'article, .opportunity, .item, div[class*="content"], .entry',
      title: 'h2, h3, h4, .title, .entry-title',
      description: '.description, p, .summary, .entry-content',
      link: 'a',
      date: '.date, time, .datetime, .published'
    }
  }
];

/**
 * Scraper une source avec Puppeteer (pour contourner les protections anti-bot)
 */
async function scrapeWithPuppeteer(source) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Simuler un vrai navigateur
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Naviguer vers la page
    await page.goto(source.url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Attendre plus longtemps pour le chargement JavaScript (5 secondes)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Scroller pour déclencher le lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Récupérer le HTML
    const html = await page.content();
    await browser.close();

    // Parser avec Cheerio
    const $ = cheerio.load(html);
    const opportunities = [];

    let elements = $(source.selectors.container);
    
    if (elements.length === 0) {
      elements = $('article, .post, .item, .card').filter((_, el) => {
        return $(el).find('h1, h2, h3, h4').length > 0;
      });
    }

    elements.each((_, elem) => {
      const $elem = $(elem);
      
      let title = $elem.find(source.selectors.title).first().text().trim();
      if (!title) {
        title = $elem.find('h1, h2, h3, h4, .title').first().text().trim();
      }
      
      let description = $elem.find(source.selectors.description).first().text().trim();
      if (!description) {
        description = $elem.find('p, .excerpt, .summary').first().text().trim();
      }
      
      let link = $elem.find(source.selectors.link).first().attr('href') || '';
      if (!link) {
        link = $elem.find('a').first().attr('href') || '';
      }
      
      const date = $elem.find(source.selectors.date).first().text().trim();

      if (title && title.length > 5) {
        try {
          const fullUrl = link.startsWith('http') ? link : new URL(link, source.url).href;
          opportunities.push({
            source: source.name,
            title: title.substring(0, 200),
            description: description.substring(0, 500),
            url: fullUrl,
            date: date || '',
            collected_at: new Date().toISOString()
          });
        } catch (urlError) {
          // Ignorer si l'URL est invalide
        }
      }
    });

    return opportunities;

  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

/**
 * Scraper une source
 */
async function scrapeSource(source) {
  console.log(`\n🔍 Scraping: ${source.name}`);
  
  try {
    // Si c'est une API JSON
    if (source.type === 'api') {
      const response = await axios.get(source.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const opportunities = source.transform(response.data).map(opp => ({
        source: source.name,
        title: opp.title,
        description: opp.description,
        url: opp.url,
        date: opp.date,
        collected_at: new Date().toISOString()
      }));

      console.log(`✅ ${opportunities.length} opportunités trouvées`);
      return opportunities;
    }

    // Si c'est du Puppeteer (pour contourner les protections)
    if (source.type === 'puppeteer') {
      const opportunities = await scrapeWithPuppeteer(source);
      console.log(`✅ ${opportunities.length} opportunités trouvées`);
      return opportunities;
    }

    // Sinon, scraping HTML avec gestion SSL
    const response = await axios.get(source.url, {
      timeout: 15000,
      maxRedirects: 5,
      httpsAgent: new (require('https')).Agent({
        rejectUnauthorized: false // Accepter les certificats auto-signés
      }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });

    const $ = cheerio.load(response.data);
    const opportunities = [];

    // Essayer plusieurs sélecteurs si le premier ne fonctionne pas
    let elements = $(source.selectors.container);
    
    if (elements.length === 0) {
      // Fallback: chercher tous les articles/divs avec des titres
      elements = $('article, .post, .item, .card').filter((_, el) => {
        return $(el).find('h1, h2, h3, h4').length > 0;
      });
    }

    elements.each((_, elem) => {
      const $elem = $(elem);
      
      // Essayer plusieurs sélecteurs pour le titre
      let title = $elem.find(source.selectors.title).first().text().trim();
      if (!title) {
        title = $elem.find('h1, h2, h3, h4, .title').first().text().trim();
      }
      
      // Essayer plusieurs sélecteurs pour la description
      let description = $elem.find(source.selectors.description).first().text().trim();
      if (!description) {
        description = $elem.find('p, .excerpt, .summary').first().text().trim();
      }
      
      // Essayer plusieurs sélecteurs pour le lien
      let link = $elem.find(source.selectors.link).first().attr('href') || '';
      if (!link) {
        link = $elem.find('a').first().attr('href') || '';
      }
      
      // Date
      const date = $elem.find(source.selectors.date).first().text().trim();

      if (title && title.length > 5) { // Minimum 5 caractères pour éviter les faux positifs
        try {
          const fullUrl = link.startsWith('http') ? link : new URL(link, source.url).href;
          opportunities.push({
            source: source.name,
            title: title.substring(0, 200), // Limiter à 200 caractères
            description: description.substring(0, 500), // Limiter à 500 caractères
            url: fullUrl,
            date: date || '',
            collected_at: new Date().toISOString()
          });
        } catch (urlError) {
          // Ignorer si l'URL est invalide
        }
      }
    });

    console.log(`✅ ${opportunities.length} opportunités trouvées`);
    return opportunities;

  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return [];
  }
}

/**
 * Sauvegarder en CSV
 */
function saveToCSV(opportunities, filename) {
  const csvDir = path.join(__dirname, 'data', 'raw');
  
  // Créer le dossier si nécessaire
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
  }

  const csvPath = path.join(csvDir, filename);
  
  // En-têtes CSV
  const headers = ['source', 'title', 'description', 'url', 'date', 'collected_at'];
  
  // Convertir en CSV
  const csvContent = [
    headers.join(','),
    ...opportunities.map(opp => 
      headers.map(h => {
        const value = opp[h] || '';
        // Échapper les guillemets et virgules
        return `"${value.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`\n💾 Sauvegardé: ${csvPath}`);
  console.log(`📊 Total: ${opportunities.length} opportunités`);
}

/**
 * Collecte principale
 */
async function collect() {
  console.log('========================================');
  console.log('🚀 COLLECTE DES OPPORTUNITÉS');
  console.log('========================================');

  const allOpportunities = [];

  for (const source of SOURCES) {
    const opportunities = await scrapeSource(source);
    allOpportunities.push(...opportunities);
    
    // Pause plus longue entre les sources (3-5 secondes)
    const pauseTime = 3000 + Math.random() * 2000;
    console.log(`⏳ Pause de ${Math.round(pauseTime/1000)}s avant la prochaine source...`);
    await new Promise(resolve => setTimeout(resolve, pauseTime));
  }

  // Sauvegarder avec timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `opportunities_${timestamp}.csv`;
  
  saveToCSV(allOpportunities, filename);

  console.log('\n========================================');
  console.log('✅ COLLECTE TERMINÉE');
  console.log('========================================\n');
}

// Lancer la collecte
if (require.main === module) {
  collect().catch(console.error);
}

module.exports = { collect, scrapeSource };

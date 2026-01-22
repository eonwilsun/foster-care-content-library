// Custom web scrapers for sites without RSS feeds

async function scrapeCompassFosteringNews() {
  try {
    const response = await fetch('https://www.compassfostering.com/news/');
    if (!response.ok) return [];
    
    const html = await response.text();
    const articles = [];
    
    // Compass structure: <a href=URL> ... <img data-src=IMAGE> ... <span class="...opacity-70">DATE</span><h3 class="heading-five my-4">TITLE</h3>
    const articleRegex = /<a\s+href=(https:\/\/www\.compassfostering\.com\/news\/[^\s>]+)[^>]*>[\s\S]*?<img[^>]+data-src=([^\s>]+)[\s\S]*?<span[^>]*opacity-70">([^<]+)<\/span><h3 class="heading-five my-4">([^<]+)<\/h3>/gi;
    
    let match;
    while ((match = articleRegex.exec(html)) !== null && articles.length < 10) {
      const [, link, image, dateText, title] = match;
      
      // Parse date from format like "26 December 2025"
      let pubDate = new Date().toISOString();
      try {
        pubDate = new Date(dateText.trim()).toISOString();
      } catch (e) {
        // Use current date if parsing fails
      }
      
      articles.push({
        title: title.trim(),
        link: link.trim(),
        pubDate,
        contentSnippet: '',
        image: image.trim()
      });
    }
    
    return articles;
  } catch (error) {
    console.error('Error scraping Compass Fostering News:', error.message);
    return [];
  }
}

async function scrapeCompassFosteringBlogs() {
  try {
    const response = await fetch('https://www.compassfostering.com/blogs/');
    if (!response.ok) return [];
    
    const html = await response.text();
    const articles = [];
    
    // Blogs structure - note that href might not contain /blogs/ path
    const articleRegex = /<a\s+href=(https:\/\/www\.compassfostering\.com\/[^>\s]+)[^>]*class="Post__Grid-split-image[^>]*>[\s\S]*?<img[^>]+data-src=([^\s>]+)[\s\S]*?<span[^>]*opacity-70">([^<]+)<\/span><h3 class="heading-five my-4">([^<]+)<\/h3>/gi;
    
    let match;
    while ((match = articleRegex.exec(html)) !== null && articles.length < 10) {
      const [, link, image, dateText, title] = match;
      
      // Only include links that don't already point to /news/ (to avoid duplicates)
      if (link.includes('/news/')) continue;
      
      let pubDate = new Date().toISOString();
      try {
        pubDate = new Date(dateText.trim()).toISOString();
      } catch (e) {
        // Use current date if parsing fails
      }
      
      articles.push({
        title: title.trim(),
        link: link.trim(),
        pubDate,
        contentSnippet: '',
        image: image.trim()
      });
    }
    
    return articles;
  } catch (error) {
    console.error('Error scraping Compass Fostering Blogs:', error.message);
    return [];
  }
}

async function scrapeCapstoneFosterCare() {
  try {
    const response = await fetch('https://www.capstonefostercare.co.uk/news-and-blogs');
    if (!response.ok) return [];
    
    const html = await response.text();
    const articles = [];
    
    // Capstone article structure
    const articleRegex = /<a href="(https:\/\/www\.capstonefostercare\.co\.uk\/news-and-blogs\/[^"]+)">\s*<div class="img-gradient">\s*<img[^>]+src="([^"]+)"[^>]*>\s*<\/div>[\s\S]*?<p[^>]*class="[^"]*article-card__date[^"]*">([^<]+)<\/p>\s*<h4[^>]*class="card-title">([^<]+)<\/h4>/gi;
    
    let match;
    while ((match = articleRegex.exec(html)) !== null && articles.length < 10) {
      const [, link, imagePath, dateText, title] = match;
      
      // Parse the date from format like "2nd January, 2026"
      let pubDate = new Date().toISOString();
      try {
        const cleanDate = dateText.trim().replace(/(\d+)(st|nd|rd|th)\s+/, '$1 ');
        pubDate = new Date(cleanDate).toISOString();
      } catch (e) {
        // Use current date if parsing fails
      }
      
      const imageUrl = imagePath.startsWith('http') 
        ? imagePath 
        : `https://www.capstonefostercare.co.uk${imagePath}`;
      
      articles.push({
        title: title.trim().replace(/&nbsp;/g, ' '),
        link: link.trim(),
        pubDate,
        contentSnippet: '',
        image: imageUrl
      });
    }
    
    return articles;
  } catch (error) {
    console.error('Error scraping Capstone Foster Care:', error.message);
    return [];
  }
}

async function scrapeFosteringSomerset() {
  try {
    const response = await fetch('https://www.fosteringinsomerset.org.uk/news');
    if (!response.ok) return [];
    
    const html = await response.text();
    const articles = [];
    
    // Somerset structure: <article> ... <a href="/news/[slug]"> ... <span class="day"><span class="number">18</span> ... <span class="month">Dec</span> ... <h2 class="title"><a href="...">TITLE</a></h2> ... <div class="text">SNIPPET</div>
    const articleRegex = /<article[^>]*>[\s\S]*?<a[^>]*href="(\/news\/[^"]+)"[^>]*style="background-image: url\(([^)]+)\)[^>]*>[\s\S]*?<span class="number">(\d+)<\/span>[\s\S]*?<span class="month">([^<]+)<\/span>[\s\S]*?<h2 class="title"><a[^>]*>([^<]+)<\/a><\/h2>[\s\S]*?<div class="text">\s*<div class="text">\s*([^<]+?)<\/div>/gi;
    
    let match;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11
    
    while ((match = articleRegex.exec(html)) !== null && articles.length < 10) {
      const [, link, imageStyle, day, month, title, snippet] = match;
      
      // Parse date from day/month - assume year is current or previous year
      // If the date would be in the future, it's from last year
      let pubDate = new Date().toISOString();
      try {
        const monthIndex = new Date(`${month} 1, 2000`).getMonth();
        let year = currentYear;
        
        // If this month/day combo is in the future, it must be from last year or earlier
        const testDate = new Date(year, monthIndex, parseInt(day));
        if (testDate > new Date()) {
          year = currentYear - 1;
        }
        
        pubDate = new Date(`${month} ${day}, ${year}`).toISOString();
      } catch (e) {
        // Use current date if parsing fails
      }
      
      // Extract image URL - Somerset uses /SiteAssetImage proxy, keep that format
      let imageUrl = null;
      // imageStyle already contains the URL from the url() capture
      if (imageStyle && imageStyle.startsWith('/SiteAssetImage')) {
        imageUrl = `https://www.fosteringinsomerset.org.uk${imageStyle}`;
      }
      
      articles.push({
        title: title.trim(),
        link: `https://www.fosteringinsomerset.org.uk${link.trim()}`,
        pubDate,
        contentSnippet: snippet ? snippet.trim().replace(/&rsquo;/g, "'").replace(/&hellip;/g, '...') : '',
        image: imageUrl
      });
    }
    
    return articles;
  } catch (error) {
    console.error('Error scraping Fostering Somerset:', error.message);
    return [];
  }
}

export const scrapers = {
  'competitor1-news': scrapeCompassFosteringNews,
  'competitor1-blogs': scrapeCompassFosteringBlogs,
  'competitor5-news': scrapeCapstoneFosterCare,
  'competitor7-news': scrapeFosteringSomerset
};

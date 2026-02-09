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
    
    // Somerset structure: <article> with links, images, dates, and text
    // First, find all article blocks
    const articleBlockRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    const blocks = [];
    let blockMatch;
    
    while ((blockMatch = articleBlockRegex.exec(html)) !== null && blocks.length < 10) {
      blocks.push(blockMatch[1]);
    }
    
    const currentYear = new Date().getFullYear();
    
    for (const block of blocks) {
      // Extract link
      const linkMatch = /<a[^>]*href="(\/news\/[^"]+)"/.exec(block);
      if (!linkMatch) continue;
      const link = linkMatch[1];
      
      // Extract image from style attribute (background-image: url(...))
      const imageMatch = /background-image:\s*url\(([^)]+)\)/.exec(block);
      let imageUrl = null;
      if (imageMatch && imageMatch[1]) {
        const imgPath = imageMatch[1].replace(/['"]/g, '');
        if (imgPath.startsWith('/SiteAssetImage') || imgPath.startsWith('http')) {
          imageUrl = imgPath.startsWith('http') ? imgPath : `https://www.fosteringinsomerset.org.uk${imgPath}`;
        }
      }
      
      // Extract date
      const dayMatch = /<span class="number">(\d+)<\/span>/.exec(block);
      const monthMatch = /<span class="month">([^<]+)<\/span>/.exec(block);
      let pubDate = new Date().toISOString();
      
      if (dayMatch && monthMatch) {
        try {
          const day = parseInt(dayMatch[1]);
          const month = monthMatch[1].trim();
          const monthIndex = new Date(`${month} 1, 2000`).getMonth();
          let year = currentYear;
          
          // If this month/day combo is in the future, it must be from last year
          const testDate = new Date(year, monthIndex, day);
          if (testDate > new Date()) {
            year = currentYear - 1;
          }
          
          pubDate = new Date(`${month} ${day}, ${year}`).toISOString();
        } catch (e) {
          // Keep default date
        }
      }
      
      // Extract title
      const titleMatch = /<h2 class="title"><a[^>]*>([^<]+)<\/a><\/h2>/.exec(block);
      if (!titleMatch) continue;
      const title = titleMatch[1].trim();
      
      // Extract snippet
      const snippetMatch = /<div class="text">\s*<div class="text">\s*([^<]+)/.exec(block);
      const snippet = snippetMatch ? snippetMatch[1].trim().replace(/&rsquo;/g, "'").replace(/&hellip;/g, '...').replace(/\r?\n/g, ' ') : '';
      
      articles.push({
        title,
        link: `https://www.fosteringinsomerset.org.uk${link.trim()}`,
        pubDate,
        contentSnippet: snippet,
        image: imageUrl
      });
    }
    
    return articles;
  } catch (error) {
    console.error('Error scraping Fostering Somerset:', error.message);
    return [];
  }
}

// Facebook Graph API scrapers
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

async function fetchFacebookPosts(pageId, limit = 10) {
  if (!FACEBOOK_ACCESS_TOKEN) {
    console.log('  ⚠ No Facebook access token found. Set FACEBOOK_ACCESS_TOKEN environment variable.');
    return [];
  }

  try {
    const fields = 'id,message,created_time,permalink_url,full_picture,attachments{media,title,description}';
    const url = `https://graph.facebook.com/v18.0/${pageId}/posts?fields=${fields}&limit=${limit}&access_token=${FACEBOOK_ACCESS_TOKEN}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      console.error(`  ✗ Facebook API Error for ${pageId}:`, error.error?.message || response.statusText);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return [];
    }
    
    // Transform to our format
    return data.data.map(post => ({
      title: extractFacebookTitle(post),
      link: post.permalink_url,
      pubDate: new Date(post.created_time).toISOString(),
      contentSnippet: (post.message || '').substring(0, 300),
      image: post.full_picture || extractFirstAttachmentImage(post.attachments)
    }));
    
  } catch (error) {
    console.error(`  ✗ Error fetching Facebook posts for ${pageId}:`, error.message);
    return [];
  }
}

function extractFacebookTitle(post) {
  if (post.message) {
    const firstLine = post.message.split('\n')[0];
    return firstLine.length > 100 ? firstLine.substring(0, 97) + '...' : firstLine;
  }
  
  if (post.attachments?.data?.[0]?.title) {
    return post.attachments.data[0].title;
  }
  
  return 'Facebook Post';
}

function extractFirstAttachmentImage(attachments) {
  if (!attachments?.data?.[0]?.media?.image?.src) {
    return null;
  }
  return attachments.data[0].media.image.src;
}

// Facebook scrapers for each source
async function scrapeSwiiseFacebook() {
  return await fetchFacebookPosts('swiisfostercare', 10);
}

async function scrapeCompassFacebook() {
  return await fetchFacebookPosts('compassfostering', 10);
}

export const scrapers = {
  'competitor1-news': scrapeCompassFosteringNews,
  'competitor1-blogs': scrapeCompassFosteringBlogs,
  'competitor5-news': scrapeCapstoneFosterCare,
  'competitor7-news': scrapeFosteringSomerset,
  // Facebook scrapers
  'ours-facebook': scrapeSwiiseFacebook,
  'competitor1-facebook': scrapeCompassFacebook
};

// Facebook Graph API Integration Example
// This is the LEGAL and PROPER way to get Facebook posts
// 
// Setup Required:
// 1. Create a Facebook App at https://developers.facebook.com/
// 2. Get an Access Token with 'pages_read_engagement' permission
// 3. Get the Page ID for each Facebook page
// 4. Add to environment variables or config

const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN';

/**
 * Fetch posts from a Facebook page using Graph API
 * @param {string} pageId - The Facebook page ID or username
 * @param {number} limit - Number of posts to fetch (max 100)
 */
async function fetchFacebookPosts(pageId, limit = 10) {
  try {
    const fields = 'id,message,created_time,permalink_url,full_picture,attachments{media,title,description}';
    const url = `https://graph.facebook.com/v18.0/${pageId}/posts?fields=${fields}&limit=${limit}&access_token=${FACEBOOK_ACCESS_TOKEN}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Facebook API Error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log(`No posts found for page: ${pageId}`);
      return [];
    }
    
    // Transform to our format
    return data.data.map(post => ({
      title: extractTitle(post),
      link: post.permalink_url,
      pubDate: new Date(post.created_time).toISOString(),
      contentSnippet: post.message || '',
      image: post.full_picture || extractFirstImage(post.attachments)
    }));
    
  } catch (error) {
    console.error(`Error fetching Facebook posts for ${pageId}:`, error.message);
    return [];
  }
}

/**
 * Extract a title from the post (use first line of message or attachment title)
 */
function extractTitle(post) {
  if (post.message) {
    const firstLine = post.message.split('\n')[0];
    return firstLine.length > 100 ? firstLine.substring(0, 97) + '...' : firstLine;
  }
  
  if (post.attachments?.data?.[0]?.title) {
    return post.attachments.data[0].title;
  }
  
  return 'Facebook Post';
}

/**
 * Extract first image from attachments
 */
function extractFirstImage(attachments) {
  if (!attachments?.data?.[0]?.media?.image?.src) {
    return null;
  }
  return attachments.data[0].media.image.src;
}

/**
 * Get Page ID from Page username/URL
 */
async function getPageId(pageUsername) {
  try {
    const url = `https://graph.facebook.com/v18.0/${pageUsername}?fields=id,name&access_token=${FACEBOOK_ACCESS_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to get page ID for ${pageUsername}`);
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error(`Error getting page ID for ${pageUsername}:`, error.message);
    return null;
  }
}

// Example usage:
export async function scrapeSwiiseFacebook() {
  // Replace with actual page ID or username
  return await fetchFacebookPosts('swiisfostercare', 10);
}

export async function scrapeCompassFacebook() {
  return await fetchFacebookPosts('compassfostering', 10);
}

// To integrate into build-feeds.mjs, add to scrapers export:
export const facebookScrapers = {
  'ours-facebook': scrapeSwiiseFacebook,
  'competitor1-facebook': scrapeCompassFacebook,
  // Add more as needed
};

/* 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Go to https://developers.facebook.com/apps
 * 2. Create a new app (type: Business)
 * 3. Add "Facebook Login" product
 * 4. Go to Graph API Explorer
 * 5. Generate Access Token with permissions:
 *    - pages_read_engagement
 *    - pages_show_list
 * 6. For production, convert to long-lived token:
 *    https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
 * 
 * 7. Set environment variable:
 *    SET FACEBOOK_ACCESS_TOKEN=your_token_here
 * 
 * 8. Find Page IDs by searching in Graph API Explorer or use page username
 * 
 * LIMITATIONS:
 * - Requires app review for public use
 * - Access tokens expire (use long-lived tokens)
 * - Rate limits apply (200 calls per hour for standard apps)
 * - Only works for pages you have access to or public pages
 */

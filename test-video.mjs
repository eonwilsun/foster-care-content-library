import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['content:encoded']
  }
});

const feed = await parser.parseURL('https://fetchrss.com/feed/1vl3Fu6JL6kM1vl3N75Ie3ik.rss');
const videoPost = feed.items.find(i => i.link && i.link.includes('reel'));

if (videoPost) {
  console.log('=== VIDEO POST ===');
  console.log('Title:', videoPost.title);
  console.log('\nTesting iframe extraction...');
  
  const content = videoPost.content || videoPost['content:encoded'] || '';
  console.log('\nContent length:', content.length);
  console.log('\nContent preview:', content.substring(0, 500));
  
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
  const match = iframeRegex.exec(content);
  
  if (match) {
    console.log('\n✓ Iframe found:', match[1]);
    
    const decodedIframeUrl = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
    
    console.log('\n✓ Decoded:', decodedIframeUrl);
    
    const videoMatch = decodedIframeUrl.match(/href=([^&]+)/);
    if (videoMatch) {
      const videoUrl = decodeURIComponent(videoMatch[1]);
      console.log('\n✓ Extracted video URL:', videoUrl);
    } else {
      console.log('\n✗ Could not extract video URL from iframe');
    }
  } else {
    console.log('\n✗ No iframe found in content');
  }
}

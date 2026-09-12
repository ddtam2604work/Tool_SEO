import fs from 'fs';

async function run() {
  try {
    const res = await fetch('https://spintx.vn/assets/article-detail-data-D4dXUrOL.js');
    const txt = await res.text();
    
    // Replace export statement at the end
    const cleanCode = txt.replace(/export\s*\{[^}]+\};?/g, '; return { e: typeof e !== "undefined" ? e : null, t: typeof t !== "undefined" ? t : null, n: typeof n !== "undefined" ? n : null };');
    
    const fn = new Function(cleanCode);
    const result = fn();
    console.log('Result keys:', Object.keys(result));
    
    const allArticles = result.n || result.t || result.e || [];
    console.log('Total articles found:', allArticles.length);
    
    // Save the full articles to src/data/spintx_articles.json
    fs.writeFileSync('src/data/spintx_articles.json', JSON.stringify(allArticles, null, 2), 'utf8');
    console.log('Successfully saved all articles with full contentHtml to src/data/spintx_articles.json!');
    
    // Print first 5 articles summary
    allArticles.slice(0, 5).forEach((art, idx) => {
      console.log(`\n[${idx + 1}] ID: ${art.id} | Slug: ${art.slug}`);
      console.log(`    Title: ${art.title}`);
      console.log(`    Content length: ${(art.contentHtml || '').length} characters`);
      console.log(`    TOC items: ${(art.tableOfContents || []).length}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

run();

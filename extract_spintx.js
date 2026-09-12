import fs from 'fs';

async function extractArticles() {
  try {
    const res = await fetch('https://spintx.vn/assets/article-detail-data-D4dXUrOL.js');
    const txt = await res.text();
    
    // Find all occurrences of `{id:`
    const articles = [];
    const idMatches = [...txt.matchAll(/\{\s*id:`([^`]+)`,slug:`([^`]+)`,title:`([^`]+)`/g)];
    console.log(`Found ${idMatches.length} article headers!`);

    for (let i = 0; i < idMatches.length; i++) {
      const match = idMatches[i];
      const startIdx = match.index;
      const nextStartIdx = i < idMatches.length - 1 ? idMatches[i + 1].index : txt.lastIndexOf('];');
      const block = txt.substring(startIdx, nextStartIdx);
      
      const id = match[1];
      const slug = match[2];
      const title = match[3];
      
      const catMatch = block.match(/category:`([^`]+)`/);
      const category = catMatch ? catMatch[1] : '';
      
      const authorMatch = block.match(/name:`([^`]+)`/);
      const author = authorMatch ? authorMatch[1] : 'SPINTX';
      
      const dateMatch = block.match(/publishedDate:`([^`]+)`/);
      const publishedDate = dateMatch ? dateMatch[1] : '';
      
      const excerptMatch = block.match(/excerpt:`([^`]+)`/);
      const excerpt = excerptMatch ? excerptMatch[1] : '';
      
      // Extract contentHtml: contentHtml:`...`
      const contentMatch = block.match(/contentHtml:`([\s\S]*?)`,\s*(?:faq|relatedArticles|seo|schema|$)/);
      const contentHtml = contentMatch ? contentMatch[1].trim() : '';

      // Extract FAQ if present
      const faqMatches = [];
      const faqBlockMatch = block.match(/faq:\s*\[([\s\S]*?)\]/);
      if (faqBlockMatch) {
        const qMatches = [...faqBlockMatch[1].matchAll(/question:`([^`]+)`,answer:`([^`]+)`/g)];
        qMatches.forEach(qm => {
          faqMatches.push({
            question: qm[1],
            answer: qm[2]
          });
        });
      }

      articles.push({
        id,
        slug,
        title,
        category,
        author,
        publishedDate,
        excerpt,
        contentHtml,
        faq: faqMatches
      });
    }

    console.log(`Successfully extracted ${articles.length} complete articles!`);
    articles.forEach((a, idx) => {
      console.log(`${idx + 1}. [${a.id}] ${a.title} (Slug: ${a.slug}) - Content length: ${a.contentHtml.length} chars, FAQs: ${a.faq.length}`);
    });

    fs.writeFileSync('src/data/spintx_articles.json', JSON.stringify(articles, null, 2), 'utf-8');
    console.log('Saved to src/data/spintx_articles.json!');
  } catch (err) {
    console.error('Error extracting articles:', err);
  }
}

extractArticles();

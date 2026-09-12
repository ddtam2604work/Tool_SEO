/**
 * SEOPulse Pro - Storage & Export Manager
 * Handles LocalStorage persistence, multi-document management and clean HTML/Markdown export
 */

const STORAGE_KEY_CURRENT = 'seopulse_current_doc';
const STORAGE_KEY_LIST = 'seopulse_docs_list';

export function saveCurrentDocument(docData) {
  try {
    const dataWithTimestamp = {
      ...docData,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(dataWithTimestamp));
    
    // Also update or add in docs list
    let docs = getSavedDocumentsList();
    const id = docData.id || 'default-doc';
    const index = docs.findIndex(d => d.id === id);
    if (index >= 0) {
      docs[index] = { ...docs[index], ...dataWithTimestamp };
    } else {
      docs.unshift(dataWithTimestamp);
    }
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(docs));
    return true;
  } catch (err) {
    console.error('Lỗi khi lưu vào LocalStorage:', err);
    return false;
  }
}

export function loadCurrentDocument() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Lỗi khi tải từ LocalStorage:', err);
    return null;
  }
}

export function getSavedDocumentsList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIST);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function deleteDocument(docId) {
  try {
    let docs = getSavedDocumentsList();
    docs = docs.filter(d => d.id !== docId);
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(docs));
    return true;
  } catch (err) {
    return false;
  }
}

// Convert HTML to Clean Markdown
export function htmlToMarkdown(html) {
  const div = document.createElement('div');
  div.innerHTML = html;

  let md = '';
  
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const childText = Array.from(node.childNodes).map(walk).join('');

    switch (tag) {
      case 'h1': return `\n# ${childText}\n\n`;
      case 'h2': return `\n## ${childText}\n\n`;
      case 'h3': return `\n### ${childText}\n\n`;
      case 'h4': return `\n#### ${childText}\n\n`;
      case 'p': return `${childText}\n\n`;
      case 'strong':
      case 'b': return `**${childText}**`;
      case 'em':
      case 'i': return `*${childText}*`;
      case 'u': return `_${childText}_`;
      case 's': return `~~${childText}~~`;
      case 'blockquote': return `> ${childText.trim()}\n\n`;
      case 'ul': return `${childText}\n`;
      case 'ol': return `${childText}\n`;
      case 'li': return `- ${childText}\n`;
      case 'a': return `[${childText}](${node.getAttribute('href') || '#'})`;
      case 'img': return `![${node.getAttribute('alt') || 'image'}](${node.getAttribute('src') || ''})\n\n`;
      case 'div': return `${childText}\n`;
      default: return childText;
    }
  }

  md = walk(div).replace(/\n{3,}/g, '\n\n').trim();
  return md;
}

// Generate Full Standalone HTML with Meta Tags & Schema for Indexing
export function generateFullHtmlDocument({
  title,
  seoTitle,
  metaDesc,
  slug,
  author,
  contentHtml,
  schemaScript
}) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seoTitle || title || 'Bài Viết Chuẩn SEO'}</title>
  <meta name="description" content="${metaDesc || ''}">
  <meta name="author" content="${author || ''}">
  <link rel="canonical" href="https://yoursite.com/${slug || ''}">
  
  <!-- Open Graph / Facebook / Zalo -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${seoTitle || title || ''}">
  <meta property="og:description" content="${metaDesc || ''}">
  <meta property="og:url" content="https://yoursite.com/${slug || ''}">
  <meta property="og:site_name" content="Your Brand">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${seoTitle || title || ''}">
  <meta name="twitter:description" content="${metaDesc || ''}">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <style>
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; line-height: 1.8; color: #1E293B; max-width: 840px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 2.2rem; color: #0F172A; line-height: 1.3; }
    h2 { font-size: 1.6rem; color: #1E293B; margin-top: 2rem; }
    h3 { font-size: 1.3rem; color: #334155; }
    p { margin-bottom: 1.2rem; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th, td { border: 1px solid #E2E8F0; padding: 10px 14px; text-align: left; }
    th { background: #F1F5F9; }
    .smart-block-direct-answer { background: #EFF6FF; border: 2px dashed #93C5FD; padding: 18px; border-radius: 8px; margin: 20px 0; }
    .smart-block-eeat { background: #ECFDF5; border-left: 5px solid #10B981; padding: 18px; border-radius: 6px; margin: 20px 0; }
    .smart-block-cta { background: #FFFBEB; border: 2px solid #FCD34D; padding: 24px; border-radius: 12px; text-align: center; margin: 30px 0; }
    .cta-btn-action { display: inline-block; background: #F59E0B; color: #fff; padding: 10px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; }
  </style>

  <!-- Schema Markup JSON-LD -->
  ${schemaScript || ''}
</head>
<body>
  <article>
    ${contentHtml || ''}
  </article>
</body>
</html>`;
}

/**
 * SEOPulse Pro - Realtime Google SEO & EEAT Analyzer
 * Evaluates text against Helpful Content System & EEAT Guidelines
 */

// Utility: Normalize Vietnamese text to lower & remove accents for slug/matching
export function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  // Remove special symbols
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
  str = str.replace(/\u02C6|\u0306|\u031B/g, "");
  return str;
}

// Convert text to clean SEO URL slug
export function generateSlug(text) {
  if (!text) return '';
  let str = removeVietnameseTones(text);
  str = str.replace(/[^a-z0-9\s-]/g, '');
  str = str.trim().replace(/\s+/g, '-');
  return str.replace(/-+/g, '-');
}

// Count occurrences of a keyword (case-insensitive, accent-insensitive)
export function countKeywordOccurrences(text, keyword) {
  if (!text || !keyword) return 0;
  const normText = removeVietnameseTones(text);
  const normKeyword = removeVietnameseTones(keyword.trim());
  if (!normKeyword) return 0;

  // Escape special regex chars
  const escaped = normKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  const matches = normText.match(regex);
  return matches ? matches.length : 0;
}

export function analyzeSEO({
  contentHtml,
  focusKeyword,
  lsiKeywords = [],
  seoTitle,
  metaDesc,
  slug,
  author,
  searchIntent = 'commercial'
}) {
  // Parse HTML using DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(contentHtml || '', 'text/html');
  const rawText = doc.body.textContent || '';
  
  // Extract words
  const words = rawText.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const charCount = rawText.length;
  const readingTime = Math.ceil(wordCount / 200) || 1;

  // Keyword counts & density
  const keywordOccurrences = countKeywordOccurrences(rawText, focusKeyword);
  const keywordWordCount = (focusKeyword || '').trim().split(/\s+/).filter(Boolean).length || 1;
  const density = wordCount > 0 ? ((keywordOccurrences * keywordWordCount) / wordCount) * 100 : 0;

  // Headings
  const h1s = doc.querySelectorAll('h1');
  const h2s = doc.querySelectorAll('h2');
  const h3s = doc.querySelectorAll('h3');
  const h4s = doc.querySelectorAll('h4');

  // Images
  const images = doc.querySelectorAll('img');
  let imagesWithAlt = 0;
  let imagesWithKeywordAlt = 0;
  images.forEach(img => {
    const alt = img.getAttribute('alt') || '';
    if (alt.trim().length > 0) {
      imagesWithAlt++;
      if (focusKeyword && removeVietnameseTones(alt).includes(removeVietnameseTones(focusKeyword))) {
        imagesWithKeywordAlt++;
      }
    }
  });

  // Links
  const links = doc.querySelectorAll('a');
  let internalLinks = 0;
  let externalLinks = 0;
  links.forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('http://') || href.startsWith('https://')) {
      externalLinks++;
    } else if (href.startsWith('/') || href.startsWith('#')) {
      internalLinks++;
    }
  });

  // Smart Blocks check (EEAT, Direct Answer, FAQ, CTA)
  const hasDirectAnswer = doc.querySelector('.smart-block-direct-answer') !== null || rawText.toLowerCase().includes('tóm tắt') || rawText.toLowerCase().includes('câu trả lời');
  const hasEEAT = doc.querySelector('.smart-block-eeat') !== null || rawText.toLowerCase().includes('trải nghiệm') || rawText.toLowerCase().includes('case study');
  const hasExpert = doc.querySelector('.smart-block-expert') !== null || (author && author.trim().length > 5);
  const hasFAQ = doc.querySelector('.smart-block-faq') !== null || doc.querySelectorAll('.faq-item').length > 0 || rawText.toLowerCase().includes('câu hỏi thường gặp');
  const hasTable = doc.querySelectorAll('table').length > 0;
  const hasList = (doc.querySelectorAll('ul').length + doc.querySelectorAll('ol').length) > 0;

  // First 100 words & last 100 words check
  const first100Words = words.slice(0, 100).join(' ');
  const last100Words = words.slice(-100).join(' ');
  const inFirst100 = focusKeyword ? countKeywordOccurrences(first100Words, focusKeyword) > 0 : false;
  const inLast100 = focusKeyword ? countKeywordOccurrences(last100Words, focusKeyword) > 0 : false;

  // LSI keywords status
  const lsiResults = lsiKeywords.map(kw => {
    const count = countKeywordOccurrences(rawText, kw);
    return {
      keyword: kw,
      count,
      used: count > 0
    };
  });
  const usedLsiCount = lsiResults.filter(r => r.used).length;

  // Checklist Evaluation
  const metaChecks = [];
  const contentChecks = [];
  const eeatChecks = [];

  // 1. Meta Title Checks
  const titleLen = (seoTitle || '').trim().length;
  const hasKeywordInTitle = focusKeyword && seoTitle && removeVietnameseTones(seoTitle).includes(removeVietnameseTones(focusKeyword));
  const keywordAtTitleStart = focusKeyword && seoTitle && removeVietnameseTones(seoTitle).indexOf(removeVietnameseTones(focusKeyword)) === 0;

  if (titleLen >= 50 && titleLen <= 65) {
    metaChecks.push({ id: 'title-len', pass: true, title: `Độ dài Tiêu đề SEO chuẩn (${titleLen}/60 ký tự)`, hint: 'Độ dài tối ưu tránh bị Google cắt ngắn trên kết quả tìm kiếm.' });
  } else if (titleLen >= 30 && titleLen < 50) {
    metaChecks.push({ id: 'title-len', warning: true, title: `Tiêu đề SEO hơi ngắn (${titleLen}/60 ký tự)`, hint: 'Nên bổ sung thêm thông điệp thu hút để đạt 50-60 ký tự.' });
  } else {
    metaChecks.push({ id: 'title-len', fail: true, title: `Tiêu đề SEO chưa đạt chuẩn (${titleLen} ký tự)`, hint: 'Khuyến nghị 50-60 ký tự để hiển thị trọn vẹn trên Google SERP.' });
  }

  if (hasKeywordInTitle) {
    metaChecks.push({ id: 'title-kw', pass: true, title: 'Tiêu đề chứa từ khóa chính', hint: keywordAtTitleStart ? 'Từ khóa xuất hiện ngay đầu tiêu đề (Rất tốt!)' : 'Từ khóa có trong tiêu đề.' });
  } else {
    metaChecks.push({ id: 'title-kw', fail: true, title: 'Tiêu đề chưa chứa từ khóa chính', hint: `Hãy đưa cụm từ "${focusKeyword || 'từ khóa'}" vào thẻ tiêu đề.` });
  }

  // 2. Meta Description Checks
  const descLen = (metaDesc || '').trim().length;
  const hasKeywordInDesc = focusKeyword && metaDesc && removeVietnameseTones(metaDesc).includes(removeVietnameseTones(focusKeyword));

  if (descLen >= 140 && descLen <= 165) {
    metaChecks.push({ id: 'desc-len', pass: true, title: `Mô tả Meta chuẩn độ dài (${descLen}/160 ký tự)`, hint: 'Độ dài hoàn hảo để kích thích người dùng nhấp chuột.' });
  } else if (descLen >= 90 && descLen < 140) {
    metaChecks.push({ id: 'desc-len', warning: true, title: `Mô tả Meta hơi ngắn (${descLen}/160 ký tự)`, hint: 'Nên thêm lời kêu gọi hành động (CTA) để đạt khoảng 150 ký tự.' });
  } else {
    metaChecks.push({ id: 'desc-len', fail: true, title: `Mô tả Meta chưa đạt chuẩn (${descLen} ký tự)`, hint: 'Khuyến nghị từ 140 đến 160 ký tự kèm lời kêu gọi nhấp chuột.' });
  }

  if (hasKeywordInDesc) {
    metaChecks.push({ id: 'desc-kw', pass: true, title: 'Mô tả Meta chứa từ khóa chính', hint: 'Giúp đoạn trích được in đậm trên kết quả tìm kiếm Google.' });
  } else {
    metaChecks.push({ id: 'desc-kw', fail: true, title: 'Mô tả Meta thiếu từ khóa chính', hint: 'Nên đưa từ khóa chính vào mô tả tự nhiên.' });
  }

  // 3. URL Slug
  const normSlug = (slug || '').trim().toLowerCase();
  const slugHasKeyword = focusKeyword && normSlug.includes(generateSlug(focusKeyword));
  if (slugHasKeyword) {
    metaChecks.push({ id: 'slug-kw', pass: true, title: 'Đường dẫn tĩnh (Slug) chứa từ khóa', hint: 'URL thân thiện, ngắn gọn và có từ khóa không dấu.' });
  } else {
    metaChecks.push({ id: 'slug-kw', warning: true, title: 'Đường dẫn tĩnh chưa tối ưu từ khóa', hint: 'Nên chứa từ khóa không dấu ngắn gọn phân cách bằng dấu gạch ngang.' });
  }

  // 4. Content Structure & Word Count
  let minWords = 1000;
  if (searchIntent === 'transactional') minWords = 600;
  if (searchIntent === 'informational') minWords = 1200;

  if (wordCount >= minWords) {
    contentChecks.push({ id: 'content-words', pass: true, title: `Số lượng từ đạt chuẩn (${wordCount} từ)`, hint: `Phù hợp với ý định tìm kiếm ${searchIntent}.` });
  } else if (wordCount >= minWords * 0.6) {
    contentChecks.push({ id: 'content-words', warning: true, title: `Số lượng từ khá ít (${wordCount}/${minWords} từ)`, hint: 'Nên bổ sung thêm các phân tích chuyên sâu hoặc dẫn chứng cụ thể.' });
  } else {
    contentChecks.push({ id: 'content-words', fail: true, title: `Bài viết quá ngắn (${wordCount} từ)`, hint: `Cần ít nhất ${minWords} từ để Google đánh giá cao độ sâu của nội dung.` });
  }

  // Headings
  if (h1s.length === 1) {
    contentChecks.push({ id: 'h1-count', pass: true, title: 'Có duy nhất 1 thẻ H1', hint: 'Đúng chuẩn cấu trúc phân cấp Google Heading.' });
  } else if (h1s.length === 0) {
    contentChecks.push({ id: 'h1-count', fail: true, title: 'Thiếu thẻ H1 (Tiêu đề chính)', hint: 'Bài viết bắt buộc phải có 1 thẻ H1 duy nhất.' });
  } else {
    contentChecks.push({ id: 'h1-count', warning: true, title: `Có ${h1s.length} thẻ H1 trong bài`, hint: 'Nên chỉ dùng 1 thẻ H1 duy nhất, các mục phụ chuyển thành H2, H3.' });
  }

  if (h2s.length >= 2) {
    contentChecks.push({ id: 'h2-count', pass: true, title: `Cấu trúc H2 phân tầng tốt (${h2s.length} thẻ H2)`, hint: 'Nội dung được chia thành các luận điểm rõ ràng.' });
  } else {
    contentChecks.push({ id: 'h2-count', fail: true, title: 'Thiếu các thẻ H2 phân mục', hint: 'Cần ít nhất 2 thẻ H2 để chia đoạn mạch lạc cho độc giả.' });
  }

  // Check keyword in H2/H3
  let kwInSubheading = false;
  h2s.forEach(h => {
    if (focusKeyword && removeVietnameseTones(h.textContent).includes(removeVietnameseTones(focusKeyword))) kwInSubheading = true;
  });
  h3s.forEach(h => {
    if (focusKeyword && removeVietnameseTones(h.textContent).includes(removeVietnameseTones(focusKeyword))) kwInSubheading = true;
  });

  if (kwInSubheading) {
    contentChecks.push({ id: 'kw-subheading', pass: true, title: 'Từ khóa xuất hiện trong thẻ H2/H3', hint: 'Google đánh giá cao từ khóa nằm trong các đề mục chính.' });
  } else {
    contentChecks.push({ id: 'kw-subheading', warning: true, title: 'Chưa có từ khóa trong thẻ H2 hoặc H3', hint: 'Nên chèn từ khóa chính hoặc từ khóa LSI vào ít nhất 1 đề mục H2.' });
  }

  // Keyword Density
  if (density >= 1.0 && density <= 2.5) {
    contentChecks.push({ id: 'kw-density', pass: true, title: `Mật độ từ khóa hoàn hảo (${density.toFixed(1)}%)`, hint: `${keywordOccurrences} lần xuất hiện. Tự nhiên, không bị phạt nhồi nhét.` });
  } else if (density > 0.4 && density < 1.0) {
    contentChecks.push({ id: 'kw-density', warning: true, title: `Mật độ từ khóa hơi thấp (${density.toFixed(1)}%)`, hint: `Xuất hiện ${keywordOccurrences} lần. Nên bổ sung thêm 1-2 lần ở các đoạn quan trọng.` });
  } else if (density > 2.5) {
    contentChecks.push({ id: 'kw-density', fail: true, title: `Nguy cơ nhồi nhét từ khóa (${density.toFixed(1)}%)`, hint: `Xuất hiện ${keywordOccurrences} lần. Nên giảm bớt để tránh bị thuật toán Helpful Content phạt.` });
  } else {
    contentChecks.push({ id: 'kw-density', fail: true, title: 'Chưa xuất hiện từ khóa chính trong nội dung', hint: 'Cần phân bổ từ khóa chính rải đều từ đầu đến cuối bài viết.' });
  }

  // First 100 words
  if (inFirst100) {
    contentChecks.push({ id: 'kw-first100', pass: true, title: 'Từ khóa có trong 100 từ đầu tiên', hint: 'Giúp bot tìm kiếm xác định ngay chủ đề bài viết ngay khi vừa quét.' });
  } else {
    contentChecks.push({ id: 'kw-first100', fail: true, title: 'Thiếu từ khóa trong 100 từ đầu tiên', hint: 'Hãy đưa từ khóa chính vào đoạn mở bài (trong 1-2 câu đầu).' });
  }

  // Visuals & Tables
  if (images.length > 0 && imagesWithAlt === images.length) {
    contentChecks.push({ id: 'img-alt', pass: true, title: `Hình ảnh chuẩn SEO (${images.length} ảnh, 100% có ALT)`, hint: 'Tất cả hình ảnh đều có thẻ ALT đầy đủ.' });
  } else if (images.length > 0 && imagesWithAlt < images.length) {
    contentChecks.push({ id: 'img-alt', warning: true, title: `Có ${images.length - imagesWithAlt}/${images.length} ảnh thiếu thẻ ALT`, hint: 'Bổ sung thẻ ALT để tăng cơ hội lên top Google Hình Ảnh.' });
  } else {
    contentChecks.push({ id: 'img-alt', warning: true, title: 'Chưa có hình ảnh minh họa', hint: 'Bài viết chuẩn SEO nên có ít nhất 1-2 hình ảnh minh họa kèm thẻ ALT.' });
  }

  if (hasTable || hasList) {
    contentChecks.push({ id: 'content-elements', pass: true, title: 'Có bảng dữ liệu hoặc danh sách liệt kê', hint: 'Tăng trải nghiệm đọc lướt, giảm tỷ lệ thoát trang.' });
  } else {
    contentChecks.push({ id: 'content-elements', warning: true, title: 'Thiếu danh sách hoặc bảng so sánh', hint: 'Nên thêm bảng hoặc bullet points để bài viết bớt đơn điệu.' });
  }

  // 5. Google EEAT Checks
  if (hasDirectAnswer) {
    eeatChecks.push({ id: 'eeat-snippet', pass: true, title: 'Đoạn trả lời trực tiếp (Top 0 Featured Snippet)', hint: 'Cung cấp thông tin trực diện, nhắm mục tiêu vị trí số 0 trên Google.' });
  } else {
    eeatChecks.push({ id: 'eeat-snippet', warning: true, title: 'Chưa có khối Direct Answer / Tóm tắt nhanh', hint: 'Nhấn nút "Top 0 Snippet" trên thanh công cụ để chèn.' });
  }

  if (hasEEAT) {
    eeatChecks.push({ id: 'eeat-case', pass: true, title: 'Có dẫn chứng / Case study thực tế (Experience)', hint: 'Google đánh giá cao trải nghiệm thực chiến của người viết.' });
  } else {
    eeatChecks.push({ id: 'eeat-case', warning: true, title: 'Thiếu trải nghiệm thực tế (Experience)', hint: 'Chèn khối "EEAT Case Study" để tăng điểm đánh giá từ Google.' });
  }

  if (hasExpert) {
    eeatChecks.push({ id: 'eeat-author', pass: true, title: 'Thông tin chuyên gia / Tác giả rõ ràng (Expertise)', hint: author || 'Có box thông tin chuyên môn.' });
  } else {
    eeatChecks.push({ id: 'eeat-author', warning: true, title: 'Thiếu hồ sơ tác giả chuyên gia', hint: 'Điền tên chuyên gia ở cột bên trái hoặc chèn khối Ý Kiến Chuyên Gia.' });
  }

  if (hasFAQ) {
    eeatChecks.push({ id: 'eeat-faq', pass: true, title: 'Mục câu hỏi thường gặp FAQ (Trustworthiness)', hint: 'Hỗ trợ hiển thị rich snippet mở rộng trên Google.' });
  } else {
    eeatChecks.push({ id: 'eeat-faq', warning: true, title: 'Chưa có bộ câu hỏi thường gặp (FAQ)', hint: 'Chèn khối "Khối FAQ" để tự động kích hoạt FAQ Schema.' });
  }

  // Calculate Overall SEO Score (0 - 100)
  let totalPoints = 0;
  let maxPoints = 0;

  [...metaChecks, ...contentChecks, ...eeatChecks].forEach(c => {
    maxPoints += 10;
    if (c.pass) totalPoints += 10;
    else if (c.warning) totalPoints += 5;
    else totalPoints += 0;
  });

  const rawScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  return {
    wordCount,
    charCount,
    readingTime,
    keywordOccurrences,
    density,
    headings: {
      h1: h1s.length,
      h2: h2s.length,
      h3: h3s.length,
      h4: h4s.length
    },
    images: {
      total: images.length,
      withAlt: imagesWithAlt,
      withKeywordAlt: imagesWithKeywordAlt
    },
    links: {
      total: links.length,
      internal: internalLinks,
      external: externalLinks
    },
    lsiResults,
    usedLsiCount,
    totalLsiCount: lsiKeywords.length,
    metaChecks,
    contentChecks,
    eeatChecks,
    seoScore: rawScore
  };
}

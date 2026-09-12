/**
 * SEOPulse Pro - Auto Schema JSON-LD Generator
 * Supports Article/BlogPosting, FAQPage, and BreadcrumbList for Fast Indexing
 */

export function generateSchemaMarkup({
  seoTitle,
  metaDesc,
  slug,
  author,
  contentHtml,
  siteUrl = 'https://yoursite.com'
}) {
  const pageUrl = `${siteUrl}/${slug || 'bai-viet-chuan-seo'}`;
  const currentDate = new Date().toISOString().split('T')[0];

  const parser = new DOMParser();
  const doc = parser.parseFromString(contentHtml || '', 'text/html');

  // Extract first image
  const firstImg = doc.querySelector('img');
  const imageUrl = firstImg ? firstImg.getAttribute('src') : 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800';

  // Base Article Schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': pageUrl
    },
    'headline': seoTitle || 'Tiêu đề bài viết chuẩn SEO',
    'description': metaDesc || 'Mô tả bài viết chuẩn SEO Google',
    'image': [imageUrl],
    'datePublished': `${currentDate}T08:00:00+07:00`,
    'dateModified': `${currentDate}T08:00:00+07:00`,
    'author': {
      '@type': 'Person',
      'name': author || 'Chuyên Gia Nội Dung',
      'jobTitle': 'SEO & Marketing Specialist'
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Your Brand Official',
      'logo': {
        '@type': 'ImageObject',
        'url': `${siteUrl}/logo.png`
      }
    }
  };

  // Extract FAQ items
  const faqItems = [];
  const faqElements = doc.querySelectorAll('.smart-block-faq .faq-item, .faq-item');
  faqElements.forEach(item => {
    const qEl = item.querySelector('.faq-question');
    const aEl = item.querySelector('.faq-answer');
    if (qEl && aEl) {
      const qText = qEl.textContent.trim();
      const aText = aEl.textContent.trim();
      if (qText && aText) {
        faqItems.push({
          '@type': 'Question',
          'name': qText,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': aText
          }
        });
      }
    }
  });

  // Graph representation
  const graph = [articleSchema];

  if (faqItems.length > 0) {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqItems
    };
    graph.push(faqSchema);
  }

  // BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Trang Chủ',
        'item': siteUrl
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': 'Kiến Thức & Dịch Vụ',
        'item': `${siteUrl}/blog`
      },
      {
        '@type': 'ListItem',
        'position': 3,
        'name': seoTitle || 'Bài viết',
        'item': pageUrl
      }
    ]
  };
  graph.push(breadcrumbSchema);

  const combinedSchema = {
    '@context': 'https://schema.org',
    '@graph': graph
  };

  return {
    rawJson: combinedSchema,
    formattedString: JSON.stringify(combinedSchema, null, 2),
    scriptTag: `<script type="application/ld+json">\n${JSON.stringify(combinedSchema, null, 2)}\n</script>`
  };
}

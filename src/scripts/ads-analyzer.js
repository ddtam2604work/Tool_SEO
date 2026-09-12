/**
 * SEOPulse Pro - Google Ads Quality Score & Landing Page Analyzer
 * Focuses on Landing Page Experience, Ad Relevance and Conversion Optimization
 */

import { removeVietnameseTones, countKeywordOccurrences } from './seo-analyzer.js';

export function analyzeAds({
  contentHtml,
  focusKeyword,
  ctaText,
  seoTitle,
  metaDesc,
  slug
}) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(contentHtml || '', 'text/html');
  const rawText = doc.body.textContent || '';
  const words = rawText.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const adsChecks = [];

  // 1. Ad Relevance Above The Fold (200 words đầu tiên)
  const topFoldWords = words.slice(0, 200).join(' ');
  const kwInTopFold = focusKeyword ? countKeywordOccurrences(topFoldWords, focusKeyword) > 0 : false;

  if (kwInTopFold) {
    adsChecks.push({
      id: 'ad-relevance',
      pass: true,
      title: 'Độ khớp từ khóa quảng cáo (Ad Relevance) cao',
      hint: 'Từ khóa xuất hiện ngay trong 200 từ đầu tiên giúp khách hàng nhận biết đúng mục đích khi bấm vào quảng cáo.'
    });
  } else {
    adsChecks.push({
      id: 'ad-relevance',
      fail: true,
      title: 'Từ khóa quảng cáo chưa xuất hiện ở nửa đầu trang',
      hint: 'Khách hàng bấm quảng cáo cần thấy ngay từ khóa và thông điệp chào đón trong màn hình đầu tiên (Above the fold).'
    });
  }

  // 2. Call To Action (CTA) Checks
  const hasCtaBlock = doc.querySelector('.smart-block-cta') !== null;
  const ctaLinks = doc.querySelectorAll('.cta-btn-action, a[href*="#"], a[href*="tel:"]');
  const hasPhoneOrHotline = /(hotline|0\d{9,10}|1900|1800)/i.test(rawText) || (ctaText && /(hotline|0\d{9,10})/i.test(ctaText));

  if (hasCtaBlock || ctaLinks.length >= 2) {
    adsChecks.push({
      id: 'ad-cta',
      pass: true,
      title: 'Nút Kêu Gọi Hành Động (CTA) nổi bật & phân bổ tốt',
      hint: 'Có khối CTA chuyển đổi bắt mắt, kích thích người dùng để lại thông tin hoặc đặt hàng.'
    });
  } else if (ctaLinks.length === 1) {
    adsChecks.push({
      id: 'ad-cta',
      warning: true,
      title: 'Nên bổ sung thêm ít nhất 1 nút CTA ở cuối bài',
      hint: 'Khuyến nghị đặt CTA ở cả đầu trang và chân trang để tối đa hóa tỷ lệ chuyển đổi.'
    });
  } else {
    adsChecks.push({
      id: 'ad-cta',
      fail: true,
      title: 'Thiếu nút Kêu Gọi Hành Động (CTA) rõ ràng',
      hint: 'Nhấn nút "Khung CTA Ads" trên thanh công cụ để chèn khối hành động (Form, Hotline, Nút mua ngay).'
    });
  }

  // 3. Trust Signals & Social Proof (Cam kết, bảo hành, review)
  const trustKeywords = ['cam kết', 'bảo hành', 'hoàn tiền', 'kinh nghiệm', 'khách hàng', 'học viên', 'uy tín', 'chứng chỉ'];
  let foundTrust = 0;
  trustKeywords.forEach(k => {
    if (removeVietnameseTones(rawText).includes(removeVietnameseTones(k))) {
      foundTrust++;
    }
  });

  if (foundTrust >= 2) {
    adsChecks.push({
      id: 'ad-trust',
      pass: true,
      title: `Tín hiệu củng cố niềm tin mạnh mẽ (${foundTrust} yếu tố)`,
      hint: 'Bài viết có các cam kết, bảo hành hoặc bằng chứng xác thực giúp giảm tỷ lệ thoát trang (Bounce Rate).'
    });
  } else {
    adsChecks.push({
      id: 'ad-trust',
      warning: true,
      title: 'Thiếu các cam kết / Bằng chứng tin cậy (Trust Signals)',
      hint: 'Bổ sung thêm cam kết hoàn tiền, chính sách bảo hành hoặc feedback khách hàng để tăng uy tín.'
    });
  }

  // 4. Scannability (Trải nghiệm đọc lướt chuyển đổi nhanh)
  const bulletLists = doc.querySelectorAll('ul, ol');
  const hasTables = doc.querySelectorAll('table').length > 0;
  if (bulletLists.length >= 2 || (bulletLists.length >= 1 && hasTables)) {
    adsChecks.push({
      id: 'ad-scan',
      pass: true,
      title: 'Bố cục dễ quét mắt (High Scannability)',
      hint: 'Khách hàng chạy Ads thường đọc lướt, danh sách gạch đầu dòng giúp nắm bắt giá trị trong 5 giây.'
    });
  } else {
    adsChecks.push({
      id: 'ad-scan',
      warning: true,
      title: 'Nội dung hơi nhiều khối chữ đặc',
      hint: 'Chuyển các đoạn văn dài thành dạng danh sách 3-5 ý chính để khách hàng dễ đọc lướt.'
    });
  }

  // 5. Contact & Hotline Readiness
  if (hasPhoneOrHotline) {
    adsChecks.push({
      id: 'ad-phone',
      pass: true,
      title: 'Có thông tin Hotline / Kênh liên hệ tức thì',
      hint: 'Thuận tiện cho khách hàng bấm gọi ngay trên điện thoại di động.'
    });
  } else {
    adsChecks.push({
      id: 'ad-phone',
      warning: true,
      title: 'Chưa có số Hotline hoặc nút bấm gọi điện',
      hint: 'Nên chèn số Hotline vào khối CTA để phục vụ chiến dịch Google Ads Tìm kiếm gọi điện (Call Ads).'
    });
  }

  // Calculate Ads Landing Experience Score (0 - 100)
  let totalPoints = 0;
  let maxPoints = adsChecks.length * 10;
  adsChecks.forEach(c => {
    if (c.pass) totalPoints += 10;
    else if (c.warning) totalPoints += 5;
    else totalPoints += 0;
  });

  const adsScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  // Generate Ad Preview Headlines & Descriptions
  let headline1 = (seoTitle || '').split(/[:|-]/)[0]?.trim() || (focusKeyword || 'Dịch Vụ Uy Tín 2026');
  if (headline1.length > 30) headline1 = headline1.substring(0, 27) + '...';

  let headline2 = 'Cam Kết Chất Lượng 100%';
  let headline3 = 'Tư Vấn Miễn Phí 24/7';

  let desc1 = (metaDesc || '').substring(0, 90);
  if (!desc1) desc1 = 'Giải pháp tối ưu chuyển đổi vượt trội. Đăng ký nhận ưu đãi đặc biệt ngay hôm nay!';

  return {
    adsScore,
    adsChecks,
    adPreview: {
      headline: `${headline1} | ${headline2}`,
      domain: `yoursite.com › ${slug || 'dich-vu'}`,
      description: desc1,
      sitelinks: ['Bảng Giá Ưu Đãi', 'Dự Án Tiêu Biểu', 'Nhận Báo Giá Ngay', 'Cam Kết Hoàn Tiền']
    }
  };
}

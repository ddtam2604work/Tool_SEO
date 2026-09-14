/**
 * SEOPulse Pro - SpintX Knowledge Base & Local Git Sync Manager
 * Completely Free of API Keys - Works via Local Git CLI & Local Repository Sync
 */

const REPO_CONFIG_KEY = 'seopulse_repo_config';
const EMAIL_CONFIG_KEY = 'seopulse_email_config';

export class SpintXSyncManager {
  constructor() {
    this.articles = [];
    this.categories = [];
    this.activeCategory = 'ALL';
    this.searchQuery = '';
    this.currentSpintXArticle = null;
    
    this.repoConfig = this.loadRepoConfig();
    this.emailConfig = this.loadEmailConfig();
  }

  loadEmailConfig() {
    try {
      const saved = localStorage.getItem(EMAIL_CONFIG_KEY);
      const defaults = {
        toEmail: 'ddtam2604.work@gmail.com',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'ddtam2604.work@gmail.com',
        smtpPass: ''
      };
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
      return defaults;
    } catch {
      return {
        toEmail: 'ddtam2604.work@gmail.com',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'ddtam2604.work@gmail.com',
        smtpPass: ''
      };
    }
  }

  saveEmailConfig(config) {
    this.emailConfig = { ...this.emailConfig, ...config };
    localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(this.emailConfig));
  }

  async sendEmailNotification(docState, note, recipientEmail) {
    const updatedArticle = this.getUpdatedArticleObject(docState);
    const toEmail = recipientEmail || this.emailConfig.toEmail || 'ddtam2604.work@gmail.com';

    const res = await fetch('/api/email/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail,
        note: note || `Tối ưu SEO & Google Ads bài viết "${docState.title}"`,
        updatedArticle,
        smtpConfig: {
          host: this.emailConfig.smtpHost,
          port: this.emailConfig.smtpPort,
          user: this.emailConfig.smtpUser,
          pass: this.emailConfig.smtpPass
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi gửi email thông báo.');
    }

    const result = await res.json();
    await this.loadArticles();
    return result;
  }

  loadRepoConfig() {
    try {
      const saved = localStorage.getItem(REPO_CONFIG_KEY);
      const defaults = {
        repoPath: 'D:\\Duy_Tam\\website_spintx_vn',
        branch: 'main',
        autoGitPush: false,
        githubToken: '',
        gitUsername: 'ddtam2604work',
        gitPassword: 'Duytam262004@',
        openTerminal: true,
        owner: 'spintx-vn',
        repo: 'website_spintx_vn'
      };
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaults,
          ...parsed,
          gitUsername: parsed.gitUsername || 'ddtam2604work',
          gitPassword: parsed.gitPassword || 'Duytam262004@',
          openTerminal: parsed.openTerminal !== undefined ? parsed.openTerminal : true
        };
      }
      return defaults;
    } catch {
      return {
        repoPath: 'D:\\Duy_Tam\\website_spintx_vn',
        branch: 'main',
        autoGitPush: false,
        githubToken: '',
        gitUsername: 'ddtam2604work',
        gitPassword: 'Duytam262004@',
        openTerminal: true,
        owner: 'spintx-vn',
        repo: 'website_spintx_vn'
      };
    }
  }

  saveRepoConfig(config) {
    this.repoConfig = { ...this.repoConfig, ...config };
    localStorage.setItem(REPO_CONFIG_KEY, JSON.stringify(this.repoConfig));
  }

  async loadArticles() {
    const baseUrl = import.meta.env.BASE_URL || '/';
    try {
      const res = await fetch('/api/spintx/articles');
      if (res.ok) {
        this.articles = await res.json();
      } else {
        const fallbackRes = await fetch(`${baseUrl}data/spintx_articles.json`);
        this.articles = await fallbackRes.json();
      }
    } catch (err) {
      console.warn('Load from API failed, trying fallback static file:', err);
      const fallbackRes = await fetch(`${baseUrl}data/spintx_articles.json`);
      this.articles = await fallbackRes.json();
    }

    // Extract unique categories
    const cats = new Set();
    this.articles.forEach(a => {
      if (a.category) cats.add(a.category.trim());
    });
    this.categories = Array.from(cats);
    return this.articles;
  }

  getFilteredArticles() {
    let list = this.articles;

    if (this.activeCategory && this.activeCategory !== 'ALL') {
      list = list.filter(a => a.category === this.activeCategory);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(a => 
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.slug && a.slug.toLowerCase().includes(q)) ||
        (a.excerpt && a.excerpt.toLowerCase().includes(q))
      );
    }

    return list;
  }

  /**
   * Convert a SpintX article into SEOPulse Pro document structure
   */
  mapToSeoPulseDoc(art) {
    this.currentSpintXArticle = art;

    // Guess focus keyword from category or slug
    let focusKw = '';
    if (art.slug) {
      const parts = art.slug.split('-');
      if (parts.length >= 3) {
        focusKw = parts.slice(0, 4).join(' ').replace(/nam 2026|2026/g, '').trim();
      }
    }
    if (!focusKw && art.category) {
      focusKw = art.category.toLowerCase();
    }

    // LSI keywords from table of contents
    const lsiKeywords = [];
    if (art.tableOfContents && Array.isArray(art.tableOfContents)) {
      art.tableOfContents.slice(0, 6).forEach(toc => {
        if (toc.title && toc.title.length > 5 && toc.title.length < 50) {
          lsiKeywords.push(toc.title.replace(/[0-9.:?!]/g, '').trim().toLowerCase());
        }
      });
    }

    return {
      id: `spintx_${art.id}`,
      isSpintX: true,
      spintxId: art.id,
      spintxOriginal: art,
      title: art.title,
      category: art.category || 'NỖI ĐAU VẬN HÀNH',
      quickSummary: art.quickSummary || art.excerpt || '',
      publishedDate: art.publishedDate || new Date().toISOString().split('T')[0],
      formattedDate: art.formattedDate || '9 Tháng 5, 2026',
      focusKeyword: focusKw || 'quản lý vận hành studio',
      lsiKeywords: lsiKeywords.length > 0 ? lsiKeywords : ['chuẩn hóa quy trình', 'phần mềm studio', 'chống thất thoát'],
      intent: 'commercial',
      seoTitle: art.title,
      metaDesc: (art.quickSummary || art.excerpt || '').substring(0, 160),
      slug: art.slug,
      author: typeof art.author === 'object' ? art.author?.name || 'Trí (SPINTX)' : (art.author || 'SPINTX'),
      ctaText: 'Trải Nghiệm Nền Tảng Vận Hành SPINTX.STUDIO (Miễn Phí 90 Ngày)',
      contentHtml: art.contentHtml || `<p>${art.excerpt || ''}</p>`,
      activeMode: 'all'
    };
  }

  /**
   * Extract Table of Contents dynamically from updated contentHtml
   */
  extractTableOfContents(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    const headings = doc.querySelectorAll('h2, h3');
    const toc = [];

    headings.forEach(h => {
      const title = h.textContent.trim();
      let id = h.getAttribute('id');
      if (!id) {
        id = title.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
      }
      if (title) {
        toc.push({
          id,
          title,
          level: h.tagName.toLowerCase() === 'h2' ? 2 : 3
        });
      }
    });

    return toc;
  }

  /**
   * Build updated article object
   */
  getUpdatedArticleObject(docState) {
    const updatedToc = this.extractTableOfContents(docState.contentHtml);

    return {
      ...(docState.spintxOriginal || {}),
      id: docState.spintxId || docState.id || 'custom_spintx',
      slug: docState.slug,
      title: docState.seoTitle || docState.title,
      category: docState.category || docState.spintxOriginal?.category || 'NỖI ĐAU VẬN HÀNH',
      author: docState.author ? (typeof docState.author === 'object' ? docState.author : { id: 'tri', name: docState.author }) : (docState.spintxOriginal?.author || { id: 'tri', name: 'Trí' }),
      publishedDate: docState.publishedDate || docState.spintxOriginal?.publishedDate || new Date().toISOString().split('T')[0],
      formattedDate: docState.formattedDate || docState.spintxOriginal?.formattedDate || '9 Tháng 5, 2026',
      excerpt: docState.metaDesc || docState.excerpt,
      quickSummary: docState.quickSummary || docState.metaDesc || docState.excerpt,
      contentHtml: docState.contentHtml,
      tableOfContents: updatedToc.length > 0 ? updatedToc : docState.spintxOriginal?.tableOfContents || [],
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Commit and update via local Git system
   */
  async updateAndPushGit(docState, commitMessage, runGitPush = false, openTerminal = false) {
    const updatedArticle = this.getUpdatedArticleObject(docState);

    const res = await fetch('/api/git/commit-and-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoPath: this.repoConfig.repoPath,
        commitMessage: commitMessage || `feat(seo): Cập nhật bài viết "${docState.title}" qua SEOPulse Pro`,
        updatedArticle,
        runGitPush,
        gitUsername: this.repoConfig.gitUsername || '',
        gitPassword: this.repoConfig.gitPassword || '',
        openTerminal: openTerminal || !!this.repoConfig.openTerminal,
        branch: this.repoConfig.branch || 'main'
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi cập nhật dữ liệu');
    }

    const result = await res.json();
    await this.loadArticles(); // reload in memory
    return result;
  }

  /**
   * Push directly to GitHub via REST API (No Git CLI / installation needed)
   */
  async pushViaGitHubApi(docState, commitMessage) {
    const updatedArticle = this.getUpdatedArticleObject(docState);
    const token = this.repoConfig.githubToken || '';

    if (!token) {
      throw new Error('Chưa có GitHub Token. Vui lòng bấm vào biểu tượng bánh răng Cài Đặt trên thanh tiêu đề để nhập Personal Access Token (PAT) của bạn.');
    }

    const res = await fetch('/api/github/direct-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        owner: this.repoConfig.owner || 'spintx-vn',
        repo: this.repoConfig.repo || 'website_spintx_vn',
        branch: this.repoConfig.branch || 'main',
        commitMessage: commitMessage || `feat(seo): Cập nhật bài viết "${docState.title}" qua SEOPulse Pro`,
        updatedArticle
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Lỗi đẩy code qua GitHub API');
    }

    const result = await res.json();
    await this.loadArticles();
    return result;
  }

  /**
   * Generate standard Git CLI command string ready to copy & run
   */
  getGitTerminalCommand(docState, commitMessage) {
    const msg = commitMessage || `feat(seo): Cập nhật bài viết "${docState.title}"`;
    const branch = this.repoConfig.branch || 'main';
    return `git add . && git commit -m "${msg}" && git push origin ${branch}`;
  }
}

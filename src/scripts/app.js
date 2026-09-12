/**
 * SEOPulse Pro - Main Application Controller
 * Google EEAT & Ads Optimizer
 */

import { ARTICLE_TEMPLATES, SMART_BLOCK_TEMPLATES } from './templates.js';
import { analyzeSEO, generateSlug } from './seo-analyzer.js';
import { analyzeAds } from './ads-analyzer.js';
import { generateSchemaMarkup } from './schema-generator.js';
import { SpintXSyncManager } from './spintx-sync.js';
import { 
  saveCurrentDocument, 
  loadCurrentDocument, 
  getSavedDocumentsList, 
  deleteDocument,
  htmlToMarkdown,
  generateFullHtmlDocument 
} from './storage.js';

class SEOPulseApp {
  constructor() {
    this.currentDoc = {
      id: 'doc_' + Date.now(),
      title: 'Bài viết mẫu chuẩn SEO Google & Google Ads',
      focusKeyword: 'dịch vụ seo tổng thể',
      lsiKeywords: ['báo giá seo', 'tối ưu onpage', 'tăng traffic', 'chi phí chạy ads'],
      intent: 'commercial',
      seoTitle: 'Dịch Vụ SEO Tổng Thể Uy Tín 2026: Tăng Traffic & Tối Ưu Ads Vượt Trội',
      metaDesc: 'Tìm kiếm dịch vụ SEO tổng thể uy tín chuẩn Google EEAT? Đột phá thứ hạng từ khóa, tăng x3 khách hàng và tối ưu ngân sách Ads hiệu quả. Nhận báo giá ngay!',
      slug: 'dich-vu-seo-tong-the-uy-tin',
      author: 'Nguyễn Hoàng Nam - Chuyên Gia SEO & Google Ads 8 Năm Kinh Nghiệm',
      ctaText: 'Nhận Báo Giá & Phân Tích Website Miễn Phí (Hotline: 0988.123.456)',
      contentHtml: '',
      activeMode: 'all',
      devicePreview: 'mobile'
    };

    this.debounceTimer = null;
    this.saveTimer = null;
    this.spintx = new SpintXSyncManager();

    this.initDOM();
    this.initEvents();
    this.loadInitialData();
  }

  initDOM() {
    // Top nav elements
    this.docTitleInput = document.getElementById('docTitleInput');
    this.saveStatusText = document.getElementById('saveStatusText');
    this.saveStatus = document.getElementById('saveStatus');
    this.modeBtns = document.querySelectorAll('.mode-btn');

    // SpintX & Push & GitHub Elements
    this.btnOpenSpintX = document.getElementById('btnOpenSpintX');
    this.spintxBadgeCount = document.getElementById('spintxBadgeCount');
    this.btnOpenPushModal = document.getElementById('btnOpenPushModal');
    this.btnGitHubSettings = document.getElementById('btnGitHubSettings');

    // SpintX Modal Elements
    this.spintxModal = document.getElementById('spintxModal');
    this.btnCloseSpintXModal = document.getElementById('btnCloseSpintXModal');
    this.spintxSearchInput = document.getElementById('spintxSearchInput');
    this.btnClearSpintxSearch = document.getElementById('btnClearSpintxSearch');
    this.spintxCategoriesList = document.getElementById('spintxCategoriesList');
    this.spintxArticlesGrid = document.getElementById('spintxArticlesGrid');
    this.spintxVisibleCount = document.getElementById('spintxVisibleCount');

    // Push Modal Elements
    this.pushModal = document.getElementById('pushModal');
    this.btnClosePushModal = document.getElementById('btnClosePushModal');
    this.btnCancelPush = document.getElementById('btnCancelPush');
    this.btnConfirmPush = document.getElementById('btnConfirmPush');
    this.pushArticleTitle = document.getElementById('pushArticleTitle');
    this.pushArticleSlug = document.getElementById('pushArticleSlug');
    this.commitMessageInput = document.getElementById('commitMessageInput');
    this.gitCmdPreview = document.getElementById('gitCmdPreview');
    this.btnCopyGitCmd = document.getElementById('btnCopyGitCmd');
    this.btnDownloadArticleJson = document.getElementById('btnDownloadArticleJson');

    // Git Repo Settings Modal Elements (No API Key)
    this.githubModal = document.getElementById('githubModal');
    this.btnCloseGithubModal = document.getElementById('btnCloseGithubModal');
    this.btnCancelGithub = document.getElementById('btnCancelGithub');
    this.btnSaveGithubConfig = document.getElementById('btnSaveGithubConfig');
    this.repoPathInput = document.getElementById('repoPathInput');
    this.ghBranchInput = document.getElementById('ghBranchInput');
    this.ghTokenInput = document.getElementById('ghTokenInput');
    this.gitUsernameInput = document.getElementById('gitUsernameInput');
    this.gitPasswordInput = document.getElementById('gitPasswordInput');
    this.openTerminalCheck = document.getElementById('openTerminalCheck');
    this.autoGitPushCheck = document.getElementById('autoGitPushCheck');

    // Quick local-git account in Push Modal
    this.localGitAccountBox = document.getElementById('localGitAccountBox');
    this.pushGitUser = document.getElementById('pushGitUser');
    this.pushGitPass = document.getElementById('pushGitPass');
    this.pushOpenTerminalCheck = document.getElementById('pushOpenTerminalCheck');
    this.btnQuickOpenGitSettings = document.getElementById('btnQuickOpenGitSettings');

    // Sidebar left inputs
    this.sidebarTabs = document.querySelectorAll('.sidebar-tab');
    this.tabConfig = document.getElementById('tabConfig');
    this.tabHistory = document.getElementById('tabHistory');
    this.focusKeywordInput = document.getElementById('focusKeywordInput');
    this.lsiInput = document.getElementById('lsiInput');
    this.lsiTagsList = document.getElementById('lsiTagsList');
    this.searchIntentSelect = document.getElementById('searchIntentSelect');
    this.seoTitleInput = document.getElementById('seoTitleInput');
    this.metaDescInput = document.getElementById('metaDescInput');
    this.slugInput = document.getElementById('slugInput');
    this.authorInput = document.getElementById('authorInput');
    this.ctaTextInput = document.getElementById('ctaTextInput');
    this.titleCounter = document.getElementById('titleCounter');
    this.descCounter = document.getElementById('descCounter');
    this.titleProgressBar = document.getElementById('titleProgressBar');
    this.descProgressBar = document.getElementById('descProgressBar');
    this.keywordStatsHint = document.getElementById('keywordStatsHint');
    this.btnAutoSlug = document.getElementById('btnAutoSlug');
    this.savedDocsList = document.getElementById('savedDocsList');
    this.savedDocsCount = document.getElementById('savedDocsCount');
    this.btnNewDoc = document.getElementById('btnNewDoc');
    this.btnLoadDemo = document.getElementById('btnLoadDemo');

    // Editor elements
    this.editor = document.getElementById('editorContent');
    this.formatBlockSelect = document.getElementById('formatBlockSelect');
    this.wordCount = document.getElementById('wordCount');
    this.charCount = document.getElementById('charCount');
    this.readingTime = document.getElementById('readingTime');
    this.headingsCount = document.getElementById('headingsCount');
    this.imagesCount = document.getElementById('imagesCount');
    this.keywordDensity = document.getElementById('keywordDensity');

    // Analytics elements
    this.gaugeProgress = document.getElementById('gaugeProgress');
    this.gaugeScore = document.getElementById('gaugeScore');
    this.scoreRatingBadge = document.getElementById('scoreRatingBadge');
    this.scoreVerdict = document.getElementById('scoreVerdict');
    this.scoreAdvice = document.getElementById('scoreAdvice');
    this.seoScoreVal = document.getElementById('seoScoreVal');
    this.seoProgressFill = document.getElementById('seoProgressFill');
    this.adsScoreVal = document.getElementById('adsScoreVal');
    this.adsProgressFill = document.getElementById('adsProgressFill');
    this.seoIssuesCount = document.getElementById('seoIssuesCount');
    this.adsIssuesCount = document.getElementById('adsIssuesCount');

    // Analytics tabs
    this.analyticsTabs = document.querySelectorAll('.analytics-tab');
    this.analyticsPanels = document.querySelectorAll('.analytics-panel');
    this.seoMetaChecklist = document.getElementById('seoMetaChecklist');
    this.seoContentChecklist = document.getElementById('seoContentChecklist');
    this.seoEeatChecklist = document.getElementById('seoEeatChecklist');
    this.lsiTrackerGrid = document.getElementById('lsiTrackerGrid');
    this.adsLandingChecklist = document.getElementById('adsLandingChecklist');

    // Simulator & Previews
    this.adSimDomain = document.getElementById('adSimDomain');
    this.adSimHeadline = document.getElementById('adSimHeadline');
    this.adSimDesc = document.getElementById('adSimDesc');
    this.serpPreviewBox = document.getElementById('serpPreviewBox');
    this.serpUrlPreview = document.getElementById('serpUrlPreview');
    this.serpTitlePreview = document.getElementById('serpTitlePreview');
    this.serpDescPreview = document.getElementById('serpDescPreview');
    this.serpFaqPreview = document.getElementById('serpFaqPreview');
    this.socialTitle = document.getElementById('socialTitle');
    this.socialDesc = document.getElementById('socialDesc');
    this.deviceBtns = document.querySelectorAll('.device-btn');

    // Schema Output
    this.schemaCodeOutput = document.getElementById('schemaCodeOutput');
    this.btnCopySchema = document.getElementById('btnCopySchema');

    // Export & Action Buttons
    this.btnExportMenu = document.getElementById('btnExportMenu');
    this.exportMenu = document.getElementById('exportMenu');
    this.btnCopyHtml = document.getElementById('btnCopyHtml');
    this.btnCopyMarkdown = document.getElementById('btnCopyMarkdown');
    this.btnExportHtmlFile = document.getElementById('btnExportHtmlFile');

    // Modals
    this.btnTemplates = document.getElementById('btnTemplates');
    this.templatesModal = document.getElementById('templatesModal');
    this.btnCloseTemplates = document.getElementById('btnCloseTemplates');
    this.templatesGrid = document.getElementById('templatesGrid');

    this.imageModal = document.getElementById('imageModal');
    this.btnInsertImage = document.getElementById('btnInsertImage');
    this.btnCloseImageModal = document.getElementById('btnCloseImageModal');
    this.btnCancelImage = document.getElementById('btnCancelImage');
    this.btnConfirmInsertImage = document.getElementById('btnConfirmInsertImage');
    this.imgUrlInput = document.getElementById('imgUrlInput');
    this.imgAltInput = document.getElementById('imgAltInput');
    this.imgCaptionInput = document.getElementById('imgCaptionInput');

    // Toast Container
    this.toastContainer = document.getElementById('toastContainer');
  }

  initEvents() {
    // Document Title
    this.docTitleInput.addEventListener('input', (e) => {
      this.currentDoc.title = e.target.value;
      this.triggerAutoSave();
    });

    // Target Mode Selector (All / SEO / Ads)
    this.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentDoc.activeMode = btn.dataset.mode;
        this.runAnalysis();
        this.showToast(`Chế độ chuyển sang: ${btn.textContent.trim()}`, 'info');
      });
    });

    // Left Sidebar Tab Switcher
    this.sidebarTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.sidebarTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.tab === 'config') {
          this.tabConfig.classList.add('active');
          this.tabHistory.classList.remove('active');
        } else {
          this.tabConfig.classList.remove('active');
          this.tabHistory.classList.add('active');
          this.renderSavedDocs();
        }
      });
    });

    // Sidebar Config Inputs
    const triggerDebouncedAnalysis = () => {
      this.readInputsToState();
      this.updateCounters();
      this.scheduleAnalysis();
      this.triggerAutoSave();
    };

    this.focusKeywordInput.addEventListener('input', triggerDebouncedAnalysis);
    this.searchIntentSelect.addEventListener('change', triggerDebouncedAnalysis);
    this.seoTitleInput.addEventListener('input', triggerDebouncedAnalysis);
    this.metaDescInput.addEventListener('input', triggerDebouncedAnalysis);
    this.slugInput.addEventListener('input', triggerDebouncedAnalysis);
    this.authorInput.addEventListener('input', triggerDebouncedAnalysis);
    this.ctaTextInput.addEventListener('input', triggerDebouncedAnalysis);

    // Auto generate slug from Title
    this.btnAutoSlug.addEventListener('click', () => {
      const title = this.seoTitleInput.value || this.docTitleInput.value;
      const slug = generateSlug(title);
      this.slugInput.value = slug;
      this.currentDoc.slug = slug;
      this.runAnalysis();
      this.showToast('Đã tạo đường dẫn tĩnh (Slug) chuẩn SEO!', 'success');
    });

    // LSI Tag Input
    this.lsiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = this.lsiInput.value.trim().replace(',', '');
        if (val && !this.currentDoc.lsiKeywords.includes(val)) {
          this.currentDoc.lsiKeywords.push(val);
          this.renderLsiTags();
          this.lsiInput.value = '';
          this.runAnalysis();
          this.triggerAutoSave();
        }
      }
    });

    // Quick tag suggestions click
    document.querySelectorAll('.btn-tag-suggest').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        if (tag && !this.currentDoc.lsiKeywords.includes(tag)) {
          this.currentDoc.lsiKeywords.push(tag);
          this.renderLsiTags();
          this.runAnalysis();
          this.triggerAutoSave();
          this.showToast(`Đã thêm từ khóa LSI: "${tag}"`, 'info');
        }
      });
    });

    // Editor formatting toolbar
    document.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        document.execCommand(cmd, false, null);
        this.editor.focus();
        this.scheduleAnalysis();
      });
    });

    // Heading select change
    this.formatBlockSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'p') {
        document.execCommand('formatBlock', false, '<p>');
      } else {
        document.execCommand('formatBlock', false, `<${val}>`);
      }
      this.editor.focus();
      this.scheduleAnalysis();
    });

    // Insert Table
    document.getElementById('btnInsertTable').addEventListener('click', () => {
      this.insertHtmlAtCursor(SMART_BLOCK_TEMPLATES.table);
      this.showToast('Đã chèn bảng so sánh chuẩn SEO!', 'success');
      this.runAnalysis();
    });

    // Insert Link
    document.getElementById('btnInsertLink').addEventListener('click', () => {
      const url = prompt('Nhập đường dẫn URL (Link nội bộ hoặc ngoại bộ):', 'https://');
      if (url) {
        document.execCommand('createLink', false, url);
        this.runAnalysis();
      }
    });

    // Insert Image Modal
    this.btnInsertImage.addEventListener('click', () => {
      this.imgAltInput.value = this.focusKeywordInput.value || '';
      this.imageModal.classList.add('show');
    });

    const closeImageModal = () => this.imageModal.classList.remove('show');
    this.btnCloseImageModal.addEventListener('click', closeImageModal);
    this.btnCancelImage.addEventListener('click', closeImageModal);

    this.btnConfirmInsertImage.addEventListener('click', () => {
      const url = this.imgUrlInput.value.trim();
      const alt = this.imgAltInput.value.trim();
      const caption = this.imgCaptionInput.value.trim();

      if (!url) {
        alert('Vui lòng nhập đường dẫn hình ảnh!');
        return;
      }

      const imgHtml = `
<figure class="seo-image-card">
  <img src="${url}" alt="${alt || 'hinh anh minh hoa'}">
  <figcaption>
    <span>${caption || alt || 'Hình ảnh minh họa'}</span>
    <span class="alt-tag">ALT: ${alt ? alt.substring(0, 25) + '...' : 'Thiếu ALT'}</span>
  </figcaption>
</figure>
<p></p>
`;
      this.insertHtmlAtCursor(imgHtml);
      closeImageModal();
      this.showToast('Đã chèn hình ảnh kèm thẻ ALT chuẩn SEO!', 'success');
      this.runAnalysis();
    });

    // Smart Block Insertions
    document.getElementById('btnBlockDirectAnswer').addEventListener('click', () => {
      this.insertHtmlAtCursor(SMART_BLOCK_TEMPLATES.directAnswer);
      this.showToast('Đã chèn khối Direct Answer (Top 0 Snippet)!', 'success');
      this.runAnalysis();
    });

    document.getElementById('btnBlockEEAT').addEventListener('click', () => {
      this.insertHtmlAtCursor(SMART_BLOCK_TEMPLATES.eeatExperience);
      this.showToast('Đã chèn khối Trải Nghiệm & Case Study (Google EEAT)!', 'success');
      this.runAnalysis();
    });

    document.getElementById('btnBlockExpert').addEventListener('click', () => {
      this.insertHtmlAtCursor(SMART_BLOCK_TEMPLATES.expertQuote);
      this.showToast('Đã chèn khối Ý Kiến Chuyên Gia!', 'success');
      this.runAnalysis();
    });

    document.getElementById('btnBlockCTA').addEventListener('click', () => {
      this.insertHtmlAtCursor(SMART_BLOCK_TEMPLATES.ctaAds);
      this.showToast('Đã chèn khung Kêu Gọi Hành Động (CTA Ads)!', 'success');
      this.runAnalysis();
    });

    document.getElementById('btnBlockFAQ').addEventListener('click', () => {
      this.insertHtmlAtCursor(SMART_BLOCK_TEMPLATES.faq);
      this.showToast('Đã chèn khối câu hỏi FAQ kèm tự tạo Schema!', 'success');
      this.runAnalysis();
    });

    // Editor input listener
    this.editor.addEventListener('input', () => {
      this.currentDoc.contentHtml = this.editor.innerHTML;
      this.scheduleAnalysis();
      this.triggerAutoSave();
    });

    // Analytics tab switching
    this.analyticsTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.analyticsTabs.forEach(t => t.classList.remove('active'));
        this.analyticsPanels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.dataset.atab;
        if (targetId === 'seo-checklist') document.getElementById('panelSeoChecklist').classList.add('active');
        else if (targetId === 'ads-check') document.getElementById('panelAdsCheck').classList.add('active');
        else if (targetId === 'serp-preview') document.getElementById('panelSerpPreview').classList.add('active');
        else if (targetId === 'schema-view') document.getElementById('panelSchemaView').classList.add('active');
      });
    });

    // Device switch for SERP
    this.deviceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.deviceBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const dev = btn.dataset.device;
        if (dev === 'mobile') {
          this.serpPreviewBox.classList.add('mobile');
        } else {
          this.serpPreviewBox.classList.remove('mobile');
        }
      });
    });

    // Export Dropdown
    this.btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exportMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      this.exportMenu.classList.remove('show');
    });

    // Copy Clean HTML
    this.btnCopyHtml.addEventListener('click', () => {
      const cleanHtml = this.editor.innerHTML;
      navigator.clipboard.writeText(cleanHtml).then(() => {
        this.showToast('Đã copy mã Clean HTML vào Clipboard!', 'success');
      });
    });

    // Copy Markdown
    this.btnCopyMarkdown.addEventListener('click', () => {
      const md = htmlToMarkdown(this.editor.innerHTML);
      navigator.clipboard.writeText(md).then(() => {
        this.showToast('Đã copy nội dung định dạng Markdown!', 'success');
      });
    });

    // Export HTML File
    this.btnExportHtmlFile.addEventListener('click', () => {
      const schemaData = generateSchemaMarkup(this.currentDoc);
      const fullHtml = generateFullHtmlDocument({
        ...this.currentDoc,
        schemaScript: schemaData.scriptTag
      });
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${this.currentDoc.slug || 'bai-viet-seo'}.html`;
      a.click();
      this.showToast('Đã tải xuống file .HTML trọn gói đầy đủ Meta & Schema!', 'success');
    });

    // Copy Schema Button
    this.btnCopySchema.addEventListener('click', () => {
      const schemaData = generateSchemaMarkup(this.currentDoc);
      navigator.clipboard.writeText(schemaData.scriptTag).then(() => {
        this.showToast('Đã copy mã Schema JSON-LD (Dán vào thẻ <head>)!', 'success');
      });
    });

    // Templates Modal
    this.btnTemplates.addEventListener('click', () => {
      this.renderTemplatesList();
      this.templatesModal.classList.add('show');
    });

    this.btnCloseTemplates.addEventListener('click', () => {
      this.templatesModal.classList.remove('show');
    });

    // New Doc & Demo Doc
    this.btnNewDoc.addEventListener('click', () => {
      if (confirm('Tạo bài viết mới? Bài viết hiện tại sẽ được lưu vào danh sách.')) {
        this.createNewDoc();
      }
    });

    this.btnLoadDemo.addEventListener('click', () => {
      this.loadTemplate(ARTICLE_TEMPLATES[0]);
      this.showToast('Đã tải bài mẫu chuẩn Google 95 điểm!', 'success');
      this.sidebarTabs[0].click(); // switch back to config
    });

    // ================= SPINTX EVENTS =================
    // 1. Open SpintX Library Modal
    this.btnOpenSpintX.addEventListener('click', async () => {
      this.spintxModal.classList.add('show');
      await this.initSpintXModal();
    });

    this.btnCloseSpintXModal.addEventListener('click', () => {
      this.spintxModal.classList.remove('show');
    });

    // 2. SpintX Search
    this.spintxSearchInput.addEventListener('input', (e) => {
      this.spintx.searchQuery = e.target.value;
      this.renderSpintXArticlesGrid();
    });

    this.btnClearSpintxSearch.addEventListener('click', () => {
      this.spintxSearchInput.value = '';
      this.spintx.searchQuery = '';
      this.renderSpintXArticlesGrid();
      this.spintxSearchInput.focus();
    });

    // 3. Open Push to Website Modal
    this.btnOpenPushModal.addEventListener('click', () => {
      this.pushArticleTitle.textContent = this.currentDoc.seoTitle || this.currentDoc.title || 'Bài viết chưa đặt tên';
      this.pushArticleSlug.textContent = `https://spintx.vn/kien-thuc-van-hanh/${this.currentDoc.slug || 'slug'}`;
      
      const cmd = this.spintx.getGitTerminalCommand(this.currentDoc, this.commitMessageInput.value);
      if (this.gitCmdPreview) this.gitCmdPreview.textContent = cmd;

      // Populate quick git account fields
      const cfg = this.spintx.repoConfig;
      if (this.pushGitUser) this.pushGitUser.value = cfg.gitUsername || 'Doanthuat';
      if (this.pushGitPass) this.pushGitPass.value = cfg.gitPassword || '';
      if (this.pushOpenTerminalCheck) this.pushOpenTerminalCheck.checked = cfg.openTerminal !== false;

      // Toggle localGitAccountBox visibility based on selected radio
      const selectedTarget = document.querySelector('input[name="syncTarget"]:checked')?.value;
      if (this.localGitAccountBox) {
        this.localGitAccountBox.style.display = selectedTarget === 'local-git' ? 'block' : 'none';
      }

      this.pushModal.classList.add('show');
    });

    const closePushModal = () => this.pushModal.classList.remove('show');
    this.btnClosePushModal.addEventListener('click', closePushModal);
    this.btnCancelPush.addEventListener('click', closePushModal);

    // Toggle local git credentials box when radio option changes
    document.querySelectorAll('input[name="syncTarget"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (this.localGitAccountBox) {
          this.localGitAccountBox.style.display = e.target.value === 'local-git' ? 'block' : 'none';
        }
      });
    });

    if (this.btnQuickOpenGitSettings) {
      this.btnQuickOpenGitSettings.addEventListener('click', () => {
        closePushModal();
        this.btnGitHubSettings.click();
      });
    }

    // Live update Git Command preview when commit message changes
    this.commitMessageInput.addEventListener('input', () => {
      if (this.gitCmdPreview) {
        this.gitCmdPreview.textContent = this.spintx.getGitTerminalCommand(this.currentDoc, this.commitMessageInput.value);
      }
    });

    // Copy Git Command Button
    if (this.btnCopyGitCmd) {
      this.btnCopyGitCmd.addEventListener('click', () => {
        const cmd = this.gitCmdPreview ? this.gitCmdPreview.textContent : '';
        navigator.clipboard.writeText(cmd).then(() => {
          this.showToast('Đã sao chép lệnh Git vào Clipboard!', 'success');
        });
      });
    }

    // Download Article JSON button in Push modal (No API Key needed)
    if (this.btnDownloadArticleJson) {
      this.btnDownloadArticleJson.addEventListener('click', () => {
        const art = this.spintx.getUpdatedArticleObject(this.currentDoc);
        const jsonStr = JSON.stringify(art, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${art.slug || 'spintx-article'}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast(`Đã tải xuống file "${art.slug || 'bai-viet'}.json" thành công!`, 'success');
      });
    }

    // 4. Confirm Push / Update (NO API KEY)
    this.btnConfirmPush.addEventListener('click', async () => {
      const commitMsg = this.commitMessageInput.value.trim() || `feat(seo): Cập nhật bài viết "${this.currentDoc.title}"`;
      const selectedTarget = document.querySelector('input[name="syncTarget"]:checked')?.value || 'local-db';
      const runGitPush = selectedTarget === 'local-git';

      this.btnConfirmPush.disabled = true;
      this.btnConfirmPush.innerHTML = '<span>Đang cập nhật...</span>';

      try {
        if (selectedTarget === 'github-api') {
          // Direct GitHub REST API (No Git CLI needed)
          const res = await this.spintx.pushViaGitHubApi(this.currentDoc, commitMsg);
          this.showToast('Đã đẩy bài viết thành công lên GitHub (Không cần Git)!', 'success');
        } else {
          // If local-git, save quick username & password
          const openTerm = this.pushOpenTerminalCheck ? this.pushOpenTerminalCheck.checked : false;
          if (selectedTarget === 'local-git') {
            const u = this.pushGitUser ? this.pushGitUser.value.trim() : '';
            const p = this.pushGitPass ? this.pushGitPass.value.trim() : '';
            this.spintx.saveRepoConfig({
              gitUsername: u || this.spintx.repoConfig.gitUsername,
              gitPassword: p || this.spintx.repoConfig.gitPassword,
              openTerminal: openTerm
            });
          }

          // Local DB or Local Git CLI
          const res = await this.spintx.updateAndPushGit(this.currentDoc, commitMsg, runGitPush, openTerm);
          if (runGitPush) {
            if (openTerm) {
              this.showToast('Đã mở cửa sổ Terminal và tự động chạy Git commit & push!', 'success');
            } else {
              const out = (res.gitOutput || '').toLowerCase();
              if (out.includes('fatal') || out.includes('error:') || out.includes('permission denied')) {
                this.showToast(`Đã lưu file vào thư mục! Git CLI: ${res.gitOutput.substring(0, 90)}...`, 'warning');
              } else {
                this.showToast('Đã lưu bài viết & chạy Git Push thành công!', 'success');
              }
            }
          } else {
            this.showToast(res.message || 'Đã cập nhật bài viết thành công!', 'success');
          }
        }
        
        closePushModal();
      } catch (err) {
        alert(`Lỗi cập nhật: ${err.message}`);
      } finally {
        this.btnConfirmPush.disabled = false;
        this.btnConfirmPush.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Xác Nhận Cập Nhật</span>
        `;
      }
    });

    // 5. Git Repo Settings Modal
    this.btnGitHubSettings.addEventListener('click', () => {
      const cfg = this.spintx.repoConfig;
      this.repoPathInput.value = cfg.repoPath || 'D:\\Duy_Tam\\website_spintx_vn';
      this.ghBranchInput.value = cfg.branch || 'main';
      if (this.ghTokenInput) this.ghTokenInput.value = cfg.githubToken || '';
      if (this.gitUsernameInput) this.gitUsernameInput.value = cfg.gitUsername || 'Doanthuat';
      if (this.gitPasswordInput) this.gitPasswordInput.value = cfg.gitPassword || '';
      if (this.openTerminalCheck) this.openTerminalCheck.checked = cfg.openTerminal !== false;
      if (this.autoGitPushCheck) this.autoGitPushCheck.checked = !!cfg.autoGitPush;
      this.githubModal.classList.add('show');
    });

    const closeGithubModal = () => this.githubModal.classList.remove('show');
    this.btnCloseGithubModal.addEventListener('click', closeGithubModal);
    this.btnCancelGithub.addEventListener('click', closeGithubModal);

    this.btnSaveGithubConfig.addEventListener('click', () => {
      this.spintx.saveRepoConfig({
        repoPath: this.repoPathInput.value.trim() || 'D:\\Duy_Tam\\website_spintx_vn',
        branch: this.ghBranchInput.value.trim() || 'main',
        githubToken: this.ghTokenInput ? this.ghTokenInput.value.trim() : '',
        gitUsername: this.gitUsernameInput ? this.gitUsernameInput.value.trim() : 'Doanthuat',
        gitPassword: this.gitPasswordInput ? this.gitPasswordInput.value.trim() : '',
        openTerminal: this.openTerminalCheck ? this.openTerminalCheck.checked : true,
        autoGitPush: this.autoGitPushCheck ? this.autoGitPushCheck.checked : false
      });
      closeGithubModal();
      this.showToast('Đã lưu cấu hình Git repository thành công!', 'success');
    });
  }

  loadInitialData() {
    const saved = loadCurrentDocument();
    if (saved && saved.contentHtml) {
      this.currentDoc = { ...this.currentDoc, ...saved };
    } else {
      // Default to high-converting demo
      this.loadTemplate(ARTICLE_TEMPLATES[0], false);
    }
    this.syncStateToInputs();
    this.renderLsiTags();
    this.updateCounters();
    this.runAnalysis();
    this.renderSavedDocs();

    // Pre-load SpintX articles to update badge count
    this.spintx.loadArticles().then(arts => {
      if (this.spintxBadgeCount) {
        this.spintxBadgeCount.textContent = arts.length;
      }
    }).catch(err => console.warn('Could not pre-load SpintX articles:', err));
  }

  // ================= SPINTX RENDER METHODS =================
  async initSpintXModal() {
    if (!this.spintx.articles || this.spintx.articles.length === 0) {
      this.spintxArticlesGrid.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">Đang tải 47 bài viết từ hệ thống SpintX...</div>';
      await this.spintx.loadArticles();
    }
    if (this.spintxBadgeCount) {
      this.spintxBadgeCount.textContent = this.spintx.articles.length;
    }
    this.renderSpintXCategories();
    this.renderSpintXArticlesGrid();
  }

  renderSpintXCategories() {
    this.spintxCategoriesList.innerHTML = '';
    
    // "ALL" button
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `cat-pill ${this.spintx.activeCategory === 'ALL' ? 'active' : ''}`;
    allBtn.textContent = `Tất cả bài viết (${this.spintx.articles.length})`;
    allBtn.addEventListener('click', () => {
      this.spintx.activeCategory = 'ALL';
      this.renderSpintXCategories();
      this.renderSpintXArticlesGrid();
    });
    this.spintxCategoriesList.appendChild(allBtn);

    // Category buttons
    this.spintx.categories.forEach(cat => {
      const count = this.spintx.articles.filter(a => a.category === cat).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `cat-pill ${this.spintx.activeCategory === cat ? 'active' : ''}`;
      btn.textContent = `${cat} (${count})`;
      btn.addEventListener('click', () => {
        this.spintx.activeCategory = cat;
        this.renderSpintXCategories();
        this.renderSpintXArticlesGrid();
      });
      this.spintxCategoriesList.appendChild(btn);
    });
  }

  renderSpintXArticlesGrid() {
    const list = this.spintx.getFilteredArticles();
    this.spintxVisibleCount.textContent = list.length;
    this.spintxArticlesGrid.innerHTML = '';

    if (list.length === 0) {
      this.spintxArticlesGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #94A3B8;">
          <p style="font-size: 14px; margin-bottom: 8px;">Không tìm thấy bài viết nào phù hợp.</p>
          <small>Thử tìm kiếm với từ khóa khác hoặc chọn "Tất cả bài viết".</small>
        </div>
      `;
      return;
    }

    list.forEach(art => {
      const card = document.createElement('div');
      card.className = 'spintx-card';
      const wordsEstimate = art.contentHtml ? Math.round(art.contentHtml.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length) : 1500;
      const readTimeEstimate = Math.ceil(wordsEstimate / 200);

      card.innerHTML = `
        <div class="spintx-card-header">
          <span class="spintx-card-cat">${art.category || 'KIẾN THỨC VẬN HÀNH'}</span>
          <span class="spintx-card-id">#${art.id}</span>
        </div>
        <h4 class="spintx-card-title">${art.title}</h4>
        <p class="spintx-card-excerpt">${art.excerpt || art.quickSummary || ''}</p>
        <div class="spintx-card-footer">
          <div class="spintx-card-meta">
            <span>⏱️ ${readTimeEstimate} phút đọc</span>
            <span>📝 ~${wordsEstimate} từ</span>
          </div>
          <button type="button" class="btn-load-spintx">Nạp Vào Editor ➔</button>
        </div>
      `;

      card.addEventListener('click', () => {
        this.loadSpintXArticle(art);
      });

      this.spintxArticlesGrid.appendChild(card);
    });
  }

  loadSpintXArticle(art) {
    const docData = this.spintx.mapToSeoPulseDoc(art);
    this.currentDoc = {
      ...this.currentDoc,
      ...docData
    };

    this.syncStateToInputs();
    this.renderLsiTags();
    this.updateCounters();
    this.runAnalysis();
    this.triggerAutoSave();

    this.spintxModal.classList.remove('show');
    this.sidebarTabs[0].click(); // Switch to config panel

    this.showToast(`Đã nạp bài SpintX #${art.id}: "${art.title}"`, 'success');
  }

  readInputsToState() {
    this.currentDoc.focusKeyword = this.focusKeywordInput.value.trim();
    this.currentDoc.searchIntent = this.searchIntentSelect.value;
    this.currentDoc.seoTitle = this.seoTitleInput.value.trim();
    this.currentDoc.metaDesc = this.metaDescInput.value.trim();
    this.currentDoc.slug = this.slugInput.value.trim();
    this.currentDoc.author = this.authorInput.value.trim();
    this.currentDoc.ctaText = this.ctaTextInput.value.trim();
    this.currentDoc.contentHtml = this.editor.innerHTML;
  }

  syncStateToInputs() {
    this.docTitleInput.value = this.currentDoc.title || '';
    this.focusKeywordInput.value = this.currentDoc.focusKeyword || '';
    this.searchIntentSelect.value = this.currentDoc.searchIntent || 'commercial';
    this.seoTitleInput.value = this.currentDoc.seoTitle || '';
    this.metaDescInput.value = this.currentDoc.metaDesc || '';
    this.slugInput.value = this.currentDoc.slug || '';
    this.authorInput.value = this.currentDoc.author || '';
    this.ctaTextInput.value = this.currentDoc.ctaText || '';
    this.editor.innerHTML = this.currentDoc.contentHtml || '';
  }

  renderLsiTags() {
    this.lsiTagsList.innerHTML = '';
    this.currentDoc.lsiKeywords.forEach((tag, idx) => {
      const span = document.createElement('span');
      span.className = 'lsi-tag';
      span.innerHTML = `
        <span>${tag}</span>
        <button type="button" class="btn-remove-tag" data-idx="${idx}">&times;</button>
      `;
      span.querySelector('.btn-remove-tag').addEventListener('click', (e) => {
        e.stopPropagation();
        this.currentDoc.lsiKeywords.splice(idx, 1);
        this.renderLsiTags();
        this.runAnalysis();
        this.triggerAutoSave();
      });
      this.lsiTagsList.appendChild(span);
    });
  }

  updateCounters() {
    // Title Counter (50 - 60 chars)
    const titleLen = this.seoTitleInput.value.length;
    this.titleCounter.textContent = `${titleLen}/60 ký tự`;
    const titlePercent = Math.min((titleLen / 60) * 100, 100);
    this.titleProgressBar.style.width = `${titlePercent}%`;
    if (titleLen >= 50 && titleLen <= 65) {
      this.titleCounter.className = 'char-counter good';
      this.titleProgressBar.className = 'progress-bar good';
    } else if (titleLen >= 30 && titleLen < 50) {
      this.titleCounter.className = 'char-counter warning';
      this.titleProgressBar.className = 'progress-bar warning';
    } else {
      this.titleCounter.className = 'char-counter bad';
      this.titleProgressBar.className = 'progress-bar bad';
    }

    // Meta Desc Counter (140 - 160 chars)
    const descLen = this.metaDescInput.value.length;
    this.descCounter.textContent = `${descLen}/160 ký tự`;
    const descPercent = Math.min((descLen / 160) * 100, 100);
    this.descProgressBar.style.width = `${descPercent}%`;
    if (descLen >= 140 && descLen <= 165) {
      this.descCounter.className = 'char-counter good';
      this.descProgressBar.className = 'progress-bar good';
    } else if (descLen >= 80 && descLen < 140) {
      this.descCounter.className = 'char-counter warning';
      this.descProgressBar.className = 'progress-bar warning';
    } else {
      this.descCounter.className = 'char-counter bad';
      this.descProgressBar.className = 'progress-bar bad';
    }
  }

  scheduleAnalysis() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.runAnalysis();
    }, 150);
  }

  runAnalysis() {
    this.readInputsToState();

    // 1. Run SEO Analyzer
    const seoRes = analyzeSEO(this.currentDoc);

    // 2. Run Ads Analyzer
    const adsRes = analyzeAds(this.currentDoc);

    // 3. Update Status Bar
    this.wordCount.textContent = seoRes.wordCount;
    this.charCount.textContent = seoRes.charCount;
    this.readingTime.textContent = `${seoRes.readingTime} phút`;
    this.headingsCount.textContent = `H1: ${seoRes.headings.h1} | H2: ${seoRes.headings.h2} | H3: ${seoRes.headings.h3}`;
    this.imagesCount.textContent = `${seoRes.images.total} ảnh (${seoRes.images.withAlt} có ALT)`;
    this.keywordDensity.textContent = `${seoRes.density.toFixed(1)}%`;
    this.keywordStatsHint.textContent = `Xuất hiện ${seoRes.keywordOccurrences} lần trong bài (Mật độ ${seoRes.density.toFixed(1)}%)`;

    // 4. Calculate Mode Composite Score
    let overallScore = 0;
    if (this.currentDoc.activeMode === 'all') {
      overallScore = Math.round(seoRes.seoScore * 0.6 + adsRes.adsScore * 0.4);
    } else if (this.currentDoc.activeMode === 'seo') {
      overallScore = seoRes.seoScore;
    } else {
      overallScore = adsRes.adsScore;
    }

    // 5. Update Gauge & Scores
    this.gaugeScore.textContent = overallScore;
    const circumference = 264;
    const offset = circumference - (circumference * overallScore) / 100;
    this.gaugeProgress.style.strokeDashoffset = offset;

    let scoreColor = '#10B981';
    let ratingClass = 'score-badge';
    let ratingText = 'Xuất Sắc - Chuẩn Google';
    let verdictText = 'Sẵn sàng index & chạy Ads!';
    let adviceText = 'Bài viết đáp ứng đầy đủ tiêu chí Helpful Content, EEAT và trải nghiệm trang đích.';

    if (overallScore >= 85) {
      scoreColor = '#10B981';
      ratingClass = 'score-badge';
      ratingText = 'Xuất Sắc - Chuẩn Google';
      verdictText = 'Tối ưu tuyệt hảo! Điểm chất lượng cao.';
      adviceText = 'Tất cả tiêu chuẩn On-page và chuyển đổi Ads đã hoàn thành chuẩn xác.';
    } else if (overallScore >= 70) {
      scoreColor = '#3B82F6';
      ratingClass = 'score-badge';
      ratingText = 'Khá Tốt';
      verdictText = 'Bài viết đạt chuẩn cơ bản.';
      adviceText = 'Cải thiện thêm các mục cảnh báo màu vàng để tối đa hóa thứ hạng.';
    } else if (overallScore >= 50) {
      scoreColor = '#F59E0B';
      ratingClass = 'score-badge amber';
      ratingText = 'Cần Lưu Ý';
      verdictText = 'Chưa tối ưu trọn vẹn.';
      adviceText = 'Bổ sung thêm từ khóa trong tiêu đề, hình ảnh và khối kêu gọi hành động CTA.';
    } else {
      scoreColor = '#EF4444';
      ratingClass = 'score-badge red';
      ratingText = 'Chưa Đạt Chuẩn';
      verdictText = 'Nguy cơ khó index hoặc giá click Ads cao.';
      adviceText = 'Xem kỹ checklist màu đỏ bên dưới để hoàn thiện các yếu tố cốt lõi.';
    }

    this.gaugeProgress.style.stroke = scoreColor;
    this.scoreRatingBadge.className = ratingClass;
    this.scoreRatingBadge.textContent = ratingText;
    this.scoreVerdict.textContent = verdictText;
    this.scoreAdvice.textContent = adviceText;

    // Sub-scores
    this.seoScoreVal.textContent = `${seoRes.seoScore}/100`;
    this.seoProgressFill.style.width = `${seoRes.seoScore}%`;
    this.seoProgressFill.style.background = seoRes.seoScore >= 80 ? 'var(--emerald)' : (seoRes.seoScore >= 50 ? 'var(--amber)' : 'var(--rose)');

    this.adsScoreVal.textContent = `${adsRes.adsScore}/100`;
    this.adsProgressFill.style.width = `${adsRes.adsScore}%`;
    this.adsProgressFill.style.background = adsRes.adsScore >= 80 ? 'var(--emerald)' : (adsRes.adsScore >= 50 ? 'var(--amber)' : 'var(--rose)');

    // 6. Render SEO Checklist
    this.renderChecklist(this.seoMetaChecklist, seoRes.metaChecks);
    this.renderChecklist(this.seoContentChecklist, seoRes.contentChecks);
    this.renderChecklist(this.seoEeatChecklist, seoRes.eeatChecks);

    const seoFails = [...seoRes.metaChecks, ...seoRes.contentChecks, ...seoRes.eeatChecks].filter(c => c.fail || c.warning).length;
    this.seoIssuesCount.textContent = seoFails;
    this.seoIssuesCount.className = seoFails === 0 ? 'badge-count zero' : 'badge-count';

    // 7. Render LSI Grid
    this.renderLsiTracker(seoRes.lsiResults);

    // 8. Render Ads Checklist & Simulator
    this.renderChecklist(this.adsLandingChecklist, adsRes.adsChecks);
    const adsFails = adsRes.adsChecks.filter(c => c.fail || c.warning).length;
    this.adsIssuesCount.textContent = adsFails;
    this.adsIssuesCount.className = adsFails === 0 ? 'badge-count zero' : 'badge-count';

    this.adSimDomain.textContent = adsRes.adPreview.domain;
    this.adSimHeadline.textContent = adsRes.adPreview.headline;
    this.adSimDesc.textContent = adsRes.adPreview.description;

    // 9. Render SERP Preview
    this.serpTitlePreview.textContent = this.currentDoc.seoTitle || 'Tiêu đề bài viết hiển thị trên Google';
    this.serpDescPreview.textContent = this.currentDoc.metaDesc || 'Đoạn trích tóm tắt mô tả bài viết trên kết quả tìm kiếm Google...';
    this.serpUrlPreview.textContent = `https://yoursite.com › ${this.currentDoc.slug || 'bai-viet'}`;
    this.socialTitle.textContent = this.currentDoc.seoTitle || this.currentDoc.title;
    this.socialDesc.textContent = this.currentDoc.metaDesc || 'Nội dung chia sẻ hấp dẫn...';

    // Render FAQ in SERP if present
    const docParsed = new DOMParser().parseFromString(this.currentDoc.contentHtml || '', 'text/html');
    const faqItems = docParsed.querySelectorAll('.smart-block-faq .faq-item');
    if (faqItems.length > 0) {
      this.serpFaqPreview.style.display = 'flex';
      this.serpFaqPreview.innerHTML = '';
      faqItems.forEach(item => {
        const q = item.querySelector('.faq-question')?.textContent || '';
        if (q) {
          const div = document.createElement('div');
          div.className = 'serp-faq-item';
          div.innerHTML = `<span class="faq-q">${q}</span><span class="faq-arrow">▼</span>`;
          this.serpFaqPreview.appendChild(div);
        }
      });
    } else {
      this.serpFaqPreview.style.display = 'none';
    }

    // 10. Update Schema Code
    const schemaData = generateSchemaMarkup(this.currentDoc);
    this.schemaCodeOutput.textContent = schemaData.formattedString;
  }

  renderChecklist(container, items) {
    container.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'check-item';

      let iconClass = 'pass';
      let iconSymbol = '✓';
      if (item.warning) {
        iconClass = 'warning';
        iconSymbol = '!';
      } else if (item.fail) {
        iconClass = 'fail';
        iconSymbol = '✕';
      }

      li.innerHTML = `
        <div class="check-icon ${iconClass}">${iconSymbol}</div>
        <div class="check-content">
          <div class="check-name">${item.title}</div>
          <div class="check-hint">${item.hint}</div>
        </div>
      `;
      container.appendChild(li);
    });
  }

  renderLsiTracker(lsiList) {
    this.lsiTrackerGrid.innerHTML = '';
    if (!lsiList || lsiList.length === 0) {
      this.lsiTrackerGrid.innerHTML = '<span style="font-size:11px;color:#94a3b8;">Chưa nhập từ khóa LSI nào.</span>';
      return;
    }
    lsiList.forEach(item => {
      const badge = document.createElement('div');
      badge.className = `lsi-badge-item ${item.used ? 'active' : ''}`;
      badge.innerHTML = `
        <span>${item.keyword}</span>
        <span class="lsi-count">${item.count}</span>
      `;
      this.lsiTrackerGrid.appendChild(badge);
    });
  }

  insertHtmlAtCursor(html) {
    this.editor.focus();
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      const el = document.createElement('div');
      el.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node, lastNode;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);

      if (lastNode) {
        const newRange = range.cloneRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    } else {
      this.editor.innerHTML += html;
    }
    this.currentDoc.contentHtml = this.editor.innerHTML;
  }

  triggerAutoSave() {
    this.saveStatus.classList.add('saving');
    this.saveStatusText.textContent = 'Đang lưu...';

    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      saveCurrentDocument(this.currentDoc);
      this.saveStatus.classList.remove('saving');
      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      this.saveStatusText.textContent = `Đã lưu tự động lúc ${timeStr}`;
      this.renderSavedDocs();
    }, 800);
  }

  renderSavedDocs() {
    const list = getSavedDocumentsList();
    this.savedDocsCount.textContent = list.length;
    this.savedDocsList.innerHTML = '';

    if (list.length === 0) {
      this.savedDocsList.innerHTML = '<p style="font-size:12px;color:#94a3b8;text-align:center;padding:12px;">Chưa có bài viết nào được lưu.</p>';
      return;
    }

    list.forEach(doc => {
      const item = document.createElement('div');
      item.className = `saved-doc-item ${doc.id === this.currentDoc.id ? 'active' : ''}`;
      const timeStr = doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString('vi-VN') : 'Gần đây';
      item.innerHTML = `
        <div class="saved-doc-title" title="${doc.title}">${doc.title || 'Bài viết chưa đặt tên'}</div>
        <div class="saved-doc-meta">
          <span>${timeStr}</span>
          <span class="saved-doc-score">Từ khóa: ${doc.focusKeyword || 'Chưa đặt'}</span>
        </div>
        <button type="button" class="btn-delete-doc" title="Xóa bài viết này">&times;</button>
      `;

      item.addEventListener('click', () => {
        this.currentDoc = { ...this.currentDoc, ...doc };
        this.syncStateToInputs();
        this.renderLsiTags();
        this.updateCounters();
        this.runAnalysis();
        this.sidebarTabs[0].click(); // Switch to config
        this.showToast('Đã mở bài viết đã lưu!', 'info');
      });

      item.querySelector('.btn-delete-doc').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Xác nhận xóa bài viết "${doc.title}"?`)) {
          deleteDocument(doc.id);
          this.renderSavedDocs();
          this.showToast('Đã xóa bài viết.', 'warning');
        }
      });

      this.savedDocsList.appendChild(item);
    });
  }

  createNewDoc() {
    this.currentDoc = {
      id: 'doc_' + Date.now(),
      title: 'Bài viết chuẩn SEO mới',
      focusKeyword: '',
      lsiKeywords: [],
      intent: 'commercial',
      seoTitle: '',
      metaDesc: '',
      slug: '',
      author: 'Chuyên Gia Nội Dung',
      ctaText: 'Đăng Ký Tư Vấn Miễn Phí',
      contentHtml: '<h1>Tiêu đề bài viết mới tại đây</h1><p>Bắt đầu viết nội dung chuẩn SEO Google và chèn các Smart Blocks...</p>',
      activeMode: 'all'
    };
    this.syncStateToInputs();
    this.renderLsiTags();
    this.updateCounters();
    this.runAnalysis();
    this.sidebarTabs[0].click();
    this.triggerAutoSave();
    this.showToast('Đã tạo phiên soạn thảo mới!', 'success');
  }

  renderTemplatesList() {
    this.templatesGrid.innerHTML = '';
    ARTICLE_TEMPLATES.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'template-card';
      card.innerHTML = `
        <span class="template-badge ${tpl.badgeType}">${tpl.badge}</span>
        <h4>${tpl.title}</h4>
        <p>${tpl.desc}</p>
        <div class="template-footer">
          <span>Từ khóa mẫu: <strong>${tpl.focusKeyword}</strong></span>
          <button type="button" class="btn btn-sm btn-primary">Sử Dụng Mẫu</button>
        </div>
      `;
      card.addEventListener('click', () => {
        this.loadTemplate(tpl);
        this.templatesModal.classList.remove('show');
        this.showToast(`Đã tải mẫu: ${tpl.title}`, 'success');
      });
      this.templatesGrid.appendChild(card);
    });
  }

  loadTemplate(tpl, runSave = true) {
    this.currentDoc = {
      ...this.currentDoc,
      id: 'doc_' + Date.now(),
      title: tpl.title,
      focusKeyword: tpl.focusKeyword,
      lsiKeywords: [...tpl.lsiKeywords],
      intent: tpl.intent,
      seoTitle: tpl.seoTitle,
      metaDesc: tpl.metaDesc,
      slug: tpl.slug,
      author: tpl.author,
      ctaText: tpl.ctaText,
      contentHtml: tpl.content
    };
    this.syncStateToInputs();
    this.renderLsiTags();
    this.updateCounters();
    this.runAnalysis();
    if (runSave) this.triggerAutoSave();
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }
}

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.seopulse = new SEOPulseApp();
});

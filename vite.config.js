import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import nodemailer from 'nodemailer';

const execAsync = util.promisify(exec);

function generateResourcesConstantsTs(articles) {
  const formattedArticles = articles.map(art => ({
    id: String(art.id || ''),
    slug: String(art.slug || ''),
    title: String(art.title || ''),
    category: art.category || 'NỖI ĐAU VẬN HÀNH',
    author: typeof art.author === 'object' && art.author !== null 
      ? art.author 
      : { id: 'tri', name: String(art.author || 'Trí') },
    publishedDate: art.publishedDate || new Date().toISOString().split('T')[0],
    formattedDate: art.formattedDate || '9 Tháng 5, 2026',
    commentCount: typeof art.commentCount === 'number' ? art.commentCount : 0,
    excerpt: String(art.excerpt || ''),
    quickSummary: String(art.quickSummary || art.excerpt || ''),
    tableOfContents: Array.isArray(art.tableOfContents) ? art.tableOfContents : [],
    contentHtml: String(art.contentHtml || '')
  }));

  return `import {
  ResourceArticle,
  ResourceCategoryInfo,
} from "../types/resources.types";
import { NEW_RESOURCE_ARTICLES } from "./new-resources.constants";

export const RESOURCE_CATEGORIES: ResourceCategoryInfo[] = [
  {
    id: "chuan-hoa-nganh",
    name: "Chuẩn Hóa Vận Hành",
    slug: "chuan-hoa-nganh",
    count: 13,
  },
  {
    id: "giai-phap-spintx",
    name: "Giải Pháp SPINTX",
    slug: "giai-phap-spintx",
    count: 14,
  },
  {
    id: "noi-dau-van-hanh",
    name: "Nỗi Đau Vận Hành",
    slug: "noi-dau-van-hanh",
    count: 20,
  },
];

export const RESOURCE_ARTICLES: ResourceArticle[] = ${JSON.stringify(formattedArticles, null, 2)};
`;
}

function generateResourcesMetaConstantsTs(articles) {
  const formattedMeta = articles.map(art => ({
    id: String(art.id || ''),
    slug: String(art.slug || ''),
    title: String(art.title || ''),
    category: art.category || 'NỖI ĐAU VẬN HÀNH',
    author: typeof art.author === 'object' && art.author !== null 
      ? art.author 
      : { id: 'tri', name: String(art.author || 'Trí') },
    publishedDate: art.publishedDate || new Date().toISOString().split('T')[0],
    formattedDate: art.formattedDate || '9 Tháng 5, 2026',
    commentCount: typeof art.commentCount === 'number' ? art.commentCount : 0,
    excerpt: String(art.excerpt || ''),
    quickSummary: String(art.quickSummary || art.excerpt || ''),
    tableOfContents: Array.isArray(art.tableOfContents) ? art.tableOfContents : []
  }));

  return `import { ResourceArticle } from "../types/resources.types";

export const RESOURCE_METADATA: Omit<ResourceArticle, "contentHtml">[] = ${JSON.stringify(formattedMeta, null, 2)};
`;
}

async function pushFileToGitHub(token, owner, repo, branch, filePath, contentString, message) {
  const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  let sha = null;
  try {
    const getRes = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SEOPulse-Pro-App'
      }
    });
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }
  } catch (e) {}

  const base64Content = Buffer.from(contentString, 'utf8').toString('base64');
  const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'SEOPulse-Pro-App'
    },
    body: JSON.stringify({
      message,
      content: base64Content,
      branch,
      ...(sha ? { sha } : {})
    })
  });
  if (!putRes.ok) {
    const errJson = await putRes.json().catch(() => ({}));
    throw new Error(errJson.message || `Lỗi đẩy file ${filePath} lên GitHub (HTTP ${putRes.status})`);
  }
  return await putRes.json();
}

export default defineConfig({
  base: '/Tool_SEO/',
  server: {
    host: true,
    port: 5173
  },
  plugins: [
    {
      name: 'spintx-api-bridge',
      configureServer(server) {
        // GET /api/spintx/articles - Returns all 47 articles
        server.middlewares.use('/api/spintx/articles', (req, res) => {
          if (req.method === 'GET') {
            try {
              const filePath = path.resolve('src/data/spintx_articles.json');
              const data = fs.readFileSync(filePath, 'utf8');
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          }
        });

        // GET /api/spintx/export-ts - Download resources.constants.ts for website_spintx_vn codebase
        server.middlewares.use('/api/spintx/export-ts', (req, res) => {
          if (req.method === 'GET') {
            try {
              const filePath = path.resolve('src/data/spintx_articles.json');
              const articles = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              const tsContent = generateResourcesConstantsTs(articles);
              res.setHeader('Content-Type', 'text/typescript; charset=utf-8');
              res.setHeader('Content-Disposition', 'attachment; filename="resources.constants.ts"');
              res.end(tsContent);
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          }
        });


        // POST /api/spintx/update - Update article content in local storage & local file
        server.middlewares.use('/api/spintx/update', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                const updatedArticle = JSON.parse(body);
                const filePath = path.resolve('src/data/spintx_articles.json');
                const articles = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                const idx = articles.findIndex(a => a.id === updatedArticle.id || a.slug === updatedArticle.slug);
                if (idx >= 0) {
                  articles[idx] = {
                    ...articles[idx],
                    ...updatedArticle,
                    updatedAt: new Date().toISOString()
                  };
                } else {
                  articles.unshift({
                    ...updatedArticle,
                    updatedAt: new Date().toISOString()
                  });
                }

                fs.writeFileSync(filePath, JSON.stringify(articles, null, 2), 'utf8');

                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({
                  success: true,
                  message: `Đã cập nhật bài viết "${updatedArticle.title}" vào cơ sở dữ liệu SpintX!`,
                  updatedAt: new Date().toISOString(),
                  totalArticles: articles.length
                }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          }
        });

        // POST /api/email/send-notification - Save article locally and send email notification
        server.middlewares.use('/api/email/send-notification', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
              try {
                const { 
                  toEmail = 'ddtam2604.work@gmail.com',
                  note = 'Tối ưu SEO & Google Ads nội dung bài viết',
                  updatedArticle,
                  smtpConfig = {}
                } = JSON.parse(body);

                if (!updatedArticle) {
                  throw new Error('Thiếu thông tin bài viết cần gửi thông báo.');
                }

                // 1. Save updated article to local JSON database
                const localToolFile = path.resolve('src/data/spintx_articles.json');
                const articles = JSON.parse(fs.readFileSync(localToolFile, 'utf8'));
                const idx = articles.findIndex(a => a.id === updatedArticle.id || a.slug === updatedArticle.slug);
                if (idx >= 0) {
                  articles[idx] = {
                    ...articles[idx],
                    ...updatedArticle,
                    updatedAt: new Date().toISOString()
                  };
                } else {
                  articles.unshift({
                    ...updatedArticle,
                    updatedAt: new Date().toISOString()
                  });
                }
                fs.writeFileSync(localToolFile, JSON.stringify(articles, null, 2), 'utf8');

                // 2. Also update website_spintx_vn-main FE constants if available
                const feConstantsDir = path.resolve('website_spintx_vn-main/FE/src/modules/resources/constants');
                if (fs.existsSync(feConstantsDir)) {
                  fs.writeFileSync(path.join(feConstantsDir, 'resources.constants.ts'), generateResourcesConstantsTs(articles), 'utf8');
                  fs.writeFileSync(path.join(feConstantsDir, 'resources-meta.constants.ts'), generateResourcesMetaConstantsTs(articles), 'utf8');
                }
                const mainRepoFeDir = path.resolve('D:/Duy_Tam/website_spintx_vn/FE/src/modules/resources/constants');
                if (fs.existsSync(mainRepoFeDir)) {
                  fs.writeFileSync(path.join(mainRepoFeDir, 'resources.constants.ts'), generateResourcesConstantsTs(articles), 'utf8');
                  fs.writeFileSync(path.join(mainRepoFeDir, 'resources-meta.constants.ts'), generateResourcesMetaConstantsTs(articles), 'utf8');
                }

                // 3. Send Email Notification using nodemailer
                let transporter;
                const hasSmtpAuth = smtpConfig && smtpConfig.user && smtpConfig.pass;
                if (hasSmtpAuth) {
                  transporter = nodemailer.createTransport({
                    host: smtpConfig.host || 'smtp.gmail.com',
                    port: Number(smtpConfig.port) || 587,
                    secure: Number(smtpConfig.port) === 465,
                    auth: {
                      user: smtpConfig.user,
                      pass: smtpConfig.pass
                    }
                  });
                } else {
                  // Fallback test account
                  const testAccount = await nodemailer.createTestAccount();
                  transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                      user: testAccount.user,
                      pass: testAccount.pass
                    }
                  });
                }

                const htmlContent = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #ffffff;">
                    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 20px; border-radius: 10px; color: #ffffff; text-align: center;">
                      <h2 style="margin: 0; font-size: 20px; color: #38bdf8;">📢 Thông Báo Cập Nhật Bài Viết SpintX</h2>
                      <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Hệ thống SEOPulse Pro - SpintX Knowledge Base</p>
                    </div>

                    <div style="padding: 20px 0;">
                      <p style="font-size: 15px; color: #334155; line-height: 1.6;">
                        Xin chào <strong>${toEmail}</strong>, bài viết dưới đây vừa được tối ưu và cập nhật nội dung mới:
                      </p>

                      <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; margin: 16px 0;">
                        <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 17px;">📌 ${updatedArticle.title}</h3>
                        <p style="margin: 6px 0; font-size: 13px; color: #475569;"><strong>🔗 Đường dẫn URL:</strong> <a href="https://spintx.vn/kien-thuc-van-hanh/${updatedArticle.slug}" style="color: #0284c7; font-weight: 600;">https://spintx.vn/kien-thuc-van-hanh/${updatedArticle.slug}</a></p>
                        <p style="margin: 6px 0; font-size: 13px; color: #475569;"><strong>📁 Chuyên mục:</strong> <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:4px;font-weight:600;font-size:12px;">${updatedArticle.category || 'NỖI ĐAU VẬN HÀNH'}</span></p>
                        <p style="margin: 6px 0; font-size: 13px; color: #475569;"><strong>📝 Ghi chú thay đổi:</strong> ${note || 'Tối ưu SEO & Google Ads nội dung bài viết'}</p>
                        <p style="margin: 6px 0; font-size: 13px; color: #475569;"><strong>⏱️ Thời gian cập nhật:</strong> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
                      </div>

                      <div style="margin-top: 16px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px;">
                        <h4 style="margin: 0 0 8px 0; color: #1d4ed8; font-size: 14px;">💡 Đoạn tóm tắt nội dung bài viết:</h4>
                        <p style="margin: 0; font-size: 13px; color: #1e3a8a; line-height: 1.5;">${updatedArticle.quickSummary || updatedArticle.excerpt || 'Đã cập nhật nội dung bài viết mới.'}</p>
                      </div>
                    </div>

                    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                      Email thông báo tự động từ SEOPulse Pro Tool SEO | © 2026 SpintX
                    </div>
                  </div>
                `;

                const senderAddr = hasSmtpAuth ? smtpConfig.user : 'noreply@seopulse.pro';
                const mailOptions = {
                  from: `"SEOPulse Pro" <${senderAddr}>`,
                  to: toEmail,
                  subject: `[SEOPulse Pro] 📢 Thông báo cập nhật bài viết: "${updatedArticle.title}"`,
                  html: htmlContent
                };

                let emailStatus = 'Đã gửi email thông báo thành công!';
                let previewUrl = null;

                try {
                  const mailInfo = await transporter.sendMail(mailOptions);
                  previewUrl = nodemailer.getTestMessageUrl(mailInfo);
                  if (previewUrl) {
                    emailStatus = `Đã gửi email thử nghiệm! Link xem trước: ${previewUrl}`;
                  }
                } catch (mailErr) {
                  emailStatus = `Đã lưu bài viết nhưng không gửi được email (Lỗi SMTP: ${mailErr.message})`;
                }

                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({
                  success: true,
                  message: `Đã lưu cập nhật bài viết "${updatedArticle.title}" và gửi thông báo về email ${toEmail}!`,
                  emailStatus,
                  previewUrl,
                  toEmail,
                  updatedAt: new Date().toISOString()
                }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          }
        });

        // POST /api/git/commit-and-push - Native Local Git Execution (NO API KEY)
        server.middlewares.use('/api/git/commit-and-push', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
              try {
                const { 
                  repoPath, 
                  commitMessage, 
                  updatedArticle, 
                  runGitPush = true,
                  gitUsername = '',
                  gitPassword = '',
                  openTerminal = false,
                  branch = 'main'
                } = JSON.parse(body);
                
                // 1. Update Tool_SEO local database
                const localToolFile = path.resolve('src/data/spintx_articles.json');
                const articles = JSON.parse(fs.readFileSync(localToolFile, 'utf8'));
                const idx = articles.findIndex(a => a.id === updatedArticle.id || a.slug === updatedArticle.slug);
                if (idx >= 0) {
                  articles[idx] = {
                    ...articles[idx],
                    ...updatedArticle,
                    updatedAt: new Date().toISOString()
                  };
                } else {
                  articles.unshift({
                    ...updatedArticle,
                    updatedAt: new Date().toISOString()
                  });
                }
                fs.writeFileSync(localToolFile, JSON.stringify(articles, null, 2), 'utf8');

                let gitOutput = 'Đã cập nhật dữ liệu bài viết thành công.';
                let targetFileUpdated = false;

                // 2. If repoPath is provided, sync to that folder directly
                if (repoPath && fs.existsSync(repoPath)) {
                  // A. Update src/data/spintx_articles.json
                  const targetDir = path.join(repoPath, 'src', 'data');
                  if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                  }
                  const targetFilePath = path.join(targetDir, 'spintx_articles.json');
                  fs.writeFileSync(targetFilePath, JSON.stringify(articles, null, 2), 'utf8');
                  targetFileUpdated = true;

                  // B. Update FE/src/modules/resources/constants/ TypeScript files (SpintX structure)
                  const feConstantsDir = path.join(repoPath, 'FE', 'src', 'modules', 'resources', 'constants');
                  if (fs.existsSync(feConstantsDir)) {
                    const resTsPath = path.join(feConstantsDir, 'resources.constants.ts');
                    const resMetaTsPath = path.join(feConstantsDir, 'resources-meta.constants.ts');
                    fs.writeFileSync(resTsPath, generateResourcesConstantsTs(articles), 'utf8');
                    fs.writeFileSync(resMetaTsPath, generateResourcesMetaConstantsTs(articles), 'utf8');
                  }

                  // C. Also update website_spintx_vn-main if repoPath points elsewhere
                  const altMainDir = path.resolve('website_spintx_vn-main/FE/src/modules/resources/constants');
                  if (fs.existsSync(altMainDir) && altMainDir !== feConstantsDir) {
                    fs.writeFileSync(path.join(altMainDir, 'resources.constants.ts'), generateResourcesConstantsTs(articles), 'utf8');
                    fs.writeFileSync(path.join(altMainDir, 'resources-meta.constants.ts'), generateResourcesMetaConstantsTs(articles), 'utf8');
                  }

                  // D. Save individual markdown file for easy preview
                  const mdDir = path.join(repoPath, 'content', 'kien-thuc-van-hanh');
                  if (!fs.existsSync(mdDir)) {
                    fs.mkdirSync(mdDir, { recursive: true });
                  }
                  const safeSlug = (updatedArticle.slug || 'bai-viet').replace(/[^a-zA-Z0-9-_]/g, '');
                  const mdPath = path.join(mdDir, `${safeSlug}.md`);
                  const mdContent = `---\ntitle: "${updatedArticle.title}"\nslug: "${updatedArticle.slug}"\ncategory: "${updatedArticle.category || 'Vận hành'}"\nupdatedAt: "${new Date().toISOString()}"\n---\n\n${updatedArticle.contentHtml || ''}\n`;
                  fs.writeFileSync(mdPath, mdContent, 'utf8');

                  // 3. Run native local git commands if it's a git repo and runGitPush is requested
                  if (runGitPush && fs.existsSync(path.join(repoPath, '.git'))) {
                    const safeMsg = (commitMessage || `feat(seo): Cập nhật bài viết "${updatedArticle.title}"`).replace(/"/g, '\\"');
                    
                    if (gitUsername) {
                      try {
                        await execAsync(`git config user.name "${gitUsername}"`, { cwd: repoPath });
                        const userEmail = gitUsername.includes('@') ? gitUsername : `${gitUsername}@users.noreply.github.com`;
                        await execAsync(`git config user.email "${userEmail}"`, { cwd: repoPath });
                      } catch (e) {}
                    }

                    if (gitUsername && gitPassword) {
                      try {
                        const authUrl = `https://${encodeURIComponent(gitUsername)}:${encodeURIComponent(gitPassword)}@github.com/spintx-vn/website_spintx_vn.git`;
                        await execAsync(`git remote set-url origin "${authUrl}"`, { cwd: repoPath });
                      } catch (e) {}
                    }

                    let currentBranch = branch || 'main';
                    try {
                      const { stdout: brOut } = await execAsync('git branch --show-current', { cwd: repoPath });
                      if (brOut && brOut.trim()) currentBranch = brOut.trim();
                    } catch (e) {}

                    try {
                      await execAsync(`git checkout -B ${currentBranch}`, { cwd: repoPath });
                    } catch (e) {}

                    if (openTerminal) {
                      const batPath = path.join(repoPath, 'git_auto_commit_push.bat');
                      const batLines = [
                        '@echo off',
                        'chcp 65001 > nul',
                        'title SEOPulse Pro - Git Auto Commit and Push',
                        'color 0b',
                        'echo ==================================================================',
                        'echo   SEOPULSE PRO - TU DONG CHAY GIT COMMIT VA PUSH LEN GITHUB',
                        'echo ==================================================================',
                        'echo.',
                        'echo Thu muc repository: %~dp0',
                        `echo Nhanh Git: ${currentBranch}`,
                        `echo Tai khoan: ${gitUsername || 'ddtam2604work'}`,
                        'echo.',
                        'echo Step 1/3: Dang chuan bi tep tin git add...',
                        'git add .',
                        'echo.',
                        'echo Step 2/3: Dang commit ghi chu thay doi...',
                        `git commit -m "${safeMsg}"`,
                        'echo.',
                        `echo Step 3/3: Dang day len GitHub origin ${currentBranch}...`,
                        `git push -u origin ${currentBranch}`,
                        'echo.',
                        'echo Step 4/4: Tu dong kich hoat Webhook Deploy (http://113.171.85.234:6509/deploy/spintx)...',
                        `powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://113.171.85.234:6509/deploy/spintx'; Write-Host 'Deploy Result:' ($r | ConvertTo-Json -Compress) } catch { Write-Host 'Deploy Server Notice:' $_.Exception.Message }"`,
                        'echo.',
                        'echo ==================================================================',
                        'echo   HOAN TAT QUY TRINH GIT ^& DEPLOY!',
                        'echo   Ban co the dong cua so nay hoac nhan phim bat ky de thoat.',
                        'echo ==================================================================',
                        'pause'
                      ];
                      const batContent = batLines.join('\r\n') + '\r\n';
                      fs.writeFileSync(batPath, batContent, 'utf8');
                      exec(`start cmd /c "${batPath}"`, { cwd: repoPath });
                      gitOutput = 'Đã mở cửa sổ Terminal trên máy tính và tự động chạy Git commit & push!';
                    } else {
                      const gitCmd = `git add . && git commit -m "${safeMsg}" && git push -u origin ${currentBranch}`;
                      try {
                        const { stdout, stderr } = await execAsync(gitCmd, { cwd: repoPath });
                        gitOutput = stdout || stderr || 'Git commit & push hoàn tất.';
                      } catch (gitErr) {
                        gitOutput = gitErr.stdout || gitErr.stderr || gitErr.message;
                      }
                    }
                  }
                }

                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({
                  success: true,
                  message: 'Đã cập nhật bài viết thành công!',
                  gitOutput,
                  targetFileUpdated,
                  updatedAt: new Date().toISOString()
                }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          }
        });

        // POST /api/github/direct-push - Direct GitHub REST API (NO GIT CLI NEEDED)
        server.middlewares.use('/api/github/direct-push', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
              try {
                const { token, owner = 'spintx-vn', repo = 'website_spintx_vn', branch = 'main', commitMessage, updatedArticle } = JSON.parse(body);

                if (!token) {
                  throw new Error('Vui lòng nhập GitHub Personal Access Token (PAT) để đẩy trực tiếp không cần Git.');
                }

                // 1. Update local database file first
                const localToolFile = path.resolve('src/data/spintx_articles.json');
                const articles = JSON.parse(fs.readFileSync(localToolFile, 'utf8'));
                const idx = articles.findIndex(a => a.id === updatedArticle.id || a.slug === updatedArticle.slug);
                if (idx >= 0) {
                  articles[idx] = { ...articles[idx], ...updatedArticle, updatedAt: new Date().toISOString() };
                } else {
                  articles.unshift({ ...updatedArticle, updatedAt: new Date().toISOString() });
                }
                fs.writeFileSync(localToolFile, JSON.stringify(articles, null, 2), 'utf8');

                const msg = commitMessage || `feat(seo): Cập nhật bài viết "${updatedArticle.title}" qua SEOPulse Pro`;

                // 2. Commit all 3 critical files to GitHub via API:
                // A. FE/src/modules/resources/constants/resources.constants.ts
                const resTsContent = generateResourcesConstantsTs(articles);
                await pushFileToGitHub(token, owner, repo, branch, 'FE/src/modules/resources/constants/resources.constants.ts', resTsContent, msg);

                // B. FE/src/modules/resources/constants/resources-meta.constants.ts
                const resMetaTsContent = generateResourcesMetaConstantsTs(articles);
                await pushFileToGitHub(token, owner, repo, branch, 'FE/src/modules/resources/constants/resources-meta.constants.ts', resMetaTsContent, msg);

                // C. src/data/spintx_articles.json
                const jsonContent = JSON.stringify(articles, null, 2);
                const commitResult = await pushFileToGitHub(token, owner, repo, branch, 'src/data/spintx_articles.json', jsonContent, msg);

                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({
                  success: true,
                  message: `Đã đẩy bài viết thành công lên GitHub (${owner}/${repo}@${branch}) theo chuẩn SpintX!`,
                  commitUrl: commitResult.commit?.html_url || `https://github.com/${owner}/${repo}/commits/${branch}`,
                  updatedAt: new Date().toISOString()
                }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          }
        });
      }
    }
  ]
});

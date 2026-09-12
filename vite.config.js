import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export default defineConfig({
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
              res.end(data);
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
                  // Ensure directory src/data exists
                  const targetDir = path.join(repoPath, 'src', 'data');
                  if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                  }
                  const targetFilePath = path.join(targetDir, 'spintx_articles.json');
                  fs.writeFileSync(targetFilePath, JSON.stringify(articles, null, 2), 'utf8');
                  targetFileUpdated = true;

                  // Also save individual markdown file for easy PR / preview
                  const mdDir = path.join(repoPath, 'content', 'kien-thuc-van-hanh');
                  if (!fs.existsSync(mdDir)) {
                    fs.mkdirSync(mdDir, { recursive: true });
                  }
                  const safeSlug = (updatedArticle.slug || 'bai-viet').replace(/[^a-zA-Z0-9-_]/g, '');
                  const mdPath = path.join(mdDir, `${safeSlug}.md`);
                  const mdContent = `---
title: "${updatedArticle.title}"
slug: "${updatedArticle.slug}"
category: "${updatedArticle.category || 'Vận hành'}"
updatedAt: "${new Date().toISOString()}"
---

${updatedArticle.contentHtml || ''}
`;
                  fs.writeFileSync(mdPath, mdContent, 'utf8');

                  // 3. Run native local git commands if it's a git repo and runGitPush is requested
                  if (runGitPush && fs.existsSync(path.join(repoPath, '.git'))) {
                    const safeMsg = (commitMessage || `feat(seo): Cập nhật bài viết "${updatedArticle.title}"`).replace(/"/g, '\\"');
                    
                    // Configure user.name and user.email if provided
                    if (gitUsername) {
                      try {
                        await execAsync(`git config user.name "${gitUsername}"`, { cwd: repoPath });
                        const userEmail = gitUsername.includes('@') ? gitUsername : `${gitUsername}@users.noreply.github.com`;
                        await execAsync(`git config user.email "${userEmail}"`, { cwd: repoPath });
                      } catch (e) {}
                    }

                    // Configure authenticated remote origin if username & password/token provided
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

                    // Ensure branch exists locally
                    try {
                      await execAsync(`git checkout -B ${currentBranch}`, { cwd: repoPath });
                    } catch (e) {}

                    if (openTerminal) {
                      // Launch visual Terminal / CMD window
                      const batPath = path.join(repoPath, 'git_auto_commit_push.bat');
                      const batContent = `@echo off
chcp 65001 > nul
title SEOPulse Pro - Git Auto Commit ^& Push
color 0b
echo ==================================================================
echo   SEOPULSE PRO: TU DONG CHAY GIT COMMIT VA PUSH LEN GITHUB
echo ==================================================================
echo.
echo Thu muc: %~dp0
echo Nhanh: ${currentBranch}
echo Tai khoan: ${gitUsername || '(Cau hinh may tinh)'}
echo.
echo [1/3] Dang chuan bi tep tin (git add .)...
git add .
echo.
echo [2/3] Dang commit ghi chu thay doi...
git commit -m "${safeMsg}"
echo.
echo [3/3] Dang day len GitHub (git push -u origin ${currentBranch})...
git push -u origin ${currentBranch}
echo.
echo ==================================================================
echo   HOAN TAT QUY TRINH GIT!
echo   Ban co the dong cua so nay hoac nhan phim bat ky de thoat.
echo ==================================================================
pause
`;
                      fs.writeFileSync(batPath, batContent, 'utf8');
                      exec(`start cmd /c "${batPath}"`, { cwd: repoPath });
                      gitOutput = 'Đã mở cửa sổ Terminal trên máy tính và tự động chạy Git commit & push!';
                    } else {
                      // Silent background execution
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

                // 2. Fetch existing file SHA from GitHub
                const filePath = 'src/data/spintx_articles.json';
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
                  } else if (getRes.status === 401 || getRes.status === 403) {
                    throw new Error('Token không có quyền ghi hoặc đã hết hạn. Hãy kiểm tra quyền "repo" của Token.');
                  }
                } catch (fetchErr) {
                  if (fetchErr.message.includes('Token')) throw fetchErr;
                  // If 404 file not found yet, sha remains null
                }

                // 3. Commit updated file to GitHub via PUT /contents/
                const updatedContentBase64 = Buffer.from(JSON.stringify(articles, null, 2), 'utf8').toString('base64');
                const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'SEOPulse-Pro-App'
                  },
                  body: JSON.stringify({
                    message: commitMessage || `feat(seo): Cập nhật bài viết "${updatedArticle.title}" qua SEOPulse Pro`,
                    content: updatedContentBase64,
                    branch,
                    ...(sha ? { sha } : {})
                  })
                });

                if (!putRes.ok) {
                  const errJson = await putRes.json().catch(() => ({}));
                  throw new Error(errJson.message || `Lỗi đẩy file lên GitHub (HTTP ${putRes.status})`);
                }

                const commitResult = await putRes.json();

                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({
                  success: true,
                  message: `Đã đẩy bài viết thành công lên GitHub (${owner}/${repo}@${branch})!`,
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

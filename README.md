# wu5 — 吾五

个人主页 + 原创艺术资产。这个仓库现在只保留两样东西：

| 路径 | 内容 |
| --- | --- |
| `new-site/` | 线上单页站的源码（`index.html` + `assets/` 里的插图） |
| `asset/` | 原创艺术资产源文件（PNG 原画：`entrance/`、`gallery/`） |

`new-site/index.html` 是自包含的（内联 CSS，无构建步骤），唯一的本地引用是
`assets/hero-person-cat.png`。

## 线上部署

线上由 **`gh-pages` 分支**提供（GitHub Pages → https://wenowen.github.io/），
该分支内容 = `new-site/` 的全部文件 + `.nojekyll`。

`new-site/` 是唯一源文件，改完后同步到 `gh-pages` 即可上线：

```bash
git worktree add -B gh-pages .deploy-gh-pages origin/gh-pages
cp new-site/index.html .deploy-gh-pages/index.html
cd .deploy-gh-pages
git add -A && git commit -m "update site" && git push origin gh-pages
cd .. && git worktree remove .deploy-gh-pages
```

## 旧版 3D 作品集

之前的 React Three Fiber「手绘 3D 走廊」作品集已下线，完整代码（406 个文件：源码、
纹理生成脚本、全部素材）保存在标签 **`archive/3d-portfolio`**：

```bash
git checkout archive/3d-portfolio
```

`LICENSE` 与 `CREDITS.md` 保留下来，用于说明该归档（以及 git 历史）中上游 MIT
代码与素材的版权边界。
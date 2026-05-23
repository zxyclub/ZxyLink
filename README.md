# ZxyLink - 私人导航页

基于 GitHub Gist 的私人导航页，支持公开链接和私密链接。

## 功能特性

- 使用 GitHub Gist 存储数据，无需数据库
- 公开链接和私密链接分开管理
- 私密链接通过 Token 动态查找，无需暴露 Gist ID
- 分类导航功能（主页、管理页、私密页均支持）
- 搜索功能，支持精准搜索链接名称
- 移动端适配
- 部署简单，支持 GitHub Pages、Vercel、Cloudflare 等

## 文件结构

```
ZxyLink/
├── index.html          # 主页 - 显示所有公开链接
├── admin.html          # 管理后台 - 管理链接，配置Token
├── private.html         # 私密页面 - 输入Token查看私密链接
│
├── css/
│   ├── style.css       # 全局共享样式
│   ├── index.css       # 主页专有样式
│   ├── admin.css       # 管理后台专有样式
│   └── private.css     # 私密页面专有样式
│
├── js/
│   ├── index.js        # 主页逻辑
│   ├── admin.js        # 管理后台逻辑
│   └── private.js      # 私密页面逻辑
│
└── img/
    └── avatar1.jpg     # 头像图片（需自行放置）
```

## 链接数据格式

```json
{
  "icon": "🌐",
  "title": "百度",
  "url": "https://baidu.com",
  "group": "工具"
}
```

| 字段 | 说明 | 必填 |
|------|------|------|
| icon | 表情图标 | 否，默认🌐 |
| title | 网站名称 | 是 |
| url | 网址（建议带https://，会自动补全） | 是 |
| group | 分组名称，用于分类导航 | 否 |

## 页面说明

### index.html（主页）
- 展示所有公开链接
- 右上角：头像 + 调试按钮 + 管理按钮
- 分类导航：根据链接的 group 字段自动生成分组按钮
- 点击分类按钮可筛选显示

### admin.html（管理后台）
- 需要输入 GitHub Token 才能编辑
- 两个标签页：公开链接 / 私密链接
- 支持添加、编辑、删除链接
- URL 自动补全 https:// 前缀

### private.html（私密页面）
- 输入 Token 后访问私密数据
- 自动查找用户包含 `zxylink-private.json` 的私密 Gist
- 分类导航同主页

## Token 配置

### 需要什么权限？
生成 GitHub Personal Access Token 时，仅需勾选 `gist` 权限即可。

### Token 用途
| 操作 | 是否需要Token |
|------|--------------|
| 读取公开链接 | 否 |
| 写入公开链接 | 是 |
| 读取私密链接 | 是 |
| 创建私密Gist | 是 |

## API 说明

### 读取公开链接（无需Token）
```
GET https://gist.githubusercontent.com/zxyclub/d12a422a770678dcbb46b8f8050ad2c6/raw/zxylinks.json
```

### 私密链接操作（需要Token）
```
GET  https://api.github.com/gists              # 列出用户所有Gist
GET  https://api.github.com/gists/{id}        # 获取单个Gist详情
POST https://api.github.com/gists              # 创建新Gist（首次保存私密链接时）
PATCH https://api.github.com/gists/{id}        # 更新Gist
```

## 安全特性

1. **私密 Gist ID 不暴露** - 通过文件名查找，代码中只有 `zxylink-private.json`
2. **Token 本地存储** - 不上传到任何服务器
3. **私密页面伪装** - 标题和描述都伪装成"调试页面"

## 部署说明

### GitHub Pages
1. 将文件推送到 GitHub 仓库
2. 进入仓库 Settings → Pages
3. 选择 branch 和目录
4. 访问 `{username}.github.io/{repo}`

### Vercel
1. 将文件推送到 GitHub 仓库
2. 在 Vercel 导入该仓库
3. 部署完成

### Cloudflare Pages
1. 将文件推送到 GitHub 仓库
2. 在 Cloudflare Pages 导入该仓库
3. 部署完成

## 自定义头像

1. 将头像图片放入 `img/` 目录，命名为 `avatar1.jpg`
2. 或修改各 HTML 文件中的头像路径

## 修改指南

| 修改内容 | 修改文件 |
|----------|----------|
| 整体样式 | css/style.css |
| 主页样式 | css/index.css |
| 管理后台样式 | css/admin.css |
| 私密页面样式 | css/private.css |
| 主页逻辑 | js/index.js |
| 管理后台逻辑 | js/admin.js |
| 私密页面逻辑 | js/private.js |
| 页面结构 | index.html / admin.html / private.html |

## 注意事项

- 私密链接依赖用户的 GitHub Token 来查找和访问
- 如果私密 Gist 不存在，管理后台会自动创建一个
- 公开 Gist ID `d12a422a770678dcbb46b8f8050ad2c6` 是固定的，不可更改
- 请妥善保管 Token，不要泄露给他人

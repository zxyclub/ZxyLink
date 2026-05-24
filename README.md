# ZxyLink - 私人导航页

基于 GitHub Gist 的私人导航页，无数据库，轻量易部署。

## 特性

- 使用 GitHub Gist 存储链接数据，无需服务器
- 支持公开链接和私密链接分离
- 分类导航 + 精准搜索
- 一键导出链接数据
- 移动端适配
- 支持 GitHub Pages、Vercel、Cloudflare 等静态部署

## 页面

| 页面 | 说明 |
|------|------|
| [index.html](index.html) | 主页，展示所有公开链接 |
| [admin.html](admin.html) | 管理后台，配置 Token，添加/编辑/删除链接 |
| [private.html](private.html) | 私密页面，输入 Token 查看私密链接 |

## 快速开始

### 1. 配置公开链接

编辑 `zxylinks.json` 文件，或在管理后台添加链接：

```json
[
  {
    "icon": "📧",
    "title": "Gmail",
    "url": "https://gmail.com",
    "group": "邮箱"
  },
  {
    "icon": "🌐",
    "title": "百度",
    "url": "https://baidu.com",
    "group": "搜索"
  }
]
```

**链接字段说明：**

| 字段 | 说明 | 必填 |
|------|------|------|
| icon | 表情图标，默认 🌐 | 否 |
| title | 网站名称 | 是 |
| url | 网址（建议带 https://） | 是 |
| group | 分组名称 | 否 |

### 2. 部署

**GitHub Pages：**
1. 推送文件到 GitHub 仓库
2. 进入 Settings → Pages
3. 选择 branch 和目录
4. 访问 `{username}.github.io/{repo}`

**Vercel / Cloudflare：**
直接导入仓库即可。

## 私密链接

1. 打开私密页面 [private.html](private.html)
2. 输入 GitHub Personal Access Token
3. 系统自动查找包含 `zxylink-private.json` 的私密 Gist
4. 如果不存在，管理后台会自动创建一个

### Token 权限

仅需勾选 `gist` 权限即可。

| 操作 | 需要 Token |
|------|-----------|
| 读取公开链接 | 否 |
| 写入公开链接 | 是 |
| 读取私密链接 | 是 |
| 创建私密 Gist | 是 |

## 文件结构

```
ZxyLink/
├── index.html          # 主页
├── admin.html          # 管理后台
├── private.html        # 私密页面
├── zxylinks.json       # 公开链接数据
│
├── css/
│   ├── style.css       # 全局样式
│   ├── index.css       # 主页样式
│   ├── admin.css       # 管理后台样式
│   └── private.css      # 私密页面样式
│
├── js/
│   ├── index.js        # 主页逻辑
│   ├── admin.js        # 管理后台逻辑
│   └── private.js       # 私密页面逻辑
│
└── img/
    └── avatar1.jpg     # 头像图片
```

## 自定义

| 修改内容 | 文件 |
|----------|------|
| 全局样式 | css/style.css |
| 主页样式 | css/index.css |
| 管理后台样式 | css/admin.css |
| 私密页面样式 | css/private.css |
| 页面结构 | index.html / admin.html / private.html |

## 注意

- Token 仅存储在本地浏览器，不会上传到任何服务器
- 公开 Gist ID 为固定值 `d12a422a770678dcbb46b8f8050ad2c6`
- 请妥善保管 Token，不要泄露

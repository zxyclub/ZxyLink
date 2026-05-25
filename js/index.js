// ==================== GIST 配置 ====================
// 修改这里可以换成自己的 Gist ID
const GIST_ID = 'd12a422a770678dcbb46b8f8050ad2c6';
// 修改这里可以换成自己的 GitHub 用户名
const GIST_OWNER = 'zxyclub';
// ===================================================
const TOKEN_KEY = 'github_token';
let allLinks = [];
let currentGroup = 'all';
let searchKeyword = '';

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchKeyword = searchInput.value.trim().toLowerCase();
            renderLinks();
        }
    });

    searchBtn.addEventListener('click', () => {
        searchKeyword = searchInput.value.trim().toLowerCase();
        renderLinks();
    });
}

async function loadLinks() {
    const container = document.getElementById('linksGrid');

    try {
        const response = await fetch(`https://gist.githubusercontent.com/${GIST_OWNER}/${GIST_ID}/raw/zxylinks.json?t=${Date.now()}`);

        if (!response.ok) {
            throw new Error('获取数据失败');
        }

        allLinks = await response.json();

        if (!Array.isArray(allLinks) || allLinks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>📝 暂无链接</p>
                    <a href="admin.html" class="setup-btn">添加链接</a>
                </div>
            `;
            return;
        }

        renderCategories();
        renderLinks();
    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="empty-state">
                <p>❌ 加载失败</p>
                <span class="error-hint">请检查网络连接</span>
            </div>
        `;
    }
}

function renderCategories() {
    const nav = document.getElementById('categoryNav');
    const groups = [...new Set(allLinks.map(link => link.group).filter(Boolean))];
    const hasUngrouped = allLinks.some(link => !link.group);

    const isAllActive = currentGroup === 'all' ? 'active' : '';
    let html = `<button class="category-btn ${isAllActive}" data-group="all">全部</button>`;

    if (hasUngrouped) {
        const isUngroupedActive = currentGroup === 'ungrouped' ? 'active' : '';
        html += `<button class="category-btn ${isUngroupedActive}" data-group="ungrouped">未分组</button>`;
    }

    groups.forEach(group => {
        const isActive = group === currentGroup ? 'active' : '';
        html += `<button class="category-btn ${isActive}" data-group="${group}">${group}</button>`;
    });
    nav.innerHTML = html;

    nav.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGroup = btn.dataset.group;
            renderLinks();
        });
    });
}

function renderLinks() {
    const container = document.getElementById('linksGrid');
    let filteredLinks;
    if (currentGroup === 'all') {
        filteredLinks = allLinks;
    } else if (currentGroup === 'ungrouped') {
        filteredLinks = allLinks.filter(link => !link.group);
    } else {
        filteredLinks = allLinks.filter(link => link.group === currentGroup);
    }

    if (searchKeyword) {
        filteredLinks = filteredLinks.filter(link =>
            link.title.toLowerCase().includes(searchKeyword)
        );
    }

    if (filteredLinks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>📂 ${searchKeyword ? '未找到匹配的链接' : '该分组暂无链接'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredLinks.map(link => `
        <a href="${link.url}" class="link-card" target="_blank">
            <div class="card-icon">${link.icon || '🌐'}</div>
            <div class="card-content">
                <h3>${link.title}</h3>
            </div>
        </a>
    `).join('');
}

function loadAvatar() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        fetch('https://api.github.com/user', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json'
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data.avatar_url) {
                    document.getElementById('avatar').src = data.avatar_url;
                }
            })
            .catch(err => console.log('获取头像失败', err));
    }
}

function exportLinks() {
    if (allLinks.length === 0) {
        alert('暂无链接可导出');
        return;
    }
    document.getElementById('exportModal').classList.add('show');
}

function doExportLinks() {
    const blob = new Blob([JSON.stringify(allLinks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zxylinks.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    document.getElementById('exportModal').classList.remove('show');
}

function closeExportModal() {
    document.getElementById('exportModal').classList.remove('show');
}

loadLinks();
initSearch();

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('exportBtn').addEventListener('click', exportLinks);
    document.getElementById('modalCancel').addEventListener('click', closeExportModal);
    document.getElementById('modalConfirm').addEventListener('click', doExportLinks);
    document.getElementById('exportModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('exportModal')) {
            closeExportModal();
        }
    });
});

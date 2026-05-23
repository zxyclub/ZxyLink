const GIST_ID = 'd12a422a770678dcbb46b8f8050ad2c6';
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
        const response = await fetch(`https://gist.githubusercontent.com/zxyclub/${GIST_ID}/raw/zxylinks.json?t=${Date.now()}`);

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

    let html = '<button class="category-btn active" data-group="all">全部</button>';
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
    let filteredLinks = currentGroup === 'all'
        ? allLinks
        : allLinks.filter(link => link.group === currentGroup);

    if (searchKeyword) {
        filteredLinks = filteredLinks.filter(link =>
            link.title.toLowerCase().includes(searchKeyword) ||
            link.url.toLowerCase().includes(searchKeyword) ||
            (link.group && link.group.toLowerCase().includes(searchKeyword))
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

loadLinks();
initSearch();

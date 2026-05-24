const PRIVATE_FILENAME = 'zxylink-private.json';
const TOKEN_STORAGE_KEY = 'zxylink_private_token';
let allPrivateLinks = [];
let currentPrivateGroup = 'all';
let privateSearchKeyword = '';

function showError(msg) {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    document.getElementById('successMsg').style.display = 'none';
}

function showSuccess(msg) {
    const successMsg = document.getElementById('successMsg');
    successMsg.textContent = msg;
    successMsg.style.display = 'block';
    document.getElementById('errorMsg').style.display = 'none';
}

function renderCategories(links) {
    const nav = document.getElementById('privateCategoryNav');
    const groups = [...new Set(links.map(link => link.group).filter(Boolean))];
    const hasUngrouped = links.some(link => !link.group);

    const isAllActive = currentPrivateGroup === 'all' ? 'active' : '';
    let html = `<button class="category-btn ${isAllActive}" data-group="all">全部</button>`;

    if (hasUngrouped) {
        const isUngroupedActive = currentPrivateGroup === 'ungrouped' ? 'active' : '';
        html += `<button class="category-btn ${isUngroupedActive}" data-group="ungrouped">未分组</button>`;
    }

    groups.forEach(group => {
        const isActive = group === currentPrivateGroup ? 'active' : '';
        html += `<button class="category-btn ${isActive}" data-group="${group}">${group}</button>`;
    });
    nav.innerHTML = html;

    nav.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#privateCategoryNav .category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPrivateGroup = btn.dataset.group;
            renderLinks(links);
        });
    });
}

function renderLinks(links) {
    const container = document.getElementById('privateLinksGrid');

    if (!Array.isArray(links) || links.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>📝 暂无私密链接</p>
            </div>
        `;
        return;
    }

    let filteredLinks;
    if (currentPrivateGroup === 'all') {
        filteredLinks = links;
    } else if (currentPrivateGroup === 'ungrouped') {
        filteredLinks = links.filter(link => !link.group);
    } else {
        filteredLinks = links.filter(link => link.group === currentPrivateGroup);
    }

    if (privateSearchKeyword) {
        filteredLinks = filteredLinks.filter(link =>
            link.title.toLowerCase().includes(privateSearchKeyword)
        );
    }

    if (filteredLinks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>📂 ${privateSearchKeyword ? '未找到匹配的链接' : '该分组暂无链接'}</p>
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

async function loadPrivateLinks(token) {
    try {
        // 获取用户所有 Gist
        const response = await fetch('https://api.github.com/gists', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json'
            }
        });

        if (!response.ok) {
            throw new Error('Token 无效或权限不足');
        }

        const gists = await response.json();

        // 查找包含目标文件的 Gist
        let targetGistId = null;
        for (const gist of gists) {
            if (gist.files && gist.files[PRIVATE_FILENAME]) {
                targetGistId = gist.id;
                break;
            }
        }

        if (!targetGistId) {
            throw new Error(`未找到包含 ${PRIVATE_FILENAME} 的 Gist`);
        }

        // 获取完整的 Gist 内容（包含文件内容）
        const gistResponse = await fetch(`https://api.github.com/gists/${targetGistId}`, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json'
            }
        });

        if (!gistResponse.ok) {
            throw new Error('获取 Gist 内容失败');
        }

        const targetGist = await gistResponse.json();
        const privateFile = targetGist.files ? targetGist.files[PRIVATE_FILENAME] : null;
        if (!privateFile) {
            throw new Error(`未找到 ${PRIVATE_FILENAME} 文件`);
        }
        const fileContent = privateFile.content;
        if (!fileContent || fileContent.trim() === '') {
            throw new Error('私密文件内容为空，请在管理后台添加私密链接');
        }
        const links = JSON.parse(fileContent);

        // 显示内容区域，隐藏登录区域
        document.getElementById('loginArea').style.display = 'none';
        document.getElementById('linksArea').style.display = 'block';

        allPrivateLinks = links;
        renderCategories(links);
        renderLinks(links);
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        showSuccess('访问成功！');

    } catch (error) {
        console.error(error);
        showError(error.message);
    }
}

function accessPrivate() {
    const token = document.getElementById('privateToken').value.trim();

    if (!token) {
        showError('请输入 Token');
        return;
    }

    loadPrivateLinks(token);
}

// 页面加载时检查是否有保存的 Token
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
        document.getElementById('privateToken').value = savedToken;
        loadPrivateLinks(savedToken);
    }
});

// 按下回车访问
document.getElementById('privateToken').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        accessPrivate();
    }
});

function initPrivateSearch() {
    const searchInput = document.getElementById('privateSearchInput');
    const searchBtn = document.getElementById('privateSearchBtn');

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            privateSearchKeyword = searchInput.value.trim().toLowerCase();
            renderLinks(allPrivateLinks);
        }
    });

    searchBtn.addEventListener('click', () => {
        privateSearchKeyword = searchInput.value.trim().toLowerCase();
        renderLinks(allPrivateLinks);
    });
}

function exportPrivateLinks() {
    if (allPrivateLinks.length === 0) {
        alert('暂无链接可导出');
        return;
    }
    document.getElementById('privateExportModal').classList.add('show');
}

function doExportPrivateLinks() {
    const blob = new Blob([JSON.stringify(allPrivateLinks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zxylink-private.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    document.getElementById('privateExportModal').classList.remove('show');
}

function closePrivateExportModal() {
    document.getElementById('privateExportModal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('privateExportBtn').addEventListener('click', exportPrivateLinks);
    document.getElementById('privateModalCancel').addEventListener('click', closePrivateExportModal);
    document.getElementById('privateModalConfirm').addEventListener('click', doExportPrivateLinks);
    document.getElementById('privateExportModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('privateExportModal')) {
            closePrivateExportModal();
        }
    });
});

initPrivateSearch();

const PUBLIC_GIST_ID = 'd12a422a770678dcbb46b8f8050ad2c6';
const PUBLIC_FILENAME = 'zxylinks.json';
const PRIVATE_FILENAME = 'zxylink-private.json';
const TOKEN_KEY = 'github_token';

let currentTab = 'public';
let publicLinks = [];
let privateLinks = [];
let privateGistId = null;
let publicCurrentGroup = 'all';
let privateCurrentGroup = 'all';
let publicSearchKeyword = '';
let privateSearchKeyword = '';

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function saveToken() {
    const token = document.getElementById('githubToken').value.trim();
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        showToast('Token 已保存！');
        toggleEditMode(true);
        if (currentTab === 'private') {
            loadPrivateLinks(token);
        }
    } else {
        localStorage.removeItem(TOKEN_KEY);
        showToast('请输入 Token', true);
        toggleEditMode(false);
    }
}

function toggleEditMode(hasToken) {
    const editSection = document.getElementById('editSection');
    const linksList = document.getElementById('linksList');
    const noTokenMsg = document.getElementById('noTokenMsg');

    if (hasToken) {
        editSection.classList.remove('hidden');
        noTokenMsg.classList.add('hidden');
        linksList.classList.remove('hidden');
    } else {
        editSection.classList.add('hidden');
        if (publicLinks.length === 0) {
            noTokenMsg.classList.remove('hidden');
            linksList.classList.add('hidden');
        }
    }

    const privateEditSection = document.getElementById('privateEditSection');
    const privateLinksList = document.getElementById('privateLinksList');
    const privateNoTokenMsg = document.getElementById('privateNoTokenMsg');

    if (hasToken) {
        privateEditSection.classList.remove('hidden');
        privateNoTokenMsg.classList.add('hidden');
        privateLinksList.classList.remove('hidden');
    } else {
        privateEditSection.classList.add('hidden');
        if (privateLinks.length === 0) {
            privateNoTokenMsg.classList.remove('hidden');
            privateLinksList.classList.add('hidden');
        }
    }

    renderPublicLinks();
    renderPrivateLinks();
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'public') {
        document.getElementById('publicSection').classList.remove('hidden');
        document.getElementById('privateSection').classList.add('hidden');
    } else {
        document.getElementById('publicSection').classList.add('hidden');
        document.getElementById('privateSection').classList.remove('hidden');
        const token = getToken();
        if (token && privateLinks.length === 0) {
            loadPrivateLinks(token);
        }
    }
}

function renderCategoryButtons(links, inputId) {
    const container = document.getElementById(inputId + 'Categories');
    const groups = [...new Set(links.map(link => link.group).filter(Boolean))];

    if (groups.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = groups.map(group =>
        `<button type="button" class="category-quick-btn" onclick="fillGroup('${inputId}', '${group}')">${group}</button>`
    ).join('');
}

window.fillGroup = function(inputId, group) {
    document.getElementById(inputId).value = group;
};

function renderPublicCategories() {
    const nav = document.getElementById('publicCategoryNav');
    const groups = [...new Set(publicLinks.map(link => link.group).filter(Boolean))];

    const isAllActive = publicCurrentGroup === 'all' ? 'active' : '';
    let html = `<button class="category-btn ${isAllActive}" data-group="all">全部</button>`;
    groups.forEach(group => {
        const isActive = group === publicCurrentGroup ? 'active' : '';
        html += `<button class="category-btn ${isActive}" data-group="${group}">${group}</button>`;
    });
    nav.innerHTML = html;

    nav.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#publicCategoryNav .category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            publicCurrentGroup = btn.dataset.group;
            renderPublicLinks();
        });
    });
}

function renderPrivateCategories() {
    const nav = document.getElementById('privateCategoryNav');
    const groups = [...new Set(privateLinks.map(link => link.group).filter(Boolean))];

    const isAllActive = privateCurrentGroup === 'all' ? 'active' : '';
    let html = `<button class="category-btn ${isAllActive}" data-group="all">全部</button>`;
    groups.forEach(group => {
        const isActive = group === privateCurrentGroup ? 'active' : '';
        html += `<button class="category-btn ${isActive}" data-group="${group}">${group}</button>`;
    });
    nav.innerHTML = html;

    nav.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#privateCategoryNav .category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            privateCurrentGroup = btn.dataset.group;
            renderPrivateLinks();
        });
    });
}

function loadToken() {
    const token = getToken();
    if (token) {
        document.getElementById('githubToken').value = token;
    }
    toggleEditMode(!!token);
    renderPublicCategories();
    renderPrivateCategories();
}

async function fetchPublicLinks() {
    try {
        const response = await fetch(`https://gist.githubusercontent.com/zxyclub/${PUBLIC_GIST_ID}/raw/${PUBLIC_FILENAME}?t=${Date.now()}`);
        if (!response.ok) throw new Error('获取数据失败');
        publicLinks = await response.json();
        if (!Array.isArray(publicLinks)) publicLinks = [];
        renderPublicLinks();
    } catch (error) {
        showToast('加载公开数据失败', true);
        console.error(error);
    }
}

async function loadPrivateLinks(token) {
    try {
        const response = await fetch('https://api.github.com/gists', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json'
            }
        });

        if (!response.ok) throw new Error('Token 无效或权限不足');

        const gists = await response.json();
        let targetGistId = null;
        for (const gist of gists) {
            if (gist.files && gist.files[PRIVATE_FILENAME]) {
                targetGistId = gist.id;
                break;
            }
        }

        if (targetGistId) {
            const gistResponse = await fetch(`https://api.github.com/gists/${targetGistId}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/vnd.github+json'
                }
            });

            if (gistResponse.ok) {
                const targetGist = await gistResponse.json();
                privateGistId = targetGistId;

                const privateFile = targetGist.files ? targetGist.files[PRIVATE_FILENAME] : null;
                if (privateFile && privateFile.content && privateFile.content.trim() !== '') {
                    privateLinks = JSON.parse(privateFile.content);
                    if (!Array.isArray(privateLinks)) privateLinks = [];
                } else {
                    privateLinks = [];
                }
            } else {
                privateLinks = [];
            }
        } else {
            privateLinks = [];
        }
        renderPrivateLinks();
    } catch (error) {
        showToast('加载私密数据失败: ' + error.message, true);
        console.error(error);
    }
}

async function savePublicLinks() {
    const token = getToken();
    if (!token) {
        showToast('请先配置 Token', true);
        return;
    }

    try {
        const response = await fetch(`https://api.github.com/gists/${PUBLIC_GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github+json'
            },
            body: JSON.stringify({
                files: {
                    [PUBLIC_FILENAME]: {
                        content: JSON.stringify(publicLinks, null, 2)
                    }
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || '保存失败');
        }

        showToast('保存成功！');
    } catch (error) {
        showToast('保存失败: ' + error.message, true);
        console.error(error);
    }
}

async function savePrivateLinks() {
    const token = getToken();
    if (!token) {
        showToast('请先配置 Token', true);
        return;
    }

    try {
        if (privateGistId) {
            const response = await fetch(`https://api.github.com/gists/${privateGistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github+json'
                },
                body: JSON.stringify({
                    files: {
                        [PRIVATE_FILENAME]: {
                            content: JSON.stringify(privateLinks, null, 2)
                        }
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || '保存失败');
            }
        } else {
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github+json'
                },
                body: JSON.stringify({
                    description: 'ZxyLink Private Links',
                    public: false,
                    files: {
                        [PRIVATE_FILENAME]: {
                            content: JSON.stringify(privateLinks, null, 2)
                        }
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || '创建失败');
            }

            const newGist = await response.json();
            privateGistId = newGist.id;
        }

        showToast('保存成功！');
    } catch (error) {
        showToast('保存失败: ' + error.message, true);
        console.error(error);
    }
}

function renderPublicLinks() {
    const container = document.getElementById('linksList');
    const hasToken = getToken();

    let filteredLinks = publicCurrentGroup === 'all'
        ? publicLinks
        : publicLinks.filter(link => link.group === publicCurrentGroup);

    if (publicSearchKeyword) {
        filteredLinks = filteredLinks.filter(link =>
            link.title.toLowerCase().includes(publicSearchKeyword)
        );
    }

    if (filteredLinks.length === 0) {
        container.innerHTML = publicCurrentGroup === 'all' && !publicSearchKeyword
            ? (hasToken ? '<p class="empty-msg">暂无链接，请添加</p>' : '')
            : '<p class="empty-msg">未找到匹配的链接</p>';
        renderPublicCategories();
        return;
    }

    container.innerHTML = filteredLinks.map((link, idx) => {
        const originalIndex = publicLinks.indexOf(link);
        return `
            <div class="link-item" data-index="${originalIndex}">
                <div class="icon-box">${link.icon}</div>
                <div class="content-box">
                    <div class="info-row">
                        <div>
                            <div class="title">${link.title}</div>
                            <div class="group">${link.group || ''}</div>
                        </div>
                        ${hasToken ? `
                        <div class="actions">
                            <button class="btn-edit" onclick="editPublicLink(${originalIndex})">编辑</button>
                            <button class="btn-delete" onclick="deletePublicLink(${originalIndex})">删除</button>
                        </div>
                        ` : ''}
                    </div>
                    <div class="url-row">
                        <span class="url">${link.url}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    renderCategoryButtons(publicLinks, 'newGroup');
    renderPublicCategories();
}

function renderPrivateLinks() {
    const container = document.getElementById('privateLinksList');
    const hasToken = getToken();

    let filteredLinks = privateCurrentGroup === 'all'
        ? privateLinks
        : privateLinks.filter(link => link.group === privateCurrentGroup);

    if (privateSearchKeyword) {
        filteredLinks = filteredLinks.filter(link =>
            link.title.toLowerCase().includes(privateSearchKeyword)
        );
    }

    if (filteredLinks.length === 0) {
        container.innerHTML = privateCurrentGroup === 'all' && !privateSearchKeyword
            ? (hasToken ? '<p class="empty-msg">暂无私密链接，请添加</p>' : '')
            : '<p class="empty-msg">未找到匹配的链接</p>';
        renderPrivateCategories();
        return;
    }

    container.innerHTML = filteredLinks.map((link, idx) => {
        const originalIndex = privateLinks.indexOf(link);
        return `
            <div class="link-item" data-index="${originalIndex}">
                <div class="icon-box">${link.icon}</div>
                <div class="content-box">
                    <div class="info-row">
                        <div>
                            <div class="title">${link.title}</div>
                            <div class="group">${link.group || ''}</div>
                        </div>
                        ${hasToken ? `
                        <div class="actions">
                            <button class="btn-edit" onclick="editPrivateLink(${originalIndex})">编辑</button>
                            <button class="btn-delete" onclick="deletePrivateLink(${originalIndex})">删除</button>
                        </div>
                        ` : ''}
                    </div>
                    <div class="url-row">
                        <span class="url">${link.url}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    renderCategoryButtons(privateLinks, 'newPrivateGroup');
    renderPrivateCategories();
}

function formatUrl(url) {
    if (!url) return '';
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }
    return url;
}

document.getElementById('addForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const newLink = {
        icon: document.getElementById('newIcon').value || '🌐',
        title: document.getElementById('newTitle').value,
        url: formatUrl(document.getElementById('newUrl').value),
        group: document.getElementById('newGroup').value
    };

    publicLinks.push(newLink);
    await savePublicLinks();
    renderPublicLinks();

    document.getElementById('addForm').reset();
    document.getElementById('newIcon').value = '🌐';
});

window.editPublicLink = function (index) {
    const link = publicLinks[index];
    const item = document.querySelector(`#publicSection [data-index="${index}"]`);

    item.className = 'link-item';
    item.innerHTML = `
        <div class="edit-item">
            <div class="edit-row">
                <input type="text" value="${link.icon}" style="width:60px;text-align:center" id="editIcon">
                <input type="text" value="${link.title}" id="editTitle" placeholder="网站名称">
                <input value="${link.url}" id="editUrl" placeholder="链接">
                <input type="text" value="${link.group || ''}" id="editGroup" placeholder="分组">
            </div>
            <div class="edit-actions">
                <button class="btn-save" onclick="savePublicEdit(${index})">保存</button>
                <button class="btn-cancel" onclick="renderPublicLinks()">取消</button>
            </div>
        </div>
    `;
    document.getElementById('editTitle').focus();
};

window.savePublicEdit = async function (index) {
    publicLinks[index] = {
        icon: document.getElementById('editIcon').value || '🌐',
        title: document.getElementById('editTitle').value,
        url: formatUrl(document.getElementById('editUrl').value),
        group: document.getElementById('editGroup').value
    };
    await savePublicLinks();
    renderPublicLinks();
};

window.deletePublicLink = async function (index) {
    if (confirm('确定要删除这个链接吗？')) {
        publicLinks.splice(index, 1);
        await savePublicLinks();
        renderPublicLinks();
    }
};

document.getElementById('privateAddForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const newLink = {
        icon: document.getElementById('newPrivateIcon').value || '🌐',
        title: document.getElementById('newPrivateTitle').value,
        url: formatUrl(document.getElementById('newPrivateUrl').value),
        group: document.getElementById('newPrivateGroup').value
    };

    privateLinks.push(newLink);
    await savePrivateLinks();
    renderPrivateLinks();

    document.getElementById('privateAddForm').reset();
    document.getElementById('newPrivateIcon').value = '🌐';
});

window.editPrivateLink = function (index) {
    const link = privateLinks[index];
    const item = document.querySelector(`#privateSection [data-index="${index}"]`);

    item.className = 'link-item';
    item.innerHTML = `
        <div class="edit-item">
            <div class="edit-row">
                <input type="text" value="${link.icon}" style="width:60px;text-align:center" id="editPrivateIcon">
                <input type="text" value="${link.title}" id="editPrivateTitle" placeholder="网站名称">
                <input type="text" value="${link.url}" id="editPrivateUrl" placeholder="链接">
                <input type="text" value="${link.group || ''}" id="editPrivateGroup" placeholder="分组">
            </div>
            <div class="edit-actions">
                <button class="btn-save" onclick="savePrivateEdit(${index})">保存</button>
                <button class="btn-cancel" onclick="renderPrivateLinks()">取消</button>
            </div>
        </div>
    `;
    document.getElementById('editPrivateTitle').focus();
};

window.savePrivateEdit = async function (index) {
    privateLinks[index] = {
        icon: document.getElementById('editPrivateIcon').value || '🌐',
        title: document.getElementById('editPrivateTitle').value,
        url: formatUrl(document.getElementById('editPrivateUrl').value),
        group: document.getElementById('editPrivateGroup').value
    };
    await savePrivateLinks();
    renderPrivateLinks();
};

window.deletePrivateLink = async function (index) {
    if (confirm('确定要删除这个链接吗？')) {
        privateLinks.splice(index, 1);
        await savePrivateLinks();
        renderPrivateLinks();
    }
};

loadToken();
fetchPublicLinks();

function initPublicSearch() {
    const searchInput = document.getElementById('publicSearchInput');
    const searchBtn = document.getElementById('publicSearchBtn');

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            publicSearchKeyword = searchInput.value.trim().toLowerCase();
            renderPublicLinks();
        }
    });

    searchBtn.addEventListener('click', () => {
        publicSearchKeyword = searchInput.value.trim().toLowerCase();
        renderPublicLinks();
    });
}

function initPrivateSearch() {
    const searchInput = document.getElementById('privateSearchInput');
    const searchBtn = document.getElementById('privateSearchBtn');

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            privateSearchKeyword = searchInput.value.trim().toLowerCase();
            renderPrivateLinks();
        }
    });

    searchBtn.addEventListener('click', () => {
        privateSearchKeyword = searchInput.value.trim().toLowerCase();
        renderPrivateLinks();
    });
}

initPublicSearch();
initPrivateSearch();

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
let publicCurrentPage = 1;
let privateCurrentPage = 1;
const PAGE_SIZE = 20;

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
        document.getElementById('groupsSection').classList.add('hidden');
    } else if (tab === 'private') {
        document.getElementById('publicSection').classList.add('hidden');
        document.getElementById('privateSection').classList.remove('hidden');
        document.getElementById('groupsSection').classList.add('hidden');
        const token = getToken();
        if (token && privateLinks.length === 0) {
            loadPrivateLinks(token);
        }
    } else if (tab === 'groups') {
        document.getElementById('publicSection').classList.add('hidden');
        document.getElementById('privateSection').classList.add('hidden');
        document.getElementById('groupsSection').classList.remove('hidden');
        renderGroupManagement();
    }
}

function renderGroupManagement() {
    const container = document.getElementById('groupManagementList');
    const publicGroups = [...new Set(publicLinks.map(link => link.group).filter(Boolean))];
    const privateGroups = [...new Set(privateLinks.map(link => link.group).filter(Boolean))];
    const allGroups = [...new Set([...publicGroups, ...privateGroups])];

    if (allGroups.length === 0) {
        container.innerHTML = '<p class="empty-msg">暂无分组</p>';
        return;
    }

    container.innerHTML = allGroups.map((group, idx) => {
        const publicCount = publicLinks.filter(link => link.group === group).length;
        const privateCount = privateLinks.filter(link => link.group === group).length;
        const safeIdx = 'group_' + idx;
        return `
            <div class="group-item" data-group="${group}" data-safe-idx="${safeIdx}">
                <div class="group-info">
                    <span class="group-name">${group}</span>
                    <span class="group-count">
                        ${publicCount > 0 ? `${publicCount} 个公开链接` : ''}
                        ${publicCount > 0 && privateCount > 0 ? ' · ' : ''}
                        ${privateCount > 0 ? `${privateCount} 个私密链接` : ''}
                    </span>
                </div>
                <div class="group-actions">
                    <button class="btn-edit" onclick="editGroupName('${safeIdx}', '${group}')">修改</button>
                </div>
            </div>
        `;
    }).join('');
}

window.editGroupName = function(safeIdx, oldGroupName) {
    const item = document.querySelector(`[data-safe-idx="${safeIdx}"]`);
    if (!item) return;

    item.innerHTML = `
        <div class="group-info">
            <input type="text" class="group-input" id="edit-group-input" value="${oldGroupName}" placeholder="输入新分组名称">
        </div>
        <div class="group-actions">
            <button class="btn-save" onclick="saveGroupName('${safeIdx}', '${oldGroupName}')">保存</button>
            <button class="btn-cancel" onclick="renderGroupManagement()">取消</button>
        </div>
    `;

    document.getElementById('edit-group-input').focus();
}

window.saveGroupName = async function(safeIdx, oldGroupName) {
    const newGroupName = document.getElementById('edit-group-input').value.trim();

    if (!newGroupName) {
        showToast('分组名称不能为空', true);
        return;
    }

    if (newGroupName === oldGroupName) {
        renderGroupManagement();
        return;
    }

    // 更新公开链接
    let hasPublicChanges = false;
    publicLinks.forEach(link => {
        if (link.group === oldGroupName) {
            link.group = newGroupName;
            hasPublicChanges = true;
        }
    });

    // 更新私密链接
    let hasPrivateChanges = false;
    privateLinks.forEach(link => {
        if (link.group === oldGroupName) {
            link.group = newGroupName;
            hasPrivateChanges = true;
        }
    });

    // 保存到 Gist
    if (hasPublicChanges) {
        await savePublicLinks();
    }
    if (hasPrivateChanges) {
        await savePrivateLinks();
    }

    renderPublicCategories();
    renderPrivateCategories();
    renderGroupManagement();
    showToast('分组名称已更新');
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
    const hasUngrouped = publicLinks.some(link => !link.group);

    const isAllActive = publicCurrentGroup === 'all' ? 'active' : '';
    let html = `<button class="category-btn ${isAllActive}" data-group="all">全部</button>`;

    if (hasUngrouped) {
        const isUngroupedActive = publicCurrentGroup === 'ungrouped' ? 'active' : '';
        html += `<button class="category-btn ${isUngroupedActive}" data-group="ungrouped">未分组</button>`;
    }

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
            publicCurrentPage = 1;
            renderPublicLinks();
        });
    });
}

function renderPrivateCategories() {
    const nav = document.getElementById('privateCategoryNav');
    const groups = [...new Set(privateLinks.map(link => link.group).filter(Boolean))];
    const hasUngrouped = privateLinks.some(link => !link.group);

    const isAllActive = privateCurrentGroup === 'all' ? 'active' : '';
    let html = `<button class="category-btn ${isAllActive}" data-group="all">全部</button>`;

    if (hasUngrouped) {
        const isUngroupedActive = privateCurrentGroup === 'ungrouped' ? 'active' : '';
        html += `<button class="category-btn ${isUngroupedActive}" data-group="ungrouped">未分组</button>`;
    }

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
            privateCurrentPage = 1;
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

    let filteredLinks;
    if (publicCurrentGroup === 'all') {
        filteredLinks = publicLinks;
    } else if (publicCurrentGroup === 'ungrouped') {
        filteredLinks = publicLinks.filter(link => !link.group);
    } else {
        filteredLinks = publicLinks.filter(link => link.group === publicCurrentGroup);
    }

    if (publicSearchKeyword) {
        filteredLinks = filteredLinks.filter(link =>
            link.title.toLowerCase().includes(publicSearchKeyword)
        );
    }

    const totalPages = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
    if (publicCurrentPage > totalPages) publicCurrentPage = totalPages;

    if (filteredLinks.length === 0) {
        container.innerHTML = publicCurrentGroup === 'all' && !publicSearchKeyword
            ? (hasToken ? '<p class="empty-msg">暂无链接，请添加</p>' : '')
            : '<p class="empty-msg">未找到匹配的链接</p>';
        document.getElementById('publicPagination').innerHTML = '';
        renderPublicCategories();
        return;
    }

    const startIdx = (publicCurrentPage - 1) * PAGE_SIZE;
    const pageLinks = filteredLinks.slice(startIdx, startIdx + PAGE_SIZE);

    container.innerHTML = pageLinks.map((link) => {
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

    renderPublicPagination(totalPages, filteredLinks.length);
    renderCategoryButtons(publicLinks, 'newGroup');
    renderPublicCategories();
}

function renderPublicPagination(totalPages, totalCount) {
    const container = document.getElementById('publicPagination');
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `<span class="page-info">第 ${publicCurrentPage} / ${totalPages} 页，共 ${totalCount} 条</span>`;
    html += '<div class="page-buttons">';
    html += `<button class="page-btn" onclick="goPublicPage(${publicCurrentPage - 1})" ${publicCurrentPage === 1 ? 'disabled' : ''}>上一页</button>`;
    html += `<button class="page-btn" onclick="goPublicPage(${publicCurrentPage + 1})" ${publicCurrentPage === totalPages ? 'disabled' : ''}>下一页</button>`;
    html += '</div>';
    container.innerHTML = html;
}

window.goPublicPage = function(page) {
    const filteredLinks = publicCurrentGroup === 'all' ? publicLinks
        : publicCurrentGroup === 'ungrouped' ? publicLinks.filter(link => !link.group)
        : publicLinks.filter(link => link.group === publicCurrentGroup);
    const totalPages = Math.ceil(filteredLinks.length / PAGE_SIZE);
    if (page >= 1 && page <= totalPages) {
        publicCurrentPage = page;
        renderPublicLinks();
    }
};

function renderPrivateLinks() {
    const container = document.getElementById('privateLinksList');
    const hasToken = getToken();

    let filteredLinks;
    if (privateCurrentGroup === 'all') {
        filteredLinks = privateLinks;
    } else if (privateCurrentGroup === 'ungrouped') {
        filteredLinks = privateLinks.filter(link => !link.group);
    } else {
        filteredLinks = privateLinks.filter(link => link.group === privateCurrentGroup);
    }

    if (privateSearchKeyword) {
        filteredLinks = filteredLinks.filter(link =>
            link.title.toLowerCase().includes(privateSearchKeyword)
        );
    }

    const totalPages = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
    if (privateCurrentPage > totalPages) privateCurrentPage = totalPages;

    if (filteredLinks.length === 0) {
        container.innerHTML = privateCurrentGroup === 'all' && !privateSearchKeyword
            ? (hasToken ? '<p class="empty-msg">暂无私密链接，请添加</p>' : '')
            : '<p class="empty-msg">未找到匹配的链接</p>';
        document.getElementById('privatePagination').innerHTML = '';
        renderPrivateCategories();
        return;
    }

    const startIdx = (privateCurrentPage - 1) * PAGE_SIZE;
    const pageLinks = filteredLinks.slice(startIdx, startIdx + PAGE_SIZE);

    container.innerHTML = pageLinks.map((link) => {
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

    renderPrivatePagination(totalPages, filteredLinks.length);
    renderCategoryButtons(privateLinks, 'newPrivateGroup');
    renderPrivateCategories();
}

function renderPrivatePagination(totalPages, totalCount) {
    const container = document.getElementById('privatePagination');
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `<span class="page-info">第 ${privateCurrentPage} / ${totalPages} 页，共 ${totalCount} 条</span>`;
    html += '<div class="page-buttons">';
    html += `<button class="page-btn" onclick="goPrivatePage(${privateCurrentPage - 1})" ${privateCurrentPage === 1 ? 'disabled' : ''}>上一页</button>`;
    html += `<button class="page-btn" onclick="goPrivatePage(${privateCurrentPage + 1})" ${privateCurrentPage === totalPages ? 'disabled' : ''}>下一页</button>`;
    html += '</div>';
    container.innerHTML = html;
}

window.goPrivatePage = function(page) {
    const filteredLinks = privateCurrentGroup === 'all' ? privateLinks
        : privateCurrentGroup === 'ungrouped' ? privateLinks.filter(link => !link.group)
        : privateLinks.filter(link => link.group === privateCurrentGroup);
    const totalPages = Math.ceil(filteredLinks.length / PAGE_SIZE);
    if (page >= 1 && page <= totalPages) {
        privateCurrentPage = page;
        renderPrivateLinks();
    }
};

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
            publicCurrentPage = 1;
            renderPublicLinks();
        }
    });

    searchBtn.addEventListener('click', () => {
        publicSearchKeyword = searchInput.value.trim().toLowerCase();
        publicCurrentPage = 1;
        renderPublicLinks();
    });
}

function initPrivateSearch() {
    const searchInput = document.getElementById('privateSearchInput');
    const searchBtn = document.getElementById('privateSearchBtn');

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            privateSearchKeyword = searchInput.value.trim().toLowerCase();
            privateCurrentPage = 1;
            renderPrivateLinks();
        }
    });

    searchBtn.addEventListener('click', () => {
        privateSearchKeyword = searchInput.value.trim().toLowerCase();
        privateCurrentPage = 1;
        renderPrivateLinks();
    });
}

initPublicSearch();
initPrivateSearch();

function importPublicLinks() {
    document.getElementById('publicImportModal').classList.add('show');
}

function importPrivateLinks() {
    document.getElementById('privateImportModal').classList.add('show');
}

function closePublicImportModal() {
    document.getElementById('publicImportModal').classList.remove('show');
}

function closePrivateImportModal() {
    document.getElementById('privateImportModal').classList.remove('show');
}

function handlePublicFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    closePublicImportModal();

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedLinks = JSON.parse(e.target.result);
            if (!Array.isArray(importedLinks)) {
                showToast('文件格式错误：需要是JSON数组', true);
                return;
            }

            const existingKeys = new Set(publicLinks.map(link => `${link.title}|${link.url}`));
            let addedCount = 0;

            for (const link of importedLinks) {
                if (link.title && link.url) {
                    const key = `${link.title}|${link.url}`;
                    if (!existingKeys.has(key)) {
                        publicLinks.push({
                            icon: link.icon || '🌐',
                            title: link.title,
                            url: link.url,
                            group: link.group || ''
                        });
                        existingKeys.add(key);
                        addedCount++;
                    }
                }
            }

            if (addedCount > 0) {
                await savePublicLinks();
                renderPublicLinks();
                showToast(`成功导入 ${addedCount} 个链接`);
            } else {
                showToast('没有新的链接需要导入', true);
            }
        } catch (error) {
            showToast('文件解析失败', true);
            console.error(error);
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function handlePrivateFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    closePrivateImportModal();

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedLinks = JSON.parse(e.target.result);
            if (!Array.isArray(importedLinks)) {
                showToast('文件格式错误：需要是JSON数组', true);
                return;
            }

            const existingKeys = new Set(privateLinks.map(link => `${link.title}|${link.url}`));
            let addedCount = 0;

            for (const link of importedLinks) {
                if (link.title && link.url) {
                    const key = `${link.title}|${link.url}`;
                    if (!existingKeys.has(key)) {
                        privateLinks.push({
                            icon: link.icon || '🌐',
                            title: link.title,
                            url: link.url,
                            group: link.group || ''
                        });
                        existingKeys.add(key);
                        addedCount++;
                    }
                }
            }

            if (addedCount > 0) {
                await savePrivateLinks();
                renderPrivateLinks();
                showToast(`成功导入 ${addedCount} 个链接`);
            } else {
                showToast('没有新的链接需要导入', true);
            }
        } catch (error) {
            showToast('文件解析失败', true);
            console.error(error);
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

document.getElementById('importPublicBtn').addEventListener('click', importPublicLinks);
document.getElementById('importPrivateBtn').addEventListener('click', importPrivateLinks);
document.getElementById('publicFileInput').addEventListener('change', handlePublicFileImport);
document.getElementById('privateFileInput').addEventListener('change', handlePrivateFileImport);

document.getElementById('publicImportCancel').addEventListener('click', closePublicImportModal);
document.getElementById('privateImportCancel').addEventListener('click', closePrivateImportModal);
document.getElementById('publicImportConfirm').addEventListener('click', () => {
    document.getElementById('publicFileInput').click();
});
document.getElementById('privateImportConfirm').addEventListener('click', () => {
    document.getElementById('privateFileInput').click();
});

document.getElementById('publicImportModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('publicImportModal')) {
        closePublicImportModal();
    }
});
document.getElementById('privateImportModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('privateImportModal')) {
        closePrivateImportModal();
    }
});

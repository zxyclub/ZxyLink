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
let groupCurrentType = 'public';
let publicSelectedIndices = [];
let privateSelectedIndices = [];
let publicReorderMode = false;
let privateReorderMode = false;
let publicTempLinks = [];
let privateTempLinks = [];
let publicReorderGroup = 'all'; // 记录排序时的分组
let privateReorderGroup = 'all';
let groupReorderMode = false;
let tempGroups = [];
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
    let links, groups;
    
    if (groupCurrentType === 'public') {
        links = publicLinks;
        if (groupReorderMode) {
            groups = tempGroups;
        } else {
            groups = [...new Set(publicLinks.map(link => link.group).filter(Boolean))];
        }
    } else {
        links = privateLinks;
        if (groupReorderMode) {
            groups = tempGroups;
        } else {
            groups = [...new Set(privateLinks.map(link => link.group).filter(Boolean))];
        }
    }

    // 显示/隐藏控件
    const batchActions = document.getElementById('groupBatchActions');
    const reorderControls = document.getElementById('groupReorderControls');
    const reorderBtn = document.getElementById('groupReorderBtn');
    const groupNavSection = document.getElementById('groupNavSection');
    
    if (groupReorderMode) {
        batchActions.style.display = 'none';
        reorderControls.style.display = 'flex';
        reorderBtn.textContent = '退出排序';
        reorderBtn.style.background = 'rgba(255, 107, 107, 0.2)';
        reorderBtn.style.color = '#ff6b6b';
        groupNavSection.style.display = 'none';
    } else {
        batchActions.style.display = 'flex';
        reorderControls.style.display = 'none';
        reorderBtn.textContent = '调整分组顺序';
        reorderBtn.style.background = 'rgba(0, 217, 255, 0.2)';
        reorderBtn.style.color = '#00d9ff';
        groupNavSection.style.display = 'block';
    }

    if (groups.length === 0) {
        container.innerHTML = '<p class="empty-msg">暂无分组</p>';
        return;
    }

    if (groupReorderMode) {
        container.innerHTML = `<p class="reorder-hint">拖动或用上下按钮调整分组顺序后点击保存</p>`;
        container.innerHTML += groups.map((group, idx) => {
            const count = links.filter(link => link.group === group).length;
            const safeIdx = 'group_' + idx;
            return `
                <div class="group-item draggable" 
                     data-group="${group}" 
                     data-safe-idx="${safeIdx}"
                     draggable="true"
                     ondragstart="handleGroupDragStart(event, ${idx})"
                     ondragend="handleGroupDragEnd(event)"
                     ondragover="handleDragOver(event)"
                     ondragenter="handleDragEnter(event)"
                     ondragleave="handleDragLeave(event)"
                     ondrop="handleGroupDrop(event, ${idx})">
                    <div class="drag-handle">
                        <button class="order-btn" onclick="moveGroupUp(${idx})" ${idx === 0 ? 'disabled' : ''}>↑</button>
                        <button class="order-btn" onclick="moveGroupDown(${idx})" ${idx === groups.length - 1 ? 'disabled' : ''}>↓</button>
                    </div>
                    <div class="group-info">
                        <span class="group-name">${group}</span>
                        <span class="group-count">${count} 个链接</span>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = groups.map((group, idx) => {
            const count = links.filter(link => link.group === group).length;
            const safeIdx = 'group_' + idx;
            return `
                <div class="group-item" data-group="${group}" data-safe-idx="${safeIdx}">
                    <div class="group-info">
                        <span class="group-name">${group}</span>
                        <span class="group-count">${count} 个链接</span>
                    </div>
                    <div class="group-actions">
                        <button class="btn-edit" onclick="editGroupName('${safeIdx}', '${group}')">修改</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 绑定分组管理导航
    const nav = document.getElementById('groupsCategoryNav');
    nav.querySelectorAll('.category-btn').forEach(btn => {
        btn.removeEventListener('click', handleGroupNavClick);
        btn.addEventListener('click', handleGroupNavClick);
    });
}

function handleGroupNavClick(e) {
    document.querySelectorAll('#groupsCategoryNav .category-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    groupCurrentType = e.target.dataset.groupType;
    renderGroupManagement();
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

    // 更新对应类型的链接
    let hasChanges = false;
    if (groupCurrentType === 'public') {
        publicLinks.forEach(link => {
            if (link.group === oldGroupName) {
                link.group = newGroupName;
                hasChanges = true;
            }
        });
        if (hasChanges) {
            await savePublicLinks();
        }
    } else {
        privateLinks.forEach(link => {
            if (link.group === oldGroupName) {
                link.group = newGroupName;
                hasChanges = true;
            }
        });
        if (hasChanges) {
            await savePrivateLinks();
        }
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

    // 先初始化 filteredLinks
    let filteredLinks;
    if (publicReorderMode) {
        filteredLinks = publicTempLinks;
    } else {
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
    }

    // 再显示/隐藏排序控件和按钮
    const batchActions = document.getElementById('publicBatchActions');
    const reorderControls = document.getElementById('publicReorderControls');
    const pagination = document.getElementById('publicPagination');
    const reorderBtn = document.getElementById('publicReorderBtn');
    const publicSearchBox = document.querySelector('#publicSection .search-box');
    const publicCategoryNav = document.getElementById('publicCategoryNav');
    const editSection = document.getElementById('editSection');

    if (publicReorderMode) {
        batchActions.style.display = 'none';
        reorderControls.style.display = 'flex';
        pagination.style.display = 'none';
        publicSearchBox.style.display = 'none';
        publicCategoryNav.style.display = 'none';
        editSection.style.display = 'none';
        reorderBtn.textContent = '退出排序';
        reorderBtn.style.background = 'rgba(255, 107, 107, 0.2)';
        reorderBtn.style.color = '#ff6b6b';
    } else {
        batchActions.style.display = hasToken && filteredLinks.length > 0 ? 'flex' : 'none';
        reorderControls.style.display = 'none';
        pagination.style.display = filteredLinks.length > 0 ? 'block' : 'none';
        publicSearchBox.style.display = 'flex';
        publicCategoryNav.style.display = 'flex';
        if (hasToken) {
            editSection.classList.remove('hidden');
            editSection.style.display = 'block';
        }
        reorderBtn.textContent = '调整顺序';
        reorderBtn.style.background = 'rgba(0, 217, 255, 0.2)';
        reorderBtn.style.color = '#00d9ff';
    }

    const totalPages = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
    if (publicCurrentPage > totalPages && !publicReorderMode) publicCurrentPage = totalPages;

    if (filteredLinks.length === 0) {
        container.innerHTML = publicCurrentGroup === 'all' && !publicSearchKeyword
            ? (hasToken ? '<p class="empty-msg">暂无链接，请添加</p>' : '')
            : '<p class="empty-msg">未找到匹配的链接</p>';
        document.getElementById('publicPagination').innerHTML = '';
        renderPublicCategories();
        return;
    }

    let pageLinks;
    if (publicReorderMode) {
        pageLinks = filteredLinks; // 不分页，显示所有
    } else {
        const startIdx = (publicCurrentPage - 1) * PAGE_SIZE;
        pageLinks = filteredLinks.slice(startIdx, startIdx + PAGE_SIZE);
    }

    if (publicReorderMode) {
        const groupName = publicReorderGroup === 'all' ? '全部' : (publicReorderGroup === 'ungrouped' ? '未分组' : publicReorderGroup);
        container.innerHTML = `<p class="reorder-hint">正在调整「${groupName}」分组下的链接顺序，拖动或用上下按钮调整后点击保存</p>`;
        container.innerHTML += pageLinks.map((link, idx) => {
            return `
                <div class="link-item draggable" 
                     draggable="true" 
                     data-index="${idx}"
                     ondragstart="handleDragStart(event, 'public', ${idx})"
                     ondragend="handleDragEnd(event)"
                     ondragover="handleDragOver(event)"
                     ondragenter="handleDragEnter(event)"
                     ondragleave="handleDragLeave(event)"
                     ondrop="handleDrop(event, 'public', ${idx})">
                    <div class="drag-handle">
                        <button class="order-btn" onclick="moveUp('public', ${idx})" ${idx === 0 ? 'disabled' : ''}>↑</button>
                        <button class="order-btn" onclick="moveDown('public', ${idx})" ${idx === pageLinks.length - 1 ? 'disabled' : ''}>↓</button>
                    </div>
                    <div class="icon-box">${link.icon}</div>
                    <div class="content-box">
                        <div class="info-row">
                            <div>
                                <div class="title">${link.title}</div>
                                <div class="group">${link.group || ''}</div>
                            </div>
                        </div>
                        <div class="url-row">
                            <span class="url">${link.url}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = pageLinks.map((link) => {
            const originalIndex = publicLinks.indexOf(link);
            const isSelected = publicSelectedIndices.includes(originalIndex);
            return `
                <div class="link-item ${isSelected ? 'selected' : ''}" data-index="${originalIndex}">
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
                                <button class="btn-select ${isSelected ? 'selected' : ''}" onclick="toggleSelectItem('public', ${originalIndex})">
                                    ${isSelected ? '✓' : ''}
                                </button>
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
    }

    if (!publicReorderMode) {
        renderPublicPagination(totalPages, filteredLinks.length);
    } else {
        document.getElementById('publicPagination').innerHTML = '';
    }
    
    renderCategoryButtons(publicLinks, 'newGroup');
    renderPublicCategories();
    if (!publicReorderMode) {
        updateBatchUI('public');
    }
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

    // 先初始化 filteredLinks
    let filteredLinks;
    if (privateReorderMode) {
        filteredLinks = privateTempLinks;
    } else {
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
    }

    // 再显示/隐藏排序控件和按钮
    const batchActions = document.getElementById('privateBatchActions');
    const reorderControls = document.getElementById('privateReorderControls');
    const pagination = document.getElementById('privatePagination');
    const reorderBtn = document.getElementById('privateReorderBtn');
    const privateSearchBox = document.querySelector('#privateSection .search-box');
    const privateCategoryNav = document.getElementById('privateCategoryNav');
    const privateEditSection = document.getElementById('privateEditSection');

    if (privateReorderMode) {
        batchActions.style.display = 'none';
        reorderControls.style.display = 'flex';
        pagination.style.display = 'none';
        privateSearchBox.style.display = 'none';
        privateCategoryNav.style.display = 'none';
        privateEditSection.style.display = 'none';
        reorderBtn.textContent = '退出排序';
        reorderBtn.style.background = 'rgba(255, 107, 107, 0.2)';
        reorderBtn.style.color = '#ff6b6b';
    } else {
        batchActions.style.display = hasToken && filteredLinks.length > 0 ? 'flex' : 'none';
        reorderControls.style.display = 'none';
        pagination.style.display = filteredLinks.length > 0 ? 'block' : 'none';
        privateSearchBox.style.display = 'flex';
        privateCategoryNav.style.display = 'flex';
        if (hasToken) {
            privateEditSection.classList.remove('hidden');
            privateEditSection.style.display = 'block';
        }
        reorderBtn.textContent = '调整顺序';
        reorderBtn.style.background = 'rgba(0, 217, 255, 0.2)';
        reorderBtn.style.color = '#00d9ff';
    }

    const totalPages = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
    if (privateCurrentPage > totalPages && !privateReorderMode) privateCurrentPage = totalPages;

    if (filteredLinks.length === 0) {
        container.innerHTML = privateCurrentGroup === 'all' && !privateSearchKeyword
            ? (hasToken ? '<p class="empty-msg">暂无私密链接，请添加</p>' : '')
            : '<p class="empty-msg">未找到匹配的链接</p>';
        document.getElementById('privatePagination').innerHTML = '';
        renderPrivateCategories();
        return;
    }

    let pageLinks;
    if (privateReorderMode) {
        pageLinks = filteredLinks; // 不分页，显示所有
    } else {
        const startIdx = (privateCurrentPage - 1) * PAGE_SIZE;
        pageLinks = filteredLinks.slice(startIdx, startIdx + PAGE_SIZE);
    }

    if (privateReorderMode) {
        const groupName = privateReorderGroup === 'all' ? '全部' : (privateReorderGroup === 'ungrouped' ? '未分组' : privateReorderGroup);
        container.innerHTML = `<p class="reorder-hint">正在调整「${groupName}」分组下的链接顺序，拖动或用上下按钮调整后点击保存</p>`;
        container.innerHTML += pageLinks.map((link, idx) => {
            return `
                <div class="link-item draggable" 
                     draggable="true" 
                     data-index="${idx}"
                     ondragstart="handleDragStart(event, 'private', ${idx})"
                     ondragend="handleDragEnd(event)"
                     ondragover="handleDragOver(event)"
                     ondragenter="handleDragEnter(event)"
                     ondragleave="handleDragLeave(event)"
                     ondrop="handleDrop(event, 'private', ${idx})">
                    <div class="drag-handle">
                        <button class="order-btn" onclick="moveUp('private', ${idx})" ${idx === 0 ? 'disabled' : ''}>↑</button>
                        <button class="order-btn" onclick="moveDown('private', ${idx})" ${idx === pageLinks.length - 1 ? 'disabled' : ''}>↓</button>
                    </div>
                    <div class="icon-box">${link.icon}</div>
                    <div class="content-box">
                        <div class="info-row">
                            <div>
                                <div class="title">${link.title}</div>
                                <div class="group">${link.group || ''}</div>
                            </div>
                        </div>
                        <div class="url-row">
                            <span class="url">${link.url}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = pageLinks.map((link) => {
            const originalIndex = privateLinks.indexOf(link);
            const isSelected = privateSelectedIndices.includes(originalIndex);
            return `
                <div class="link-item ${isSelected ? 'selected' : ''}" data-index="${originalIndex}">
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
                                <button class="btn-select ${isSelected ? 'selected' : ''}" onclick="toggleSelectItem('private', ${originalIndex})">
                                    ${isSelected ? '✓' : ''}
                                </button>
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
    }

    if (!privateReorderMode) {
        renderPrivatePagination(totalPages, filteredLinks.length);
    } else {
        document.getElementById('privatePagination').innerHTML = '';
    }
    
    renderCategoryButtons(privateLinks, 'newPrivateGroup');
    renderPrivateCategories();
    if (!privateReorderMode) {
        updateBatchUI('private');
    }
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
        // 清理选中索引
        publicSelectedIndices = publicSelectedIndices.filter(i => i !== index);
        // 更新大于删除索引的选中索引
        publicSelectedIndices = publicSelectedIndices.map(i => i > index ? i - 1 : i);
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
        // 清理选中索引
        privateSelectedIndices = privateSelectedIndices.filter(i => i !== index);
        // 更新大于删除索引的选中索引
        privateSelectedIndices = privateSelectedIndices.map(i => i > index ? i - 1 : i);
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

// 批量删除功能
window.toggleSelectItem = function(type, index) {
    const selectedIndices = type === 'public' ? publicSelectedIndices : privateSelectedIndices;
    const idx = selectedIndices.indexOf(index);
    if (idx > -1) {
        selectedIndices.splice(idx, 1);
    } else {
        selectedIndices.push(index);
    }
    renderPublicLinks();
    renderPrivateLinks();
};

window.toggleSelectAll = function(type) {
    const checkAllId = type === 'public' ? 'publicSelectAll' : 'privateSelectAll';
    const checkAll = document.getElementById(checkAllId);
    const links = type === 'public' ? publicLinks : privateLinks;
    const selectedIndices = type === 'public' ? publicSelectedIndices : privateSelectedIndices;
    
    if (checkAll.checked) {
        let filteredLinks;
        if (type === 'public') {
            filteredLinks = publicCurrentGroup === 'all' ? publicLinks
                : publicCurrentGroup === 'ungrouped' ? publicLinks.filter(link => !link.group)
                : publicLinks.filter(link => link.group === publicCurrentGroup);
            if (publicSearchKeyword) {
                filteredLinks = filteredLinks.filter(link =>
                    link.title.toLowerCase().includes(publicSearchKeyword)
                );
            }
        } else {
            filteredLinks = privateCurrentGroup === 'all' ? privateLinks
                : privateCurrentGroup === 'ungrouped' ? privateLinks.filter(link => !link.group)
                : privateLinks.filter(link => link.group === privateCurrentGroup);
            if (privateSearchKeyword) {
                filteredLinks = filteredLinks.filter(link =>
                    link.title.toLowerCase().includes(privateSearchKeyword)
                );
            }
        }
        
        selectedIndices.length = 0;
        filteredLinks.forEach(link => {
            const idx = links.indexOf(link);
            selectedIndices.push(idx);
        });
    } else {
        selectedIndices.length = 0;
    }
    renderPublicLinks();
    renderPrivateLinks();
};

function updateBatchUI(type) {
    const selectedCountId = type === 'public' ? 'publicSelectedCount' : 'privateSelectedCount';
    const selectAllId = type === 'public' ? 'publicSelectAll' : 'privateSelectAll';
    const links = type === 'public' ? publicLinks : privateLinks;
    const selectedIndices = type === 'public' ? publicSelectedIndices : privateSelectedIndices;
    
    document.getElementById(selectedCountId).textContent = selectedIndices.length;
    
    let filteredLinks;
    if (type === 'public') {
        filteredLinks = publicCurrentGroup === 'all' ? publicLinks
            : publicCurrentGroup === 'ungrouped' ? publicLinks.filter(link => !link.group)
            : publicLinks.filter(link => link.group === publicCurrentGroup);
        if (publicSearchKeyword) {
            filteredLinks = filteredLinks.filter(link =>
                link.title.toLowerCase().includes(publicSearchKeyword)
            );
        }
    } else {
        filteredLinks = privateCurrentGroup === 'all' ? privateLinks
            : privateCurrentGroup === 'ungrouped' ? privateLinks.filter(link => !link.group)
            : privateLinks.filter(link => link.group === privateCurrentGroup);
        if (privateSearchKeyword) {
            filteredLinks = filteredLinks.filter(link =>
                link.title.toLowerCase().includes(privateSearchKeyword)
            );
        }
    }
    
    const allSelected = filteredLinks.length > 0 && filteredLinks.every(link => 
        selectedIndices.includes(links.indexOf(link))
    );
    document.getElementById(selectAllId).checked = allSelected;
}

window.batchDelete = async function(type) {
    const selectedIndices = type === 'public' ? publicSelectedIndices : privateSelectedIndices;
    const links = type === 'public' ? publicLinks : privateLinks;
    
    if (selectedIndices.length === 0) {
        showToast('请先选择要删除的链接', true);
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedIndices.length} 个链接吗？`)) {
        return;
    }
    
    // 从大到小排序，避免索引偏移
    const sortedIndices = [...selectedIndices].sort((a, b) => b - a);
    sortedIndices.forEach(idx => {
        links.splice(idx, 1);
    });
    
    if (type === 'public') {
        await savePublicLinks();
        publicSelectedIndices.length = 0;
    } else {
        await savePrivateLinks();
        privateSelectedIndices.length = 0;
    }
    
    showToast(`成功删除 ${sortedIndices.length} 个链接`);
    renderPublicLinks();
    renderPrivateLinks();
};

// 上下移动链接
window.moveUp = function(type, index) {
    const tempLinks = type === 'public' ? publicTempLinks : privateTempLinks;
    if (index <= 0) return;
    
    const temp = tempLinks[index];
    tempLinks[index] = tempLinks[index - 1];
    tempLinks[index - 1] = temp;
    
    if (type === 'public') {
        renderPublicLinks();
    } else {
        renderPrivateLinks();
    }
};

window.moveDown = function(type, index) {
    const tempLinks = type === 'public' ? publicTempLinks : privateTempLinks;
    if (index >= tempLinks.length - 1) return;
    
    const temp = tempLinks[index];
    tempLinks[index] = tempLinks[index + 1];
    tempLinks[index + 1] = temp;
    
    if (type === 'public') {
        renderPublicLinks();
    } else {
        renderPrivateLinks();
    }
};

// 分组排序相关变量
let draggedGroupIndex = null;

// 分组排序功能
window.toggleGroupReorderMode = function() {
    groupReorderMode = !groupReorderMode;
    if (groupReorderMode) {
        if (groupCurrentType === 'public') {
            tempGroups = [...new Set(publicLinks.map(link => link.group).filter(Boolean))];
        } else {
            tempGroups = [...new Set(privateLinks.map(link => link.group).filter(Boolean))];
        }
    } else {
        tempGroups.length = 0;
    }
    renderGroupManagement();
};

window.cancelGroupOrder = function() {
    groupReorderMode = false;
    tempGroups.length = 0;
    renderGroupManagement();
};

window.saveGroupOrder = async function() {
    if (groupCurrentType === 'public') {
        // 按新的分组顺序重新排列链接
        const newPublicLinks = [];
        // 先按顺序添加有分组的链接
        tempGroups.forEach(group => {
            newPublicLinks.push(...publicLinks.filter(link => link.group === group));
        });
        // 再添加未分组的链接
        newPublicLinks.push(...publicLinks.filter(link => !link.group));
        publicLinks = newPublicLinks;
        
        await savePublicLinks();
        renderGroupManagement();
        renderPublicLinks();
        renderPublicCategories();
        showToast('分组顺序已保存');
    } else {
        // 私密链接
        const newPrivateLinks = [];
        tempGroups.forEach(group => {
            newPrivateLinks.push(...privateLinks.filter(link => link.group === group));
        });
        newPrivateLinks.push(...privateLinks.filter(link => !link.group));
        privateLinks = newPrivateLinks;
        
        await savePrivateLinks();
        renderGroupManagement();
        renderPrivateLinks();
        renderPrivateCategories();
        showToast('分组顺序已保存');
    }
    
    groupReorderMode = false;
    tempGroups.length = 0;
};

window.moveGroupUp = function(index) {
    if (index <= 0) return;
    
    const temp = tempGroups[index];
    tempGroups[index] = tempGroups[index - 1];
    tempGroups[index - 1] = temp;
    
    renderGroupManagement();
};

window.moveGroupDown = function(index) {
    if (index >= tempGroups.length - 1) return;
    
    const temp = tempGroups[index];
    tempGroups[index] = tempGroups[index + 1];
    tempGroups[index + 1] = temp;
    
    renderGroupManagement();
};

// 分组拖拽功能
function handleGroupDragStart(e, index) {
    draggedGroupIndex = index;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleGroupDragEnd(e) {
    e.target.classList.remove('dragging');
    const items = document.querySelectorAll('.group-item.draggable');
    items.forEach(item => item.classList.remove('drag-over'));
    draggedGroupIndex = null;
}

function handleGroupDrop(e, targetIndex) {
    e.preventDefault();
    if (draggedGroupIndex === null || draggedGroupIndex === targetIndex) return;
    
    const temp = tempGroups[draggedGroupIndex];
    tempGroups[draggedGroupIndex] = tempGroups[targetIndex];
    tempGroups[targetIndex] = temp;
    
    renderGroupManagement();
}

// 调整顺序功能
window.toggleReorderMode = function(type) {
    if (type === 'public') {
        publicReorderMode = !publicReorderMode;
        publicReorderGroup = publicCurrentGroup;
        if (publicReorderMode) {
            // 只保存当前分组的链接
            if (publicCurrentGroup === 'all') {
                publicTempLinks = [...publicLinks];
            } else if (publicCurrentGroup === 'ungrouped') {
                publicTempLinks = publicLinks.filter(link => !link.group);
            } else {
                publicTempLinks = publicLinks.filter(link => link.group === publicCurrentGroup);
            }
        }
        renderPublicLinks();
    } else {
        privateReorderMode = !privateReorderMode;
        privateReorderGroup = privateCurrentGroup;
        if (privateReorderMode) {
            // 只保存当前分组的链接
            if (privateCurrentGroup === 'all') {
                privateTempLinks = [...privateLinks];
            } else if (privateCurrentGroup === 'ungrouped') {
                privateTempLinks = privateLinks.filter(link => !link.group);
            } else {
                privateTempLinks = privateLinks.filter(link => link.group === privateCurrentGroup);
            }
        }
        renderPrivateLinks();
    }
};

window.cancelReorder = function(type) {
    if (type === 'public') {
        publicReorderMode = false;
        publicTempLinks.length = 0;
        publicReorderGroup = 'all';
        renderPublicLinks();
    } else {
        privateReorderMode = false;
        privateTempLinks.length = 0;
        privateReorderGroup = 'all';
        renderPrivateLinks();
    }
};

window.saveReorder = async function(type) {
    if (type === 'public') {
        // 重新构建公开链接数组
        const newPublicLinks = [];
        if (publicReorderGroup === 'all') {
            // 如果是全部分组，直接替换
            publicLinks = [...publicTempLinks];
        } else if (publicReorderGroup === 'ungrouped') {
            // 未分组，替换未分组的链接
            publicLinks.forEach(link => {
                if (link.group) {
                    newPublicLinks.push(link);
                }
            });
            // 添加排序后的未分组链接
            newPublicLinks.push(...publicTempLinks);
            publicLinks = newPublicLinks;
        } else {
            // 指定分组，替换该分组的链接
            // 先添加其他分组的链接
            publicLinks.forEach(link => {
                if (link.group !== publicReorderGroup) {
                    newPublicLinks.push(link);
                }
            });
            // 再添加排序后的该分组链接
            newPublicLinks.push(...publicTempLinks);
            publicLinks = newPublicLinks;
        }
        
        await savePublicLinks();
        publicReorderMode = false;
        publicTempLinks.length = 0;
        publicReorderGroup = 'all';
        renderPublicLinks();
        showToast('顺序已保存');
    } else {
        // 重新构建私密链接数组
        const newPrivateLinks = [];
        if (privateReorderGroup === 'all') {
            privateLinks = [...privateTempLinks];
        } else if (privateReorderGroup === 'ungrouped') {
            privateLinks.forEach(link => {
                if (link.group) {
                    newPrivateLinks.push(link);
                }
            });
            newPrivateLinks.push(...privateTempLinks);
            privateLinks = newPrivateLinks;
        } else {
            privateLinks.forEach(link => {
                if (link.group !== privateReorderGroup) {
                    newPrivateLinks.push(link);
                }
            });
            newPrivateLinks.push(...privateTempLinks);
            privateLinks = newPrivateLinks;
        }
        
        await savePrivateLinks();
        privateReorderMode = false;
        privateTempLinks.length = 0;
        privateReorderGroup = 'all';
        renderPrivateLinks();
        showToast('顺序已保存');
    }
};

// 拖拽功能变量
let draggedIndex = null;
let dragType = null;

function handleDragStart(e, type, idx) {
    draggedIndex = idx;
    dragType = type;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    const items = document.querySelectorAll('.link-item.draggable');
    items.forEach(item => item.classList.remove('drag-over'));
    draggedIndex = null;
    dragType = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    if (e.target.closest('.link-item.draggable')) {
        e.target.closest('.link-item.draggable').classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    if (e.target.closest('.link-item.draggable')) {
        e.target.closest('.link-item.draggable').classList.remove('drag-over');
    }
}

function handleDrop(e, type, targetIdx) {
    e.preventDefault();
    if (dragType !== type || draggedIndex === null || draggedIndex === targetIdx) return;

    const tempLinks = type === 'public' ? publicTempLinks : privateTempLinks;
    const [movedItem] = tempLinks.splice(draggedIndex, 1);
    tempLinks.splice(targetIdx, 0, movedItem);
    
    if (type === 'public') {
        renderPublicLinks();
    } else {
        renderPrivateLinks();
    }
}

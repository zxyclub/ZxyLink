const PUBLIC_GIST_ID = 'd12a422a770678dcbb46b8f8050ad2c6';
const PRIVATE_FILENAME = 'zxylink-private.json';
const TOKEN_STORAGE_KEY = 'zxylink_private_token';
const DEFAULT_AVATAR = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAGQAZADAREAAhEBAxEB/8QAHQAAAgIDAQEBAAAAAAAAAAAABAUDBgIHCAEACf/EAEAQAAEDAwMCBQIFAwMCAwkBAAEAAgMEBREGEiExQQcTIlFhFHEIMkKBoRVSkSOxwRZDCWLRGCQmMzRTY4KSov/EABoBAAMBAQEBAAAAAAAAAAAAAAABAgMEBQb/xAAjEQEBAQEAAwEBAAMBAQEBAAAAARECAxIhMUEEE1EiYXEy/9oADAMBAAIRAxEAPwD82dIaQqNRVscccbXYJ5IHZcXfkkuNePH82rxqWwUunTHTRHMoA3FYftbesivOOQe6f8TPtb2/DLbBPcp58ZIwAV5nku16fj+cuvqFvlxAfC05YmDCMFapZ5TkRXyYjIPwMIbSvRIgn2/J5TnwnznAID1gGM9kkz4lpgXy7QeCgxraJ9NUDBJa4KNM0oZDTVDXdAeCnKMY6ipgJWzMxh45QRJGAZm47lOFi/aMot1QHYP5SFfP2pvxeKG1RNccNy48nhbI/YdUFhbndt4TxnfiwUNsETcAY/ZXB7JZqJzsjOB3Vz6n2FU1rZFETtzlLD9oAuNqbUDGzLfshPsTz6Q+tmi2jDWnnjqlYXtVmptOxU0TYWMHP5nYSkLR/9IgpoS2NmCnhaoOsLJJUB5a0474Sz4fNrTmoaMQ1Lomt57rPG8IZLc6TIDclYX6aW36ammqGN8pxJKmQtbOt2hnm0AFnOPZOc0S6o2oNKOpJ3DYSrkXzVfdbDE05bgoXoCWkcXEAIVK8bAQOQpNg5m3skER9QKFR62PaCSgw0z+cAoCNjjnqlpVNG7OVOp0TTU76iQMYC5xSkLWuvGu/UOkqOMSvEta8f6cPc/PwFfM03KmodQ1F5qZJZ3k88N7Bb5iKtngnp8XfULKh7csicD0SKOtaNgiY0DgALHqytYKc/gDKyw9KbzUBsRZnlY9G5Q0VoWLRWmXzSRA1TmZc49uF28f+7rC840tqatfXXmpkcdw3EBbxlSnPVK/hcz66V/C5TYpJZCOS5ed1N6ehzf8Ay6ipwNg+y05Z0W2TC1xGsm8ppSAoS+yg9x4JB34QuVk0g90Gzc0bAQUrcCagpw9+wngpaWHNLp2UPLmctKzvSpDyhs5k/wBORvqHusrVznUVfQthJGCCOQp9qqcFN2rR9OG4zhXOi9Sig9dQG57o9h6tu6JpA3afhb+K6w6bBoLVvmyOi7Y59xZ6K2Bo5HCqRl1TGOkaO3CpP2sTRZfwMpwWYLiphtxjoqJ86iDs+lQBFPQNYMlvKQEimb1DAjAiko3PJIGFUgJr9a91K/j1YSs+CNMXnRk9RWyyCIuyeuFjjadDLH4beY4PmZj7hR6afsu1q0BTQSNd5QcR8KpxifaLTHYoo4doYAPZXiJ0o2rdHteJJGsHAz0UWNebrUlysLzUuZs7+yjFhhouZzHPEZARitJqqyvilMe3lTi5UFbYnRwbtpSxUV/6R7JcbSeUlx7WDy4+hykZc6EnJwilrEN25yoSJo4H1U4iiYXuPYJkf1Yh01bpJH4MxbkkoJxT4yalffNRVVQ95kDTtaSf9lvwdavlkLmkAZc4qkR0l4BacdRWoVEjcOfgrO9YuRu9rQAFlZ/VPd3pyVIVi91QdKQD0WHX6caa8RZm0GmakgYy09F3+GYxv65UlcXzSEnJJz/utYxQHhyV/BHUn4YgBZzxzuXB1+u3n7y6Qgd6Md1rz+M/x';

let allLinks = [];
let currentGroup = 'all';

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
    const container = document.getElementById('privateLinksGrid');
    const filteredLinks = currentGroup === 'all'
        ? allLinks
        : allLinks.filter(link => link.group === currentGroup);

    if (filteredLinks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>📂 该分组暂无链接</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredLinks.map(link => `
        <a href="${link.url}" class="link-card" target="_blank">
            <div class="card-icon">${link.icon || '🌐'}</div>
            <div class="card-content">
                <h3>${link.title}</h3>
                ${link.group ? `<span class="card-group">${link.group}</span>` : ''}
            </div>
        </a>
    `).join('');
}

async function loadPrivateLinks(token) {
    try {
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
        allLinks = JSON.parse(fileContent);

        document.getElementById('loginArea').style.display = 'none';
        document.getElementById('linksArea').style.display = 'block';

        renderCategories();
        renderLinks();
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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('avatar').src = DEFAULT_AVATAR;
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
        document.getElementById('privateToken').value = savedToken;
        loadPrivateLinks(savedToken);
    }
});

document.getElementById('privateToken').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        accessPrivate();
    }
});

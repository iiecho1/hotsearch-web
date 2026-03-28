/**
 * 热搜聚合 - 主应用逻辑
 * 支持30+平台的热搜数据展示
 */

// 平台列表 - 按类别分组，带emoji
const platforms = {
    // 搜索/门户
    search: [
        { name: '百度', emoji: '🔍' },
        { name: '搜狗', emoji: '🐶' },
        { name: '360搜索', emoji: '🛡️' },
        { name: '搜狐', emoji: '📰' },
        { name: '夸克', emoji: '⚡' }
    ],
    // 社交/社区
    social: [
        { name: '微博', emoji: '🐦' },
        { name: '知乎', emoji: '🧠' },
        { name: 'V2EX', emoji: '⌨️' },
        { name: '虎扑', emoji: '🏀' },
        { name: '豆瓣', emoji: '🎬' },
        { name: 'AcFun', emoji: '📺' },
        { name: '百度贴吧', emoji: '💬' }
    ],
    // 新闻资讯
    news: [
        { name: '今日头条', emoji: '📰' },
        { name: '澎湃新闻', emoji: '🌊' },
        { name: '新京报', emoji: '📜' },
        { name: '网易新闻', emoji: '📡' },
        { name: '腾讯新闻', emoji: '🐧' },
        { name: '人民网', emoji: '🌐' },
        { name: '南方周末', emoji: '📅' },
        { name: 'CCTV新闻', emoji: '📺' }
    ],
    // 科技
    tech: [
        { name: 'CSDN', emoji: '💻' },
        { name: 'GitHub', emoji: '🐙' },
        { name: 'IT之家', emoji: '🏠' },
        { name: '36氪', emoji: '📰' }
    ],
    // 视频/娱乐
    video: [
        { name: '哔哩哔哩', emoji: '📹' },
        { name: '抖音', emoji: '🎵' },
        { name: '梨视频', emoji: '🍐' }
    ],
    // 其他
    other: [
        { name: '少数派', emoji: '✌️' },
        { name: '懂球帝', emoji: '⚽' },
        { name: '国家地理', emoji: '🌍' },
        { name: '历史上的今天', emoji: '📚' },
        { name: '360doc', emoji: '📖' }
    ]
};

// GitHub仓库信息
const GITHUB_OWNER = 'iiecho1';
const GITHUB_REPO = 'hot_searches_for_apps';
// 使用jsdelivr CDN加速访问
const CDN_BASE = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}/archives`;

// 状态管理
const state = {
    currentPlatform: null,
    isLoading: false,
    cache: new Map()
};

// DOM元素缓存
const elements = {};

/**
 * 初始化应用
 */
function init() {
    cacheElements();
    initPlatformButtons();
    initDatePicker();
    initLoadButton();
    initKeyboardShortcuts();
    registerServiceWorker();
}

/**
 * 缓存DOM元素
 */
function cacheElements() {
    elements.platformButtons = document.getElementById('platform-buttons');
    elements.datePicker = document.getElementById('date-picker');
    elements.loadButton = document.getElementById('load-hotsearch');
    elements.hotsearchList = document.getElementById('hotsearch-list');
    elements.platformTitle = document.getElementById('current-platform-title');
    elements.dateHint = document.getElementById('date-hint');
}

/**
 * 初始化平台按钮
 */
function initPlatformButtons() {
    const fragment = document.createDocumentFragment();
    
    Object.entries(platforms).forEach(([category, platformList]) => {
        // 添加分类标签
        const categoryLabel = document.createElement('div');
        categoryLabel.className = 'category-label';
        categoryLabel.textContent = getCategoryName(category);
        fragment.appendChild(categoryLabel);
        
        // 添加平台按钮容器
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'platform-group';
        
        // 添加平台按钮
        platformList.forEach(platform => {
            const button = document.createElement('button');
            button.className = 'platform-btn';
            button.type = 'button';
            button.dataset.platform = platform.name;
            button.setAttribute('aria-pressed', 'false');
            button.innerHTML = `<span class="platform-emoji" aria-hidden="true">${platform.emoji}</span><span class="platform-name">${platform.name}</span>`;
            button.addEventListener('click', () => selectPlatform(platform.name));
            buttonGroup.appendChild(button);
        });
        
        fragment.appendChild(buttonGroup);
    });
    
    elements.platformButtons.appendChild(fragment);
}

/**
 * 获取分类名称
 */
function getCategoryName(category) {
    const names = {
        search: '🔍 搜索门户',
        social: '👥 社交社区',
        news: '📰 新闻资讯',
        tech: '💻 科技',
        video: '🎬 视频娱乐',
        other: '📌 其他'
    };
    return names[category] || category;
}

/**
 * 初始化日期选择器
 */
function initDatePicker() {
    const today = new Date();
    const formattedDate = formatDate(today);
    
    // 设置为今天
    elements.datePicker.value = formattedDate;
    
    // 移除90天限制，允许选择任意历史日期
    // 只设置最大值为今天
    elements.datePicker.max = formattedDate;
    
    // 更新提示文字
    updateDateHint();
    
    elements.datePicker.addEventListener('change', updateDateHint);
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 更新日期提示
 */
function updateDateHint() {
    if (elements.datePicker.value) {
        const selectedDate = new Date(elements.datePicker.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.floor((today - selectedDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            elements.dateHint.textContent = '今天';
        } else if (diffDays === 1) {
            elements.dateHint.textContent = '昨天';
        } else {
            elements.dateHint.textContent = `${diffDays}天前`;
        }
    }
}

/**
 * 初始化加载按钮
 */
function initLoadButton() {
    elements.loadButton.addEventListener('click', handleLoadClick);
}

/**
 * 处理加载按钮点击
 */
function handleLoadClick() {
    if (state.isLoading) return;
    loadHotSearch();
}

/**
 * 初始化键盘快捷键
 */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter 加载热搜
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!state.isLoading) {
                loadHotSearch();
            }
        }
    });
}

/**
 * 选择平台
 */
function selectPlatform(platform) {
    state.currentPlatform = platform;
    
    // 更新按钮状态 - 使用 data 属性
    document.querySelectorAll('.platform-btn').forEach(btn => {
        const isActive = btn.dataset.platform === platform;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive);
    });
    
    // 更新标题
    elements.platformTitle.textContent = `${platform} - 热搜条目`;
    
    // 如果已选择日期，自动加载
    if (elements.datePicker.value) {
        loadHotSearch();
    }
}

/**
 * 加载热搜数据
 */
async function loadHotSearch() {
    if (!state.currentPlatform) {
        showMessage('请先选择一个平台', 'warning');
        return;
    }
    
    const selectedDate = elements.datePicker.value;
    if (!selectedDate) {
        showMessage('请选择日期', 'warning');
        return;
    }
    
    // 检查缓存
    const cacheKey = `${state.currentPlatform}-${selectedDate}`;
    if (state.cache.has(cacheKey)) {
        displayHotSearch(state.cache.get(cacheKey));
        return;
    }
    
    // 设置加载状态
    setLoading(true);
    
    try {
        // 构建文件路径
        const [year, month] = selectedDate.split('-');
        const platformPath = encodeURIComponent(state.currentPlatform);
        const filePath = `${platformPath}/${year}/${month}/${selectedDate}.md`;
        const url = `${CDN_BASE}/${filePath}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(getErrorMessage(response.status));
        }
        
        const content = await response.text();
        
        // 解析热搜数据
        const hotsearchItems = parseHotSearch(content);
        
        // 缓存结果
        state.cache.set(cacheKey, hotsearchItems);
        
        // 限制缓存大小
        if (state.cache.size > 50) {
            const firstKey = state.cache.keys().next().value;
            state.cache.delete(firstKey);
        }
        
        // 显示热搜
        displayHotSearch(hotsearchItems);
        
    } catch (error) {
        console.error('加载热搜失败:', error);
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

/**
 * 获取错误消息
 */
function getErrorMessage(status) {
    const messages = {
        404: '所选日期暂无热搜记录，请选择其他日期',
        403: '所选日期暂无热搜记录，请选择其他日期',
        500: '服务器错误，请稍后重试'
    };
    return messages[status] || '加载失败，请检查网络连接';
}

/**
 * 解析热搜数据
 */
function parseHotSearch(content) {
    const lines = content.split('\n');
    const items = [];
    
    // 匹配格式: + [标题](链接)
    const regex = /\+\s*\[(.*?)\]\((.*?)\)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
        items.push({
            title: match[1],
            link: match[2]
        });
    }
    
    return items;
}

/**
 * 显示热搜
 */
function displayHotSearch(items) {
    if (items.length === 0) {
        elements.hotsearchList.innerHTML = '<p class="placeholder">该日期没有热搜数据</p>';
        return;
    }
    
    const html = items.map((item, index) => {
        const rankClass = getRankClass(index);
        const rank = index + 1;
        
        return `
            <article class="hotsearch-item" data-rank="${rank}">
                <span class="${rankClass}" aria-label="第${rank}名">${rank}</span>
                <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(item.title)}">
                    ${escapeHtml(item.title)}
                </a>
            </article>
        `;
    }).join('');
    
    elements.hotsearchList.innerHTML = html;
}

/**
 * 获取排名样式类
 */
function getRankClass(index) {
    if (index === 0) return 'rank top1';
    if (index === 1) return 'rank top2';
    if (index === 2) return 'rank top3';
    return 'rank';
}

/**
 * HTML转义，防止XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 设置加载状态
 */
function setLoading(loading) {
    state.isLoading = loading;
    
    if (loading) {
        elements.hotsearchList.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>正在加载热搜数据...</p>
            </div>
        `;
        elements.loadButton.classList.add('loading');
        elements.loadButton.disabled = true;
    } else {
        elements.loadButton.classList.remove('loading');
        elements.loadButton.disabled = false;
    }
}

/**
 * 显示消息
 */
function showMessage(message, type = 'info') {
    elements.hotsearchList.innerHTML = `
        <div class="message message-${type}">
            <span class="message-icon">${type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span class="message-text">${escapeHtml(message)}</span>
        </div>
    `;
}

/**
 * 显示错误
 */
function showError(message) {
    elements.hotsearchList.innerHTML = `
        <div class="error">
            <span class="error-icon">❌</span>
            <span class="error-message">${escapeHtml(message)}</span>
            <button class="retry-btn" onclick="loadHotSearch()">重试</button>
        </div>
    `;
}

/**
 * 注册Service Worker (PWA支持)
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker注册成功:', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker注册失败:', error);
            });
    }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 导出全局函数供重试按钮使用
window.loadHotSearch = loadHotSearch;

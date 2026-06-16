/**
 * 热搜聚合 — 主应用逻辑
 * 支持30+平台的热搜数据展示
 */

const platforms = {
  search: [
    { name: '百度', emoji: '🔍' },
    { name: '搜狗', emoji: '🐶' },
    { name: '360搜索', emoji: '🛡️' },
    { name: '搜狐', emoji: '📰' },
    { name: '夸克', emoji: '⚡' },
  ],
  social: [
    { name: '微博', emoji: '🐦' },
    { name: '知乎', emoji: '🧠' },
    { name: 'V2EX', emoji: '⌨️' },
    { name: '虎扑', emoji: '🏀' },
    { name: '豆瓣', emoji: '🎬' },
    { name: 'AcFun', emoji: '📺' },
    { name: '百度贴吧', emoji: '💬' },
  ],
  news: [
    { name: '今日头条', emoji: '📰' },
    { name: '澎湃新闻', emoji: '🌊' },
    { name: '新京报', emoji: '📜' },
    { name: '网易新闻', emoji: '📡' },
    { name: '腾讯新闻', emoji: '🐧' },
    { name: '人民网', emoji: '🌐' },
    { name: '南方周末', emoji: '📅' },
    { name: 'CCTV新闻', emoji: '📺' },
  ],
  tech: [
    { name: 'CSDN', emoji: '💻' },
    { name: 'GitHub', emoji: '🐙' },
    { name: 'IT之家', emoji: '🏠' },
    { name: '36氪', emoji: '📰' },
  ],
  video: [
    { name: '哔哩哔哩', emoji: '📹' },
    { name: '抖音', emoji: '🎵' },
    { name: '梨视频', emoji: '🍐' },
  ],
  other: [
    { name: '少数派', emoji: '✌️' },
    { name: '懂球帝', emoji: '⚽' },
    { name: '国家地理', emoji: '🌍' },
    { name: '历史上的今天', emoji: '📚' },
  ],
};

const GITHUB_OWNER = 'iiecho1';
const GITHUB_REPO = 'hot_searches_for_apps';
const CDN_BASE = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}/archives`;

const state = {
  currentPlatform: null,
  isLoading: false,
  cache: new Map(),
};

const elements = {};

function init() {
  cacheElements();
  setMastheadDate();
  initPlatformButtons();
  initDatePicker();
  initLoadButton();
  initKeyboardShortcuts();
  initBackToTop();
  registerServiceWorker();
}

function cacheElements() {
  elements.platformGrid = document.getElementById('platform-grid');
  elements.datePicker = document.getElementById('date-picker');
  elements.loadButton = document.getElementById('load-hotsearch');
  elements.hotsearchList = document.getElementById('hotsearch-list');
  elements.resultsMeta = document.getElementById('results-meta');
  elements.dateHint = document.getElementById('date-hint');
  elements.mastheadDate = document.getElementById('masthead-date');
  elements.platformCount = document.getElementById('platform-count');
}

function setMastheadDate() {
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const w = weekdays[now.getDay()];
  elements.mastheadDate.textContent = `${y}年${m}月${d}日 星期${w}`;
}

function initPlatformButtons() {
  const fragment = document.createDocumentFragment();
  let totalCount = 0;

  Object.entries(platforms).forEach(([category, list]) => {
    const label = document.createElement('div');
    label.className = 'category-label';
    label.textContent = getCategoryName(category);
    fragment.appendChild(label);

    const group = document.createElement('div');
    group.className = 'platform-group';
    group.style.display = 'contents';

    list.forEach((p) => {
      totalCount++;
      const btn = document.createElement('button');
      btn.className = 'platform-btn';
      btn.type = 'button';
      btn.dataset.platform = p.name;
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = `<span class="platform-emoji" aria-hidden="true">${p.emoji}</span><span class="platform-name">${p.name}</span>`;
      btn.addEventListener('click', () => selectPlatform(p.name));
      group.appendChild(btn);
    });

    fragment.appendChild(group);
  });

  elements.platformGrid.appendChild(fragment);
  elements.platformCount.textContent = `${totalCount} 个平台`;
}

function getCategoryName(category) {
  const names = {
    search: '搜索 · 门户',
    social: '社交 · 社区',
    news: '新闻 · 资讯',
    tech: '科技',
    video: '视频 · 娱乐',
    other: '其他',
  };
  return names[category] || category;
}

function initDatePicker() {
  const today = new Date();
  elements.datePicker.value = formatDate(today);
  elements.datePicker.max = formatDate(today);
  updateDateHint();
  elements.datePicker.addEventListener('change', updateDateHint);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function updateDateHint() {
  if (!elements.datePicker.value) {
    elements.dateHint.textContent = '';
    return;
  }
  const selected = new Date(elements.datePicker.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selected.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - selected) / 86400000);

  if (diff === 0) elements.dateHint.textContent = '今天';
  else if (diff === 1) elements.dateHint.textContent = '昨天';
  else elements.dateHint.textContent = `${diff} 天前`;
}

function initLoadButton() {
  elements.loadButton.addEventListener('click', handleLoadClick);
}

function handleLoadClick() {
  if (state.isLoading) return;
  loadHotSearch();
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!state.isLoading) loadHotSearch();
    }
  });
}

function selectPlatform(platform) {
  state.currentPlatform = platform;

  document.querySelectorAll('.platform-btn').forEach((btn) => {
    const isActive = btn.dataset.platform === platform;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });

  if (elements.datePicker.value) loadHotSearch();
}

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

  const cacheKey = `${state.currentPlatform}-${selectedDate}`;
  if (state.cache.has(cacheKey)) {
    displayHotSearch(state.cache.get(cacheKey));
    return;
  }

  setLoading(true);

  try {
    const [year, month] = selectedDate.split('-');
    const platformPath = encodeURIComponent(state.currentPlatform);
    const filePath = `${platformPath}/${year}/${month}/${selectedDate}.md`;
    const url = `${CDN_BASE}/${filePath}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(getErrorMessage(response.status));

    const content = await response.text();
    const items = parseHotSearch(content);

    state.cache.set(cacheKey, items);
    if (state.cache.size > 50) {
      const firstKey = state.cache.keys().next().value;
      state.cache.delete(firstKey);
    }

    displayHotSearch(items);
  } catch (error) {
    console.error('加载热搜失败:', error);
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

function getErrorMessage(status) {
  const messages = {
    404: '所选日期暂无热搜记录，请选择其他日期',
    403: '所选日期暂无热搜记录，请选择其他日期',
    500: '服务器错误，请稍后重试',
  };
  return messages[status] || '加载失败，请检查网络连接';
}

function parseHotSearch(content) {
  const items = [];
  const regex = /\+\s*\[(.*?)\]\((.*?)\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    items.push({ title: match[1], link: match[2] });
  }
  return items;
}

function displayHotSearch(items) {
  elements.resultsMeta.textContent = items.length ? `${items.length} 条` : '';

  if (items.length === 0) {
    elements.hotsearchList.innerHTML =
      '<div class="empty-state"><p class="empty-text">该日期没有热搜数据</p></div>';
    return;
  }

  const html = items
    .map((item, i) => {
      const rank = i + 1;
      const rankClass = i < 3 ? `rank top${i + 1}` : 'rank';
      return `<article class="hotsearch-item" style="--i:${i}">
        <span class="${rankClass}" aria-label="第${rank}名">${rank}</span>
        <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</a>
      </article>`;
    })
    .join('');

  elements.hotsearchList.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setLoading(loading) {
  state.isLoading = loading;

  if (loading) {
    elements.hotsearchList.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>正在加载…</p>
      </div>`;
    elements.loadButton.disabled = true;
  } else {
    elements.loadButton.disabled = false;
  }
}

function showMessage(message, type = 'info') {
  elements.hotsearchList.innerHTML = `
    <div class="message message-${type}">
      <span>${type === 'warning' ? '⚠' : 'ℹ'}</span>
      <span>${escapeHtml(message)}</span>
    </div>`;
}

function showError(message) {
  elements.hotsearchList.innerHTML = `
    <div class="error">
      <span class="error-icon">✕</span>
      <span class="error-message">${escapeHtml(message)}</span>
      <button class="retry-btn" onclick="loadHotSearch()">重试</button>
    </div>`;
}

function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener(
    'scroll',
    () => btn.classList.toggle('visible', window.scrollY > 300),
    { passive: true }
  );

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('sw.js')
      .then((r) => console.log('SW registered:', r.scope))
      .catch((e) => console.log('SW failed:', e));
  }
}

document.addEventListener('DOMContentLoaded', init);
window.loadHotSearch = loadHotSearch;

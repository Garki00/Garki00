const PAGE_SIZE = 20;
const MANIFEST_URL = './json/articles.json';

let allArticles = [];
let currentPage = 1;

document.addEventListener('DOMContentLoaded', function () {
    loadArticles();
});

async function loadArticles() {
    const listEl = document.getElementById('articleList');
    listEl.setAttribute('aria-busy', 'true');
    document.getElementById('pagination').replaceChildren();
    listEl.innerHTML = '<p class="state-msg">加载中...</p>';
    document.getElementById('articleCount').textContent = '正在翻开目录…';
    try {
        const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
        if (!res.ok) throw new Error('manifest fetch failed: ' + res.status);
        const data = await res.json();

        allArticles = (Array.isArray(data) ? data : []).slice().sort((a, b) => {
            // 按日期倒序，日期缺失的排在最后
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date) - new Date(a.date);
        });

        if (allArticles.length === 0) {
            listEl.innerHTML = '<p class="state-msg">暂时还没有文章</p>';
            document.getElementById('articleCount').textContent = '共 0 篇';
            return;
        }

        currentPage = getPageFromUrl();
        renderPage(currentPage);
    } catch (err) {
        console.error(err);
        listEl.innerHTML = '<p class="state-msg">目录暂时未能打开，请稍后再试。</p>';
        const retry = document.createElement('button');
        retry.className = 'retry-button';
        retry.textContent = '重新加载';
        retry.addEventListener('click', loadArticles);
        listEl.appendChild(retry);
        document.getElementById('articleCount').textContent = '加载失败';
    } finally {
        listEl.setAttribute('aria-busy', 'false');
    }
}

function getPageFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const p = parseInt(params.get('page'), 10);
    const totalPages = Math.max(1, Math.ceil(allArticles.length / PAGE_SIZE));
    if (!p || p < 1) return 1;
    if (p > totalPages) return totalPages;
    return p;
}

function renderPage(page) {
    const listEl = document.getElementById('articleList');
    const totalPages = Math.max(1, Math.ceil(allArticles.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, page), totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = allArticles.slice(start, start + PAGE_SIZE);

    listEl.innerHTML = '';
    pageItems.forEach((article, i) => {
        listEl.appendChild(buildArticleItem(article, start + i + 1));
    });

    renderPagination(totalPages);
    document.getElementById('articleCount').textContent = `共 ${allArticles.length} 篇 · 第 ${currentPage} / ${totalPages} 页`;

    const url = new URL(window.location.href);
    if (currentPage === 1) {
        url.searchParams.delete('page');
    } else {
        url.searchParams.set('page', currentPage);
    }
    window.history.replaceState({}, '', url);
}

function buildArticleItem(article, indexNumber) {
    const a = document.createElement('a');
    a.className = 'article-item';
    a.href = `article.html?id=${encodeURIComponent(article.id)}`;

    const indexEl = document.createElement('div');
    indexEl.className = 'item-index';
    indexEl.textContent = String(indexNumber).padStart(2, '0');

    const body = document.createElement('div');
    body.className = 'item-body';

    const title = document.createElement('h3');
    title.className = 'item-title';
    title.textContent = article.title || '无标题';

    const excerpt = document.createElement('div');
    excerpt.className = 'item-excerpt';
    excerpt.textContent = article.excerpt || '';

    body.appendChild(title);
    body.appendChild(excerpt);

    const date = document.createElement('time');
    date.className = 'item-date';
    date.textContent = article.date || '';
    if (article.date) date.dateTime = article.date;

    const arrow = document.createElement('span');
    arrow.className = 'item-arrow';
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');

    a.appendChild(indexEl);
    a.appendChild(body);
    a.appendChild(date);
    a.appendChild(arrow);

    // 触摸反馈（移动端 touch 无 hover 效果，手动补上）
    a.addEventListener('touchstart', function () {
        a.classList.add('is-touched');
    }, { passive: true });
    a.addEventListener('touchend', function () {
        setTimeout(() => a.classList.remove('is-touched'), 150);
    });
    a.addEventListener('touchcancel', function () {
        a.classList.remove('is-touched');
    });

    return a;
}

function renderPagination(totalPages) {
    const paginationEl = document.getElementById('pagination');
    paginationEl.innerHTML = '';

    if (totalPages <= 1) return;

    paginationEl.appendChild(makePageButton('←', currentPage - 1, currentPage === 1, false, '上一页'));

    const pages = getPageNumbersToShow(currentPage, totalPages);
    pages.forEach(p => {
        if (p === '...') {
            const span = document.createElement('span');
            span.className = 'page-ellipsis';
            span.textContent = '...';
            paginationEl.appendChild(span);
        } else {
            const btn = makePageButton(String(p), p, false, p === currentPage);
            paginationEl.appendChild(btn);
        }
    });

    paginationEl.appendChild(makePageButton('→', currentPage + 1, currentPage === totalPages, false, '下一页'));
}

function makePageButton(label, targetPage, disabled, isActive, accessibleLabel) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (isActive ? ' is-active' : '');
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('aria-label', accessibleLabel || `第 ${targetPage} 页`);
    btn.title = accessibleLabel || `第 ${targetPage} 页`;
    if (isActive) btn.setAttribute('aria-current', 'page');
    btn.disabled = !!disabled;
    btn.addEventListener('click', () => {
        renderPage(targetPage);
        document.querySelector('.catalog-collection').scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
            block: 'start'
        });
        document.querySelector('.page-btn.is-active')?.focus({ preventScroll: true });
    });
    return btn;
}

function getPageNumbersToShow(current, total) {
    const delta = 1;
    const range = [];
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
            range.push(i);
        } else if (range[range.length - 1] !== '...') {
            range.push('...');
        }
    }
    return range;
}

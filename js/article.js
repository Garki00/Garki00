const MANIFEST_URL = './json/articles.json';
const DOC_DIR = './doc/';

document.addEventListener('DOMContentLoaded', loadArticle);

async function loadArticle() {
    const id = new URLSearchParams(window.location.search).get('id');
    const titleEl = document.getElementById('articleTitle');
    const metaEl = document.getElementById('articleMeta');
    const contentEl = document.getElementById('articleContent');

    titleEl.textContent = '加载中...';
    metaEl.replaceChildren();
    contentEl.classList.remove('is-plain-text');
    contentEl.setAttribute('aria-busy', 'true');
    contentEl.innerHTML = '<p class="state-msg" role="status">正在读取文章内容...</p>';

    try {
        if (!id) {
            showArticleError('未指定文章', '请返回目录，选择一篇文章。', false);
            return;
        }

        const manifestRes = await fetch(MANIFEST_URL, { cache: 'no-cache' });
        if (!manifestRes.ok) throw new Error('manifest fetch failed');
        const articles = await manifestRes.json();
        const article = (Array.isArray(articles) ? articles : []).find(a => String(a.id) === id);

        if (!article) {
            showArticleError('未找到文章', '这一页暂时不在目录里，去看看其他篇章吧。', false);
            return;
        }

        titleEl.textContent = article.title || '无标题';
        if (article.date) {
            const date = document.createElement('time');
            date.dateTime = article.date;
            date.textContent = article.date;
            metaEl.appendChild(date);
        }
        if (article.tag) {
            const tag = document.createElement('span');
            tag.className = 'article-tag';
            tag.textContent = article.tag;
            metaEl.appendChild(tag);
        }

        const mdRes = await fetch(DOC_DIR + article.file, { cache: 'no-cache' });
        if (!mdRes.ok) throw new Error('markdown fetch failed: ' + mdRes.status);
        const mdText = await mdRes.text();

        if (window.marked) {
            contentEl.innerHTML = window.marked.parse(mdText);
            // Keep wide Markdown tables within the reading column.
            contentEl.querySelectorAll('table').forEach(table => {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-scroll';
                wrapper.tabIndex = 0;
                wrapper.setAttribute('role', 'region');
                wrapper.setAttribute('aria-label', '文章表格');
                table.before(wrapper);
                wrapper.appendChild(table);
            });
        } else {
            contentEl.classList.add('is-plain-text');
            contentEl.textContent = mdText;
        }
        document.title = (article.title || '文章阅览') + ' · The Spring Archive';
    } catch (err) {
        console.error(err);
        showArticleError('加载失败', '文章暂时未能打开，请稍后再试。', true);
    } finally {
        contentEl.setAttribute('aria-busy', 'false');
    }
}

function showArticleError(title, message, canRetry) {
    document.getElementById('articleTitle').textContent = title;
    document.title = title + ' · The Spring Archive';
    document.getElementById('articleMeta').replaceChildren();
    const contentEl = document.getElementById('articleContent');
    contentEl.classList.remove('is-plain-text');
    const error = document.createElement('p');
    error.className = 'error-msg';
    error.setAttribute('role', 'alert');
    error.textContent = message;
    contentEl.replaceChildren(error);
    if (canRetry) {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'retry-button';
        retry.textContent = '重新加载';
        retry.addEventListener('click', loadArticle);
        contentEl.appendChild(retry);
    }
}

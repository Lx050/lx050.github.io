/* CourtyardReading: isolated, lazy, text-only reading room. No dependencies. */
(function (global) {
  'use strict';
  let installed = null;
  const COVERAGE = {
    anonymized: ['匿名化改编', '本馆按原作章节呈现经授权的匿名化改编；人物身份线索已处理，并非逐字原文。'],
    'privacy-edited': ['正文 · 局部隐私处理', '保留原作正文，仅局部隐去与受保护人物有关的身份线索；不标为逐字复录。'],
    'full-text': ['正文存档', '本馆收录经整理的原文正文。来源与收录范围见下方说明。'],
    excerpt: ['原文节选', '本馆收录部分原文，不代表原站的全部内容。'],
    summary: ['内容摘要', '本馆收录对公开内容的整理摘要，不是原文全文。'],
    'entrance-only': ['入口说明', '目前仅能确认公开入口；登录后的内容未收录，也未在庭院中复现。'],
    unknown: ['收录范围待核实', '以下为已收录的文字；尚未确认是否覆盖原文全文。']
  };

  function text(value, fallback) { return (typeof value === 'string' ? value.trim() : '') || fallback || ''; }
  function externalURL(value) {
    try {
      const raw = typeof value === 'object' && value ? value.url : value;
      if (typeof raw !== 'string' || !/^https:\/\//i.test(raw.trim())) return null;
      const url = new URL(raw.trim());
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch (_) { return null; }
  }
  function staticURL(value, base, directory) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('没有可读取的文本文件。');
    const url = new URL(value, base);
    if (url.origin !== global.location.origin || url.username || url.password ||
        !/\.json$/i.test(url.pathname) || (url.search && !/^\?v=[a-f0-9]{16,64}$/.test(url.search)) || url.hash ||
        (directory && !url.pathname.startsWith(directory))) {
      throw new Error('文本文件地址不符合本站静态内容规则。');
    }
    return url.href;
  }
  function normalizeReading(raw, index, fallback) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.index !== index || !Array.isArray(raw.sections)) {
      throw new Error('这份文本的格式或建筑编号不匹配。');
    }
    const seen = new Set();
    const sections = raw.sections.map(function (item, n) {
      if (!item || typeof item !== 'object' || !Array.isArray(item.paragraphs) || item.paragraphs.some(p => typeof p !== 'string')) {
        throw new Error('篇章正文格式不完整。');
      }
      const id = text(item.id, 'section-' + (n + 1));
      if (seen.has(id)) throw new Error('篇章编号重复。');
      seen.add(id);
      const tables = item.tables == null ? [] : item.tables;
      if (!Array.isArray(tables) || tables.some(table => !table || !Array.isArray(table.columns) || !table.columns.length ||
          table.columns.some(cell => typeof cell !== 'string') || !Array.isArray(table.rows) ||
          table.rows.some(row => !Array.isArray(row) || row.some(cell => typeof cell !== 'string')))) {
        throw new Error('篇章表格格式不完整。');
      }
      return { id, title: text(item.title, '第 ' + (n + 1) + ' 篇'), sourceSideLabel:text(item.sourceSideLabel), source: externalURL(item.source),
        paragraphs: item.paragraphs.map(p => p.trim()),
        tables: tables.map(table => ({ caption: text(table.caption), columns: table.columns.slice(), rows: table.rows.map(row => row.slice()),
          afterParagraphIndex: Number.isInteger(table.afterParagraphIndex) && table.afterParagraphIndex >= 0 && table.afterParagraphIndex < item.paragraphs.length ? table.afterParagraphIndex : null })) };
    });
    const coverage = Object.prototype.hasOwnProperty.call(COVERAGE, raw.coverage) ? raw.coverage : 'unknown';
    const notes = Array.isArray(raw.coverageNotes) ? raw.coverageNotes.filter(v => typeof v === 'string') : [text(raw.coverageNotes)].filter(Boolean);
    return {
      index, title: text(raw.title, text(fallback && fallback.title, '庭中阅览')),
      source: ['anonymized','privacy-edited'].includes(raw.coverage) ? null : externalURL(raw.source) || externalURL(fallback && fallback.url),
      access: text(raw.access), reviewedAt: text(raw.reviewedAt), summary: text(raw.summary), attribution: text(raw.attribution),
      provenance: raw.provenance && typeof raw.provenance === 'object' && !Array.isArray(raw.provenance) ? {
        publicPage: externalURL(raw.provenance.publicPage), sourceFile: externalURL(raw.provenance.sourceFile),
        attribution: text(raw.provenance.publicTextAttribution), sourceLiveTextMatch: raw.provenance.sourceLiveTextMatch === true
      } : null,
      coverage, coverageNotes: notes, sections,
      wordCount: Number.isFinite(raw.wordCount) && raw.wordCount >= 0 ? raw.wordCount : null
    };
  }
  function manifestPath(manifest, index) {
    const list = manifest && (manifest.entries || manifest.readings || manifest.buildings || manifest);
    if (Array.isArray(list)) {
      const entry = list.find(item => item && typeof item === 'object' && item.index === index);
      if (entry) return entry.path || entry.file || entry.url;
      return typeof list[index] === 'string' ? list[index] : null;
    }
    const entry = list && typeof list === 'object' ? list[index] : null;
    return typeof entry === 'string' ? entry : entry && (entry.path || entry.file || entry.url);
  }
  function node(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  }
  function button(className, value) { const el = node('button', className, value); el.type = 'button'; return el; }
  function link(className, value, url) {
    const el = node('a', className, value); el.href = url; el.target = '_blank'; el.rel = 'noopener noreferrer';
    el.setAttribute('aria-label', value + '（在新标签页打开）'); return el;
  }
  function highlighted(parent, value, query) {
    if (!query) { parent.textContent = value; return; }
    const haystack = value.toLocaleLowerCase(), needle = query.toLocaleLowerCase();
    let at = 0, found = haystack.indexOf(needle), matches = 0;
    while (found !== -1 && matches++ < 500) {
      parent.append(document.createTextNode(value.slice(at, found)), node('mark', 'cr-match', value.slice(found, found + query.length)));
      at = found + query.length; found = haystack.indexOf(needle, at);
    }
    parent.append(document.createTextNode(value.slice(at)));
  }

  function install(options) {
    if (installed) return installed;
    options = options || {};
    const entries = Array.isArray(options.entries) ? options.entries : [];
    const manifestUrl = staticURL(options.manifestUrl || './assets/readings/index.json', document.baseURI);
    const manifestDirectory = new URL('.', manifestUrl).pathname;
    const cache = new Map();
    let manifest = null, opened = false, index = null, data = null, sectionIndex = 0;
    let token = 0, controller = null, returnFocus = null, query = '', historyOwned = false;
    let fallbackInert = [], historyClosing = false;
    const historyKey = 'courtyard-reading-' + Date.now().toString(36);
    const dialog = node('dialog', 'cr-dialog');
    dialog.id = 'courtyard-reading'; dialog.setAttribute('aria-labelledby', 'cr-title');
    dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('lang', 'zh-CN');
    const shell = node('div', 'cr-shell');
    const head = node('header', 'cr-header');
    const headingGroup = node('div', 'cr-heading-group');
    const kicker = node('p', 'cr-kicker', '庭中阅览');
    const title = node('h2', 'cr-title', '庭中阅览'); title.id = 'cr-title';
    const metadata = node('div', 'cr-metadata');
    const exitButton = button('cr-close', '返回庭院'); exitButton.setAttribute('aria-label', '关闭阅览，返回庭院（Esc）');
    exitButton.append(node('span', 'cr-escape', 'Esc'));
    headingGroup.append(kicker, title, metadata); head.append(headingGroup, exitButton);
    const body = node('div', 'cr-body');
    const aside = node('aside', 'cr-sidebar');
    const chapterHeading = node('h3', 'cr-nav-heading', '篇章');
    const nav = node('nav', 'cr-chapters'); nav.setAttribute('aria-label', '阅读篇章');
    const sidebarNote = node('p', 'cr-sidebar-note', '在庭中停一会儿，读完再出发。');
    aside.append(chapterHeading, nav, sidebarNote);
    const main = node('div', 'cr-main');
    const toolbar = node('div', 'cr-toolbar');
    const mobileLabel = node('label', 'cr-mobile-chapters', '篇章');
    const chapterSelect = node('select', 'cr-chapter-select'); chapterSelect.setAttribute('aria-label', '选择阅读篇章');
    mobileLabel.append(chapterSelect);
    const searchForm = node('form', 'cr-search'); searchForm.setAttribute('role', 'search');
    const searchLabel = node('label', 'cr-sr-only', '搜索本馆收录的正文'); searchLabel.htmlFor = 'cr-search';
    const searchInput = node('input', 'cr-search-input'); searchInput.id = 'cr-search'; searchInput.type = 'search';
    searchInput.placeholder = '搜索本馆正文'; searchInput.maxLength = 100; searchInput.autocomplete = 'off';
    const searchButton = button('cr-search-button', '查找'); searchButton.type = 'submit';
    searchForm.append(searchLabel, searchInput, searchButton); toolbar.append(mobileLabel, searchForm);
    const scroll = node('div', 'cr-scroll'); scroll.tabIndex = 0; scroll.setAttribute('aria-label', '正文阅读区');
    const status = node('p', 'cr-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const results = node('section', 'cr-results'); results.hidden = true; results.setAttribute('aria-label', '正文搜索结果');
    const article = node('article', 'cr-article');
    const footer = node('footer', 'cr-footer');
    const prevButton = button('cr-page-button cr-prev', '← 上一篇');
    const position = node('span', 'cr-position'); position.setAttribute('aria-live', 'polite');
    const nextButton = button('cr-page-button cr-next', '下一篇 →');
    footer.append(prevButton, position, nextButton); scroll.append(status, results, article);
    main.append(toolbar, scroll, footer); body.append(aside, main); shell.append(head, body); dialog.append(shell);
    document.body.append(dialog);

    function notify(name) {
      if (typeof options[name] === 'function') {
        try { options[name].apply(null, Array.prototype.slice.call(arguments, 1)); }
        catch (error) { console.error('CourtyardReading ' + name + ' callback:', error); }
      }
    }
    function setStatus(message, busy) {
      status.textContent = message; status.hidden = !message;
      article.setAttribute('aria-busy', busy ? 'true' : 'false');
    }
    function resetView() {
      data = null; query = ''; sectionIndex = 0; searchInput.value = '';
      nav.replaceChildren(); chapterSelect.replaceChildren(); article.replaceChildren(); metadata.replaceChildren();
      results.replaceChildren(); results.hidden = true; footer.hidden = true;
      toolbar.hidden = true; chapterHeading.textContent = '篇章'; scroll.scrollTop = 0;
    }
    function historyState(sectionId) {
      return Object.assign({}, global.history.state && typeof global.history.state === 'object' ? global.history.state : {},
        { __courtyardReading: historyKey, __courtyardReadingEntry: { index, sectionId: sectionId || null } });
    }
    function updateHistory(sectionId) {
      if (global.history.state && global.history.state.__courtyardReading === historyKey) {
        try { global.history.replaceState(historyState(sectionId), ''); } catch (_) {}
      }
    }
    function openModal(fromHistory) {
      returnFocus = document.activeElement;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else {
        dialog.setAttribute('open', '');
        fallbackInert = Array.from(document.body.children).filter(el => el !== dialog).map(el => [el, el.inert]);
        fallbackInert.forEach(([el]) => { el.inert = true; });
      }
      document.body.classList.add('courtyard-reading-open');
      exitButton.focus({ preventScroll: true });
      // A single history entry lets the browser's Back action dismiss the room.
      // Page URL and the host's existing history state are preserved.
      try {
        if (fromHistory) historyOwned = true;
        else if (!historyClosing) {
          global.history.pushState(historyState(null), ''); historyOwned = true;
        }
      } catch (_) { historyOwned = false; }
    }
    async function getJSON(url, signal) {
      const response = await fetch(url, { signal, mode: 'same-origin', credentials: 'omit', redirect: 'error', cache: 'no-cache' });
      if (!response.ok) throw new Error(response.status === 404 ? '本站尚未收录这份文本。' : '文本暂时无法载入，请稍后重试。');
      const contentType = response.headers.get('content-type') || '';
      if (contentType && !/\bjson\b/i.test(contentType)) throw new Error('服务器返回的不是文本数据。');
      return response.json();
    }
    async function open(nextIndex, sectionId, fromHistory) {
      if (!Number.isInteger(nextIndex) || nextIndex < 0 || (entries.length && nextIndex >= entries.length)) return false;
      const request = ++token;
      if (controller) controller.abort();
      controller = new AbortController();
      const signal = controller.signal;
      const wasOpen = opened;
      index = nextIndex; opened = true; resetView();
      title.textContent = text(entries[index] && entries[index].title, '庭中阅览');
      kicker.textContent = '庭中阅览 · ' + String(index + 1).padStart(2, '0');
      setStatus('正在翻开本馆的文字…', true);
      if (!wasOpen) openModal(fromHistory);
      updateHistory(sectionId);
      notify('onOpen', index);
      try {
        let reading = cache.get(index);
        if (!reading) {
          const loadedManifest = manifest || await getJSON(manifestUrl, signal);
          if (request !== token || !opened) return false;
          manifest = loadedManifest;
          const path = manifestPath(manifest, nextIndex);
          if (!path) throw new Error('本站尚未收录这座建筑的正文。');
          const url = staticURL(path, manifestUrl, manifestDirectory);
          const raw = await getJSON(url, signal);
          if (request !== token || !opened) return false;
          reading = normalizeReading(raw, nextIndex, entries[nextIndex]);
          cache.set(nextIndex, reading);
        }
        if (request !== token || !opened) return false;
        data = reading; title.textContent = reading.title;
        renderMetadata(); renderChapters();
        toolbar.hidden = !data.sections.length;
        const requestedSection = data.sections.findIndex(section => section.id === sectionId);
        selectSection(requestedSection < 0 ? 0 : requestedSection, false);
        setStatus('', false);
        notify('onVisit', index, data);
        return true;
      } catch (error) {
        if (request !== token || !opened || error.name === 'AbortError') return false;
        setStatus('这份文字还没能打开', false);
        const explanation = node('p', 'cr-error-copy', error instanceof SyntaxError ? '文本数据暂时无法解析，请稍后重试。' : error instanceof TypeError ? '暂时无法取得本站的文本文件，请检查连接后重试。' : text(error.message, '加载失败，请稍后重试。'));
        const retry = button('cr-retry', '重新载入'); retry.addEventListener('click', () => open(nextIndex, sectionId));
        article.replaceChildren(explanation, retry);
        const source = externalURL(entries[nextIndex] && entries[nextIndex].url);
        if (source) { const sourceLine = node('p', 'cr-error-source'); sourceLine.append(link('cr-source-link', '查看原站 ↗', source)); article.append(sourceLine); }
        return false;
      }
    }
    function renderMetadata() {
      metadata.replaceChildren(node('span', 'cr-coverage-badge', COVERAGE[data.coverage][0]));
      if (data.attribution) { const byline = node('span', 'cr-byline', data.attribution); byline.title = data.attribution; metadata.append(byline); }
      if (data.reviewedAt) metadata.append(node('span', 'cr-review-date', '查阅于 ' + (/^\d{4}-\d{2}-\d{2}/.test(data.reviewedAt) ? data.reviewedAt.slice(0, 10) : data.reviewedAt)));
      if (data.source) metadata.append(link('cr-source-link', '原始来源 ↗', data.source));
    }
    function renderChapters() {
      nav.replaceChildren(); chapterSelect.replaceChildren();
      chapterHeading.textContent = '分节 · ' + data.sections.length;
      data.sections.forEach(function (section, n) {
        const item = button('cr-chapter', '');
        item.append(node('span', 'cr-chapter-number', String(n + 1).padStart(2, '0')), node('span', 'cr-chapter-name', section.title));
        item.addEventListener('click', () => selectSection(n, true)); nav.append(item);
        const option = node('option', '', section.title); option.value = n; chapterSelect.append(option);
      });
    }
    function makeCoverage() {
      const details = node('details', 'cr-coverage-details');
      details.append(node('summary', '', '收录与来源'));
      const notice = node('div', 'cr-coverage-note');
      notice.append(node('p', '', COVERAGE[data.coverage][1]));
      if (data.access) {
        const accessLabels = {
          public: '公开页面', 'public-page': '公开页面', 'live-public-rendered': '公开页面', 'public-live-reviewed': '公开页面',
          'live-public-page-and-connected-owner-repository': '公开页面及作者源文件',
          'login-required': '需登录，登录后内容未收录', 'login-limited': '仅公开入口可见', 'login-only': '仅公开入口可见',
          private: '非公开内容未收录', limited: '部分内容可见', unavailable: '原站暂不可访问'
        };
        if (Object.prototype.hasOwnProperty.call(accessLabels, data.access)) notice.append(node('p', 'cr-access', '来源访问情况：' + accessLabels[data.access]));
      }
      data.coverageNotes.forEach(note => notice.append(node('p', '', note)));
      if (data.provenance) {
        if (data.provenance.attribution) notice.append(node('p', 'cr-original-attribution', data.provenance.attribution));
        if (data.provenance.sourceLiveTextMatch) notice.append(node('p', '', '整理时已比对公开页面与文字底本。'));
        if (data.provenance.sourceFile) { const sourceLine = node('p'); sourceLine.append(link('cr-source-link', '查看文字底本 ↗', data.provenance.sourceFile)); notice.append(sourceLine); }
        if (data.provenance.publicPage && data.provenance.publicPage !== data.source) { const pageLine = node('p'); pageLine.append(link('cr-source-link', '查看公开页面 ↗', data.provenance.publicPage)); notice.append(pageLine); }
      }
      details.append(notice); return details;
    }
    function selectSection(n, focus, paragraphNumber) {
      if (!data) return;
      sectionIndex = Math.min(Math.max(0, n), Math.max(0, data.sections.length - 1));
      const section = data.sections[sectionIndex];
      updateHistory(section && section.id);
      article.replaceChildren(); article.append(makeCoverage());
      if (sectionIndex === 0 && data.summary) { const summary = node('p', 'cr-summary'); summary.append(node('span', 'cr-summary-label', '导读'), document.createTextNode(data.summary)); article.append(summary); }
      if (!section) {
        const empty = data.coverage === 'entrance-only' ? '这里暂时只有入口说明。登录后的正文不在本次收录范围内。' : '这里还没有可阅读的篇章。';
        article.append(node('p', 'cr-empty', empty)); footer.hidden = true;
        notify('onSection', index, null, data); return;
      }
      const chapterTitle = node('h3', 'cr-section-title', section.title); chapterTitle.tabIndex = -1;
      const chapterNumber = node('p', 'cr-section-number', '阅读位置 · ' + (sectionIndex + 1) + ' / ' + data.sections.length);
      article.append(chapterNumber);if(section.sourceSideLabel)article.append(node('p','cr-section-context',section.sourceSideLabel));article.append(chapterTitle);
      if (section.source && section.source !== data.source) article.append(link('cr-section-source', '本篇来源 ↗', section.source));
      if (!section.paragraphs.some(Boolean) && !section.tables.length) article.append(node('p', 'cr-empty', '本篇尚未收录正文。'));
      const tableElements = section.tables.map(function (tableData, tableIndex) {
        const wrap = node('div', 'cr-table-wrap'); wrap.tabIndex = 0;
        wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', tableData.caption || section.title + '，表格 ' + (tableIndex + 1));
        const table = node('table', 'cr-table');
        if (tableData.caption) table.append(node('caption', '', tableData.caption));
        const thead = node('thead'), headingRow = node('tr');
        tableData.columns.forEach(value => { const cell = node('th'); cell.scope = 'col'; highlighted(cell, value, query); headingRow.append(cell); });
        thead.append(headingRow); table.append(thead);
        const tbody = node('tbody');
        tableData.rows.forEach((rowData, rowIndex) => {
          const row = node('tr'); row.dataset.tableRow = tableIndex + '-' + rowIndex;
          rowData.forEach(value => { const cell = node('td'); highlighted(cell, value, query); row.append(cell); }); tbody.append(row);
        });
        table.append(tbody); wrap.append(table); return wrap;
      });
      section.paragraphs.forEach(function (paragraph, p) {
        if (paragraph) { const el = node('p', 'cr-paragraph'); el.dataset.paragraph = p; highlighted(el, paragraph, query); article.append(el); }
        section.tables.forEach((table, i) => { if (table.afterParagraphIndex === p) article.append(tableElements[i]); });
      });
      section.tables.forEach((table, i) => { if (table.afterParagraphIndex === null) article.append(tableElements[i]); });
      Array.from(nav.children).forEach(function (item, i) {
        if (i === sectionIndex) item.setAttribute('aria-current', 'true'); else item.removeAttribute('aria-current');
      });
      chapterSelect.value = sectionIndex;
      footer.hidden = false; prevButton.disabled = sectionIndex === 0; nextButton.disabled = sectionIndex === data.sections.length - 1;
      position.textContent = (sectionIndex + 1) + ' / ' + data.sections.length;
      scroll.scrollTop = 0;
      if (focus) chapterTitle.focus({ preventScroll: true });
      if (paragraphNumber !== undefined) {
        const paragraph = typeof paragraphNumber === 'number' ? article.querySelector('[data-paragraph="' + paragraphNumber + '"]') : article.querySelector('[data-table-row="' + paragraphNumber + '"]');
        if (paragraph) paragraph.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
      notify('onSection', index, section, data);
    }
    function runSearch() {
      if (!data) return;
      query = searchInput.value.trim(); results.replaceChildren(); results.hidden = !query;
      selectSection(sectionIndex, false);
      if (!query) { setStatus('', false); return; }
      const matches = [], needle = query.toLocaleLowerCase();
      data.sections.forEach((section,s)=>{const paragraph=section.title+' '+section.sourceSideLabel,at=paragraph.toLocaleLowerCase().indexOf(needle);if(at!==-1)matches.push({s,p:null,at,paragraph,title:section.title});});
      data.sections.forEach((section, s) => section.paragraphs.forEach((paragraph, p) => {
        const at = paragraph.toLocaleLowerCase().indexOf(needle);
        if (at !== -1) matches.push({ s, p, at, paragraph, title: section.title });
      }));
      data.sections.forEach((section, s) => section.tables.forEach((table, t) => table.rows.forEach((row, r) => {
        const paragraph = row.join(' · '), at = paragraph.toLocaleLowerCase().indexOf(needle);
        if (at !== -1) matches.push({ s, p: t + '-' + r, at, paragraph, title: section.title + ' · 表格' });
      })));
      const resultCount = matches.length + ' 条结果' + (matches.length > 50 ? '，显示前 50 条' : '');
      setStatus(query ? '“' + query + '”：' + resultCount : '', false);
      matches.slice(0, 50).forEach(function (match) {
        const item = button('cr-result', '');
        item.append(node('strong', 'cr-result-title', match.title));
        const start = Math.max(0, match.at - 32), excerpt = (start ? '…' : '') + match.paragraph.slice(start, match.at + query.length + 72) + (match.paragraph.length > match.at + query.length + 72 ? '…' : '');
        const snippet = node('span', 'cr-result-snippet'); highlighted(snippet, excerpt, query); item.append(snippet);
        item.addEventListener('click', () => { results.hidden = true; selectSection(match.s, true, match.p); }); results.append(item);
      });
    }
    function close(fromHistory) {
      if (!opened) return;
      const closedIndex = index;
      opened = false; ++token;
      if (controller) controller.abort();
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
      document.body.classList.remove('courtyard-reading-open');
      fallbackInert.forEach(([el, wasInert]) => { if (el.isConnected) el.inert = wasInert; }); fallbackInert = [];
      if (!fromHistory && historyOwned && global.history.state && global.history.state.__courtyardReading === historyKey) {
        historyClosing = true; global.history.back();
      }
      historyOwned = false;
      notify('onClose', closedIndex);
      if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') returnFocus.focus({ preventScroll: true });
    }
    exitButton.addEventListener('click', () => close());
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => { if (opened && !dialog.open) close(); });
    prevButton.addEventListener('click', () => selectSection(sectionIndex - 1, true));
    nextButton.addEventListener('click', () => selectSection(sectionIndex + 1, true));
    chapterSelect.addEventListener('change', () => selectSection(Number(chapterSelect.value), true));
    searchInput.addEventListener('input', runSearch);
    searchForm.addEventListener('submit', event => { event.preventDefault(); runSearch(); });
    // Stop bubbling input events so world movement/drag controls never consume reader input.
    ['keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'pointermove', 'touchstart', 'touchend', 'touchmove', 'wheel', 'click'].forEach(type => {
      dialog.addEventListener(type, event => event.stopPropagation(), { passive: type === 'touchmove' || type === 'wheel' });
    });
    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll('a[href],button:not(:disabled),input,select,summary,[tabindex="0"]')).filter(el => !el.hidden && el.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); if (last) last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); if (first) first.focus(); }
    });
    global.addEventListener('popstate', function () {
      if (historyClosing) {
        historyClosing = false;
        // If a new room was opened while history.back() was pending, retain Back-to-close.
        if (opened) {
          try { global.history.pushState(historyState(data && data.sections[sectionIndex] && data.sections[sectionIndex].id), ''); historyOwned = true; } catch (_) {}
        }
        return;
      }
      const state = global.history.state;
      if (opened && (!state || state.__courtyardReading !== historyKey)) close(true);
      else if (!opened && state && state.__courtyardReading === historyKey && state.__courtyardReadingEntry) {
        open(state.__courtyardReadingEntry.index, state.__courtyardReadingEntry.sectionId, true);
      }
    });
    installed = Object.freeze({ open, close: () => close(), get isOpen() { return opened; }, get currentIndex() { return index; } });
    return installed;
  }
  global.CourtyardReading = Object.freeze({ install });
})(window);

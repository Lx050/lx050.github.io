/* Local-only typography workshop. Text stays in this mount; no storage or requests. */
(function (global) {
  'use strict';
  let serial = 0;
  const mounted = new WeakMap();
  const PRESETS = [
    { id: 'daily', label: '日常图文', note: '清楚的标题与舒展的正文，适合日常记录。' },
    { id: 'field', label: '三下乡实践', note: '醒目的标题与紧凑的段落，适合实践报道。请自行补齐作者与来源。' },
    { id: 'winter', label: '寒假实践', note: '温和的标题与宽松的留白，适合实践总结。请自行补齐团队信息。' },
    { id: 'reprint', label: '转载校读', note: '简洁的阅读版式，方便核对引文。请保留原作者、来源与转载授权信息。' }
  ];
  const SAMPLE = '在庭院里，留一点空白\n\n我们沿街记录门窗与招牌，也把途中遇见的光影写进笔记。排版让这些片段有了可以停留的次序。\n\n文字不必挤满页面。把一段想法说清楚，再留一点空白，让读者慢慢读。\n\n文字：庭院原创排版示例';
  function element(doc, tag, className, value) {
    const el = doc.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  }
  function mount(container) {
    if (!container || container.nodeType !== 1) throw new TypeError('排版工坊需要一个容器元素。');
    const previous = mounted.get(container);
    if (previous) previous();
    const doc = container.ownerDocument;
    const id = 'ctw-' + (++serial);
    let disposed = false;
    let revision = 0;
    const root = element(doc, 'section', 'ctw-workshop');
    root.setAttribute('aria-labelledby', id + '-heading');
    const heading = element(doc, 'h2', 'ctw-heading', '本地排版试样');
    heading.id = id + '-heading';
    const intro = element(doc, 'p', 'ctw-intro', '输入文字，选一种版式，随时校看。内容仅留在本次打开的工坊里，关闭后不保存；不会上传或发布。');
    const layout = element(doc, 'div', 'ctw-layout');
    const controls = element(doc, 'div', 'ctw-controls');
    const label = element(doc, 'label', 'ctw-label', '1 · 输入文字');
    label.htmlFor = id + '-input';
    const hint = element(doc, 'p', 'ctw-hint', '第一行作标题，空行分段，段内换行保留。以下是可直接修改的原创示例；HTML 和 Markdown 均按原样显示。');
    hint.id = id + '-hint';
    const input = element(doc, 'textarea', 'ctw-input');
    input.id = id + '-input';
    input.rows = 12;
    input.value = SAMPLE;
    input.setAttribute('aria-describedby', hint.id);
    input.spellcheck = false;
    const presetLabel = element(doc, 'label', 'ctw-label', '2 · 选择版式');
    presetLabel.htmlFor = id + '-preset';
    const select = element(doc, 'select', 'ctw-select');
    select.id = id + '-preset';
    PRESETS.forEach(function (preset) {
      const option = element(doc, 'option', '', preset.label);
      option.value = preset.id;
      select.appendChild(option);
    });
    const note = element(doc, 'p', 'ctw-hint');
    note.id = id + '-preset-note';
    select.setAttribute('aria-describedby', note.id);
    const output = element(doc, 'div', 'ctw-output');
    const previewLabel = element(doc, 'h3', 'ctw-label', '3 · 实时预览');
    previewLabel.id = id + '-preview-label';
    const preview = element(doc, 'article', 'ctw-preview');
    preview.setAttribute('aria-labelledby', previewLabel.id);
    preview.tabIndex = 0;
    const actions = element(doc, 'div', 'ctw-actions');
    const copy = element(doc, 'button', 'ctw-copy', '复制纯文本');
    copy.type = 'button';
    const status = element(doc, 'p', 'ctw-status', '复制保留文字与换行；版式仅供本地预览。');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const fallbackLabel = element(doc, 'label', 'ctw-label', '手动复制文字');
    const fallback = element(doc, 'textarea', 'ctw-fallback');
    fallback.id = id + '-fallback';
    fallbackLabel.htmlFor = fallback.id;
    fallback.readOnly = true;
    fallback.rows = 6;
    fallback.hidden = true;
    fallbackLabel.hidden = true;
    controls.append(label, hint, input, presetLabel, select, note);
    actions.append(copy);
    output.append(previewLabel, preview, actions, status, fallbackLabel, fallback);
    layout.append(controls, output);
    root.append(heading, intro, layout);
    container.appendChild(root);

    function render() {
      revision++;
      const preset = PRESETS.find(function (item) { return item.id === select.value; }) || PRESETS[0];
      note.textContent = preset.note;
      preview.className = 'ctw-preview ctw-preset-' + preset.id;
      preview.replaceChildren();
      const value = input.value.replace(/\r\n?/g, '\n').trim();
      copy.disabled = !value;
      fallback.hidden = true;
      fallbackLabel.hidden = true;
      status.textContent = '复制保留文字与换行；版式仅供本地预览。';
      if (!value) {
        preview.appendChild(element(doc, 'p', 'ctw-empty', '写下第一行，预览便从这里开始。'));
        return;
      }
      const lines = value.split('\n');
      preview.appendChild(element(doc, 'h4', 'ctw-preview-title', lines.shift()));
      const body = lines.join('\n').trim();
      if (body) body.split(/\n[\t ]*\n+/).forEach(function (paragraph) {
        preview.appendChild(element(doc, 'p', 'ctw-preview-paragraph', paragraph));
      });
    }
    async function copyText() {
      const value = input.value;
      const currentRevision = revision;
      copy.disabled = true;
      try {
        if (!global.navigator.clipboard || !global.navigator.clipboard.writeText) throw new Error('clipboard unavailable');
        await global.navigator.clipboard.writeText(value);
        if (!disposed && currentRevision === revision) status.textContent = '已复制纯文本，包含原有换行。';
      } catch (_) {
        if (!disposed && currentRevision === revision) {
          fallback.value = value;
          fallback.hidden = false;
          fallbackLabel.hidden = false;
          fallback.focus();
          fallback.select();
          status.textContent = '浏览器未允许直接复制。文字已选中，请按 Ctrl/Cmd+C，或长按选择“复制”。';
        }
      } finally {
        if (!disposed) copy.disabled = !input.value.trim();
      }
    }
    input.addEventListener('input', render);
    select.addEventListener('change', render);
    copy.addEventListener('click', copyText);
    render();
    function cleanup() {
      if (disposed) return;
      disposed = true;
      input.removeEventListener('input', render);
      select.removeEventListener('change', render);
      copy.removeEventListener('click', copyText);
      root.remove();
      mounted.delete(container);
    }
    mounted.set(container, cleanup);
    return cleanup;
  }
  global.CourtyardTypography = Object.freeze({ mount: mount });
})(window);

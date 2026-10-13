/* Source-grounded directory; no content is interpreted as markup. */
(function (global) {
  'use strict';
  const labels = { 'full-text':'正文存档', 'privacy-edited':'正文 · 局部隐私处理', anonymized:'匿名化改编', summary:'内容摘要', excerpt:'原文节选', 'entrance-only':'入口说明' };
  function el(tag, cls, value) { const n=document.createElement(tag); if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n; }
  function install(options) {
    const grid=options.grid, catalog=global.CourtyardReadingCatalog||{};
    const form=el('form','cd-search');form.setAttribute('role','search');
    const label=el('label','','查找庭中内容');label.htmlFor='courtyard-directory-search';
    const input=el('input');input.type='search';input.id=label.htmlFor;input.placeholder='名称、导读、篇章或收录类型';input.maxLength=100;
    const count=el('p','cd-count');count.setAttribute('role','status');form.append(label,input,count);grid.before(form);
    const rows=[],groups=[];
    options.zones.forEach((zone,z)=>{
      const section=el('section');section.append(el('h3','',zone.name));groups.push(section);
      options.entries.forEach((entry,index)=>{
        if(entry.zone!==z)return;
        const data=catalog[index]||{},row=el('div','directory-entry');
        const copy=el('div','cd-copy'),read=el('button','cd-read',entry.title);read.type='button';read.setAttribute('aria-label','在庭院里读：'+entry.title);read.onclick=()=>options.reader.open(index);
        const intro=el('p','cd-intro',data.summary||'本馆的收录内容可在庭中打开。');
        const type=labels[data.coverage]||'收录范围待核实';
        const length=Number.isFinite(data.characterCount)?'约 '+data.characterCount.toLocaleString('zh-CN')+' 字 · '+Math.max(1,Math.ceil(data.characterCount/400))+' 分钟':'';
        const meta=el('p','cd-meta',type+' · '+(data.sections||[]).length+' 节'+(length?' · '+length:''));
        copy.append(read,intro,meta);row.append(copy);
        if(!['anonymized','privacy-edited'].includes(data.coverage)){const a=el('a','','原站 ↗');a.href=entry.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',entry.title+'：打开原站');a.onclick=()=>options.onSource?.(index);row.append(a);}
        section.append(row);rows.push({row,section,search:[entry.title,data.title,data.summary,type,...(data.sections||[]).map(s=>s.title+' '+s.excerpt)].join(' ').toLocaleLowerCase()});
      });grid.append(section);
    });
    function filter(){const q=input.value.trim().toLocaleLowerCase();let n=0;rows.forEach(item=>{item.row.hidden=q&&!item.search.includes(q);if(!item.row.hidden)n++;});groups.forEach(group=>group.hidden=!rows.some(item=>item.section===group&&!item.row.hidden));count.textContent=n+' / '+options.entries.length+' 处 · 时长按每分钟约 400 字估算'+(!n?'，换个关键词试试':'');}
    form.onsubmit=e=>{e.preventDefault();filter();};input.oninput=filter;filter();
  }
  global.CourtyardDirectory=Object.freeze({install});
})(window);

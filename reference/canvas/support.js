window.DCLogic=class{constructor(p){this.props=p||{};this.state={}}setState(s){Object.assign(this.state,s)}};
window.addEventListener('DOMContentLoaded',()=>{
 const code=document.querySelector('script[data-dc-script]').textContent;
 const C=new Function(code+';return Component;')();const v=new C({}).renderVals();
 const get=(ctx,path)=>{let o=ctx;for(const p of path.split('.')){if(o==null)return '';o=o[p]}return o};
 const sub=(s,ctx)=>s.replace(/\{\{ ([\w.]+) \}\}/g,(_,p)=>{const r=get(ctx,p);return typeof r==='function'?'':(r??'')});
 const tpl=document.querySelector('x-dc');const src=tpl.innerHTML;
 function expand(html,ctx){
   const d=document.createElement('template');d.innerHTML=html;walk(d.content,ctx);return d.innerHTML;}
 function walk(node,ctx){
   for(const el of [...node.childNodes]){
     if(el.nodeType===3){el.textContent=sub(el.textContent,ctx);continue}
     if(el.nodeType!==1)continue;
     if(el.tagName==='SC-IF'){const m=el.getAttribute('value').match(/\{\{ ([\w.]+) \}\}/);const ok=m[1]==='true'||(m[1]!=='false'&&get(ctx,m[1]));
       if(ok){const t=document.createElement('template');t.innerHTML=el.innerHTML;walk(t.content,ctx);el.replaceWith(t.content)}else el.remove();continue}
     if(el.tagName==='SC-FOR'){const lp=el.getAttribute('list').match(/\{\{ ([\w.]+) \}\}/)[1];const as=el.getAttribute('as');const arr=get(ctx,lp)||[];const frag=document.createDocumentFragment();
       for(const it of arr){const t=document.createElement('template');t.innerHTML=el.innerHTML;walk(t.content,Object.assign({},ctx,{[as]:it}));frag.appendChild(t.content)}el.replaceWith(frag);continue}
     for(const a of [...el.attributes]){if(/^on/i.test(a.name)){el.removeAttribute(a.name);continue}el.setAttribute(a.name,sub(a.value,ctx))}
     if(el.tagName==='TEXTAREA'){el.value=sub(el.innerHTML,ctx)}
     walk(el,ctx);
   }}
 const out=document.createElement('div');out.innerHTML=src;walk(out,v);tpl.replaceWith(...out.childNodes);
 document.querySelectorAll('helmet').forEach(h=>{});
});

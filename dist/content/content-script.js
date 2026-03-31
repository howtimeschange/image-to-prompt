chrome.runtime.onMessage.addListener((e,l,c)=>{if(e.type==="FETCH_IMAGE_BASE64")return U(e.url).then(o=>c({base64:o})).catch(o=>c({error:String(o)})),!0;if(e.type==="SHOW_FLOAT_WINDOW")return F(),Y(e.imageUrl,e.imageBase64??null),c({ok:!0}),!0});async function U(e){const l=await fetch(e,{mode:"cors"});if(!l.ok)throw new Error(`HTTP ${l.status}`);const c=await l.blob();return new Promise((o,m)=>{const g=new FileReader;g.onloadend=()=>{const f=g.result;o(f.includes(",")?f.split(",")[1]:f)},g.onerror=m,g.readAsDataURL(c)})}const D="itp-float-root";function F(){var e;(e=document.getElementById(D))==null||e.remove()}let P="zh",K=null;function Y(e,l){q(),P="zh",K=null;const c=t("div",{id:D}),o=t("div",{class:"itp-overlay"});o.addEventListener("click",i=>{i.target===o&&F()});const m=t("div",{class:"itp-card"}),g=t("div",{class:"itp-header"}),f=t("div",{class:"itp-title-wrap"});f.innerHTML='<span class="itp-brand">IMAGETOPROMPT</span><span class="itp-subtitle" id="itp-theme-label">分析结果</span>';const O=t("button",{class:"itp-close"},"×");O.addEventListener("click",F),g.append(f,O);const N=t("div",{class:"itp-img-wrap"}),k=document.createElement("img");k.src=e,k.className="itp-img",k.addEventListener("error",()=>{N.style.display="none"});const z=t("div",{class:"itp-color-strip",id:"itp-color-strip",style:"display:none"});N.append(k,z);const h=t("div",{class:"itp-loading",id:"itp-loading"});h.innerHTML=`
    <div class="itp-dots"><span></span><span></span><span></span></div>
    <p>提取视觉风格...</p>`;const y=t("div",{class:"itp-error-box",id:"itp-error-box",style:"display:none"}),_=t("div",{class:"itp-result",id:"itp-result",style:"display:none"}),j=t("div",{class:"itp-lang-bar"}),L=t("button",{class:"itp-lang-btn active"},"中"),A=t("button",{class:"itp-lang-btn"},"EN"),T=t("button",{class:"itp-lang-btn"},"J");j.append(L,A,T);function C(i){P=i==="ja"?"zh":i,L.className=`itp-lang-btn${i==="zh"?" active":""}`,A.className=`itp-lang-btn${i==="en"?" active":""}`,T.className=`itp-lang-btn${i==="ja"?" active":""}`,W()}L.addEventListener("click",()=>C("zh")),A.addEventListener("click",()=>C("en")),T.addEventListener("click",()=>C("ja"));const B=t("div",{class:"itp-prompt-section"}),v=t("textarea",{class:"itp-prompt-ta",id:"itp-main-prompt",spellcheck:"false"});function W(){var x,u;const i=K;i&&(v.value=P==="en"?i.full_prompt??((x=i.prompts)==null?void 0:x.full_prompt)??"":i.full_prompt_zh??((u=i.prompts)==null?void 0:u.full_prompt_zh)??i.full_prompt??"")}B.appendChild(v);const H=t("div",{class:"itp-neg-section"}),I=t("div",{class:"itp-field-label itp-neg-label"});I.innerHTML='<span class="itp-x">✕</span> Negative Prompt';const M=t("textarea",{class:"itp-neg-ta",id:"itp-neg-prompt",spellcheck:"false"});H.append(I,M);const w=t("div",{class:"itp-tags-row",id:"itp-tags-row"}),s=t("div",{class:"itp-details-section",id:"itp-details",style:"display:none"});_.append(j,B,H,w,s);const E=t("div",{class:"itp-actions",id:"itp-actions",style:"display:none"}),$=t("button",{class:"itp-action-btn itp-re-btn"},"↺ 重新分析"),d=t("button",{class:"itp-action-btn itp-copy-btn-main"},"⊡ 复制 Prompt"),b=t("button",{class:"itp-action-btn itp-gen-btn"},"⊞ 预览生图");E.append($,d,b);const r=t("div",{class:"itp-preview-wrap",style:"display:none"}),a=document.createElement("img");a.className="itp-preview-img",r.appendChild(a),d.addEventListener("click",()=>{const i=v.value??"",x=M.value??"",u=x?`${i}

Negative: ${x}`:i;navigator.clipboard.writeText(u);const n=d.textContent;d.textContent="✓ 已复制",d.classList.add("itp-copied"),setTimeout(()=>{d.textContent=n,d.classList.remove("itp-copied")},2e3)});function S(){h.style.display="flex",_.style.display="none",E.style.display="none",y.style.display="none",r.style.display="none",Z(e,l,{loading:h,result:_,actions:E,errorBox:y,promptTextarea:v,negTextarea:M,tagsRow:w,details:s,colorStrip:z})}$.addEventListener("click",S),b.addEventListener("click",async()=>{var n;const i=v.value;if(!i)return;b.textContent="⏳...",b.setAttribute("disabled","true");const x=await chrome.storage.local.get(["settings"]),u=((n=x==null?void 0:x.settings)==null?void 0:n.geminiApiKey)??"";if(!u){G(y,"请先在侧边栏设置中配置 Gemini API Key"),b.textContent="⊞ 预览生图",b.removeAttribute("disabled");return}try{const p=await chrome.runtime.sendMessage({type:"GENERATE_IMAGE",prompt:i,apiKey:u});if(p!=null&&p.error)throw new Error(p.error);a.src=p.dataUrl,r.style.display="block"}catch(p){G(y,`生图失败: ${String(p)}`)}finally{b.textContent="⊞ 预览生图",b.removeAttribute("disabled")}}),m.append(g,N,h,y,_,E,r),o.appendChild(m),c.appendChild(o),document.documentElement.appendChild(c),S()}async function Z(e,l,c){var y,_,j,L,A,T,C,B,v,W,H,I,M;const{loading:o,result:m,actions:g,errorBox:f,promptTextarea:O,negTextarea:N,tagsRow:k,details:z,colorStrip:h}=c;try{const w=await chrome.storage.local.get(["settings"]),s=(w==null?void 0:w.settings)??{},E=(s==null?void 0:s.model)??"gemini-flash",$=E==="gemini-flash"?(s==null?void 0:s.geminiApiKey)??"":(s==null?void 0:s.minimaxApiKey)??"";if(!$)throw new Error("请先在侧边栏设置中配置 API Key");const d=await chrome.runtime.sendMessage({type:"ANALYZE_IMAGE",imageUrl:e,imageBase64:l,model:E,apiKey:$,language:(s==null?void 0:s.language)??"zh"});if(d!=null&&d.error)throw new Error(d.error);const b=d.structured??{};K=b;const r=b.visual_style??{},a=b;O.value=P==="en"?a.full_prompt??"":a.full_prompt_zh??a.full_prompt??"",N.value=P==="en"?a.negative_prompt??"":a.negative_prompt_zh??a.negative_prompt??"";const S=document.getElementById("itp-theme-label");S&&((y=r.overall_concept)!=null&&y.theme)&&(S.textContent=r.overall_concept.theme),k.innerHTML="",(Array.isArray(a.tags)?a.tags:[]).forEach(n=>{const p=t("span",{class:"itp-tag-chip"},n);k.appendChild(p)});const x=[...((_=r.color_palette)==null?void 0:_.dominant_colors)??[],...((j=r.color_palette)==null?void 0:j.accent_colors)??[]].filter(n=>n==null?void 0:n.hex);x.length&&(h.innerHTML="",x.forEach(n=>{const p=t("button",{class:"itp-color-sw",style:`background:${n.hex}`,title:`${n.name}
${n.hex}`});p.addEventListener("click",()=>{navigator.clipboard.writeText(n.hex),p.style.outline="2px solid white",setTimeout(()=>p.style.outline="",1e3)}),h.appendChild(p)}),h.style.display="flex"),z.innerHTML="";const u=[["主体",a.subject_zh??((A=(L=r.subjects_and_props)==null?void 0:L.subject)==null?void 0:A.description)??""],["风格",a.style??((T=r.overall_concept)==null?void 0:T.theme)??""],["构图",a.composition??((C=r.composition)==null?void 0:C.layout_type)??""],["光线",a.lighting??((v=(B=r.effects_and_textures)==null?void 0:B.lighting)==null?void 0:v.type)??""],["色调",a.color_palette??((W=r.color_palette)==null?void 0:W.color_harmony)??""],["氛围",a.mood??((H=r.overall_concept)==null?void 0:H.mood)??""],["技术",a.technical??((M=(I=r.effects_and_textures)==null?void 0:I.texture)==null?void 0:M.join(", "))??""]].filter(([,n])=>n);if(u.length){const n=t("div",{class:"itp-details-grid"});u.forEach(([p,J])=>{const R=t("div",{class:"itp-detail-item"});R.innerHTML=`<div class="itp-detail-lbl">${p}</div><div class="itp-detail-val">${J}</div>`,n.appendChild(R)}),z.appendChild(n),z.style.display="block"}o.style.display="none",m.style.display="block",g.style.display="flex"}catch(w){o.style.display="none",G(f,String(w))}}function G(e,l){e.textContent=`⚠ ${l}`,e.style.display="block"}function t(e,l={},c){const o=document.createElement(e);for(const[m,g]of Object.entries(l))m==="class"?o.className=g:o.setAttribute(m,g);return c!==void 0&&(o.textContent=c),o}function q(){var l;(l=document.getElementById("itp-styles"))==null||l.remove();const e=document.createElement("style");e.id="itp-styles",e.textContent=`
    #itp-float-root *, #itp-float-root *::before, #itp-float-root *::after {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      margin: 0; padding: 0;
    }

    /* Overlay */
    .itp-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      padding: 16px;
    }

    /* Card — 参考图3：毛玻璃深色卡片，max-height 可滚动 */
    .itp-card {
      width: 420px; max-width: 94vw;
      max-height: 88vh; overflow-y: auto;
      border-radius: 20px;
      background: rgba(16,16,22,0.88);
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 32px 72px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.04) inset;
      backdrop-filter: blur(24px) saturate(160%);
      -webkit-backdrop-filter: blur(24px) saturate(160%);
      display: flex; flex-direction: column;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;
    }
    .itp-card::-webkit-scrollbar { width: 3px; }
    .itp-card::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

    /* Header */
    .itp-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 16px 16px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .itp-title-wrap { display: flex; flex-direction: column; gap: 2px; }
    .itp-brand {
      font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
      color: rgba(255,255,255,0.3); text-transform: uppercase;
    }
    .itp-subtitle {
      font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -0.3px; line-height: 1.2;
    }
    .itp-close {
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.10);
      color: rgba(255,255,255,0.5); border-radius: 50%; width: 28px; height: 28px;
      font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all .15s; flex-shrink: 0; margin-top: 2px;
    }
    .itp-close:hover { background: rgba(255,255,255,0.15); color: #fff; }

    /* Image */
    .itp-img-wrap {
      position: relative; background: #000; overflow: hidden;
      max-height: 220px; display: flex; align-items: center; justify-content: center;
    }
    .itp-img { width: 100%; max-height: 220px; object-fit: contain; display: block; }
    .itp-color-strip { position: absolute; bottom: 0; left: 0; right: 0; height: 6px; display: none; }
    .itp-color-sw { flex: 1; height: 6px; border: none; cursor: pointer; transition: transform .15s; }
    .itp-color-sw:hover { transform: scaleY(2.5); transform-origin: bottom; }

    /* Loading */
    .itp-loading {
      display: flex; align-items: center; gap: 10px;
      padding: 16px; color: rgba(255,255,255,0.35); font-size: 12px;
    }
    .itp-dots { display: flex; gap: 4px; }
    .itp-dots span {
      width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.3);
      animation: itp-pulse 1s ease-in-out infinite;
    }
    .itp-dots span:nth-child(2) { animation-delay: .2s; }
    .itp-dots span:nth-child(3) { animation-delay: .4s; }
    @keyframes itp-pulse { 0%,100%{opacity:.2;transform:scale(.9)} 50%{opacity:.8;transform:scale(1.1)} }

    /* Error */
    .itp-error-box {
      margin: 12px 16px; padding: 10px 12px; border-radius: 8px;
      background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
      color: rgba(252,165,165,0.9); font-size: 12px; line-height: 1.5; display: none;
    }

    /* Result */
    .itp-result { display: none; flex-direction: column; }

    /* Lang bar — 参考图3底部语言按钮样式 */
    .itp-lang-bar {
      display: flex; gap: 6px; padding: 12px 16px 8px;
    }
    .itp-lang-btn {
      padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all .15s;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.4);
    }
    .itp-lang-btn.active { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.2); }

    /* Prompt textarea — 大而清晰，对照参考图3正文字号 */
    .itp-prompt-section { padding: 0 16px 12px; }
    .itp-prompt-ta {
      width: 100%; min-height: 120px; max-height: 260px;
      background: transparent; border: none; outline: none;
      color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.75;
      resize: vertical; font-family: inherit; overflow-y: auto;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;
    }
    .itp-prompt-ta::placeholder { color: rgba(255,255,255,0.2); }

    /* Negative prompt */
    .itp-neg-section {
      margin: 0 16px 12px; border-radius: 10px;
      background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.15); padding: 10px 12px;
    }
    .itp-field-label {
      font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
      color: rgba(255,255,255,0.35); margin-bottom: 6px; display: flex; align-items: center; gap: 5px;
    }
    .itp-neg-label { color: rgba(248,113,113,0.7); }
    .itp-x { font-size: 14px; }
    .itp-neg-ta {
      width: 100%; min-height: 52px; max-height: 120px;
      background: transparent; border: none; outline: none;
      color: rgba(252,165,165,0.7); font-size: 12px; line-height: 1.7;
      font-family: inherit; resize: vertical;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;
    }

    /* Tags */
    .itp-tags-row { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 12px; }
    .itp-tag-chip {
      border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 500;
      background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.3);
      color: rgba(199,210,254,0.85); cursor: default;
    }

    /* Details grid — 对照参考图3两列卡片 */
    .itp-details-section { padding: 0 16px 12px; display: none; }
    .itp-details-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
    }
    .itp-detail-item {
      border-radius: 10px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07); padding: 10px 11px;
    }
    .itp-detail-lbl {
      font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
      color: rgba(255,255,255,0.28); margin-bottom: 4px; text-transform: uppercase;
    }
    .itp-detail-val { font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.45; }

    /* Actions — 对照参考图3底部三按钮 */
    .itp-actions {
      display: none; gap: 6px; padding: 6px 16px 16px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .itp-action-btn {
      flex: 1; padding: 11px 6px; border-radius: 12px; border: none;
      font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s;
      font-family: inherit; letter-spacing: 0.01em;
    }
    .itp-action-btn:disabled { opacity: .4; cursor: not-allowed; }
    .itp-re-btn {
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.6);
    }
    .itp-re-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
    .itp-copy-btn-main { background: #5145cd; color: #fff; }
    .itp-copy-btn-main:hover:not(:disabled) { background: #4338ca; }
    .itp-copy-btn-main.itp-copied { background: #16a34a; }
    .itp-gen-btn {
      background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.25);
      color: rgba(110,231,183,0.9);
    }
    .itp-gen-btn:hover:not(:disabled) { background: rgba(16,185,129,0.25); }

    /* Preview */
    .itp-preview-wrap { margin: 0 16px 16px; border-radius: 12px; overflow: hidden; }
    .itp-preview-img { width: 100%; display: block; }
  `,document.head.appendChild(e)}

chrome.runtime.onMessage.addListener((n,p,r)=>{if(n.type==="FETCH_IMAGE_BASE64")return G(n.url).then(o=>r({base64:o})).catch(o=>r({error:String(o)})),!0;if(n.type==="SHOW_FLOAT_WINDOW")return K(),Z(n.imageUrl,n.imageBase64??null),r({ok:!0}),!0});async function G(n){const p=await fetch(n,{mode:"cors"});if(!p.ok)throw new Error(`HTTP ${p.status}`);const r=await p.blob();return new Promise((o,b)=>{const l=new FileReader;l.onloadend=()=>{const g=l.result;o(g.includes(",")?g.split(",")[1]:g)},l.onerror=b,l.readAsDataURL(r)})}const O="itp-float-root";function K(){var n;(n=document.getElementById(O))==null||n.remove()}function Z(n,p){U();const r=e("div",{id:O}),o=e("div",{class:"itp-overlay"});o.addEventListener("click",i=>{i.target===o&&K()});const b=e("div",{class:"itp-card"}),l=e("div",{class:"itp-header"});l.innerHTML='<span class="itp-title">🎨 ImageToPrompt</span>';const g=e("button",{class:"itp-icon-btn"},"✕");g.addEventListener("click",K),l.appendChild(g);const v=e("div",{class:"itp-img-wrap"}),s=document.createElement("img");s.className="itp-img",s.src=n,s.alt="分析图片",s.addEventListener("error",()=>{v.style.display="none"}),v.appendChild(s);const a=e("div",{class:"itp-status"});a.innerHTML='<div class="itp-spinner"></div><span>AI 正在分析图片...</span>';const f=e("div",{class:"itp-result",style:"display:none"}),z=e("div",{class:"itp-lang-tabs"}),d=e("button",{class:"itp-lang-tab active","data-lang":"en"},"EN Prompt"),t=e("button",{class:"itp-lang-tab","data-lang":"zh"},"中文 Prompt");z.append(d,t);const k=e("div",{class:"itp-prompt-block","data-block":"en"}),w=e("div",{class:"itp-prompt-block",style:"display:none","data-block":"zh"});function C(i,N,I,H){const E=e("div",{class:"itp-label"});E.innerHTML=`<span>✨ ${N}</span>`;const c=e("button",{class:"itp-copy-btn"},"📋 复制");E.appendChild(c);const P=e("textarea",{class:"itp-textarea",id:I,spellcheck:"false"});P.rows=4;const j=e("div",{class:"itp-label itp-neg-label"});j.innerHTML="<span>❌ Negative Prompt</span>";const S=e("button",{class:"itp-copy-btn"},"📋");j.appendChild(S);const $=e("textarea",{class:"itp-textarea itp-neg-textarea",id:H,spellcheck:"false"});$.rows=2,c.addEventListener("click",()=>F(P.value,c)),S.addEventListener("click",()=>F($.value,S)),i.append(E,P,j,$)}C(k,"Full Prompt (EN)","itp-prompt-en","itp-neg-en"),C(w,"完整提示词（中文）","itp-prompt-zh","itp-neg-zh");function L(i){d.className=`itp-lang-tab${i==="en"?" active":""}`,t.className=`itp-lang-tab${i==="zh"?" active":""}`,k.style.display=i==="en"?"block":"none",w.style.display=i==="zh"?"block":"none"}d.addEventListener("click",()=>L("en")),t.addEventListener("click",()=>L("zh"));const A=e("div",{class:"itp-tags",id:"itp-tags-row"}),_=e("button",{class:"itp-toggle"},"▼ 展开结构化详情"),u=e("div",{class:"itp-details",style:"display:none"});_.addEventListener("click",()=>{const i=u.style.display!=="none";u.style.display=i?"none":"grid",_.textContent=i?"▼ 展开结构化详情":"▲ 收起详情"}),f.append(z,k,w,A,_,u);const x=e("div",{class:"itp-actions",style:"display:none"}),B=e("button",{class:"itp-btn itp-btn-ghost"},"🔄 重新分析"),m=e("button",{class:"itp-btn itp-btn-primary"},"📋 复制 Prompt"),y=e("button",{class:"itp-btn itp-btn-secondary"},"🖼️ 预览生图");x.append(B,m,y);const h=e("div",{class:"itp-error",style:"display:none"}),T=e("div",{class:"itp-preview-wrap",style:"display:none"}),M=document.createElement("img");M.className="itp-preview-img",T.appendChild(M),m.addEventListener("click",()=>{const i=document.querySelector('.itp-lang-tab.active[data-lang="en"]')?document.getElementById("itp-prompt-en"):document.getElementById("itp-prompt-zh");F((i==null?void 0:i.value)??"",m),m.textContent="✓ 已复制",setTimeout(()=>m.textContent="📋 复制 Prompt",2e3)});function W(){a.style.display="flex",f.style.display="none",x.style.display="none",h.style.display="none",T.style.display="none",D(n,p,f,A,u,a,x,h)}B.addEventListener("click",W),y.addEventListener("click",async()=>{var E;const i=document.getElementById("itp-prompt-en"),N=i==null?void 0:i.value;if(!N)return;y.textContent="⏳ 生成中...",y.setAttribute("disabled","true"),T.style.display="none";const I=await chrome.storage.local.get(["settings"]),H=((E=I==null?void 0:I.settings)==null?void 0:E.geminiApiKey)??"";if(!H){h.textContent="⚠️ 请先在设置中配置 Gemini API Key",h.style.display="block",y.textContent="🖼️ 预览生图",y.removeAttribute("disabled");return}try{const c=await chrome.runtime.sendMessage({type:"GENERATE_IMAGE",prompt:N,apiKey:H});if(c!=null&&c.error)throw new Error(c.error);M.src=c.dataUrl,T.style.display="block"}catch(c){h.textContent=`⚠️ 生图失败: ${String(c)}`,h.style.display="block"}finally{y.textContent="🖼️ 预览生图",y.removeAttribute("disabled")}}),b.append(l,v,a,f,x,h,T),o.appendChild(b),r.appendChild(o),document.documentElement.appendChild(r),W()}async function D(n,p,r,o,b,l,g,v){try{const s=await chrome.storage.local.get(["settings"]),a=(s==null?void 0:s.settings)??{},f=(a==null?void 0:a.model)??"gemini-flash",z=f==="gemini-flash"?(a==null?void 0:a.geminiApiKey)??"":(a==null?void 0:a.minimaxApiKey)??"";if(!z)throw new Error("请先在侧边栏 ⚙️ 设置中配置 API Key");const d=await chrome.runtime.sendMessage({type:"ANALYZE_IMAGE",imageUrl:n,imageBase64:p,model:f,apiKey:z,language:(a==null?void 0:a.language)??"zh"});if(d!=null&&d.error)throw new Error(d.error);const{structured:t,tags:k}=d,w=document.getElementById("itp-prompt-en"),C=document.getElementById("itp-neg-en");w&&(w.value=(t==null?void 0:t.full_prompt)??d.prompt??""),C&&(C.value=(t==null?void 0:t.negative_prompt)??"");const L=document.getElementById("itp-prompt-zh"),A=document.getElementById("itp-neg-zh");L&&(L.value=(t==null?void 0:t.full_prompt_zh)??(t==null?void 0:t.full_prompt)??d.prompt??""),A&&(A.value=(t==null?void 0:t.negative_prompt_zh)??(t==null?void 0:t.negative_prompt)??""),o.innerHTML="",(Array.isArray(k)?k:(t==null?void 0:t.tags)??[]).forEach(u=>{const x=e("span",{class:"itp-tag"},u);o.appendChild(x)}),t&&(b.innerHTML="",[["👤 主体 (EN)",t.subject],["👤 主体 (中文)",t.subject_zh],["🎨 风格",t.style],["📐 构图",t.composition],["💡 光线",t.lighting],["🎨 色调",t.color_palette],["🌟 氛围",t.mood],["⚙️ 技术",t.technical]].forEach(([x,B])=>{if(!B)return;const m=e("div",{class:"itp-detail-item"});m.innerHTML=`<div class="itp-detail-label">${x}</div><div class="itp-detail-value">${B}</div>`,b.appendChild(m)})),l.style.display="none",r.style.display="block",g.style.display="flex"}catch(s){l.style.display="none",v.textContent=`⚠️ ${String(s)}`,v.style.display="block"}}function F(n,p){if(!n)return;navigator.clipboard.writeText(n);const r=p.textContent;p.textContent="✓ 已复制",setTimeout(()=>p.textContent=r,2e3)}function e(n,p={},r){const o=document.createElement(n);for(const[b,l]of Object.entries(p))b==="class"?o.className=l:o.setAttribute(b,l);return r!==void 0&&(o.textContent=r),o}function U(){document.getElementById("itp-styles")&&document.getElementById("itp-styles").remove();const n=document.createElement("style");n.id="itp-styles",n.textContent=`
    #itp-float-root * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0; padding: 0;
    }

    .itp-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.48);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      padding: 20px;
    }

    /* 液态玻璃卡片 */
    .itp-card {
      position: relative;
      width: 440px; max-width: 94vw;
      max-height: 90vh; overflow-y: auto;
      border-radius: 26px;
      padding: 20px;
      display: flex; flex-direction: column; gap: 14px;
      background: rgba(14, 14, 22, 0.75);
      border: 1px solid rgba(255,255,255,0.13);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        inset 0 -1px 0 rgba(0,0,0,0.3),
        0 40px 80px rgba(0,0,0,0.65),
        0 8px 32px rgba(0,0,0,0.4),
        0 0 0 0.5px rgba(99,102,241,0.25);
      backdrop-filter: blur(32px) saturate(200%) brightness(0.85);
      -webkit-backdrop-filter: blur(32px) saturate(200%) brightness(0.85);
      scrollbar-width: thin;
      scrollbar-color: rgba(99,102,241,0.3) transparent;
    }
    .itp-card::-webkit-scrollbar { width: 4px; }
    .itp-card::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.35); border-radius: 4px; }

    .itp-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .itp-title {
      font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.3px;
    }
    .itp-icon-btn {
      width: 28px; height: 28px; border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);
      cursor: pointer; font-size: 12px; display: flex;
      align-items: center; justify-content: center; transition: all .15s;
    }
    .itp-icon-btn:hover { background: rgba(255,255,255,0.18); color: #fff; }

    .itp-img-wrap {
      border-radius: 14px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.25); max-height: 180px;
      display: flex; align-items: center; justify-content: center;
    }
    .itp-img { width: 100%; max-height: 180px; object-fit: contain; display: block; }

    .itp-status {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-radius: 14px;
      background: rgba(99,102,241,0.08);
      border: 1px solid rgba(99,102,241,0.2);
    }
    .itp-status span { font-size: 12px; color: #a5b4fc; }
    .itp-spinner {
      width: 16px; height: 16px; flex-shrink: 0;
      border: 2px solid rgba(99,102,241,0.3);
      border-top-color: #6366f1; border-radius: 50%;
      animation: itp-spin 0.8s linear infinite;
    }
    @keyframes itp-spin { to { transform: rotate(360deg); } }

    /* Lang tabs */
    .itp-lang-tabs {
      display: flex; gap: 4px;
      background: rgba(255,255,255,0.05);
      border-radius: 10px; padding: 3px;
    }
    .itp-lang-tab {
      flex: 1; padding: 6px; border-radius: 8px;
      font-size: 11px; font-weight: 600;
      border: none; cursor: pointer;
      background: transparent; color: rgba(255,255,255,0.4);
      transition: all .15s;
    }
    .itp-lang-tab.active {
      background: rgba(99,102,241,0.3);
      color: #c7d2fe;
    }

    .itp-result { display: flex; flex-direction: column; gap: 10px; }
    .itp-prompt-block { display: flex; flex-direction: column; gap: 6px; }

    .itp-label {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 11px; font-weight: 600; color: #818cf8; letter-spacing: 0.3px;
    }
    .itp-neg-label { color: #f87171; }
    .itp-copy-btn {
      font-size: 10px; padding: 2px 8px; border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5);
      cursor: pointer; transition: all .15s; line-height: 1.6;
    }
    .itp-copy-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

    .itp-textarea {
      width: 100%; border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04); color: #e2e8f0;
      font-size: 12px; line-height: 1.7; padding: 10px 12px;
      resize: vertical; min-height: 72px; outline: none;
      transition: border-color .15s; font-family: inherit;
    }
    .itp-textarea:focus { border-color: rgba(99,102,241,0.5); }
    .itp-neg-textarea {
      min-height: 48px; background: rgba(239,68,68,0.05);
      border-color: rgba(239,68,68,0.15); color: #fca5a5;
    }
    .itp-neg-textarea:focus { border-color: rgba(239,68,68,0.4); }

    .itp-tags { display: flex; flex-wrap: wrap; gap: 5px; }
    .itp-tag {
      border-radius: 20px; background: rgba(99,102,241,0.15);
      border: 1px solid rgba(99,102,241,0.25); color: #a5b4fc;
      font-size: 10px; padding: 3px 9px;
    }

    .itp-toggle {
      font-size: 11px; color: rgba(255,255,255,0.35);
      background: none; border: none; cursor: pointer;
      padding: 4px 0; text-align: left; transition: color .15s;
    }
    .itp-toggle:hover { color: rgba(255,255,255,0.7); }

    .itp-details {
      display: none; grid-template-columns: 1fr 1fr; gap: 6px;
    }
    .itp-detail-item {
      border-radius: 10px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07); padding: 8px 10px;
    }
    .itp-detail-label { font-size: 10px; color: rgba(255,255,255,0.35); margin-bottom: 3px; }
    .itp-detail-value { font-size: 11px; color: #cbd5e1; line-height: 1.5; }

    .itp-actions { display: none; gap: 8px; }
    .itp-btn {
      flex: 1; padding: 9px 4px; border-radius: 12px; border: none;
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all .15s; font-family: inherit;
    }
    .itp-btn:disabled { opacity: .45; cursor: not-allowed; }
    .itp-btn-primary { background: #6366f1; color: #fff; }
    .itp-btn-primary:hover:not(:disabled) { background: #4f46e5; }
    .itp-btn-ghost {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7);
    }
    .itp-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
    .itp-btn-secondary {
      background: rgba(16,185,129,0.15);
      border: 1px solid rgba(16,185,129,0.25); color: #6ee7b7;
    }
    .itp-btn-secondary:hover:not(:disabled) { background: rgba(16,185,129,0.25); }

    .itp-error {
      padding: 10px 12px; border-radius: 12px;
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2); color: #fca5a5;
      font-size: 12px; line-height: 1.5; display: none;
    }

    .itp-preview-wrap {
      border-radius: 14px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .itp-preview-img { width: 100%; display: block; }
  `,document.head.appendChild(n)}

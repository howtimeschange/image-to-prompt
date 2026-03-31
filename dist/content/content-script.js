chrome.runtime.onMessage.addListener((t,n,e)=>{if(t.type==="FETCH_IMAGE_BASE64")return W(t.url).then(o=>e({base64:o})).catch(o=>e({error:String(o)})),!0;if(t.type==="SHOW_FLOAT_WINDOW")return G(t.imageUrl,t.imageBase64??null),e({ok:!0}),!0});async function W(t){const n=await fetch(t,{mode:"cors"});if(!n.ok)throw new Error(`HTTP ${n.status}`);const e=await n.blob();return new Promise((o,s)=>{const p=new FileReader;p.onloadend=()=>{const l=p.result;o(l.includes(",")?l.split(",")[1]:l)},p.onerror=s,p.readAsDataURL(e)})}const j="itp-float-root";function G(t,n){let e=document.getElementById(j);e||(e=document.createElement("div"),e.id=j,document.documentElement.appendChild(e),D()),e.innerHTML="";const o=U(t,n);e.appendChild(o)}function U(t,n){const e=i("div",{class:"itp-overlay"}),o=i("div",{class:"itp-card",id:"itp-card"}),s=i("div",{class:"itp-header"}),p=i("span",{class:"itp-title"},"🎨 ImageToPrompt"),l=i("button",{class:"itp-icon-btn",title:"关闭"},"✕");l.addEventListener("click",()=>O()),s.append(p,l);const w=i("div",{class:"itp-img-wrap"}),T=i("img",{class:"itp-img",src:t,alt:"分析图片"});T.addEventListener("error",()=>{w.style.display="none"}),w.appendChild(T);const g=i("div",{class:"itp-status",id:"itp-status"}),x=i("div",{class:"itp-spinner"}),a=i("span",{},"正在深度分析图片...");g.append(x,a);const d=i("div",{class:"itp-result",id:"itp-result",style:"display:none"}),k=i("div",{class:"itp-label"}),u=i("span",{},"✨ Full Prompt"),E=i("button",{class:"itp-copy-btn",id:"itp-copy-full"},"📋 复制");k.append(u,E);const r=i("textarea",{class:"itp-textarea",id:"itp-prompt",placeholder:"等待生成...",spellcheck:"false"}),C=i("div",{class:"itp-label itp-neg-label"});C.innerHTML="<span>❌ Negative Prompt</span>";const z=i("button",{class:"itp-copy-btn",id:"itp-copy-neg"},"📋");C.appendChild(z);const f=i("textarea",{class:"itp-textarea itp-neg-textarea",id:"itp-negative",placeholder:"等待生成...",spellcheck:"false"}),y=i("div",{class:"itp-tags",id:"itp-tags"}),h=i("button",{class:"itp-toggle",id:"itp-toggle"},"▼ 展开结构化详情"),c=i("div",{class:"itp-details",id:"itp-details",style:"display:none"});d.append(k,r,C,f,y,h,c);const A=i("div",{class:"itp-actions",id:"itp-actions",style:"display:none"}),F=i("button",{class:"itp-btn itp-btn-ghost",id:"itp-reanalyze"},"🔄 重新分析"),L=i("button",{class:"itp-btn itp-btn-primary",id:"itp-copy-action"},"📋 复制 Prompt"),b=i("button",{class:"itp-btn itp-btn-secondary",id:"itp-gen-img"},"🖼️ 预览生图");A.append(F,L,b);const v=i("div",{class:"itp-error",id:"itp-error",style:"display:none"}),I=i("div",{class:"itp-preview-wrap",id:"itp-preview-wrap",style:"display:none"}),H=i("img",{class:"itp-preview-img",id:"itp-preview-img",alt:"生成预览"});return I.appendChild(H),o.append(s,w,g,d,A,v,I),e.appendChild(o),e.addEventListener("click",m=>{m.target===e&&O()}),h.addEventListener("click",()=>{const m=c.style.display!=="none";c.style.display=m?"none":"grid",h.textContent=m?"▼ 展开结构化详情":"▲ 收起详情"}),E.addEventListener("click",()=>_(r.value,E)),z.addEventListener("click",()=>_(f.value,z)),L.addEventListener("click",()=>{_(r.value,L),L.textContent="✓ 已复制",setTimeout(()=>L.textContent="📋 复制 Prompt",2e3)}),N(t,n,r,f,y,c,g,d,A,v),F.addEventListener("click",()=>{d.style.display="none",A.style.display="none",g.style.display="flex",v.style.display="none",N(t,n,r,f,y,c,g,d,A,v)}),b.addEventListener("click",async()=>{var K;const m=r.value;if(!m)return;b.textContent="⏳ 生成中...",b.setAttribute("disabled","true"),I.style.display="none";const B=await chrome.storage.local.get(["settings"]),S=((K=B==null?void 0:B.settings)==null?void 0:K.geminiApiKey)??"";if(!S){P(v,"请先在侧边栏设置中配置 Gemini API Key"),b.textContent="🖼️ 预览生图",b.removeAttribute("disabled");return}try{const M=await $(m,S);H.src=M,I.style.display="block"}catch(M){P(v,`生图失败: ${String(M)}`)}finally{b.textContent="🖼️ 预览生图",b.removeAttribute("disabled")}}),e}async function N(t,n,e,o,s,p,l,w,T,g){try{const x=await chrome.storage.local.get(["settings"]),a=(x==null?void 0:x.settings)??{},d=(a==null?void 0:a.model)??"gemini-flash",k=d==="gemini-flash"?(a==null?void 0:a.geminiApiKey)??"":(a==null?void 0:a.minimaxApiKey)??"";if(!k)throw new Error("请先在侧边栏 ⚙️ 设置中配置 API Key");const u=await chrome.runtime.sendMessage({type:"ANALYZE_IMAGE",imageUrl:t,imageBase64:n,model:d,apiKey:k,language:(a==null?void 0:a.language)??"zh"});if(u!=null&&u.error)throw new Error(u.error);const{prompt:E,structured:r,tags:C}=u;e.value=(r==null?void 0:r.full_prompt)??E??"",o.value=(r==null?void 0:r.negative_prompt)??"",s.innerHTML="",(C??(r==null?void 0:r.tags)??[]).forEach(f=>{const y=i("span",{class:"itp-tag"},f);s.appendChild(y)}),r&&(p.innerHTML="",[["👤 主体",r.subject],["🎨 风格",r.style],["📐 构图",r.composition],["💡 光线",r.lighting],["🎨 色调",r.color_palette],["🌟 氛围",r.mood],["⚙️ 技术",r.technical]].forEach(([y,h])=>{if(!h)return;const c=i("div",{class:"itp-detail-item"});c.innerHTML=`<div class="itp-detail-label">${y}</div><div class="itp-detail-value">${h}</div>`,p.appendChild(c)})),l.style.display="none",w.style.display="block",T.style.display="flex"}catch(x){l.style.display="none",P(g,String(x))}}async function $(t,n){const e=await chrome.runtime.sendMessage({type:"GENERATE_IMAGE",prompt:t,apiKey:n});if(e!=null&&e.error)throw new Error(e.error);return e.dataUrl}function P(t,n){t.textContent=`⚠️ ${n}`,t.style.display="block"}function _(t,n){if(!t)return;navigator.clipboard.writeText(t);const e=n.textContent;n.textContent="✓ 已复制",setTimeout(()=>n.textContent=e,2e3)}function O(){var t;(t=document.getElementById(j))==null||t.remove()}function i(t,n={},e){const o=document.createElement(t);for(const[s,p]of Object.entries(n))s==="class"?o.className=p:o.setAttribute(s,p);return e!==void 0&&(o.textContent=e),o}function D(){if(document.getElementById("itp-styles"))return;const t=document.createElement("style");t.id="itp-styles",t.textContent=`
    #itp-float-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    .itp-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      padding: 20px;
    }

    .itp-card {
      position: relative;
      width: 420px;
      max-width: 94vw;
      max-height: 88vh;
      overflow-y: auto;
      border-radius: 24px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;

      /* 液态玻璃核心效果 */
      background: rgba(18, 18, 28, 0.72);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.05) inset,
        0 32px 64px rgba(0,0,0,0.6),
        0 8px 24px rgba(0,0,0,0.4),
        0 0 0 0.5px rgba(99,102,241,0.3);
      backdrop-filter: blur(28px) saturate(180%) brightness(0.9);
      -webkit-backdrop-filter: blur(28px) saturate(180%) brightness(0.9);

      scrollbar-width: thin;
      scrollbar-color: rgba(99,102,241,0.3) transparent;
    }

    .itp-card::-webkit-scrollbar { width: 4px; }
    .itp-card::-webkit-scrollbar-track { background: transparent; }
    .itp-card::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.35); border-radius: 4px; }

    .itp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .itp-title {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.3px;
    }

    .itp-icon-btn {
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.6);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px;
      transition: all 0.15s;
      padding: 0;
      line-height: 1;
    }
    .itp-icon-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }

    .itp-img-wrap {
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.25);
      max-height: 180px;
      display: flex; align-items: center; justify-content: center;
    }
    .itp-img { width: 100%; max-height: 180px; object-fit: contain; display: block; }

    .itp-status {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(99,102,241,0.08);
      border: 1px solid rgba(99,102,241,0.2);
    }

    .itp-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(99,102,241,0.4);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: itp-spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    .itp-status span { font-size: 12px; color: #a5b4fc; }

    @keyframes itp-spin { to { transform: rotate(360deg); } }

    .itp-result { display: flex; flex-direction: column; gap: 10px; }

    .itp-label {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 11px; font-weight: 600; color: #818cf8; letter-spacing: 0.3px;
    }
    .itp-neg-label { color: #f87171; }

    .itp-copy-btn {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      transition: all 0.15s;
      line-height: 1.6;
    }
    .itp-copy-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

    .itp-textarea {
      width: 100%;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: #e2e8f0;
      font-size: 12px;
      line-height: 1.7;
      padding: 10px 12px;
      resize: vertical;
      min-height: 80px;
      outline: none;
      transition: border-color 0.15s;
      font-family: inherit;
    }
    .itp-textarea:focus { border-color: rgba(99,102,241,0.5); }
    .itp-neg-textarea {
      min-height: 52px;
      background: rgba(239,68,68,0.05);
      border-color: rgba(239,68,68,0.15);
      color: #fca5a5;
    }
    .itp-neg-textarea:focus { border-color: rgba(239,68,68,0.4); }

    .itp-tags { display: flex; flex-wrap: wrap; gap: 5px; }
    .itp-tag {
      border-radius: 20px;
      background: rgba(99,102,241,0.15);
      border: 1px solid rgba(99,102,241,0.25);
      color: #a5b4fc;
      font-size: 10px;
      padding: 3px 9px;
    }

    .itp-toggle {
      font-size: 11px; color: rgba(255,255,255,0.35);
      background: none; border: none; cursor: pointer;
      padding: 4px 0; text-align: left;
      transition: color 0.15s;
    }
    .itp-toggle:hover { color: rgba(255,255,255,0.7); }

    .itp-details {
      display: none;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .itp-detail-item {
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      padding: 8px 10px;
    }
    .itp-detail-label { font-size: 10px; color: rgba(255,255,255,0.35); margin-bottom: 3px; }
    .itp-detail-value { font-size: 11px; color: #cbd5e1; line-height: 1.5; }

    .itp-actions {
      display: none; gap: 8px;
    }
    .itp-btn {
      flex: 1; padding: 9px 4px;
      border-radius: 12px; border: none;
      font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
      font-family: inherit;
    }
    .itp-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .itp-btn-primary {
      background: #6366f1;
      color: #fff;
    }
    .itp-btn-primary:hover:not(:disabled) { background: #4f46e5; }
    .itp-btn-ghost {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.7);
    }
    .itp-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
    .itp-btn-secondary {
      background: rgba(16,185,129,0.15);
      border: 1px solid rgba(16,185,129,0.25);
      color: #6ee7b7;
    }
    .itp-btn-secondary:hover:not(:disabled) { background: rgba(16,185,129,0.25); }

    .itp-error {
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2);
      color: #fca5a5;
      font-size: 12px;
      line-height: 1.5;
    }

    .itp-preview-wrap {
      border-radius: 14px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .itp-preview-img { width: 100%; display: block; }
  `,document.head.appendChild(t)}

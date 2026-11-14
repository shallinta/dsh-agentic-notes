/**
 * 随记（dsh-agentic-notes）客户端半边。
 * 一个页面：首页 / 笔记本 / 笔记 / 日记日历 / 日记文档。
 */

window.__ModuleLoader__.load({
  id: '@suiji-ai/dsh-agentic-notes',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useMemo, useCallback } = React

    const API = '/dsh-agentic-notes/api'
    const IMG = '/dsh-agentic-notes/img'
    const SOUND = '/dsh-agentic-notes/sound'
    const ASSET = '/dsh-agentic-notes/asset'
    const STICKY_COLORS = ['#fff7d6', '#e4f8ef', '#ffd3e2', '#ded1ff', '#d0e7ff', '#ffdfc2']

    const SLASH_COMMANDS = [
      { name: 'memo', desc: '新建便笺' },
      { name: 'todo', desc: '加一条待办' },
      { name: 'note', desc: '写一篇笔记' },
      { name: 'agent', desc: '让 AI 整理' },
    ]

    // 视觉放大：五档。100% 不缩放，200% 时所有尺寸和字号翻倍。
    const UI_SCALE_STEPS = [100, 125, 150, 175, 200]
    function normalizeUiScale(value) {
      const n = Math.round(Number(value))
      return UI_SCALE_STEPS.includes(n) ? n : 100
    }
    // 元素用 CSS zoom 放大后，指针位移（视口 CSS 像素）比元素内部像素大，
    // 拖动和裁剪都要按这个系数折算回内部坐标。
    const uiScaleFactor = (state) => normalizeUiScale(state?.settings?.uiScale) / 100

    async function api(op, args = {}) {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ op, args }),
      })
      let body = null
      try { body = await res.json() } catch { body = null }
      if (!body || body.ok !== true) throw new Error(body?.error || `请求失败（${res.status}）`)
      return body.data
    }

    const CSS = `
.dsan{height:100%;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.55;position:relative;overflow:hidden}
.dsan *{box-sizing:border-box}
.dsan-head{display:flex;align-items:center;gap:10px;padding:9px 22px;flex:none;position:relative;z-index:2}
.dsan-head .sp{flex:1}
.dsan-capture{display:flex;flex-direction:column;gap:6px;padding:6px 22px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;position:relative;z-index:30}
.dsan-capture-row{display:flex;align-items:flex-end;gap:8px;min-width:0}
.dsan-capture-row .dsan-capture-input{flex:1;min-width:0}
.dsan-attachments{display:flex;flex-wrap:wrap;gap:6px;padding:8px 8px 0 0}
.dsan-attachment{position:relative;width:42px;height:42px;margin:0 6px 6px 0;overflow:visible}
.dsan-attachment img{width:100%;height:100%;object-fit:cover;display:block;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
 .dsan-surface-stack{position:absolute;right:14px;bottom:14px;z-index:90;display:flex;flex-direction:column-reverse;align-items:flex-end;gap:10px;max-width:calc(100% - 28px);max-height:calc(100% - 28px);overflow:auto;padding:6px;pointer-events:none;scrollbar-width:none}
.dsan-surface-stack::-webkit-scrollbar{display:none}
.dsan-surface-card{pointer-events:auto;flex:none;width:360px;max-width:100%;max-height:calc(100vh / var(--dsan-zoom,1) - 60px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 8px 24px color-mix(in srgb,var(--dsw-alias-label-primary) 15%,transparent);padding:12px;transition:width .2s ease,max-height .2s ease;overflow:hidden}
.dsan-surface-card.large{width:680px;max-height:max(100px,calc(var(--dsan-content-height, 600px) - 40px - var(--dsan-peer-space,0px)))}
.dsan-surface-head{display:flex;align-items:flex-start;gap:10px}
.dsan-surface-title{flex:1;min-width:0;overflow-wrap:anywhere;font-size:13px;font-weight:600}
.dsan-surface-size,.dsan-surface-close{flex:none;width:25px;height:25px;display:flex;align-items:center;justify-content:center;border:0;border-radius:6px;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit}
.dsan-surface-size:hover,.dsan-surface-close:hover{background:var(--dsw-alias-bg-layer-2)}
.dsan-surface-state{display:flex;gap:6px;align-items:center;color:var(--dsw-alias-label-secondary);font-size:10.5px;margin-top:3px}
.dsan-spinner{display:inline-block;width:11px;height:11px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:dsan-spin 1s linear infinite}@keyframes dsan-spin{to{transform:rotate(360deg)}}
.dsan-surface-content{min-height:0;overflow:auto;margin-top:7px}
.dsan-surface-body{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.6;max-height:150px;overflow:auto}
.dsan-surface-card.large .dsan-surface-body{max-height:none}
.dsan-surface-card.compact .dsan-surface-body{max-height:2em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsan-surface-input{display:block;width:100%;min-height:90px;margin-top:10px;padding:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;resize:vertical;outline:none}
.dsan-surface-foot{display:flex;align-items:flex-end;gap:8px;flex:none;margin-top:10px}
.dsan-surface-actions{flex:1;min-width:0;display:flex;flex-wrap:wrap;gap:6px;max-height:100px;overflow:auto}
.dsan-surface-error{margin-top:6px;color:var(--dsw-alias-state-error-primary);font-size:12px;white-space:pre-wrap}
.dsan-settings-hero{display:flex;justify-content:center;padding:4px 0 20px;margin-bottom:16px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsan-settings-avatar-shell{position:relative;width:152px;height:152px;background:transparent}
.dsan-settings-avatar-wrap{position:relative;width:152px;height:152px;border-radius:50%;overflow:hidden;background:transparent;border:1px solid var(--dsw-alias-border-l2);box-shadow:0 0 0 4px var(--dsw-alias-bg-overlay),0 0 0 5px color-mix(in srgb, var(--dsw-alias-border-l2) 78%, var(--dsw-alias-label-secondary))}
.dsan-settings-avatar{width:100%;height:100%;aspect-ratio:1;border-radius:50%;object-fit:cover;display:block;background:transparent}
.dsan-settings-ver{position:absolute;left:calc(100% + 12px);bottom:8px;padding:0;border:none;background:transparent;font-size:12px;line-height:1.35;font-weight:500;color:var(--dsw-alias-label-primary);white-space:nowrap}
.dsan-agent-prev{max-height:calc(32vh / var(--dsan-zoom, 1));overflow:auto;white-space:pre-wrap;line-height:1.55;font-size:13px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px 12px;margin-bottom:12px}
.dsan-preview-body{display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.18);min-height:160px}
.dsan-preview-img{display:block;max-width:100%;max-height:calc(72vh / var(--dsan-zoom, 1));object-fit:contain;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.22)}
.dsan-attachment .num{position:absolute;left:2px;bottom:2px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:rgba(0,0,0,.65);color:#fff;font-size:10px;line-height:16px;text-align:center;font-weight:600}
.dsan-attachment .rm{position:absolute;right:-8px;top:-8px;width:16px;height:16px;border:1px solid var(--dsw-alias-bg-base);border-radius:50%;background:rgba(0,0,0,.78);color:#fff;font-size:12px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:2}
.dsan-capture-field{position:relative;flex:1;min-width:0;display:flex}.dsan-capture-input{flex:1;min-width:0;width:100%;height:38px;min-height:38px;max-height:calc(40vh / var(--dsan-zoom, 1));border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:transparent;padding:8px 12px;color:inherit;outline:none;font:inherit;line-height:1.5;resize:none;overflow:hidden;transition:height .18s ease}.dsan-capture-input.open{overflow-y:auto}.dsan-capture-ph{position:absolute;left:12px;right:12px;top:8px;line-height:1.5;font:inherit;color:var(--dsw-alias-label-secondary);opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}.dsan-slash-menu{position:absolute;left:22px;top:calc(100% - 4px);z-index:60;min-width:210px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.22);padding:5px;display:flex;flex-direction:column;gap:2px}.dsan-slash-item{display:flex;align-items:center;gap:10px;padding:6px 9px;border:none;background:none;color:inherit;font:inherit;text-align:left;border-radius:7px;cursor:pointer;white-space:nowrap}.dsan-slash-item:hover,.dsan-slash-item.active{background:var(--dsw-alias-bg-layer-2)}.dsan-slash-item .nm{font-weight:600;font-size:12px}.dsan-slash-item .ds{font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.dsan-capture-input.open{height:78px}
.dsan-capture-input:focus{border-color:var(--dsw-alias-brand-primary)}
.dsan-subbar{display:flex;align-items:center;gap:8px;padding:5px 22px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;font-size:12px;color:var(--dsw-alias-label-secondary);position:relative;z-index:2;min-width:0;flex-wrap:nowrap}
.dsan-capture .dsan-btn.primary{height:38px;border-radius:9px;padding:0 14px}
.dsan-subbar .t{color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsan-brand{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;white-space:nowrap;cursor:pointer}
.dsan-brand svg{width:18px;height:18px;color:var(--dsw-alias-brand-primary)}
.dsan-cap{flex:1;display:flex;gap:8px;min-width:0}
.dsan-cap textarea{flex:1;min-width:0;height:72px;min-height:72px;max-height:calc(40vh / var(--dsan-zoom, 1));border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);padding:8px 12px;color:inherit;outline:none;font:inherit;line-height:1.5;resize:vertical}
.dsan-cap textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.dsan-back{height:30px;padding:0 8px;border:none;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;border-radius:7px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;flex:none}
.dsan-back:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsan-sec-row{display:flex;align-items:center;justify-content:flex-start;gap:8px;margin-bottom:10px}
.dsan-switch-row{display:inline-flex;align-items:center;gap:8px;border:none;background:none;padding:0;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;cursor:pointer;text-align:left}
.dsan-switch{position:relative;width:36px;height:20px;border-radius:99px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);flex:none;transition:background .15s,border-color .15s}
.dsan-switch .knob{position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;transition:left .15s;color:var(--dsw-alias-state-success-primary)}
.dsan-switch-row.on .dsan-switch{background:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.dsan-switch-row.on .dsan-switch .knob{left:18px}
.dsan-switch .knob svg{width:9px;height:9px}
.dsan-privacy-toggle{height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.dsan-privacy-toggle:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsan-privacy-toggle.on{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, var(--dsw-alias-border-l2));color:var(--dsw-alias-label-secondary)}
.dsan-privacy-toggle.on:hover{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 15%, transparent);color:var(--dsw-alias-label-primary)}
.dsan-privacy-toggle svg{flex:none}
.dsan-privacy-toggle.on svg{color:var(--dsw-alias-state-warn-primary)}
.dsan-notebook-body{padding-bottom:24px}
.dsan-notebook-delete{margin:20px 0 0;display:flex;justify-content:flex-start}
.dsan-notebook-delete .dsan-btn{height:32px;min-width:88px;justify-content:center;line-height:1}
.dsan-privacy-badge{position:absolute;left:4px;top:4px;z-index:6;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle, rgba(0,0,0,.6) 0%, rgba(0,0,0,.38) 45%, rgba(0,0,0,0) 72%);color:#fff;display:flex;align-items:center;justify-content:center;pointer-events:none}
.dsan-content-area{flex:1;min-height:0;display:flex;flex-direction:column;position:relative;overflow:hidden}.dsan-body{min-height:0;flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;position:relative;z-index:1}
.dsan-btn{height:30px;padding:0 11px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.dsan-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.dsan-btn.primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.dsan-btn.danger{background:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);color:#fff}
.dsan-btn.danger:hover{background:var(--dsw-alias-state-error-primary);filter:brightness(.94)}
.dsan-btn.ghost{border-color:transparent}
.dsan-btn.small{height:24px;padding:0 8px;font-size:12px;border-radius:6px}
.dsan-btn:disabled{opacity:.5;cursor:default}
.dsan-icon-btn{width:30px;height:30px;padding:0;justify-content:center;line-height:1}
.dsan-icon-btn svg{display:block;flex:none}
.dsan-crumb{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:12px;min-width:0;flex:1;overflow:hidden;white-space:nowrap}
.dsan-crumb>span{display:flex;align-items:center;gap:6px;flex:none;white-space:nowrap}
.dsan-crumb>span:last-child{flex:0 1 auto;min-width:0;overflow:hidden}
.dsan-crumb a{color:inherit;cursor:pointer;text-decoration:none;white-space:nowrap}
.dsan-crumb a:hover{color:var(--dsw-alias-label-primary)}
.dsan-crumb .sep{opacity:.5;flex:none}
.dsan-crumb>span:last-child>a,.dsan-crumb>span:last-child>.cur{display:block;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsan-crumb .cur{color:var(--dsw-alias-label-primary)}
.dsan-home-wrap{position:relative;min-height:100%}
.dsan-home{padding:22px 22px 90px;max-width:none;margin:0;display:grid;grid-template-columns:minmax(0,1fr);gap:22px;align-items:stretch;position:relative;z-index:auto}
.dsan-home.todo-open{padding-right:336px}
.dsan-home-main{min-width:0}
.dsan-sec-title{font-size:12px;color:var(--dsw-alias-label-secondary);margin:0 0 10px}
.dsan-cards{display:grid;grid-template-columns:repeat(auto-fill,128px);gap:14px;justify-content:start;position:relative}
.dsan-insert-line{position:absolute;width:3px;background:#22c55e;border-radius:2px;z-index:20;pointer-events:none}
.dsan-book{position:relative;width:128px;height:172px;flex:none;border-radius:7px 11px 11px 7px;overflow:hidden;cursor:pointer;border:1px solid rgba(0,0,0,.08);box-shadow:0 5px 14px rgba(0,0,0,.13);transition:transform .12s,box-shadow .12s;color:#22262c}
.dsan-book:hover{transform:translateY(-2px);box-shadow:0 9px 22px rgba(0,0,0,.2)}
.dsan-book .cover{position:absolute;inset:0;background-size:cover;background-position:center}
.dsan-book.has-cover .cover{filter:saturate(.9)}
.dsan-book.has-cover::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.38),rgba(0,0,0,.08) 45%,rgba(0,0,0,.42));z-index:1}
.dsan-book .spine{position:absolute;left:0;top:0;bottom:0;width:8px;background:linear-gradient(90deg,rgba(0,0,0,.26),rgba(0,0,0,.01));z-index:3}
.dsan-book .book-text{position:absolute;left:13px;right:9px;bottom:10px;top:auto;z-index:4}
.dsan-book .book-text .title{font-weight:700;font-size:12.5px;line-height:1.35;max-height:2.7em;overflow:hidden;overflow-wrap:anywhere}
.dsan-book .book-text .desc{font-size:10px;line-height:1.45;margin-top:5px;opacity:.75;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.dsan-book .book-text .tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
.dsan-book .book-text .tag{font-size:9.5px;padding:1px 5px;border-radius:99px;background:rgba(0,0,0,.09);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsan-book.has-cover .book-text{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.55);background:linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,.24) 20%,rgba(0,0,0,.58) 55%,rgba(0,0,0,.74) 100%);padding:10px 14px 12px;border-radius:0;left:0;right:0;bottom:0;top:auto;transform:none}
.dsan-book.has-cover .book-text .tag{background:rgba(255,255,255,.22)}
.dsan-book .book-text .desc{color:inherit}

.dsan-book.add{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 55%, transparent);box-shadow:none}
.dsan-book.add:hover{color:var(--dsw-alias-label-primary)}
.dsan-page-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.2;pointer-events:none;z-index:0}
.dsan-card{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:14px 15px;background:var(--dsw-alias-bg-layer-1);cursor:pointer;transition:border-color .12s,transform .12s;min-height:96px;display:flex;flex-direction:column;gap:6px}
.dsan-card:hover{border-color:var(--dsw-alias-border-l2);transform:translateY(-1px)}
.dsan-card .t{font-weight:600;font-size:14px;display:flex;align-items:center;gap:7px}
.dsan-card .d{color:var(--dsw-alias-label-secondary);font-size:12px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;min-height:18px}
.dsan-card .m{color:var(--dsw-alias-label-secondary);font-size:11px;margin-top:auto;display:flex;justify-content:space-between;gap:8px}
.dsan-card.add{border-style:dashed;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary);min-height:96px}
.dsan-card.add:hover{color:var(--dsw-alias-label-primary)}
.dsan-list{display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;overflow:hidden;background:var(--dsw-alias-bg-layer-1)}
.dsan-row{display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);cursor:pointer;position:relative}
.dsan-row.insert-before::before,.dsan-row.insert-after::after{content:"";position:absolute;left:0;right:0;height:3px;background:#22c55e;z-index:5}
.dsan-row.insert-before::before{top:0}
.dsan-row.insert-after::after{bottom:0}
.dsan-row:last-child{border-bottom:none}
.dsan-row:hover{background:var(--dsw-alias-bg-layer-2)}
.dsan-row .n{width:24px;flex:none;align-self:stretch;display:inline-flex;align-items:center;justify-content:flex-end;line-height:1;color:var(--dsw-alias-label-secondary);opacity:.55;font-size:14px;font-weight:700;font-style:italic;font-family:Georgia,'Times New Roman','Songti SC',serif;font-variant-numeric:tabular-nums}
.dsan-row .ndot{flex:none;align-self:center;line-height:1;color:var(--dsw-alias-label-secondary);opacity:.45;margin-left:-7px;margin-right:-3px}
.dsan-row .t{font-weight:500;flex:none;max-width:46%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsan-row .s{flex:1;color:var(--dsw-alias-label-secondary);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsan-row .m{color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap}
.dsan-empty{padding:60px 20px;text-align:center;color:var(--dsw-alias-label-secondary)}
.dsan-page{padding:22px 30px 90px;max-width:980px;margin:0 auto;position:relative}
.dsan-notebook-page{isolation:isolate}
.dsan-notebook-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.13;pointer-events:none;z-index:-1;border-radius:12px}
.dsan-note-page{max-width:840px}
.dsan-note-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:18px;flex-wrap:wrap}.dsan-taginput{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-height:34px;padding:5px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}.dsan-taginput:focus-within{border-color:var(--dsw-alias-brand-primary)}.dsan-taginput-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:99px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);font-size:11.5px;line-height:1.5;white-space:nowrap}.dsan-taginput-chip .x{border:none;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:13px;line-height:1;padding:0}.dsan-taginput input{flex:1;min-width:90px;width:auto!important;border:none!important;background:transparent!important;color:inherit;outline:none;font:inherit;padding:2px 0!important;border-radius:0}
.dsan-note-title{font-size:22px;font-weight:600;margin:0;flex:1;min-width:200px;overflow:hidden;text-overflow:ellipsis}
.dsan-md{line-height:1.75;overflow-wrap:break-word}
.dsan-md h1{font-size:24px;margin:26px 0 12px;font-weight:600}
.dsan-md h2{font-size:19px;margin:24px 0 10px;font-weight:600}
.dsan-md h3{font-size:16px;margin:20px 0 8px;font-weight:600}
.dsan-md h4,.dsan-md h5,.dsan-md h6{font-size:14px;margin:16px 0 6px;font-weight:600}
.dsan-md p{margin:8px 0}
.dsan-md ul,.dsan-md ol{margin:8px 0;padding-left:22px}
.dsan-md li{margin:3px 0}
.dsan-md li.task{list-style:none;margin-left:-18px;display:flex;align-items:flex-start;gap:6px}
.dsan-md li.task input{margin-top:5px}
.dsan-md blockquote{margin:10px 0;padding:2px 14px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.dsan-md pre{margin:12px 0;padding:12px 14px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:auto;font-size:12px;line-height:1.6}
.dsan-md code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em;background:var(--dsw-alias-bg-layer-2);padding:1px 4px;border-radius:4px}
.dsan-md pre code{background:none;padding:0}
.dsan-md a{color:var(--dsw-alias-brand-primary);text-decoration:none;cursor:pointer}
.dsan-md a:hover{text-decoration:underline}
.dsan-md hr{border:none;border-top:1px solid var(--dsw-alias-border-l1);margin:18px 0}
.dsan-md table{border-collapse:collapse;margin:12px 0;font-size:12.5px;display:block;overflow:auto}
.dsan-md th,.dsan-md td{border:1px solid var(--dsw-alias-border-l1);padding:5px 9px;text-align:left}
.dsan-md th{background:var(--dsw-alias-bg-layer-2);font-weight:600}
.dsan-md img{max-width:100%;max-height:420px;width:auto;height:auto;object-fit:contain;border-radius:6px;display:block;margin:8px 0}
.dsan-editor{width:100%;min-height:calc(60vh / var(--dsan-zoom, 1));border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:12.5px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;padding:14px 16px;outline:none;resize:vertical}
.dsan-save{font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.dsan-conflict{border:1px solid var(--dsw-alias-state-warn-primary);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.dsan-cal{margin:0 auto;max-width:980px;display:flex;gap:22px}
.dsan-cal.single{max-width:560px}
.dsan-month{flex:1;min-width:0}
.dsan-month-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.dsan-month-title{font-weight:600;font-size:14px}
.dsan-week{display:grid;grid-template-columns:repeat(7,1fr);color:var(--dsw-alias-label-secondary);font-size:11px;text-align:center;margin-bottom:4px}
.dsan-days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.dsan-day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:8px;font-size:12.5px;color:var(--dsw-alias-label-secondary);user-select:none}
.dsan-day.out{opacity:.25}
.dsan-day.today{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary);font-weight:600}
.dsan-day.has{background:transparent;color:var(--dsw-alias-brand-primary);font-size:14px;font-weight:700;cursor:pointer}
.dsan-day.has:hover{background:transparent;color:var(--dsw-alias-brand-primary);text-decoration:underline;text-underline-offset:3px}
.dsan-day.has.today{box-shadow:none}
.dsan-cal-tools{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.dsan-todo-dock{position:absolute;right:22px;z-index:60;width:292px;display:flex;justify-content:flex-end;transition:top .18s ease}
.dsan-todo-dock .dsan-todo-wrap{position:static;width:100%;justify-content:flex-end}
.dsan-todo-wrap{position:sticky;top:12px;display:flex;justify-content:flex-end;align-self:start;z-index:45;pointer-events:none;width:100%}
.dsan-todo-wrap>*{pointer-events:auto}
.dsan-todo-pill{height:34px;padding:0 12px;border-radius:99px;border:1px solid rgba(255,255,255,.14);background:#1c2026;color:#f3f4f6;font:inherit;font-weight:600;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 6px 18px rgba(0,0,0,.28)}
.dsan-todo-pill:hover{background:#262b33}
.dsan-todo-pill .badge{min-width:17px;height:17px;padding:0 5px;border-radius:99px;background:var(--dsw-alias-state-error-primary);color:#fff;font-size:10.5px;line-height:17px;text-align:center;font-weight:700}
.dsan-todo{position:sticky;top:12px;width:100%;box-shadow:0 12px 32px rgba(0,0,0,.2);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) var(--dsan-todo-opacity, 100%), transparent);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh / var(--dsan-zoom, 1) - 140px)}
.dsan-todo-head{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);font-weight:600;font-size:12.5px}
.dsan-todo-head .sp{flex:1}
.dsan-todo-icon{width:24px;height:24px;padding:0;border:none;background:none;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none;line-height:1}
.dsan-todo-icon:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsan-todo-items{overflow:auto;scrollbar-gutter:stable;padding:4px 0}
.dsan-todo-item{display:flex;gap:8px;padding:7px 12px;align-items:flex-start}
.dsan-todo-item:hover{background:var(--dsw-alias-bg-layer-2)}
.dsan-todo-item.done .txt{text-decoration:line-through;color:var(--dsw-alias-label-secondary)}
.dsan-todo-item input[type=checkbox]{margin-top:4px;flex:none}
.dsan-todo-item .txt{flex:1;min-width:0;overflow-wrap:anywhere;cursor:text}
.dsan-todo-item .side{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:3px;font-size:10.5px;color:var(--dsw-alias-label-secondary);padding-top:1px}
.dsan-todo-item .side .del{border:none;background:none;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));cursor:pointer;font-size:14px;line-height:1;padding:0 2px}
.dsan-todo-item .side .del:hover{color:var(--dsw-alias-state-error-primary)}
.dsan-todo-item .tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:3px}
.dsan-tag{font-size:10.5px;padding:1px 6px;border-radius:99px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);cursor:pointer}
.dsan-tag.on{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);border-color:transparent}
.dsan-todo-add{padding:8px 10px;border-top:1px solid var(--dsw-alias-border-l1)}
.dsan-todo-add input{width:100%;height:30px;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:inherit;padding:0 9px;font:inherit;outline:none}
.dsan-ball{position:absolute;width:46px;height:46px;border-radius:50%;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.22);font-weight:600;font-size:12px;z-index:20;border:none}
.dsan-sticky-layer{position:sticky;top:0;left:0;width:100%;height:0;pointer-events:none;z-index:10}
.dsan-sticky{position:absolute;pointer-events:auto;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.16);display:flex;flex-direction:column;min-width:180px;min-height:110px;overflow:hidden;transition:box-shadow .15s,background-color .2s ease}
.dsan-sticky.colored{background:color-mix(in srgb, var(--dsan-sticky-tint) var(--dsan-sticky-opacity, 45%), transparent)}
.dsan-sticky.colored:focus-within,.dsan-sticky.colored:hover,.dsan-sticky.colored.pinned{background:var(--dsan-sticky-tint)}
.dsan-sticky:focus{outline:none}
.dsan-sticky:not(.colored){background:color-mix(in srgb, var(--dsw-alias-bg-overlay) var(--dsan-sticky-opacity, 45%), transparent)}
.dsan-sticky:not(.colored):focus-within,.dsan-sticky:not(.colored):hover,.dsan-sticky:not(.colored).pinned{background:var(--dsw-alias-bg-overlay)}
.dsan-sticky-head{display:flex;align-items:center;gap:6px;padding:6px 8px;cursor:grab;background:var(--dsw-alias-bg-layer-2);font-size:11px;color:var(--dsw-alias-label-secondary);user-select:none}
.dsan-sticky-head .sp{flex:1}
.dsan-sticky-head:focus{outline:none}
.dsan-sticky-body{flex:1;overflow:auto;padding:4px 8px 8px;scrollbar-width:none;-ms-overflow-style:none}.dsan-sticky-body::-webkit-scrollbar{display:none;width:0;height:0}.dsan-sticky-body.editing{display:flex}.dsan-sticky-text{padding:4px 2px;white-space:pre-wrap;overflow-wrap:anywhere;cursor:text;line-height:1.55;user-select:text}.dsan-sticky-text.empty{color:var(--dsw-alias-label-secondary);opacity:.7}.dsan-sticky-line{min-height:1.55em}.dsan-sticky-li{display:flex;gap:6px;align-items:flex-start}.dsan-sticky-li .bullet{flex:none;color:var(--dsw-alias-brand-primary);line-height:1.55}.dsan-sticky-li .txt{flex:1;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere}.dsan-sticky-editor{flex:1;width:100%;min-height:80px;border:none;background:transparent;color:inherit;font:inherit;line-height:1.55;outline:none;resize:none;padding:4px 2px;white-space:pre-wrap;overflow-wrap:anywhere;overflow:auto;scrollbar-width:none;-ms-overflow-style:none}.dsan-sticky-editor::-webkit-scrollbar{display:none;width:0;height:0}
.dsan-sticky-item{display:flex;gap:6px;align-items:flex-start;padding:2px 0}
.dsan-sticky-item input,.dsan-sticky-item textarea{flex:1;min-width:0;border:none;background:transparent;color:inherit;font:inherit;outline:none;padding:2px 0;resize:none;overflow:hidden;box-shadow:none;appearance:none}
.dsan-sticky-item .dot{color:var(--dsw-alias-brand-primary);line-height:1.6;flex:none}
.dsan-sticky-item .del{opacity:0;border:none;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:14px;padding:0 2px}
.dsan-sticky-act{width:26px;height:26px;border:none;background:none;color:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;flex:none;padding:0}
.dsan-sticky-act:hover{background:rgba(127,127,127,.14)}
.dsan-trash{width:26px;height:26px;border:none;background:none;color:var(--dsw-alias-state-error-primary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;flex:none;padding:0}
.dsan-trash:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)}
.dsan-sticky-item:hover .del{opacity:1}
.dsan-sticky-add{border:none;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;padding:4px 0;text-align:left}
.dsan-sticky-add:hover{color:var(--dsw-alias-label-primary)}
.dsan-h{position:absolute;z-index:2}
.dsan-h-n{left:8px;right:8px;top:0;height:7px;cursor:ns-resize}
.dsan-h-s{left:8px;right:8px;bottom:0;height:7px;cursor:ns-resize}
.dsan-h-e{top:8px;bottom:8px;right:0;width:7px;cursor:ew-resize}
.dsan-h-w{top:8px;bottom:8px;left:0;width:7px;cursor:ew-resize}
.dsan-h-ne{right:0;top:0;width:13px;height:13px;cursor:nesw-resize}
.dsan-h-nw{left:0;top:0;width:13px;height:13px;cursor:nwse-resize}
.dsan-h-se{right:0;bottom:0;width:13px;height:13px;cursor:nwse-resize;border-right:2px solid var(--dsw-alias-border-l2);border-bottom:2px solid var(--dsw-alias-border-l2);border-radius:0 0 8px 0}
.dsan-h-sw{left:0;bottom:0;width:13px;height:13px;cursor:nesw-resize}
.dsan-float{position:fixed;right:18px;bottom:18px;width:318px;z-index:60}
.dsan-float .dsan-sticky{position:relative;width:100%;height:220px;box-shadow:0 16px 40px rgba(0,0,0,.24)}
.dsan-fab{position:fixed;right:0;height:38px;touch-action:none;user-select:none;padding:0 12px 0 10px;border-radius:9px 0 0 9px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);border:none;cursor:pointer;display:flex;align-items:center;gap:6px;font:inherit;font-size:12px;z-index:40;box-shadow:0 6px 18px rgba(0,0,0,.18)}
.dsan-fab-min{border-radius:99px 0 0 99px;padding:0 14px 0 10px;gap:7px}
.dsan-color-btn{width:26px;height:26px;border:none;background:none;padding:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;flex:none}
.dsan-color-btn:hover{background:rgba(74,144,226,.14)}
.dsan-crop-stage{position:relative;width:360px;height:260px;margin:0 auto 10px;overflow:hidden;border-radius:10px;background:#101318;touch-action:none;border:1px solid var(--dsw-alias-border-l2)}
.dsan-crop-photo{position:absolute;pointer-events:none;user-select:none;-webkit-user-drag:none}
.dsan-crop-box{position:absolute;border:1px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.5);cursor:move;box-sizing:border-box;z-index:2}
.dsan-crop-handle{position:absolute;width:10px;height:10px;background:#fff;border-radius:2px;z-index:3}
.dsan-ch-nw{left:-5px;top:-5px;cursor:nwse-resize}
.dsan-ch-n{left:50%;top:-5px;margin-left:-5px;cursor:ns-resize}
.dsan-ch-ne{right:-5px;top:-5px;cursor:nesw-resize}
.dsan-ch-e{right:-5px;top:50%;margin-top:-5px;cursor:ew-resize}
.dsan-ch-se{right:-5px;bottom:-5px;cursor:nwse-resize}
.dsan-ch-s{left:50%;bottom:-5px;margin-left:-5px;cursor:ns-resize}
.dsan-ch-sw{left:-5px;bottom:-5px;cursor:nesw-resize}
.dsan-ch-w{left:-5px;top:50%;margin-top:-5px;cursor:ew-resize}
.dsan-crop-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary);text-align:center;margin-top:6px}
.dsan-swatches{position:absolute;right:6px;top:30px;z-index:30;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:6px;display:flex;gap:6px;box-shadow:0 8px 22px rgba(0,0,0,.2)}
.dsan-swatch{width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.18);cursor:pointer;padding:0}
.dsan-swatch:hover{transform:scale(1.12)}
.dsan-sticky.colored .dsan-sticky-head{background:rgba(0,0,0,.06);color:rgba(31,36,48,.82)}
.dsan-sticky.colored .dsan-sticky-head .dsan-btn{color:rgba(31,36,48,.82)}
.dsan-sticky.colored .dsan-sticky-head .dsan-btn:hover{background:rgba(0,0,0,.08)}
.dsan-reminder-stack{position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:10px;width:320px;max-width:calc(100vw / var(--dsan-zoom, 1) - 32px)}
.dsan-reminder-card{position:relative;overflow:hidden;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 14px 36px rgba(0,0,0,.28);padding:12px 14px;animation:dsan-in .16s ease-out}
.dsan-reminder-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.3;pointer-events:none}
.dsan-reminder-content{position:relative;z-index:1}
.dsan-reminder-card .rh{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-brand-primary);font-weight:600}
.dsan-reminder-card .rh .sp{flex:1}
.dsan-reminder-card .rx{border:none;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:18px;line-height:1;width:24px;height:24px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center}
.dsan-reminder-card .rx:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsan-reminder-card .rt{font-size:14px;line-height:1.6;margin-top:6px;overflow-wrap:anywhere}
.dsan-reminder-card .rc{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-top:8px;font-variant-numeric:tabular-nums}
.dsan-reminder-foot{display:flex;justify-content:flex-end;margin-top:10px}
.dsan-reminder-stop{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:11.5px;padding:4px 9px;border-radius:6px;cursor:pointer}
.dsan-reminder-stop:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.dsan-overlay{position:absolute;inset:0;background:rgba(0,0,0,.34);display:flex;align-items:center;justify-content:center;z-index:90;padding:24px}
.dsan-modal{background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.28);width:min(560px,100%);max-height:calc(88vh / var(--dsan-zoom, 1));display:flex;flex-direction:column;overflow:hidden}
.dsan-modal.wide{width:min(920px,100%)}
.dsan-modal-head{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);font-weight:600}
.dsan-modal-head .sp{flex:1}
.dsan-modal-body{padding:16px;overflow:auto}
.dsan-modal-foot{padding:12px 16px;border-top:1px solid var(--dsw-alias-border-l1);display:flex;justify-content:flex-end;gap:8px}
.dsan-set-section{margin-bottom:18px;padding:14px 14px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.dsan-set-title{font-size:13px;font-weight:600;margin-bottom:4px}
.dsan-set-desc{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.65;margin-bottom:12px}
.dsan-set-row{margin-bottom:12px}
.dsan-set-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.65;margin-top:4px}
.dsan-set-sub{border-top:1px solid var(--dsw-alias-border-l1);padding-top:12px;margin-top:12px}
.dsan-set-section .dsan-field:last-child{margin-bottom:4px}
.dsan-field{margin-bottom:12px}
.dsan-field label{display:block;position:relative;font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:5px}.dsan-field-hint{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;margin-left:5px;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font:italic 600 9px/1 Georgia,serif;cursor:help;vertical-align:1px;position:relative}.dsan-field-hint:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-secondary)}.dsan-field-hint::after{content:attr(data-hint);position:absolute;left:-6px;bottom:calc(100% + 7px);z-index:80;display:none;width:max-content;max-width:260px;padding:7px 9px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 10px 26px rgba(0,0,0,.28);font-family:inherit;font-size:11.5px;font-weight:400;font-style:normal;line-height:1.55;white-space:normal;text-align:left;pointer-events:none}.dsan-field-hint:hover::after{display:block}
.dsan-field input,.dsan-field textarea,.dsan-field select{width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:inherit;padding:7px 10px;font:inherit;outline:none}
.dsan-field input[type=checkbox],.dsan-field input[type=radio]{width:auto;height:auto;padding:0;margin:0;border:0;background:transparent;border-radius:0;flex:none;accent-color:var(--dsw-alias-brand-primary)}
.dsan-field textarea{min-height:70px;resize:vertical}
.dsan-panes{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dsan-pane{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px;max-height:calc(44vh / var(--dsan-zoom, 1));overflow:auto;font:12px/1.6 ui-monospace,Menlo,monospace;white-space:pre-wrap}
.dsan-pane.add{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent)}
.dsan-chip{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;padding:1px 7px;border-radius:99px;margin-left:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);cursor:pointer;vertical-align:1px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.dsan-chip.running{color:var(--dsw-alias-state-idle-primary)}
.dsan-chip.ok{color:var(--dsw-alias-state-success-primary)}
.dsan-chip.warn{color:var(--dsw-alias-state-warn-primary)}
.dsan-chip.err{color:var(--dsw-alias-state-error-primary)}
.dsan-setup{height:100%;display:flex;align-items:center;justify-content:center;padding:40px}
.dsan-setup-card{max-width:520px;text-align:center}
.dsan-setup-card svg{width:56px;height:56px;color:var(--dsw-alias-brand-primary)}
.dsan-setup-card h2{font-size:20px;margin:14px 0 6px}
.dsan-setup-card p{color:var(--dsw-alias-label-secondary);margin:0 0 18px;font-size:13px;line-height:1.7}
.dsan-kbd{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
`

    // ------------------------------------------------------------------ 小工具

    function cls(...parts) { return parts.filter(Boolean).join(' ') }

    function describeOperation(op) {
      const path = op.path || ''
      const chars = op.chars ? `（${op.chars} 字）` : ''
      switch (op.op) {
        case 'write': return `写入 ${path}${chars}`
        case 'create': return `新建 ${op.notebook || ''} / ${op.title || '新笔记'}${chars}`
        case 'rename': return `改名 ${path} → ${op.title || ''}`
        case 'delete': return `删除 ${path}`
        case 'move': return `移动 ${path} → ${op.notebook || ''}${op.title ? ` / ${op.title}` : ''}`
        case 'renameNotebook': return `笔记本改名 ${op.notebook || ''} → ${op.title || ''}`
        case 'deleteNotebook': return `删除笔记本 ${op.notebook || ''}`
        case 'frontmatter': return `更新 frontmeta ${path}${op.keys?.length ? `（${op.keys.join('、')}）` : ''}`
        case 'reorderNotebooks': return `调整笔记本顺序：${path}`
        case 'reorderNotes': return `调整笔记顺序：${path}`
        case 'todoAdd': return `新增待办「${op.text || ''}」${op.tags?.length ? `（${op.tags.join('、')}）` : ''}`
        case 'todoUpdate': return `更新待办「${op.text || op.id || ''}」`
        case 'todoDelete': return `删除待办 ${op.id || ''}`
        case 'memoCreate': return `新建便笺（${op.count || 0} 条）`
        case 'memoUpdate': return `更新便笺 ${op.id || ''}`
        case 'memoDelete': return `删除便笺 ${op.id || ''}`
        case 'memoPin': return `${op.pinned === false ? '取消固定' : '固定'}便笺 ${op.id || ''}`
        case 'settingsUpdate': return `修改设置：${(op.keys || []).join('、')}`
        case 'setNotebookPrivate': return `${op.private ? '设为隐私笔记本' : '取消隐私笔记本'}：${op.notebook || op.path || ''}`
        case 'setPrivacyMode': return `首页隐私模式：${op.enabled ? '开启' : '关闭'}`
        case 'fileMove': return `移动文件 ${op.from || ''} → ${op.to || ''}`
        case 'fileCopy': return `复制文件 ${op.from || ''} → ${op.to || ''}`
        case 'fileDelete': return `删除文件 ${path}`
        default: return `${op.op || '操作'} ${path}`
      }
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        try {
          const area = document.createElement('textarea')
          area.value = text
          area.style.position = 'fixed'
          area.style.opacity = '0'
          document.body.appendChild(area)
          area.select()
          document.execCommand('copy')
          area.remove()
          return true
        } catch { return false }
      }
    }

    function readLegacyUi() {
      const out = {}
      try {
        const hide = localStorage.getItem('dsan.todo.hideDone')
        if (hide !== null) out.todoHideDone = hide === '1'
      } catch { /* ignore */ }
      try {
        const raw = localStorage.getItem('dsan.capture.history')
        if (raw) {
          const list = JSON.parse(raw)
          if (Array.isArray(list)) out.captureHistory = list.slice(0, 50)
        }
      } catch { /* ignore */ }
      try {
        const saved = Number.parseInt(localStorage.getItem('dsan.fab.bottom.v2') || '', 10)
        if (Number.isFinite(saved) && saved > 0) out.fabBottom = saved
      } catch { /* ignore */ }
      return out
    }

    function readSavedView() {
      try {
        const value = JSON.parse(localStorage.getItem('dsan.view.v2') || 'null')
        if (value && ['home', 'notebook', 'note', 'diary', 'diaryDoc'].includes(value.kind)) return value
      } catch { /* ignore */ }
      return { kind: 'home' }
    }

    function saveView(view) {
      try { localStorage.setItem('dsan.view.v2', JSON.stringify(view)) } catch { /* ignore */ }
    }

    function clearLegacyUi() {
      try {
        localStorage.removeItem('dsan.todo.hideDone')
        localStorage.removeItem('dsan.capture.history')
        localStorage.removeItem('dsan.fab.top.v2')
      } catch { /* ignore */ }
    }

    function bookColor(name) {
      let hash = 0
      for (const ch of String(name)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0
      return `hsl(${hash % 360} 16% 72%)`
    }

    function tagHue(tag) {
      let hash = 0
      for (const ch of String(tag)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0
      return hash % 360
    }

    function tagStyle(tag, active) {
      if (active) return undefined
      const hue = tagHue(tag)
      return { color: `hsl(${hue} 55% 46%)`, borderColor: `hsl(${hue} 55% 46% / .42)` }
    }

    function fmtDate(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return ''
      return `${d.getMonth() + 1}月${d.getDate()}日`
    }

    function fmtReminderTime(iso) {
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return String(iso || '')
      const now = new Date()
      const sameYear = date.getFullYear() === now.getFullYear()
      const day = sameYear
        ? `${date.getMonth() + 1}月${date.getDate()}日`
        : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
      return `${day} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    function fmtFullDate(iso) {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return ''
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    function headingFor(dateStr) {
      const d = new Date(`${dateStr}T00:00:00`)
      if (Number.isNaN(d.getTime())) return `### ${dateStr}`
      const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()]
      return `### ${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${week}`
    }

    function stripTitleHeading(body, title) {
      const lines = String(body || '').split('\n')
      if (lines[0] && lines[0].trim() === `# ${title}`) return lines.slice(1).join('\n').replace(/^\n+/, '')
      return body
    }

    function resolveRel(baseDir, rel) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(rel) || rel.startsWith('#')) return rel
      const clean = rel.split('#')[0].split('?')[0]
      const parts = String(baseDir || '').split('/').filter(Boolean)
      for (const piece of clean.split('/')) {
        if (!piece || piece === '.') continue
        if (piece === '..') parts.pop()
        else parts.push(piece)
      }
      return parts.join('/')
    }

    function assetUrl(rel) {
      return `${IMG}?path=${encodeURIComponent(rel)}`
    }

    function soundUrl(file) {
      return `${SOUND}?path=${encodeURIComponent(file || 'default')}`
    }

    function pluginAsset(name) {
      return `${ASSET}?name=${encodeURIComponent(name)}`
    }

    function pickReminderVoice(gender) {
      try {
        const voices = speechSynthesis.getVoices?.() || []
        const chinese = voices.filter((item) => /^zh/i.test(item.lang) || /Chinese|中文/i.test(`${item.name} ${item.lang}`))
        const male = /male|男|Kangkang|Yunxi|Yunyang|Yunjian|Yunye|Li-?mu|Liang|Zhiwei|Bo\b/i
        const female = /female|女|Ting-?Ting|Tingting|Meijia|Mei-?Jia|Sin-?ji|Huihui|Yaoyao|Xiaoxiao|Xiaoyi/i
        const proper = chinese.filter((item) => male.test(item.name) || female.test(item.name))
        const pool = proper.length ? proper : chinese
        if (gender === 'male') {
          const found = pool.find((item) => male.test(item.name))
          if (found) return { voice: found, pitch: 1 }
          const fallback = pool.find((item) => female.test(item.name)) || pool[0]
          return fallback ? { voice: fallback, pitch: 0.7 } : null
        }
        if (gender === 'female') {
          const found = pool.find((item) => female.test(item.name))
          return found ? { voice: found, pitch: 1 } : (pool[0] ? { voice: pool[0], pitch: 1 } : null)
        }
        const auto = pool.find((item) => /Ting-?Ting|Tingting|Meijia|Mei-?Jia|Sin-?ji/i.test(item.name)) || pool[0]
        return auto ? { voice: auto, pitch: 1 } : null
      } catch {
        return null
      }
    }

    function speakReminder(text, gender = 'auto', volume = 100) {
      try {
        if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return false
        const utterance = new SpeechSynthesisUtterance(String(text || ''))
        utterance.lang = 'zh-CN'
        utterance.rate = 1
        utterance.pitch = 1
        utterance.volume = Math.max(0.01, Math.min(1, (Number(volume) || 100) / 100))
        const selection = pickReminderVoice(gender)
        if (selection?.voice) utterance.voice = selection.voice
        if (selection?.pitch) utterance.pitch = selection.pitch
        speechSynthesis.cancel()
        speechSynthesis.speak(utterance)
        return true
      } catch {
        return false
      }
    }

    function imgSrc(root, baseDir, src) {
      if (/^(https?:|data:|blob:)/i.test(src)) return src
      const rel = resolveRel(baseDir, decodeURIComponent(src))
      return `${IMG}?path=${encodeURIComponent(rel)}`
    }

    function splitFront(text) {
      const raw = String(text || '')
      if (!raw.startsWith('---\n')) return { body: raw, meta: null }
      const end = raw.indexOf('\n---', 4)
      if (end === -1) return { body: raw, meta: null }
      return { body: raw.slice(end + 4).replace(/^\n/, ''), meta: raw.slice(4, end) }
    }

    function parseTags(meta) {
      if (!meta) return []
      const m = /tags\s*:\s*\[([^\]]*)\]/.exec(meta)
      return m ? m[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : []
    }

    function parseSummary(meta) {
      if (!meta) return ''
      const m = /summary\s*:\s*(.+)/.exec(meta)
      return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''
    }

    // ------------------------------------------------------------------ markdown

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    }

    function inlineNodes(src, opts = {}, keyBase = 'i') {
      const nodes = []
      const text = String(src ?? '')
      let last = 0
      let index = 0
      const pattern = /(`[^`]+`)|(!\[[^\]]*\]\([^)]+\))|(\[[^\]]*\]\([^)]+\))|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(\*[^*]+\*)/g
      let match
      while ((match = pattern.exec(text))) {
        if (match.index > last) nodes.push(text.slice(last, match.index))
        const token = match[0]
        const key = `${keyBase}-${index++}`
        if (token.startsWith('`')) {
          nodes.push(h('code', { key }, token.slice(1, -1)))
        } else if (token.startsWith('![')) {
          const m = /^!\[([^\]]*)\]\(([^)]+)\)/.exec(token)
          nodes.push(h('img', { key, src: imgSrc(opts.root, opts.noteDir, m[2]), alt: m[1] }))
        } else if (token.startsWith('[')) {
          const m = /^\[([^\]]*)\]\(([^)]+)\)/.exec(token)
          const label = m[1]
          const url = m[2]
          const external = /^(https?:|mailto:)/i.test(url)
          const onClick = (event) => {
            if (external) return
            event.preventDefault()
            const [pathPart, hash] = url.split('#')
            const target = resolveRel(opts.noteDir, pathPart)
            if (opts.onOpenNote) opts.onOpenNote(target, hash)
          }
          nodes.push(h('a', { key, href: external ? url : '#', target: external ? '_blank' : undefined, rel: external ? 'noreferrer' : undefined, onClick }, label))
        } else if (token.startsWith('**')) {
          nodes.push(h('strong', { key }, token.slice(2, -2)))
        } else if (token.startsWith('~~')) {
          nodes.push(h('del', { key }, token.slice(2, -2)))
        } else if (token.startsWith('*')) {
          nodes.push(h('em', { key }, token.slice(1, -1)))
        }
        last = match.index + token.length
      }
      if (last < text.length) nodes.push(text.slice(last))
      return nodes
    }

    function isBlockStart(line) {
      return /^(#{1,6})\s+/.test(line) || /^```/.test(line) || /^>\s?/.test(line) ||
        /^\s*([-*+]|\d+\.)\s+/.test(line) || /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
        (line.includes('|') && /^\s*\|?[\s:|-]+\|?\s*$/.test(line))
    }

    function parseTable(lines, start, opts, key) {
      let i = start
      const rows = []
      let header = null
      if (lines[i] && lines[i].includes('|')) {
        header = lines[i].split('|').map((s) => s.trim()).filter((s, idx, arr) => !(idx === 0 && s === '') && !(idx === arr.length - 1 && s === ''))
        i += 1
      }
      if (lines[i] && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i])) i += 1
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        const cells = lines[i].split('|').map((s) => s.trim())
        if (cells[0] === '') cells.shift()
        if (cells[cells.length - 1] === '') cells.pop()
        rows.push(cells)
        i += 1
      }
      const node = h('table', { key }, [
        header ? h('thead', { key: 'th' }, h('tr', null, header.map((cell, idx) => h('th', { key: idx }, inlineNodes(cell, opts, `${key}-h${idx}`))))) : null,
        h('tbody', { key: 'tb' }, rows.map((row, r) => h('tr', { key: r }, row.map((cell, c) => h('td', { key: c }, inlineNodes(cell, opts, `${key}-${r}-${c}`)))))),
      ])
      return { node, next: i }
    }

    function parseList(lines, start, opts, key) {
      const first = /^(\s*)([-*+]|\d+\.)\s+/.exec(lines[start])
      const baseIndent = first ? first[1].length : 0
      const ordered = first ? /^\d+\./.test(first[2]) : false
      const items = []
      let i = start
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(lines[i])
        if (!m) {
          if (items.length && lines[i].trim() && /^\s{2,}/.test(lines[i]) && !isBlockStart(lines[i])) {
            items[items.length - 1].text += `\n${lines[i].trim()}`
            i += 1
            continue
          }
          break
        }
        if (m[1].length < baseIndent) break
        if (m[1].length > baseIndent) {
          const nested = parseList(lines, i, opts, `${key}-n${i}`)
          if (items.length) items[items.length - 1].children.push(nested.node)
          i = nested.next
          continue
        }
        let text = m[3]
        let task = null
        const tm = /^\[( |x|X)\]\s+(.*)$/.exec(text)
        if (tm) { task = tm[1].toLowerCase() === 'x'; text = tm[2] }
        items.push({ text, task, children: [] })
        i += 1
      }
      const Tag = ordered ? 'ol' : 'ul'
      const node = h(Tag, { key }, items.map((item, idx) => {
        const inner = inlineNodes(item.text, opts, `${key}-${idx}`)
        let extra = null
        if (item.task !== null && item.task !== undefined) {
          return h('li', { key: idx, className: 'task' }, [
            h('input', { key: 'cb', type: 'checkbox', checked: item.task, readOnly: true }),
            h('span', { key: 'sp' }, inner),
            ...item.children,
          ])
        }
        if (opts.captureFor) {
          const capture = opts.captureFor(item.text)
          if (capture) extra = captureChip(capture, opts)
        }
        const kids = [h('span', { key: 's' }, inner)]
        if (item.children.length) kids.push(...item.children)
        if (extra) kids.push(extra)
        return h('li', { key: idx }, kids)
      }))
      return { node, next: i }
    }

    function captureChip(capture, opts) {
      const status = capture.status === 'pending' || capture.status === 'running'
        ? { cls: 'running', label: capture.status === 'pending' ? '待归档' : '归档中' }
        : capture.status === 'failed' ? { cls: 'err', label: '归档失败' }
          : capture.status === 'diary-only' ? { cls: '', label: '仅日记' }
            : capture.needsRewrite ? { cls: 'warn', label: '建议整理' }
              : { cls: 'ok', label: '已归档' }
      return h('button', {
        key: 'chip',
        type: 'button',
        className: `dsan-chip ${status.cls}`,
        title: '点开处理这条记录',
        onClick: (event) => { event.stopPropagation(); opts.onCapture && opts.onCapture(capture) },
      }, status.label)
    }

    function renderBlocks(text, opts, keyBase = 'b') {
      const source = String(text || '').replace(/\r\n/g, '\n')
      const lines = source.split('\n')
      const out = []
      let i = 0
      let k = 0
      while (i < lines.length) {
        const line = lines[i]
        if (!line.trim()) { i += 1; continue }
        const key = `${keyBase}-${k++}`
        if (/^```/.test(line)) {
          const lang = line.slice(3).trim()
          const buf = []
          i += 1
          while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i += 1 }
          i += 1
          out.push(h('pre', { key }, h('code', { className: lang ? `lang-${lang}` : undefined }, buf.join('\n'))))
          continue
        }
        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading) {
          const level = Math.min(6, heading[1].length)
          const content = heading[2]
          out.push(h(`h${level}`, { key, 'data-heading': content.replace(/[*_`]/g, '') }, inlineNodes(content, opts, key)))
          i += 1
          continue
        }
        if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push(h('hr', { key })); i += 1; continue }
        if (/^>\s?/.test(line)) {
          const buf = []
          while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i += 1 }
          out.push(h('blockquote', { key }, renderBlocks(buf.join('\n'), opts, `${key}-q`)))
          continue
        }
        if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
          const res = parseList(lines, i, opts, key)
          out.push(res.node)
          i = res.next
          continue
        }
        if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
          const res = parseTable(lines, i, opts, key)
          out.push(res.node)
          i = res.next
          continue
        }
        const buf = []
        while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { buf.push(lines[i]); i += 1 }
        out.push(h('p', { key }, inlineNodes(buf.join('\n'), opts, key)))
      }
      return out
    }

    function Markdown({ text, opts }) {
      const clean = String(text || '').replace(/<!--\s*dsan-capture:[^>]*-->/g, '')
      return h('div', { className: 'dsan-md' }, renderBlocks(clean, opts))
    }

    // ------------------------------------------------------------------ 基础组件

    function Icon({ size = 18 }) {
      return h('svg', { viewBox: '0 0 1254 1254', width: size, height: size, 'aria-label': '随记', role: 'img' },
        h('path', { fill: 'currentColor', d: 'M 146 880 C 160 745 178 658 190 552 C 216 309 255 260 463 230 C 591 211 755 192 855 190 C 981 184 1052 230 1036 381 C 1026 484 1001 523 962 557 C 946 571 930 567 934 542 C 940 486 950 423 954 378 C 961 311 938 296 870 298 C 752 300 559 328 431 359 C 343 380 330 408 308 515 C 286 617 270 717 259 805 C 240 937 255 992 436 980 C 550 973 718 965 813 949 C 942 930 944 897 993 679 C 930 731 845 787 767 812 C 687 841 637 827 614 785 C 589 736 619 693 650 629 C 671 586 597 628 573 642 C 498 684 451 730 414 772 C 387 804 350 785 364 742 C 391 671 506 586 580 548 C 667 502 728 494 759 527 C 809 578 753 662 726 708 C 705 746 746 742 796 713 C 894 657 951 612 1002 556 C 1036 517 1077 504 1100 533 C 1118 554 1117 578 1107 614 C 1085 693 1087 762 1072 852 C 1047 1013 996 1043 808 1057 C 632 1064 528 1076 416 1088 C 298 1102 213 1093 166 1008 C 146 971 141 926 146 880 Z' }))
    }

    function ChatIcon({ size = 17, strokeWidth = 1.8 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9.5 9.5 0 0 1-3.2-.6L3 21l1.7-4.8A8.4 8.4 0 1 1 21 11.5z' }),
        h('path', { d: 'M8 10h8M8 14h5' }))
    }

    function GearIcon({ size = 14, strokeWidth = 1.8 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('circle', { cx: 12, cy: 12, r: 3.1 }),
        h('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }))
    }

    function Modal({ title, children, footer, onClose, wide, bodyClass }) {
      useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose?.() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      return h('div', { className: 'dsan-overlay' },
        h('div', { className: cls('dsan-modal', wide && 'wide'), role: 'dialog', 'aria-modal': 'true' },
          h('div', { className: 'dsan-modal-head' }, title, h('span', { className: 'sp' }),
            h('button', { className: 'dsan-btn ghost dsan-icon-btn', onClick: onClose, 'aria-label': '关闭' }, '×')),
          h('div', { className: cls('dsan-modal-body', bodyClass) }, children),
          footer ? h('div', { className: 'dsan-modal-foot' }, footer) : null))
    }

    function Field({ label, hint, children }) {
      return h('div', { className: 'dsan-field' },
        h('label', null,
          label,
          hint ? h('span', { className: 'dsan-field-hint', 'data-hint': hint, 'aria-label': hint, role: 'img' }, 'i') : null),
        children)
    }

    function Switch({ checked, onChange, label, disabled = false, className = '', onIcon, offIcon }) {
      return h('button', {
        type: 'button', role: 'switch', 'aria-checked': checked === true, disabled,
        className: cls('dsan-switch-row', checked && 'on', className),
        onClick: () => onChange?.(!checked),
      },
        h('span', { className: 'dsan-switch' },
          h('span', { className: 'knob' },
            checked
              ? (onIcon || h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: 'M4 12l5 5L20 6' })))
              : (offIcon || null))),
        label ? h('span', null, label) : null)
    }

    function PrivacyIcon({ open = false, size = 9 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('rect', { x: 5, y: 11, width: 14, height: 10, rx: 2 }),
        open
          ? h('path', { d: 'M8 11V8a4 4 0 0 1 7.5-2' })
          : h('path', { d: 'M8 11V8a4 4 0 0 1 8 0v3' }))
    }

    // ------------------------------------------------------------------ 便笺

    function StickyCard({ sticky, onSave, onDelete, onLayout, floating, onMinimize, canMinimize = true, onItems, onRaise, scale = 1 }) {
      const [items, setItems] = useState(sticky.items || [])
      const [editing, setEditing] = useState(false)
      const editorRef = useRef(null)
      const caretTarget = useRef(null)
      useEffect(() => {
        if (!editing) return
        const el = editorRef.current
        if (!el) return
        el.focus()
        const wanted = Number.isFinite(caretTarget.current) ? caretTarget.current : el.value.length
        const pos = Math.max(0, Math.min(Number(wanted), el.value.length))
        try { el.setSelectionRange(pos, pos) } catch { /* ignore */ }
        caretTarget.current = null
      }, [editing])
      const [paletteOpen, setPaletteOpen] = useState(false)
      const paletteRef = useRef(null)
      const colorBtnRef = useRef(null)
      useEffect(() => {
        if (!paletteOpen) return
        const onDown = (event) => {
          if (paletteRef.current?.contains(event.target)) return
          if (colorBtnRef.current?.contains(event.target)) return
          setPaletteOpen(false)
        }
        window.addEventListener('pointerdown', onDown, true)
        return () => window.removeEventListener('pointerdown', onDown, true)
      }, [paletteOpen])
      const drag = useRef(null)
      const saveTimer = useRef(null)
      const zoom = scale > 0 ? scale : 1
      const boxRef = useRef(null)
      const itemsRef = useRef(sticky.items || [])
      useEffect(() => { setItems(sticky.items || []); itemsRef.current = sticky.items || [] }, [sticky.id])
      const itemsKey = JSON.stringify(sticky.items || [])
      useEffect(() => {
        const box = boxRef.current
        if (box && box.contains(document.activeElement)) return
        const next = sticky.items || []
        setItems(next)
        itemsRef.current = next
      }, [itemsKey])
      useEffect(() => () => {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        const latest = itemsRef.current.slice()
        if (latest.some((item) => String(item || '').trim())) {
          api('sticky.save', { id: sticky.id, items: latest }).catch(() => { })
        }
      }, [])

      useEffect(() => { onItems?.(items) }, [items])

      const flush = (next, extra = {}) => {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => { api('sticky.save', { id: sticky.id, items: next, ...extra }).catch(() => { }) }, 250)
      }

      const text = items.length ? items.join('\n') : ''
      const updateText = (value) => {
        const next = String(value).split('\n').map((line) => line.replace(/\r$/, ''))
        setItems(next)
        itemsRef.current = next
        flush(next)
      }
      const caretForLine = (index) => {
        const all = items.length ? items : ['']
        if (!Number.isFinite(index) || index < 0) return all.join('\n').length
        let offset = 0
        for (let i = 0; i < index && i < all.length; i += 1) offset += all[i].length + 1
        return offset + (all[index]?.length || 0)
      }
      const renderText = (value) => String(value).split('\n').map((line, index) => {
        const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
        if (bullet) {
          return h('div', { key: index, className: 'dsan-sticky-li', 'data-line-index': index },
            h('span', { className: 'bullet' }, '•'),
            h('span', { className: 'txt' }, bullet[1] || '\u00a0'))
        }
        return h('div', { key: index, className: 'dsan-sticky-line', 'data-line-index': index }, line || '\u00a0')
      })

      const startDrag = (event) => {
        event.currentTarget.focus?.({ preventScroll: true })
        if (floating) return
        event.preventDefault()
        const start = { x: event.clientX, y: event.clientY, left: sticky.x, top: sticky.y }
        drag.current = { kind: 'move', start }
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }
      const startResize = (dir) => (event) => {
        event.preventDefault()
        event.stopPropagation()
        drag.current = { kind: 'resize', dir, start: { x: event.clientX, y: event.clientY, left: sticky.x, top: sticky.y, w: sticky.w, h: sticky.h } }
      }
      useEffect(() => {
        const move = (event) => {
          const state = drag.current
          if (!state) return
          const dx = (event.clientX - state.start.x) / zoom
          const dy = (event.clientY - state.start.y) / zoom
          if (state.kind === 'move') {
            onLayout(sticky.id, { x: Math.max(0, state.start.left + dx), y: Math.max(0, state.start.top + dy) })
          } else {
            const dir = state.dir
            let left = state.start.left
            let top = state.start.top
            let w = state.start.w
            let h = state.start.h
            if (dir.includes('e')) w = Math.max(180, state.start.w + dx)
            if (dir.includes('s')) h = Math.max(110, state.start.h + dy)
            if (dir.includes('w')) {
              w = Math.max(180, state.start.w - dx)
              left = state.start.left + (state.start.w - w)
            }
            if (dir.includes('n')) {
              h = Math.max(110, state.start.h - dy)
              top = state.start.top + (state.start.h - h)
            }
            onLayout(sticky.id, { x: Math.max(0, left), y: Math.max(0, top), w, h })
          }
        }
        const up = () => { drag.current = null }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
      }, [onLayout, sticky.id, sticky.x, sticky.y, sticky.w, sticky.h, zoom])

      const tint = sticky.color || ''
      const colorStyle = tint ? { '--dsan-sticky-tint': tint, color: '#1f2430' } : {}
      const style = floating
        ? colorStyle
        : { ...colorStyle, left: `${sticky.x}px`, top: `${sticky.y}px`, width: `${sticky.w}px`, height: `${sticky.h}px`, zIndex: sticky.z || 1 }

      const pinIcon = h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M9 3h6l-1 8 3 3v2H7v-2l3-3-1-8z' }), h('path', { d: 'M12 16v5' }))

      return h('div', {
        className: cls('dsan-sticky', tint && 'colored', sticky.pinned && 'pinned'), style, ref: boxRef,
        tabIndex: 0,
        onPointerDown: (event) => {
          const target = event.target
          if (target.closest && target.closest('input,textarea,button,select,a,[contenteditable="true"]')) return
          event.currentTarget.focus?.({ preventScroll: true })
        },
        onPointerUp: (event) => {
          if (event.button === 0 && !(event.target.closest && event.target.closest('button'))) onRaise?.(sticky.id)
        },
      },
        h('div', {
          className: 'dsan-sticky-head',
          tabIndex: 0,
          onPointerDown: (event) => {
            if (event.target.closest && event.target.closest('button')) return
            startDrag(event)
          },
        },
          h('span', null, sticky.createdAt ? fmtFullDate(sticky.createdAt) : '便笺'),
          h('span', { className: 'sp' }),
          h('button', {
            className: 'dsan-sticky-act',
            title: sticky.pinned ? '取消固定' : '固定到子页',
            'aria-label': sticky.pinned ? '取消固定' : '固定到子页',
            style: sticky.pinned ? { color: '#1f7ae0' } : undefined,
            onClick: () => api(sticky.pinned ? 'sticky.unpin' : 'sticky.pin', { id: sticky.id }).then(() => onSave?.()).catch(() => { }),
          }, h('span', {
            style: {
              display: 'inline-flex',
              transform: sticky.pinned ? 'rotate(-35deg)' : 'none',
              filter: sticky.pinned ? 'drop-shadow(0 0 3px rgba(31,122,224,.55))' : 'none',
            },
          }, pinIcon)),
          h('button', {
            ref: colorBtnRef,
            className: 'dsan-color-btn', title: '便笺颜色', 'aria-label': '便笺颜色',
            onClick: () => setPaletteOpen((v) => !v),
          }, h('span', { style: { width: 11, height: 11, borderRadius: '9999px', background: '#93c5f2', border: '1px solid #6b7280', display: 'block', flex: '0 0 auto' } })),
          paletteOpen ? h('div', { className: 'dsan-swatches', ref: paletteRef }, STICKY_COLORS.map((color) => h('button', {
            key: color, className: 'dsan-swatch', style: { background: color }, title: color,
            onClick: () => { setPaletteOpen(false); api('sticky.save', { id: sticky.id, color }).then(() => onSave?.()).catch(() => { }) },
          }))) : null,
          canMinimize ? h('button', {
            className: 'dsan-btn ghost small', title: '收起',
            onClick: () => {
              if (onMinimize) onMinimize()
              else api('sticky.save', { id: sticky.id, minimized: true }).then(() => onSave?.())
            },
          }, '—') : null,
          h('button', {
            className: 'dsan-trash', title: '删除便笺', 'aria-label': '删除便笺',
            onClick: () => onDelete?.(sticky.id),
          }, h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
            h('path', { d: 'M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v5M14 11v5' })))),
        h('div', { className: cls('dsan-sticky-body', editing && 'editing') },
          editing
            ? h('textarea', {
              ref: editorRef,
              className: 'dsan-sticky-editor',
              value: text,
              autoFocus: true,
              placeholder: '随手写点什么；以 - 或 * 开头的行会显示成列表',
              onChange: (event) => updateText(event.target.value),
              onBlur: () => { flush(itemsRef.current); setEditing(false) },
              onKeyDown: (event) => { if (event.key === 'Escape') event.currentTarget.blur() },
            })
            : h('div', {
              className: cls('dsan-sticky-text', !text.trim() && 'empty'),
              title: '点击编辑',
              onClick: (event) => {
                const line = event.target?.closest?.('[data-line-index]')
                const index = line ? Number(line.getAttribute('data-line-index')) : -1
                caretTarget.current = caretForLine(index)
                setEditing(true)
              },
            }, text.trim() ? renderText(text) : '随手写点什么；以 - 或 * 开头的行会显示成列表')),
        floating ? null : ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((dir) =>
          h('div', { key: dir, className: `dsan-h dsan-h-${dir}`, onPointerDown: startResize(dir) })))
    }

    // ------------------------------------------------------------------ 待办

    function TodoCard({ todo, onSave, expanded = false, onExpandChange, hideDone = false, onHideDoneChange, onReminderCreated, notifySurface }) {
      const [items, setItems] = useState(todo?.items || [])
      const [version, setVersion] = useState(todo?.version || 0)
      const [draft, setDraft] = useState('')
      const [filter, setFilter] = useState('')
      const timer = useRef(null)
      useEffect(() => { setItems(todo?.items || []); setVersion(todo?.version || 0) }, [todo])
      const commit = (next) => {
        setItems(next)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          api('todo.save', { items: next, baseVersion: version }).then((res) => {
            if (Array.isArray(res?.items)) setItems(res.items)
            if (res?.version) setVersion(res.version)
            if (res?.remindersCreated?.length) onReminderCreated?.(res.remindersCreated)
            onSave?.()
          }).catch((err) => {
            notifySurface?.({ title: '待办保存失败', body: err.message })
            onSave?.()
          })
        }, 400)
      }
      const openCount = items.filter((item) => !item.done).length
      const allDone = items.length > 0 && openCount === 0
      const showCollapsed = !expanded
      const shown = items.filter((item) => !hideDone || !item.done)
      const tags = [...new Set(shown.flatMap((item) => item.tags || []))]
      const visible = shown.filter((item) => !filter || (item.tags || []).includes(filter))
      useEffect(() => {
        if (filter && !tags.includes(filter)) setFilter('')
      }, [filter, tags.join('|')])

      if (showCollapsed) {
        return h('div', { className: 'dsan-todo-wrap' },
          h('button', {
            className: 'dsan-todo-pill', title: '打开待办',
            onClick: () => onExpandChange?.(true),
          }, h('span', null, '待办'), openCount > 0 ? h('span', { className: 'badge' }, openCount > 99 ? '99+' : openCount) : null))
      }

      const add = () => {
        const raw = draft.trim()
        if (!raw) return
        const found = [...raw.matchAll(/#([^\s#]+)/g)].map((m) => m[1]).filter(Boolean)
        const text = raw.replace(/#[^\s#]+/g, '').trim()
        if (!text) return
        const next = [{ id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, text, done: false, tags: found, createdAt: new Date().toISOString() }, ...items]
        setDraft('')
        onExpandChange?.(true)
        commit(next)
      }

      return h('div', { className: 'dsan-todo-wrap' }, h('div', { className: 'dsan-todo' },
        h('div', { className: 'dsan-todo-head' },
          h('span', null, '待办'),
          h('span', { className: 'sp' }),
          h('button', {
            className: 'dsan-todo-icon',
            title: hideDone ? '显示已完成' : '隐藏已完成',
            'aria-label': hideDone ? '显示已完成' : '隐藏已完成',
            style: { color: hideDone ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-brand-primary)' },
            onClick: () => onHideDoneChange?.(!hideDone),
          }, hideDone
            ? h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
              h('path', { d: 'M3 3l18 18' }),
              h('path', { d: 'M10.6 6.2A9.9 9.9 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.1 3.6M6.1 6.1A17 17 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 3.3-.6' }),
              h('path', { d: 'M9.9 9.9a3 3 0 0 0 4.2 4.2' }))
            : h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
              h('path', { d: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z' }),
              h('circle', { cx: 12, cy: 12, r: 2.6 }))),
          h('button', {
            className: 'dsan-todo-icon', title: '收起', 'aria-label': '收起待办',
            onClick: () => onExpandChange?.(false),
          }, h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
            h('path', { d: 'M6 14l6-6 6 6' })))),
        tags.length ? h('div', { style: { padding: '6px 10px', display: 'flex', gap: 5, flexWrap: 'wrap', borderBottom: '1px solid var(--dsw-alias-border-l1)' } },
          tags.map((tag) => h('span', { key: tag, className: cls('dsan-tag', filter === tag && 'on'), style: tagStyle(tag, filter === tag), onClick: () => setFilter(filter === tag ? '' : tag) }, `#${tag}`))) : null,
        h('div', { className: 'dsan-todo-items' }, visible.length ? visible.map((item) => h('div', { key: item.id, className: cls('dsan-todo-item', item.done && 'done') },
          h('input', {
            type: 'checkbox', checked: item.done,
            onChange: () => commit(items.map((x) => x.id === item.id ? { ...x, done: !x.done } : x)),
          }),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', {
              className: 'txt',
              onDoubleClick: () => {
                const next = window.prompt('修改待办', item.text)
                if (next !== null && next.trim()) commit(items.map((x) => x.id === item.id ? { ...x, text: next.trim() } : x))
              },
            }, item.text),
            (item.tags || []).length ? h('div', { className: 'tags' }, (item.tags || []).map((tag) => h('span', { key: tag, className: 'dsan-tag', style: tagStyle(tag, false) }, `#${tag}`))) : null),
          h('div', { className: 'side' },
            h('span', null, fmtDate(item.createdAt)),
            h('button', {
              className: 'del', title: '删除', 'aria-label': '删除待办',
              onClick: () => commit(items.filter((x) => x.id !== item.id)),
            }, '×')))) : h('div', { style: { padding: '14px 12px', color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } }, '没有待办')),
        h('div', { className: 'dsan-todo-add' },
          h('input', {
            value: draft, placeholder: '加一条待办，可写 #标签',
            onChange: (event) => setDraft(event.target.value),
            onKeyDown: (event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); add() } },
          }))))
    }

    // ------------------------------------------------------------------ 日历

    function monthMatrix(year, month) {
      const first = new Date(year, month, 1)
      const startDay = first.getDay()
      const days = []
      for (let i = 0; i < startDay; i++) {
        const d = new Date(year, month, i - startDay + 1)
        days.push({ date: d, out: true })
      }
      const last = new Date(year, month + 1, 0).getDate()
      for (let d = 1; d <= last; d++) days.push({ date: new Date(year, month, d), out: false })
      while (days.length % 7 !== 0) {
        const lastDate = days[days.length - 1].date
        days.push({ date: new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1), out: true })
      }
      return days
    }

    function monthKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` }

    function CalendarMonth({ year, month, dates, onPick, today }) {
      const days = monthMatrix(year, month)
      return h('div', { className: 'dsan-month' },
        h('div', { className: 'dsan-month-head' }, h('span', { className: 'dsan-month-title' }, `${year} 年 ${month + 1} 月`)),
        h('div', { className: 'dsan-week' }, ['日', '一', '二', '三', '四', '五', '六'].map((d) => h('span', { key: d }, d))),
        h('div', { className: 'dsan-days' }, days.map(({ date, out }) => {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          const has = dates.includes(key)
          const isToday = key === today
          const cls2 = cls('dsan-day', out && 'out', has && 'has', isToday && 'today')
          const clickable = has || isToday
          return h('div', {
            key, className: cls2, title: key,
            style: clickable ? { cursor: 'pointer' } : undefined,
            onClick: () => { if (clickable) onPick(key) },
          }, date.getDate())
        })))
    }

    // ------------------------------------------------------------------ 首页

    function HomeView({ state, onOpenNotebook, onNewNotebook, onOpenDiary, refresh, notifySurface, todoOpen, hiddenStickies = [], privacyMode = false, onPrivacyModeChange }) {
      const [dragState, setDragState] = useState({})
      const [zBump, setZBump] = useState({})
      const [dragNotebook, setDragNotebook] = useState(null)
      const [dropNotebook, setDropNotebook] = useState(null)
      const suppressCardClick = useRef(false)
      const layoutTimers = useRef({})
      const wrapRef = useRef(null)
      // 便笺以内容区（滚动区外层，快捷录入以下）为参照：量的是滚动容器自身，
      // 不是首页内容，内容变长不会改变便笺到右侧和底部的距离。
      const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 })
      useEffect(() => {
        const el = wrapRef.current
        if (!el) return
        const area = el.closest('.dsan-body') || el
        const update = () => setWrapSize({ w: area.clientWidth, h: area.clientHeight })
        update()
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
        observer?.observe(area)
        window.addEventListener('resize', update)
        return () => { observer?.disconnect(); window.removeEventListener('resize', update) }
      }, [])
      // 便笺不随待办卡片移动；卡片层级更高，展开时压在便笺上面。
      const areaW = wrapSize.w
      const areaH = wrapSize.h
      const stickies = (state.stickies || []).filter((sticky) => !hiddenStickies.includes(sticky.id)).map((sticky) => {
        const local = dragState[sticky.id] || {}
        const width = Number(local.w ?? sticky.w) || 260
        const height = Number(local.h ?? sticky.h) || 180
        let x = Number(local.x ?? sticky.x) || 0
        let y = Number(local.y ?? sticky.y) || 0
        if (areaW && areaH && Number.isFinite(sticky.right) && Number.isFinite(sticky.bottom)) {
          if (local.x === undefined) x = Math.max(0, areaW - Number(sticky.right) - width)
          if (local.y === undefined) y = Math.max(0, areaH - Number(sticky.bottom) - height)
        }
        return {
          ...sticky, x, y, w: width, h: height,
          z: Math.max(Number(sticky.z) || 0, Number(zBump[sticky.id]) || 0, 1),
        }
      }).sort((a, b) => (a.z || 0) - (b.z || 0))
      const raiseSticky = (id) => {
        setZBump((prev) => {
          const base = Math.max(
            0,
            ...(state.stickies || []).map((s) => Number(s.z) || 0),
            ...Object.values(prev).map((v) => Number(v) || 0),
          )
          return { ...prev, [id]: base + 1 }
        })
        api('sticky.raise', { id }).catch(() => { })
      }
      const migrated = useRef(new Set())
      useEffect(() => {
        if (!areaW || !areaH) return
        for (const sticky of state.stickies || []) {
          if (sticky.anchor === 'body') continue
          if (migrated.current.has(sticky.id)) continue
          migrated.current.add(sticky.id)
          api('sticky.save', {
            id: sticky.id, w: sticky.w, h: sticky.h, anchor: 'body',
            right: Math.max(0, areaW - Number(sticky.x || 0) - Number(sticky.w || 260)),
            bottom: Math.max(0, areaH - Number(sticky.y || 0) - Number(sticky.h || 180)),
          }).then(() => refresh()).catch(() => { })
        }
      }, [areaW, areaH, state.stickies])

      const onLayout = (id, patch) => {
        setDragState((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
        if (layoutTimers.current[id]) clearTimeout(layoutTimers.current[id])
        layoutTimers.current[id] = setTimeout(() => {
          const base = stickies.find((item) => item.id === id) || {}
          const nextW = Number(patch.w ?? base.w) || 260
          const nextH = Number(patch.h ?? base.h) || 180
          const nextX = Number(patch.x ?? base.x) || 0
          const nextY = Number(patch.y ?? base.y) || 0
          const payload = (areaW && areaH)
            ? {
              w: nextW, h: nextH, anchor: 'body',
              right: Math.max(0, Math.round(areaW - nextX - nextW)),
              bottom: Math.max(0, Math.round(areaH - nextY - nextH)),
            }
            : { x: nextX, y: nextY, w: nextW, h: nextH }
          api('sticky.save', { id, ...payload })
            .then(() => refresh())
            .then(() => {
              setDragState((prev) => {
                if (!prev[id]) return prev
                const next = { ...prev }
                delete next[id]
                return next
              })
            })
            .catch(() => { })
        }, 200)
      }
      const dropAt = (next) => {
        const from = dragNotebook
        setDragNotebook(null)
        setDropNotebook(null)
        if (!from || !next) return
        if (from === next.name) return
        const names = state.notebooks.map((notebook) => notebook.name).filter((name) => name !== from)
        const index = names.indexOf(next.name)
        if (index === -1) return
        const insert = index + (next.side === 'after' ? 1 : 0)
        names.splice(insert, 0, from)
        api('notebook.reorder', { names }).then(() => refresh()).catch((err) => notifySurface?.({ title: '排序保存失败', body: err.message }))
      }

      const computeDrop = (event) => {
        if (!dragNotebook) return null
        // getBoundingClientRect 给的是视口像素，插入线的 left/top 用的是 zoom 之后的内部像素。
        const dropZoom = uiScaleFactor(state)
        const cards = Array.from(event.currentTarget.querySelectorAll('[data-notebook-name]'))
        let best = null
        const containerRect = event.currentTarget.getBoundingClientRect()
        for (const card of cards) {
          if (card.dataset.notebookName === dragNotebook) continue
          const rect = card.getBoundingClientRect()
          const dx = event.clientX < rect.left ? rect.left - event.clientX : event.clientX > rect.right ? event.clientX - rect.right : 0
          const dy = event.clientY < rect.top ? rect.top - event.clientY : event.clientY > rect.bottom ? event.clientY - rect.bottom : 0
          const distance = dx * dx + dy * dy
          if (!best || distance < best.distance) {
            best = {
              name: card.dataset.notebookName,
              side: event.clientX < rect.left + rect.width / 2 ? 'before' : 'after',
              distance,
              rect,
            }
          }
        }
        if (!best) return null
        const gapCenter = best.side === 'before' ? best.rect.left - 7 : best.rect.right + 7
        const maxX = containerRect.width / dropZoom - 3
        return {
          name: best.name,
          side: best.side,
          lineX: Math.max(0, Math.min(maxX, (gapCenter - containerRect.left) / dropZoom - 1.5)),
          lineY: (best.rect.top - containerRect.top) / dropZoom,
          lineH: best.rect.height / dropZoom,
        }
      }

      const removeSticky = (id) => {
        api('sticky.delete', { id }).then(() => { refresh() }).catch((err) => notifySurface?.({ title: '删除失败', body: err.message }))
      }
      const visibleNotebooks = privacyMode ? state.notebooks.filter((notebook) => notebook.private !== true) : state.notebooks
      return h('div', { className: 'dsan-home-wrap', ref: wrapRef },
        h('div', { className: 'dsan-sticky-layer' },
          stickies.map((sticky) => h(StickyCard, {
            key: sticky.id, sticky, floating: false, canMinimize: false,
            onSave: refresh, onDelete: removeSticky, onLayout, onRaise: raiseSticky,
            scale: uiScaleFactor(state),
          }))),
        h('div', { className: cls('dsan-home', todoOpen && 'todo-open') },
          h('div', { className: 'dsan-home-main' },
            h('div', { className: 'dsan-sec-row' },
              h('div', { className: 'dsan-sec-title', style: { margin: 0, fontSize: 14 } }, '笔记本'),
              h('button', {
                className: cls('dsan-privacy-toggle', privacyMode && 'on'),
                title: privacyMode ? '关闭隐私模式' : '开启隐私模式，隐藏隐私笔记本',
                'aria-pressed': privacyMode,
                onClick: () => onPrivacyModeChange?.(!privacyMode),
              },
                h(PrivacyIcon, { open: !privacyMode, size: 13 }),
                '隐私模式')),
            h('div', {
              className: 'dsan-cards',
              onDragOver: (event) => {
                if (!dragNotebook) return
                event.preventDefault()
                const next = computeDrop(event)
                if (next) setDropNotebook(next)
              },
              onDrop: (event) => {
                event.preventDefault()
                dropAt(dropNotebook || computeDrop(event))
              },
              onDragLeave: (event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDropNotebook(null)
              },
            },
              h('div', {
                className: cls('dsan-book', state.diaryCover && 'has-cover'),
                onClick: onOpenDiary, title: '日记',
                style: state.diaryCover ? undefined : { background: bookColor('日记') },
              },
                state.diaryCover ? h('div', { className: 'cover', style: { backgroundImage: `url(${assetUrl(state.diaryCover)})` } }) : null,
                h('div', { className: 'spine' }),
                h('div', { className: 'book-text' },
                  h('div', { className: 'title' }, '日记'),
                  h('div', { className: 'desc' }, state.diary?.dates?.length ? `共 ${state.diary.dates.length} 天` : '按日历翻看'))),
              visibleNotebooks.map((notebook) => h('div', {
                key: notebook.name, title: notebook.name,
                draggable: true,
                'data-notebook-name': notebook.name,
                className: cls('dsan-book', notebook.cover && 'has-cover', dragNotebook === notebook.name && 'dragging'),
                style: notebook.cover ? undefined : { background: bookColor(notebook.name) },
                onClick: () => {
                  if (suppressCardClick.current) { suppressCardClick.current = false; return }
                  onOpenNotebook(notebook.name)
                },
                onDragStart: (event) => {
                  suppressCardClick.current = true
                  setDragNotebook(notebook.name)
                  const card = event.currentTarget
                  const rect = card.getBoundingClientRect()
                  try {
                    const ghost = card.cloneNode(true)
                    ghost.removeAttribute('draggable')
                    ghost.style.position = 'fixed'
                    ghost.style.left = '0'
                    ghost.style.top = '0'
                    ghost.style.margin = '0'
                    ghost.style.zIndex = '99999'
                    ghost.style.width = `${rect.width}px`
                    ghost.style.height = `${rect.height}px`
                    ghost.style.opacity = '0.08'
                    ghost.style.pointerEvents = 'none'
                    ghost.style.boxShadow = 'none'
                    document.body.appendChild(ghost)
                    void ghost.offsetWidth
                    event.dataTransfer.setDragImage(ghost, event.clientX - rect.left, event.clientY - rect.top)
                    setTimeout(() => ghost.remove(), 80)
                  } catch { /* ignore */ }
                  try { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', notebook.name) } catch { /* ignore */ }
                },
                onDragEnd: () => {
                  setDragNotebook(null)
                  setDropNotebook(null)
                  setTimeout(() => { suppressCardClick.current = false }, 60)
                },
              },
                notebook.cover ? h('div', { className: 'cover', style: { backgroundImage: `url(${assetUrl(notebook.cover)})` } }) : null,
                h('div', { className: 'spine' }),
                notebook.private ? h('div', { className: 'dsan-privacy-badge', title: '隐私笔记本' },
                  h('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
                    h('rect', { x: 5, y: 11, width: 14, height: 10, rx: 2 }),
                    h('path', { d: 'M8 11V8a4 4 0 0 1 8 0v3' }))) : null,
                h('div', { className: 'book-text' },
                  h('div', { className: 'title' }, notebook.name),
                  notebook.description ? h('div', { className: 'desc' }, notebook.description) : null,
                  (notebook.keywords || []).length ? h('div', { className: 'tags' }, (notebook.keywords || []).slice(0, 3).map((tag) => h('span', { key: tag, className: 'tag' }, tag))) : null))),
              h('div', { className: 'dsan-book add', onClick: onNewNotebook },
                h('div', { style: { fontSize: 20, lineHeight: 1 } }, '＋'),
                h('div', { style: { fontSize: 11.5 } }, '新建笔记本')),
              (dropNotebook && Number.isFinite(dropNotebook.lineX))
                ? h('div', { className: 'dsan-insert-line', style: { left: `${dropNotebook.lineX}px`, top: `${dropNotebook.lineY}px`, height: `${dropNotebook.lineH}px` } })
                : null),
          )))
    }

    // ------------------------------------------------------------------ 笔记

    function NoteEditor({ note, onSaved, notifySurface, onConflict, onDirty, onRegister }) {
      const [body, setBody] = useState(note.body)
      const [status, setStatus] = useState('已保存')
      const timer = useRef(null)
      const mtime = useRef(note.mtimeMs)
      const latest = useRef(note.body)
      const savedText = useRef(note.body)
      const failureSurface = useRef('')
      useEffect(() => { setBody(note.body); latest.current = note.body; savedText.current = note.body; mtime.current = note.mtimeMs }, [note.path, note.mtimeMs])
      const save = useCallback(async (text) => {
        setStatus('保存中')
        try {
          const res = await api('note.save', { path: note.path, content: text, mtimeMs: mtime.current })
          if (res.conflict) { onConflict?.(res.content); setStatus('有冲突'); return { conflict: true, content: res.content } }
          savedText.current = text
          mtime.current = new Date(res.updatedAt).getTime()
          setStatus('已保存')
          if (failureSurface.current) {
            notifySurface?.({ surfaceId: failureSurface.current, restart: true, state: 'succeeded', title: '笔记已保存', body: '已恢复自动保存。' })
            failureSurface.current = ''
          }
          onSaved?.()
          return res
        } catch (err) {
          setStatus('保存失败')
          notifySurface?.({ eventKey: `autosave:${note.path}`, title: '笔记保存失败', body: err.message }).then((data) => { failureSurface.current = data?.surface?.id || '' })
          return null
        }
      }, [note.path])
      const onChange = (value) => {
        setBody(value)
        latest.current = value
        onDirty?.(value)
        setStatus('未保存')
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => { timer.current = null; save(value) }, 800)
      }
      const flush = useCallback(() => {
        if (timer.current) { clearTimeout(timer.current); timer.current = null }
        savedText.current = latest.current
        return save(latest.current)
      }, [save])
      useEffect(() => { onRegister?.(flush); return () => onRegister?.(null) }, [flush])
      useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (latest.current !== savedText.current) save(latest.current) }, [])
      return h('div', null,
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
          h('span', { className: 'dsan-save' }, status),
          h('span', { className: 'dsan-save' }, '纯文本 · 停手自动保存')),
        h('textarea', { className: 'dsan-editor', value: body, onChange: (event) => onChange(event.target.value), spellCheck: false }))
    }

    function NoteView({ state, path, onBack, onOpenNote, notifySurface, refresh, nonce }) {
      const [note, setNote] = useState(null)
      const [editing, setEditing] = useState(false)
      const [conflict, setConflict] = useState(null)
      const [renaming, setRenaming] = useState(false)
      const [newTitle, setNewTitle] = useState('')
      const [confirmDelete, setConfirmDelete] = useState(false)
      const localBody = useRef('')
      const loadSeq = useRef(0)
      const prevPath = useRef(path)
      useEffect(() => {
        const changed = prevPath.current !== path
        prevPath.current = path
        if (changed) setEditing(false)
        const seq = ++loadSeq.current
        api('note.read', { path }).then((data) => {
          if (seq !== loadSeq.current) return
          if (!changed && editing && localBody.current !== (note?.body ?? '')) {
            setConflict(data.content)
            return
          }
          setNote(data)
          setNewTitle(data.title)
          localBody.current = data.body
        }).catch((err) => notifySurface?.({ title: '打开笔记失败', body: err.message }))
      }, [path, nonce, editing])
      if (!note) return h('div', { className: 'dsan-page' }, h('div', { className: 'dsan-empty' }, '正在打开…'))
      const openTarget = (target) => {
        const clean = target.replace(/^\.\//, '')
        if (clean.endsWith('.md')) {
          api('note.read', { path: clean }).then(() => onOpenNote(clean)).catch(() => notifySurface?.({ title: '链接目标不存在', body: clean }))
        } else {
          notifySurface?.({ title: '暂不支持此链接', body: clean })
        }
      }
      const tags = note.frontmatter?.tags || []
      const summary = note.frontmatter?.summary || ''
      return h('div', { className: 'dsan-page dsan-note-page' },
        h('div', { className: 'dsan-note-head' },
          h('h1', { className: 'dsan-note-title' }, note.title),
          h('button', { className: 'dsan-btn', onClick: () => setEditing((v) => !v) }, editing ? '读' : '编辑'),
          h('button', { className: 'dsan-btn ghost', onClick: () => setRenaming(true) }, '改名'),
          h('button', { className: 'dsan-btn ghost', onClick: () => setConfirmDelete(true) }, '删除')),
        (tags.length || summary) ? h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
          (tags || []).map((tag) => h('span', { key: tag, className: 'dsan-tag' }, `#${tag}`)),
          summary ? h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } }, summary) : null) : null,
        conflict ? h('div', { className: 'dsan-conflict' },
          h('span', null, '磁盘上的文件被改过了。'),
          h('button', { className: 'dsan-btn small', onClick: () => { setConflict(null); api('note.read', { path }).then((data) => setNote(data)) } }, '载入磁盘版本'),
          h('button', { className: 'dsan-btn small primary', onClick: () => { const keep = localBody.current; setConflict(null); api('note.save', { path, content: keep }).then(() => api('note.read', { path }).then((data) => { setNote(data); localBody.current = data.body })) } }, '保留我的')) : null,
        editing
          ? h(NoteEditor, {
            note, onSaved: () => { refresh?.() },
            notifySurface,
            onConflict: (content) => { setConflict(content) },
            onDirty: (text) => { localBody.current = text },
          })
          : h(Markdown, {
            text: stripTitleHeading(note.body, note.title),
            opts: {
              root: state.root, noteDir: note.path.split('/').slice(0, -1).join('/'),
              onOpenNote: openTarget, onCapture: null,
            },
          }),
        renaming ? h(Modal, {
          title: '给笔记改名', onClose: () => setRenaming(false),
          footer: [h('button', { key: 'c', className: 'dsan-btn', onClick: () => setRenaming(false) }, '取消'),
          h('button', {
            key: 'ok', className: 'dsan-btn primary',
            onClick: () => api('note.rename', { path, title: newTitle }).then((res) => { setRenaming(false); onOpenNote(res.path) }).catch((err) => notifySurface?.({ title: '改名失败', body: err.message })),
          }, '改名')],
        }, h(Field, { label: '标题（也就是文件名）' }, h('input', { value: newTitle, onChange: (event) => setNewTitle(event.target.value), autoFocus: true }))) : null,
        confirmDelete ? h(Modal, {
          title: '删除这篇笔记？', onClose: () => setConfirmDelete(false),
          footer: [h('button', { key: 'c', className: 'dsan-btn', onClick: () => setConfirmDelete(false) }, '取消'),
          h('button', {
            key: 'ok', className: 'dsan-btn primary',
            onClick: () => api('note.delete', { path }).then((res) => {
              setConfirmDelete(false)
              onBack()
              notifySurface?.({ title: '笔记已移入废纸篓', actions: [{ id: 'undo', label: '撤销', type: 'restore-trash', trash: res.trash, target: path }] })
            }).catch((err) => notifySurface?.({ title: '删除失败', body: err.message })),
          }, '删除')],
        }, h('div', null, '会移到隐藏的废纸篓，可以撤销。')) : null)
    }

    // ------------------------------------------------------------------ 笔记本

    function NotebookView({ state, name, onBack, onOpenNote, onEdit, notifySurface, refresh, nonce }) {
      const [notes, setNotes] = useState(null)
      const [dragNote, setDragNote] = useState(null)
      const [dropNote, setDropNote] = useState(null)
      const suppressNoteClick = useRef(false)
      const load = useCallback(() => {
        api('notebook.notes', { name }).then((data) => setNotes(data.notes)).catch((err) => notifySurface?.({ title: '打开笔记本失败', body: err.message }))
      }, [name])
      useEffect(() => { load() }, [name, nonce])
      const notebook = state.notebooks.find((n) => n.name === name)
      const create = () => {
        api('note.create', { notebook: name, title: '未命名笔记' }).then((res) => { load(); onOpenNote(res.path) }).catch((err) => notifySurface?.({ title: '新建笔记失败', body: err.message }))
      }
      const computeDrop = (event) => {
        if (!dragNote || !notes) return null
        const rows = Array.from(event.currentTarget.querySelectorAll('[data-note-path]'))
        let best = null
        for (const row of rows) {
          if (row.dataset.notePath === dragNote) continue
          const rect = row.getBoundingClientRect()
          const dy = event.clientY < rect.top ? rect.top - event.clientY : event.clientY > rect.bottom ? event.clientY - rect.bottom : 0
          if (!best || dy < best.distance) {
            best = {
              path: row.dataset.notePath,
              side: event.clientY < rect.top + rect.height / 2 ? 'before' : 'after',
              distance: dy,
            }
          }
        }
        return best
      }
      const dropAt = (next) => {
        const from = dragNote
        setDragNote(null)
        setDropNote(null)
        if (!from || !next || from === next.path || !notes) return
        const paths = notes.map((note) => note.path).filter((path) => path !== from)
        const index = paths.indexOf(next.path)
        if (index === -1) return
        paths.splice(index + (next.side === 'after' ? 1 : 0), 0, from)
        api('note.reorder', { notebook: name, paths }).then(() => load()).catch((err) => notifySurface?.({ title: '排序保存失败', body: err.message }))
      }
      return h('div', { className: 'dsan-page dsan-notebook-page' },
        h('div', { className: 'dsan-note-head' },
          h('h1', { className: 'dsan-note-title' }, name),
          h('button', { className: 'dsan-btn primary', onClick: create }, '新建笔记'),
          h('button', { className: 'dsan-btn', onClick: () => onEdit(notebook) }, h(GearIcon, { size: 14 }), '管理')),
        notebook?.description ? h('p', { style: { color: 'var(--dsw-alias-label-secondary)', marginTop: -8 } }, notebook.description) : null,
        notes === null ? h('div', { className: 'dsan-empty' }, '正在读…')
          : notes.length === 0 ? h('div', { className: 'dsan-empty' }, '这本还没有笔记。点右上角写一篇。')
            : h('div', {
              className: 'dsan-list',
              onDragOver: (event) => {
                if (!dragNote) return
                event.preventDefault()
                const next = computeDrop(event)
                if (next) setDropNote(next)
              },
              onDrop: (event) => {
                event.preventDefault()
                dropAt(dropNote || computeDrop(event))
              },
              onDragLeave: (event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDropNote(null)
              },
            }, notes.map((note, index) => h('div', {
              key: note.path,
              draggable: true,
              'data-note-path': note.path,
              className: cls('dsan-row', dragNote === note.path && 'dragging', dropNote?.path === note.path && (dropNote.side === 'before' ? 'insert-before' : 'insert-after')),
              onClick: () => {
                if (suppressNoteClick.current) { suppressNoteClick.current = false; return }
                onOpenNote(note.path)
              },
              onDragStart: (event) => {
                suppressNoteClick.current = true
                setDragNote(note.path)
                const row = event.currentTarget
                const rect = row.getBoundingClientRect()
                try {
                  const ghost = row.cloneNode(true)
                  ghost.removeAttribute('draggable')
                  ghost.style.position = 'fixed'
                  ghost.style.left = '0'
                  ghost.style.top = '0'
                  ghost.style.margin = '0'
                  ghost.style.zIndex = '99999'
                  ghost.style.width = `${rect.width}px`
                  ghost.style.opacity = '0.08'
                  ghost.style.pointerEvents = 'none'
                  ghost.style.boxShadow = 'none'
                  document.body.appendChild(ghost)
                  void ghost.offsetWidth
                  event.dataTransfer.setDragImage(ghost, event.clientX - rect.left, event.clientY - rect.top)
                  setTimeout(() => ghost.remove(), 80)
                } catch { /* ignore */ }
                try { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', note.path) } catch { /* ignore */ }
              },
              onDragEnd: () => {
                setDragNote(null)
                setDropNote(null)
                setTimeout(() => { suppressNoteClick.current = false }, 60)
              },
            },
              h('span', { className: 'n' }, index + 1),
              h('span', { className: 'ndot' }, '·'),
              h('span', { className: 't' }, note.title),
              h('span', { className: 's' }, note.summary || ''),
              h('span', { className: 'm' }, fmtDate(note.updatedAt))))))
    }

    // ------------------------------------------------------------------ 日历页

    function DiaryView({ state, onOpenDoc, notifySurface, onSettings }) {
      const now = new Date()
      const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
      const double = state.settings?.calendar !== 'single'
      const dates = state.diary?.dates || []
      const months = double
        ? [new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1), cursor]
        : [cursor]
      const pick = (date) => {
        api('diary.open', { date }).then((res) => {
          if (res.found) { onOpenDoc(res.doc, date, res.heading); return }
          if (date === state.diary.today) {
            api('diary.ensureDay', { date }).then((made) => onOpenDoc(made.doc, date, headingFor(date))).catch((err) => notifySurface?.({ title: '打开日记失败', body: err.message }))
            return
          }
          notifySurface?.({ title: '这天没有日记', body: '没有记录的日子打不开。' })
        }).catch((err) => notifySurface?.({ title: '打开日记失败', body: err.message }))
      }
      return h('div', { className: 'dsan-page' },
        h('div', { className: 'dsan-note-head' },
          h('h1', { className: 'dsan-note-title' }, '日记'),
          h('button', { className: 'dsan-btn', onClick: onSettings }, h(GearIcon, { size: 14 }), '管理')),
        h('div', { className: 'dsan-cal-tools' },
          h('button', { className: 'dsan-btn ghost dsan-icon-btn', title: '上一个月', onClick: () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)) }, '‹'),
          h('button', { className: 'dsan-btn', onClick: () => setCursor(new Date(now.getFullYear(), now.getMonth(), 1)) }, '今天'),
          h('button', { className: 'dsan-btn ghost dsan-icon-btn', title: '下一个月', onClick: () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) }, '›')),
        h('div', { className: cls('dsan-cal', !double && 'single') },
          months.map((month) => h(CalendarMonth, {
            key: monthKey(month), year: month.getFullYear(), month: month.getMonth(),
            dates, today: state.diary.today, onPick: pick,
          }))),
        h('div', { className: 'dsan-kbd', style: { marginTop: 18 } }, '点有记录的日期打开当天笔记；今天还没写也可以点开。'))
    }

    function DiaryDocView({ state, doc, date, heading, onBack, onOpenNote, notifySurface, refresh, nonce }) {
      const [note, setNote] = useState(null)
      const [editing, setEditing] = useState(false)
      const [conflict, setConflict] = useState(null)
      const localBody = useRef('')
      const editorFlush = useRef(null)
      const prevDoc = useRef(doc)
      const captureCount = state.captures?.length || 0
      const reloadDoc = () => api('diary.doc', { doc }).then((data) => { setNote(data); localBody.current = data.body }).catch(() => { })
      useEffect(() => {
        const changed = prevDoc.current !== doc
        prevDoc.current = doc
        if (!changed && editing) return
        if (changed) setEditing(false)
        api('diary.doc', { doc }).then((data) => { setNote(data); localBody.current = data.body }).catch((err) => notifySurface?.({ title: '打开日记失败', body: err.message }))
      }, [doc, nonce])
      useEffect(() => {
        if (!note || editing) return
        api('diary.doc', { doc }).then((data) => { setNote(data); localBody.current = data.body }).catch(() => { })
      }, [captureCount])
      useEffect(() => {
        if (!note || editing) return
        const target = heading?.replace(/^###\s*/, '').replace(/[*_`]/g, '')
        if (!target) return
        const timer = setTimeout(() => {
          const nodes = Array.from(document.querySelectorAll('[data-heading]'))
          const found = nodes.find((node) => node.getAttribute('data-heading') === target)
          found?.scrollIntoView({ block: 'start' })
        }, 60)
        return () => clearTimeout(timer)
      }, [note, editing, heading])
      if (!note) return h('div', { className: 'dsan-page' }, h('div', { className: 'dsan-empty' }, '正在翻开…'))
      const opts = {
        root: state.root, noteDir: '日记', date,
        captures: state.captures || [],
        captureFor: (text) => {
          const m = /^(\d{2}:\d{2})\s+(.*)$/.exec(text.trim())
          if (!m) return null
          const body = m[2].split('  → ')[0]
          return (state.captures || []).find((capture) => capture.date === date && capture.time === m[1] && body.startsWith(String(capture.text).slice(0, 10)))
        },
        onCapture: (capture) => onCaptureAction(capture, { state, notifySurface, refresh, onOpenNote }),
        onOpenNote: (target) => {
          const clean = target.replace(/^\.\//, '')
          if (clean.endsWith('.md')) onOpenNote(clean)
          else notifySurface?.({ title: '暂不支持此链接', body: clean })
        },
        onRefresh: refresh,
      }
      return h('div', { className: 'dsan-page dsan-note-page' },
        h('div', { className: 'dsan-note-head' },
          h('h1', { className: 'dsan-note-title' }, date),
          h('button', { className: 'dsan-btn', onClick: () => { if (editing) {
            const pending = editorFlush.current?.()
            if (pending?.then) pending.then((result) => { if (!result?.conflict) reloadDoc() }, reloadDoc)
            else reloadDoc()
          } setEditing((v) => !v) } }, editing ? '读' : '编辑')),
        conflict ? h('div', { className: 'dsan-conflict' },
          h('span', null, '这个文件被外面的程序改过了。'),
          h('button', { className: 'dsan-btn small', onClick: () => { setConflict(null); api('diary.doc', { doc }).then(setNote) } }, '载入磁盘版本'),
          h('button', { className: 'dsan-btn small primary', onClick: () => { const keep = localBody.current; setConflict(null); api('note.save', { path: doc, content: keep }).then(() => api('diary.doc', { doc }).then((data) => { setNote(data); localBody.current = data.body })) } }, '保留我的')) : null,
        editing
          ? h(NoteEditor, { note, onSaved: refresh, notifySurface, onConflict: setConflict, onRegister: (fn) => { editorFlush.current = fn }, onDirty: (text) => { localBody.current = text } })
          : h(Markdown, { text: note.body, opts }))
    }

    function onCaptureAction(capture, { notifySurface }) {
      if (!capture) return
      api('surface.capture', { captureId: capture.id }).catch((err) => notifySurface({ title: '无法查看归档记录', body: err.message }))
    }

    // ------------------------------------------------------------------ 弹窗

    function TagInput({ value, onChange, placeholder = '', onCommit }) {
      const [text, setText] = useState('')
      const tags = Array.isArray(value) ? value : []
      const commit = () => {
        const parts = String(text).split(/[,，\s]+/).map((item) => item.trim()).filter(Boolean)
        if (!parts.length) { setText(''); return }
        const next = [...new Set([...tags, ...parts])]
        setText('')
        onChange(next)
        onCommit?.(next)
      }
      return h('div', { className: 'dsan-taginput' },
        tags.map((tag, index) => h('span', { key: `${tag}-${index}`, className: 'dsan-taginput-chip' },
          tag,
          h('button', {
            type: 'button', className: 'x', 'aria-label': `移除 ${tag}`,
            onClick: () => { const next = tags.filter((_, i) => i !== index); onChange(next); onCommit?.(next) },
          }, '×'))),
        h('input', {
          value: text,
          placeholder: tags.length ? '' : placeholder,
          onChange: (event) => setText(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ',' || event.key === '，') { event.preventDefault(); commit() }
            else if (event.key === 'Backspace' && !text && tags.length) { const next = tags.slice(0, -1); onChange(next); onCommit?.(next) }
          },
          onBlur: commit,
        }))
    }

    function NotebookModal({ initial, onClose, onSaved, onDeleted, notifySurface, scale = 1 }) {
      const [draft, setDraft] = useState({
        name: initial?.name || '',
        description: initial?.description || '',
        keywords: Array.isArray(initial?.keywords) ? initial.keywords : [],
        agentRules: initial?.agentRules || '',
        manualRules: initial?.manualRules || '',
        private: initial?.private === true,
      })
      const draftRef = useRef(draft)
      const [cover, setCover] = useState(initial?.cover || '')
      const [pendingCover, setPendingCover] = useState('')
      const [cropFile, setCropFile] = useState(null)
      const [savedName, setSavedName] = useState(initial?.name || '')
      const [confirmDelete, setConfirmDelete] = useState(false)
      const currentName = useRef(initial?.name || '')
      const saveTimer = useRef(null)
      const saving = useRef(false)
      const dirty = useRef(false)

      const coverPreview = cover && cover.startsWith('data:') ? cover : (cover ? assetUrl(cover) : '')

      const setField = (key, value) => {
        const next = { ...draftRef.current, [key]: value }
        draftRef.current = next
        setDraft(next)
      }

      const saveNow = async () => {
        const value = draftRef.current
        const nextName = value.name.trim()
        if (!nextName) return
        if (saving.current) { dirty.current = true; return }
        saving.current = true
        try {
          if (!currentName.current) {
            const res = await api('notebook.create', {
              name: nextName,
              description: value.description,
              keywords: value.keywords,
              agentRules: value.agentRules,
              manualRules: value.manualRules,
              private: value.private,
            })
            currentName.current = res.notebook.name
            setSavedName(res.notebook.name)
            onSaved?.(res.notebook)
            if (pendingCover) {
              const uploaded = await api('notebook.setCover', { name: res.notebook.name, dataUrl: pendingCover })
              setPendingCover('')
              setCover(uploaded.cover)
            }
          } else {
            const res = await api('notebook.update', {
              name: currentName.current,
              nextName,
              description: value.description,
              keywords: value.keywords,
              agentRules: value.agentRules,
              manualRules: value.manualRules,
              private: value.private,
            })
            currentName.current = res.notebook.name
            setSavedName(res.notebook.name)
            onSaved?.(res.notebook)
          }
        } catch (err) {
          notifySurface?.({ title: '笔记本保存失败', body: err.message })
        } finally {
          saving.current = false
          if (dirty.current) { dirty.current = false; saveNow() }
        }
      }

      const schedule = () => {
        dirty.current = true
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => saveNow(), 500)
      }

      const update = (key, value) => {
        setField(key, value)
        schedule()
      }

      const close = () => {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveNow()
        onClose()
      }

      const pickCover = (event) => {
        const file = event.target.files?.[0]
        if (file) setCropFile(file)
        event.target.value = ''
      }

      const applyCover = (dataUrl) => {
        setCropFile(null)
        if (!currentName.current) {
          setPendingCover(dataUrl)
          setCover(dataUrl)
          return
        }
        api('notebook.setCover', { name: currentName.current, dataUrl })
          .then((res) => { setCover(res.cover); onSaved?.({ name: currentName.current, ...draftRef.current }) })
          .catch((err) => notifySurface?.({ title: '封面保存失败', body: err.message }))
      }

      const clearCover = () => {
        if (!currentName.current) {
          setPendingCover('')
          setCover('')
          return
        }
        api('notebook.clearCover', { name: currentName.current })
          .then(() => { setCover(''); onSaved?.({ name: currentName.current, ...draftRef.current }) })
          .catch(() => { })
      }

      const remove = async () => {
        const name = currentName.current || initial?.name
        if (!name) return
        if (saveTimer.current) clearTimeout(saveTimer.current)
        try {
          const res = await api('notebook.delete', { name })
          setConfirmDelete(false)
          if (onDeleted) onDeleted()
          else { onClose(); onSaved?.(null) }
          notifySurface?.({
            title: '笔记本已移入废纸篓',
            actions: [{ id: 'undo', label: '撤销', type: 'restore-trash', trash: res.trash, target: name,
              notebookMeta: { name, description: draftRef.current.description, keywords: draftRef.current.keywords,
                agentRules: draftRef.current.agentRules, manualRules: draftRef.current.manualRules, private: draftRef.current.private } }],
          })
        } catch (err) {
          notifySurface?.({ title: '删除失败', body: err.message })
        }
      }

      if (cropFile) return h(ImageCropper, { file: cropFile, onCancel: () => setCropFile(null), onDone: applyCover, zoomScale: scale })

      if (confirmDelete) {
        return h(Modal, {
          title: '删除笔记本？', onClose: () => setConfirmDelete(false),
          footer: [
            h('button', { key: 'c', className: 'dsan-btn', onClick: () => setConfirmDelete(false) }, '取消'),
            h('button', { key: 'd', className: 'dsan-btn danger', onClick: remove }, '删除'),
          ],
        },
          h('p', { style: { margin: 0, lineHeight: 1.7, color: 'var(--dsw-alias-label-secondary)' } },
            `「${savedName || currentName.current || draft.name || '这个笔记本'}」整个文件夹会进入废纸篓。删除后仍可在提示里撤销。`))
      }

      return h(Modal, {
        title: initial ? '笔记本管理' : '新建笔记本', onClose: close,
        bodyClass: 'dsan-notebook-body',
      },
        h('div', { className: 'dsan-field' },
          h('label', null, '封面图'),
          h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
            coverPreview ? h('div', { style: { width: 72, height: 96, borderRadius: 8, backgroundImage: `url(${coverPreview})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--dsw-alias-border-l2)' } }) : h('div', { style: { width: 72, height: 96, borderRadius: 8, border: '1px dashed var(--dsw-alias-border-l2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dsw-alias-label-secondary)', fontSize: 11 } }, '无封面'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              h('label', { className: 'dsan-btn small', style: { cursor: 'pointer' } }, '选择图片', h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: pickCover })),
              cover ? h('button', { className: 'dsan-btn small', onClick: clearCover }, '清除') : null))),
        h('div', { className: 'dsan-field' },
          h(Switch, {
            checked: draft.private,
            onChange: (next) => { setField('private', next); saveNow() },
            label: '隐私笔记本',
          }),
          h('div', { className: 'dsan-set-hint' }, '开启后首页隐私模式会隐藏这本；快捷录入和 /agent 仍可访问。')),
        h(Field, { label: '名字' }, h('input', {
          value: draft.name,
          onChange: (event) => update('name', event.target.value),
          onBlur: saveNow,
          autoFocus: true,
          placeholder: '例如 咖啡、工作、读书',
        })),
        h(Field, { label: '一句话描述（选填）' }, h('textarea', {
          value: draft.description,
          onChange: (event) => update('description', event.target.value),
          onBlur: saveNow,
          placeholder: '这本收什么，模型靠它判断归属',
        })),
        h(Field, { label: '关键词（选填）' }, h(TagInput, {
          value: draft.keywords,
          onChange: (next) => update('keywords', next),
          onCommit: () => saveNow(),
          placeholder: '输入后回车，或用逗号分隔',
        })),
        h(Field, {
          label: '笔记本维护规则（Agent 自动更新）',
          hint: '/agent 每次操作这本笔记本前都会先读这条规则，有值得沉淀的经验时它会自己补充；你也可以直接改。',
        }, h('textarea', {
          value: draft.agentRules,
          onChange: (event) => update('agentRules', event.target.value),
          onBlur: saveNow,
          placeholder: '例如：新记录先看有没有同主题小节；标签沿用已有词；保留原话。',
        })),
        h(Field, {
          label: '笔记本维护规则（仅人工更新）',
          hint: '这条只有你能改，/agent 和 MCP 只能读、不能写。两条规则冲突时以这条为准。',
        }, h('textarea', {
          value: draft.manualRules,
          onChange: (event) => update('manualRules', event.target.value),
          onBlur: saveNow,
          placeholder: '例如：不要动「参考」小节；改写前必须先问我。',
        })),
        savedName ? h('div', { className: 'dsan-notebook-delete' },
          h('button', { className: 'dsan-btn danger', onClick: () => setConfirmDelete(true) }, '删除笔记本')) : null)
    }

    function SettingsSection({ title, desc, action, children }) {
      return h('section', { className: 'dsan-set-section' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('div', { className: 'dsan-set-title', style: { flex: 1 } }, title),
          action || null),
        desc ? h('div', { className: 'dsan-set-desc' }, desc) : null,
        children)
    }

    function SettingsModal({ state, onClose, ctx, notifySurface, refresh, onRootChanged, onReviewPending }) {
      const [mcpToken, setMcpToken] = useState(state.settings?.mcpToken || '')
      const [mcpVisible, setMcpVisible] = useState(false)
      const [autoArchive, setAutoArchive] = useState(state.settings?.autoArchive !== false)
      const [showAgentSessions, setShowAgentSessions] = useState(state.settings?.showAgentSessions === true)
      const [calendar, setCalendar] = useState(state.settings?.calendar || 'double')
      const [trashDays, setTrashDays] = useState(state.settings?.trashDays || 30)
      const [captureHistoryLimit, setCaptureHistoryLimit] = useState(state.settings?.captureHistory || 20)
      const [reactMaxRounds, setReactMaxRounds] = useState(state.settings?.reactMaxRounds || 20)
      const [agentEngine, setAgentEngine] = useState(state.settings?.agentEngine === 'json' ? 'json' : 'native')
      const [agentShadow, setAgentShadow] = useState(state.settings?.agentShadow === true)
      const [toolResultMaxChars, setToolResultMaxChars] = useState(state.settings?.toolResultMaxChars ?? 0)
      const [webFetchMaxChars, setWebFetchMaxChars] = useState(state.settings?.webFetchMaxChars ?? 0)
      const [readNoteMaxChars, setReadNoteMaxChars] = useState(state.settings?.readNoteMaxChars ?? 0)
      const [webTimeoutMs, setWebTimeoutMs] = useState(state.settings?.webTimeoutMs || 60000)
      const [agentLogRetentionDays, setAgentLogRetentionDays] = useState(state.settings?.agentLogRetentionDays || 7)
      const [agentLogCleanupIntervalDays, setAgentLogCleanupIntervalDays] = useState(state.settings?.agentLogCleanupIntervalDays || 30)
      const [systemNotifications, setSystemNotifications] = useState(state.settings?.systemNotifications === true)
      const [reminderSound, setReminderSound] = useState(state.settings?.reminderSound === true)
      const [reminderSoundFile, setReminderSoundFile] = useState(state.settings?.reminderSoundFile || '')
      const [reminderSpeech, setReminderSpeech] = useState(state.settings?.reminderSpeech === true)
      const [reminderVoiceGender, setReminderVoiceGender] = useState(state.settings?.reminderVoiceGender || 'auto')
      const [reminderSoundVolume, setReminderSoundVolume] = useState(state.settings?.reminderSoundVolume || 100)
      const [reminderSpeechVolume, setReminderSpeechVolume] = useState(state.settings?.reminderSpeechVolume || 100)
      const [stickyTransparency, setStickyTransparency] = useState(state.settings?.stickyTransparency ?? (Number.isFinite(Number(state.settings?.stickyOpacity)) ? 100 - Number(state.settings.stickyOpacity) : 55))
      const [todoTransparency, setTodoTransparency] = useState(state.settings?.todoTransparency ?? 36)
      const mcpUrl = `${location.origin}${state.settings?.mcpPath || '/dsh-agentic-notes/mcp'}`
      const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
      const [provider, setProvider] = useState(state.settings?.model?.provider || '')
      const [model, setModel] = useState(state.settings?.model?.model || '')
      const [root, setRoot] = useState(state.root)
      const [wordBookState, setWordBookState] = useState('')
      const openSeriesSession = (res) => {
        if (!res?.sessionId) return
        const svc = ctx?.get?.('uiWorkspace')
        if (!svc?.openSession) { setWordBookState('会话已创建，可在左侧工作区打开'); return }
        setTimeout(() => {
          try { svc.openSession(res.sessionId) } catch { setWordBookState('会话已创建，可在左侧工作区打开') }
        }, 500)
      }
      const installWordBook = () => {
        setWordBookState('正在创建会话…')
        api('series.installWordBook').then((res) => {
          if (!res?.sessionId) throw new Error(res?.error || '没能创建会话')
          setWordBookState('会话已创建，正在打开…')
          openSeriesSession(res)
        }).catch((err) => setWordBookState(err.message || '安装会话创建失败'))
      }

      const [background, setBackground] = useState(state.homeBackground || '')
      const [uiScale, setUiScale] = useState(normalizeUiScale(state.settings?.uiScale))
      const [surfaceRetention, setSurfaceRetention] = useState(state.settings?.surfaceRetentionSeconds ?? 60)
      const [cropFile, setCropFile] = useState(null)
      const configTimer = useRef(null)
      const patchSettings = (patch, after) => {
        api('settings.save', patch)
          .then(() => { refresh(); after?.() })
          .catch((err) => notifySurface?.({ title: '设置保存失败', body: err.message }))
      }
      const patchSoon = (patch) => {
        clearTimeout(configTimer.current)
        configTimer.current = setTimeout(() => patchSettings(patch), 180)
      }
      const [providers, setProviders] = useState([])
      const [models, setModels] = useState([])
      const [modelsLoading, setModelsLoading] = useState(false)
      const loadProviders = () => {
        api('models.providers').then((res) => setProviders(Array.isArray(res?.providers) ? res.providers : [])).catch(() => setProviders([]))
      }
      const loadModels = (id) => {
        if (!id) { setModels([]); return }
        setModelsLoading(true)
        api('models.list', { provider: id })
          .then((res) => setModels(Array.isArray(res?.models) ? res.models : []))
          .catch(() => setModels([]))
          .finally(() => setModelsLoading(false))
      }
      useEffect(() => { loadProviders() }, [])
      useEffect(() => { loadModels(provider) }, [provider])
      const closeSettings = () => {
        patchSettings({ model: provider && model ? { provider, model } : null })
        onClose()
      }
      const pickBackground = (event) => {
        const file = event.target.files?.[0]
        if (file) setCropFile(file)
        event.target.value = ''
      }
      const pickSound = (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        if (file.size > 8 * 1024 * 1024) { notifySurface?.({ title: '音频不能超过 8MB' }); return }
        const reader = new FileReader()
        reader.onload = () => {
          api('settings.soundUpload', { dataUrl: reader.result, name: file.name })
            .then((res) => {
              setReminderSoundFile(res.file)
              refresh()
            })
            .catch((err) => notifySurface?.({ title: '音效保存失败', body: err.message }))
        }
        reader.onerror = () => notifySurface?.({ title: '音频读取失败' })
        reader.readAsDataURL(file)
      }
      const trySpeech = () => {
        if (!speakReminder('这是一条朗读测试，提醒内容会用系统语音读出来。', reminderVoiceGender, reminderSpeechVolume)) {
          notifySurface?.({ title: '当前环境不支持语音朗读' })
        }
      }
      const trySound = () => {
        try {
          const audio = new Audio(soundUrl(reminderSoundFile || 'default'))
          audio.volume = Math.max(0.01, Math.min(1, reminderSoundVolume / 100))
          audio.play().catch((err) => notifySurface?.({ title: '无法播放音效', body: err.message }))
        } catch (err) {
          notifySurface?.({ title: '无法播放音效', body: err.message })
        }
      }
      const changeSystemNotifications = (next) => {
        setSystemNotifications(next)
        patchSettings({ systemNotifications: next })
        if (!next) return
        if (typeof Notification === 'undefined') { setNotificationPermission('unsupported'); return }
        if (Notification.permission === 'granted') { setNotificationPermission('granted'); return }
        if (Notification.permission === 'denied') { setNotificationPermission('denied'); return }
        Notification.requestPermission().then((permission) => setNotificationPermission(permission)).catch(() => { })
      }
      const applyBackground = (dataUrl) => {
        setCropFile(null)
        api('home.setBackground', { dataUrl })
          .then((res) => { setBackground(res.background); refresh() })
          .catch((err) => notifySurface?.({ title: '背景保存失败', body: err.message }))
      }
      const pick = async () => {
        try {
          const picked = await ctx.get('uiWorkspace')?.pickDirectory?.()
          if (!picked) return
          await api('settings.save', { root: picked })
          setRoot(picked)
          onRootChanged?.()
          onClose()
          refresh()
        } catch (err) { notifySurface?.({ title: '选择目录失败', body: err.message }) }
      }
      if (cropFile) return h(ImageCropper, { file: cropFile, onCancel: () => setCropFile(null), onDone: applyBackground, zoomScale: uiScaleFactor(state) })
      const providerOptions = providers.slice()
      if (provider && !providerOptions.some((item) => item.id === provider)) providerOptions.unshift({ id: provider, name: provider })
      const modelOptions = models.slice()
      if (model && !modelOptions.some((item) => item.id === model)) modelOptions.unshift({ id: model, name: model })
      return h(Modal, {
        title: h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, h(Icon, { size: 18 }), '随记设置'), onClose: closeSettings,
      },
        h('div', { className: 'dsan-settings-hero' },
          h('div', { className: 'dsan-settings-avatar-shell' },
            h('div', { className: 'dsan-settings-avatar-wrap' },
              h('img', { className: 'dsan-settings-avatar', src: pluginAsset('suiji-logo.webp'), alt: '随记 logo' })),
            h('span', { className: 'dsan-settings-ver' }, '随记 · v0.3.0'))),
        h(SettingsSection, { title: '笔记库', desc: '所有笔记、日记、便笺和提醒都存在这个目录里。' },
          h('div', { className: 'dsan-set-row' },
            h('div', { style: { fontSize: 12, lineHeight: 1.6, wordBreak: 'break-all', marginBottom: 8 } }, `当前目录：${root}`),
            h('button', { className: 'dsan-btn small', onClick: pick }, '换一个目录')),
          h('div', { className: 'dsan-set-hint' }, '换目录不会自动搬文件。要保留内容，先把旧目录里的笔记和 .dsh-notebooks 复制到新目录，再切换。')),

        h(SettingsSection, { title: '外观与界面', desc: '首页和提醒卡片共用这张背景图；便笺和待办的透明程度也在这里调。' },
          h('div', { className: 'dsan-set-row', style: { display: 'flex', gap: 10, alignItems: 'center' } },
            h('div', { style: { width: 96, height: 60, borderRadius: 8, backgroundImage: `url(${background ? assetUrl(background) : pluginAsset('earth-hero.webp')})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--dsw-alias-border-l2)', flex: 'none' } }),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } }, background ? '自定义背景' : '默认（地球）'),
              h('label', { className: 'dsan-btn small', style: { cursor: 'pointer' } }, '选择图片', h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: pickBackground })),
              background ? h('button', { className: 'dsan-btn small', onClick: () => api('home.clearBackground').then(() => { setBackground(''); refresh() }).catch(() => { }) }, '恢复默认') : null)),
          h('div', { className: 'dsan-set-hint' }, '未选择时使用内置地球壁纸。选择图片后会进入裁剪，拖动选框决定显示区域。'),
          h('div', { className: 'dsan-set-row', style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 } },
            h('div', { style: { flex: 1 } }, h('div', { style: { fontSize: 12 } }, '显示 agent 会话入口'), h('div', { className: 'dsan-set-hint', style: { marginTop: 2 } }, '默认不显示；打开后右上角出现会话图标。')),
            h(Switch, { checked: showAgentSessions, onChange: (next) => { setShowAgentSessions(next); patchSoon({ showAgentSessions: next }) } })),
          h('div', { className: 'dsan-set-sub' },
            h('div', { className: 'dsan-set-row' },
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 } },
                h('span', { style: { width: 120, flex: 'none' } }, '便笺透明度'),
                h('input', {
                  type: 'range', min: 0, max: 100, step: 1, value: stickyTransparency,
                  style: { flex: 1, accentColor: 'var(--dsw-alias-brand-primary)' },
                  onChange: (event) => { const next = Number(event.target.value); setStickyTransparency(next); patchSoon({ stickyTransparency: next }) },
                }),
                h('span', { style: { width: 38, textAlign: 'right', flex: 'none' } }, `${stickyTransparency}%`)),
              h('div', { className: 'dsan-set-hint' }, '0% 不透明，100% 完全透明。鼠标悬停或便笺被固定时都会变成不透明，方便阅读。')),
            h('div', { className: 'dsan-set-row' },
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 } },
                h('span', { style: { width: 120, flex: 'none' } }, '待办卡片透明度'),
                h('input', {
                  type: 'range', min: 0, max: 100, step: 1, value: todoTransparency,
                  style: { flex: 1, accentColor: 'var(--dsw-alias-brand-primary)' },
                  onChange: (event) => { const next = Number(event.target.value); setTodoTransparency(next); patchSoon({ todoTransparency: next }) },
                }),
                h('span', { style: { width: 38, textAlign: 'right', flex: 'none' } }, `${todoTransparency}%`)),
              h('div', { className: 'dsan-set-hint' }, '0% 不透明，100% 完全透明。只改卡片底色，不影响文字和条目悬停。')),
            h('div', { className: 'dsan-set-row' },
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 } },
                h('span', { style: { width: 120, flex: 'none' } }, '视觉放大'),
                h('input', {
                  type: 'range', min: 100, max: 200, step: 25, value: uiScale,
                  style: { flex: 1, accentColor: 'var(--dsw-alias-brand-primary)' },
                  onChange: (event) => { const next = normalizeUiScale(event.target.value); setUiScale(next); patchSettings({ uiScale: next }) },
                }),
                h('span', { style: { width: 46, textAlign: 'right', flex: 'none' } }, `${uiScale}%`)),
              h('div', { className: 'dsan-set-hint' }, '整页放大：界面各区域尺寸和所有字号一起缩放。五档 100%、125%、150%、175%、200%，默认 100%。')),
            h(Field, { label: '终态提示保留时间（秒）', hint: '成功、失败、取消及普通通知的小卡片保留时间，范围 3—600 秒。悬停、填写回复或放大时暂停；过程提示不自动消失。' }, h('input', {
              type: 'number', min: 3, max: 600, step: 1, value: surfaceRetention,
              onChange: (event) => setSurfaceRetention(event.target.value),
              onBlur: () => { const value = Math.max(3, Math.min(600, Math.round(Number(surfaceRetention) || 60))); setSurfaceRetention(value); patchSettings({ surfaceRetentionSeconds: value }) },
            })))),


        h(SettingsSection, { title: '快捷记录', desc: '顶部输入框把内容写进今日日记，再按需归档到主题笔记。' },
          h('div', { className: 'dsan-set-row' },
            h(Switch, {
              checked: autoArchive,
              onChange: (next) => { setAutoArchive(next); patchSettings({ autoArchive: next }) },
              label: '自动归档到主题笔记本',
            }),
            h('div', { className: 'dsan-set-hint' }, '关闭后只写今日日记，不再让模型判断归属。')),
          h(Field, { label: '快捷录入历史条数（1–50）' }, h('input', {
            type: 'number', min: 1, max: 50, value: captureHistoryLimit,
            onChange: (event) => { const next = Number(event.target.value); setCaptureHistoryLimit(next); patchSoon({ captureHistory: next }) },
          })),
          h('div', { className: 'dsan-set-hint' }, '输入框里按上下方向键可回溯最近几条记录。')),

        h(SettingsSection, { title: '提醒与声音', desc: '待办内容里出现明确时间会创建提醒，到点在右上角弹卡片。' },
          h('div', { className: 'dsan-set-row' },
            h(Switch, {
              checked: systemNotifications,
              onChange: changeSystemNotifications,
              label: '同时发送系统通知',
            }),
            h('div', { className: 'dsan-set-hint' }, '开启后需要授权；随记页面关闭时由宿主发送 macOS 原生通知。'),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 } },
              h('span', { style: { fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)' } },
                notificationPermission === 'granted' ? '通知权限：已授权'
                  : notificationPermission === 'denied' ? '通知权限：已拒绝'
                    : notificationPermission === 'unsupported' ? '浏览器通知不可用，将使用系统通知'
                      : '通知权限：未授权'),
              h('button', {
                className: 'dsan-btn small',
                onClick: () => {
                  const nativeFallback = () => {
                    api('system.notify', { title: '随记测试通知', body: '如果你看到这条，系统通知正常。' }).then((res) => {
                      if (res?.sent) notifySurface?.({ title: '测试通知已发送', body: '没看到的话，检查系统通知中心或专注模式' })
                      else notifySurface?.({ title: '系统通知发送失败', body: '当前系统不支持原生通知' })
                    }).catch((err) => notifySurface?.({ title: '系统通知发送失败', body: err.message }))
                  }
                  if (typeof Notification === 'undefined') { nativeFallback(); return }
                  const send = () => {
                    try {
                      new Notification('随记测试通知', { body: '如果你看到这条，系统通知正常。', tag: 'dsan-test' })
                      notifySurface?.({ title: '测试通知已发送', body: '没看到的话，检查系统通知中心或专注模式' })
                    } catch { nativeFallback() }
                  }
                  if (Notification.permission === 'granted') send()
                  else if (Notification.permission === 'denied') nativeFallback()
                  else Notification.requestPermission().then((permission) => {
                    setNotificationPermission(permission)
                    if (permission === 'granted') send()
                    else nativeFallback()
                  }).catch(() => nativeFallback())
                },
              }, '发送测试通知'))),

          h('div', { className: 'dsan-set-sub' },
            h(Switch, {
              checked: reminderSound,
              onChange: (next) => { setReminderSound(next); patchSettings({ reminderSound: next }) },
              label: '播放提醒音效',
            }),
            h('div', { className: 'dsan-set-hint' }, '默认关闭。可上传 ogg、mp3、wav、m4a、aac，最大 8MB。'),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8, fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)' } },
              h('span', null, `当前：${reminderSoundFile ? reminderSoundFile.split('/').pop() : '默认（嘟嘟噜）'}`),
              h('label', { className: 'dsan-btn small', style: { cursor: 'pointer' } },
                '选择音频',
                h('input', { type: 'file', accept: 'audio/*,.ogg,.mp3,.wav,.m4a,.aac', style: { display: 'none' }, onChange: pickSound })),
              h('button', { className: 'dsan-btn small', onClick: trySound }, '试听'),
              h('button', {
                className: 'dsan-btn small',
                onClick: () => api('settings.save', { reminderSoundFile: '' }).then(() => { setReminderSoundFile(''); refresh() }).catch((err) => notifySurface?.({ title: '设置保存失败', body: err.message })),
              }, '使用默认')),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)' } },
              h('span', null, '音效音量'),
              h('input', {
                type: 'range', min: 1, max: 100, step: 1, value: reminderSoundVolume,
                style: { width: 130, accentColor: 'var(--dsw-alias-brand-primary)' },
                onChange: (event) => { const next = Number(event.target.value); setReminderSoundVolume(next); patchSoon({ reminderSoundVolume: next }) },
              }),
              h('span', { style: { width: 34 } }, `${reminderSoundVolume}%`))),

          h('div', { className: 'dsan-set-sub' },
            h(Switch, {
              checked: reminderSpeech,
              onChange: (next) => { setReminderSpeech(next); patchSettings({ reminderSpeech: next }) },
              label: '朗读提醒内容',
            }),
            h('div', { className: 'dsan-set-hint' }, '使用系统中文语音。与音效同时开启时，音效结束后 0.5 秒开始朗读；只开朗读则卡片出现时立即读。'),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)' } },
              h('button', { className: 'dsan-btn small', onClick: trySpeech }, '试听朗读'),
              h('span', null, '声音和音量可在下面调整')),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)' } },
              h('span', null, '朗读声音'),
              h('select', {
                value: reminderVoiceGender,
                style: { fontSize: 12, padding: '2px 6px' },
                onChange: (event) => { const next = event.target.value; setReminderVoiceGender(next); patchSettings({ reminderVoiceGender: next }) },
              },
                h('option', { value: 'auto' }, '自动'),
                h('option', { value: 'female' }, '女声'),
                h('option', { value: 'male' }, '男声')),
              h('span', null, '取决于系统已安装的语音')),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)' } },
              h('span', null, '朗读音量'),
              h('input', {
                type: 'range', min: 1, max: 100, step: 1, value: reminderSpeechVolume,
                style: { width: 130, accentColor: 'var(--dsw-alias-brand-primary)' },
                onChange: (event) => { const next = Number(event.target.value); setReminderSpeechVolume(next); patchSoon({ reminderSpeechVolume: next }) },
              }),
              h('span', { style: { width: 34 } }, `${reminderSpeechVolume}%`)))),

        h(SettingsSection, { title: 'Agent 与模型', desc: '用于快捷记录自动归档和 /agent 指令；留空跟随 DSH 默认模型。' },
          h(Field, { label: 'Agent 引擎' }, h('select', { value: agentEngine, onChange: (event) => { const next = event.target.value === 'native' ? 'native' : 'json'; setAgentEngine(next); patchSoon({ agentEngine: next }) } },
            h('option', { value: 'native' }, '原生工具调用（默认，验证中）'),
            h('option', { value: 'json' }, 'JSON ReAct（兼容回退）'))),
          h('div', { className: 'dsan-set-hint', style: { marginBottom: 10 } }, '原生引擎仍在校验中；切换后新会话生效。'),
          h(Field, { label: 'Shadow 校验' }, h('label', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            h('input', { type: 'checkbox', checked: agentShadow, onChange: (event) => { const next = event.target.checked; setAgentShadow(next); patchSoon({ agentShadow: next }) } }),
            h('span', { style: { fontSize: 12 } }, '记录 JSON 工具调用与原生 schema 的差异'))),
          h('div', { style: { fontWeight: 600, fontSize: 12, margin: '14px 0 8px' } }, '运行限制'),
          h(Field, { label: 'ReAct 最大轮次' }, h('input', {
            type: 'number', min: 1, max: 50, value: reactMaxRounds,
            onChange: (event) => { const next = Number(event.target.value); setReactMaxRounds(next); patchSoon({ reactMaxRounds: next }) },
          })),
          h('div', { className: 'dsan-set-hint', style: { marginBottom: 10 } }, '默认 20 轮；复杂任务可调高，但会更慢、更耗 token。'),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 } },
            h(Field, { label: '工具结果上限（0 不限）' }, h('input', { type: 'number', min: 0, step: 1, value: toolResultMaxChars, onChange: (event) => { const next = Number(event.target.value); setToolResultMaxChars(next); patchSoon({ toolResultMaxChars: next }) } })),
            h(Field, { label: '网页正文上限（0 不限）' }, h('input', { type: 'number', min: 0, step: 1, value: webFetchMaxChars, onChange: (event) => { const next = Number(event.target.value); setWebFetchMaxChars(next); patchSoon({ webFetchMaxChars: next }) } })),
            h(Field, { label: '笔记读取上限（0 不限）' }, h('input', { type: 'number', min: 0, step: 1, value: readNoteMaxChars, onChange: (event) => { const next = Number(event.target.value); setReadNoteMaxChars(next); patchSoon({ readNoteMaxChars: next }) } }))),
          h('div', { className: 'dsan-set-hint', style: { marginBottom: 10 } }, '以上字符上限默认 0（不限）。非 0 时按保存的设置处理，并在模型收到的内容中标明截断；服务商自身的上下文与输出上限仍然有效。'),
          h(Field, { label: '网页抓取超时（毫秒）' }, h('input', { type: 'number', min: 1000, max: 300000, value: webTimeoutMs, onChange: (event) => { const next = Number(event.target.value); setWebTimeoutMs(next); patchSoon({ webTimeoutMs: next }) } })),
          h('div', { style: { fontWeight: 600, fontSize: 12, margin: '14px 0 8px' } }, '日志'),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 } },
            h(Field, { label: '日志保留天数' }, h('input', { type: 'number', min: 1, max: 3650, value: agentLogRetentionDays, onChange: (event) => { const next = Number(event.target.value); setAgentLogRetentionDays(next); patchSoon({ agentLogRetentionDays: next }) } })),
            h(Field, { label: '自动清理间隔（天）' }, h('input', { type: 'number', min: 1, max: 3650, value: agentLogCleanupIntervalDays, onChange: (event) => { const next = Number(event.target.value); setAgentLogCleanupIntervalDays(next); patchSoon({ agentLogCleanupIntervalDays: next }) } }))),
          h('button', { type: 'button', className: 'dsan-btn small', onClick: async () => { try { const res = await api('agent.logs.cleanup', { days: agentLogRetentionDays }); notifySurface({ title: `已清理 ${res.removed || 0} 份日志` }) } catch (err) { notifySurface({ title: '日志清理失败', body: err.message }) } } }, '立即清理旧日志'),
          h('div', { style: { fontWeight: 600, fontSize: 12, margin: '14px 0 8px' } }, '模型选择'),
          h('div', { className: 'dsan-set-hint', style: { marginBottom: 10 } }, 'provider 和 model 从 DSH 已注册的模型服务读取；API Key、Base URL、协议先在 DSH 模型设置里配好。两项都选好才生效。'),
          h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 8 } },
            h('button', {
              className: 'dsan-btn small',
              onClick: () => { loadProviders(); if (provider) loadModels(provider) },
            }, '刷新列表')),
          h(Field, { label: 'provider' }, h('select', {
            value: provider,
            onChange: (event) => {
              const next = event.target.value
              setProvider(next)
              setModel('')
              setModels([])
              patchSettings({ model: null })
            },
          },
            h('option', { value: '' }, '跟随 DSH 默认'),
            providerOptions.map((item) => h('option', { key: item.id, value: item.id }, `${item.name || item.id}（${item.id}）`)))),
          modelsLoading
            ? h('div', { className: 'dsan-set-hint' }, '正在读取模型列表…')
            : (provider && modelOptions.length)
              ? h(Field, { label: 'model' }, h('select', {
                value: model,
                onChange: (event) => {
                  const next = event.target.value
                  setModel(next)
                  patchSettings({ model: next ? { provider, model: next } : null })
                },
              },
                h('option', { value: '' }, '选择模型'),
                modelOptions.map((item) => h('option', { key: item.id, value: item.id }, item.name && item.name !== item.id ? `${item.name}（${item.id}）` : item.id))))
              : h(Field, { label: 'model' }, h('input', {
                value: model,
                onChange: (event) => setModel(event.target.value),
                onBlur: () => patchSettings({ model: provider && model ? { provider, model } : null }),
                placeholder: provider ? '该服务未返回模型列表，直接填写模型 ID' : '先选择 provider',
                disabled: !provider,
              })),
          h('div', { className: 'dsan-set-hint' }, 'provider 是服务商标识，model 是具体模型 ID，不是展示名称。')),

        h(SettingsSection, { title: '外部连接', desc: '外部 AI 通过该地址调用随记；写入会直接落盘。安装 Skill 后，其他 AI 可按说明连接。', action: h('button', { type: 'button', className: 'dsan-btn small', onClick: () => api('mcp.skill.install').then(({ path }) => notifySurface({ title: 'Skill 已安装', body: path, duration: 8000 })).catch((err) => notifySurface({ title: 'Skill 安装失败', body: err.message })) }, '安装 Skill') },
          h('div', { className: 'dsan-set-hint', style: { marginBottom: 8, wordBreak: 'break-all' } }, mcpUrl),
          h('div', { className: 'dsan-set-hint', style: { marginBottom: 8 } }, '仅监听本机。Token 等同于直接写入权限，只提供给可信的 AI 客户端。'),
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 } },
            h('code', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, mcpVisible ? mcpToken : '••••••••••••'),
            h('button', { type: 'button', className: 'dsan-btn small', onClick: () => setMcpVisible((value) => !value) }, mcpVisible ? '隐藏' : '显示'),
            h('button', { type: 'button', className: 'dsan-btn small', onClick: () => navigator.clipboard?.writeText(mcpToken).then(() => notifySurface({ title: 'Token 已复制' })).catch(() => { }) }, '复制'),
            h('button', { type: 'button', className: 'dsan-btn small', onClick: () => api('mcp.token.regenerate').then(({ token }) => { setMcpToken(token); setMcpVisible(true); notifySurface({ title: 'Token 已重新生成' }) }).catch((err) => notifySurface({ title: 'Token 生成失败', body: err.message })) }, '重新生成'))),
        h(SettingsSection, { title: '数据与隐私', desc: '删除的笔记和笔记本会先进废纸篓，超过保留天数才真正清理。' },
          h(Field, { label: '废纸篓保留天数' }, h('input', {
            type: 'number', min: 1, max: 365, value: trashDays,
            onChange: (event) => { const next = Number(event.target.value); setTrashDays(next); patchSoon({ trashDays: next }) },
          })),
          h('div', { className: 'dsan-set-hint' }, '建议保留 30 天以上，误删后有足够时间恢复。隐私模式只是隐藏笔记本，不加密文件。')),

        h(SettingsSection, { title: '支持随记', desc: '如果对你有帮助，可以请我喝杯咖啡，感谢支持~' },
          h('div', { style: { display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start', paddingBottom: 10 } },
            h('div', { style: { textAlign: 'center' } },
              h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 6 } }, '微信'),
              h('img', {
                src: pluginAsset('donate-wechat.webp'), alt: '微信收款码',
                style: { width: 170, height: 170, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l1)', background: '#fff', display: 'block' },
              })),
            h('div', { style: { textAlign: 'center' } },
              h('div', { style: { fontSize: 12, fontWeight: 600, marginBottom: 6 } }, '支付宝'),
              h('img', {
                src: pluginAsset('donate-alipay.webp'), alt: '支付宝收款码',
                style: { width: 170, height: 170, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l1)', background: '#fff', display: 'block' },
              })),
            ),
          h('div', { style: { marginTop: 18 } },
            h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 5 } }, '☆随记系列插件☆'),
            h('div', { className: 'dsan-set-hint', style: { marginBottom: 10 } },
              h('b', { style: { fontWeight: 700 } }, '「随记单词本」'),
              '：把想记的单词做成带插图、发音和例句的卡片。和随记一样，数据存在本地，适合每天翻一翻。'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
              h('button', {
                type: 'button', className: 'dsan-btn small',
                onClick: () => { try { window.open('https://github.com/shallinta/dsh-agentic-word-book', '_blank', 'noopener') } catch { /* ignore */ } },
              }, '去了解「随记单词本」'),
              h('button', {
                type: 'button', className: 'dsan-btn small primary',
                onClick: installWordBook,
              }, '一键安装「随记单词本」')),
            wordBookState ? h('div', { className: 'dsan-set-hint', style: { marginTop: 8 } }, wordBookState) : null))
      )
    }

    function DiaryCoverModal({ state, onClose, notifySurface, refresh }) {
      const [cover, setCover] = useState(state.diaryCover || '')
      const [calendar, setCalendar] = useState(state.settings?.calendar || 'double')
      const [cropFile, setCropFile] = useState(null)
      const changeCalendar = (value) => {
        setCalendar(value)
        api('settings.save', { calendar: value })
          .then(() => { notifySurface?.({ title: '日历显示已更新' }); refresh() })
          .catch((err) => notifySurface?.({ title: '设置保存失败', body: err.message }))
      }
      const pick = (event) => {
        const file = event.target.files?.[0]
        if (file) setCropFile(file)
        event.target.value = ''
      }
      const applyCover = (dataUrl) => {
        setCropFile(null)
        api('diary.setCover', { dataUrl })
          .then((res) => { setCover(res.cover); notifySurface?.({ title: '日记背景已更新' }); refresh() })
          .catch((err) => notifySurface?.({ title: '日记背景保存失败', body: err.message }))
      }
      const clear = () => api('diary.clearCover').then(() => { setCover(''); refresh() }).catch(() => { })
      if (cropFile) return h(ImageCropper, { file: cropFile, onCancel: () => setCropFile(null), onDone: applyCover, zoomScale: uiScaleFactor(state) })
      return h(Modal, {
        title: '日记本管理', onClose,
      },
        h(Field, { label: '日历显示' }, h('select', { value: calendar, onChange: (event) => changeCalendar(event.target.value) },
          h('option', { value: 'double' }, '双月（上月 + 本月）'),
          h('option', { value: 'single' }, '单月'))),
        h('div', { className: 'dsan-field' },
          h('label', null, '背景图'),
          h('div', { style: { display: 'flex', gap: 12, alignItems: 'center' } },
            cover
              ? h('div', { style: { width: 132, height: 84, borderRadius: 8, backgroundImage: `url(${assetUrl(cover)})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--dsw-alias-border-l2)' } })
              : h('div', { style: { width: 132, height: 84, borderRadius: 8, border: '1px dashed var(--dsw-alias-border-l2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dsw-alias-label-secondary)', fontSize: 11 } }, '无背景'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              h('label', { className: 'dsan-btn small', style: { cursor: 'pointer' } }, '选择图片', h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: pick })),
              cover ? h('button', { className: 'dsan-btn small', onClick: clear }, '清除') : null))),
        h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, '背景会以浅透明的方式铺在日记页面和日记卡片上。'))
    }

    function ImageCropper({ file, onCancel, onDone, zoomScale = 1 }) {
      const [src, setSrc] = useState('')
      const [natural, setNatural] = useState({ w: 0, h: 0 })
      const [crop, setCrop] = useState(null)
      const drag = useRef(null)
      const zoom = zoomScale > 0 ? zoomScale : 1
      const imgRef = useRef(null)
      const stageRef = useRef(null)
      const W = 360
      const H = 260
      const MIN = 40
      const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

      useEffect(() => {
        setSrc('')
        setNatural({ w: 0, h: 0 })
        setCrop(null)
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => setSrc(String(reader.result || ''))
        reader.readAsDataURL(file)
      }, [file])

      const scale = natural.w && natural.h ? Math.min(W / natural.w, H / natural.h) : 1
      const dw = natural.w * scale
      const dh = natural.h * scale
      const ix = (W - dw) / 2
      const iy = (H - dh) / 2

      const onLoad = (event) => {
        const nw = event.target.naturalWidth
        const nh = event.target.naturalHeight
        setNatural({ w: nw, h: nh })
        const s = Math.min(W / nw, H / nh)
        const w = nw * s
        const h = nh * s
        const x = (W - w) / 2
        const y = (H - h) / 2
        setCrop({ x: x + w * 0.08, y: y + h * 0.08, w: w * 0.84, h: h * 0.84 })
      }

      const start = (mode) => (event) => {
        if (!crop) return
        event.preventDefault()
        event.stopPropagation()
        stageRef.current?.setPointerCapture?.(event.pointerId)
        drag.current = { mode, x: event.clientX, y: event.clientY, rect: crop }
      }
      const move = (event) => {
        if (!drag.current || !crop) return
        const dx = (event.clientX - drag.current.x) / zoom
        const dy = (event.clientY - drag.current.y) / zoom
        const base = drag.current.rect
        const mode = drag.current.mode
        let x = base.x
        let y = base.y
        let w = base.w
        let h = base.h
        if (mode === 'move') {
          x = clamp(base.x + dx, ix, ix + dw - base.w)
          y = clamp(base.y + dy, iy, iy + dh - base.h)
        } else {
          if (mode.includes('e')) w = clamp(base.w + dx, MIN, ix + dw - base.x)
          if (mode.includes('s')) h = clamp(base.h + dy, MIN, iy + dh - base.y)
          if (mode.includes('w')) {
            const nx = clamp(base.x + dx, ix, base.x + base.w - MIN)
            w = base.x + base.w - nx
            x = nx
          }
          if (mode.includes('n')) {
            const ny = clamp(base.y + dy, iy, base.y + base.h - MIN)
            h = base.y + base.h - ny
            y = ny
          }
        }
        setCrop({ x, y, w, h })
      }
      const end = () => { drag.current = null }
      const confirm = () => {
        const image = imgRef.current
        if (!image || !crop || !natural.w) return
        const sw = crop.w / scale
        const sh = crop.h / scale
        const sx = (crop.x - ix) / scale
        const sy = (crop.y - iy) / scale
        const ratio = Math.min(1, 1600 / Math.max(sw, sh))
        const outW = Math.max(1, Math.round(sw * ratio))
        const outH = Math.max(1, Math.round(sh * ratio))
        const canvas = document.createElement('canvas')
        canvas.width = outW
        canvas.height = outH
        const context = canvas.getContext('2d')
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, outW, outH)
        context.drawImage(image, sx, sy, sw, sh, 0, 0, outW, outH)
        onDone?.(canvas.toDataURL('image/jpeg', 0.92))
      }
      const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
      return h(Modal, {
        title: '裁剪图片', onClose: onCancel,
        footer: [h('button', { key: 'c', className: 'dsan-btn', onClick: onCancel }, '取消'),
          h('button', { key: 'ok', className: 'dsan-btn primary', onClick: confirm, disabled: !crop }, '使用')],
      },
        h('div', {
          className: 'dsan-crop-stage', ref: stageRef,
          onPointerMove: move, onPointerUp: end, onPointerCancel: end,
        },
          src ? h('img', {
            ref: imgRef, className: 'dsan-crop-photo', src, alt: '',
            style: { left: `${ix}px`, top: `${iy}px`, width: `${dw}px`, height: `${dh}px` },
            onLoad,
          }) : null,
          crop ? h('div', {
            className: 'dsan-crop-box',
            style: { left: `${crop.x}px`, top: `${crop.y}px`, width: `${crop.w}px`, height: `${crop.h}px` },
            onPointerDown: start('move'),
          }, handles.map((dir) => h('div', {
            key: dir, className: `dsan-crop-handle dsan-ch-${dir}`,
            onPointerDown: start(dir),
          }))) : null),
        h('div', { className: 'dsan-crop-hint' }, '拖动选框移动，拖边角改变长宽；比例不限。'))
    }

    function Setup({ ctx, onDone, notifySurface }) {
      const [busy, setBusy] = useState(false)
      const choose = async () => {
        setBusy(true)
        try {
          const picked = await ctx.get('uiWorkspace')?.pickDirectory?.()
          if (!picked) { setBusy(false); return }
          await api('pickRoot', { path: picked })
          onDone()
        } catch (err) {
          notifySurface?.({ title: '选择笔记目录失败', body: err.message })
        } finally { setBusy(false) }
      }
      return h('div', { className: 'dsan-setup' },
        h('div', { className: 'dsan-setup-card' },
          h(Icon, { size: 56 }),
          h('h2', null, '先给随记挑一个文件夹'),
          h('p', null, '笔记会以普通 markdown 文件存在这里：一本笔记本一个文件夹，日记在 日记/ 里按日期滚动。以后也能在设置里换。'),
          h('button', { className: 'dsan-btn primary', onClick: choose, disabled: busy }, busy ? '正在准备…' : '选择文件夹')))
    }

    // ------------------------------------------------------------------ 主界面

    function styleTag() {
      return h('style', { dangerouslySetInnerHTML: { __html: CSS } })
    }

    function ReminderCard({ item, onClose, onAutoClose, onStopPeriodic, background }) {
      const [now, setNow] = useState(new Date())
      useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(timer)
      }, [])
      useEffect(() => {
        const noticeAt = item.noticeAt ? Date.parse(item.noticeAt) : Date.now()
        const remaining = Math.max(0, 5 * 60 * 1000 - (Date.now() - noticeAt))
        const timer = setTimeout(() => onAutoClose?.(), remaining)
        return () => clearTimeout(timer)
      }, [])
      return h('div', { className: 'dsan-reminder-card', role: 'status' },
        background ? h('div', { className: 'dsan-reminder-bg', style: { backgroundImage: `url(${background})` } }) : null,
        h('div', { className: 'dsan-reminder-content' },
          h('div', { className: 'rh' },
            h('span', null, '提醒'),
            h('span', { className: 'sp' }),
            h('button', { className: 'rx', title: '关闭提醒', 'aria-label': '关闭提醒', onClick: onClose }, '×')),
          h('div', { className: 'rt' }, item.text),
          h('div', { className: 'rc' }, `现在 ${now.toLocaleTimeString('zh-CN', { hour12: false })}`),
          item.kind && item.kind !== 'once'
            ? h('div', { className: 'dsan-reminder-foot' },
              h('button', { className: 'dsan-reminder-stop', onClick: onStopPeriodic }, '关闭周期提醒'))
            : null))
    }

    function SurfaceSizeIcon({ large }) {
      return h('svg', {
        width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, focusable: false,
      }, h('path', { d: large
        ? 'M3 8h5V3 M16 3v5h5 M3 16h5v5 M16 21v-5h5'
        : 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5' }))
    }

    function SurfaceCard({ surface, compact, command, onAction }) {
      const [text, setText] = useState(surface.draft || '')
      const [editing, setEditing] = useState(Boolean(surface.draft))
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [feedback, setFeedback] = useState('')
      const editor = useRef(null)
      const hover = useRef(false)
      const pendingDraft = useRef(Promise.resolve())
      const focusRequested = useRef(false)
      const large = surface.size === 'large'
      const labels = { queued: '等待处理', running: '处理中', waiting_user: '等待回答', waiting_confirmation: '等待确认', succeeded: '已完成', failed: '失败', cancelled: '已取消' }
      const waiting = ['waiting_user', 'waiting_confirmation'].includes(surface.status)
      const terminal = ['succeeded', 'failed', 'cancelled'].includes(surface.status)
      useEffect(() => {
        if (document.activeElement !== editor.current) setText(surface.draft || '')
      }, [surface.draft])
      useEffect(() => {
        if (large && focusRequested.current && editor.current) { editor.current.focus(); focusRequested.current = false }
      }, [large, editing])
      useEffect(() => {
        const timer = setInterval(() => { if (hover.current) command('surface.present', { surfaceId: surface.id, hover: true, attempt: surface.attempt }).catch(() => {}) }, 5000)
        return () => { clearInterval(timer); if (hover.current) command('surface.present', { surfaceId: surface.id, hover: false, attempt: surface.attempt }).catch(() => {}) }
      }, [surface.id, surface.attempt, command])
      const present = (patch) => command('surface.present', { surfaceId: surface.id, attempt: surface.attempt, ...patch }).catch((err) => setError(err.message))
      const draft = (value) => {
        setText(value)
        pendingDraft.current = pendingDraft.current.catch(() => {}).then(() => command('surface.present', { surfaceId: surface.id, attempt: surface.attempt, draft: value }))
        pendingDraft.current.catch((err) => setError(err.message))
      }
      const act = async (action) => {
        if (busy) return
        if (action.type === 'reply' && terminal && !editing) {
          setEditing(true); focusRequested.current = true
          await present({ size: 'large' })
          if (editor.current) editor.current.focus()
          return
        }
        if ((action.type === 'reply' || action.id === 'reply') && !text.trim()) return
        setBusy(true); setError('')
        try {
          await pendingDraft.current
          const out = await onAction(surface, action, text)
          if (out?.processing) { setFeedback('正在处理，请勿重复提交'); return }
          if (out?.clipboard) setFeedback('日志已复制')
          if (['reply', 'agent-answer', 'capture-answer', 'agent-followup'].includes(action.type)) {
            setText(''); setEditing(false)
            await present({ draft: '', attempt: out?.currentSurface?.attempt ?? surface.attempt })
          }
        } catch (err) { setError(err.message) } finally { setBusy(false) }
      }
      return h('section', { className: cls('dsan-surface-card', large && 'large', compact && 'compact'), 'aria-label': surface.title,
        onMouseEnter: () => { hover.current = true; present({ hover: true }) },
        onMouseLeave: () => { hover.current = false; present({ hover: false }) },
      },
        h('div', { className: 'dsan-surface-head' },
          h('div', { className: 'dsan-surface-title' }, surface.title),
          h('button', { type: 'button', className: 'dsan-surface-size', title: large ? '缩小卡片' : '放大卡片', 'aria-label': large ? '缩小卡片' : '放大卡片',
            onClick: () => present({ size: large ? 'small' : 'large' }) }, h(SurfaceSizeIcon, { large }))),
        h('div', { className: 'dsan-surface-state', 'aria-live': 'polite' },
          !terminal && !waiting ? h('span', { className: 'dsan-spinner' }) : null, labels[surface.status] || ''),
        h('div', { className: 'dsan-surface-content' },
          h('div', { className: 'dsan-surface-body' }, surface.body),
          large && (editing || surface.allowFreeText) ? h('textarea', {
            ref: editor, className: 'dsan-surface-input', value: text, placeholder: '输入回复或补充说明', 'aria-label': '回复内容',
            onChange: (event) => draft(event.target.value),
            onKeyDown: (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); act({ id: 'reply', type: 'reply' }) } },
          }) : null,
          error ? h('div', { className: 'dsan-surface-error', role: 'alert' }, error) : null,
          feedback ? h('div', { className: 'dsan-set-hint' }, feedback) : null),
        h('div', { className: 'dsan-surface-foot' },
          h('div', { className: 'dsan-surface-actions' },
            (surface.actions || []).map((action) => h('button', { key: action.id, type: 'button', className: 'dsan-btn small', disabled: busy,
              title: action.description || '', onClick: () => act(action) }, action.type === 'reply' && editing ? '发送' : action.label)),
            waiting && surface.allowFreeText ? h('button', { type: 'button', className: 'dsan-btn small', disabled: busy || (large && !text.trim()),
              onClick: () => {
                if (!large) { setEditing(true); focusRequested.current = true; present({ size: 'large' }) }
                else act({ id: 'reply', type: 'reply' })
              } }, large ? '发送' : '回复') : null),
          h('button', { type: 'button', className: 'dsan-surface-close', 'aria-label': waiting ? '放弃任务' : terminal ? '关闭提示' : '暂时隐藏提示',
            title: waiting ? '放弃任务' : terminal ? '关闭提示' : '暂时隐藏，下次内容更新时重新显示', disabled: busy,
            onClick: () => command('surface.close', { surfaceId: surface.id, attempt: surface.attempt, revision: surface.revision }).catch((err) => setError(err.message)) }, '×')))
    }

    class AppErrorBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }
      static getDerivedStateFromError(error) { return { error } }
      componentDidCatch(error) { console.error('随记页面出错', error) }
      render() {
        if (this.state.error) {
          return h('div', { className: 'dsan' }, h('div', { className: 'dsan-empty', style: { whiteSpace: 'pre-wrap', textAlign: 'left', padding: 24 } },
            '随记页面出错了：\n' + String(this.state.error?.stack || this.state.error?.message || this.state.error)))
        }
        return this.props.children
      }
    }

    function App({ ctx, onReload }) {
      const [state, setState] = useState(null)
      const [view, setView] = useState(readSavedView)
      const [modal, setModal] = useState(null)
      const [captureText, setCaptureText] = useState('')
      const [slashIndex, setSlashIndex] = useState(0)
      const captureRef = useRef(null)
      // 命令名打全了就不再弹提示；只匹配到唯一一个且已经完整时收起。
      const slashTyped = (() => {
        const m = /^\/([a-zA-Z]*)$/.exec(captureText.trim())
        return m ? m[1].toLowerCase() : null
      })()
      const slashChoices = (() => {
        if (slashTyped === null) return []
        const list = SLASH_COMMANDS.filter((cmd) => cmd.name.startsWith(slashTyped))
        return (list.length === 1 && list[0].name === slashTyped) ? [] : list
      })()
      const slashActive = slashChoices.length ? Math.min(slashIndex, slashChoices.length - 1) : 0
      useEffect(() => { setSlashIndex(0) }, [slashTyped])
      const [captureImages, setCaptureImages] = useState([])
      const [previewImage, setPreviewImage] = useState(null)
      const [surfaces, setSurfaceQueue] = useState([])
      const contentAreaRef = useRef(null)
      const surfaceStackRef = useRef(null)
      useEffect(() => {
        const el = contentAreaRef.current
        if (!el) return
        const update = () => el.style.setProperty('--dsan-content-height', `${el.clientHeight}px`)
        update()
        const observer = new ResizeObserver(update)
        observer.observe(el)
        return () => observer.disconnect()
      }, [state?.configured])
      useEffect(() => {
        const stack = surfaceStackRef.current
        if (!stack) return
        const peers = [...stack.children].filter((child) => !child.classList.contains('large'))
        const update = () => stack.style.setProperty('--dsan-peer-space', `${peers.reduce((sum, child) => sum + child.offsetHeight + 10, 0)}px`)
        update()
        const observer = new ResizeObserver(update)
        peers.forEach((peer) => observer.observe(peer))
        return () => observer.disconnect()
      }, [state?.configured, surfaces.map((s) => `${s.id}:${s.size}`).join('|')])
      const [surfaceError, setSurfaceError] = useState('')
      const surfaceClientId = useRef(`window-${Date.now()}-${Math.random().toString(16).slice(2)}`)
      const surfaceFetch = useRef(0)
      const refreshSurfaces = useCallback(async (open = false) => {
        const seq = ++surfaceFetch.current
        const data = await api(open ? 'surface.open' : 'surface.list')
        if (seq === surfaceFetch.current) { setSurfaceQueue((data.queue || []).slice(0, 3)); setSurfaceError('') }
        return data
      }, [])
      const surfaceCommand = useCallback(async (op, args = {}) => {
        try {
          const result = await api(op, { ...args, clientId: surfaceClientId.current })
          const queue = await refreshSurfaces()
          return { ...result, currentSurface: (queue.queue || []).find((item) => item.id === args.surfaceId) }
        } catch (err) { throw err }
      }, [refreshSurfaces])
      useEffect(() => {
        if (!state?.root) return
        let active = true
        setSurfaceQueue([])
        refreshSurfaces(true).catch((err) => { if (active) setSurfaceError(err.message) })
        const timer = setInterval(() => { if (active) refreshSurfaces().catch((err) => setSurfaceError(err.message)) }, 1000)
        return () => { active = false; clearInterval(timer); surfaceFetch.current += 1 }
      }, [state?.root, refreshSurfaces])
      useEffect(() => { saveView(view) }, [view])
      const [captureFocused, setCaptureFocused] = useState(false)
      const [legacyUi] = useState(readLegacyUi)
      const [todoHideDone, setTodoHideDone] = useState(() => legacyUi.todoHideDone === true)
      const [privacyMode, setPrivacyMode] = useState(false)
      const [captureHistory, setCaptureHistory] = useState(() => Array.isArray(legacyUi.captureHistory) ? legacyUi.captureHistory : [])
      const [historyIndex, setHistoryIndex] = useState(-1)
      const historyDraft = useRef('')
      const [pageSticky, setPageSticky] = useState(null)
      const [pageMinSticky, setPageMinSticky] = useState(null)
      const [settings, setSettings] = useState(false)
      const [agentSessionOpen, setAgentSessionOpen] = useState(false)
      const [agentSessionList, setAgentSessionList] = useState([])
      const [agentSessionDetail, setAgentSessionDetail] = useState(null)
      const [agentSessionLatest, setAgentSessionLatest] = useState(null)
      const [diarySettings, setDiarySettings] = useState(false)
      const [todoOpen, setTodoOpen] = useState(false)
      const appMountedRef = useRef(true)
      useEffect(() => () => { appMountedRef.current = false }, [])
      const [dueReminders, setDueReminders] = useState([])
      const dueRemindersRef = useRef([])
      const suppressedNotices = useRef(new Set())
      const ackedReminders = useRef(new Set())
      const prevTodoDone = useRef(null)
      const notificationWarned = useRef(false)
      const notifiedSystemKeys = useRef(new Set())
      const lastSoundAt = useRef(0)
      const settingsRef = useRef(state?.settings)
      const [contentNonce, setContentNonce] = useState(0)
      const [hiddenStickies, setHiddenStickies] = useState([])
      const bumpContent = () => setContentNonce((n) => n + 1)
      const [fabBottom, setFabBottom] = useState(() => {
        if (Number.isFinite(legacyUi.fabBottom)) return legacyUi.fabBottom
        const factor = normalizeUiScale(state?.settings?.uiScale) / 100
        return typeof window !== 'undefined' ? Math.round((window.innerHeight || 800) / factor * 0.2) : 160
      })
      const uiHydrated = useRef(false)
      const fabDrag = useRef(null)
      const fabMoved = useRef(false)
      const prevStatus = useRef(null)
      const viewRef = useRef(view)
      viewRef.current = view
      settingsRef.current = state?.settings

      const notifySystemReminder = (key, text) => {
        if (notifiedSystemKeys.current.has(key)) return
        notifiedSystemKeys.current.add(key)
        if (settingsRef.current?.systemNotifications !== true) return
        const warn = (body) => {
          if (notificationWarned.current) return
          notificationWarned.current = true
          notifySurface({ title: '系统通知发送失败', body })
        }
        const fallback = () => {
          api('system.notify', { title: '随记提醒', body: text }).then((res) => {
            if (!res?.sent) warn('浏览器通知不可用，系统通知也发送失败')
          }).catch(() => warn('浏览器通知不可用，系统通知也发送失败'))
        }
        if (typeof Notification === 'undefined') {
          fallback()
          return
        }
        const show = () => {
          try {
            const notification = new Notification('随记提醒', { body: text, tag: key, silent: false })
            notification.onclick = () => { try { window.focus() } catch { /* ignore */ }; notification.close() }
          } catch { fallback() }
        }
        if (Notification.permission === 'granted') show()
        else if (Notification.permission === 'default') Notification.requestPermission().then((permission) => {
          if (permission === 'granted') show()
          else fallback()
        }).catch(() => fallback())
        else fallback()
      }

      const isPeriodicKind = (kind) => Boolean(kind) && kind !== 'once'
      const setCards = (next) => { dueRemindersRef.current = next; setDueReminders(next) }
      const removeCard = (key) => setCards(dueRemindersRef.current.filter((entry) => entry.key !== key))
      const ackReminderNotice = (entry) => {
        api('todo.ackReminder', { id: entry.id }).then(() => { suppressedNotices.current.delete(entry.key); refresh() }).catch(() => { suppressedNotices.current.delete(entry.key) })
      }
      const dismissReminderNotice = (entry) => {
        api('todo.dismissReminder', { id: entry.id }).then(() => { suppressedNotices.current.delete(entry.key); refresh() }).catch(() => { suppressedNotices.current.delete(entry.key) })
      }
      const evictCard = (entry) => {
        suppressedNotices.current.add(entry.key)
        if (isPeriodicKind(entry.kind)) {
          dismissReminderNotice(entry)
          return
        }
        const deadline = (Date.parse(entry.noticeAt || '') || Date.now()) + 5 * 60 * 1000
        const delay = Math.max(0, deadline - Date.now())
        setTimeout(() => ackReminderNotice(entry), delay)
      }
      const announceReminder = (text) => {
        const current = settingsRef.current
        if (!current) return
        const withSound = current.reminderSound === true
        const withSpeech = current.reminderSpeech === true
        if (!withSound && !withSpeech) return
        const now = Date.now()
        if (now - lastSoundAt.current < 1200) return
        lastSoundAt.current = now
        const speak = () => {
          if (withSpeech) setTimeout(() => speakReminder(text, current.reminderVoiceGender || 'auto', current.reminderSpeechVolume), withSound ? 500 : 0)
        }
        if (!withSound) { speak(); return }
        try {
          const audio = new Audio(soundUrl(current.reminderSoundFile || 'default'))
          audio.volume = Math.max(0.01, Math.min(1, (Number(current.reminderSoundVolume) || 100) / 100))
          let settled = false
          const afterSound = () => {
            if (settled) return
            settled = true
            speak()
          }
          audio.onended = afterSound
          audio.onerror = afterSound
          audio.play().catch(afterSound)
        } catch {
          speak()
        }
      }
      const addCard = (entry, announce = true) => {
        if (suppressedNotices.current.has(entry.key)) return
        if (dueRemindersRef.current.some((item) => item.key === entry.key)) return
        notifySystemReminder(entry.key, entry.text)
        if (announce) announceReminder(entry.text)
        const next = [...dueRemindersRef.current, entry]
        if (next.length > 3) {
          const removed = next.shift()
          evictCard(removed)
        }
        setCards(next)
      }
      const closeReminderCard = (entry) => {
        suppressedNotices.current.add(entry.key)
        removeCard(entry.key)
        if (isPeriodicKind(entry.kind)) dismissReminderNotice(entry)
        else ackReminderNotice(entry)
      }
      const stopPeriodicReminder = (entry) => {
        suppressedNotices.current.add(entry.key)
        removeCard(entry.key)
        ackReminderNotice(entry)
      }

      const notifySurface = useCallback((notice) => {
        const failed = /失败|不能|不支持|不存在|未知|没|无法|超/.test(notice.title || '')
        // This adapter only translates old call sites; it owns no queue/timer.
        // Actions must be data descriptors so restoration never depends on closures.
        const actions = (notice.actions || []).filter(Boolean).map((a, index) => ({ ...a, id: a.id || String(index) }))
        return surfaceCommand('surface.create', { kind: 'notice', source: 'ui', state: notice.state || (failed ? 'failed' : 'succeeded'),
          surfaceId: notice.surfaceId, eventKey: notice.eventKey, restart: notice.restart === true,
          title: notice.title, body: notice.body || '', actions }).catch(() => {})
      }, [surfaceCommand])
      const stateRequestSeq = useRef(0)
      const refresh = useCallback(async () => {
        const seq = ++stateRequestSeq.current
        try {
          const next = await api('state')
          if (seq === stateRequestSeq.current) setState(next)
          return next
        } catch (err) {
          return null
        }
      }, [])

      useEffect(() => { refresh() }, [refresh])
      const openAgentSessions = async () => {
        setAgentSessionOpen(true)
        try {
          const data = await api('agent.sessions')
          const list = data?.sessions || []
          setAgentSessionList(list)
          // 每次打开都重新拉一次：优先当前选中的会话，没有就取第一条。
          const target = list.find((item) => item.id === agentSessionDetail?.id) || list[0]
          if (target) {
            const detail = await api('agent.session', { id: target.id })
            const session = detail?.session || null
            if (session) setAgentSessionDetail(session)
            else setAgentSessionDetail(null)
          } else {
            setAgentSessionDetail(null)
          }
        } catch { /* ignore */ }
      }
      useEffect(() => {
        if (!agentSessionOpen || !agentSessionDetail?.id) return
        const id = agentSessionDetail.id
        let active = true
        const timer = setInterval(async () => {
          try {
            const data = await api('agent.session', { id })
            if (active) setAgentSessionDetail((prev) => prev?.id === id ? data.session : prev)
          } catch { /* keep the last known transcript */ }
        }, 1000)
        return () => { active = false; clearInterval(timer) }
      }, [agentSessionOpen, agentSessionDetail?.id])
      const openAgentSession = async (session) => {
        try {
          const detail = await api('agent.session', { id: session.id })
          setAgentSessionDetail(detail?.session || null)
        } catch { /* ignore */ }
      }
      useEffect(() => {
        api('agent.sessions').then((data) => {
          const list = data?.sessions || []
          setAgentSessionLatest(list[0] || null)
          setAgentSessionList(list)
        }).catch(() => { })
      }, [])
      useEffect(() => {
        if (!state?.ui) return
        setPrivacyMode(state.ui.privacyMode === true)
      }, [state?.ui?.privacyMode])

      useEffect(() => {
        if (!state || state.configured === false || uiHydrated.current) return
        uiHydrated.current = true
        const ui = state.ui || {}
        const patch = {}
        const viewportHeight = ((typeof window !== 'undefined' ? window.innerHeight : 800) || 800) / uiScale
        const maxBottom = Math.max(70, viewportHeight - 80)
        const clampBottom = (value) => Math.round(Math.max(70, Math.min(maxBottom, Number(value))))
        if (Number.isFinite(ui.fabBottom) && ui.fabBottom > 0) setFabBottom(clampBottom(ui.fabBottom))
        else if (Number.isFinite(legacyUi.fabBottom)) {
          setFabBottom(clampBottom(legacyUi.fabBottom))
          patch.fabBottom = clampBottom(legacyUi.fabBottom)
        } else if (Number.isFinite(ui.fabTop) && ui.fabTop > 0) {
          const migrated = clampBottom(viewportHeight - ui.fabTop)
          setFabBottom(migrated)
          patch.fabBottom = migrated
        }
        if (ui.todoHideDone === true) setTodoHideDone(true)
        if (ui.privacyMode === true) setPrivacyMode(true)
        else if (legacyUi.todoHideDone === true) { setTodoHideDone(true); patch.todoHideDone = true }
        if (Array.isArray(ui.captureHistory) && ui.captureHistory.length) setCaptureHistory(ui.captureHistory.slice(0, 50))
        else if (Array.isArray(legacyUi.captureHistory) && legacyUi.captureHistory.length) {
          const list = legacyUi.captureHistory.slice(0, 50)
          setCaptureHistory(list)
          patch.captureHistory = list
        }
        if (Object.keys(patch).length) {
          api('ui.save', patch).then(() => { clearLegacyUi(); refresh() }).catch(() => { })
        } else {
          clearLegacyUi()
        }
      }, [state?.configured])
      useEffect(() => {
        const beat = () => { api('ui.heartbeat').catch(() => { }) }
        beat()
        const timer = setInterval(beat, 4000)
        return () => clearInterval(timer)
      }, [])

      useEffect(() => {
        const check = () => {
          api('todo.fireDue').then((res) => {
            const fired = res?.fired || []
            if (!fired.length) return
            const entries = fired.map((item) => ({
              key: `notice:${item.id}:${item.noticeAt || ''}`,
              id: item.id,
              text: item.text,
              noticeAt: item.noticeAt || new Date().toISOString(),
              kind: item.kind || 'once',
            }))
            for (const entry of entries) addCard(entry, true)
            refresh()
          }).catch(() => { })
        }
        check()
        const timer = setInterval(check, 5000)
        return () => clearInterval(timer)
      }, [])

      useEffect(() => {
        const items = state?.todo?.items || []
        const byId = new Map(items.map((item) => [item.id, item]))
        for (const entry of [...dueRemindersRef.current]) {
          const item = byId.get(entry.id)
          if (item && item.done === true) removeCard(entry.key)
        }
        const now = Date.now()
        for (const item of items) {
          const reminder = item.reminder
          if (!reminder || reminder.noticePending !== true) continue
          const noticeAt = Date.parse(reminder.noticeAt || '') || now
          const key = `notice:${item.id}:${reminder.noticeAt || ''}`
          const kind = reminder.kind || 'once'
          if (now - noticeAt >= 5 * 60 * 1000) {
            if (!ackedReminders.current.has(key)) {
              ackedReminders.current.add(key)
              if (isPeriodicKind(kind)) {
                removeCard(key)
                dismissReminderNotice({ id: item.id, key })
              } else {
                api('todo.ackReminder', { id: item.id }).then(() => refresh()).catch(() => {
                  ackedReminders.current.delete(key)
                })
              }
            }
            continue
          }
          addCard({ key, id: item.id, text: item.text, noticeAt: new Date(noticeAt).toISOString(), kind }, false)
        }
      }, [state?.todo])

      useEffect(() => {
        const items = state?.todo?.items || []
        if (prevTodoDone.current === null) {
          prevTodoDone.current = new Map(items.map((item) => [item.id, item.done === true]))
          return
        }
        const previous = prevTodoDone.current
        for (const item of items) {
          const wasDone = previous.get(item.id)
          if (wasDone === false && item.done === true && item.reminder) {
            notifySurface({
              title: isPeriodicKind(item.reminder.kind) ? '周期定时提醒已结束' : '定时提醒已结束',
              body: item.text,
              duration: 6000,
            })
          }
          previous.set(item.id, item.done === true)
        }
        for (const id of [...previous.keys()]) {
          if (!items.some((item) => item.id === id)) previous.delete(id)
        }
      }, [state?.todo])

      useEffect(() => {
        const timer = setInterval(() => {
          if (!settings) refresh()
        }, 2500)
        return () => clearInterval(timer)
      }, [refresh, settings])

      // 离开非首页时，把这一页的临时便笺交给首页；空便笺删掉。
      const go = (next) => {
        const leaving = pageSticky || pageMinSticky
        setPageSticky(null)
        setPageMinSticky(null)
        setView(next)
        if (leaving) {
          const hasContent = (leaving.items || []).some((item) => String(item || '').trim())
          if (!hasContent && !leaving.pinned) {
            // 先隐藏，避免回首页时闪现；再等输入框卸载的兜底保存，确认为空才删。
            setHiddenStickies((prev) => [...prev, leaving.id])
            setTimeout(() => {
              api('sticky.cleanupEmpty', { id: leaving.id }).finally(() => {
                setHiddenStickies((prev) => prev.filter((id) => id !== leaving.id))
                refresh()
              })
            }, 300)
          } else {
            api('sticky.save', { id: leaving.id, items: leaving.items || [] }).finally(() => refresh())
          }
        } else {
          refresh()
        }
        if (next.kind === 'home') api('capture.retryQueue').catch(() => { })
      }

      useEffect(() => {
        if (!state || state.configured === false) return
        if (view.kind !== 'notebook') return
        if ((state.notebooks || []).some((notebook) => notebook.name === view.name)) return
        setView({ kind: 'home' })
        refresh()
      }, [state?.notebooks, view.kind, view.name])

      const rememberCapture = (text) => {
        const limit = Math.max(1, Math.min(50, Number(state?.settings?.captureHistory) || 20))
        const next = [text, ...captureHistory.filter((item) => item !== text)].slice(0, limit)
        setCaptureHistory(next)
        setHistoryIndex(-1)
        historyDraft.current = ''
        api('ui.save', { captureHistory: next }).catch(() => { })
      }

      const currentContext = () => {
        if (view.kind === 'notebook') return { view: 'notebook', notebook: view.name }
        if (view.kind === 'note') return { view: 'note', notebook: view.path.split('/')[0], path: view.path }
        if (view.kind === 'diaryDoc') return { view: 'diaryDoc', doc: view.doc, date: view.date }
        if (view.kind === 'diary') return { view: 'diary' }
        return { view: 'home' }
      }

      const actOnSurface = async (card, action, text = '') => {
        if (['reply', 'agent-answer', 'agent-followup'].includes(action.type) && card.sessionId) {
          const input = text || action.text || action.label || ''
          setAgentSessionDetail((prev) => prev?.id === card.sessionId ? { ...prev, turns: [...(prev.turns || []), { id: `local-${Date.now()}`, input, status: 'running' }] } : prev)
        }
        const result = await surfaceCommand('surface.action', { surfaceId: card.id, actionId: action.id,
          interactionId: card.interaction?.id, attempt: card.attempt, requestId: `${card.id}:${Date.now()}:${Math.random()}`, text })
        if (result?.navigate) go(result.navigate.kind === 'diaryDoc' ? { ...result.navigate, heading: headingFor(result.navigate.date) } : result.navigate)
        if (result?.clipboard) await copyText(result.clipboard)
        if (result?.refresh) { bumpContent(); refresh() }
        return result
      }
      const notifyReminderCreated = (list) => {
        if (!list?.length) return
        notifySurface({ title: list.length === 1 ? '提醒已创建' : `已创建 ${list.length} 个提醒`,
          body: list.map((item) => `${item.text} · ${item.kind && item.kind !== 'once' ? '周期提醒' : '单次提醒'} · ${fmtReminderTime(item.nextAt)}`).join('\n') })
      }

      const addCaptureFiles = async (fileList) => {
        const files = Array.from(fileList || []).filter((file) => file && file.type && file.type.startsWith('image/'))
        if (!files.length) return
        const room = 9 - captureImages.length
        if (room <= 0) { notifySurface({ title: '最多放 9 张图片' }); return }
        const accepted = files.filter((file) => file.size <= 10 * 1024 * 1024).slice(0, room)
        if (accepted.length < files.length) notifySurface({ title: '部分图片没有加入', body: '单张不能超过 10MB，最多 9 张' })
        const loaded = await Promise.all(accepted.map((file) => new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve({ id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, name: file.name || '截图', dataUrl: String(reader.result || '') })
          reader.onerror = () => reject(new Error('图片读取失败'))
          reader.readAsDataURL(file)
        })))
        setCaptureImages((prev) => [...prev, ...loaded].slice(0, 9))
      }

      const uploadCaptureImages = async () => {
        const paths = []
        for (const image of captureImages) {
          const uploaded = await api('image.upload', { dataUrl: image.dataUrl })
          paths.push(uploaded.path)
        }
        return paths
      }

      const captureSubmitting = useRef(false)
      const submitCapture = async () => {
        if (captureSubmitting.current) return
        const raw = captureText.trim()
        if (!raw && !captureImages.length) return
        const slash = /^\/([a-zA-Z]+)(?:\s+([\s\S]*))?$/.exec(raw)
        const name = slash ? slash[1].toLowerCase() : 'note'
        const text = slash ? String(slash[2] || '').trim() : raw
        if (!['memo', 'todo', 'note', 'agent'].includes(name)) {
          notifySurface({ eventKey: `invalid-command:${name}`, title: '未知命令', body: '可用：/memo /todo /note /agent' })
          return
        }
        if (slash && !text) {
          notifySurface({ eventKey: `empty-command:${name}`, title: `请在 /${name} 后输入内容` })
          return
        }
        captureSubmitting.current = true
        let surfaceId = ''
        const requestId = `submit-${Date.now()}-${Math.random().toString(16).slice(2)}`
        try {
          const title = name === 'memo' ? '正在创建便笺' : name === 'todo' ? '正在添加待办' : captureImages.length ? '正在上传图片' : name === 'agent' ? '正在启动任务' : '正在记录日记'
          const created = await surfaceCommand('surface.create', { requestId, kind: name === 'note' ? 'capture' : name, source: name === 'agent' ? 'agent' : 'ui', state: 'running', title, body: '' })
          surfaceId = created.surface.id
          if (name === 'memo') {
            const items = text.split('\n').map((line) => line.trim()).filter(Boolean)
            const made = await api('sticky.create', stickySpawnPosition())
            await api('sticky.save', { id: made.sticky.id, items })
            await surfaceCommand('surface.update', { surfaceId, patch: { state: 'succeeded', title: '便笺已创建', body: items.join('\n') } })
          } else if (name === 'todo') {
            const fresh = text.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => ({
              id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2, 6)}`,
              text: line.replace(/#[^\s#]+/g, '').trim() || line, tags: [...line.matchAll(/#([^\s#]+)/g)].map((m) => m[1]), done: false, createdAt: new Date().toISOString(),
            }))
            const saved = await api('todo.save', { items: [...fresh, ...(state.todo?.items || [])], baseVersion: state.todo?.version })
            setTodoOpen(true)
            const reminders = saved?.remindersCreated || []
            await surfaceCommand('surface.update', { surfaceId, patch: { state: 'succeeded', title: '待办已添加',
              body: fresh.map((item) => item.text).join('\n') + (reminders.length ? `\n同时创建了 ${reminders.length} 个提醒。` : '') } })
          } else {
            const images = await uploadCaptureImages()
            if (name === 'agent') {
              await surfaceCommand('surface.update', { surfaceId, patch: { title: text.split('\n')[0], body: '正在启动……' } })
              await api('agent.start', { instruction: text, context: currentContext(), images, surfaceId, requestId })
            } else {
              await surfaceCommand('surface.update', { surfaceId, patch: { title: '正在记录日记', body: '' } })
              await api('capture', { text: text || '图片记录', images, surfaceId, requestId })
            }
            setCaptureImages([])
          }
          rememberCapture(raw || '图片记录')
          setCaptureText('')
          bumpContent(); refresh()
        } catch (err) {
          if (surfaceId) await surfaceCommand('surface.update', { surfaceId, patch: { state: 'failed', title: '提交失败', body: err.message } }).catch(() => {})
          else setSurfaceError(err.message)
        } finally { captureSubmitting.current = false }
      }

      const stickySpawnPosition = () => {
        // 内容区就是滚动容器本身：已经去过头部和快捷录入，坐标直接用它的尺寸。
        const area = typeof document !== 'undefined' ? document.querySelector('.dsan-body') : null
        const vh = area?.clientHeight || (window.innerHeight || 800) / uiScale
        const vw = area?.clientWidth || (window.innerWidth || 1200) / uiScale
        const minY = Math.max(40, Math.round(vh * 0.3))
        const maxY = Math.max(minY + 20, Math.round(vh - 220))
        const y = minY + Math.round(Math.random() * Math.max(0, maxY - minY))
        const x = 40 + Math.round(Math.random() * Math.max(0, vw - 340))
        return { x, y }
      }

      const createHomeSticky = async () => {
        try {
          await api('sticky.create', stickySpawnPosition())
          refresh()
        } catch (err) { notifySurface({ title: '创建便笺失败', body: err.message }) }
      }

      const fabDown = (event) => {
        fabDrag.current = { startY: event.clientY, startBottom: fabBottom, nextBottom: fabBottom }
        fabMoved.current = false
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }
      const fabMove = (event) => {
        if (!fabDrag.current) return
        const dy = (event.clientY - fabDrag.current.startY) / uiScale
        if (Math.abs(dy) > 4) fabMoved.current = true
        const next = Math.max(70, Math.min((window.innerHeight || 800) / uiScale - 80, fabDrag.current.startBottom - dy))
        fabDrag.current.nextBottom = next
        setFabBottom(next)
      }
      const fabUp = () => {
        const drag = fabDrag.current
        fabDrag.current = null
        if (!fabMoved.current) return
        api('ui.save', { fabBottom: Math.round(drag?.nextBottom ?? fabBottom) }).catch(() => { })
      }

      const createPageSticky = async () => {
        try {
          const created = await api('sticky.create', { x: 120, y: 120, w: 300, h: 220 })
          setPageSticky(created.sticky)
          refresh()
        } catch (err) { notifySurface({ title: '创建便笺失败', body: err.message }) }
      }

      if (!state) return h('div', { className: 'dsan' }, styleTag(), h('div', { className: 'dsan-empty' }, '正在打开随记…'))
      if (state.configured === false) return h('div', { className: 'dsan' }, styleTag(), h(Setup, { ctx, onDone: refresh, notifySurface }))

      const openNotebook = (name) => go({ kind: 'notebook', name })
      const openNote = (path) => go({ kind: 'note', path })
      const openDiary = () => go({ kind: 'diary' })
      const openDiaryDoc = (doc, date, heading) => go({ kind: 'diaryDoc', doc, date, heading })

      let content = null
      if (view.kind === 'home') {
        content = h(HomeView, {
          state, refresh, notifySurface, todoOpen, hiddenStickies, privacyMode,
          onPrivacyModeChange: (next) => {
            setPrivacyMode(next)
            api('ui.save', { privacyMode: next }).catch(() => { })
          },
          onOpenNotebook: openNotebook,
          onOpenDiary: openDiary,
          onNewNotebook: () => setModal({ kind: 'newNotebook' }),
        })
      } else if (view.kind === 'notebook') {
        content = h(NotebookView, {
          state, name: view.name, refresh, notifySurface, nonce: contentNonce,
          onBack: () => go({ kind: 'home' }),
          onOpenNote: openNote,
          onEdit: (notebook) => setModal({ kind: 'editNotebook', notebook }),
        })
      } else if (view.kind === 'note') {
        content = h(NoteView, {
          state, path: view.path, refresh, notifySurface, nonce: contentNonce,
          onBack: () => { const nb = view.path.split('/')[0]; go({ kind: 'notebook', name: nb }) },
          onOpenNote: openNote,
        })
      } else if (view.kind === 'diary') {
        content = h(DiaryView, {
          state, notifySurface,
          onOpenDoc: (doc, date, heading) => { if (!doc) { refresh(); return } openDiaryDoc(doc, date, heading) },
          onSettings: () => setDiarySettings(true),
        })
      } else if (view.kind === 'diaryDoc') {
        content = h(DiaryDocView, {
          state, doc: view.doc, date: view.date, heading: view.heading, refresh, notifySurface, nonce: contentNonce,
          onBack: () => go({ kind: 'diary' }),
          onOpenNote: openNote,
        })
      }

      let pageBg = ''
      if (view.kind === 'home') pageBg = state.homeBackground ? assetUrl(state.homeBackground) : pluginAsset('earth-hero.webp')
      else if (view.kind === 'notebook') {
        const cover = state.notebooks.find((n) => n.name === view.name)?.cover || ''
        pageBg = cover ? assetUrl(cover) : ''
      } else if (view.kind === 'note') {
        const cover = state.notebooks.find((n) => n.name === view.path.split('/')[0])?.cover || ''
        pageBg = cover ? assetUrl(cover) : ''
      } else if (view.kind === 'diary' || view.kind === 'diaryDoc') pageBg = state.diaryCover ? assetUrl(state.diaryCover) : ''

      const pinnedSticky = (state.stickies || []).find((sticky) => sticky.pinned)
      const floatingSticky = pageSticky || (view.kind !== 'home' && !pageMinSticky && pinnedSticky
        ? { ...pinnedSticky, minimized: false }
        : null)

      const trail = []
      if (view.kind === 'notebook') {
        trail.push({ label: '首页', onClick: () => go({ kind: 'home' }) }, { label: view.name })
      } else if (view.kind === 'note') {
        const parts = view.path.split('/')
        const book = parts[0]
        const title = parts.slice(1).join('/').replace(/\.md$/, '')
        trail.push(
          { label: '首页', onClick: () => go({ kind: 'home' }) },
          { label: book, onClick: () => go({ kind: 'notebook', name: book }) },
          { label: title },
        )
      } else if (view.kind === 'diary') {
        trail.push({ label: '首页', onClick: () => go({ kind: 'home' }) }, { label: '日记' })
      } else if (view.kind === 'diaryDoc') {
        trail.push(
          { label: '首页', onClick: () => go({ kind: 'home' }) },
          { label: '日记', onClick: () => go({ kind: 'diary' }) },
          { label: view.date },
        )
      }

      const goBack = () => {
        if (view.kind === 'note') go({ kind: 'notebook', name: view.path.split('/')[0] })
        else if (view.kind === 'notebook') go({ kind: 'home' })
        else if (view.kind === 'diaryDoc') go({ kind: 'diary' })
        else go({ kind: 'home' })
      }

      const gear = h(GearIcon, { size: 14, strokeWidth: 2.4 })

      const stickyTransparencyValue = Number.isFinite(Number(state.settings?.stickyTransparency))
        ? Number(state.settings.stickyTransparency)
        : (Number.isFinite(Number(state.settings?.stickyOpacity)) ? 100 - Number(state.settings.stickyOpacity) : 55)
      const todoTransparencyValue = Number.isFinite(Number(state.settings?.todoTransparency)) ? Number(state.settings.todoTransparency) : 36
      const uiScale = uiScaleFactor(state)
      return h('div', {
        className: 'dsan',
        style: {
          '--dsan-sticky-opacity': `${100 - Math.max(0, Math.min(100, stickyTransparencyValue))}%`,
          '--dsan-todo-opacity': `${100 - Math.max(0, Math.min(100, todoTransparencyValue))}%`,
          '--dsan-zoom': String(uiScale),
          zoom: String(uiScale),
        },
      },
        styleTag(),
        pageBg ? h('div', { className: 'dsan-page-bg', style: { backgroundImage: `url(${pageBg})` } }) : null,
        h('div', { className: 'dsan-head' },
          h('div', { className: 'dsan-brand', onClick: () => go({ kind: 'home' }) }, h(Icon, { size: 18 }), '随记'),
          h('span', { className: 'sp' }),
          state.settings?.showAgentSessions === true ? h('button', {
            className: 'dsan-btn ghost dsan-icon-btn', title: 'agent 会话', 'aria-label': 'agent 会话',
            onClick: openAgentSessions,
          }, h(ChatIcon, { size: 19, strokeWidth: 1.7 })) : null,
          h('button', {
            className: 'dsan-btn ghost dsan-icon-btn', title: '重新加载插件页面', 'aria-label': '重新加载插件页面',
            onClick: () => onReload?.(),
          }, h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
            h('path', { d: 'M21 12a9 9 0 1 1-2.64-6.36' }),
            h('path', { d: 'M21 3v6h-6' }))),
          h('button', { className: 'dsan-btn ghost dsan-icon-btn', title: '设置', 'aria-label': '设置', onClick: () => setSettings(true) }, gear)),
        h('div', {
          className: 'dsan-capture',
          onDragOver: (event) => { event.preventDefault() },
          onDrop: (event) => {
            event.preventDefault()
            addCaptureFiles(event.dataTransfer?.files)
          },
        },
          h('div', { className: 'dsan-capture-row' },
            h('div', { className: 'dsan-capture-field' },
            h('textarea', {
              ref: captureRef,
              className: cls('dsan-capture-input', captureFocused && 'open'),
              value: captureText,
              rows: 1,
              onFocus: () => setCaptureFocused(true),
              onBlur: () => setCaptureFocused(false),
              onChange: (event) => setCaptureText(event.target.value),
              onPaste: (event) => {
                const files = []
                for (const item of event.clipboardData?.items || []) {
                  if (!item.type || !item.type.startsWith('image/')) continue
                  const file = item.getAsFile()
                  if (file) files.push(file)
                }
                if (files.length) {
                  event.preventDefault()
                  addCaptureFiles(files)
                }
              },
              onKeyDown: (event) => {
                if (event.nativeEvent.isComposing) return
                if (slashChoices.length) {
                  const count = slashChoices.length
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    setSlashIndex((slashActive + 1) % count)
                    return
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    setSlashIndex((slashActive - 1 + count) % count)
                    return
                  }
                  if (event.key === 'Enter' || event.key === 'Tab' || event.key === ' ') {
                    event.preventDefault()
                    setCaptureText(`/${slashChoices[slashActive].name} `)
                    setSlashIndex(0)
                    return
                  }
                }
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submitCapture()
                  return
                }
                const el = event.currentTarget
                if (event.shiftKey || el.selectionStart !== el.selectionEnd) return
                if (event.key === 'ArrowUp' && !el.value.slice(0, el.selectionStart).includes('\n') && captureHistory.length) {
                  const nextIndex = historyIndex < 0 ? 0 : Math.min(captureHistory.length - 1, historyIndex + 1)
                  if (nextIndex === historyIndex) return
                  if (historyIndex < 0) historyDraft.current = el.value
                  event.preventDefault()
                  setHistoryIndex(nextIndex)
                  setCaptureText(captureHistory[nextIndex])
                  setTimeout(() => { el.selectionStart = el.selectionEnd = el.value.length }, 0)
                } else if (event.key === 'ArrowDown' && !el.value.slice(el.selectionEnd).includes('\n') && historyIndex >= 0) {
                  event.preventDefault()
                  const nextIndex = historyIndex - 1
                  setHistoryIndex(nextIndex)
                  setCaptureText(nextIndex < 0 ? historyDraft.current : captureHistory[nextIndex])
                  setTimeout(() => { el.selectionStart = el.selectionEnd = el.value.length }, 0)
                }
              },
            }),
            captureText ? null : h('div', {
              className: 'dsan-capture-ph',
              title: '随手记一条，回车存档；可拖入或粘贴图片；输入 / 打开命令列表：/memo 便笺、/todo 待办、/note 笔记、/agent 让 AI 整理',
            }, '随手记一条，回车存档；可粘贴图片；输入 / 查看命令')),
            h('button', { className: 'dsan-btn primary', onClick: submitCapture }, '随记')),
          slashChoices.length ? h('div', { className: 'dsan-slash-menu' },
            slashChoices.map((cmd, index) => h('button', {
              key: cmd.name, type: 'button', className: cls('dsan-slash-item', index === slashActive && 'active'),
              onMouseEnter: () => setSlashIndex(index),
              onMouseDown: (event) => event.preventDefault(),
              onClick: () => { setCaptureText(`/${cmd.name} `); captureRef.current?.focus() },
            },
              h('span', { className: 'nm' }, `/${cmd.name}`),
              h('span', { className: 'ds' }, cmd.desc)))) : null,
          surfaceError ? h('div', { className: 'dsan-set-hint', role: 'status' }, `提示同步暂不可用，正在重试。${surfaceError}`) : null,
          captureImages.length ? h('div', { className: 'dsan-attachments' },
            captureImages.map((image, index) => h('div', {
              key: image.id, className: 'dsan-attachment', title: image.name,
              onClick: () => setPreviewImage(image),
            },
              h('img', { src: image.dataUrl, alt: `第${index + 1}张图` }),
              h('span', { className: 'num' }, index + 1),
              h('button', {
                className: 'rm', title: '移除这张图', 'aria-label': '移除这张图',
                onClick: (event) => { event.stopPropagation(); setCaptureImages((prev) => prev.filter((item) => item.id !== image.id)) },
              }, '×')))) : null),
        view.kind !== 'home' ? h('div', { className: 'dsan-subbar' },
          h('button', { className: 'dsan-back', onClick: goBack, title: '返回' }, '‹ 返回'),
          trail.length ? h('div', { className: 'dsan-crumb' }, trail.map((item, index) => h('span', {
            key: index, style: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 },
          },
            index > 0 ? h('span', { className: 'sep' }, '/') : null,
            item.onClick
              ? h('a', { onClick: item.onClick }, item.label)
              : h('span', { className: 'cur' }, item.label)))) : null) : null,
        h('div', { className: 'dsan-content-area', ref: contentAreaRef },
          h('div', { className: 'dsan-body' }, content),
          h('div', { className: 'dsan-surface-stack', ref: surfaceStackRef },
            surfaces.map((surface) => h(SurfaceCard, { key: surface.id, surface,
              compact: surfaces.some((item) => item.size === 'large') && surface.size !== 'large',
              command: surfaceCommand, onAction: actOnSurface })))),
        (view.kind === 'home' && state.configured !== false) ? h('div', { className: 'dsan-todo-dock', style: { top: captureFocused ? 144 : 104 } },
          h(TodoCard, {
            todo: state.todo, onSave: refresh, expanded: todoOpen, onExpandChange: setTodoOpen,
            hideDone: todoHideDone, notifySurface,
            onReminderCreated: notifyReminderCreated,
            onHideDoneChange: (next) => {
              setTodoHideDone(next)
              api('ui.save', { todoHideDone: next }).catch(() => { })
            },
          })) : null,
        (view.kind === 'home' || (!floatingSticky && !pageMinSticky)) ? h('button', {
          className: 'dsan-fab', title: '新建便笺（可上下拖动）', style: { bottom: `${fabBottom}px` },
          onPointerDown: fabDown, onPointerMove: fabMove, onPointerUp: fabUp,
          onClick: () => {
            if (fabMoved.current) { fabMoved.current = false; return }
            if (view.kind === 'home') createHomeSticky()
            else createPageSticky()
          },
        }, '＋ 便笺') : null,
        (view.kind !== 'home' && !floatingSticky && pageMinSticky) ? h('button', {
          className: 'dsan-fab dsan-fab-min', title: '展开便笺（可上下拖动）', style: { bottom: `${fabBottom}px` },
          onPointerDown: fabDown, onPointerMove: fabMove, onPointerUp: fabUp,
          onClick: async () => {
            if (fabMoved.current) { fabMoved.current = false; return }
            try {
              await api('sticky.save', { id: pageMinSticky.id, minimized: false })
              const next = await refresh()
              const found = (next?.stickies || []).find((s) => s.id === pageMinSticky.id)
              setPageSticky(found || { ...pageMinSticky, minimized: false })
              setPageMinSticky(null)
            } catch { /* ignore */ }
          },
        }, '便笺') : null,
        (view.kind !== 'home' && floatingSticky) ? h('div', { className: 'dsan-float' },
          h(StickyCard, {
            sticky: { ...floatingSticky, minimized: false }, floating: true,
            onSave: refresh,
            onDelete: (id) => { api('sticky.delete', { id }).then(() => { setPageSticky(null); refresh() }).catch(() => { }) },
            onLayout: () => { },
            onItems: (nextItems) => setPageSticky((prev) => (prev ? { ...prev, items: nextItems } : prev)),
            onMinimize: () => {
              api('sticky.save', { id: floatingSticky.id, minimized: true }).then(() => { setPageMinSticky(floatingSticky); setPageSticky(null) })
            },
            scale: uiScale,
          })) : null,
        dueReminders.length ? h('div', { className: 'dsan-reminder-stack' },
          dueReminders.map((reminder) => h(ReminderCard, {
            key: reminder.key, item: reminder,
            background: state.homeBackground ? assetUrl(state.homeBackground) : pluginAsset('earth-hero.webp'),
            onClose: () => closeReminderCard(reminder),
            onAutoClose: () => closeReminderCard(reminder),
            onStopPeriodic: () => stopPeriodicReminder(reminder),
          }))) : null,
        modal?.kind === 'newNotebook' ? h(NotebookModal, { onClose: () => setModal(null), notifySurface, refresh, scale: uiScale }) : null,
        modal?.kind === 'editNotebook' ? h(NotebookModal, {
          initial: modal.notebook,
          onClose: () => setModal(null),
          onSaved: (notebook) => { if (notebook?.name) setView({ kind: 'notebook', name: notebook.name }); refresh() },
          onDeleted: () => { setModal(null); setView({ kind: 'home' }); refresh() },
          notifySurface,
          scale: uiScale,
        }) : null,
        agentSessionOpen ? h(Modal, { title: 'agent 会话', wide: true, onClose: () => setAgentSessionOpen(false) },
          h('div', { style: { display: 'flex', gap: 12, minHeight: 240 } },
            h('div', { style: { width: 230, flex: 'none', minWidth: 0, borderRight: '1px solid var(--dsw-alias-border-l2)', paddingRight: 10, overflowY: 'auto', overflowX: 'hidden', maxHeight: 'calc(62vh / var(--dsan-zoom, 1))' } },
              ...(agentSessionList.length ? agentSessionList.map((session) => h('button', {
                key: session.id, type: 'button', className: 'dsan-btn small',
                style: { display: 'block', width: '100%', maxWidth: '100%', boxSizing: 'border-box', height: 'auto', minHeight: 0, padding: '8px 10px', lineHeight: 1.35, textAlign: 'left', marginBottom: 8, opacity: agentSessionDetail?.id === session.id ? 1 : .72, overflow: 'hidden' },
                onClick: () => openAgentSession(session),
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 } },
                  h('div', { style: { fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 } }, fmtReminderTime(session.updatedAt) || '未知时间'),
                  h('span', { title: session.status || 'unknown', style: { width: 7, height: 7, borderRadius: '50%', flex: 'none', background: session.status === 'done' ? '#3fb950' : session.status === 'running' ? '#58a6ff' : session.status === 'waiting' ? '#d29922' : session.status === 'error' ? '#f85149' : '#8b949e' } })),
                h('div', { style: { fontSize: 10, opacity: .45, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, String(session.title || '未命名会话').split(/\r?\n/)[0].replace(/^\/agent\s*/, '').trim() || '未命名会话'),
                session.preview ? h('div', { style: { fontSize: 10, opacity: .62, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, session.preview) : null)) : [h('div', { className: 'dsan-set-hint' }, '还没有 agent 会话')])),
            h('div', { style: { flex: 1, overflow: 'auto', maxHeight: 'calc(62vh / var(--dsan-zoom, 1))' } },
              agentSessionDetail ? [
                h('div', { style: { fontWeight: 600, marginBottom: 8 } }, agentSessionDetail.args?.instruction || 'agent 会话'),
                h('div', { className: 'dsan-set-hint', style: { marginBottom: 10 } }, `状态：${agentSessionDetail.status || ''} · 更新：${String(agentSessionDetail.updatedAt || '').slice(0, 19).replace('T', ' ')}`),
                ...(agentSessionDetail.turns || []).map((turn, index) => h('div', { key: turn.id || index, style: { borderTop: '1px solid var(--dsw-alias-border-l2)', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 6 } },
                  h('div', { style: { fontSize: 11, opacity: .5 } }, `第 ${index + 1} 轮 · ${turn.status || ''}${turn.endedAt ? ` · ${fmtReminderTime(turn.endedAt) || ''}` : ''}`),
                  h('div', { style: { whiteSpace: 'pre-wrap' } }, h('b', { style: { color: 'var(--dsw-alias-label-secondary)', marginRight: 6 } }, '你'), turn.input || ''),
                  turn.question ? h('div', { style: { whiteSpace: 'pre-wrap' } },
                    h('b', { style: { color: 'var(--dsw-alias-brand-primary)', marginRight: 6 } }, '助手'),
                    typeof turn.question === 'string' ? turn.question : String(turn.question?.text || turn.question?.question || ''),
                    Array.isArray(turn.options) && turn.options.length
                      ? h('div', { style: { fontSize: 11, opacity: .6, marginTop: 2 } }, `选项：${turn.options.map((option) => option.label).join(' / ')}`)
                      : null) : null,
                  turn.answer ? h('div', { style: { whiteSpace: 'pre-wrap' } }, h('b', { style: { color: 'var(--dsw-alias-label-secondary)', marginRight: 6 } }, '你'), turn.answer.text || turn.answer.label || '') : null,
                  turn.reply ? h('div', { style: { whiteSpace: 'pre-wrap' } }, h('b', { style: { color: 'var(--dsw-alias-brand-primary)', marginRight: 6 } }, '助手'), turn.reply) : null,
                  Array.isArray(turn.tools) && turn.tools.length
                    ? h('div', { style: { fontSize: 10.5, opacity: .5, lineHeight: 1.5 } }, `工具：${turn.tools.map((tool) => `${tool.name}${tool.target ? `(${tool.target})` : ''}${tool.ok === false ? ' 失败' : ''}`).join(' · ')}`)
                    : null)),
                agentSessionDetail.status === 'waiting' && (agentSessionDetail.surfaces || []).some((surface) => surface.status === 'waiting') ? h('button', {
                  type: 'button', className: 'dsan-btn', style: { marginTop: 12 },
                  onClick: () => {
                    refreshSurfaces().catch(() => {})
                    setAgentSessionOpen(false)
                  },
                }, '继续这个会话') : null,
              ] : h('div', { className: 'dsan-set-hint' }, '选择左侧会话查看轮次')),
          )) : null,
        settings ? h(SettingsModal, { state, ctx, notifySurface, onClose: () => setSettings(false), refresh, onRootChanged: () => { setSurfaceQueue([]); go({ kind: 'home' }) } }) : null,
        diarySettings ? h(DiaryCoverModal, { state, notifySurface, refresh, onClose: () => setDiarySettings(false) }) : null,
)
    }

    // ------------------------------------------------------------------ 注册

    function SidebarIcon(props) {
      const size = props?.size || 18
      return h('span', { style: { display: 'inline-flex', color: props?.active ? 'var(--dsw-alias-brand-primary)' : 'currentColor' } }, h(Icon, { size }))
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'dsh-agentic-notes',
          order: 20,
          label: '随记',
        }, SidebarIcon))
        function Main(props) {
          const [nonce, setNonce] = useState(0)
          return h(AppErrorBoundary, null, h(App, {
            key: nonce,
            ctx,
            ...props,
            onReload: () => setNonce((value) => value + 1),
          }))
        }
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'dsh-agentic-notes',
        }, Main))
      },
    }
  },
})

/**
 * 随记（dsh-agentic-notes）客户端半边。
 * 一个页面：首页 / 笔记本 / 笔记 / 日记日历 / 日记文档。
 */

window.__ModuleLoader__.load({
  id: 'dsh-agentic-notes',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useMemo, useCallback } = React

    const API = '/dsh-agentic-notes/api'
    const IMG = '/dsh-agentic-notes/img'
    const SOUND = '/dsh-agentic-notes/sound'
    const ASSET = '/dsh-agentic-notes/asset'
    const STICKY_COLORS = ['#fff7d6', '#e4f8ef', '#ffd3e2', '#ded1ff', '#d0e7ff', '#ffdfc2']

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
.dsan-capture{display:flex;flex-direction:column;gap:6px;padding:6px 22px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;position:relative;z-index:2}
.dsan-capture-row{display:flex;align-items:flex-end;gap:8px;min-width:0}
.dsan-capture-row .dsan-capture-input{flex:1;min-width:0}
.dsan-attachments{display:flex;flex-wrap:wrap;gap:6px;padding:8px 8px 0 0}
.dsan-attachment{position:relative;width:42px;height:42px;margin:0 6px 6px 0;overflow:visible}
.dsan-attachment img{width:100%;height:100%;object-fit:cover;display:block;border-radius:7px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.dsan-surface-stack{position:fixed;right:14px;bottom:14px;z-index:90;display:flex;flex-direction:column;gap:14px;align-items:flex-end;padding:8px;background:transparent;overflow:visible;isolation:isolate}
.dsan-surface-toast{position:relative;right:auto;bottom:auto;z-index:0;width:360px;max-width:calc(100vw - 44px);background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:11px;box-shadow:0 4px 14px -2px rgba(0,0,0,.18);padding:13px}
.dsan-surface-toast .x{position:absolute;bottom:8px;right:8px;width:24px;height:24px;border:none;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:19px;line-height:1;border-radius:6px}
.dsan-progress-row{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:5px}
.dsan-surface-progress .dsan-progress-row{position:absolute;top:12px;right:12px;margin:0}
.dsan-surface-progress .tt{padding-right:56px}
.dsan-spinner{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:dsan-pulse 1s ease-in-out infinite}
@keyframes dsan-pulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
.dsan-surface-toast .tt{font-weight:600;font-size:13px}
.dsan-surface-toast .tb{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:5px;white-space:pre-wrap;max-height:160px;overflow:auto}
.dsan-surface-toast .ta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;padding-right:30px}
.dsan-settings-hero{display:flex;justify-content:center;padding:4px 0 20px;margin-bottom:16px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsan-settings-avatar-shell{position:relative;width:152px;height:152px;background:transparent}
.dsan-settings-avatar-wrap{position:relative;width:152px;height:152px;border-radius:50%;overflow:hidden;background:transparent;border:1px solid var(--dsw-alias-border-l2);box-shadow:0 0 0 4px var(--dsw-alias-bg-overlay),0 0 0 5px color-mix(in srgb, var(--dsw-alias-border-l2) 78%, var(--dsw-alias-label-secondary))}
.dsan-settings-avatar{width:100%;height:100%;aspect-ratio:1;border-radius:50%;object-fit:cover;display:block;background:transparent}
.dsan-settings-ver{position:absolute;left:calc(100% + 12px);bottom:8px;padding:0;border:none;background:transparent;font-size:12px;line-height:1.35;font-weight:500;color:var(--dsw-alias-label-primary);white-space:nowrap}
.dsan-agent-prev{max-height:32vh;overflow:auto;white-space:pre-wrap;line-height:1.55;font-size:13px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px 12px;margin-bottom:12px}
.dsan-preview-body{display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.18);min-height:160px}
.dsan-preview-img{display:block;max-width:100%;max-height:72vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.22)}
.dsan-attachment .num{position:absolute;left:2px;bottom:2px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:rgba(0,0,0,.65);color:#fff;font-size:10px;line-height:16px;text-align:center;font-weight:600}
.dsan-attachment .rm{position:absolute;right:-8px;top:-8px;width:16px;height:16px;border:1px solid var(--dsw-alias-bg-base);border-radius:50%;background:rgba(0,0,0,.78);color:#fff;font-size:12px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:2}
.dsan-capture-input{flex:1;min-width:0;height:38px;min-height:38px;max-height:40vh;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:transparent;padding:8px 12px;color:inherit;outline:none;font:inherit;line-height:1.5;resize:none;transition:height .18s ease}
.dsan-capture-input.open{height:78px}
.dsan-capture-input:focus{border-color:var(--dsw-alias-brand-primary)}
.dsan-subbar{display:flex;align-items:center;gap:8px;padding:5px 22px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;font-size:12px;color:var(--dsw-alias-label-secondary);position:relative;z-index:2}
.dsan-capture .dsan-btn.primary{height:38px;border-radius:9px;padding:0 14px}
.dsan-subbar .t{color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsan-brand{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;white-space:nowrap;cursor:pointer}
.dsan-brand svg{width:18px;height:18px;color:var(--dsw-alias-brand-primary)}
.dsan-cap{flex:1;display:flex;gap:8px;min-width:0}
.dsan-cap textarea{flex:1;min-width:0;height:72px;min-height:72px;max-height:40vh;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);padding:8px 12px;color:inherit;outline:none;font:inherit;line-height:1.5;resize:vertical}
.dsan-cap textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.dsan-back{height:30px;padding:0 8px;border:none;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;border-radius:7px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
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
.dsan-body{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;position:relative;z-index:1}
.dsan-btn{height:30px;padding:0 11px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.dsan-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.dsan-btn.primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.dsan-btn.danger{background:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);color:#fff}
.dsan-btn.danger:hover{background:var(--dsw-alias-state-error-primary);filter:brightness(.94)}
.dsan-btn.ghost{border-color:transparent}
.dsan-btn.small{height:24px;padding:0 8px;font-size:12px;border-radius:6px}
.dsan-btn:disabled{opacity:.5;cursor:default}
.dsan-icon-btn{width:30px;height:30px;padding:0;justify-content:center}
.dsan-crumb{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:12px;min-width:0}
.dsan-crumb a{color:inherit;cursor:pointer;text-decoration:none}
.dsan-crumb a:hover{color:var(--dsw-alias-label-primary)}
.dsan-crumb .sep{opacity:.5}
.dsan-crumb .cur{color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
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
.dsan-note-head{display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap}
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
.dsan-editor{width:100%;min-height:60vh;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:12.5px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;padding:14px 16px;outline:none;resize:vertical}
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
.dsan-todo{position:sticky;top:12px;width:100%;box-shadow:0 12px 32px rgba(0,0,0,.2);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) var(--dsan-todo-opacity, 100%), transparent);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 140px)}
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
.dsan-sticky-layer{position:absolute;inset:0;pointer-events:none;z-index:10}
.dsan-sticky{position:absolute;pointer-events:auto;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.16);display:flex;flex-direction:column;min-width:180px;min-height:110px;overflow:hidden;transition:box-shadow .15s}
.dsan-sticky.colored{background:color-mix(in srgb, var(--dsan-sticky-tint) var(--dsan-sticky-opacity, 45%), transparent)}
.dsan-sticky.colored:focus-within{background:var(--dsan-sticky-tint)}
.dsan-sticky:focus{outline:none}
.dsan-sticky:not(.colored){background:color-mix(in srgb, var(--dsw-alias-bg-overlay) var(--dsan-sticky-opacity, 45%), transparent)}
.dsan-sticky:not(.colored):focus-within{background:var(--dsw-alias-bg-overlay)}
.dsan-sticky-head{display:flex;align-items:center;gap:6px;padding:6px 8px;cursor:grab;background:var(--dsw-alias-bg-layer-2);font-size:11px;color:var(--dsw-alias-label-secondary);user-select:none}
.dsan-sticky-head .sp{flex:1}
.dsan-sticky-head:focus{outline:none}
.dsan-sticky-body{flex:1;overflow:auto;scrollbar-gutter:stable;padding:4px 8px 8px}
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
.dsan-float{position:fixed;right:18px;top:46%;width:318px;z-index:60}
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
.dsan-reminder-stack{position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:10px;width:320px;max-width:calc(100vw - 32px)}
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
.dsan-toasts{position:fixed;right:22px;bottom:22px;display:flex;flex-direction:column;gap:10px;z-index:80;width:360px;max-width:calc(100vw - 44px)}
.dsan-toast{background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:11px;box-shadow:0 12px 34px rgba(0,0,0,.22);padding:12px 13px;position:relative;animation:dsan-in .16s ease-out}
@keyframes dsan-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.dsan-toast .tt{font-weight:600;font-size:12.5px;padding-right:4px}
.dsan-toast .tb{color:var(--dsw-alias-label-secondary);font-size:12px;margin-top:3px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:160px;overflow:auto}
.dsan-toast-foot{display:flex;align-items:flex-end;gap:8px;margin-top:9px}
.dsan-toast .ta{display:flex;gap:8px;flex-wrap:wrap;flex:1;min-width:0}
.dsan-toast-foot .sp{flex:1}
.dsan-toast .x{position:static;flex:none;margin-left:auto;align-self:flex-end;width:24px;height:24px;border:none;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:19px;line-height:1;display:inline-flex;align-items:center;justify-content:center;border-radius:6px}
.dsan-toast .x:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsan-overlay{position:fixed;inset:0;background:rgba(0,0,0,.34);display:flex;align-items:center;justify-content:center;z-index:90;padding:24px}
.dsan-modal{background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.28);width:min(560px,100%);max-height:88vh;display:flex;flex-direction:column;overflow:hidden}
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
.dsan-field label{display:block;font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:5px}
.dsan-field input,.dsan-field textarea,.dsan-field select{width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:inherit;padding:7px 10px;font:inherit;outline:none}
.dsan-field input[type=checkbox],.dsan-field input[type=radio]{width:auto;height:auto;padding:0;margin:0;border:0;background:transparent;border-radius:0;flex:none;accent-color:var(--dsw-alias-brand-primary)}
.dsan-field textarea{min-height:70px;resize:vertical}
.dsan-panes{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dsan-pane{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px;max-height:44vh;overflow:auto;font:12px/1.6 ui-monospace,Menlo,monospace;white-space:pre-wrap}
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
        const saved = Number.parseInt(localStorage.getItem('dsan.fab.top.v2') || '', 10)
        if (Number.isFinite(saved)) out.fabTop = saved
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

    function readSavedToasts() {
      try {
        const saved = JSON.parse(localStorage.getItem('dsan.toasts.v2') || 'null')
        if (!saved || !Array.isArray(saved.toasts) || Date.now() - Number(saved.savedAt || 0) > 30 * 60 * 1000) return []
        return saved.toasts.filter((toast) => toast && toast.title).slice(-3).map((toast) => ({
          id: String(toast.id || `restored-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`),
          title: String(toast.title || ''),
          body: String(toast.body || ''),
          auto: false,
        }))
      } catch { return [] }
    }

    function saveToasts(toasts) {
      try {
        const keep = (toasts || []).filter((toast) => !String(toast.key || '').startsWith('agentjob:')).slice(-3).map((toast) => ({
          id: toast.id, title: toast.title, body: toast.body,
        }))
        localStorage.setItem('dsan.toasts.v2', JSON.stringify({ savedAt: Date.now(), toasts: keep }))
      } catch { /* ignore */ }
    }

    function readSavedAgentThread() {
      try {
        const saved = JSON.parse(localStorage.getItem('dsan.agent.thread.v1') || 'null')
        if (!saved || !saved.at || Date.now() - Number(saved.at) > 24 * 60 * 60 * 1000) return null
        if (!saved.reply) return null
        return {
          instruction: String(saved.instruction || ''),
          reply: String(saved.reply || '').slice(0, 20000),
          history: Array.isArray(saved.history) ? saved.history.slice(-8) : [],
        }
      } catch { return null }
    }

    let liveSurfaces = []
    let liveRoot = ''
    const liveSurfaceListeners = new Set()
    function publishLiveSurfaces(next) {
      liveSurfaces = next
      for (const listener of liveSurfaceListeners) { try { listener(next) } catch { /* ignore */ } }
    }
    function unsafeSurface(surface) {
      return /DSML|dangerouslyDisableSandbox|<invoke|<\|/.test(String(surface?.body || '') + String(surface?.title || ''))
    }
    function forgetSavedSurface(id) {
      try {
        const raw = JSON.parse(localStorage.getItem('dsan-agent-surfaces') || '[]')
        localStorage.setItem('dsan-agent-surfaces', JSON.stringify((Array.isArray(raw) ? raw : []).filter((item) => item?.id !== id)))
      } catch { /* ignore */ }
    }
    function readSavedSurfaces() {
      try {
        const raw = JSON.parse(localStorage.getItem('dsan-agent-surfaces') || '[]')
        return Array.isArray(raw) ? raw.filter((item) => item && typeof item === 'object' && !unsafeSurface(item) && !['closed', 'answered', 'cancelled', 'expired'].includes(item.status)) : []
      } catch { return [] }
    }
    function saveSurfaces(surfaces) {
      try {
        localStorage.setItem('dsan-agent-surfaces', JSON.stringify((surfaces || []).filter((item) => !unsafeSurface(item) && !['closed', 'answered', 'cancelled', 'expired'].includes(item.status)).map(({ onSurfaceAction, ...rest }) => ({ ...rest, root: liveRoot })).slice(-8)))
      } catch { /* ignore */ }
    }
    function saveAgentThread(thread) {
      try {
        if (!thread?.reply) { localStorage.removeItem('dsan.agent.thread.v1'); return }
        localStorage.setItem('dsan.agent.thread.v1', JSON.stringify({
          instruction: thread.instruction || '',
          reply: String(thread.reply || '').slice(0, 20000),
          history: Array.isArray(thread.history) ? thread.history.slice(-8) : [],
          at: Date.now(),
        }))
      } catch { /* ignore */ }
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

    function ChatIcon({ size = 17 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9.5 9.5 0 0 1-3.2-.6L3 21l1.7-4.8A8.4 8.4 0 1 1 21 11.5z' }),
        h('path', { d: 'M8 10h8M8 14h5' }))
    }

    function GearIcon({ size = 14 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('circle', { cx: 12, cy: 12, r: 3.1 }),
        h('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' }))
    }

    function Modal({ title, children, footer, onClose, wide, bodyClass }) {
      useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose?.() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      return h('div', { className: 'dsan-overlay', onMouseDown: (event) => { if (event.target === event.currentTarget) onClose?.() } },
        h('div', { className: cls('dsan-modal', wide && 'wide'), role: 'dialog', 'aria-modal': 'true' },
          h('div', { className: 'dsan-modal-head' }, title, h('span', { className: 'sp' }),
            h('button', { className: 'dsan-btn ghost dsan-icon-btn', onClick: onClose, 'aria-label': '关闭' }, '×')),
          h('div', { className: cls('dsan-modal-body', bodyClass) }, children),
          footer ? h('div', { className: 'dsan-modal-foot' }, footer) : null))
    }

    function Toasts({ items, dismiss }) {
      return h('div', { className: 'dsan-toasts' }, items.map((toast) => h('div', { key: toast.id, className: 'dsan-toast' },
        h('div', { className: 'tt' }, toast.title),
        toast.body ? h('div', { className: 'tb' }, toast.body) : null,
        h('div', { className: 'dsan-toast-foot' },
          toast.actions?.length ? h('div', { className: 'ta' }, toast.actions.map((action, idx) =>
            h('button', { key: idx, className: cls('dsan-btn small', action.primary && 'primary'), title: action.title || undefined, onClick: () => { dismiss(toast.id); action.onClick?.() } }, action.label))) : h('span', { className: 'sp' }),
          h('button', { className: 'x', onClick: () => { dismiss(toast.id); toast.onDismiss?.() }, 'aria-label': '关闭' }, '×')))))
    }

    function Field({ label, children }) {
      return h('div', { className: 'dsan-field' }, h('label', null, label), children)
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

    function StickyCard({ sticky, onSave, onDelete, onLayout, floating, onMinimize, canMinimize = true, onItems, onRaise }) {
      const [items, setItems] = useState(sticky.items || [])
      const [title, setTitle] = useState('')
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
      const boxRef = useRef(null)
      const itemsRef = useRef(sticky.items || [])
      const draftRef = useRef('')
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
        const draft = draftRef.current.trim()
        if (draft) latest.push(draft)
        if (latest.some((item) => String(item || '').trim())) {
          api('sticky.save', { id: sticky.id, items: latest }).catch(() => { })
        }
      }, [])

      useEffect(() => { onItems?.(items) }, [items])

      const flush = (next, extra = {}) => {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => { api('sticky.save', { id: sticky.id, items: next, ...extra }).catch(() => { }) }, 250)
      }

      const updateItem = (idx, value) => {
        const next = items.slice()
        next[idx] = value
        setItems(next)
        itemsRef.current = next
        flush(next)
      }
      const addItem = (value) => {
        if (!String(value || '').trim()) return
        const next = [...items, value]
        setItems(next)
        itemsRef.current = next
        draftRef.current = ''
        flush(next)
        setTitle('')
      }
      const removeItem = (idx) => {
        const next = items.filter((_, i) => i !== idx)
        setItems(next)
        itemsRef.current = next
        flush(next)
      }

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
          const dx = event.clientX - state.start.x
          const dy = event.clientY - state.start.y
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
      }, [onLayout, sticky.id, sticky.x, sticky.y, sticky.w, sticky.h])

      const tint = sticky.color || ''
      const colorStyle = tint ? { '--dsan-sticky-tint': tint, color: '#1f2430' } : {}
      const style = floating
        ? colorStyle
        : { ...colorStyle, left: `${sticky.x}px`, top: `${sticky.y}px`, width: `${sticky.w}px`, height: `${sticky.h}px`, zIndex: sticky.z || 1 }

      const pinIcon = h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M9 3h6l-1 8 3 3v2H7v-2l3-3-1-8z' }), h('path', { d: 'M12 16v5' }))

      return h('div', {
        className: cls('dsan-sticky', tint && 'colored'), style, ref: boxRef,
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
        h('div', { className: 'dsan-sticky-body', },
          items.map((item, idx) => h('div', { key: idx, className: 'dsan-sticky-item' },
            h('span', { className: 'dot' }, '•'),
            h('textarea', {
              value: item, rows: 1,
              onBlur: () => flush(items),
              onChange: (event) => updateItem(idx, event.target.value.replace(/\n/g, ' ')),
              onKeyDown: (event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  const next = items.slice()
                  next.splice(idx + 1, 0, '')
                  setItems(next)
                  flush(next)
                  const inputs = event.currentTarget.closest('.dsan-sticky-body')?.querySelectorAll('textarea')
                  setTimeout(() => inputs?.[idx + 1]?.focus(), 0)
                }
                if (event.key === 'Backspace' && !items[idx]) {
                  event.preventDefault()
                  removeItem(idx)
                }
              },
            }),
            h('button', { className: 'del', onClick: () => removeItem(idx), tabIndex: -1 }, '×'))),
          h('form', {
            onSubmit: (event) => { event.preventDefault(); addItem(title) },
          }, h('input', {
            value: title, placeholder: '加一条 · 回车',
            onBlur: () => { if (title.trim()) addItem(title) },
            onChange: (event) => { setTitle(event.target.value); draftRef.current = event.target.value },
            style: { width: '100%', border: 'none', background: 'transparent', color: 'inherit', font: 'inherit', outline: 'none', padding: '4px 0' },
          }))),
        floating ? null : ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((dir) =>
          h('div', { key: dir, className: `dsan-h dsan-h-${dir}`, onPointerDown: startResize(dir) })))
    }

    // ------------------------------------------------------------------ 待办

    function TodoCard({ todo, onSave, expanded = false, onExpandChange, hideDone = false, onHideDoneChange, onReminderCreated, pushToast }) {
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
            pushToast?.({ title: '待办没保存', body: err.message })
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

    function HomeView({ state, onOpenNotebook, onNewNotebook, onOpenDiary, refresh, pushToast, todoOpen, hiddenStickies = [], privacyMode = false, onPrivacyModeChange }) {
      const [dragState, setDragState] = useState({})
      const [zBump, setZBump] = useState({})
      const [dragNotebook, setDragNotebook] = useState(null)
      const [dropNotebook, setDropNotebook] = useState(null)
      const suppressCardClick = useRef(false)
      const layoutTimers = useRef({})
      const wrapRef = useRef(null)
      const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 })
      useEffect(() => {
        const el = wrapRef.current
        if (!el) return
        const update = () => setWrapSize({ w: el.clientWidth, h: el.clientHeight })
        update()
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
        observer?.observe(el)
        window.addEventListener('resize', update)
        return () => { observer?.disconnect(); window.removeEventListener('resize', update) }
      }, [])
      const stickies = (state.stickies || []).filter((sticky) => !hiddenStickies.includes(sticky.id)).map((sticky) => {
        const local = dragState[sticky.id] || {}
        const width = Number(local.w ?? sticky.w) || 260
        const height = Number(local.h ?? sticky.h) || 180
        let x = Number(local.x ?? sticky.x) || 0
        let y = Number(local.y ?? sticky.y) || 0
        if (wrapSize.w && wrapSize.h && Number.isFinite(sticky.right) && Number.isFinite(sticky.bottom)) {
          if (local.x === undefined) x = Math.max(0, wrapSize.w - Number(sticky.right) - width)
          if (local.y === undefined) y = Math.max(0, wrapSize.h - Number(sticky.bottom) - height)
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
        if (!wrapSize.w || !wrapSize.h) return
        for (const sticky of state.stickies || []) {
          if (Number.isFinite(sticky.right) && Number.isFinite(sticky.bottom)) continue
          if (migrated.current.has(sticky.id)) continue
          migrated.current.add(sticky.id)
          api('sticky.save', {
            id: sticky.id, w: sticky.w, h: sticky.h,
            right: Math.max(0, wrapSize.w - sticky.x - sticky.w),
            bottom: Math.max(0, wrapSize.h - sticky.y - sticky.h),
          }).then(() => refresh()).catch(() => { })
        }
      }, [wrapSize, state.stickies])

      const onLayout = (id, patch) => {
        setDragState((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
        if (layoutTimers.current[id]) clearTimeout(layoutTimers.current[id])
        layoutTimers.current[id] = setTimeout(() => {
          const base = stickies.find((item) => item.id === id) || {}
          const nextW = Number(patch.w ?? base.w) || 260
          const nextH = Number(patch.h ?? base.h) || 180
          const nextX = Number(patch.x ?? base.x) || 0
          const nextY = Number(patch.y ?? base.y) || 0
          const payload = (wrapSize.w && wrapSize.h)
            ? {
              w: nextW, h: nextH,
              right: Math.max(0, Math.round(wrapSize.w - nextX - nextW)),
              bottom: Math.max(0, Math.round(wrapSize.h - nextY - nextH)),
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
        api('notebook.reorder', { names }).then(() => refresh()).catch((err) => pushToast?.({ title: '排序没保存', body: err.message }))
      }

      const computeDrop = (event) => {
        if (!dragNotebook) return null
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
        const maxX = containerRect.width - 3
        return {
          name: best.name,
          side: best.side,
          lineX: Math.max(0, Math.min(maxX, gapCenter - containerRect.left - 1.5)),
          lineY: best.rect.top - containerRect.top,
          lineH: best.rect.height,
        }
      }

      const removeSticky = (id) => {
        api('sticky.delete', { id }).then(() => { refresh() }).catch((err) => pushToast?.({ title: '删除失败', body: err.message }))
      }
      const visibleNotebooks = privacyMode ? state.notebooks.filter((notebook) => notebook.private !== true) : state.notebooks
      return h('div', { className: 'dsan-home-wrap', ref: wrapRef },
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
          )),
        h('div', { className: 'dsan-sticky-layer' },
          stickies.map((sticky) => h(StickyCard, {
            key: sticky.id, sticky, floating: false, canMinimize: false,
            onSave: refresh, onDelete: removeSticky, onLayout, onRaise: raiseSticky,
          }))))
    }

    // ------------------------------------------------------------------ 笔记

    function NoteEditor({ note, onSaved, pushToast, onConflict, onDirty }) {
      const [body, setBody] = useState(note.body)
      const [status, setStatus] = useState('已保存')
      const timer = useRef(null)
      const mtime = useRef(note.mtimeMs)
      const latest = useRef(note.body)
      useEffect(() => { setBody(note.body); latest.current = note.body; mtime.current = note.mtimeMs }, [note.path, note.mtimeMs])
      const save = useCallback(async (text) => {
        setStatus('保存中')
        try {
          const res = await api('note.save', { path: note.path, content: text, mtimeMs: mtime.current })
          if (res.conflict) { onConflict?.(res.content); setStatus('有冲突'); return }
          mtime.current = new Date(res.updatedAt).getTime()
          setStatus('已保存')
          onSaved?.()
        } catch (err) {
          setStatus('保存失败')
          pushToast?.({ title: '保存失败', body: err.message })
        }
      }, [note.path])
      const onChange = (value) => {
        setBody(value)
        latest.current = value
        onDirty?.(value)
        setStatus('未保存')
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => save(value), 800)
      }
      useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); save(latest.current) } }, [])
      return h('div', null,
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
          h('span', { className: 'dsan-save' }, status),
          h('span', { className: 'dsan-save' }, '纯文本 · 停手自动保存')),
        h('textarea', { className: 'dsan-editor', value: body, onChange: (event) => onChange(event.target.value), spellCheck: false }))
    }

    function NoteView({ state, path, onBack, onOpenNote, pushToast, refresh, nonce }) {
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
        }).catch((err) => pushToast?.({ title: '打不开笔记', body: err.message }))
      }, [path, nonce, editing])
      if (!note) return h('div', { className: 'dsan-page' }, h('div', { className: 'dsan-empty' }, '正在打开…'))
      const openTarget = (target) => {
        const clean = target.replace(/^\.\//, '')
        if (clean.endsWith('.md')) {
          api('note.read', { path: clean }).then(() => onOpenNote(clean)).catch(() => pushToast?.({ title: '链接的目标不存在', body: clean }))
        } else {
          pushToast?.({ title: '只会打开笔记', body: clean })
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
            pushToast,
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
            onClick: () => api('note.rename', { path, title: newTitle }).then((res) => { setRenaming(false); onOpenNote(res.path) }).catch((err) => pushToast?.({ title: '改名失败', body: err.message })),
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
              pushToast?.({ title: '已移到废纸篓', actions: [{ label: '撤销', onClick: () => api('trash.restore', { trash: res.trash, target: path }).then(() => refresh?.()) }] })
            }).catch((err) => pushToast?.({ title: '删除失败', body: err.message })),
          }, '删除')],
        }, h('div', null, '会移到隐藏的废纸篓，可以撤销。')) : null)
    }

    // ------------------------------------------------------------------ 笔记本

    function NotebookView({ state, name, onBack, onOpenNote, onEdit, pushToast, refresh, nonce }) {
      const [notes, setNotes] = useState(null)
      const [dragNote, setDragNote] = useState(null)
      const [dropNote, setDropNote] = useState(null)
      const suppressNoteClick = useRef(false)
      const load = useCallback(() => {
        api('notebook.notes', { name }).then((data) => setNotes(data.notes)).catch((err) => pushToast?.({ title: '打不开笔记本', body: err.message }))
      }, [name])
      useEffect(() => { load() }, [name, nonce])
      const notebook = state.notebooks.find((n) => n.name === name)
      const create = () => {
        api('note.create', { notebook: name, title: '未命名笔记' }).then((res) => { load(); onOpenNote(res.path) }).catch((err) => pushToast?.({ title: '新建失败', body: err.message }))
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
        api('note.reorder', { notebook: name, paths }).then(() => load()).catch((err) => pushToast?.({ title: '排序没保存', body: err.message }))
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

    function DiaryView({ state, onOpenDoc, pushToast, onSettings }) {
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
            api('diary.ensureDay', { date }).then((made) => onOpenDoc(made.doc, date, headingFor(date))).catch((err) => pushToast?.({ title: '打不开', body: err.message }))
            return
          }
          pushToast?.({ title: '这天没有日记', body: '没有记录的日子打不开。' })
        }).catch((err) => pushToast?.({ title: '打不开', body: err.message }))
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

    function DiaryDocView({ state, doc, date, heading, onBack, onOpenNote, pushToast, refresh, nonce }) {
      const [note, setNote] = useState(null)
      const [editing, setEditing] = useState(false)
      const [conflict, setConflict] = useState(null)
      const localBody = useRef('')
      const prevDoc = useRef(doc)
      const captureCount = state.captures?.length || 0
      useEffect(() => {
        const changed = prevDoc.current !== doc
        prevDoc.current = doc
        if (!changed && editing) return
        if (changed) setEditing(false)
        api('diary.doc', { doc }).then((data) => { setNote(data); localBody.current = data.body }).catch((err) => pushToast?.({ title: '打不开日记', body: err.message }))
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
        onCapture: (capture) => onCaptureAction(capture, { state, pushToast, refresh, onOpenNote }),
        onOpenNote: (target) => {
          const clean = target.replace(/^\.\//, '')
          if (clean.endsWith('.md')) onOpenNote(clean)
          else pushToast?.({ title: '只会打开笔记', body: clean })
        },
        onRefresh: refresh,
      }
      return h('div', { className: 'dsan-page dsan-note-page' },
        h('div', { className: 'dsan-note-head' },
          h('h1', { className: 'dsan-note-title' }, date),
          h('button', { className: 'dsan-btn', onClick: () => setEditing((v) => !v) }, editing ? '读' : '编辑')),
        conflict ? h('div', { className: 'dsan-conflict' },
          h('span', null, '这个文件被外面的程序改过了。'),
          h('button', { className: 'dsan-btn small', onClick: () => { setConflict(null); api('diary.doc', { doc }).then(setNote) } }, '载入磁盘版本'),
          h('button', { className: 'dsan-btn small primary', onClick: () => { const keep = localBody.current; setConflict(null); api('note.save', { path: doc, content: keep }).then(() => api('diary.doc', { doc }).then((data) => { setNote(data); localBody.current = data.body })) } }, '保留我的')) : null,
        editing
          ? h(NoteEditor, { note, onSaved: refresh, pushToast, onConflict: setConflict, onDirty: (text) => { localBody.current = text } })
          : h(Markdown, { text: note.body, opts }))
    }

    function onCaptureAction(capture, { pushToast, refresh, onOpenNote }) {
      if (!capture) return
      if (capture.status === 'failed') {
        pushToast({
          title: '这条没有归档成功', body: capture.error || '',
          actions: [
            { label: '重试', primary: true, onClick: () => api('capture.retry', { id: capture.id }).then(refresh).catch(() => { }) },
          ],
        })
        return
      }
      if (capture.status === 'archived' && capture.needsRewrite) {
        pushToast({
          title: '这条能更顺一些', body: capture.rewrite?.reason || '模型建议把附近的段落一起整理。',
          actions: [
            { label: '看看怎么改', primary: true, onClick: () => window.dispatchEvent(new CustomEvent('dsan-rewrite', { detail: capture })) },
            { label: '暂不', onClick: () => { } },
          ],
        })
        return
      }
      if (capture.noteFile) {
        pushToast({
          title: capture.createdNotebook ? `已归入新笔记本「${capture.notebook}」` : `已归入「${capture.notebook}」`,
          body: capture.noteFile,
          actions: [
            { label: '查看', onClick: () => onOpenNote(capture.noteFile) },
            { label: '修改笔记本', onClick: () => window.dispatchEvent(new CustomEvent('dsan-move', { detail: capture })) },
            capture.createdNotebook ? { label: '修改主题', onClick: () => window.dispatchEvent(new CustomEvent('dsan-rename-nb', { detail: capture.notebook })) } : null,
          ].filter(Boolean),
        })
        return
      }
      pushToast({ title: '这条还在日记里', body: capture.text, actions: [{ label: '归档', primary: true, onClick: () => api('capture.retry', { id: capture.id }).then(refresh).catch(() => { }) }] })
    }

    // ------------------------------------------------------------------ 移动与改写

    function MoveModal({ capture, state, onClose, pushToast, refresh, onChanged }) {
      const [notebook, setNotebook] = useState(capture.notebook || '')
      const [newNotebook, setNewNotebook] = useState(false)
      const [newName, setNewName] = useState('')
      const [autoPick, setAutoPick] = useState(true)
      const [notes, setNotes] = useState([])
      const [notePath, setNotePath] = useState('')
      useEffect(() => {
        if (!notebook || autoPick) { setNotes([]); setNotePath(''); return }
        api('notebook.notes', { name: notebook }).then((data) => setNotes(data.notes)).catch(() => setNotes([]))
      }, [notebook, autoPick])
      const submit = () => {
        const target = newNotebook ? newName.trim() : notebook
        if (!target) { pushToast?.({ title: newNotebook ? '先给新笔记本起个名字' : '先选一个笔记本' }); return }
        api('capture.move', { id: capture.id, notebook: target, path: autoPick ? '' : notePath })
          .then((res) => {
            if (res?.ok === false) throw new Error(res.error || '没有搬成')
            onClose(); onChanged?.(); refresh(); pushToast?.({ title: '已改到「' + target + '」' })
          })
          .catch((err) => pushToast?.({ title: '没搬成', body: err.message }))
      }
      return h(Modal, {
        title: '修改这条记录的位置', onClose,
        footer: [h('button', { key: 'c', className: 'dsan-btn', onClick: onClose }, '取消'),
        h('button', { key: 'ok', className: 'dsan-btn primary', onClick: submit }, '搬过去')],
      },
        h(Field, { label: '笔记本' }, h('select', {
          value: newNotebook ? '__new__' : notebook,
          onChange: (event) => {
            const value = event.target.value
            if (value === '__new__') { setNewNotebook(true); setNotebook('') }
            else { setNewNotebook(false); setNotebook(value) }
          },
        },
          h('option', { value: '' }, '选一本'),
          state.notebooks.map((nb) => h('option', { key: nb.name, value: nb.name }, nb.name)),
          h('option', { value: '__new__' }, '新建笔记本…'))),
        newNotebook ? h(Field, { label: '新笔记本名' }, h('input', {
          value: newName, autoFocus: true,
          onChange: (event) => setNewName(event.target.value),
          placeholder: '例如 装修、读书、旅行',
        })) : null,
        h('div', { style: { marginBottom: 10 } },
          h(Switch, { checked: autoPick, onChange: setAutoPick, label: '让模型在这本里挑笔记' })),
        autoPick ? null : h(Field, { label: '笔记' }, h('select', { value: notePath, onChange: (event) => setNotePath(event.target.value) },
          h('option', { value: '' }, '新建一篇'),
          notes.map((note) => h('option', { key: note.path, value: note.path }, note.title)))))
    }

    function RewriteModal({ capture, state, onClose, pushToast, refresh, onChanged }) {
      const [note, setNote] = useState(null)
      useEffect(() => {
        api('note.read', { path: capture.noteFile }).then((data) => setNote(data)).catch(() => setNote(null))
      }, [capture.id])
      const confirm = () => {
        api('capture.confirmRewrite', { id: capture.id }).then(() => {
          onClose(); onChanged?.(); refresh()
          pushToast({
            title: '已经整篇改写',
            actions: [{
              label: '撤销',
              onClick: () => api('capture.undoRewrite', { id: capture.id }).then(() => { refresh(); onChanged?.() }).catch(() => { }),
            }],
          })
        }).catch((err) => pushToast?.({ title: '改写失败', body: err.message }))
      }
      return h(Modal, {
        title: '模型建议整理这篇笔记', onClose, wide: true,
        footer: [h('button', { key: 'c', className: 'dsan-btn', onClick: onClose }, '暂不'),
        h('button', { key: 'ok', className: 'dsan-btn primary', onClick: confirm }, '确认改写')],
      },
        h('p', { style: { marginTop: 0, color: 'var(--dsw-alias-label-secondary)' } }, capture.rewrite?.reason || '追加之后读起来不太顺。'),
        h('div', { className: 'dsan-panes' },
          h('div', null, h('div', { className: 'dsan-sec-title' }, '现在的原文'), h('div', { className: 'dsan-pane' }, note?.body || '读取中…')),
          h('div', null, h('div', { className: 'dsan-sec-title' }, '改写之后'), h('div', { className: 'dsan-pane add' }, splitFront(capture.rewrite?.content || '').body || '没有可用的改写内容'))))
    }

    // ------------------------------------------------------------------ 弹窗

    function NotebookModal({ initial, onClose, onSaved, onDeleted, pushToast }) {
      const [draft, setDraft] = useState({
        name: initial?.name || '',
        description: initial?.description || '',
        keywords: (initial?.keywords || []).join('，'),
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
              private: value.private,
            })
            currentName.current = res.notebook.name
            setSavedName(res.notebook.name)
            onSaved?.(res.notebook)
          }
        } catch (err) {
          pushToast?.({ title: '没保存上', body: err.message })
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
          .catch((err) => pushToast?.({ title: '封面没存上', body: err.message }))
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
          pushToast?.({
            title: '笔记本已进废纸篓',
            actions: [{
              label: '撤销',
              onClick: () => api('trash.restore', { trash: res.trash, target: name })
                .then(() => api('notebook.create', {
                  name,
                  description: draftRef.current.description,
                  keywords: draftRef.current.keywords,
                  private: draftRef.current.private,
                }))
                .then(() => onSaved?.(null))
                .catch(() => { }),
            }],
          })
        } catch (err) {
          pushToast?.({ title: '删除失败', body: err.message })
        }
      }

      if (cropFile) return h(ImageCropper, { file: cropFile, onCancel: () => setCropFile(null), onDone: applyCover })

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
        h(Field, { label: '关键词（选填，用逗号分隔）' }, h('input', {
          value: draft.keywords,
          onChange: (event) => update('keywords', event.target.value),
          onBlur: saveNow,
          placeholder: '手冲，豆子，器具',
        })),
        savedName ? h('div', { className: 'dsan-notebook-delete' },
          h('button', { className: 'dsan-btn danger', onClick: () => setConfirmDelete(true) }, '删除笔记本')) : null)
    }

    function SettingsSection({ title, desc, children }) {
      return h('section', { className: 'dsan-set-section' },
        h('div', { className: 'dsan-set-title' }, title),
        desc ? h('div', { className: 'dsan-set-desc' }, desc) : null,
        children)
    }

    function SettingsModal({ state, onClose, ctx, pushToast, refresh, onRootChanged }) {
      const [autoArchive, setAutoArchive] = useState(state.settings?.autoArchive !== false)
      const [showAgentSessions, setShowAgentSessions] = useState(state.settings?.showAgentSessions === true)
      const [calendar, setCalendar] = useState(state.settings?.calendar || 'double')
      const [trashDays, setTrashDays] = useState(state.settings?.trashDays || 30)
      const [captureHistoryLimit, setCaptureHistoryLimit] = useState(state.settings?.captureHistory || 20)
      const [reactMaxRounds, setReactMaxRounds] = useState(state.settings?.reactMaxRounds || 20)
      const [agentEngine, setAgentEngine] = useState(state.settings?.agentEngine === 'json' ? 'json' : 'native')
      const [toolResultMaxChars, setToolResultMaxChars] = useState(state.settings?.toolResultMaxChars || 20000)
      const [webFetchMaxChars, setWebFetchMaxChars] = useState(state.settings?.webFetchMaxChars || 16000)
      const [readNoteMaxChars, setReadNoteMaxChars] = useState(state.settings?.readNoteMaxChars || 20000)
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
      const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
      const [provider, setProvider] = useState(state.settings?.model?.provider || '')
      const [model, setModel] = useState(state.settings?.model?.model || '')
      const [root, setRoot] = useState(state.root)
      const [background, setBackground] = useState(state.homeBackground || '')
      const [cropFile, setCropFile] = useState(null)
      const configTimer = useRef(null)
      const patchSettings = (patch, after) => {
        api('settings.save', patch)
          .then(() => { refresh(); after?.() })
          .catch((err) => pushToast?.({ title: '没存上', body: err.message }))
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
        if (file.size > 8 * 1024 * 1024) { pushToast?.({ title: '音频不能超过 8MB' }); return }
        const reader = new FileReader()
        reader.onload = () => {
          api('settings.soundUpload', { dataUrl: reader.result, name: file.name })
            .then((res) => {
              setReminderSoundFile(res.file)
              refresh()
            })
            .catch((err) => pushToast?.({ title: '音效没存上', body: err.message }))
        }
        reader.onerror = () => pushToast?.({ title: '读不了这个音频文件' })
        reader.readAsDataURL(file)
      }
      const trySpeech = () => {
        if (!speakReminder('这是一条朗读测试，提醒内容会用系统语音读出来。', reminderVoiceGender, reminderSpeechVolume)) {
          pushToast?.({ title: '当前环境不支持语音朗读' })
        }
      }
      const trySound = () => {
        try {
          const audio = new Audio(soundUrl(reminderSoundFile || 'default'))
          audio.volume = Math.max(0.01, Math.min(1, reminderSoundVolume / 100))
          audio.play().catch((err) => pushToast?.({ title: '无法播放音效', body: err.message }))
        } catch (err) {
          pushToast?.({ title: '无法播放音效', body: err.message })
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
          .catch((err) => pushToast?.({ title: '背景没存上', body: err.message }))
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
        } catch (err) { pushToast?.({ title: '选目录失败', body: err.message }) }
      }
      if (cropFile) return h(ImageCropper, { file: cropFile, onCancel: () => setCropFile(null), onDone: applyBackground })
      const providerOptions = providers.slice()
      if (provider && !providerOptions.some((item) => item.id === provider)) providerOptions.unshift({ id: provider, name: provider })
      const modelOptions = models.slice()
      if (model && !modelOptions.some((item) => item.id === model)) modelOptions.unshift({ id: model, name: model })
      return h(Modal, {
        title: '随记设置', onClose: closeSettings,
      },
        h('div', { className: 'dsan-settings-hero' },
          h('div', { className: 'dsan-settings-avatar-shell' },
            h('div', { className: 'dsan-settings-avatar-wrap' },
              h('img', { className: 'dsan-settings-avatar', src: pluginAsset('suiji-logo.webp'), alt: '随记 logo' })),
            h('span', { className: 'dsan-settings-ver' }, '随记 · v0.1.0'))),
        h(SettingsSection, { title: '笔记库', desc: '所有笔记、日记、便笺和提醒都存在这个目录里。' },
          h('div', { className: 'dsan-set-row' },
            h('div', { style: { fontSize: 12, lineHeight: 1.6, wordBreak: 'break-all', marginBottom: 8 } }, `当前目录：${root}`),
            h('button', { className: 'dsan-btn small', onClick: pick }, '换一个目录')),
          h('div', { className: 'dsan-set-hint' }, '换目录不会自动搬文件。要保留内容，先把旧目录里的笔记和 .dsh-notebooks 复制到新目录，再切换。')),

        h(SettingsSection, { title: '外观', desc: '首页和提醒卡片共用这张背景图；便笺和待办的透明程度也在这里调。' },
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
              h('div', { className: 'dsan-set-hint' }, '0% 不透明，100% 完全透明。只在未聚焦时生效，点进便笺后固定不透明。')),
            h('div', { className: 'dsan-set-row' },
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 } },
                h('span', { style: { width: 120, flex: 'none' } }, '待办卡片透明度'),
                h('input', {
                  type: 'range', min: 0, max: 100, step: 1, value: todoTransparency,
                  style: { flex: 1, accentColor: 'var(--dsw-alias-brand-primary)' },
                  onChange: (event) => { const next = Number(event.target.value); setTodoTransparency(next); patchSoon({ todoTransparency: next }) },
                }),
                h('span', { style: { width: 38, textAlign: 'right', flex: 'none' } }, `${todoTransparency}%`)),
              h('div', { className: 'dsan-set-hint' }, '0% 不透明，100% 完全透明。只改卡片底色，不影响文字和条目悬停。')))),


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

        h(SettingsSection, { title: '提醒', desc: '待办内容里出现明确时间会创建提醒，到点在右上角弹卡片。' },
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
                      if (res?.sent) pushToast?.({ title: '测试通知已发送', body: '没看到的话，检查系统通知中心或专注模式' })
                      else pushToast?.({ title: '系统通知发送失败', body: '当前系统不支持原生通知' })
                    }).catch((err) => pushToast?.({ title: '系统通知发送失败', body: err.message }))
                  }
                  if (typeof Notification === 'undefined') { nativeFallback(); return }
                  const send = () => {
                    try {
                      new Notification('随记测试通知', { body: '如果你看到这条，系统通知正常。', tag: 'dsan-test' })
                      pushToast?.({ title: '测试通知已发送', body: '没看到的话，检查系统通知中心或专注模式' })
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
                onClick: () => api('settings.save', { reminderSoundFile: '' }).then(() => { setReminderSoundFile(''); refresh() }).catch((err) => pushToast?.({ title: '没存上', body: err.message })),
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

        h(SettingsSection, { title: '数据清理', desc: '删除的笔记和笔记本会先进废纸篓，超过保留天数才真正清理。' },
          h(Field, { label: '废纸篓保留天数' }, h('input', {
            type: 'number', min: 1, max: 365, value: trashDays,
            onChange: (event) => { const next = Number(event.target.value); setTrashDays(next); patchSoon({ trashDays: next }) },
          })),
          h('div', { className: 'dsan-set-hint' }, '建议保留 30 天以上，误删后有足够时间恢复。')),

        h(SettingsSection, { title: '模型', desc: '用于快捷记录自动归档和 /agent 指令；留空跟随 DSH 默认模型。' },
          h(Field, { label: 'Agent 引擎' }, h('select', { value: agentEngine, onChange: (event) => { const next = event.target.value === 'native' ? 'native' : 'json'; setAgentEngine(next); patchSoon({ agentEngine: next }) } },
            h('option', { value: 'native' }, '原生工具调用（默认，验证中）'),
            h('option', { value: 'json' }, 'JSON ReAct（兼容回退）'))),
          h('div', { className: 'dsan-set-hint', style: { marginBottom: 10 } }, '原生引擎仍在校验中；切换后新会话生效。'),
          h(Field, { label: 'ReAct 最大轮次' }, h('input', {
            type: 'number', min: 1, max: 50, value: reactMaxRounds,
            onChange: (event) => { const next = Number(event.target.value); setReactMaxRounds(next); patchSoon({ reactMaxRounds: next }) },
          })),
          h('div', { className: 'dsan-set-hint', style: { marginBottom: 10 } }, '默认 20 轮；复杂任务可调高，但会更慢、更耗 token。'),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 } },
            h(Field, { label: '工具结果字符' }, h('input', { type: 'number', min: 1000, max: 200000, value: toolResultMaxChars, onChange: (event) => { const next = Number(event.target.value); setToolResultMaxChars(next); patchSoon({ toolResultMaxChars: next }) } })),
            h(Field, { label: '网页正文字符' }, h('input', { type: 'number', min: 1000, max: 200000, value: webFetchMaxChars, onChange: (event) => { const next = Number(event.target.value); setWebFetchMaxChars(next); patchSoon({ webFetchMaxChars: next }) } })),
            h(Field, { label: '单次读取字符' }, h('input', { type: 'number', min: 1000, max: 200000, value: readNoteMaxChars, onChange: (event) => { const next = Number(event.target.value); setReadNoteMaxChars(next); patchSoon({ readNoteMaxChars: next }) } }))),
          h(Field, { label: '网页抓取超时（毫秒）' }, h('input', { type: 'number', min: 1000, max: 300000, value: webTimeoutMs, onChange: (event) => { const next = Number(event.target.value); setWebTimeoutMs(next); patchSoon({ webTimeoutMs: next }) } })),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 } },
            h(Field, { label: '日志保留天数' }, h('input', { type: 'number', min: 1, max: 3650, value: agentLogRetentionDays, onChange: (event) => { const next = Number(event.target.value); setAgentLogRetentionDays(next); patchSoon({ agentLogRetentionDays: next }) } })),
            h(Field, { label: '自动清理间隔（天）' }, h('input', { type: 'number', min: 1, max: 3650, value: agentLogCleanupIntervalDays, onChange: (event) => { const next = Number(event.target.value); setAgentLogCleanupIntervalDays(next); patchSoon({ agentLogCleanupIntervalDays: next }) } }))),
          h('button', { type: 'button', className: 'dsan-btn small', onClick: async () => { try { const res = await api('agent.logs.cleanup', { days: agentLogRetentionDays }); pushToast({ title: `已清理 ${res.removed || 0} 份日志` }) } catch (err) { pushToast({ title: '清理失败', body: err.message }) } } }, '立即清理旧日志'),
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
              }))))
      )
    }

    function DiaryCoverModal({ state, onClose, pushToast, refresh }) {
      const [cover, setCover] = useState(state.diaryCover || '')
      const [calendar, setCalendar] = useState(state.settings?.calendar || 'double')
      const [cropFile, setCropFile] = useState(null)
      const changeCalendar = (value) => {
        setCalendar(value)
        api('settings.save', { calendar: value })
          .then(() => { pushToast?.({ title: '日历显示已更新' }); refresh() })
          .catch((err) => pushToast?.({ title: '没存上', body: err.message }))
      }
      const pick = (event) => {
        const file = event.target.files?.[0]
        if (file) setCropFile(file)
        event.target.value = ''
      }
      const applyCover = (dataUrl) => {
        setCropFile(null)
        api('diary.setCover', { dataUrl })
          .then((res) => { setCover(res.cover); pushToast?.({ title: '日记背景已更新' }); refresh() })
          .catch((err) => pushToast?.({ title: '日记背景没存上', body: err.message }))
      }
      const clear = () => api('diary.clearCover').then(() => { setCover(''); refresh() }).catch(() => { })
      if (cropFile) return h(ImageCropper, { file: cropFile, onCancel: () => setCropFile(null), onDone: applyCover })
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

    function ImageCropper({ file, onCancel, onDone }) {
      const [src, setSrc] = useState('')
      const [natural, setNatural] = useState({ w: 0, h: 0 })
      const [crop, setCrop] = useState(null)
      const drag = useRef(null)
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
        const dx = event.clientX - drag.current.x
        const dy = event.clientY - drag.current.y
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

    function Setup({ ctx, onDone, pushToast }) {
      const [busy, setBusy] = useState(false)
      const choose = async () => {
        setBusy(true)
        try {
          const picked = await ctx.get('uiWorkspace')?.pickDirectory?.()
          if (!picked) { setBusy(false); return }
          await api('pickRoot', { path: picked })
          onDone()
        } catch (err) {
          pushToast?.({ title: '没选成', body: err.message })
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

    function AgentSurfaceView({ surface, onClose, onAnswer, stackIndex = 0 }) {
      const [text, setText] = useState('')
      const question = surface || {}
      const options = question.options || []
      const displayTitle = question.kind === 'progress'
        ? `Agent 正在执行：${String(question.title || '处理任务').replace(/^Agent\s*正在执行[:：]\s*/, '')}`
        : (question.title || 'Agent 需要你确认')
      if (question.type === 'toast') {
        return h('div', { className: 'dsan-surface-toast' + (question.kind === 'progress' ? ' dsan-surface-progress' : '') },
          h('div', { className: 'tt' }, displayTitle),
          question.kind === 'progress' ? h('div', { className: 'dsan-progress-row' }, h('span', { className: 'dsan-spinner' }), '进行中') : null,
          h('div', { className: 'tb' }, question.body || question.question || ''),
          h('button', { type: 'button', className: 'x', onClick: onClose, 'aria-label': '关闭' }, '×'),
          h('div', { className: 'ta' }, options.map((option) => h('button', {
            key: option.id, type: 'button', className: 'dsan-btn small', title: option.description || '',
            onClick: () => onAnswer({ optionId: option.id, label: option.label, text: '' }),
          }, option.label))))
      }
      return h(Modal, { title: displayTitle, wide: true, onClose },
        h('div', { className: 'dsan-agent-prev', style: { whiteSpace: 'pre-wrap' } }, question.body || question.question || ''),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 } },
          options.map((option) => h('button', {
            key: option.id, type: 'button', className: 'dsan-btn', title: option.description || '',
            onClick: () => onAnswer({ optionId: option.id, label: option.label, text }),
          }, option.label))),
        question.allowFreeText ? h(Field, { label: '补充说明' }, h('textarea', {
          className: 'dsan-editor', rows: 3, value: text,
          onChange: (event) => setText(event.target.value),
          onKeyDown: (event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && text.trim()) onAnswer({ optionId: 'text', label: text.trim(), text }) },
        })) : null,
        question.allowFreeText ? h('button', {
          type: 'button', className: 'dsan-btn primary', disabled: !text.trim(),
          onClick: () => onAnswer({ optionId: 'text', label: text.trim(), text }),
        }, '发送') : null)
    }

    function AgentReplyModal({ thread, onClose, onSend }) {
      const [text, setText] = useState('')
      const send = () => {
        const value = text.trim()
        if (!value) return
        onSend(value)
      }
      return h(Modal, {
        title: '继续回复 agent', wide: true, onClose,
        footer: [
          h('button', { key: 'c', className: 'dsan-btn', onClick: onClose }, '取消'),
          h('button', { key: 'ok', className: 'dsan-btn primary', onClick: send }, '发送'),
        ],
      },
        h('div', { className: 'dsan-agent-prev' }, thread?.reply || '还没有可回复的内容'),
        h(Field, { label: '你的回复' }, h('textarea', {
          className: 'dsan-editor', rows: 4, value: text, autoFocus: true,
          onChange: (event) => setText(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); send() }
          },
          placeholder: '例如：A，或者先按方案 A 改，再告诉我需要保留的图片',
        })))
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
      const [toasts, setToasts] = useState(readSavedToasts)
      const [modal, setModal] = useState(null)
      const [captureText, setCaptureText] = useState('')
      const [captureImages, setCaptureImages] = useState([])
      const [previewImage, setPreviewImage] = useState(null)
      const [agentThread, setAgentThread] = useState(readSavedAgentThread)
      const [surfaces, setSurfacesState] = useState(() => liveSurfaces.length ? liveSurfaces : readSavedSurfaces())
      const surfacesRef = useRef(surfaces)
      const setSurfaces = (updater) => {
        const next = typeof updater === 'function' ? updater(surfacesRef.current) : updater
        surfacesRef.current = next
        publishLiveSurfaces(next)
        setSurfacesState(next)
      }
      useEffect(() => { saveView(view) }, [view])
      useEffect(() => { saveToasts(toasts) }, [toasts])
      useEffect(() => { saveAgentThread(agentThread) }, [agentThread])
      useEffect(() => { saveSurfaces(surfaces) }, [surfaces])
      useEffect(() => {
        if (!state?.root) return
        liveRoot = state.root
        setSurfaces((prev) => prev.filter((item) => !item.root || item.root === liveRoot))
      }, [state?.root])
      useEffect(() => {
        const timer = setInterval(() => setSurfaces((prev) => prev.filter((item) => !item.expiresAt || item.expiresAt > Date.now())), 60000)
        return () => clearInterval(timer)
      }, [])
      useEffect(() => {
        setToasts((prev) => prev.filter((toast) => toast.title !== 'agent 没跑成' && !String(toast.body || '').includes('请求失败（405）')))
      }, [])
      useEffect(() => {
        api('agent.sessions').then((data) => {
          setAgentSessionLatest((data?.sessions || [])[0] || null)
          const waiting = (data?.sessions || []).find((session) => session.status === 'waiting')
          const running = (data?.sessions || []).find((session) => session.status === 'running')
          if (running?.jobId) pollAgentJob(running.jobId)
          if (!waiting && !running) {
            setSurfaces((prev) => prev.filter((item) => item.kind !== 'progress' && item.kind !== 'agent-wait'))
            try { localStorage.removeItem('dsan-active-agent-job') } catch { /* ignore */ }
            return
          }
          if (!waiting) return
          const unsafe = (waiting.surfaces || []).filter(unsafeSurface)
          for (const surface of unsafe) api('surface.close', { jobId: waiting.jobId, surfaceId: surface.id }).catch(() => { })
          const restored = (waiting.surfaces || []).filter((surface) => !unsafeSurface(surface)).map((surface) => ({
            ...surface, kind: 'agent-wait', waitingJob: waiting.jobId, allowFreeText: surface.allowFreeText !== false,
          }))
          if (restored.length) setSurfaces((prev) => [...prev.filter((item) => !restored.some((surface) => surface.id === item.id)), ...restored])
        }).catch(() => { })
      }, [])
      useEffect(() => {
        try { const id = localStorage.getItem('dsan-active-agent-job'); if (id) pollAgentJob(id) } catch { /* ignore */ }
        return () => {
          for (const timer of agentPollers.current.values()) clearInterval(timer)
          agentPollers.current.clear()
        }
      }, [])
      useEffect(() => {
        if (!state?.captures?.some((capture) => capture.status === 'needs_input' || capture.status === 'running' || capture.status === 'needs_review')) return
        const timer = setInterval(async () => {
          try {
            const next = await api('state')
            setState(next)
            const pending = (next.captures || []).find((capture) => capture.question)
            if (pending?.question) setSurfaces((prev) => prev.some((item) => item.id === pending.question.id) ? prev : [...prev, { ...pending.question, captureId: pending.id }])
            const review = (next.captures || []).find((capture) => capture.status === 'needs_review' && capture.pendingId)
            if (review) api('review.surface', { id: review.pendingId }).then(({ surface }) => {
              setSurfaces((prev) => [...prev.filter((item) => item.pendingId !== surface.pendingId), surface])
            }).catch(() => { })
            const active = (next.captures || []).find((capture) => capture.status === 'running' || capture.status === 'pending')
            if (active) {
              setSurfaces((prev) => [...prev.filter((item) => item.kind !== 'capture-progress'), {
                id: `capture-progress-${active.id}`, kind: 'capture-progress', type: 'toast',
                title: '已存入今天的日记', body: active.job?.message || '正在归档…',
                captureId: active.id, diaryDoc: active.diaryDoc, date: active.date,
                options: [{ id: 'view', label: '查看' }, { id: 'cancel', label: '取消归档' }],
                actions: [
                  { id: 'view', label: '查看', action: { type: 'view-capture', diaryDoc: active.diaryDoc, date: active.date } },
                  { id: 'cancel', label: '取消归档', action: { type: 'cancel-capture', captureId: active.id } },
                ],
              }])
            } else setSurfaces((prev) => prev.filter((item) => item.kind !== 'capture-progress'))
          } catch { /* ignore */ }
        }, 2500)
        return () => clearInterval(timer)
      }, [state?.captures])
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
      const [agentReplyOpen, setAgentReplyOpen] = useState(false)
      useEffect(() => {
        const listener = (next) => setSurfacesState(next)
        liveSurfaceListeners.add(listener)
        return () => liveSurfaceListeners.delete(listener)
      }, [])
      const agentJobRef = useRef('')
      const surfaceResolvers = useRef(new Map())
      const agentPollers = useRef(new Map())
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
      const [fabTop, setFabTop] = useState(() => {
        if (Number.isFinite(legacyUi.fabTop)) return legacyUi.fabTop
        return typeof window !== 'undefined' ? Math.round((window.innerHeight || 800) * 0.75) : 560
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
          setToasts((prev) => [...prev, { id: `notify-warn-${Date.now()}`, title: '系统通知没有发送', body, auto: true }].slice(-3))
          setTimeout(() => setToasts((prev) => prev.filter((toast) => !String(toast.id).startsWith('notify-warn-'))), 8000)
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

      const dismiss = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])
      const pushToast = useCallback((toast) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`
        const actions = Array.isArray(toast.actions) ? toast.actions.filter(Boolean) : []
        const onlyView = actions.length > 0 && actions.every((action) => action.label === '查看')
        const auto = actions.length === 0 || onlyView
        const timeout = Number.isFinite(toast.duration) ? toast.duration : 10 * 60 * 1000
        setToasts((prev) => [...prev, { ...toast, id, auto }].slice(-3))
        if (auto) setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), timeout)
      }, [])
      const refresh = useCallback(async () => {
        try {
          const next = await api('state')
          setState(next)
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
          if (!agentSessionDetail && list[0]) {
            const detail = await api('agent.session', { id: list[0].id })
            setAgentSessionDetail(detail?.session || null)
          }
        } catch { /* ignore */ }
      }
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
        if (Number.isFinite(ui.fabTop)) setFabTop(ui.fabTop)
        else if (Number.isFinite(legacyUi.fabTop)) patch.fabTop = legacyUi.fabTop
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
        if (!state || state.configured === false) return
        api('capture.retryQueue').catch(() => { })
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
            pushToast({
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

      useEffect(() => {
        if (!state?.captures) return
        if (!prevStatus.current) {
          prevStatus.current = new Map(state.captures.map((c) => [c.id, c.status]))
          return
        }
        const prev = prevStatus.current
        for (const capture of state.captures) {
          const old = prev.get(capture.id)
          if (old === 'pending' || old === 'running') {
            if (capture.status === 'archived') {
              bumpContent()
              setToasts((prev) => prev.filter((toast) => toast.key !== `capture:${capture.id}`))
              if (capture.needsRewrite) {
                pushToast({
                  title: '归档好了，可以更顺一些', body: capture.rewrite?.reason || '',
                  actions: [
                    { label: '看看怎么改', primary: true, onClick: () => setModal({ kind: 'rewrite', capture }) },
                    { label: '暂不', onClick: () => { } },
                  ],
                })
              } else {
                pushToast({
                  title: capture.createdNotebook ? `已建「${capture.notebook}」并归档` : `已归档到「${capture.notebook}」`,
                  actions: [
                    { label: '查看', onClick: () => setView({ kind: 'note', path: capture.noteFile }) },
                    { label: '修改笔记本', onClick: () => setModal({ kind: 'move', capture }) },
                    ...(capture.createdNotebook ? [{ label: '修改主题', onClick: () => setModal({ kind: 'renameNotebook', name: capture.notebook }) }] : []),
                  ],
                })
              }
            } else if (capture.status === 'failed') {
              setToasts((prev) => prev.filter((toast) => toast.key !== `capture:${capture.id}`))
              pushToast({
                title: '归档失败', body: capture.error || '模型没有返回结果',
                actions: [{ label: '重试', primary: true, onClick: () => api('capture.retry', { id: capture.id }).then(refresh) }],
              })
            }
          }
          prev.set(capture.id, capture.status)
        }
      }, [state?.captures])

      useEffect(() => {
        const onMove = (event) => setModal({ kind: 'move', capture: event.detail })
        const onRewrite = (event) => setModal({ kind: 'rewrite', capture: event.detail })
        const onRename = (event) => setModal({ kind: 'renameNotebook', name: event.detail })
        window.addEventListener('dsan-move', onMove)
        window.addEventListener('dsan-rewrite', onRewrite)
        window.addEventListener('dsan-rename-nb', onRename)
        return () => {
          window.removeEventListener('dsan-move', onMove)
          window.removeEventListener('dsan-rewrite', onRewrite)
          window.removeEventListener('dsan-rename-nb', onRename)
        }
      }, [])

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

      const runSurfaceAction = (surface, answer) => {
        const entry = (surface.actions || []).find((item) => item.id === answer.optionId)
        const action = entry?.action
        if (!action) return false
        const jobId = surface.waitingJob || surface.jobId || agentJobRef.current
        if (action.type === 'confirm' || action.type === 'cancel-pending') {
          api('surface.answer', { id: jobId, questionId: surface.id, pendingId: action.pendingId || '', ...answer }).then((res) => {
            refresh()
            if (action.type === 'confirm') showAgentResult(res.outcome || res)
          }).catch((err) => pushToast({ title: '确认失败', body: err.message }))
        } else if (action.type === 'session-option' || action.type === 'session-text') {
          executeAgent(action.text || answer.label || '', currentContext(), [], agentThread?.history || [], agentJobRef.current)
        } else if (action.type === 'open-reply') {
          setAgentReplyOpen(true)
        } else if (action.type === 'cancel-job') {
          api('agent.cancelJob', { id: action.jobId || jobId }).catch(() => { })
        } else if (action.type === 'close') {
          api('surface.close', { jobId, surfaceId: surface.id }).catch(() => { })
        } else if (action.type === 'view-note') {
          if (action.path) setView({ kind: 'note', path: action.path })
        } else if (action.type === 'undo-run') {
          api('agent.undo', { id: action.runId }).then(() => { bumpContent(); refresh() }).catch((err) => pushToast({ title: '撤销失败', body: err.message }))
        } else if (action.type === 'retry-agent') {
          executeAgent(action.instruction || '', action.context || currentContext(), action.images || [], action.history || [])
        } else if (action.type === 'copy-agent-log') {
          api('agent.log', { id: action.jobId }).then((data) => copyText(data.text || '')).then((copied) => pushToast({ title: copied ? '完整日志已复制' : '复制失败' })).catch((err) => pushToast({ title: '读取日志失败', body: err.message }))
        } else if (action.type === 'view-capture') {
          setView({ kind: 'diaryDoc', doc: action.diaryDoc, date: action.date, heading: headingFor(action.date) })
        } else if (action.type === 'cancel-capture') {
          api('capture.cancel', { id: action.captureId }).catch(() => { })
        } else return false
        return true
      }

      const renderSurface = (surface) => h(AgentSurfaceView, {
          key: surface.id,
          surface,
          onClose: () => {
            forgetSavedSurface(surface.id)
            setSurfaces((prev) => prev.filter((item) => item.id !== surface.id))
            if (surface.captureId) api('capture.answer', { id: surface.captureId, questionId: surface.id, optionId: 'cancel', label: '取消' }).catch(() => { })
            else if (surface.waitingJob || surface.jobId || surface.kind === 'progress' || surface.kind === 'confirm') {
              const jobId = surface.waitingJob || surface.jobId || agentJobRef.current
              api('surface.close', { jobId, surfaceId: surface.id }).catch(() => { if (jobId) api('agent.cancelJob', { id: jobId }).catch(() => { }) })
            } else surfaceResolvers.current.get(surface.id)?.({ optionId: 'cancel', label: '取消' })
          },
          onAnswer: (answer) => {
            forgetSavedSurface(surface.id)
            setSurfaces((prev) => prev.filter((item) => item.id !== surface.id))
            if (runSurfaceAction(surface, answer)) return
            if (surface.kind === 'confirm') api('surface.answer', { id: surface.waitingJob || surface.jobId, questionId: surface.id, ...answer }).then((res) => { refresh(); if (answer.optionId === 'confirm') showAgentResult(res.outcome || res) }).catch((err) => pushToast({ title: '确认失败', body: err.message }))
            else if (surface.onSurfaceAction) surface.onSurfaceAction(answer.optionId)
            else if (surface.captureId) api('capture.answer', { id: surface.captureId, questionId: surface.id, ...answer }).catch(() => { })
            else if (surface.waitingJob) api('surface.answer', { id: surface.waitingJob, questionId: surface.id, ...answer }).then(() => { if (agentJobRef.current !== surface.waitingJob) pollAgentJob(surface.waitingJob) }).catch(() => { })
            else if (surface.fromJob && answer.label) executeAgent(answer.label, currentContext(), [], agentThread?.history || [])
            else surfaceResolvers.current.get(surface.id)?.(answer)
          },
        })

      const showAgentResult = (res, instruction = '', baseHistory = null) => {
        const first = (res.applied || []).find((item) => item.path && !['delete', 'deleteNotebook', 'reorderNotebooks', 'reorderNotes', 'todoAdd', 'todoUpdate', 'todoDelete', 'memoCreate', 'memoUpdate', 'memoDelete', 'memoPin', 'settingsUpdate', 'setNotebookPrivate', 'setPrivacyMode', 'fileMove', 'fileCopy', 'fileDelete'].includes(item.op))
        const options = Array.isArray(res.options) ? res.options.slice(0, 6) : []
        const reply = String(res.reply || res.question || '')
        const body = reply || `已应用 ${res.applied?.length || 0} 处修改`
        const actions = []
        if (first) actions.push({ label: '查看', primary: true, onClick: () => setView({ kind: 'note', path: first.path }) })
        if (res.runId) actions.push({
          label: '撤销整批',
          onClick: async () => {
            try {
              await api('agent.undo', { id: res.runId })
              bumpContent()
              refresh()
              pushToast({ title: '已撤销这批操作' })
            } catch (err) {
              pushToast({ title: '撤销失败', body: err.message })
            }
          },
        })
        let nextHistory = []
        if (reply) {
          const previous = Array.isArray(baseHistory) ? baseHistory : (agentThread?.history || [])
          nextHistory = instruction ? [...previous, { role: 'user', content: instruction }] : [...previous]
          const assistantText = options.length
            ? `${reply}\n选项：${options.map((option) => `${option.id || ''} ${option.label}`).join('；')}`
            : reply
          nextHistory.push({ role: 'assistant', content: assistantText })
          setAgentThread({ instruction: instruction || agentThread?.instruction || '', reply, history: nextHistory.slice(-8) })
        }
        options.forEach((option) => {
          actions.push({
            label: option.label,
            title: option.description || option.label,
            onClick: () => executeAgent(`${option.id || ''}. ${option.label}`.trim(), currentContext(), [], nextHistory, agentJobRef.current),
          })
        })
        if (reply) actions.push({ label: '回复', onClick: () => setAgentReplyOpen(true) })
        const declarative = []
        if (first) declarative.push({ id: String(declarative.length), label: '查看', action: { type: 'view-note', path: first.path } })
        if (res.runId) declarative.push({ id: String(declarative.length), label: '撤销整批', action: { type: 'undo-run', runId: res.runId } })
        options.forEach((option, index) => declarative.push({ id: String(declarative.length), label: option.label, action: { type: 'session-option', text: `${option.id || ''}. ${option.label}`.trim() } }))
        if (reply) declarative.push({ id: String(declarative.length), label: '回复', action: { type: 'open-reply' } })
        setSurfaces((prev) => [...prev.filter((item) => item.kind !== 'agent-result'), {
          id: `agent-result-${Date.now()}`,
          key: 'agent-result',
          kind: 'agent-result',
          type: 'toast',
          expiresAt: Date.now() + 10 * 60 * 1000,
          title: 'agent 处理完成',
          body,
          options: actions.map((action, index) => ({ id: String(index), label: action.label })),
          actions: declarative,
          onSurfaceAction: (id) => actions[Number(id)]?.onClick?.(),
        }])
        if (res.errors?.length) pushToast({ title: '有操作没成功', body: res.errors.slice(0, 5).join('；') })
        if ((res.applied || []).some((item) => String(item.op || '').startsWith('todo'))) setTodoOpen(true)
        if (res.remindersCreated?.length) notifyReminderCreated(res.remindersCreated)
        const deletedCurrent = (res.applied || []).some((item) => item.op === 'delete' && view.kind === 'note' && view.path === item.path)
        if (deletedCurrent) go({ kind: 'notebook', name: view.path.split('/')[0] })
        bumpContent()
        refresh()
      }

      const isJobProgress = (item, jobId) => item.kind === 'progress' && (item.fromJob === jobId || item.jobId === jobId)

      const pollAgentJob = (jobId) => {
        if (!jobId || agentPollers.current.has(jobId)) return
        const timer = setInterval(async () => {
          try {
            const status = (await api('agent.status', { id: jobId })).job
            const progressIds = new Set((status.surfaces || []).filter((item) => item.kind === 'progress' && item.status === 'waiting').map((item) => item.id))
            setSurfaces((prev) => {
              const next = prev.filter((item) => !isJobProgress(item, jobId) || progressIds.has(item.id))
              for (const item of status.surfaces || []) {
                if (item.awaitResponse || item.status !== 'waiting') continue
                const index = next.findIndex((entry) => entry.id === item.id)
                if (index >= 0) next[index] = { ...item, fromJob: jobId }
                else next.push({ ...item, fromJob: jobId })
              }
              return next
            })
            if (status.status === 'waiting' && status.question) {
              const question = { ...status.question, waitingJob: jobId, kind: 'agent-wait' }
              setSurfaces((prev) => [...prev.filter((item) => !isJobProgress(item, jobId) && !(item.kind === 'agent-wait' && item.waitingJob === jobId)), question])
              return
            }
            if (status.status === 'running') return
            clearInterval(timer); agentPollers.current.delete(jobId)
            setSurfaces((prev) => prev.filter((item) => !isJobProgress(item, jobId) && !(item.kind === 'agent-wait' && item.waitingJob === jobId)))
            if (status.status === 'done') {
              try { localStorage.removeItem('dsan-active-agent-job') } catch { /* ignore */ }
              const res = status.result || {}
              if (res.pendingId) api('review.surface', { id: res.pendingId }).then(({ surface }) => setSurfaces((prev) => [...prev.filter((item) => item.pendingId !== surface.pendingId), surface])).catch(() => { })
              else showAgentResult(res)
            } else if (status.status === 'error') {
              try { localStorage.removeItem('dsan-active-agent-job') } catch { /* ignore */ }
              const args = status.args || {}
              setSurfaces((prev) => [...prev.filter((item) => item.kind !== 'agent-error'), {
                id: `agent-error-${Date.now()}`, kind: 'agent-error', type: 'toast', title: 'Agent 任务失败',
                body: String(status.error || status.message || '任务失败'),
                options: [{ id: '0', label: '重试' }, { id: '1', label: '复制完整日志' }],
                actions: [
                  { id: '0', label: '重试', action: { type: 'retry-agent', instruction: String(args.instruction || ''), context: args.context || { view: 'home' }, images: args.images || [], history: args.history || [] } },
                  { id: '1', label: '复制完整日志', action: { type: 'copy-agent-log', jobId } },
                ],
              }])
            }
          } catch { /* ignore */ }
        }, 1000)
        agentPollers.current.set(jobId, timer)
      }

      const executeAgent = async (instruction, context, images = [], history = [], resumeJobId = '') => {
        const key = `agentjob:${Date.now()}-${Math.random().toString(16).slice(2, 6)}`
        const upsert = (patch) => setToasts((prev) => {
          const index = prev.findIndex((toast) => toast.key === key)
          if (index === -1) return [...prev, { id: key, key, ...patch }].slice(-3)
          const next = [...prev]
          next[index] = { ...next[index], ...patch }
          return next
        })
        const remove = () => setToasts((prev) => prev.filter((toast) => toast.key !== key))
        let jobId = ''
        const cancel = () => {
          if (!jobId) return
          api('agent.cancelJob', { id: jobId }).then(() => {
            upsert({ title: 'agent 正在取消', body: '等这一轮结束…', actions: [] })
          }).catch(() => { })
        }
        try {
          setToasts((prev) => prev.filter((toast) => toast.title !== 'agent 没跑成' && !String(toast.body || '').includes('请求失败（405）')))
          if (resumeJobId) {
            const resumed = await api('agent.reply', { id: resumeJobId, text: instruction })
            jobId = resumed.jobId || resumeJobId
          } else {
            const started = await api('agent.start', { instruction, context, images, history })
            jobId = started.jobId
          }
          agentJobRef.current = jobId
          setSurfaces((prev) => prev.filter((item) => item.kind !== 'progress' || item.fromJob))
          try { localStorage.setItem('dsan-active-agent-job', jobId) } catch { /* ignore */ }
          while (true) {
            if (!appMountedRef.current) return false
            const status = (await api('agent.status', { id: jobId })).job
            const progressIds = new Set((status.surfaces || []).filter((item) => item.kind === 'progress' && item.status === 'waiting').map((item) => item.id))
            setSurfaces((prev) => {
              const next = prev.filter((item) => !isJobProgress(item, jobId) || progressIds.has(item.id))
              for (const item of status.surfaces || []) {
                if (item.awaitResponse || item.status !== 'waiting') continue
                const index = next.findIndex((entry) => entry.id === item.id)
                if (index >= 0) next[index] = { ...item, fromJob: jobId }
                else next.push({ ...item, fromJob: jobId })
              }
              return next
            })
            if (status.status === 'running') {
              await new Promise((resolve) => setTimeout(resolve, 800))
              continue
            }
            if (status.status === 'waiting' && status.question) {
              remove()
              const question = { ...status.question, waitingJob: jobId, allowFreeText: status.question.allowFreeText !== false }
              setSurfaces((prev) => [...prev.filter((item) => !isJobProgress(item, jobId) && !(item.kind === 'agent-wait' && item.waitingJob === jobId)), { ...question, kind: 'agent-wait' }])
              await new Promise((resolve) => setTimeout(resolve, 800))
              continue
            }
            setSurfaces((prev) => prev.filter((item) => !isJobProgress(item, jobId) && !(item.kind === 'agent-wait' && item.waitingJob === jobId)))
            remove()
            if (status.status === 'done') {
              const res = status.result || {}
              if (res.pendingId) api('review.surface', { id: res.pendingId }).then(({ surface }) => {
                setSurfaces((prev) => [...prev.filter((item) => item.pendingId !== surface.pendingId), surface])
              }).catch((err) => pushToast({ title: '审阅准备失败', body: err.message }))
              else showAgentResult(res, instruction, history)
              return true
            }
            if (status.status === 'cancelled') {
              setSurfaces((prev) => prev.filter((item) => !(item.kind === 'agent-wait' && item.waitingJob === jobId)))
              pushToast({ title: 'agent 已取消', body: '没有继续写入' })
              return false
            }
            throw new Error(status.error || status.message || 'agent 任务失败')
          }
        } catch (err) {
          remove()
          const log = [
            '随记 /agent 错误',
            `时间：${new Date().toISOString()}`,
            `页面：${JSON.stringify(context)}`,
            `指令：${instruction}`,
            `错误：${String(err?.message ?? err)}`,
            err?.stack ? `堆栈：${err.stack}` : '',
          ].filter(Boolean).join('\n')
          setSurfaces((prev) => [...prev.filter((item) => item.kind !== 'agent-error'), {
            id: `agent-error-${Date.now()}`, kind: 'agent-error', type: 'toast', title: 'Agent 任务失败',
            body: String(err?.message ?? err),
            options: [{ id: '0', label: '重试' }, { id: '1', label: '复制完整日志' }],
            actions: [
              { id: '0', label: '重试', action: { type: 'retry-agent', instruction, context, images, history } },
              { id: '1', label: '复制完整日志', action: { type: 'copy-agent-log', jobId } },
            ],
          }])
          return false
        }
      }

      const notifyReminderCreated = (list) => {
        for (const item of list || []) {
          pushToast({
            title: item.kind && item.kind !== 'once' ? '周期定时提醒已创建' : '定时提醒已创建',
            body: `${item.text}\n下一次：${fmtReminderTime(item.nextAt)}`,
            duration: 8000,
          })
        }
      }

      const addCaptureFiles = async (fileList) => {
        const files = Array.from(fileList || []).filter((file) => file && file.type && file.type.startsWith('image/'))
        if (!files.length) return
        const room = 9 - captureImages.length
        if (room <= 0) { pushToast({ title: '最多放 9 张图片' }); return }
        const accepted = files.filter((file) => file.size <= 10 * 1024 * 1024).slice(0, room)
        if (accepted.length < files.length) pushToast({ title: '部分图片没有加入', body: '单张不能超过 10MB，最多 9 张' })
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

      const submitCapture = async () => {
        const raw = captureText.trim()
        if (!raw && !captureImages.length) return
        const slash = /^\/([a-zA-Z]+)(?:\s+([\s\S]*))?$/.exec(raw)
        let text = raw
        if (slash) {
          const name = slash[1].toLowerCase()
          const rest = String(slash[2] || '').trim()
          if (!['memo', 'todo', 'note', 'agent'].includes(name)) {
            pushToast({ title: '不认识的指令', body: '可用：/memo /todo /note /agent' })
            return
          }
          if (!rest) {
            pushToast({ title: `/${name} 后面写点内容` })
            return
          }
          if (name === 'memo') {
            rememberCapture(raw)
            setCaptureText('')
            const items = rest.split('\n').map((line) => line.trim()).filter(Boolean)
            try {
              const created = await api('sticky.create', stickySpawnPosition(view.kind === 'home'))
              await api('sticky.save', { id: created.sticky.id, items })
              refresh()
              pushToast({ title: '便笺已创建', body: items.join(' / ') })
            } catch (err) { pushToast({ title: '便笺没建出来', body: err.message }) }
            return
          }
          if (name === 'todo') {
            rememberCapture(raw)
            setCaptureText('')
            const existing = state.todo?.items || []
            const fresh = rest.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
              const tags = [...line.matchAll(/#([^\s#]+)/g)].map((m) => m[1]).filter(Boolean)
              const body = line.replace(/#[^\s#]+/g, '').trim()
              return { id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2, 6)}`, text: body || line, done: false, tags, createdAt: new Date().toISOString() }
            })
            try {
              const saved = await api('todo.save', { items: [...fresh, ...existing], baseVersion: state.todo?.version })
              if (saved?.remindersCreated?.length) notifyReminderCreated(saved.remindersCreated)
              setTodoOpen(true)
              refresh()
              pushToast({ title: '已加入待办', body: fresh.map((item) => item.text).join(' / ') })
            } catch (err) { pushToast({ title: '待办没加上', body: err.message }) }
            return
          }
          if (name === 'agent') {
            try {
              const images = await uploadCaptureImages()
              rememberCapture(raw)
              setCaptureText('')
              const ok = await executeAgent(rest, currentContext(), images)
              if (ok) setCaptureImages([])
              else setCaptureText(rest)
            } catch (err) {
              pushToast({ title: '图片没传上', body: err.message })
            }
            return
          }
          text = rest
        }

        let images = []
        if (captureImages.length) {
          try {
            images = await uploadCaptureImages()
          } catch (err) {
            pushToast({ title: '图片没传上', body: err.message })
            return
          }
        }
        const finalText = text || '图片记录'
        rememberCapture(raw || finalText)
        try {
          const res = await api('capture', { text: finalText, images })
          setCaptureText('')
          setCaptureImages([])
          bumpContent()
          if (view.kind === 'diaryDoc' && view.doc === res.doc) refresh()
          else refresh()
        } catch (err) {
          pushToast({ title: '没记上', body: err.message })
        }
      }

      const stickySpawnPosition = (useScroll = true) => {
        const vh = window.innerHeight || 800
        const vw = window.innerWidth || 1200
        const scrollTop = useScroll ? (document.querySelector('.dsan-body')?.scrollTop || 0) : 0
        const topOffset = 110
        const minY = Math.max(40, Math.round(vh * 0.42) - topOffset)
        const maxY = Math.max(minY + 20, Math.round(vh * 0.92) - topOffset - 180)
        const y = scrollTop + minY + Math.round(Math.random() * Math.max(0, maxY - minY))
        const x = 40 + Math.round(Math.random() * Math.max(0, vw - 380))
        return { x, y }
      }

      const createHomeSticky = async () => {
        try {
          await api('sticky.create', stickySpawnPosition(true))
          refresh()
        } catch (err) { pushToast({ title: '便笺没建出来', body: err.message }) }
      }

      const fabDown = (event) => {
        fabDrag.current = { startY: event.clientY, startTop: fabTop }
        fabMoved.current = false
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }
      const fabMove = (event) => {
        if (!fabDrag.current) return
        const dy = event.clientY - fabDrag.current.startY
        if (Math.abs(dy) > 4) fabMoved.current = true
        const next = Math.max(70, Math.min((window.innerHeight || 800) - 80, fabDrag.current.startTop + dy))
        setFabTop(next)
      }
      const fabUp = () => {
        fabDrag.current = null
        api('ui.save', { fabTop: Math.round(fabTop) }).catch(() => { })
      }

      const createPageSticky = async () => {
        try {
          const created = await api('sticky.create', { x: 120, y: 120, w: 300, h: 220 })
          setPageSticky(created.sticky)
          refresh()
        } catch (err) { pushToast({ title: '便笺没建出来', body: err.message }) }
      }

      if (!state) return h('div', { className: 'dsan' }, styleTag(), h('div', { className: 'dsan-empty' }, '正在打开随记…'))
      if (state.configured === false) return h('div', { className: 'dsan' }, styleTag(), h(Setup, { ctx, onDone: refresh, pushToast }))

      const openNotebook = (name) => go({ kind: 'notebook', name })
      const openNote = (path) => go({ kind: 'note', path })
      const openDiary = () => go({ kind: 'diary' })
      const openDiaryDoc = (doc, date, heading) => go({ kind: 'diaryDoc', doc, date, heading })

      let content = null
      if (view.kind === 'home') {
        content = h(HomeView, {
          state, refresh, pushToast, todoOpen, hiddenStickies, privacyMode,
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
          state, name: view.name, refresh, pushToast, nonce: contentNonce,
          onBack: () => go({ kind: 'home' }),
          onOpenNote: openNote,
          onEdit: (notebook) => setModal({ kind: 'editNotebook', notebook }),
        })
      } else if (view.kind === 'note') {
        content = h(NoteView, {
          state, path: view.path, refresh, pushToast, nonce: contentNonce,
          onBack: () => { const nb = view.path.split('/')[0]; go({ kind: 'notebook', name: nb }) },
          onOpenNote: openNote,
        })
      } else if (view.kind === 'diary') {
        content = h(DiaryView, {
          state, pushToast,
          onOpenDoc: (doc, date, heading) => { if (!doc) { refresh(); return } openDiaryDoc(doc, date, heading) },
          onSettings: () => setDiarySettings(true),
        })
      } else if (view.kind === 'diaryDoc') {
        content = h(DiaryDocView, {
          state, doc: view.doc, date: view.date, heading: view.heading, refresh, pushToast, nonce: contentNonce,
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

      const gear = h(GearIcon, { size: 17 })

      const stickyTransparencyValue = Number.isFinite(Number(state.settings?.stickyTransparency))
        ? Number(state.settings.stickyTransparency)
        : (Number.isFinite(Number(state.settings?.stickyOpacity)) ? 100 - Number(state.settings.stickyOpacity) : 55)
      const todoTransparencyValue = Number.isFinite(Number(state.settings?.todoTransparency)) ? Number(state.settings.todoTransparency) : 36
      return h('div', {
        className: 'dsan',
        style: {
          '--dsan-sticky-opacity': `${100 - Math.max(0, Math.min(100, stickyTransparencyValue))}%`,
          '--dsan-todo-opacity': `${100 - Math.max(0, Math.min(100, todoTransparencyValue))}%`,
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
          }, h(ChatIcon)) : null,
          h('button', {
            className: 'dsan-btn ghost dsan-icon-btn', title: '重新加载插件页面', 'aria-label': '重新加载插件页面',
            onClick: () => onReload?.(),
          }, h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
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
            h('textarea', {
              className: cls('dsan-capture-input', captureFocused && 'open'),
              value: captureText,
              rows: 1,
              placeholder: '随手记一条，回车存档；可拖入或粘贴图片；/memo 便笺 · /todo 待办 · /note 笔记 · /agent 让 AI 整理',
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
            h('button', { className: 'dsan-btn primary', onClick: submitCapture }, '记上')),
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
            key: index, style: { display: 'inline-flex', alignItems: 'center', gap: 6 },
          },
            index > 0 ? h('span', { className: 'sep' }, '/') : null,
            item.onClick
              ? h('a', { onClick: item.onClick }, item.label)
              : h('span', { className: 'cur' }, item.label)))) : null) : null,
        h('div', { className: 'dsan-body' }, content),
        (view.kind === 'home' && state.configured !== false) ? h('div', { className: 'dsan-todo-dock', style: { top: captureFocused ? 144 : 104 } },
          h(TodoCard, {
            todo: state.todo, onSave: refresh, expanded: todoOpen, onExpandChange: setTodoOpen,
            hideDone: todoHideDone, pushToast,
            onReminderCreated: notifyReminderCreated,
            onHideDoneChange: (next) => {
              setTodoHideDone(next)
              api('ui.save', { todoHideDone: next }).catch(() => { })
            },
          })) : null,
        (view.kind === 'home' || (!floatingSticky && !pageMinSticky)) ? h('button', {
          className: 'dsan-fab', title: '新建便笺（可上下拖动）', style: { top: `${fabTop}px` },
          onPointerDown: fabDown, onPointerMove: fabMove, onPointerUp: fabUp,
          onClick: () => {
            if (fabMoved.current) { fabMoved.current = false; return }
            if (view.kind === 'home') createHomeSticky()
            else createPageSticky()
          },
        }, '＋ 便笺') : null,
        (view.kind !== 'home' && !floatingSticky && pageMinSticky) ? h('button', {
          className: 'dsan-fab dsan-fab-min', title: '展开便笺（可上下拖动）', style: { top: `${fabTop}px` },
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
          })) : null,
        h(Toasts, { items: toasts, dismiss }),
        dueReminders.length ? h('div', { className: 'dsan-reminder-stack' },
          dueReminders.map((reminder) => h(ReminderCard, {
            key: reminder.key, item: reminder,
            background: state.homeBackground ? assetUrl(state.homeBackground) : pluginAsset('earth-hero.webp'),
            onClose: () => closeReminderCard(reminder),
            onAutoClose: () => closeReminderCard(reminder),
            onStopPeriodic: () => stopPeriodicReminder(reminder),
          }))) : null,
        modal?.kind === 'newNotebook' ? h(NotebookModal, { onClose: () => setModal(null), pushToast, refresh }) : null,
        h('div', { className: 'dsan-surface-stack' }, ...surfaces.filter((surface) => surface.type === 'toast').map(renderSurface)),
        ...surfaces.filter((surface) => surface.type !== 'toast').map(renderSurface),
        agentReplyOpen && agentThread ? h(AgentReplyModal, {
          thread: agentThread,
          onClose: () => setAgentReplyOpen(false),
          onSend: (text) => {
            setAgentReplyOpen(false)
            executeAgent(text, currentContext(), [], agentThread?.history || [], agentJobRef.current)
          },
        }) : null,
        agentSessionOpen ? h(Modal, { title: 'agent 会话', wide: true, onClose: () => setAgentSessionOpen(false) },
          h('div', { style: { display: 'flex', gap: 12, minHeight: 240 } },
            h('div', { style: { width: 230, flex: 'none', minWidth: 0, borderRight: '1px solid var(--dsw-alias-border-l2)', paddingRight: 10, overflowY: 'auto', overflowX: 'hidden', maxHeight: '62vh' } },
              ...(agentSessionList.length ? agentSessionList.map((session) => h('button', {
                key: session.id, type: 'button', className: 'dsan-btn small',
                style: { display: 'block', width: '100%', maxWidth: '100%', boxSizing: 'border-box', height: 'auto', minHeight: 0, padding: '8px 10px', lineHeight: 1.35, textAlign: 'left', marginBottom: 8, opacity: agentSessionDetail?.id === session.id ? 1 : .72, overflow: 'hidden' },
                onClick: () => openAgentSession(session),
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 } },
                  h('div', { style: { fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 } }, fmtReminderTime(session.updatedAt) || '未知时间'),
                  h('span', { title: session.status || 'unknown', style: { width: 7, height: 7, borderRadius: '50%', flex: 'none', background: session.status === 'done' ? '#3fb950' : session.status === 'running' ? '#58a6ff' : session.status === 'waiting' ? '#d29922' : session.status === 'error' ? '#f85149' : '#8b949e' } })),
                h('div', { style: { fontSize: 10, opacity: .45, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, String(session.title || '未命名会话').split(/\r?\n/)[0].replace(/^\/agent\s*/, '').trim() || '未命名会话'))) : [h('div', { className: 'dsan-set-hint' }, '还没有 agent 会话')])),
            h('div', { style: { flex: 1, overflow: 'auto', maxHeight: '62vh' } },
              agentSessionDetail ? [
                h('div', { style: { fontWeight: 600, marginBottom: 8 } }, agentSessionDetail.args?.instruction || 'agent 会话'),
                h('div', { className: 'dsan-set-hint', style: { marginBottom: 10 } }, `状态：${agentSessionDetail.status || ''} · 更新：${String(agentSessionDetail.updatedAt || '').slice(0, 19).replace('T', ' ')}`),
                ...(agentSessionDetail.turns || []).map((turn, index) => h('div', { key: turn.id || index, style: { borderTop: '1px solid var(--dsw-alias-border-l2)', padding: '10px 0' } },
                  h('div', { style: { fontSize: 12, opacity: .65 } }, `第 ${index + 1} 轮 · ${turn.status || ''}`),
                  h('div', { style: { marginTop: 4, whiteSpace: 'pre-wrap' } }, turn.input || ''),
                  turn.question ? h('div', { className: 'dsan-set-hint', style: { marginTop: 6, whiteSpace: 'pre-wrap' } }, `提问：${turn.question}`) : null,
                  turn.answer?.label ? h('div', { className: 'dsan-set-hint', style: { marginTop: 4 } }, `回答：${turn.answer.label}`) : null,
                  turn.reply ? h('div', { style: { marginTop: 6, whiteSpace: 'pre-wrap' } }, turn.reply) : null)),
                agentSessionDetail.status === 'waiting' && (agentSessionDetail.surfaces || []).some((surface) => surface.status === 'waiting') ? h('button', {
                  type: 'button', className: 'dsan-btn', style: { marginTop: 12 },
                  onClick: () => {
                    const restored = (agentSessionDetail.surfaces || []).filter((surface) => surface.status === 'waiting').map((surface) => ({ ...surface, kind: 'agent-wait', waitingJob: agentSessionDetail.jobId }))
                    setSurfaces((prev) => [...prev.filter((item) => !restored.some((surface) => surface.id === item.id)), ...restored])
                    setAgentSessionOpen(false)
                  },
                }, '继续这个会话') : null,
              ] : h('div', { className: 'dsan-set-hint' }, '选择左侧会话查看轮次')),
          )) : null,
        settings ? h(SettingsModal, { state, ctx, pushToast, onClose: () => setSettings(false), refresh, onRootChanged: () => { setSurfaces([]); try { localStorage.removeItem('dsan-agent-surfaces'); localStorage.removeItem('dsan-active-agent-job') } catch { /* ignore */ }; go({ kind: 'home' }) } }) : null,
        diarySettings ? h(DiaryCoverModal, { state, pushToast, refresh, onClose: () => setDiarySettings(false) }) : null,
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

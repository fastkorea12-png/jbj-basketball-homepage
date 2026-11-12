/* JBJ 시안 검토 댓글 — 화면 요소를 눌러 의견을 남기고, 구글 시트(Apps Script)에 저장한다.
   운영 전에는 build.py의 REVIEW=False 로 끄면 이 파일과 review.css가 빠진다. */
(function () {
  'use strict';
  var API = window.JBJ_REVIEW_API || '';      // Apps Script 웹 앱 주소. 비어 있으면 이 기기에만 저장(시험용)
  var KEY = 'jbj-review-2026';
  var LOCAL = 'jbj-review-local';
  var NAME = 'jbj-reviewer';
  var page = window.JBJ_REVIEW_PAGE || location.pathname.split('/').pop() || 'index.html';
  var view = function () { return innerWidth <= 860 ? '모바일' : 'PC'; };

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- 저장소 ---------- */
  function localList() { try { return JSON.parse(store(LOCAL) || '[]'); } catch (e) { return []; } }
  function load() {
    if (!API) return Promise.resolve(localList().filter(function (c) { return c.page === page; }));
    return fetch(API + '?action=list&key=' + KEY + '&page=' + encodeURIComponent(page), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (!d.ok) throw new Error(d.error); return d.comments || []; });
  }
  function save(c) {
    if (!API) {
      var all = localList(); c.id = String(Date.now()); c.time = new Date().toLocaleString('ko-KR'); c.status = '';
      all.push(c); store(LOCAL, JSON.stringify(all)); return Promise.resolve(c);
    }
    c.key = KEY;
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(c) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (!d.ok) throw new Error(d.error); return d.comment; });
  }

  /* ---------- 요소 위치 기록 ---------- */
  var PICK = 'h1,h2,h3,h4,p,li,a,button,img,figure,article,label,dt,dd,blockquote,summary,legend,small,b,span.ph,.btn';
  function pathOf(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      if (el.id && !/^rv-/.test(el.id)) { parts.unshift('#' + CSS.escape(el.id)); break; }
      var i = 1, s = el;
      while ((s = s.previousElementSibling)) if (s.tagName === el.tagName) i++;
      parts.unshift(el.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
      el = el.parentElement;
    }
    if (!parts.length || parts[0].charAt(0) !== '#') parts.unshift('body');
    return parts.join(' > ');
  }
  function snippetOf(el) {
    var t = (el.getAttribute('alt') || el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g, ' ').trim();
    if (!t && el.tagName === 'IMG') t = '사진';
    return t.length > 60 ? t.slice(0, 58) + '…' : (t || el.tagName.toLowerCase());
  }
  function find(sel) { try { var el = document.querySelector(sel); if (!el) return null; var r = el.getBoundingClientRect(); return r.width || r.height ? el : null; } catch (e) { return null; } }

  /* ---------- 화면 ---------- */
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>';
  var fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'rv-fab'; fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = ICON + '<span>의견 남기기</span><b class="rv-count" hidden>0</b>';

  var panel = document.createElement('aside');
  panel.className = 'rv-panel'; panel.hidden = true; panel.setAttribute('aria-label', '시안 의견');
  panel.innerHTML =
    '<div class="rv-hd"><b>시안 의견</b><button type="button" class="rv-x" aria-label="의견 창 닫기">닫기</button></div>' +
    '<p class="rv-guide">의견을 남길 곳을 화면에서 눌러 주세요. 링크를 눌러도 이동하지 않아요.</p>' +
    '<form class="rv-form" hidden>' +
      '<p class="rv-target"></p>' +
      '<label class="rv-l" for="rv-text">의견</label>' +
      '<textarea id="rv-text" rows="3" required placeholder="예: 이 문구는 더 짧았으면 좋겠어요…"></textarea>' +
      '<label class="rv-l" for="rv-name">이름</label>' +
      '<input id="rv-name" autocomplete="name" required placeholder="예: 홍이사…">' +
      '<div class="rv-acts"><button type="button" class="rv-cancel">취소</button><button type="submit" class="rv-send">의견 남기기</button></div>' +
      '<p class="rv-msg" aria-live="polite"></p>' +
    '</form>' +
    '<div class="rv-list-hd">이 페이지 의견 <span class="rv-n">0</span></div>' +
    '<ol class="rv-list"></ol>' +
    '<p class="rv-foot">' + (API ? '남긴 의견은 담당자에게 바로 전달돼요.' : '시험 모드: 의견이 이 기기에만 저장돼요.') + '</p>';

  var pins = document.createElement('div');
  pins.className = 'rv-pins';
  document.body.append(pins, panel, fab);

  var form = panel.querySelector('.rv-form'), list = panel.querySelector('.rv-list');
  var nameIn = panel.querySelector('#rv-name'), textIn = panel.querySelector('#rv-text'), msg = panel.querySelector('.rv-msg');
  nameIn.value = store(NAME) || '';
  var comments = [], target = null, on = false;

  function setOn(v) {
    on = v; panel.hidden = !v; fab.setAttribute('aria-expanded', String(v));
    document.documentElement.classList.toggle('rv-on', v);
    if (!v) pick(null);
    try { sessionStorage.setItem('jbj-rv-on', v ? '1' : ''); } catch (e) {}
  }
  function pick(el) {
    if (target) target.classList.remove('rv-target-el');
    target = el;
    if (!el) { form.hidden = true; return; }
    el.classList.add('rv-target-el');
    form.hidden = false; msg.textContent = '';
    panel.querySelector('.rv-target').innerHTML = '<span>선택한 곳</span>' + esc(snippetOf(el));
    textIn.focus({ preventScroll: true });
  }

  function render() {
    var n = comments.length;
    fab.querySelector('.rv-count').textContent = n; fab.querySelector('.rv-count').hidden = !n;
    panel.querySelector('.rv-n').textContent = n;
    pins.innerHTML = ''; list.innerHTML = '';
    if (!n) list.innerHTML = '<li class="rv-empty">아직 남긴 의견이 없어요.</li>';
    comments.forEach(function (c, i) {
      var el = find(c.selector), num = i + 1, done = /완료/.test(c.status || '');
      var li = document.createElement('li');
      li.className = done ? 'done' : '';
      li.innerHTML = '<b class="rv-no">' + num + '</b><div><p class="rv-meta">' + esc(c.name) + ' · ' + esc(c.time) + ' · ' + esc(c.view) +
        (done ? ' · <em>반영 완료</em>' : '') + '</p><p class="rv-body">' + esc(c.text) + '</p><p class="rv-where">' + esc(c.snippet) +
        (el ? '' : ' <i>(' + (c.view === view() ? '위치가 바뀌었어요' : c.view + ' 화면에서 남김') + ')</i>') + '</p></div>';
      if (el) li.addEventListener('click', function () { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); flash(el); });
      list.appendChild(li);
      if (el) {
        var r = el.getBoundingClientRect(), p = document.createElement('button');
        p.type = 'button'; p.className = 'rv-pin' + (done ? ' done' : ''); p.textContent = num;
        p.setAttribute('aria-label', num + '번 의견: ' + c.text);
        p.style.top = Math.max(0, r.top + scrollY - 10) + 'px';
        p.style.left = Math.min(document.documentElement.clientWidth - 30, r.right + scrollX - 14) + 'px';
        p.addEventListener('click', function (e) { e.stopPropagation(); setOn(true); var it = list.children[i]; it.scrollIntoView({ block: 'nearest' }); flashLi(it); });
        pins.appendChild(p);
      }
    });
  }
  function flash(el) { el.classList.add('rv-flash'); setTimeout(function () { el.classList.remove('rv-flash'); }, 1400); }
  function flashLi(li) { li.classList.add('rv-hl'); setTimeout(function () { li.classList.remove('rv-hl'); }, 1400); }
  function refresh() { load().then(function (c) { comments = c; render(); }).catch(function () { panel.querySelector('.rv-foot').textContent = '의견을 불러오지 못했어요. 잠시 후 다시 열어 주세요.'; }); }

  /* ---------- 동작 ---------- */
  fab.addEventListener('click', function () { setOn(!on); });
  panel.querySelector('.rv-x').addEventListener('click', function () { setOn(false); });
  panel.querySelector('.rv-cancel').addEventListener('click', function () { pick(null); });

  document.addEventListener('click', function (e) {
    if (!on || e.target.closest('.rv-panel,.rv-fab,.rv-pin')) return;
    e.preventDefault(); e.stopPropagation();
    var el = e.target.closest(PICK) || e.target;
    pick(el);
  }, true);
  document.addEventListener('submit', function (e) { if (on && !e.target.closest('.rv-panel')) { e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && on) setOn(false); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = textIn.value.trim(), name = nameIn.value.trim();
    if (!target) return;
    if (!text) { msg.textContent = '의견을 적어 주세요.'; textIn.focus(); return; }
    if (!name) { msg.textContent = '이름을 적어 주세요.'; nameIn.focus(); return; }
    store(NAME, name);
    var btn = form.querySelector('.rv-send'); btn.disabled = true; msg.textContent = '남기는 중…';
    save({ page: page, view: view(), name: name, text: text, selector: pathOf(target), snippet: snippetOf(target) })
      .then(function (c) { comments.push(c); textIn.value = ''; pick(null); render(); msg.textContent = ''; })
      .catch(function () { msg.textContent = '저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'; })
      .then(function () { btn.disabled = false; });
  });

  var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(render, 150); });
  addEventListener('load', render);
  try { if (sessionStorage.getItem('jbj-rv-on')) setOn(true); } catch (e) {}
  refresh();
})();

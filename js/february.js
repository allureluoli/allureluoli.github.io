/* ===================================================================
 *  February Archive · 全站交互
 * =================================================================== */
(function () {
    'use strict';

    var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
    var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

    var doc = document.documentElement;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var root = { timers: [] };

    /* -------------------- 主题切换 -------------------- */
    function setTheme(mode) {
        doc.setAttribute('data-theme', mode);
        doc.style.colorScheme = mode;
        try { localStorage.setItem('february-theme', mode); } catch (e) {}
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', mode === 'dark' ? '#262624' : '#faf9f5');
    }

    var themeBtn = $('#f-theme');
    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            setTheme(doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        });
    }

    /* -------------------- 顶栏 / 进度条 / 回顶 -------------------- */
    var dock = $('#f-dock');
    var progress = $('#f-progress');
    var toTop = $('#f-totop');
    var menuBtn = $('.f-dock-menu');
    var ticking = false;

    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
            ticking = false;
            var y = window.pageYOffset || doc.scrollTop;

            if (dock) dock.classList.toggle('is-solid', y > 60);

            if (progress) {
                var dh = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
                var p = Math.min(1, Math.max(0, y / dh));
                progress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
            }

            if (toTop) toTop.classList.toggle('is-on', y > 600);
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    if (toTop) {
        toTop.addEventListener('click', function () {
            try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
            catch (e) { window.scrollTo(0, 0); }
        });
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', function () {
            var open = document.body.classList.contains('mu');
            menuBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
            var menu = $('#f-menu');
            if (menu) menu.setAttribute('aria-hidden', open ? 'true' : 'false');
        });
    }

    /* -------------------- 平滑锚点 -------------------- */
    document.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a) return;
        var id = a.getAttribute('href');
        if (!id || id === '#' || id.length < 2) return;
        var el = document.getElementById(id.slice(1));
        if (!el) return;
        e.preventDefault();
        var top = el.getBoundingClientRect().top + window.pageYOffset - 80;
        try { window.scrollTo({ top: top, behavior: 'smooth' }); }
        catch (err) { window.scrollTo(0, top); }
    });

    /* -------------------- 打字机 -------------------- */
    function initTyping() {
        var el = $('#f-typing');
        var data = $('#f-typing-data');
        if (!el || !data) return;

        var list;
        try { list = JSON.parse(data.textContent); } catch (e) { return; }
        if (!list || !list.length) return;
        if (reduceMotion) { el.textContent = list[0]; return; }

        var idx = 0, pos = 0, deleting = false;
        (function tick() {
            var text = list[idx % list.length];
            if (!deleting) {
                pos++;
                el.textContent = text.slice(0, pos);
                if (pos >= text.length) {
                    deleting = true;
                    root.timers.push(setTimeout(tick, 2100));
                    return;
                }
                root.timers.push(setTimeout(tick, 70 + Math.random() * 60));
            } else {
                pos -= 1;
                el.textContent = text.slice(0, Math.max(0, pos));
                if (pos <= 0) {
                    deleting = false;
                    idx++;
                    root.timers.push(setTimeout(tick, 420));
                    return;
                }
                root.timers.push(setTimeout(tick, 26 + Math.random() * 30));
            }
        })();
    }

    /* -------------------- 数字滚动 -------------------- */
    function initCounters() {
        var els = $$('.f-hero-stats b[data-count]');
        if (!els.length) return;

        function run(el) {
            if (el.dataset.done) return;
            el.dataset.done = '1';
            var target = parseFloat(el.getAttribute('data-count')) || 0;
            if (reduceMotion) { el.textContent = target.toLocaleString(); return; }
            var start = null, dur = 1300;
            function step(ts) {
                if (start === null) start = ts;
                var k = Math.min(1, (ts - start) / dur);
                var v = Math.round(target * (1 - Math.pow(1 - k, 3)));
                el.textContent = v.toLocaleString();
                if (k < 1) requestAnimationFrame(step);
                else el.textContent = target.toLocaleString();
            }
            requestAnimationFrame(step);
        }

        if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
            });
        }, { threshold: .4 });
        els.forEach(function (el) { io.observe(el); });
    }

    /* -------------------- 星尘 -------------------- */
    function initStars() {
        var box = $('#f-stars');
        if (!box || reduceMotion) return;
        var frag = document.createDocumentFragment();
        for (var i = 0; i < 18; i++) {
            var s = document.createElement('span');
            s.className = 'f-star';
            var size = (1.4 + Math.random() * 1.8).toFixed(1) + 'px';
            s.style.width = size;
            s.style.height = size;
            s.style.left = (2 + Math.random() * 96).toFixed(2) + '%';
            s.style.top = (10 + Math.random() * 80).toFixed(2) + '%';
            s.style.animationDelay = (Math.random() * 9).toFixed(2) + 's';
            s.style.animationDuration = (7 + Math.random() * 8).toFixed(2) + 's';
            frag.appendChild(s);
        }
        box.appendChild(frag);
    }

    /* -------------------- 首图淡入 -------------------- */
    function initCover() {
        var cover = $('#cover');
        if (!cover) return;
        var show = function () { cover.classList.add('f-loaded'); };
        if (cover.complete && cover.naturalWidth) show();
        else cover.addEventListener('load', show);
    }

    /* -------------------- 入场动画 -------------------- */
    function initReveal() {
        var items = $$('[data-reveal]').filter(function (el) { return !el.classList.contains('is-in'); });
        if (!items.length) return;
        if (!('IntersectionObserver' in window) || reduceMotion) {
            items.forEach(function (el) { el.classList.add('is-in'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                en.target.classList.add('is-in');
                io.unobserve(en.target);
            });
        }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
        items.forEach(function (el) { io.observe(el); });
    }

    /* -------------------- 代码块复制 -------------------- */
    function initCopy() {
        $$('.f-content pre').forEach(function (pre) {
            if (pre.parentNode && pre.parentNode.classList.contains('f-pre-wrap')) return;
            var wrap = document.createElement('div');
            wrap.className = 'f-pre-wrap';
            pre.parentNode.insertBefore(wrap, pre);
            wrap.appendChild(pre);

            var btn = document.createElement('button');
            btn.className = 'f-copy-btn';
            btn.type = 'button';
            btn.textContent = 'COPY';
            wrap.appendChild(btn);

            btn.addEventListener('click', function () {
                var text = pre.innerText || pre.textContent || '';
                var done = function () {
                    btn.textContent = 'COPIED';
                    btn.classList.add('is-done');
                    setTimeout(function () {
                        btn.textContent = 'COPY';
                        btn.classList.remove('is-done');
                    }, 1600);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(done, function () {});
                } else {
                    var ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    try { document.execCommand('copy'); done(); } catch (e) {}
                    document.body.removeChild(ta);
                }
            });
        });
    }

    /* -------------------- 目录高亮 -------------------- */
    function initToc() {
        var toc = $('#f-toc-card');
        if (!toc) return;
        var links = $$('.toc-link', toc);
        if (!links.length) return;

        var map = {};
        links.forEach(function (a) {
            var href = a.getAttribute('href') || '';
            if (href.charAt(0) !== '#') return;
            var id = decodeURIComponent(href.slice(1));
            var h = document.getElementById(id);
            if (h) map[id] = a;
        });
        var heads = Object.keys(map).map(function (id) { return document.getElementById(id); });
        if (!heads.length || !('IntersectionObserver' in window)) return;

        var current = null;
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                if (current) current.parentNode.classList.remove('is-active');
                var link = map[en.target.id];
                if (link) { link.parentNode.classList.add('is-active'); current = link; }
            });
        }, { rootMargin: '-96px 0px -70% 0px', threshold: 0 });

        heads.forEach(function (h) { io.observe(h); });
    }

    /* -------------------- 加载更多分页总数 -------------------- */
    function initPager() {
        var pager = $('#pager');
        if (pager && pager.dataset.total) {
            var total = parseInt(pager.dataset.total, 10);
            if (total > 0) window.Pages = total;
        }
    }

    /* -------------------- 关于页脚本补载（pjax 插入时） -------------------- */
    function ensureAbout() {
        var root = document.querySelector('.about-page');
        if (!root) {
            if (typeof window.__abTeardown === 'function') {
                try { window.__abTeardown(); } catch (e) {}
            }
            return;
        }
        if (document.getElementById('f-about-js')) return;
        var link = document.querySelector('link[href*="css/about.css"]');
        var src = link ? link.getAttribute('href').replace(/css\/about\.css.*$/, 'js/about.js') : '/js/about.js';
        var s = document.createElement('script');
        s.id = 'f-about-js';
        s.src = src;
        document.body.appendChild(s);
    }

    /* -------------------- 统一初始化 -------------------- */
    function enhance() {
        initCopy();
        initReveal();
        initToc();
        initPager();
        ensureAbout();
    }

    function boot() {
        setTheme(doc.getAttribute('data-theme') || 'light');
        initTyping();
        initCounters();
        initStars();
        initCover();
        enhance();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    /* pjax 换页后补一次增强（主题的预览层会替换 #single 内容） */
    var preview = $('#preview');
    if (preview && window.MutationObserver) {
        var mo = new MutationObserver(function () {
            clearTimeout(root.pjaxTimer);
            root.pjaxTimer = setTimeout(function () {
                enhance();
                onScroll();
            }, 260);
        });
        mo.observe(preview, { childList: true, subtree: false });
    }
})();

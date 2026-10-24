/* ===================================================================
 *  About 页面交互（原生 JS，无依赖）
 *  - 打字机 / 数字滚动 / 技能条 / 入场动画 / 滚动章节高亮 / 时钟
 *  - 可重复初始化（主题预览层会反复替换 #single 内容）
 * =================================================================== */
(function () {
    'use strict';

    var DATA = window.__AB_DATA || { typing: [], nav: [] };

    function qsa(sel, ctx) {
        return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    }

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function boot() {
        var root = document.querySelector('.about-page');
        if (!root || root.__abReady) return;

        /* 主题的预览层可能替换过内容：同一张 DOM 重复执行时直接跳过，
           换了新 DOM 才清理上一次的定时器/观察器 */
        if (typeof window.__abTeardown === 'function') {
            try { window.__abTeardown(); } catch (e) {}
        }

        root.__abReady = true;

        var timers = [];
        var observers = [];
        var onScrollList = [];

        window.__abTeardown = function () {
            timers.forEach(clearTimeout);
            timers.forEach(clearInterval);
            observers.forEach(function (o) {
                try { o.disconnect(); } catch (e) {}
            });
            onScrollList.forEach(function (fn) {
                window.removeEventListener('scroll', fn);
            });
            window.__abTeardown = null;
        };

        /* ---------------- 打字机 ---------------- */
        (function typing() {
            var el = root.querySelector('#ab-typing');
            var list = (DATA.typing && DATA.typing.length) ? DATA.typing : [];
            if (!el || !list.length) return;

            var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reduce) { el.textContent = list[0]; return; }

            var idx = 0, pos = 0, deleting = false;

            function tick() {
                var text = list[idx % list.length];
                if (!deleting) {
                    pos++;
                    el.textContent = text.slice(0, pos);
                    if (pos >= text.length) {
                        deleting = true;
                        timers.push(setTimeout(tick, 1800));
                        return;
                    }
                    timers.push(setTimeout(tick, rand(70, 130)));
                } else {
                    pos--;
                    el.textContent = text.slice(0, pos);
                    if (pos <= 0) {
                        deleting = false;
                        idx++;
                        timers.push(setTimeout(tick, 420));
                        return;
                    }
                    timers.push(setTimeout(tick, rand(28, 55)));
                }
            }
            timers.push(setTimeout(tick, 600));
        })();

        /* ---------------- 星尘粒子 ---------------- */
        (function sparks() {
            var box = root.querySelector('#ab-sparks');
            if (!box) return;
            var frag = document.createDocumentFragment();
            for (var i = 0; i < 18; i++) {
                var s = document.createElement('span');
                s.className = 'ab-spark';
                s.style.left = rand(2, 98).toFixed(2) + '%';
                s.style.top = rand(12, 88).toFixed(2) + '%';
                s.style.opacity = '0';
                s.style.animationDelay = rand(0, 9).toFixed(2) + 's';
                s.style.animationDuration = rand(7, 15).toFixed(2) + 's';
                var size = rand(1.5, 3.2).toFixed(1) + 'px';
                s.style.width = size;
                s.style.height = size;
                frag.appendChild(s);
            }
            box.appendChild(frag);
        })();

        /* ---------------- 数字滚动 ---------------- */
        (function counters() {
            var spans = qsa('.ab-count', root);
            if (!spans.length) return;

            function fmt(v, dec) {
                if (dec > 0) return v.toFixed(dec);
                return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            }

            function run(el) {
                if (el.__done) return;
                el.__done = true;
                var target = parseFloat(el.getAttribute('data-value')) || 0;
                var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
                var dur = 1300, start = null;

                function step(ts) {
                    if (start === null) start = ts;
                    var k = Math.min(1, (ts - start) / dur);
                    el.textContent = fmt(target * (1 - Math.pow(1 - k, 3)), dec);
                    if (k < 1) requestAnimationFrame(step);
                    else el.textContent = fmt(target, dec);
                }
                requestAnimationFrame(step);
            }

            if (!('IntersectionObserver' in window)) { spans.forEach(run); return; }

            var map = [];
            spans.forEach(function (el) {
                var box = el.parentNode;
                while (box && box !== root && String(box.className || '').indexOf('ab-stat') === -1) {
                    box = box.parentNode;
                }
                map.push({ el: el, box: box || el });
            });

            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    map.forEach(function (m) { if (m.box === en.target) run(m.el); });
                    io.unobserve(en.target);
                });
            }, { threshold: .3 });

            map.forEach(function (m) { io.observe(m.box); });
            observers.push(io);
        })();

        /* ---------------- 入场动画 + 技能条 ---------------- */
        (function reveal() {
            var items = qsa('.reveal, .ab-skill', root);
            if (!items.length) return;

            if (!('IntersectionObserver' in window)) {
                items.forEach(function (el) { el.classList.add('in'); });
                return;
            }

            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    en.target.classList.add('in');
                    io.unobserve(en.target);
                });
            }, { threshold: .18, rootMargin: '0px 0px -8% 0px' });

            items.forEach(function (el) { io.observe(el); });
            observers.push(io);
        })();

        /* ---------------- 悬浮导航：显示 + 章节高亮 ---------------- */
        (function nav() {
            var bar = root.querySelector('#ab-nav');
            var hero = root.querySelector('.ab-hero');
            if (!bar || !hero) return;

            var links = qsa('a', bar);
            var secs = qsa('.ab-sec', root);
            var ticking = false;

            function heroBottom() {
                var r = hero.getBoundingClientRect();
                return r.bottom + window.pageYOffset;
            }

            function onScroll() {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(function () {
                    ticking = false;
                    var y = window.pageYOffset || document.documentElement.scrollTop;
                    var limit = heroBottom() - 90;
                    var footer = root.querySelector('.ab-footer');
                    var pastEnd = footer ? (y + window.innerHeight > footer.getBoundingClientRect().bottom + window.pageYOffset - 20) : false;
                    if (y > limit + 200 && !pastEnd) bar.classList.add('is-on');
                    else bar.classList.remove('is-on');
                    spy(y);
                });
            }

            function spy(y) {
                var current = null;
                var offset = 120;
                secs.forEach(function (s) {
                    var top = s.getBoundingClientRect().top + y;
                    if (top - offset <= y) current = s.id;
                });
                links.forEach(function (a) {
                    a.classList.toggle('is-active', a.getAttribute('data-target') === current);
                });
            }

            links.forEach(function (a) {
                a.addEventListener('click', function (e) {
                    var id = a.getAttribute('data-target');
                    var target = document.getElementById(id);
                    if (!target) return;
                    e.preventDefault();
                    var y = target.getBoundingClientRect().top + window.pageYOffset - 78;
                    try {
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    } catch (err) {
                        window.scrollTo(0, y);
                    }
                });
            });

            var a = root.querySelector('.ab-scroll-cue');
            if (a) {
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    var y = heroBottom() - 60;
                    try { window.scrollTo({ top: y, behavior: 'smooth' }); }
                    catch (err) { window.scrollTo(0, y); }
                });
            }

            onScrollList.push(onScroll);
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll);
            onScrollList.push(onScroll);
            onScroll();
        })();

        /* ---------------- 鼠标跟随光斑 ---------------- */
        (function spotlight() {
            var cards = qsa('[data-spot], .ab-friend, .ab-stat', root);
            if (!cards.length) return;
            var fine = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : true;
            if (!fine) return;

            cards.forEach(function (card) {
                card.addEventListener('mousemove', function (e) {
                    var r = card.getBoundingClientRect();
                    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
                });
            });
        })();

        /* ---------------- 本地时钟 ---------------- */
        (function clock() {
            var el = root.querySelector('#ab-clock');
            if (!el) return;
            var f;
            try {
                f = new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Asia/Shanghai',
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            } catch (e) { f = null; }

            function paint() {
                var d = new Date();
                if (f) { el.textContent = f.format(d); return; }
                var h = (d.getUTCHours() + 8) % 24;
                var p = function (n) { return (n < 10 ? '0' : '') + n; };
                el.textContent = p(h) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds());
            }
            paint();
            timers.push(setInterval(paint, 1000));
        })();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();

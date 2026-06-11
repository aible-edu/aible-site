/* Aible 리뉴얼 V2 — 인터랙티브 모션 (vanilla, 의존성 0)
   - html.js 클래스는 <head> 인라인 스크립트가 추가 (JS 미작동 시에도 콘텐츠 표시)
   - 모든 루프는 화면 밖/탭 비활성 시 일시정지 */
(function () {
  'use strict';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  /* ── 1. 로드 시 히어로 등장 ── */
  requestAnimationFrame(() => document.body.classList.add('loaded'));

  /* ── 2. 스크롤 진행바 + NAV 그림자 ── */
  const progress = document.getElementById('progress');
  const nav = document.querySelector('nav.site');
  let scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 8);
      scrollTicking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── 3. 공유 포인터 (단일 mousemove 리스너):
         히어로 스포트라이트 + 데모 창 3D 틸트가 함께 사용 ── */
  const pointer = { x: innerWidth / 2, y: innerHeight * 0.3 };
  const spotEl = document.querySelector('.hero-spot');
  const demoWin = document.getElementById('demo');
  if (!reduceMotion && finePointer) {
    let mmRaf = null;
    addEventListener('mousemove', e => {
      pointer.x = e.clientX; pointer.y = e.clientY;
      if (mmRaf) return;
      mmRaf = requestAnimationFrame(() => {
        mmRaf = null;
        if (demoWin) {
          const r = demoWin.getBoundingClientRect();
          const px = (pointer.x - (r.left + r.width / 2)) / innerWidth;
          const py = (pointer.y - (r.top + r.height / 2)) / innerHeight;
          demoWin.style.transform =
            'perspective(1100px) rotateY(' + (px * 9).toFixed(2) + 'deg) rotateX(' + (-py * 9).toFixed(2) + 'deg)';
        }
      });
    }, { passive: true });

    if (spotEl) {
      let sx = pointer.x, sy = pointer.y;
      (function follow() {
        sx += (pointer.x - sx) * 0.08;
        sy += (pointer.y - sy) * 0.08;
        spotEl.style.left = sx + 'px';
        spotEl.style.top = sy + 'px';
        requestAnimationFrame(follow);
      })();
    }
  }

  /* ── 4. 회전 키워드 — 데모 시나리오와 동기화 (데모 루프가 swapRotator 호출) ── */
  const rotator = document.querySelector('.rotator');
  const ROT_WORDS = ['보고서 초안', '회의록 요약', '고객 메일'];
  const rotWidths = {};
  function measureRotator() {
    if (!rotator) return;
    const probe = document.createElement('span');
    probe.className = 'rotator';
    probe.style.cssText = 'position:absolute; visibility:hidden; white-space:nowrap; width:auto;';
    rotator.parentElement.appendChild(probe);
    for (const w of ROT_WORDS) {
      probe.textContent = w;
      rotWidths[w] = Math.ceil(probe.offsetWidth);
    }
    probe.remove();
    if (rotWidths[rotator.textContent]) {
      rotator.style.width = rotWidths[rotator.textContent] + 'px';
    }
  }
  function swapRotator(word) {
    if (!rotator || reduceMotion || rotator.textContent === word) return;
    rotator.classList.add('swap');
    setTimeout(() => {
      rotator.textContent = word;
      if (rotWidths[word]) rotator.style.width = rotWidths[word] + 'px';
      rotator.classList.remove('swap');
    }, 320);
  }
  if (rotator && !reduceMotion) {
    measureRotator();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureRotator);
    addEventListener('resize', measureRotator);
  }

  /* ── 5. 스크롤 리빌 + 카운터 ── */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-visible');
      if (e.target.dataset.count !== undefined) startCounters(e.target);
      io.unobserve(e.target);
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal, .reveal-group, [data-count]').forEach(el => io.observe(el));

  function startCounters(scope) {
    scope.querySelectorAll('.count').forEach(el => {
      const target = parseFloat(el.dataset.target);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const done = () => { el.textContent = prefix + target.toFixed(decimals) + suffix; };
      if (reduceMotion) { done(); return; }
      const dur = 1500, t0 = performance.now();
      (function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick); else done();
      })(t0);
    });
  }

  /* ── 6. 스포트라이트 카드 (target 필요해서 별도 위임 리스너) ── */
  if (!reduceMotion && finePointer) {
    document.addEventListener('mousemove', e => {
      const card = e.target.closest('.spot');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ── 7. 프로그램 카드 틸트 ── */
  if (!reduceMotion && finePointer) {
    document.querySelectorAll('.prog').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'perspective(900px) rotateY(' + (px * 6).toFixed(2) + 'deg) rotateX(' + (-py * 6).toFixed(2) + 'deg) translateY(-3px)';
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ── 8. 스티키 프로세스: 보이는 스텝 활성화 ── */
  const steps = document.querySelectorAll('.p-step');
  const dots = document.querySelectorAll('.process-dots span');
  if (steps.length) {
    const sio = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const i = [...steps].indexOf(e.target);
        steps.forEach((s, j) => s.classList.toggle('active', j === i));
        dots.forEach((d, j) => d.classList.toggle('on', j <= i));
      }
    }, { threshold: 0.55 });
    steps.forEach(s => sio.observe(s));
  }

  /* ── 9. 마그네틱 CTA 버튼 ── */
  const magnet = document.getElementById('magnet');
  if (magnet && !reduceMotion && finePointer) {
    const wrap = magnet.parentElement;
    wrap.addEventListener('mousemove', e => {
      const r = magnet.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < 160) {
        magnet.style.transform = 'translate(' + (dx * 0.18).toFixed(1) + 'px,' + (dy * 0.18).toFixed(1) + 'px)';
      } else {
        magnet.style.transform = '';
      }
    });
    wrap.addEventListener('mouseleave', () => { magnet.style.transform = ''; });
  }

  /* ── 10. 뉴럴 입자망 캔버스 — 데스크톱 전용, 화면 밖/탭 숨김 시 정지 ── */
  const canvas = document.getElementById('neural');
  if (canvas && !reduceMotion && finePointer) {
    const nctx = canvas.getContext('2d');
    const COUNT = 44, LINK = 110, DPR = Math.min(2, devicePixelRatio || 1);
    let W = 0, H = 0;
    const nodes = [];
    let neuralOn = false, neuralRaf = null;

    function resize() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      nctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (!nodes.length) {
        for (let i = 0; i < COUNT; i++) {
          nodes.push({
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
          });
        }
      }
    }
    resize();
    addEventListener('resize', resize);

    function frame() {
      if (!neuralOn || document.hidden) { neuralRaf = null; return; }
      const rect = canvas.getBoundingClientRect();
      const mx = pointer.x - rect.left, my = pointer.y - rect.top;
      nctx.clearRect(0, 0, W, H);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        const dx = n.x - mx, dy = n.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1 && d2 < 8100) {
          const d = Math.sqrt(d2);
          n.x += dx / d * (1 - d / 90) * 1.8;
          n.y += dy / d * (1 - d / 90) * 1.8;
        }
      }
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            nctx.strokeStyle = 'rgba(124,92,255,' + (0.18 * (1 - d / LINK)).toFixed(3) + ')';
            nctx.lineWidth = 1;
            nctx.beginPath(); nctx.moveTo(a.x, a.y); nctx.lineTo(b.x, b.y); nctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        nctx.fillStyle = 'rgba(168,157,255,.85)';
        nctx.beginPath(); nctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2); nctx.fill();
      }
      neuralRaf = requestAnimationFrame(frame);
    }
    function kickNeural() {
      if (neuralOn && !document.hidden && !neuralRaf) neuralRaf = requestAnimationFrame(frame);
    }
    new IntersectionObserver(es => {
      for (const e of es) neuralOn = e.isIntersecting;
      kickNeural();
    }, { threshold: 0.05 }).observe(canvas);
    document.addEventListener('visibilitychange', kickNeural);
  }

  /* ── 11. AI 라이브 워크 데모 — 회전 키워드와 동기화, 화면 밖이면 대기 ── */
  const demoBody = document.getElementById('demo-body');
  const SCENARIOS = [
    {
      word: '보고서 초안',
      req: '이번 주 영업 주간보고 초안 만들어줘',
      steps: ['판매 데이터 불러오기', '핵심 지표 요약', '보고서 초안 작성'],
      title: '주간보고 초안 완성',
      metric: '32분 → 4분',
      badge: '작성 시간 87% 절감',
    },
    {
      word: '회의록 요약',
      req: '오늘 회의록 정리하고 액션아이템 뽑아줘',
      steps: ['녹취 텍스트 분석', '결정사항 추출', '담당자별 액션아이템 정리'],
      title: '회의록 + 액션아이템 8건',
      metric: '45분 → 3분',
      badge: '정리 시간 93% 절감',
    },
    {
      word: '고객 메일',
      req: '고객 문의 답변 메일 초안 써줘',
      steps: ['문의 내용 분류', '사내 가이드 반영', '톤 다듬기'],
      title: '답변 메일 초안 완성',
      metric: '25분 → 2분',
      badge: '응대 시간 92% 절감',
    },
  ];

  if (demoBody) {
    let demoVisible = true;
    if (demoWin) {
      new IntersectionObserver(es => {
        for (const e of es) demoVisible = e.isIntersecting;
      }, { threshold: 0.1 }).observe(demoWin);
    }
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const make = (cls, html) => {
      const d = document.createElement('div');
      d.className = cls;
      if (html) d.innerHTML = html;
      return d;
    };
    const renderDone = s =>
      '<div class="msg user">' + s.req + '</div>' +
      s.steps.map(t => '<div class="step-line in"><i class="check">✓</i><span>' + t + '</span></div>').join('') +
      '<div class="result-card in"><div class="r-title">' + s.title + '</div><div class="r-metric">' + s.metric + '</div><span class="r-badge">' + s.badge + '</span></div>';

    if (reduceMotion) {
      demoBody.innerHTML = renderDone(SCENARIOS[0]);
    } else {
      (async function loop() {
        let i = 0;
        for (;;) {
          // 화면 밖이거나 탭이 숨겨져 있으면 대기
          while (!demoVisible || document.hidden) await sleep(500);
          const s = SCENARIOS[i % SCENARIOS.length];
          swapRotator(s.word); // 왼쪽 헤드라인 키워드와 동기화
          demoBody.innerHTML = '';
          // 1) 요청 타이핑
          const u = make('msg user');
          demoBody.appendChild(u);
          for (const ch of s.req) { u.textContent += ch; await sleep(28); }
          await sleep(380);
          // 2) 생각 중
          const think = make('think', '<span></span><span></span><span></span>');
          demoBody.appendChild(think);
          await sleep(900);
          think.remove();
          // 3) 단계 처리
          for (const t of s.steps) {
            const line = make('step-line', '<i class="spinner"></i><span>' + t + '</span>');
            demoBody.appendChild(line);
            requestAnimationFrame(() => line.classList.add('in'));
            await sleep(640);
            line.querySelector('.spinner').outerHTML = '<i class="check">✓</i>';
          }
          await sleep(320);
          // 4) 결과 카드
          const res = make('result-card',
            '<div class="r-title">' + s.title + '</div><div class="r-metric">' + s.metric + '</div><span class="r-badge">' + s.badge + '</span>');
          demoBody.appendChild(res);
          requestAnimationFrame(() => res.classList.add('in'));
          await sleep(3000);
          i++;
        }
      })();
    }
  }

  /* ── 12. 모바일 네비 ── */
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    const setOpen = (open) => {
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    };
    toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }
})();

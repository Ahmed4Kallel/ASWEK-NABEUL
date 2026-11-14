/* ASWEK AI - chatbot local (base de connaissances pré-générée, aucun appel réseau) */
(function () {
  const root = document.createElement('div');
  root.className = 'as-chatbot';
  root.innerHTML = `
    <div class="as-chatbot-panel" id="asChatPanel">
      <div class="as-chatbot-head">
        <div><strong data-as="title">Assistant ASWEK</strong><div class="small" data-as="subtitle">Posez vos questions sur nos produits</div></div>
        <button id="asChatClose" aria-label="Fermer" style="background:none;border:0;color:#fff;font-size:22px;">&times;</button>
      </div>
      <div class="as-chatbot-body" id="asChatBody"></div>
      <div class="as-chatbot-foot">
        <input id="asChatInput" data-as-ph="placeholder" placeholder="Écrivez votre message...">
        <button id="asChatSend" data-as="send">Envoyer</button>
      </div>
    </div>
    <button class="as-chatbot-toggle" id="asChatToggle" aria-label="Assistant ASWEK">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c5.5 0 10 3.58 10 8s-4.5 8-10 8c-1.24 0-2.43-.18-3.53-.5C5.55 21 2 21 2 21c2.33-2.33 2.7-3.9 2.75-4.5C3.05 15.07 2 13.13 2 11c0-4.42 4.5-8 10-8Z"/></svg>
    </button>`;
  document.body.appendChild(root);

  const toggle = document.getElementById('asChatToggle');
  const closeB = document.getElementById('asChatClose');
  const body = document.getElementById('asChatBody');
  const input = document.getElementById('asChatInput');
  const send = document.getElementById('asChatSend');

  let KB = null, I18N = null, LANG = (localStorage.getItem('aswek_lang') || 'fr').toLowerCase();
  const t = (k, fb) => (I18N && I18N[LANG] && I18N[LANG][k]) || fb;

  function load() {
    const g = (u) => fetch(u, { cache: 'force-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
    return Promise.all([g('data/ai/chatbot-kb.json'), g('data/ai/i18n.json')]).then(([kb, i18n]) => {
      KB = kb; I18N = i18n;
      applyI18n();
    });
  }

  function applyI18n() {
    root.querySelectorAll('[data-as]').forEach(el => {
      const v = t(el.dataset.as === 'title' ? 'chatbot_title' : el.dataset.as === 'subtitle' ? 'chatbot_subtitle' : 'chatbot_send', el.textContent);
      if (v) el.textContent = v;
    });
    const ph = t('chatbot_placeholder', 'Écrivez votre message...');
    if (ph) input.placeholder = ph;
    if (KB && KB.greetings && KB.greetings.length && !body.dataset.greeted) {
      body.dataset.greeted = '1';
      addMsg(t('chatbot_welcome', null) || pick(KB.greetings), 'bot');
    }
  }

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function addMsg(text, who) {
    const d = document.createElement('div');
    d.className = 'as-msg ' + who;
    d.textContent = text;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  function answer(q) {
    const n = norm(q);
    const words = n.split(' ').filter(w => w.length > 2);

    if (!KB) return 'Notre assistant est momentanément indisponible. Contactez-nous sur WhatsApp : +216 29 170 566.';

    if (/(livraison|frais|port|shipping|delivery|شحن|توصيل)/.test(n)) {
      return LANG === 'ar'
        ? 'الشحن مجاني للطلبات التي تتجاوز 500 دينار تونسي، وإلا 8,90 دينار. مدة التوصيل عادة 24 إلى 72 ساعة.'
        : LANG === 'en'
          ? 'Shipping is free for orders over 500 TND, otherwise 8.90 TND. Delivery usually takes 24 to 72 hours.'
          : 'Livraison gratuite au-delà de 500 DT, sinon 8,90 DT. Délai habituel : 24 à 72 h.';
    }
    if (/(whatsapp|contact|telephone|appeler|adresse|map|مغادرة|اتصال)/.test(n)) {
      return 'WhatsApp : +216 29 170 566 — adresse : Reva, Tunisie. Vous pouvez aussi utiliser le bouton Google Maps en bas de page.';
    }

    const guides = {
      plateau: ['aswek-resine-epoxy-3d', 'aswek-resine-epoxy-autolissant-1-kg', 'aswek-colorant-pour-resine-epoxy'],
      bijou: ['aswek-vitrail-transparent', 'aswek-colorant-pour-resine-epoxy', 'aswek-poudre-metallique-gold-50-gr'],
      moule: ['aswek-silicone-pour-moule-5-kg', 'aswek-boytek'],
      bougie: ['aswek-cire-de-soja', 'aswek-cire-de-paraffine'],
      piscine: ['aswek-chlore-choc', 'aswek-ph-moins', 'aswek-ph-plus', 'aswek-floculant-liquide'],
      etancheite: ['aswek-deep-etanche-pro']
    };
    for (const k of Object.keys(guides)) {
      if (n.includes(k) || (k === 'etancheite' && /toiture|terrasse|fuite/.test(n))) {
        const items = guides[k].filter(s => typeof findProduct === 'function' && findProduct(s));
        if (items.length) {
          const btns = items.slice(0, 3).map(s => {
            const p = findProduct(s);
            return `<a class="as-suggestion" href="product.html?p=${p.slug}">${p.name}</a>`;
          }).join('');
          return `<div>${kbGuidance(k) || 'Voici les produits adaptés à votre projet :'}</div><div class="as-suggestions">${btns}</div>`;
        }
      }
    }

    // FAQ matching
    const faqs = KB.faqs || [];
    let best = null, bestScore = 0;
    faqs.forEach(f => {
      const fq = norm(f.question + ' ' + (f.answer || ''));
      let s = 0;
      words.forEach(w => { if (fq.includes(w)) s += 2; });
      if (n && fq.includes(n)) s += 3;
      if (s > bestScore) { bestScore = s; best = f; }
    });
    if (best && bestScore >= 3) return best.answer;

    return 'Je ne suis pas certain de la réponse. Précisez votre projet (bijoux, plateau, moule, bougie, piscine, étanchéité) ou contactez-nous sur WhatsApp au +216 29 170 566.';
  }

  function kbGuidance(k) {
    if (!KB || !KB.product_guidance) return '';
    const g = KB.product_guidance;
    const map = { plateau: g.resines, bijou: g.resines, moule: g.silicones || g.resines, bougie: g.bougies, piscine: g.piscine, etancheite: g.etancheite };
    return map[k] || '';
  }

  function reply(text) {
    const d = document.createElement('div');
    d.className = 'as-msg bot';
    d.innerHTML = text;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  }

  function ask() {
    const q = input.value.trim();
    if (!q) return;
    addMsg(q, 'user');
    input.value = '';
    const thinking = addMsg('…', 'bot');
    setTimeout(() => {
      const a = answer(q);
      thinking.remove();
      reply(a);
    }, 220);
  }

  toggle.addEventListener('click', () => { root.classList.toggle('open'); if (root.classList.contains('open')) { load(); input.focus(); } });
  closeB.addEventListener('click', () => root.classList.remove('open'));
  send.addEventListener('click', ask);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ask(); } });
  load();
})();

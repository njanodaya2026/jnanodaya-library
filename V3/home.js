const TABLE_BOOKS_PER_PAGE = 24;

const MALAYALAM_LITERARY_QUOTES = [
  {
    text: "“നല്ല പുസ്തകങ്ങൾ നമ്മുടെ ഏകാന്തതയെ സമ്പന്നമാക്കുകയും ചിന്തകൾക്ക് പുതിയ ചിറകുകൾ നൽകുകയും ചെയ്യുന്നു.”",
    author: "— എം.ടി. വാസുദേവൻ നായർ"
  },
  {
    text: "“ഓരോ പുസ്തകവും മനുഷ്യൻ മനുഷ്യനോട് നടത്തുന്ന ഹൃദയസംവാദമാണ്; വായിക്കുന്നവൻ ഒരിക്കലും ഒറ്റപ്പെടുന്നില്ല.”",
    author: "— ജ്ഞാനോദയ വായനക്കൂട്ടം"
  },
  {
    text: "“അക്ഷരങ്ങളുടെ വെളിച്ചമുള്ളിടത്ത് അന്ധകാരത്തിന് നിലനിൽപ്പില്ല; വായനയാണ് ഒരു നാടിന്റെ യഥാർത്ഥ സാംസ്കാരിക കരുത്ത്.”",
    author: "— ഗ്രന്ഥശാലാ സന്ദേശം"
  },
  {
    text: "“ജീവിതത്തെക്കുറിച്ചുള്ള വലിയ അറിവുകൾ പലപ്പോഴും നമുക്ക് ലഭിക്കുന്നത് ചെറിയ പുസ്തകങ്ങളുടെ താളുകളിൽ നിന്നാണ്.”",
    author: "— വായനശാലാ ഡയറി"
  }
];

const SPINE_ACCENTS = [
  'bg-emerald-700',
  'bg-amber-600',
  'bg-teal-700',
  'bg-stone-600',
  'bg-orange-700',
  'bg-cyan-800'
];

function getSpineAccent(cat) {
  const s = String(cat || 'General');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return SPINE_ACCENTS[Math.abs(h) % SPINE_ACCENTS.length];
}

function initDailyLiteraryQuote() {
  const qEl = document.getElementById('dailyMalayalamQuote');
  const aEl = document.getElementById('dailyMalayalamQuoteAuthor');
  if (!qEl || !aEl) return;
  const dayIndex = new Date().getDate() % MALAYALAM_LITERARY_QUOTES.length;
  const pick = MALAYALAM_LITERARY_QUOTES[dayIndex];
  qEl.textContent = pick.text;
  aEl.textContent = pick.author;
}

function applyCmsToHomePage() {
  const c = STATE.cms;
  const logoBox = document.getElementById('hdrLogoContainer');
  if (logoBox) {
    const validLogo = safeHttpUrl(c.logoUrl);
    if (validLogo) {
      logoBox.innerHTML = `<img src="${esc(validLogo)}" alt="Logo" class="w-full h-full object-cover" onerror="this.parentElement.textContent='ജ്ഞാ'" />`;
    } else {
      logoBox.textContent = 'ജ്ഞാ';
    }
  }
  document.getElementById('hdrLibName').textContent = c.libraryName;
  document.getElementById('hdrTagline').textContent = c.tagline;
  document.getElementById('homeHeroTitle').textContent = c.libraryName;
  document.getElementById('homeAboutText').textContent = c.aboutText;
  document.getElementById('homeNoticeTicker').textContent = c.noticeTicker;
  document.getElementById('homeLoanDaysBadge').textContent = `${STATE.settings.LOAN_DAYS || 14} ദിവസം`;

  const heroTimingsEl = document.getElementById('homeHeroTimingsPill');
  if (heroTimingsEl && c.timings) {
    heroTimingsEl.textContent = c.timings;
  }

  document.getElementById('ftrLibName').textContent = c.libraryName;
  document.getElementById('ftrAddress').textContent = c.address;
  document.getElementById('ftrTimings').textContent = c.timings ? `Hours: ${c.timings}` : '';
  document.getElementById('ftrPhone').textContent = c.contactPhone ? `Contact: ${c.contactPhone}` : '';
  const regLib = document.getElementById('regHeaderLib');
  if (regLib) regLib.textContent = c.libraryName;

  const bearers = c.bearers || [];
  document.getElementById('ftrBearersGrid').innerHTML = bearers.filter(b => b.name).map(b => `
    <div class="border-l-2 border-[#143D32] dark:border-emerald-600 pl-3 py-0.5">
      <p class="text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">${esc(b.role)}</p>
      <p class="text-sm font-bold text-stone-900 dark:text-white mt-0.5">${esc(b.name)}</p>
      <a href="tel:${esc(b.phone)}" class="text-xs text-[#143D32] dark:text-emerald-400 hover:underline mt-0.5 inline-block">${esc(b.phone)}</a>
    </div>
  `).join('');

  const homeDelivEnabled = c.allowHomeDelivery !== false;
  const grHd = document.getElementById('grHomeDeliveryLabel');
  const cartHd = document.getElementById('cartHomeDeliveryLabel');
  if (grHd) grHd.classList.toggle('hidden', !homeDelivEnabled);
  if (cartHd) cartHd.classList.toggle('hidden', !homeDelivEnabled);

  if (!homeDelivEnabled) {
    const grDirect = document.querySelector('input[name="grDelivMode"][value="Direct Pickup"]');
    const cartDirect = document.querySelector('input[name="cartDelivMode"][value="Direct Pickup"]');
    if (grDirect) grDirect.checked = true;
    if (cartDirect) cartDirect.checked = true;
  }
}

function getBookRatingInfo(bookId) {
  const list = STATE.reviews.filter(r => r.Book_ID === bookId);
  if (list.length === 0) return { avg: 0, count: 0 };
  const sum = list.reduce((s, r) => s + Number(r.Rating || 5), 0);
  return { avg: (sum / list.length).toFixed(1), count: list.length };
}

function renderHomePage() {
  const totalCopies = STATE.books.reduce((s, b) => s + Number(b.Total_Copies || 0), 0);
  const availCopies = STATE.books.reduce((s, b) => s + Number(b.Available_Copies || 0), 0);
  const activeMembers = STATE.isAdmin
    ? STATE.members.filter(m => m.Status !== 'Rejected').length
    : (STATE.publicSummary?.activeMembers || 0);

  document.getElementById('homeTotalBooks').textContent = totalCopies;
  document.getElementById('homeAvailBooks').textContent = availCopies;
  document.getElementById('homeMembersCount').textContent = activeMembers;

  initDailyLiteraryQuote();
  renderNewArrivalsStrip();
  renderCategoryChips();
  renderHomeBooks();
  renderLeaderboards();
}

function renderNewArrivalsStrip() {
  const sec = document.getElementById('homeNewArrivalsSection');
  const listEl = document.getElementById('homeNewArrivalsList');
  if (!sec || !listEl) return;

  const latest = STATE.books.slice(-4).reverse();
  if (latest.length === 0) {
    sec.classList.add('hidden');
    return;
  }
  sec.classList.remove('hidden');

  listEl.innerHTML = latest.map(b => {
    const avail = Number(b.Available_Copies || 0);
    const spine = getSpineAccent(b.Type);
    return `
      <div class="group py-2.5 px-3 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-stone-200/70 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 flex items-center justify-between gap-2.5 transition">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-1 h-8 rounded-full ${spine} shrink-0"></span>
          <div class="min-w-0">
            <p class="font-bold text-xs text-stone-900 dark:text-white truncate">${esc(b.Title)}</p>
            <p class="text-[11px] text-stone-500 truncate">${esc(b.Author || '-')}</p>
          </div>
        </div>
        ${avail > 0 ? `
          <button data-req-id="${esc(b.Book_ID)}" class="js-new-arr-btn px-2.5 py-1 text-[11px] font-semibold text-[#143D32] dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/70 hover:bg-[#143D32] hover:text-white rounded-lg shrink-0 transition">
            Request
          </button>
        ` : `<span class="text-[10px] font-semibold text-stone-400 shrink-0">Out</span>`}
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.js-new-arr-btn').forEach(btn => {
    btn.addEventListener('click', () => handleBookRequestClick(btn.getAttribute('data-req-id')));
  });
}

function renderCategoryChips() {
  const box = document.getElementById('homeCategoryChips');
  if (!box) return;
  const currentType = document.getElementById('homeTypeFilter')?.value || '';
  const cats = [...new Set(STATE.books.map(b => String(b.Type || '').trim()).filter(Boolean))].sort();

  const makeChip = (val, label) => {
    const active = currentType.toLowerCase() === val.toLowerCase();
    return `<button type="button" data-cat-val="${esc(val)}"
      class="js-cat-chip px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
        active
          ? 'bg-[#143D32] dark:bg-emerald-700 text-white'
          : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800'
      }">${esc(label)}</button>`;
  };

  box.innerHTML = makeChip('', 'എല്ലാം') + cats.map(c => makeChip(c, c)).join('');
  box.querySelectorAll('.js-cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const sel = document.getElementById('homeTypeFilter');
      if (sel) sel.value = btn.getAttribute('data-cat-val');
      resetHomePageAndRender();
    });
  });
}

function filterHomeAvailability(mode) {
  const el = document.getElementById('homeAvailFilter');
  if (el) el.value = mode;
  resetHomePageAndRender();
  document.getElementById('catalogSection')?.scrollIntoView({ behavior: 'smooth' });
}

function openAvailableBooksModal() {
  document.getElementById('availModalSearch').value = '';
  renderAvailableBooksModalList();
  openModal('availableBooksModal');
}

function renderAvailableBooksModalList() {
  const q = (document.getElementById('availModalSearch')?.value || '').toLowerCase().trim();
  const container = document.getElementById('availModalTableContainer');
  if (!container) return;

  const availBooks = STATE.books.filter(b =>
    Number(b.Available_Copies) > 0 &&
    (!q || String(b.Title).toLowerCase().includes(q) || String(b.Author).toLowerCase().includes(q) || String(b.Type).toLowerCase().includes(q))
  );

  if (availBooks.length === 0) {
    container.innerHTML = `<p class="text-xs text-stone-400 text-center py-8">ഇപ്പോൾ ലഭ്യമായ പുസ്തകങ്ങളൊന്നും കണ്ടെത്തിയില്ല.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="divide-y divide-stone-200/80 dark:divide-stone-800">
      ${availBooks.map(b => `
        <div class="py-3 px-2 flex items-center justify-between gap-3 hover:bg-stone-100/60 dark:hover:bg-stone-800/50 rounded-lg transition">
          <div class="min-w-0">
            <p class="font-bold text-stone-900 dark:text-white text-xs sm:text-sm truncate">${esc(b.Title)} <span class="text-[10px] font-mono font-normal text-stone-400">(${esc(b.Book_ID)})</span></p>
            <p class="text-xs text-stone-500 truncate">${esc(b.Author || '-')} • ${esc(b.Type || 'General')} • <span class="text-emerald-700 dark:text-emerald-400 font-semibold">${Number(b.Available_Copies)} available</span></p>
          </div>
          <button data-req-book="${esc(b.Book_ID)}" class="js-modal-req-btn px-3.5 py-1.5 bg-[#143D32] hover:bg-[#0E2B23] dark:bg-emerald-700 text-white text-xs font-semibold rounded-lg shrink-0 transition">
            Request
          </button>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.js-modal-req-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-req-book');
      closeModal('availableBooksModal');
      handleBookRequestClick(id);
    });
  });
}

function renderLeaderboards() {
  const topBooks = STATE.publicSummary?.topBooks || [];
  const booksEl = document.getElementById('mostReadBooksList');
  if (booksEl) {
    booksEl.innerHTML = topBooks.length === 0
      ? `<p class="text-xs text-stone-400 py-4">വായനാ വിവരങ്ങൾ ശേഖരിച്ചുവരുന്നു...</p>`
      : topBooks.map((b, i) => `
        <div class="py-3 flex items-center justify-between gap-3">
          <div class="flex items-baseline gap-3.5 min-w-0">
            <span class="font-mono text-xs font-bold ${i === 0 ? 'text-amber-600' : 'text-stone-400'} w-5 shrink-0">0${i + 1}</span>
            <div class="min-w-0">
              <p class="font-semibold text-stone-900 dark:text-white text-sm truncate">${esc(b.Title)}</p>
              <p class="text-xs text-stone-500 truncate">${esc(b.Author || '-')}</p>
            </div>
          </div>
          <span class="text-xs font-semibold text-stone-500 dark:text-stone-400 shrink-0">
            ${Number(b.readCount)} reads
          </span>
        </div>
      `).join('');
  }

  const topReaders = STATE.publicSummary?.topReaders || [];
  const readersEl = document.getElementById('topReadersList');
  if (readersEl) {
    readersEl.innerHTML = topReaders.length === 0
      ? `<p class="text-xs text-stone-400 py-4">മികച്ച വായനക്കാരുടെ പട്ടിക ഉടൻ ലഭ്യമാകും...</p>`
      : topReaders.map((m, i) => `
        <div class="py-3 flex items-center justify-between gap-3">
          <div class="flex items-baseline gap-3.5 min-w-0">
            <span class="font-mono text-xs font-bold ${i === 0 ? 'text-amber-600' : 'text-stone-400'} w-5 shrink-0">0${i + 1}</span>
            <p class="font-semibold text-stone-900 dark:text-white text-sm truncate">${esc(m.Name)}</p>
          </div>
          <span class="text-xs font-semibold text-[#143D32] dark:text-emerald-400 shrink-0">
            ${Number(m.booksRead)} books
          </span>
        </div>
      `).join('');
  }
}

function resetHomePageAndRender() {
  STATE.homeCurrentPage = 1;
  renderCategoryChips();
  renderHomeBooks();
}

function changeHomePage(page) {
  STATE.homeCurrentPage = page;
  renderHomeBooks();
  document.getElementById('catalogSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderHomeBooks() {
  const q = (document.getElementById('homeSearch')?.value || '').toLowerCase().trim();
  const type = document.getElementById('homeTypeFilter')?.value || '';
  const availFilter = document.getElementById('homeAvailFilter')?.value || 'ALL';
  const wrapper = document.getElementById('homeBooksTableWrapper');
  const pagContainer = document.getElementById('homePagination');
  const countLabel = document.getElementById('homeBooksCountLabel');
  if (!wrapper) return;

  const filtered = STATE.books.filter(b => {
    const matchType = !type || String(b.Type).toLowerCase() === type.toLowerCase();
    const matchAvail = availFilter === 'ALL' || Number(b.Available_Copies) > 0;
    const matchQ = !q || String(b.Title).toLowerCase().includes(q) || String(b.Author).toLowerCase().includes(q) || String(b.Book_ID).toLowerCase().includes(q);
    return matchType && matchAvail && matchQ;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / TABLE_BOOKS_PER_PAGE));
  if (STATE.homeCurrentPage > totalPages) STATE.homeCurrentPage = totalPages;

  const startIdx = (STATE.homeCurrentPage - 1) * TABLE_BOOKS_PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + TABLE_BOOKS_PER_PAGE);

  if (countLabel) {
    countLabel.textContent = totalItems === 0
      ? "പുസ്തകങ്ങളൊന്നും കണ്ടെത്തിയില്ല"
      : `Showing ${startIdx + 1}–${Math.min(startIdx + TABLE_BOOKS_PER_PAGE, totalItems)} of ${totalItems} titles`;
  }

  if (pageItems.length === 0) {
    wrapper.innerHTML = `<div class="text-center py-12 text-stone-400 text-sm">No matching books found.</div>`;
    if (pagContainer) pagContainer.innerHTML = '';
    return;
  }

  const gridColsClass = STATE.isMobileMode
    ? 'grid-cols-1'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  wrapper.innerHTML = `
    <div class="grid ${gridColsClass} gap-3">
      ${pageItems.map(b => {
        const avail = Number(b.Available_Copies);
        const total = Number(b.Total_Copies);
        const rating = getBookRatingInfo(b.Book_ID);
        const spine = getSpineAccent(b.Type);

        return `
          <div class="group p-3.5 rounded-xl bg-white dark:bg-stone-900/90 border border-stone-200/85 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 shadow-2xs flex flex-col justify-between gap-3 transition">
            <div class="flex items-start gap-2.5 min-w-0">
              <span class="w-1 h-10 rounded-full ${spine} shrink-0 mt-0.5"></span>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-1.5">
                  <p class="font-bold text-stone-900 dark:text-white text-sm leading-snug truncate" title="${esc(b.Title)}">
                    ${esc(b.Title)}
                  </p>
                  <span class="text-[10px] font-mono text-stone-400 shrink-0">${esc(b.Book_ID)}</span>
                </div>
                <p class="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                  ${esc(b.Author || 'Unknown Author')}
                </p>
                <div class="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-stone-500">
                  <span class="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-medium">${esc(b.Type || 'General')}</span>
                  ${b.Shelf ? `<span class="font-mono text-[10px] text-stone-400">Shelf ${esc(b.Shelf)}</span>` : ''}
                  <button type="button" data-rev-id="${esc(b.Book_ID)}" class="js-home-rev-btn text-amber-600 dark:text-amber-400 font-semibold hover:underline ml-auto">
                    ★ ${rating.count > 0 ? `${rating.avg} (${rating.count})` : 'Rate'}
                  </button>
                </div>
              </div>
            </div>

            <div class="pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold ${avail > 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-stone-400'}">
                <span class="w-1.5 h-1.5 rounded-full ${avail > 0 ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-700'}"></span>
                ${avail > 0 ? `${avail}/${total} available` : 'Checked out'}
              </span>

              ${avail > 0 ? `
                <button type="button" data-req-id="${esc(b.Book_ID)}"
                  class="js-home-req-btn px-3.5 py-1.5 text-xs font-semibold text-white bg-[#143D32] hover:bg-[#0E2B23] dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition shrink-0">
                  Request
                </button>
              ` : `
                <span class="px-2.5 py-1 text-[11px] font-medium text-stone-400 bg-stone-100 dark:bg-stone-800 rounded-lg shrink-0">
                  Unavailable
                </span>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  wrapper.querySelectorAll('.js-home-req-btn').forEach(btn => {
    btn.addEventListener('click', () => handleBookRequestClick(btn.getAttribute('data-req-id')));
  });
  wrapper.querySelectorAll('.js-home-rev-btn').forEach(btn => {
    btn.addEventListener('click', () => openReviewModal(btn.getAttribute('data-rev-id'), false));
  });

  if (!pagContainer) return;
  if (totalPages <= 1) {
    pagContainer.innerHTML = '';
    return;
  }

  const cur = STATE.homeCurrentPage;
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= cur - 1 && p <= cur + 1)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  let btns = `<button onclick="changeHomePage(${cur - 1})" ${cur === 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 disabled:opacity-35">&larr; Prev</button>`;
  pages.forEach(p => {
    if (p === '...') {
      btns += `<span class="px-1.5 text-xs text-stone-400">…</span>`;
    } else {
      btns += `<button onclick="changeHomePage(${p})" class="w-8 h-8 rounded-lg text-xs font-bold ${p === cur ? 'bg-[#143D32] dark:bg-emerald-700 text-white' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/70'}">${p}</button>`;
    }
  });
  btns += `<button onclick="changeHomePage(${cur + 1})" ${cur === totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 disabled:opacity-35">Next &rarr;</button>`;
  pagContainer.innerHTML = btns;
}

function handleBookRequestClick(bookId) {
  const book = STATE.books.find(b => b.Book_ID === bookId);
  if (!book || Number(book.Available_Copies) <= 0) {
    showToast("ഈ പുസ്തകം നിലവിൽ സ്റ്റോക്കില്ല (Out of Stock)!", true);
    return;
  }

  if (STATE.currentUser) {
    if (!STATE.cart.includes(bookId)) {
      toggleCartBook(bookId);
    }
    openModal('cartModal');
    return;
  }
  document.getElementById('grBookId').value = bookId;
  document.getElementById('grBookTitle').textContent = `${book.Title} (${bookId})`;
  document.getElementById('grPhone').value = '';
  document.getElementById('grName').value = '';
  document.getElementById('grAddress').value = '';
  document.getElementById('grRemarks').value = '';
  openModal('guestRequestModal');
}

function checkExistingPhoneHint() {
  // Intentionally no-op for unauthenticated guests to prevent phone enumeration / privacy leak
}

function setUiScale(mode) {
  document.documentElement.style.fontSize = '16px';
  const adminEl = document.getElementById('view_admin');
  const zooms = { normal: '100%', large: '112%', xlarge: '122%' };
  if (adminEl) {
    adminEl.style.zoom = zooms[mode] || '100%';
  }
  localStorage.setItem('jnanodaya_ui_scale', mode);

  ['normal', 'large', 'xlarge'].forEach(m => {
    const btn = document.getElementById('scaleBtn_' + m);
    if (btn) {
      if (m === mode) {
        btn.classList.add('bg-[#143D32]', 'text-white');
      } else {
        btn.classList.remove('bg-[#143D32]', 'text-white');
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const savedScale = localStorage.getItem('jnanodaya_ui_scale') || (window.innerWidth >= 1280 ? 'large' : 'normal');
  setUiScale(savedScale);
});

async function submitGuestDirectRequest(e) {
  e.preventDefault();
  const delivMode = document.querySelector('input[name="grDelivMode"]:checked').value;
  const data = {
    Book_ID: document.getElementById('grBookId').value,
    Phone: document.getElementById('grPhone').value.trim(),
    Name: document.getElementById('grName').value.trim(),
    Address: document.getElementById('grAddress').value.trim(),
    Delivery_Mode: delivMode,
    Remarks: document.getElementById('grRemarks').value.trim()
  };

  const res = await postAction({ action: 'guestDirectRequest', data });
  if (res.status === 'success') {
    closeModal('guestRequestModal');
    let extraNote = '';
    if (res.isNewAccount && res.oneTimePin) {
      extraNote = `<br><br><div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-xs text-left">
        <strong>നിങ്ങളുടെ താൽക്കാലിക One-Time PIN:</strong> <span class="font-mono font-bold text-[#143D32] dark:text-emerald-300 text-sm">${esc(res.oneTimePin)}</span><br>
        <span class="text-stone-500">വായനാ ചരിത്രം കാണാൻ <strong>${esc(data.Phone)}</strong> എന്ന നമ്പറും ഈ PIN-ഉം ഉപയോഗിച്ച് Sign In ചെയ്ത് പുതിയ പാസ്‌വേഡ് സെറ്റ് ചെയ്യുക.</span>
      </div>`;
    }
    showCustomDialog({
      title: "റിക്വസ്റ്റ് സ്വീകരിച്ചു!",
      message: `${esc(res.message)}${extraNote}`,
      confirmText: "OK",
      isAlertOnly: true
    });
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

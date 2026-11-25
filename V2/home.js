const TABLE_BOOKS_PER_PAGE = 25;

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

  document.getElementById('ftrLibName').textContent = c.libraryName;
  document.getElementById('ftrAddress').textContent = c.address;
  document.getElementById('ftrTimings').textContent = `🕒 ${c.timings}`;
  document.getElementById('ftrPhone').textContent = `📞 ${c.contactPhone}`;
  const regLib = document.getElementById('regHeaderLib');
  if (regLib) regLib.textContent = c.libraryName;

  const bearers = c.bearers || [];
  document.getElementById('ftrBearersGrid').innerHTML = bearers.filter(b => b.name).map(b => `
    <div class="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-2xl">
      <p class="text-[11px] text-indigo-300 font-semibold">${esc(b.role)}</p>
      <p class="text-sm font-bold text-white mt-0.5">${esc(b.name)}</p>
      <a href="tel:${esc(b.phone)}" class="text-xs text-slate-400 hover:text-emerald-300 mt-0.5 inline-block">📞 ${esc(b.phone)}</a>
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

  renderHomeBooks();
  renderLeaderboards();
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
    container.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">ഇപ്പോൾ ലഭ്യമായ പുസ്തകങ്ങളൊന്നും കണ്ടെത്തിയില്ല.</p>`;
    return;
  }

  container.innerHTML = `
    <table class="w-full text-left text-xs sm:text-sm border-collapse">
      <thead class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] uppercase sticky top-0">
        <tr>
          <th class="py-2.5 px-3">Book Name</th>
          <th class="py-2.5 px-3">Author</th>
          <th class="py-2.5 px-3">Category</th>
          <th class="py-2.5 px-3">Available</th>
          <th class="py-2.5 px-3 text-right">Order</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
        ${availBooks.map(b => `
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <td class="py-2.5 px-3 font-bold text-slate-900 dark:text-white">${esc(b.Title)} <span class="text-[10px] font-mono text-slate-400">(${esc(b.Book_ID)})</span></td>
            <td class="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">${esc(b.Author || '-')}</td>
            <td class="py-2.5 px-3 text-xs"><span class="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">${esc(b.Type || 'General')}</span></td>
            <td class="py-2.5 px-3 text-xs font-bold text-emerald-600">${Number(b.Available_Copies)}</td>
            <td class="py-2.5 px-3 text-right">
              <button data-req-book="${esc(b.Book_ID)}" class="js-modal-req-btn px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl">
                Request Book
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
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
      ? `<p class="text-xs text-slate-400 py-4 text-center">വായനാ വിവരങ്ങൾ ശേഖരിച്ചുവരുന്നു...</p>`
      : topBooks.map((b, i) => `
        <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-7 h-7 rounded-xl ${i === 0 ? 'bg-amber-400 text-slate-900' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'} font-bold text-xs flex items-center justify-center shrink-0">
              #${i + 1}
            </span>
            <div class="min-w-0">
              <p class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">${esc(b.Title)}</p>
              <p class="text-[11px] text-slate-500 truncate">${esc(b.Author || '-')}</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
            ${Number(b.readCount)} Reads
          </span>
        </div>
      `).join('');
  }

  const topReaders = STATE.publicSummary?.topReaders || [];
  const readersEl = document.getElementById('topReadersList');
  if (readersEl) {
    readersEl.innerHTML = topReaders.length === 0
      ? `<p class="text-xs text-slate-400 py-4 text-center">മികച്ച വായനക്കാരുടെ പട്ടിക ഉടൻ ലഭ്യമാകും...</p>`
      : topReaders.map((m, i) => `
        <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-7 h-7 rounded-xl ${i === 0 ? 'bg-amber-400 text-slate-900' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'} font-bold text-xs flex items-center justify-center shrink-0">
              ${i === 0 ? '👑' : '#' + (i + 1)}
            </span>
            <div class="min-w-0">
              <p class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">${esc(m.Name)}</p>
              <p class="text-[11px] text-slate-500 truncate">${esc(m.Member_ID)}</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
            ${Number(m.booksRead)} Books
          </span>
        </div>
      `).join('');
  }
}

function resetHomePageAndRender() {
  STATE.homeCurrentPage = 1;
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
      : `Showing ${startIdx + 1}–${Math.min(startIdx + TABLE_BOOKS_PER_PAGE, totalItems)} of ${totalItems} books`;
  }

  if (pageItems.length === 0) {
    wrapper.innerHTML = `<div class="text-center py-10 text-slate-400 text-sm">No books found.</div>`;
    if (pagContainer) pagContainer.innerHTML = '';
    return;
  }

  if (STATE.isMobileMode) {
    wrapper.innerHTML = `<div class="space-y-2">` + pageItems.map(b => {
      const avail = Number(b.Available_Copies);
      return `
        <div class="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-2.5">
          <div class="min-w-0 flex-1">
            <p class="font-bold text-slate-900 dark:text-white text-xs truncate">${esc(b.Title)}</p>
            <p class="text-[11px] text-slate-500 truncate">${esc(b.Author || '-')} • ${esc(b.Type || 'General')}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${avail > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
              ${avail > 0 ? `${avail} Avail` : 'Out'}
            </span>
            ${avail > 0 ? `
              <button data-req-id="${esc(b.Book_ID)}"
                class="js-home-req-btn px-3 py-1.5 text-[11px] font-semibold bg-indigo-600 text-white rounded-xl">
                Request
              </button>
            ` : `
              <span class="px-2.5 py-1.5 text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-400 rounded-xl cursor-not-allowed">
                Unavailable
              </span>
            `}
          </div>
        </div>
      `;
    }).join('') + `</div>`;
  } else {
    wrapper.innerHTML = `
      <table class="w-full text-left text-xs sm:text-sm border-collapse">
        <thead class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] uppercase">
          <tr>
            <th class="py-3 px-3 rounded-tl-xl">#</th>
            <th class="py-3 px-3">Book Name</th>
            <th class="py-3 px-3">Author</th>
            <th class="py-3 px-3">Category</th>
            <th class="py-3 px-3">Shelf</th>
            <th class="py-3 px-3">Rating</th>
            <th class="py-3 px-3">Stock</th>
            <th class="py-3 px-3 text-right rounded-tr-xl">Order</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          ${pageItems.map((b, i) => {
            const avail = Number(b.Available_Copies);
            const rating = getBookRatingInfo(b.Book_ID);
            return `
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td class="py-2.5 px-3 text-xs text-slate-400 font-mono">${startIdx + i + 1}</td>
                <td class="py-2.5 px-3">
                  <span class="font-bold text-slate-900 dark:text-white">${esc(b.Title)}</span>
                  <span class="text-[10px] font-mono text-slate-400 ml-1">(${esc(b.Book_ID)})</span>
                </td>
                <td class="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">${esc(b.Author || '-')}</td>
                <td class="py-2.5 px-3 text-xs"><span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">${esc(b.Type || 'General')}</span></td>
                <td class="py-2.5 px-3 text-xs text-slate-500">${esc(b.Shelf || '-')}</td>
                <td class="py-2.5 px-3 text-xs">
                  <button data-rev-id="${esc(b.Book_ID)}" class="js-home-rev-btn text-amber-500 font-bold hover:underline">
                    ⭐ ${rating.count > 0 ? `${rating.avg} (${rating.count})` : 'Rate'}
                  </button>
                </td>
                <td class="py-2.5 px-3">
                  <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${avail > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}">
                    ${avail > 0 ? `${avail}/${Number(b.Total_Copies)} Avail` : 'Out of Stock'}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-right">
                  ${avail > 0 ? `
                    <button data-req-id="${esc(b.Book_ID)}"
                      class="js-home-req-btn px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition">
                      Request Book
                    </button>
                  ` : `
                    <span class="px-3.5 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl inline-block cursor-not-allowed">
                      Out of Stock
                    </span>
                  `}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

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

  let btns = `<button onclick="changeHomePage(${STATE.homeCurrentPage - 1})" ${STATE.homeCurrentPage === 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 disabled:opacity-40">&larr; Prev</button>`;
  for (let p = 1; p <= totalPages; p++) {
    btns += `<button onclick="changeHomePage(${p})" class="w-8 h-8 rounded-xl text-xs font-bold ${p === STATE.homeCurrentPage ? 'bg-indigo-600 text-white' : 'border border-slate-200 dark:border-slate-700'}">${p}</button>`;
  }
  btns += `<button onclick="changeHomePage(${STATE.homeCurrentPage + 1})" ${STATE.homeCurrentPage === totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 disabled:opacity-40">Next &rarr;</button>`;
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

function checkExistingPhoneHint(phoneVal) {
  const cleanPhone = (phoneVal || '').replace(/\D/g, '');
  const banner = document.getElementById('grExistingMemberBanner');
  const foundNameEl = document.getElementById('grFoundName');
  const nameInput = document.getElementById('grName');
  const addrInput = document.getElementById('grAddress');

  if (cleanPhone.length < 10) {
    if (banner) banner.classList.add('hidden');
    return;
  }

  const existingUser = (STATE.users || []).find(u => (u.phone || '').replace(/\D/g, '').endsWith(cleanPhone.slice(-10)));
  if (existingUser) {
    if (foundNameEl) foundNameEl.textContent = existingUser.name || '';
    if (banner) banner.classList.remove('hidden');

    // Auto-fill Name & Address automatically!
    if (nameInput) nameInput.value = existingUser.name || '';
    if (addrInput) addrInput.value = existingUser.address || '';
  } else {
    if (banner) banner.classList.add('hidden');
  }
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
        <strong>🔐 നിങ്ങളുടെ താൽക്കാലിക One-Time PIN:</strong> <span class="font-mono font-bold text-indigo-600 text-sm">${esc(res.oneTimePin)}</span><br>
        <span class="text-slate-500">വായനാ ചരിത്രം കാണാൻ <strong>${esc(data.Phone)}</strong> എന്ന നമ്പറും ഈ PIN-ഉം ഉപയോഗിച്ച് Login ചെയ്ത് പുതിയ പാസ്‌വേഡ് സെറ്റ് ചെയ്യുക.</span>
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

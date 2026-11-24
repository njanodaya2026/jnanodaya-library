function switchMemberTab(tab) {
  ['browse', 'mybooks', 'suggest', 'profile'].forEach(t => {
    const sec = document.getElementById('memSec_' + t);
    if (sec) sec.classList.toggle('hidden', t !== tab);

    const btn = document.getElementById('mTab_' + t);
    if (btn) {
      btn.className = t === tab
        ? "px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-indigo-600 text-white transition"
        : "px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition";
    }
  });
  if (tab === 'profile') renderDigitalIdCard();
}

function renderMemberDashboard() {
  const u = STATE.currentUser;
  if (!u) return;

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const memId = String(u.Member_ID || '').trim();
  const memName = String(u.Name || 'Member').trim();

  setTxt('memAvatarInitial', memName.charAt(0).toUpperCase());
  setTxt('memDashId', memId);
  setTxt('memDashName', memName);
  setTxt('memDashDetails', `${u.Phone || ''} • ${u.Address || ''}`);

  if (u.mustChangePass) {
    showToast("ദയവായി 'Digital ID & Password' ടാബിൽ പോയി പുതിയ പാസ്‌വേഡ് സെറ്റ് ചെയ്യുക.", true);
  }

  const myTxns = STATE.transactions.filter(t => String(t.Member_ID || '').trim() === memId);
  const myOrders = STATE.orders.filter(o => String(o.Member_ID || '').trim() === memId);

  const activeCount = myTxns.filter(t => t.Status === 'Issued').length;
  const returnedCount = myTxns.filter(t => t.Status === 'Returned').length;
  const pendingReqCount = myOrders.filter(o => o.Status === 'Pending' || o.Status === 'Approved' || o.Status === 'Waitlist').length;

  setTxt('memStatActive', activeCount);
  setTxt('memStatPending', pendingReqCount);
  setTxt('memStatReturned', returnedCount);

  renderSmartRecommendations();
  renderMemberBooks();
  renderMemberLoansAndOrders();
  renderMemberSuggestions();
  renderDigitalIdCard();
  updateCartUI();
}

function renderSmartRecommendations() {
  if (!STATE.currentUser) return;
  const memId = String(STATE.currentUser.Member_ID || '').trim();
  const myTxns = STATE.transactions.filter(t => String(t.Member_ID || '').trim() === memId);
  const readBookIds = new Set(myTxns.map(t => String(t.Book_ID || '').trim()));
  const favTypes = new Set(myTxns.map(t => {
    const b = STATE.books.find(x => String(x.Book_ID || '').trim() === String(t.Book_ID || '').trim());
    return b ? b.Type : null;
  }).filter(Boolean));

  let recs = STATE.books.filter(b => !readBookIds.has(String(b.Book_ID || '').trim()) && Number(b.Available_Copies) > 0 && favTypes.has(b.Type));
  if (recs.length === 0) {
    recs = STATE.books.filter(b => !readBookIds.has(String(b.Book_ID || '').trim()) && Number(b.Available_Copies) > 0);
  }
  recs = recs.slice(0, 3);

  const box = document.getElementById('memRecommendBox');
  const listEl = document.getElementById('memRecommendList');
  if (!box || !listEl || recs.length === 0) {
    if (box) box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  listEl.innerHTML = recs.map(b => {
    const bId = String(b.Book_ID || '').trim();
    return `
      <div class="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-indigo-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="font-bold text-xs text-slate-900 dark:text-white truncate">${esc(b.Title)}</p>
          <p class="text-[10px] text-slate-500 truncate">${esc(b.Author || '-')} • ${esc(b.Type || 'General')}</p>
        </div>
        <button data-cart-id="${esc(bId)}" class="js-mem-cart-btn px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg shrink-0">
          + Cart
        </button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.js-mem-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleCartBook(btn.getAttribute('data-cart-id')));
  });
}

function toggleCartBook(bookId) {
  const cleanId = String(bookId || '').trim();
  const book = STATE.books.find(x => String(x.Book_ID || '').trim() === cleanId);
  if (!book || Number(book.Available_Copies || 0) <= 0) {
    showToast("ഈ പുസ്തകം നിലവിൽ സ്റ്റോക്കില്ല (Out of Stock)!", true);
    return;
  }

  const idx = STATE.cart.indexOf(cleanId);
  if (idx > -1) {
    STATE.cart.splice(idx, 1);
    showToast("Removed from Cart");
  } else {
    const maxLimit = Number(STATE.settings.MAX_BOOKS_PER_USER || 3);
    if (STATE.cart.length >= maxLimit) {
      showToast(`പരമാവധി ${maxLimit} പുസ്തകങ്ങൾ മാത്രമേ ഒരേസമയം തിരഞ്ഞെടുക്കാൻ സാധിക്കൂ.`, true);
      return;
    }
    STATE.cart.push(cleanId);
    showToast("Added to Request Cart!");
  }
  updateCartUI();
  renderMemberBooks();
}

function updateCartUI() {
  const count = STATE.cart.length;
  const hdrBadge = document.getElementById('hdrCartCount');
  const memBadge = document.getElementById('memCartBadge');
  if (hdrBadge) hdrBadge.textContent = count;
  if (memBadge) memBadge.textContent = count;

  const listEl = document.getElementById('cartItemsList');
  if (!listEl) return;
  if (count === 0) {
    listEl.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">കാർട്ടിൽ പുസ്തകങ്ങളൊന്നുമില്ല.</p>`;
  } else {
    listEl.innerHTML = STATE.cart.map(id => {
      const b = STATE.books.find(x => String(x.Book_ID || '').trim() === id);
      if (!b) return '';
      return `
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between items-center text-xs">
          <div>
            <p class="font-bold text-slate-900 dark:text-white">${esc(b.Title)}</p>
            <p class="text-[11px] text-slate-500">${esc(b.Author || '-')}</p>
          </div>
          <button data-rm-id="${esc(id)}" class="js-cart-rm-btn text-rose-600 font-bold px-2">&times;</button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.js-cart-rm-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleCartBook(btn.getAttribute('data-rm-id')));
    });
  }
}

async function submitBatchCartOrder(e) {
  e.preventDefault();
  const validIds = STATE.cart.filter(id => {
    const b = STATE.books.find(x => String(x.Book_ID || '').trim() === id);
    return b && Number(b.Available_Copies || 0) > 0;
  });

  if (validIds.length === 0) {
    showToast("ലഭ്യമായ പുസ്തകങ്ങളൊന്നും കാർട്ടിലില്ല!", true);
    return;
  }

  const deliveryMode = document.querySelector('input[name="cartDelivMode"]:checked')?.value || 'Direct Pickup';
  const remarks = document.getElementById('cartRemarks')?.value.trim() || '';

  const res = await postAction({
    action: 'placeBatchOrder',
    data: {
      Book_IDs: validIds,
      Delivery_Mode: deliveryMode,
      Remarks: remarks
    }
  });

  if (res.status === 'success') {
    STATE.cart = [];
    updateCartUI();
    closeModal('cartModal');
    showToast(res.message);
    saveSession();
    renderMemberDashboard();
  } else {
    showToast(res.message, true);
  }
}

function renderMemberBooks() {
  const q = (document.getElementById('memBookSearch')?.value || '').toLowerCase().trim();
  const type = document.getElementById('memBookType')?.value || '';
  const wrapper = document.getElementById('memberBooksTableWrapper');
  if (!wrapper || !STATE.currentUser) return;
  const memId = String(STATE.currentUser.Member_ID || '').trim();

  const list = STATE.books.filter(b => {
    const matchType = !type || String(b.Type || '').toLowerCase() === type.toLowerCase();
    const matchQ = !q || String(b.Title || '').toLowerCase().includes(q) || String(b.Author || '').toLowerCase().includes(q) || String(b.Book_ID || '').toLowerCase().includes(q);
    return matchType && matchQ;
  });

  if (list.length === 0) {
    wrapper.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">No books found.</p>`;
    return;
  }

  if (STATE.isMobileMode) {
    wrapper.innerHTML = `<div class="p-3 space-y-2.5">` + list.map(b => {
      const avail = Number(b.Available_Copies || 0);
      const bId = String(b.Book_ID || '').trim();
      const inCart = STATE.cart.includes(bId);
      const myActiveLoan = STATE.transactions.find(t => String(t.Member_ID || '').trim() === memId && String(t.Book_ID || '').trim() === bId && t.Status === 'Issued');
      const isRequested = STATE.orders.some(o => String(o.Member_ID || '').trim() === memId && String(o.Book_ID || '').trim() === bId && (o.Status === 'Pending' || o.Status === 'Approved' || o.Status === 'Waitlist'));

      let btnHtml = '';
      if (myActiveLoan) {
        btnHtml = `<span class="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800">In Hand</span>`;
      } else if (isRequested) {
        btnHtml = `<span class="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600">Requested</span>`;
      } else if (avail <= 0) {
        btnHtml = `<span class="px-2 py-1 rounded-lg text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-500 cursor-not-allowed">Out of Stock</span>`;
      } else {
        btnHtml = `<button data-cart-id="${esc(bId)}" class="js-mem-cart-btn px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition ${
          inCart ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
        }">${inCart ? '✓ Cart' : '+ Cart'}</button>`;
      }

      return `
        <div class="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="font-bold text-slate-900 dark:text-white text-xs truncate">${esc(b.Title)}</p>
            <p class="text-[11px] text-slate-500 truncate">${esc(b.Author || '-')} • ${avail}/${Number(b.Total_Copies)} Avail</p>
          </div>
          <div class="shrink-0">${btnHtml}</div>
        </div>
      `;
    }).join('') + `</div>`;
  } else {
    wrapper.innerHTML = `
      <table class="w-full text-left text-xs sm:text-sm border-collapse">
        <thead class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] uppercase">
          <tr>
            <th class="py-3 px-3">Book Name</th>
            <th class="py-3 px-3">Author</th>
            <th class="py-3 px-3">Category / Shelf</th>
            <th class="py-3 px-3">Stock</th>
            <th class="py-3 px-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          ${list.map(b => {
            const avail = Number(b.Available_Copies || 0);
            const bId = String(b.Book_ID || '').trim();
            const inCart = STATE.cart.includes(bId);
            const myActiveLoan = STATE.transactions.find(t => String(t.Member_ID || '').trim() === memId && String(t.Book_ID || '').trim() === bId && t.Status === 'Issued');
            const isRequested = STATE.orders.some(o => String(o.Member_ID || '').trim() === memId && String(o.Book_ID || '').trim() === bId && (o.Status === 'Pending' || o.Status === 'Approved' || o.Status === 'Waitlist'));

            let btnHtml = '';
            if (myActiveLoan) {
              btnHtml = `<span class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800">In Hand (Due: ${esc(myActiveLoan.Due_Date)})</span>`;
            } else if (isRequested) {
              btnHtml = `<span class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600">Requested</span>`;
            } else if (avail <= 0) {
              btnHtml = `<span class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-500 cursor-not-allowed">Out of Stock</span>`;
            } else {
              btnHtml = `<button data-cart-id="${esc(bId)}" class="js-mem-cart-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                inCart ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
              }">${inCart ? '✓ In Cart' : '+ Add to Cart'}</button>`;
            }

            return `
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td class="py-2.5 px-3 font-bold text-slate-900 dark:text-white">${esc(b.Title)} <span class="text-[10px] font-mono text-slate-400">(${esc(bId)})</span></td>
                <td class="py-2.5 px-3 text-xs text-slate-500">${esc(b.Author || '-')}</td>
                <td class="py-2.5 px-3 text-xs">${esc(b.Type || 'General')} ${b.Shelf ? `• Shelf ${esc(b.Shelf)}` : ''}</td>
                <td class="py-2.5 px-3 text-xs font-bold ${avail > 0 ? 'text-emerald-600' : 'text-rose-600'}">${avail}/${Number(b.Total_Copies)}</td>
                <td class="py-2.5 px-3 text-right">${btnHtml}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  wrapper.querySelectorAll('.js-mem-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleCartBook(btn.getAttribute('data-cart-id')));
  });
}

function renderMemberLoansAndOrders() {
  if (!STATE.currentUser) return;
  const memId = String(STATE.currentUser.Member_ID || '').trim();
  const myTxns = STATE.transactions.filter(t => String(t.Member_ID || '').trim() === memId).reverse();
  const myOrders = STATE.orders.filter(o => String(o.Member_ID || '').trim() === memId).reverse();

  const borrowedEl = document.getElementById('memBorrowedList');
  if (borrowedEl) {
    borrowedEl.innerHTML = myTxns.length === 0
      ? `<p class="text-xs text-slate-400">ഇതുവരെ പുസ്തകങ്ങളൊന്നും എടുത്തിട്ടില്ല.</p>`
      : myTxns.map(t => `
        <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-wrap justify-between items-center gap-2">
          <div>
            <p class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">${esc(t.Book_Title)}</p>
            <p class="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Issued: <strong>${esc(t.Issue_Date)}</strong> • Due: <strong>${esc(t.Due_Date)}</strong>
              ${t.Return_Date ? `• Returned: <strong class="text-emerald-600">${esc(t.Return_Date)}</strong>` : ''}
            </p>
          </div>
          <div class="flex items-center gap-1.5">
            <button data-rev-id="${esc(t.Book_ID)}" class="js-mem-rev-btn px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl">
              ⭐ Review
            </button>
            <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold ${t.Status === 'Issued' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
              ${esc(t.Status)}
            </span>
          </div>
        </div>
      `).join('');

    borrowedEl.querySelectorAll('.js-mem-rev-btn').forEach(btn => {
      btn.addEventListener('click', () => openReviewModal(btn.getAttribute('data-rev-id'), true));
    });
  }

  const reqEl = document.getElementById('memRequestsList');
  if (reqEl) {
    reqEl.innerHTML = myOrders.length === 0
      ? `<p class="text-xs text-slate-400">ബുക്ക് റിക്വസ്റ്റുകളൊന്നുമില്ല.</p>`
      : myOrders.map(o => `
        <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center gap-2">
          <div>
            <p class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">${esc(o.Book_Title)}</p>
            <p class="text-[11px] text-slate-500">#${esc(o.Order_ID)} • ${esc(o.Order_Date)} • <strong class="text-indigo-600">${esc(o.Delivery_Mode || 'Direct Pickup')}</strong></p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${
            o.Status === 'Pending' ? 'bg-amber-100 text-amber-800' :
            o.Status === 'Approved' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
          }">${esc(o.Status)}</span>
        </div>
      `).join('');
  }
}

function openReviewModal(bookId, allowSubmit) {
  const book = STATE.books.find(b => b.Book_ID === bookId);
  document.getElementById('revBookId').value = bookId;
  document.getElementById('revBookTitle').textContent = book ? book.Title : bookId;
  const form = document.getElementById('revSubmitForm');
  if (form) form.classList.toggle('hidden', !allowSubmit || !STATE.currentUser);

  const list = STATE.reviews.filter(r => String(r.Book_ID || '').trim() === String(bookId).trim()).reverse();
  const existingEl = document.getElementById('revExistingList');
  if (existingEl) {
    existingEl.innerHTML = list.length === 0
      ? `<p class="text-slate-400 text-center py-3">ഇതുവരെ അഭിപ്രായങ്ങളൊന്നുമില്ല.</p>`
      : list.map(r => `
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <div class="flex justify-between font-bold">
            <span>${esc(r.Member_Name)}</span>
            <span class="text-amber-500">${'⭐'.repeat(Math.min(5, Math.max(1, Number(r.Rating || 5))))}</span>
          </div>
          <p class="text-slate-600 dark:text-slate-300 mt-1">${esc(r.Comment)}</p>
        </div>
      `).join('');
  }
  openModal('reviewModal');
}

async function submitBookReview(e) {
  e.preventDefault();
  const data = {
    Book_ID: document.getElementById('revBookId').value,
    Rating: document.getElementById('revRating').value,
    Comment: document.getElementById('revComment').value.trim()
  };
  const res = await postAction({ action: 'addReview', data });
  if (res.status === 'success') {
    e.target.reset();
    closeModal('reviewModal');
    showToast(res.message);
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

async function handleMemberSuggestBook(e) {
  e.preventDefault();
  const data = {
    Book_Title: document.getElementById('sugTitle').value.trim(),
    Author: document.getElementById('sugAuthor').value.trim(),
    Notes: document.getElementById('sugNotes').value.trim()
  };
  const res = await postAction({ action: 'addSuggestion', data });
  if (res.status === 'success') {
    e.target.reset();
    STATE.suggestions.unshift({
      Sug_ID: 'NEW',
      Member_Name: STATE.currentUser.Name,
      Book_Title: data.Book_Title,
      Author: data.Author,
      Status: 'New'
    });
    renderMemberSuggestions();
    showToast(res.message);
  } else {
    showToast(res.message, true);
  }
}

function renderMemberSuggestions() {
  const el = document.getElementById('memSuggestionsList');
  if (!el) return;
  el.innerHTML = STATE.suggestions.length === 0
    ? `<p class="text-xs text-slate-400">ഇതുവരെ നിർദ്ദേശങ്ങളൊന്നുമില്ല.</p>`
    : STATE.suggestions.map(s => `
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
        <div>
          <p class="font-bold text-slate-900 dark:text-white">${esc(s.Book_Title)}</p>
          <p class="text-slate-500">${esc(s.Author || '')} • ${esc(s.Member_Name)}</p>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">${esc(s.Status)}</span>
      </div>
    `).join('');
}

function renderDigitalIdCard() {
  const u = STATE.currentUser;
  if (!u) return;
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setTxt('cardMemId', u.Member_ID || '');
  setTxt('cardMemName', u.Name || '');
  setTxt('cardMemPhone', `📞 ${u.Phone || ''}`);
  setTxt('cardMemAddr', `📍 ${u.Address || ''}`);

  const canvas = document.getElementById('memberQrCanvas');
  if (window.QRious && canvas) {
    new QRious({
      element: canvas,
      value: `JNANODAYA-LIB:${u.Member_ID}:${u.Name}`,
      size: 84
    });
  }
}

function downloadDigitalIdCard() {
  const el = document.getElementById('digitalIdCardArea');
  if (window.html2pdf && el) {
    html2pdf().from(el).set({
      margin: 10,
      filename: `Library_ID_${STATE.currentUser.Member_ID}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a6', orientation: 'landscape' }
    }).save();
  }
}

async function handleMemberChangePassword(e) {
  e.preventDefault();
  const oldPassword = document.getElementById('cpOldPass').value;
  const newPassword = document.getElementById('cpNewPass').value;
  const confirmPass = document.getElementById('cpConfirmPass').value;
  if (newPassword !== confirmPass) {
    showToast("പുതിയ പാസ്‌വേഡുകൾ തമ്മിൽ പൊരുത്തപ്പെടുന്നില്ല!", true);
    return;
  }
  const res = await postAction({
    action: 'changeUserPassword',
    oldPassword,
    newPassword
  });
  if (res.status === 'success') {
    STATE._memSessionPass = newPassword;
    STATE.currentUser.mustChangePass = false;
    saveSession();
    e.target.reset();
    showToast(res.message);
  } else {
    showToast(res.message, true);
  }
}

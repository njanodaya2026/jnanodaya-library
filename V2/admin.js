function switchAdminTab(tab) {
  document.querySelectorAll('.a-sec').forEach(el => el.classList.add('hidden'));
  document.getElementById('aSec_' + tab)?.classList.remove('hidden');

  // Sync mobile dropdown selector
  const mobSel = document.getElementById('mobileAdminTabSelect');
  if (mobSel) mobSel.value = tab;

  // Sync desktop sidebar buttons
  document.querySelectorAll('.a-tab').forEach(btn => {
    btn.className = "a-tab w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-between items-center";
  });
  const activeBtn = document.getElementById('aTab_' + tab);
  if (activeBtn) {
    activeBtn.className = "a-tab w-full text-left px-4 py-3 rounded-xl text-sm font-bold bg-slate-900 dark:bg-indigo-600 text-white flex justify-between items-center";
  }

  // Sync bottom mobile nav active state if applicable
  document.querySelectorAll('#mobileBottomNavInner button').forEach(btn => {
    const isMatch = btn.getAttribute('onclick')?.includes(`'${tab}'`);
    if (isMatch) {
      btn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'font-bold');
      btn.classList.remove('text-slate-500');
    } else {
      btn.classList.remove('text-indigo-600', 'dark:text-indigo-400', 'font-bold');
    }
  });

  if (tab === 'registers') showRegister('stock');
  if (tab === 'overview') renderCategoryChart();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAdminDashboard() {
  const totalCopies = STATE.books.reduce((s, b) => s + Number(b.Total_Copies || 0), 0);
  const availCopies = STATE.books.reduce((s, b) => s + Number(b.Available_Copies || 0), 0);
  const pendingOrders = STATE.orders.filter(o => o.Status === 'Pending' || o.Status === 'Waitlist').length;
  const activeIssued = STATE.transactions.filter(t => t.Status === 'Issued').length;
  const totalMembers = STATE.members.length;
  const newSuggestions = STATE.suggestions.filter(s => s.Status === 'New').length;

  document.getElementById('admStatBooks').textContent = `${availCopies} / ${totalCopies}`;
  document.getElementById('admStatOrders').textContent = pendingOrders;
  document.getElementById('admStatIssued').textContent = activeIssued;
  document.getElementById('admStatMembers').textContent = totalMembers;

  document.getElementById('badgeOrders').textContent = pendingOrders;
  document.getElementById('badgeActiveLoans').textContent = activeIssued;
  const sugBadge = document.getElementById('badgeSuggestions');
  if (sugBadge) sugBadge.textContent = newSuggestions;

  document.getElementById('admProfileUser').textContent = STATE.settings.ADMIN_USER || 'admin';

  // Avoid overwriting CMS & Rules inputs if admin is actively typing inside #aSec_cms
  const activeEl = document.activeElement;
  const isEditingCms = activeEl && document.getElementById('aSec_cms')?.contains(activeEl);
  if (!isEditingCms) {
    document.getElementById('setLoanDays').value = STATE.settings.LOAN_DAYS || 14;
    document.getElementById('setMaxBooks').value = STATE.settings.MAX_BOOKS_PER_USER || 3;
    const defPassEl = document.getElementById('setDefMemPass');
    if (defPassEl) defPassEl.value = STATE.settings.DEFAULT_MEMBER_PASS || '';

    const c = STATE.cms;
    document.getElementById('cmsLibName').value = c.libraryName || '';
    document.getElementById('cmsTagline').value = c.tagline || '';
    if (document.getElementById('cmsLogoUrl')) document.getElementById('cmsLogoUrl').value = c.logoUrl || '';
    const hdEl = document.getElementById('cmsAllowHomeDelivery');
    if (hdEl) hdEl.checked = c.allowHomeDelivery !== false;
    document.getElementById('cmsNotice').value = c.noticeTicker || '';
    document.getElementById('cmsAbout').value = c.aboutText || '';
    document.getElementById('cmsTimings').value = c.timings || '';
    document.getElementById('cmsPhone').value = c.contactPhone || '';
    document.getElementById('cmsAddress').value = c.address || '';
    (c.bearers || []).forEach((b, i) => {
      if (document.getElementById(`b${i}Role`)) {
        document.getElementById(`b${i}Role`).value = b.role || '';
        document.getElementById(`b${i}Name`).value = b.name || '';
        document.getElementById(`b${i}Phone`).value = b.phone || '';
      }
    });
  }

  renderCategoryChart();
  renderAuditLogs();
  renderAdminCirculation();
  renderAdminOrders();
  renderAdminUsers();
  renderAdminBooks();
  renderAdminSuggestions();
}

function renderCategoryChart() {
  const canvas = document.getElementById('categoryChartCanvas');
  if (!canvas || !window.Chart) return;
  const counts = {};
  STATE.books.forEach(b => {
    const cat = b.Type || 'General';
    counts[cat] = (counts[cat] || 0) + Number(b.Total_Copies || 1);
  });

  if (STATE.categoryChartInstance) STATE.categoryChartInstance.destroy();
  STATE.categoryChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: STATE.isDarkMode ? '#cbd5e1' : '#334155', font: { size: 11 } } }
      }
    }
  });
}

function renderAuditLogs() {
  const el = document.getElementById('auditLogList');
  if (!el) return;
  const logs = STATE.auditLogs.slice(0, 25);
  el.innerHTML = logs.length === 0
    ? `<p class="text-slate-400">No recent activity logs.</p>`
    : logs.map(l => `
      <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 flex justify-between gap-2">
        <div>
          <span class="font-bold text-indigo-600 dark:text-indigo-400">[${esc(l.Action)}]</span>
          <span class="text-slate-700 dark:text-slate-300">${esc(l.Details)}</span>
        </div>
        <span class="text-[10px] text-slate-400 shrink-0">${esc(l.Timestamp)}</span>
      </div>
    `).join('');
}

// ==================== AUTOCOMPLETE DROPDOWNS (XSS SAFE) ====================

function filterMemberDropdown() {
  const q = document.getElementById('issMemSearch').value.toLowerCase().trim();
  const dropdown = document.getElementById('issMemDropdown');
  const active = STATE.members.filter(m => m.Status !== 'Rejected');
  const matches = active.filter(m => !q || String(m.Name).toLowerCase().includes(q) || String(m.Member_ID).toLowerCase().includes(q) || String(m.Phone).includes(q));

  dropdown.innerHTML = matches.length === 0
    ? `<div class="p-3 text-xs text-slate-400">No members found</div>`
    : matches.map(m => `
      <div data-mem-id="${esc(m.Member_ID)}"
        class="js-dd-mem px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center text-xs">
        <div><p class="font-bold">${esc(m.Name)}</p><p class="text-slate-500">${esc(m.Phone)}</p></div>
        <span class="font-mono font-semibold text-indigo-600">${esc(m.Member_ID)}</span>
      </div>
    `).join('');

  dropdown.querySelectorAll('.js-dd-mem').forEach(el => {
    el.addEventListener('click', () => {
      const m = STATE.members.find(x => x.Member_ID === el.getAttribute('data-mem-id'));
      if (m) selectMemberForIssue(m.Member_ID, m.Name, m.Phone);
    });
  });
  dropdown.classList.remove('hidden');
}


function selectMemberForIssue(id, name, phone) {
  document.getElementById('issMemId').value = id;
  document.getElementById('issMemSearch').value = `${name} (${id})`;
  document.getElementById('issMemSelectedText').textContent = `${name} • ${id}`;
  document.getElementById('issMemSelectedTag').classList.remove('hidden');
  document.getElementById('issMemDropdown').classList.add('hidden');
}

function clearSelectedMember() {
  document.getElementById('issMemId').value = '';
  document.getElementById('issMemSearch').value = '';
  document.getElementById('issMemSelectedTag').classList.add('hidden');
}

function filterBookDropdown() {
  const q = document.getElementById('issBookSearch').value.toLowerCase().trim();
  const dropdown = document.getElementById('issBookDropdown');
  const matches = STATE.books.filter(b => !q || String(b.Title).toLowerCase().includes(q) || String(b.Author).toLowerCase().includes(q) || String(b.Book_ID).toLowerCase().includes(q));

  dropdown.innerHTML = matches.length === 0
    ? `<div class="p-3 text-xs text-slate-400">No books found</div>`
    : matches.map(b => {
      const avail = Number(b.Available_Copies);
      return `
        <div data-book-id="${esc(b.Book_ID)}"
          class="${avail > 0 ? 'js-dd-book hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer' : 'opacity-50'} px-3 py-2.5 flex justify-between items-center text-xs">
          <div><p class="font-bold">${esc(b.Title)}</p><p class="text-slate-500">${esc(b.Author || '-')}</p></div>
          <span class="font-semibold px-2 py-0.5 rounded ${avail > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${avail > 0 ? `${avail} Avail` : 'Out'}</span>
        </div>
      `;
    }).join('');

  dropdown.querySelectorAll('.js-dd-book').forEach(el => {
    el.addEventListener('click', () => {
      const b = STATE.books.find(x => x.Book_ID === el.getAttribute('data-book-id'));
      if (b && Number(b.Available_Copies) > 0) selectBookForIssue(b.Book_ID, b.Title, b.Available_Copies);
    });
  });
  dropdown.classList.remove('hidden');
}

function selectBookForIssue(id, title, avail) {
  document.getElementById('issBookId').value = id;
  document.getElementById('issBookSearch').value = `${title} (${id})`;
  document.getElementById('issBookSelectedText').textContent = `${title} (${avail} avail)`;
  document.getElementById('issBookSelectedTag').classList.remove('hidden');
  document.getElementById('issBookDropdown').classList.add('hidden');
}

function clearSelectedBook() {
  document.getElementById('issBookId').value = '';
  document.getElementById('issBookSearch').value = '';
  document.getElementById('issBookSelectedTag').classList.add('hidden');
}

function filterQuickReturnDropdown() {
  const q = document.getElementById('quickReturnSearch').value.toLowerCase().trim();
  const dropdown = document.getElementById('quickReturnDropdown');
  const activeLoans = STATE.transactions.filter(t => t.Status === 'Issued');
  const matches = activeLoans.filter(t => !q || String(t.Member_Name).toLowerCase().includes(q) || String(t.Book_Title).toLowerCase().includes(q) || String(t.Txn_ID).toLowerCase().includes(q));

  dropdown.innerHTML = matches.length === 0
    ? `<div class="p-3 text-xs text-slate-400">No active issued books found</div>`
    : matches.map(t => `
      <div data-txn-id="${esc(t.Txn_ID)}"
        class="js-dd-ret p-3 hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center text-xs">
        <div><p class="font-bold">${esc(t.Book_Title)}</p><p class="text-slate-500">${esc(t.Member_Name)} • Due: ${esc(t.Due_Date)}</p></div>
        <span class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-semibold">Return</span>
      </div>
    `).join('');

  dropdown.querySelectorAll('.js-dd-ret').forEach(el => {
    el.addEventListener('click', () => {
      const txn = STATE.transactions.find(x => x.Txn_ID === el.getAttribute('data-txn-id'));
      if (txn) {
        openConfirmReturnModal(txn.Txn_ID, txn.Book_Title, txn.Member_Name);
        dropdown.classList.add('hidden');
      }
    });
  });
  dropdown.classList.remove('hidden');
}

// ==================== CIRCULATION ====================

function renderAdminCirculation() {
  const q = (document.getElementById('circTableFilter')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('circStatusFilter')?.value || 'ALL';
  const container = document.getElementById('admCirculationContainer');
  if (!container) return;

  const list = STATE.transactions.slice().reverse().filter(t => {
    if (statusFilter === 'ISSUED' && t.Status !== 'Issued') return false;
    if (statusFilter === 'RETURNED' && t.Status !== 'Returned') return false;
    return !q || String(t.Book_Title).toLowerCase().includes(q) || String(t.Member_Name).toLowerCase().includes(q) || String(t.Txn_ID).toLowerCase().includes(q);
  });

  container.innerHTML = list.length === 0
    ? `<p class="text-xs text-slate-400 text-center py-8">No records found.</p>`
    : list.map(t => `
      <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex flex-wrap justify-between items-center gap-3">
        <div class="space-y-1 min-w-0 flex-1">
          <p class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">${esc(t.Book_Title)} <span class="text-[10px] font-mono text-slate-400">(${esc(t.Txn_ID)})</span></p>
          <p class="text-xs text-slate-700 dark:text-slate-300 font-medium">${esc(t.Member_Name)} (${esc(t.Member_ID)})</p>
          <p class="text-[11px] text-slate-500">Issued: <strong>${esc(t.Issue_Date)}</strong> • Due: <strong class="text-indigo-600">${esc(t.Due_Date)}</strong> ${t.Return_Date ? `• Returned: <strong class="text-emerald-600">${esc(t.Return_Date)}</strong>` : ''}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold ${t.Status === 'Issued' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}">${esc(t.Status)}</span>
          ${t.Status === 'Issued' ? `
            <button data-txn-id="${esc(t.Txn_ID)}"
              class="js-circ-ret-btn px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl">
              Return Book
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

  container.querySelectorAll('.js-circ-ret-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const txn = STATE.transactions.find(x => x.Txn_ID === btn.getAttribute('data-txn-id'));
      if (txn) openConfirmReturnModal(txn.Txn_ID, txn.Book_Title, txn.Member_Name);
    });
  });
}

async function adminIssueBook(e) {
  e.preventDefault();
  const memId = document.getElementById('issMemId').value.trim().toUpperCase();
  const bookId = document.getElementById('issBookId').value.trim().toUpperCase();
  if (!memId || !bookId) {
    showToast("Please select both Member and Book", true);
    return;
  }
  const res = await postAction({
    action: 'issueBook',
    data: {
      Member_ID: memId,
      Book_ID: bookId,
      Issue_Date: document.getElementById('issDate').value,
      Due_Date: document.getElementById('issDueDate').value
    }
  });
  if (res.status === 'success') {
    clearSelectedMember();
    clearSelectedBook();
    showToast(res.message);
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

function openConfirmReturnModal(txnId, bookTitle, memberName) {
  document.getElementById('crTxnId').value = txnId;
  document.getElementById('crSummary').innerHTML = `Book: <strong>${esc(bookTitle)}</strong><br>Member: <strong>${esc(memberName)}</strong>`;
  document.getElementById('crReturnDate').value = getLocalTodayISO();
  openModal('confirmReturnModal');
}

async function submitConfirmReturn(e) {
  e.preventDefault();
  const res = await postAction({
    action: 'returnBook',
    data: {
      Txn_ID: document.getElementById('crTxnId').value,
      Return_Date: document.getElementById('crReturnDate').value
    }
  });
  if (res.status === 'success') {
    closeModal('confirmReturnModal');
    document.getElementById('quickReturnSearch').value = '';
    showToast(res.message);
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

// ==================== ORDERS ====================

let adminAutoSyncTimer = null;

function startAdminAutoSync() {
  if (adminAutoSyncTimer) clearInterval(adminAutoSyncTimer);
  adminAutoSyncTimer = setInterval(async () => {
    if (!STATE.isAdmin) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const prevPending = STATE.orders.filter(o => o.Status === 'Pending' || o.Status === 'Waitlist').length;
    await fetchAllData(true);
    const newPending = STATE.orders.filter(o => o.Status === 'Pending' || o.Status === 'Waitlist').length;
    if (newPending > prevPending) {
      showToast(`🔔 പുതിയ ബുക്ക് റിക്വസ്റ്റ് വന്നിട്ടുണ്ട്! (${newPending} Pending)`);
    }
  }, 15000);
}

function renderAdminOrders() {
  const pendingContainer = document.getElementById('admPendingOrdersContainer');
  const processedContainer = document.getElementById('admProcessedOrdersContainer');
  if (!pendingContainer || !processedContainer) return;

  const allOrders = STATE.orders.slice().reverse();
  const pendingList = allOrders.filter(o => o.Status === 'Pending' || o.Status === 'Waitlist');
  const histQ = (document.getElementById('processedOrderSearch')?.value || '').toLowerCase().trim();
  const processedAll = allOrders.filter(o => o.Status !== 'Pending' && o.Status !== 'Waitlist');
  const processedList = processedAll.filter(o =>
    !histQ ||
    String(o.Book_Title).toLowerCase().includes(histQ) ||
    String(o.Member_Name).toLowerCase().includes(histQ) ||
    String(o.Order_ID).toLowerCase().includes(histQ)
  );

  const pCountEl = document.getElementById('pendingOrdersColCount');
  const prCountEl = document.getElementById('processedOrdersColCount');
  if (pCountEl) pCountEl.textContent = pendingList.length;
  if (prCountEl) prCountEl.textContent = processedAll.length;

  // 1. Left Column: Large Detailed Cards for Pending Requests
  pendingContainer.innerHTML = pendingList.length === 0
    ? `<p class="text-xs sm:text-sm text-slate-400 text-center py-8">പുതിയ Pending റിക്വസ്റ്റുകൾ ഒന്നുമില്ല.</p>`
    : pendingList.map(o => {
      const mem = STATE.members.find(m => m.Member_ID === o.Member_ID);
      const phone = mem?.Phone || '';
      const addr = mem?.Address || '';
      const isHomeDeliv = o.Delivery_Mode === 'Home Delivery';
      const statusBadge = o.Status === 'Waitlist'
        ? 'bg-purple-100 text-purple-900 border-purple-300'
        : 'bg-amber-100 text-amber-900 border-amber-300';

      return `
        <div class="p-4 rounded-2xl border border-amber-300/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-2.5">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${statusBadge}">${esc(o.Status)}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${isHomeDeliv ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}">
                ${isHomeDeliv ? '🏠 Home Delivery' : '🏢 Direct Pickup'}
              </span>
              <span class="text-xs font-mono text-slate-400">${esc(o.Order_ID)}</span>
            </div>
            <h5 class="font-extrabold text-slate-900 dark:text-white text-base leading-snug pt-0.5">
              📖 ${esc(o.Book_Title)} <span class="text-xs font-mono font-semibold text-indigo-600">(${esc(o.Book_ID)})</span>
            </h5>
          </div>

          <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 text-xs sm:text-sm space-y-1">
            <p class="font-bold text-slate-800 dark:text-slate-100">
              👤 ${esc(o.Member_Name)} <span class="font-mono text-xs text-slate-500">(${esc(o.Member_ID)})</span>
            </p>
            ${phone || addr ? `
              <p class="text-xs text-slate-600 dark:text-slate-300">
                ${phone ? `📞 <a href="tel:${esc(phone)}" class="font-bold text-indigo-600 hover:underline">${esc(phone)}</a>` : ''}
                ${addr ? ` • 📍 ${esc(addr)}` : ''}
              </p>
            ` : ''}
            <p class="text-[11px] text-slate-400">📅 Ordered: ${esc(o.Order_Date || '-')}</p>
            ${o.Remarks ? `<p class="text-xs text-amber-700 dark:text-amber-300 font-medium">💬 Note: ${esc(o.Remarks)}</p>` : ''}
          </div>

          <div class="flex items-center gap-2 pt-1">
            <button data-ord-id="${esc(o.Order_ID)}" class="js-approve-ord-btn flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-xs transition">
              ✅ Approve / Issue
            </button>
            <button data-ord-id="${esc(o.Order_ID)}" class="js-reject-ord-btn py-2 px-3.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs sm:text-sm font-extrabold rounded-xl transition">
              ✖ Reject
            </button>
          </div>
        </div>
      `;
    }).join('');

  // 2. Right Column: Compact Slim Rows for Approved/Rejected History (Handles 100+ items cleanly)
  processedContainer.innerHTML = processedList.length === 0
    ? `<p class="text-xs text-slate-400 text-center py-8">ഇതുവരെ അപ്രൂവ്/റിജക്ട് ചെയ്ത ഓർഡറുകൾ ഇല്ല.</p>`
    : processedList.map(o => {
      const badgeCls =
        o.Status === 'Approved' ? 'bg-blue-100 text-blue-800' :
        o.Status === 'Issued' ? 'bg-emerald-100 text-emerald-800' :
        'bg-rose-100 text-rose-800';

      return `
        <div class="py-2.5 px-2 flex items-center justify-between gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition">
          <div class="min-w-0 flex-1">
            <p class="font-bold text-slate-900 dark:text-white text-xs truncate">
              ${esc(o.Book_Title)} <span class="font-mono text-[10px] font-normal text-slate-400">(${esc(o.Order_ID)})</span>
            </p>
            <p class="text-[11px] text-slate-500 truncate">
              👤 ${esc(o.Member_Name)} • ${esc(o.Delivery_Mode || 'Pickup')} • ${esc(o.Order_Date || '-')}
            </p>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${badgeCls}">
            ${esc(o.Status)}
          </span>
        </div>
      `;
    }).join('');

  pendingContainer.querySelectorAll('.js-approve-ord-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ord = STATE.orders.find(x => x.Order_ID === btn.getAttribute('data-ord-id'));
      if (ord) openIssueOrderModal(ord);
    });
  });

  pendingContainer.querySelectorAll('.js-reject-ord-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-ord-id');
      showCustomDialog({
        title: "Reject Request",
        message: `ഈ ബുക്ക് റിക്വസ്റ്റ് (${esc(id)}) നിരസിക്കണോ (Reject)?`,
        confirmText: "Yes, Reject",
        onConfirm: () => adminRejectOrder(id)
      });
    });
  });

  if (!adminAutoSyncTimer) startAdminAutoSync();
}
function openIssueOrderModal(o) {
  document.getElementById('ioOrderId').value = o.Order_ID;
  document.getElementById('ioMemberId').value = o.Member_ID;
  document.getElementById('ioBookId').value = o.Book_ID;
  document.getElementById('ioDeliveryMode').value = o.Delivery_Mode || 'Direct Pickup';
  document.getElementById('ioSummary').innerHTML = `<p><strong>Member:</strong> ${esc(o.Member_Name)} (${esc(o.Member_ID)})</p><p><strong>Book:</strong> ${esc(o.Book_Title)}</p><p><strong>Requested Mode:</strong> ${esc(o.Delivery_Mode || 'Direct Pickup')}</p>`;
  document.getElementById('ioIssueDate').value = getLocalTodayISO();
  updateDueDateField('ioIssueDate', 'ioDueDate');
  openModal('issueOrderModal');
}

async function approveOrderOnly() {
  const orderId = document.getElementById('ioOrderId').value;
  const deliveryMode = document.getElementById('ioDeliveryMode').value;
  const res = await postAction({ action: 'updateOrder', orderId, status: 'Approved', deliveryMode, remarks: `Approved for ${deliveryMode}` });
  if (res.status === 'success') {
    closeModal('issueOrderModal');
    showToast(res.message);
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

async function confirmIssueFromOrder(e) {
  e.preventDefault();
  const res = await postAction({
    action: 'issueBook',
    data: {
      Order_ID: document.getElementById('ioOrderId').value,
      Member_ID: document.getElementById('ioMemberId').value,
      Book_ID: document.getElementById('ioBookId').value,
      Delivery_Mode: document.getElementById('ioDeliveryMode').value,
      Issue_Date: document.getElementById('ioIssueDate').value,
      Due_Date: document.getElementById('ioDueDate').value
    }
  });
  if (res.status === 'success') {
    closeModal('issueOrderModal');
    showToast(res.message);
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

async function adminRejectOrder(orderId) {
  const res = await postAction({ action: 'updateOrder', orderId, status: 'Rejected' });
  if (res.status === 'success') {
    showToast("Order Rejected");
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

// ==================== MEMBERS ====================

async function adminDirectCreateMember(e) {
  e.preventDefault();
  const customPass = document.getElementById('admNewMemPass').value.trim();
  const data = {
    Name: document.getElementById('admNewMemName').value.trim(),
    Phone: document.getElementById('admNewMemPhone').value.trim(),
    Address: document.getElementById('admNewMemAddr').value.trim(),
    Password: customPass
  };
  const res = await postAction({ action: 'adminCreateMember', data });
  if (res.status === 'success') {
    e.target.reset();
    showCustomDialog({
      title: "Member Created!",
      message: `<strong>${esc(data.Name)}</strong> (${esc(res.memberId)})<br>Temporary PIN: <strong>${esc(res.oneTimePin || customPass)}</strong>`,
      confirmText: "Issue Book Now",
      onConfirm: () => {
        switchAdminTab('circulation');
        selectMemberForIssue(res.memberId, data.Name, data.Phone);
      }
    });
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

function renderAdminUsers() {
  const q = (document.getElementById('admUserSearch')?.value || '').toLowerCase().trim();
  const container = document.getElementById('admUsersContainer');
  if (!container) return;
  const list = STATE.members.slice().reverse().filter(m =>
    !q || String(m.Name).toLowerCase().includes(q) || String(m.Phone).includes(q) || String(m.Member_ID).toLowerCase().includes(q)
  );

  container.innerHTML = list.map(m => `
    <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex flex-wrap justify-between items-center gap-2">
      <div>
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs font-bold text-indigo-600">${esc(m.Member_ID)}</span>
          <span class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">${esc(m.Name)}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.Status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${esc(m.Status)}</span>
        </div>
        <p class="text-xs text-slate-500 mt-0.5">📞 ${esc(m.Phone)} • ${esc(m.Address)}</p>
      </div>
      <div class="flex items-center gap-1.5">
        <button data-mem-id="${esc(m.Member_ID)}" class="js-reset-pin-btn px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold">Reset PIN</button>
        <button data-mem-id="${esc(m.Member_ID)}" class="js-edit-mem-btn px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold">Edit</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.js-edit-mem-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = STATE.members.find(x => x.Member_ID === btn.getAttribute('data-mem-id'));
      if (m) openEditMemberModal(m);
    });
  });

  container.querySelectorAll('.js-reset-pin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = STATE.members.find(x => x.Member_ID === btn.getAttribute('data-mem-id'));
      if (!m) return;
      showCustomDialog({
        title: "Reset Member PIN",
        message: `"<strong>${esc(m.Name)}</strong>" (${esc(m.Member_ID)})-ന്റെ PIN റീസെറ്റ് ചെയ്ത് പുതിയ 6-അക്ക Temporary PIN ഉണ്ടാക്കണോ?`,
        confirmText: "Reset PIN",
        onConfirm: async () => {
          const res = await postAction({ action: 'adminResetMemberPin', memberId: m.Member_ID });
          if (res.status === 'success') {
            showCustomDialog({
              title: "New Temporary PIN",
              message: `<strong>${esc(res.memberName || m.Name)}</strong> (${esc(m.Member_ID)})<br>New PIN: <strong class="font-mono text-base text-indigo-600">${esc(res.newPin)}</strong><br><span class="text-xs text-slate-500">ഈ PIN അംഗത്തിന് നൽകുക (ആദ്യ ലോഗിനിൽ പുതിയ പാസ്‌വേഡ് മാറ്റണം).</span>`,
              confirmText: "OK",
              isAlertOnly: true
            });
            fetchAllData();
          } else {
            showToast(res.message, true);
          }
        }
      });
    });
  });
}

function openEditMemberModal(m) {
  document.getElementById('emId').value = m.Member_ID;
  document.getElementById('emName').value = m.Name;
  document.getElementById('emPhone').value = m.Phone;
  document.getElementById('emAddress').value = m.Address;
  document.getElementById('emStatus').value = m.Status === 'Rejected' ? 'Rejected' : 'Approved';
  openModal('editMemberModal');
}

async function submitEditMember(e) {
  e.preventDefault();
  const res = await postAction({
    action: 'updateMember',
    data: {
      Member_ID: document.getElementById('emId').value,
      Name: document.getElementById('emName').value.trim(),
      Phone: document.getElementById('emPhone').value.trim(),
      Address: document.getElementById('emAddress').value.trim(),
      Status: document.getElementById('emStatus').value
    }
  });
  if (res.status === 'success') {
    closeModal('editMemberModal');
    showToast(res.message);
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

// ==================== BOOKS & SUGGESTIONS ====================

function renderAdminBooks() {
  const q = (document.getElementById('admBookFilter')?.value || '').toLowerCase().trim();
  const container = document.getElementById('admBooksContainer');
  if (!container) return;
  const filtered = STATE.books.slice().reverse().filter(b =>
    !q || String(b.Title).toLowerCase().includes(q) || String(b.Author).toLowerCase().includes(q) || String(b.Book_ID).toLowerCase().includes(q) || String(b.Type).toLowerCase().includes(q)
  );

  container.innerHTML = filtered.length === 0
    ? `<p class="text-xs text-slate-400 text-center py-6">No books found.</p>`
    : filtered.map(b => `
      <div class="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">${esc(b.Title)} <span class="font-mono text-[10px] text-slate-400">(${esc(b.Book_ID)})</span></p>
          <p class="text-xs text-slate-500 truncate">${esc(b.Author || '-')} • ${esc(b.Type || 'General')} • ₹${Number(b.Price || 0)} • Stock: <strong class="text-emerald-600">${Number(b.Available_Copies)}/${Number(b.Total_Copies)}</strong></p>
        </div>
        <div class="flex gap-1.5 shrink-0">
          <button data-book-id="${esc(b.Book_ID)}" class="js-edit-book-btn px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold">Edit</button>
          <button data-book-id="${esc(b.Book_ID)}" class="js-del-book-btn px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950 text-rose-600 rounded-lg text-xs font-semibold">Del</button>
        </div>
      </div>
    `).join('');

  container.querySelectorAll('.js-edit-book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const b = STATE.books.find(x => x.Book_ID === btn.getAttribute('data-book-id'));
      if (b) openEditBookModal(b);
    });
  });
  container.querySelectorAll('.js-del-book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const b = STATE.books.find(x => x.Book_ID === btn.getAttribute('data-book-id'));
      if (b) adminDeleteBook(b.Book_ID, b.Title);
    });
  });
}

function renderAdminSuggestions() {
  const el = document.getElementById('admSuggestionsContainer');
  const badge = document.getElementById('badgeSuggestions');
  if (badge) badge.textContent = STATE.suggestions.filter(s => s.Status === 'New').length;
  if (!el) return;

  el.innerHTML = STATE.suggestions.length === 0
    ? `<p class="text-xs text-slate-400">No suggestions yet.</p>`
    : STATE.suggestions.map(s => `
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-wrap justify-between items-center gap-2 text-xs">
        <div>
          <p class="font-bold text-slate-900 dark:text-white">${esc(s.Book_Title)} <span class="font-normal text-slate-500">${s.Author ? 'by ' + esc(s.Author) : ''}</span></p>
          <p class="text-[11px] text-slate-500">Suggested by ${esc(s.Member_Name)} ${s.Notes ? '• ' + esc(s.Notes) : ''}</p>
        </div>
        ${s.Status === 'New' ? `
          <button data-sug-id="${esc(s.Sug_ID)}"
            class="js-app-sug-btn px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shrink-0">
            Approve & Add Book
          </button>
        ` : `<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">${esc(s.Status)}</span>`}
      </div>
    `).join('');

  el.querySelectorAll('.js-app-sug-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = STATE.suggestions.find(x => x.Sug_ID === btn.getAttribute('data-sug-id'));
      if (s) openApproveSuggestionModal(s);
    });
  });
}

function openApproveSuggestionModal(s) {
  document.getElementById('asSugId').value = s.Sug_ID;
  document.getElementById('asTitle').value = s.Book_Title || '';
  document.getElementById('asAuthor').value = s.Author || '';
  document.getElementById('asType').value = 'General';
  document.getElementById('asPrice').value = '';
  document.getElementById('asCopies').value = 1;
  document.getElementById('asShelf').value = '';
  openModal('approveSugModal');
}

async function submitApproveSuggestionToBook(e) {
  e.preventDefault();
  const sugId = document.getElementById('asSugId').value;
  const bookData = {
    Title: document.getElementById('asTitle').value.trim(),
    Type: document.getElementById('asType').value.trim() || 'General',
    Price: document.getElementById('asPrice').value || 0,
    Author: document.getElementById('asAuthor').value.trim() || '-',
    Total_Copies: document.getElementById('asCopies').value || 1,
    Shelf: document.getElementById('asShelf').value.trim()
  };

  const res = await postAction({ action: 'approveSuggestionToBook', sugId, bookData });
  if (res.status === 'success') {
    closeModal('approveSugModal');
    showToast("Approved & added to main book list!");
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

function openEditBookModal(b) {
  document.getElementById('ebId').value = b.Book_ID;
  document.getElementById('ebTitle').value = b.Title;
  document.getElementById('ebType').value = b.Type || 'General';
  document.getElementById('ebPrice').value = b.Price || 0;
  document.getElementById('ebAuthor').value = b.Author === '-' ? '' : (b.Author || '');
  document.getElementById('ebCopies').value = b.Total_Copies || 1;
  document.getElementById('ebShelf').value = b.Shelf || '';
  openModal('editBookModal');
}

async function submitEditBook(e) {
  e.preventDefault();
  const res = await postAction({
    action: 'updateBook',
    data: {
      Book_ID: document.getElementById('ebId').value,
      Title: document.getElementById('ebTitle').value.trim(),
      Type: document.getElementById('ebType').value.trim() || 'General',
      Price: document.getElementById('ebPrice').value || 0,
      Author: document.getElementById('ebAuthor').value.trim() || '-',
      Total_Copies: document.getElementById('ebCopies').value || 1,
      Shelf: document.getElementById('ebShelf').value.trim()
    }
  });
  if (res.status === 'success') {
    closeModal('editBookModal');
    showToast(res.message);
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

async function adminAddBook(e) {
  e.preventDefault();
  const res = await postAction({
    action: 'addBook',
    data: {
      Title: document.getElementById('bkTitle').value.trim(),
      Type: document.getElementById('bkType').value.trim() || 'General',
      Price: document.getElementById('bkPrice').value || 0,
      Author: document.getElementById('bkAuthor').value.trim() || '-',
      Total_Copies: document.getElementById('bkCopies').value || 1,
      Shelf: document.getElementById('bkShelf').value.trim()
    }
  });
  if (res.status === 'success') {
    e.target.reset();
    showToast(`Book Added! ID: ${res.bookId}`);
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

function adminDeleteBook(bookId, title) {
  showCustomDialog({
    title: "Delete Book",
    message: `"<strong>${esc(title)}</strong>" (${esc(bookId)}) എന്ന പുസ്തകം ഡിലീറ്റ് ചെയ്യണോ?`,
    confirmText: "Delete",
    onConfirm: async () => {
      const res = await postAction({ action: 'deleteBook', bookId });
      if (res.status === 'success') {
        showToast("Deleted");
        fetchAllData();
      } else {
        showToast(res.message, true);
      }
    }
  });
}

// ==================== CMS & SETTINGS ====================

async function handleSaveCms(e) {
  e.preventDefault();
  const rawLogo = document.getElementById('cmsLogoUrl')?.value.trim() || '';
  if (rawLogo && !safeHttpUrl(rawLogo)) {
    showToast("Logo URL must start with http:// or https://", true);
    return;
  }
  const cms = {
    libraryName: document.getElementById('cmsLibName').value.trim(),
    tagline: document.getElementById('cmsTagline').value.trim(),
    logoUrl: rawLogo,
    allowHomeDelivery: document.getElementById('cmsAllowHomeDelivery')?.checked !== false,
    noticeTicker: document.getElementById('cmsNotice').value.trim(),
    aboutText: document.getElementById('cmsAbout').value.trim(),
    timings: document.getElementById('cmsTimings').value.trim(),
    contactPhone: document.getElementById('cmsPhone').value.trim(),
    address: document.getElementById('cmsAddress').value.trim(),
    bearers: [0, 1, 2].map(i => ({
      role: document.getElementById(`b${i}Role`).value.trim(),
      name: document.getElementById(`b${i}Name`).value.trim(),
      phone: document.getElementById(`b${i}Phone`).value.trim()
    }))
  };
  const res = await postAction({ action: 'saveCmsConfig', cms });
  if (res.status === 'success') {
    showToast(res.message);
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const data = {
    LOAN_DAYS: document.getElementById('setLoanDays').value,
    MAX_BOOKS_PER_USER: document.getElementById('setMaxBooks').value
  };
  const res = await postAction({ action: 'updateSettings', data });
  if (res.status === 'success') {
    showToast(res.message);
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

async function handleAdminChangePassword(e) {
  e.preventDefault();
  const oldPassword = document.getElementById('admOldPass').value;
  const newPassword = document.getElementById('admNewPass').value;
  const confirmPass = document.getElementById('admConfirmPass').value;
  if (newPassword !== confirmPass) {
    showToast("New passwords do not match!", true);
    return;
  }
  const res = await postAction({ action: 'changeAdminPassword', oldPassword, newPassword });
  if (res.status === 'success') {
    e.target.reset();
    showToast(res.message);
  } else {
    showToast(res.message, true);
  }
}

// ==================== REGISTERS, EXCEL & PDF EXPORT (XSS SAFE + STOCK AUDIT) ====================

let CURRENT_REGISTER_TYPE = 'stock';

function showRegister(type) {
  CURRENT_REGISTER_TYPE = type;
  ['stock', 'issue', 'members', 'audit'].forEach(r => {
    const btn = document.getElementById('regBtn_' + r);
    if (btn) {
      btn.className = r === type
        ? "px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
        : "px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
    }
  });

  const container = document.getElementById('registerTableContainer');
  const titleEl = document.getElementById('registerTitle');
  if (!container || !titleEl) return;

  if (type === 'stock') {
    titleEl.textContent = "BOOK STOCK & ASSET REGISTER";
    const totalVal = STATE.books.reduce((s, b) => s + (Number(b.Price || 0) * Number(b.Total_Copies || 0)), 0);
    container.innerHTML = `
      <table class="w-full text-left text-xs border-collapse border border-slate-300">
        <thead class="bg-slate-100">
          <tr>
            <th class="border border-slate-300 p-2">Sl.</th>
            <th class="border border-slate-300 p-2">Book ID</th>
            <th class="border border-slate-300 p-2">Book Name</th>
            <th class="border border-slate-300 p-2">Category</th>
            <th class="border border-slate-300 p-2">Author</th>
            <th class="border border-slate-300 p-2">Price</th>
            <th class="border border-slate-300 p-2">Total</th>
            <th class="border border-slate-300 p-2">Avail</th>
          </tr>
        </thead>
        <tbody>
          ${STATE.books.map((b, idx) => `
            <tr>
              <td class="border border-slate-300 p-2">${idx + 1}</td>
              <td class="border border-slate-300 p-2 font-mono">${esc(b.Book_ID)}</td>
              <td class="border border-slate-300 p-2 font-semibold">${esc(b.Title)}</td>
              <td class="border border-slate-300 p-2">${esc(b.Type || 'General')}</td>
              <td class="border border-slate-300 p-2">${esc(b.Author || '-')}</td>
              <td class="border border-slate-300 p-2">₹${Number(b.Price || 0)}</td>
              <td class="border border-slate-300 p-2">${Number(b.Total_Copies)}</td>
              <td class="border border-slate-300 p-2">${Number(b.Available_Copies)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="text-right text-xs font-bold mt-3">Total Library Asset Value: ₹${totalVal}</p>
    `;
  } else if (type === 'issue') {
    titleEl.textContent = "BOOK ISSUE & RETURN REGISTER";
    container.innerHTML = `
      <table class="w-full text-left text-xs border-collapse border border-slate-300">
        <thead class="bg-slate-100">
          <tr>
            <th class="border border-slate-300 p-2">Txn ID</th>
            <th class="border border-slate-300 p-2">Book</th>
            <th class="border border-slate-300 p-2">Member</th>
            <th class="border border-slate-300 p-2">Issue Date</th>
            <th class="border border-slate-300 p-2">Due Date</th>
            <th class="border border-slate-300 p-2">Return Date</th>
            <th class="border border-slate-300 p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          ${STATE.transactions.map(t => `
            <tr>
              <td class="border border-slate-300 p-2 font-mono">${esc(t.Txn_ID)}</td>
              <td class="border border-slate-300 p-2 font-semibold">${esc(t.Book_Title)}</td>
              <td class="border border-slate-300 p-2">${esc(t.Member_Name)} (${esc(t.Member_ID)})</td>
              <td class="border border-slate-300 p-2">${esc(t.Issue_Date)}</td>
              <td class="border border-slate-300 p-2">${esc(t.Due_Date)}</td>
              <td class="border border-slate-300 p-2">${esc(t.Return_Date || '-')}</td>
              <td class="border border-slate-300 p-2">${esc(t.Status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (type === 'members') {
    titleEl.textContent = "LIBRARY MEMBERSHIP REGISTER";
    container.innerHTML = `
      <table class="w-full text-left text-xs border-collapse border border-slate-300">
        <thead class="bg-slate-100">
          <tr>
            <th class="border border-slate-300 p-2">Member ID</th>
            <th class="border border-slate-300 p-2">Full Name</th>
            <th class="border border-slate-300 p-2">Mobile</th>
            <th class="border border-slate-300 p-2">Address</th>
            <th class="border border-slate-300 p-2">Join Date</th>
            <th class="border border-slate-300 p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          ${STATE.members.map(m => `
            <tr>
              <td class="border border-slate-300 p-2 font-mono">${esc(m.Member_ID)}</td>
              <td class="border border-slate-300 p-2 font-semibold">${esc(m.Name)}</td>
              <td class="border border-slate-300 p-2">${esc(m.Phone)}</td>
              <td class="border border-slate-300 p-2">${esc(m.Address)}</td>
              <td class="border border-slate-300 p-2">${esc(m.Join_Date)}</td>
              <td class="border border-slate-300 p-2">${esc(m.Status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (type === 'audit') {
    titleEl.textContent = "STOCK VERIFICATION & BOOKS IN HAND AUDIT REGISTER";
    const totalCopies = STATE.books.reduce((s, b) => s + Number(b.Total_Copies || 0), 0);
    const availCopies = STATE.books.reduce((s, b) => s + Number(b.Available_Copies || 0), 0);
    const activeLoans = STATE.transactions.filter(t => t.Status === 'Issued');
    const missingCount = totalCopies - (availCopies + activeLoans.length);

    container.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-center">
        <div class="p-3 rounded-xl bg-slate-100 border border-slate-300">
          <p class="text-[11px] text-slate-600 font-semibold">Total Library Stock</p>
          <p class="text-lg font-bold text-slate-900">${totalCopies}</p>
        </div>
        <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-300">
          <p class="text-[11px] text-emerald-700 font-semibold">In Shelf (Available)</p>
          <p class="text-lg font-bold text-emerald-800">${availCopies}</p>
        </div>
        <div class="p-3 rounded-xl bg-amber-50 border border-amber-300">
          <p class="text-[11px] text-amber-700 font-semibold">With Members (Issued)</p>
          <p class="text-lg font-bold text-amber-800">${activeLoans.length}</p>
        </div>
        <div class="p-3 rounded-xl ${missingCount === 0 ? 'bg-indigo-50 border-indigo-300' : 'bg-rose-100 border-rose-400'}">
          <p class="text-[11px] ${missingCount === 0 ? 'text-indigo-700' : 'text-rose-700'} font-semibold">Unaccounted / Diff</p>
          <p class="text-lg font-bold ${missingCount === 0 ? 'text-indigo-900' : 'text-rose-800'}">${missingCount}</p>
        </div>
      </div>

      <h4 class="font-bold text-xs uppercase text-slate-700 mb-2">Currently Issued Books (ആരുടെയൊക്കെ കയ്യിലാണ് പുസ്തകങ്ങൾ ഉള്ളത്):</h4>
      <table class="w-full text-left text-xs border-collapse border border-slate-300">
        <thead class="bg-slate-100">
          <tr>
            <th class="border border-slate-300 p-2">Sl.</th>
            <th class="border border-slate-300 p-2">Book ID</th>
            <th class="border border-slate-300 p-2">Book Name</th>
            <th class="border border-slate-300 p-2">Held By (Member)</th>
            <th class="border border-slate-300 p-2">Mobile Number</th>
            <th class="border border-slate-300 p-2">Issue Date</th>
            <th class="border border-slate-300 p-2">Due Date</th>
          </tr>
        </thead>
        <tbody>
          ${activeLoans.length === 0
            ? `<tr><td colspan="7" class="border border-slate-300 p-4 text-center text-slate-500">എല്ലാ പുസ്തകങ്ങളും ഷെൽഫിൽ ലഭ്യമാണ് (ആരുടെയും കയ്യിൽ പുസ്തകങ്ങളില്ല).</td></tr>`
            : activeLoans.map((t, idx) => {
              const mem = STATE.members.find(m => m.Member_ID === t.Member_ID);
              return `
                <tr>
                  <td class="border border-slate-300 p-2">${idx + 1}</td>
                  <td class="border border-slate-300 p-2 font-mono">${esc(t.Book_ID)}</td>
                  <td class="border border-slate-300 p-2 font-bold">${esc(t.Book_Title)}</td>
                  <td class="border border-slate-300 p-2 font-semibold">${esc(t.Member_Name)} (${esc(t.Member_ID)})</td>
                  <td class="border border-slate-300 p-2 font-mono">${esc(mem?.Phone || '-')}</td>
                  <td class="border border-slate-300 p-2">${esc(t.Issue_Date)}</td>
                  <td class="border border-slate-300 p-2 font-semibold text-rose-700">${esc(t.Due_Date)}</td>
                </tr>
              `;
            }).join('')}
        </tbody>
      </table>
    `;
  }
}

function exportCurrentRegisterExcel() {
  if (!window.XLSX) {
    showToast("Excel library loading...", true);
    return;
  }
  let rows = [];
  if (CURRENT_REGISTER_TYPE === 'stock') {
    rows = STATE.books.map((b, i) => ({
      'Sl No': i + 1,
      'Book ID': b.Book_ID,
      'Book Name': b.Title,
      'Category': b.Type || 'General',
      'Author': b.Author || '-',
      'Price (INR)': Number(b.Price || 0),
      'Total Copies': Number(b.Total_Copies || 0),
      'Available Copies': Number(b.Available_Copies || 0)
    }));
  } else if (CURRENT_REGISTER_TYPE === 'issue') {
    rows = STATE.transactions.map(t => ({
      'Transaction ID': t.Txn_ID,
      'Book Title': t.Book_Title,
      'Member ID': t.Member_ID,
      'Member Name': t.Member_Name,
      'Issue Date': t.Issue_Date,
      'Due Date': t.Due_Date,
      'Return Date': t.Return_Date || '',
      'Status': t.Status
    }));
  } else if (CURRENT_REGISTER_TYPE === 'audit') {
    rows = STATE.transactions.filter(t => t.Status === 'Issued').map((t, i) => {
      const mem = STATE.members.find(m => m.Member_ID === t.Member_ID);
      return {
        'Sl No': i + 1,
        'Book ID': t.Book_ID,
        'Book Name': t.Book_Title,
        'Held By': `${t.Member_Name} (${t.Member_ID})`,
        'Mobile': mem?.Phone || '-',
        'Issue Date': t.Issue_Date,
        'Due Date': t.Due_Date
      };
    });
  } else {
    rows = STATE.members.map(m => ({
      'Member ID': m.Member_ID,
      'Name': m.Name,
      'Phone': m.Phone,
      'Address': m.Address,
      'Join Date': m.Join_Date,
      'Status': m.Status
    }));
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Register");
  XLSX.writeFile(wb, `Jnanodaya_${CURRENT_REGISTER_TYPE}_Register.xlsx`);
  showToast("Excel file downloaded!");
}

function exportCurrentRegisterPdf() {
  const area = document.getElementById('registerPrintArea');
  if (!window.html2pdf || !area) {
    window.print();
    return;
  }
  showToast("Generating PDF...");
  html2pdf().from(area).set({
    margin: 8,
    filename: `Jnanodaya_${CURRENT_REGISTER_TYPE}_Register.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  }).save();
}

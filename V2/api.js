window.addEventListener('DOMContentLoaded', async () => {
  initThemeMode();
  initViewportMode();
  await restoreSavedSession();
  initScrollAnimations();

  const today = getLocalTodayISO();
  const issDateEl = document.getElementById('issDate');
  if (issDateEl) {
    issDateEl.value = today;
    updateDueDateField('issDate', 'issDueDate');
  }
  await fetchAllData();

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#issMemSearch') && !e.target.closest('#issMemDropdown')) {
      document.getElementById('issMemDropdown')?.classList.add('hidden');
    }
    if (!e.target.closest('#issBookSearch') && !e.target.closest('#issBookDropdown')) {
      document.getElementById('issBookDropdown')?.classList.add('hidden');
    }
    if (!e.target.closest('#quickReturnSearch') && !e.target.closest('#quickReturnDropdown')) {
      document.getElementById('quickReturnDropdown')?.classList.add('hidden');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['availableBooksModal', 'guestRequestModal', 'unifiedAuthModal', 'cartModal', 'reviewModal', 'approveSugModal', 'issueOrderModal', 'confirmReturnModal', 'editBookModal', 'editMemberModal', 'uiDialogModal'].forEach(closeModal);
    }
  });
});

// ==================== THEME & VIEWPORT MODE ====================

function initThemeMode() {
  STATE.isDarkMode = localStorage.getItem(THEME_KEY) === 'dark';
  applyThemeMode();
}

function toggleDarkMode() {
  STATE.isDarkMode = !STATE.isDarkMode;
  localStorage.setItem(THEME_KEY, STATE.isDarkMode ? 'dark' : 'light');
  applyThemeMode();
}

function applyThemeMode() {
  document.documentElement.classList.toggle('dark', STATE.isDarkMode);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = STATE.isDarkMode ? '☀️' : '🌙';
  if (STATE.isAdmin && typeof renderCategoryChart === 'function') renderCategoryChart();
}

function initViewportMode() {
  const saved = localStorage.getItem(VIEW_MODE_KEY);
  if (saved === 'mobile') STATE.isMobileMode = true;
  else if (saved === 'desktop') STATE.isMobileMode = false;
  else STATE.isMobileMode = window.innerWidth < 640;
  applyViewportMode();
}

function toggleViewportMode() {
  STATE.isMobileMode = !STATE.isMobileMode;
  localStorage.setItem(VIEW_MODE_KEY, STATE.isMobileMode ? 'mobile' : 'desktop');
  applyViewportMode();
  showToast(STATE.isMobileMode ? "Mobile App Mode Enabled" : "Desktop Mode Enabled");
}

function applyViewportMode() {
  const isMob = STATE.isMobileMode;
  document.body.classList.toggle('mobile-app-mode', isMob);

  const iconEl = document.getElementById('viewToggleIcon');
  const lblEl = document.getElementById('viewToggleLabel');
  if (iconEl) iconEl.textContent = isMob ? '🖥️' : '📱';
  if (lblEl) lblEl.textContent = isMob ? 'Desktop' : 'App Mode';

  document.querySelectorAll('.desktop-only').forEach(el => {
    el.classList.toggle('hidden', isMob);
  });

  renderMobileBottomNav();
  if (typeof renderHomeBooks === 'function') renderHomeBooks();
  if (STATE.currentUser && typeof renderMemberBooks === 'function') renderMemberBooks();
  if (STATE.isAdmin && typeof renderAdminBooks === 'function') renderAdminBooks();
}

function renderMobileBottomNav() {
  const nav = document.getElementById('mobileBottomNav');
  const inner = document.getElementById('mobileBottomNavInner');
  if (!nav || !inner) return;

  if (!STATE.isMobileMode) {
    nav.classList.add('hidden');
    return;
  }
  nav.classList.remove('hidden');

  if (STATE.isAdmin) {
    inner.innerHTML = `
      <button onclick="navigateTo('admin'); switchAdminTab('overview')" class="py-1 text-[11px] font-semibold flex flex-col items-center">
        <span class="text-base">📊</span><span>Overview</span>
      </button>
      <button onclick="navigateTo('admin'); switchAdminTab('circulation')" class="py-1 text-[11px] font-semibold flex flex-col items-center">
        <span class="text-base">🔄</span><span>Issue/Ret</span>
      </button>
      <button onclick="navigateTo('admin'); switchAdminTab('orders')" class="py-1 text-[11px] font-semibold flex flex-col items-center">
        <span class="text-base">📦</span><span>Requests</span>
      </button>
      <button onclick="navigateTo('admin'); switchAdminTab('users')" class="py-1 text-[11px] font-semibold flex flex-col items-center">
        <span class="text-base">👥</span><span>Members</span>
      </button>
    `;
  } else if (STATE.currentUser) {
    inner.innerHTML = `
      <button onclick="navigateTo('member'); switchMemberTab('browse')" class="py-1 text-[11px] font-semibold flex flex-col items-center">
        <span class="text-base">📚</span><span>Books</span>
      </button>
      <button onclick="navigateTo('member'); switchMemberTab('mybooks')" class="py-1 text-[11px] font-semibold flex flex-col items-center">
        <span class="text-base">📖</span><span>History</span>
      </button>
      <button onclick="navigateTo('member'); switchMemberTab('suggest')" class="py-1 text-[11px] font-semibold flex flex-col items-center">
        <span class="text-base">💡</span><span>Suggest</span>
      </button>
      <button onclick="navigateTo('member'); switchMemberTab('profile')" class="py-1 text-[11px] font-semibold flex flex-col items-center">
        <span class="text-base">🪪</span><span>ID Card</span>
      </button>
    `;
  } else {
    inner.innerHTML = `
      <button onclick="navigateTo('home')" class="col-span-2 py-1 text-[11px] font-semibold text-indigo-600 flex flex-col items-center">
        <span class="text-base">🏛️</span><span>Library Home</span>
      </button>
      <button onclick="openUnifiedAuth('userLogin')" class="col-span-2 py-1 text-[11px] font-semibold flex flex-col items-center">
        <span class="text-base">🔐</span><span>History / Admin Login</span>
      </button>
    `;
  }
}

function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ==================== SUPABASE DATA MAPPERS & ZERO-LEAK FETCH ====================

function mapBook(r) {
  return { Book_ID: r.book_id, Title: r.title, Type: r.type, Author: r.author, Price: r.price, Shelf: r.shelf, Total_Copies: r.total_copies, Available_Copies: r.available_copies, Added_Date: r.added_date };
}
function mapMember(r) {
  return { Member_ID: r.member_id || r.Member_ID, Name: r.name || r.Name, Phone: r.phone || r.Phone || '', Address: r.address || r.Address || '', Join_Date: r.join_date || r.Join_Date || '', Status: r.status || r.Status, mustChangePass: !!r.mustChangePass };
}
function mapTxn(r) {
  return { Txn_ID: r.txn_id, Book_ID: r.book_id, Book_Title: r.book_title, Member_ID: r.member_id, Member_Name: r.member_name, Issue_Date: r.issue_date, Due_Date: r.due_date, Return_Date: r.return_date, Status: r.status };
}
function mapOrder(r) {
  return { Order_ID: r.order_id, Member_ID: r.member_id, Member_Name: r.member_name, Book_ID: r.book_id, Book_Title: r.book_title, Order_Date: r.order_date, Status: r.status, Remarks: r.remarks, Delivery_Mode: r.delivery_mode };
}
function mapReview(r) {
  return { Review_ID: r.review_id, Book_ID: r.book_id, Member_ID: r.member_id, Member_Name: r.member_name, Rating: r.rating, Comment: r.comment, Date: r.date };
}
function mapSuggestion(r) {
  return { Sug_ID: r.sug_id, Member_ID: r.member_id, Member_Name: r.member_name, Book_Title: r.book_title, Author: r.author, Notes: r.notes, Status: r.status, Date: r.date };
}
function mapLog(r) {
  return { Log_ID: r.log_id, Timestamp: r.timestamp, Actor: r.actor, Action: r.action, Details: r.details };
}

async function fetchAllData() {
  document.getElementById('topSyncBar')?.classList.remove('hidden');
  try {
    // 1. Public safe data only (Books, Reviews, Aggregated Home Summary)
    const [bRes, rRes, pubRes] = await Promise.all([
      sb.rpc('get_all_books_safe'),
      sb.from('reviews').select('*'),
      sb.rpc('get_public_home_summary')
    ]);

    if (bRes.error) throw bRes.error;
    STATE.books = (bRes.data || []).map(mapBook);
    STATE.reviews = (rRes.data || []).map(mapReview);

    if (pubRes.data) {
      if (pubRes.data.cms) {
        try { STATE.cms = { ...DEFAULT_CMS, ...JSON.parse(pubRes.data.cms) }; } catch (e) {}
      }
      STATE.settings.LOAN_DAYS = pubRes.data.loanDays || 14;
      STATE.settings.MAX_BOOKS_PER_USER = pubRes.data.maxBooks || 3;
      STATE.publicSummary = pubRes.data;
    }

    // 2. If Admin is logged in, fetch protected admin state
    if (STATE.isAdmin) {
      const { data: admData, error: admErr } = await sb.rpc('get_admin_full_state');
      if (admErr || admData?.status !== 'success') {
        STATE.isAdmin = false;
        await sb.auth.signOut();
        updateHeaderAuthUI();
        navigateTo('home');
        showToast("Admin session expired. Please login again.", true);
        return;
      }
      STATE.members = (admData.members || []).map(mapMember);
      STATE.transactions = (admData.transactions || []).map(mapTxn);
      STATE.orders = (admData.orders || []).map(mapOrder);
      STATE.suggestions = (admData.suggestions || []).map(mapSuggestion);
      STATE.auditLogs = (admData.auditLogs || []).map(mapLog);
      (admData.settings || []).forEach(row => {
        if (row.key !== 'CMS_CONFIG') STATE.settings[row.key] = row.value;
      });
    }

    applyCmsToHomePage();
    updateDueDateField('issDate', 'issDueDate');
    syncCategoryDropdowns();
    if (typeof renderHomePage === 'function') renderHomePage();
    if (STATE.currentUser && typeof renderMemberDashboard === 'function') renderMemberDashboard();
    if (STATE.isAdmin && typeof renderAdminDashboard === 'function') renderAdminDashboard();
  } catch (e) {
    showToast("Database sync error: " + (e.message || ''), true);
  } finally {
    document.getElementById('topSyncBar')?.classList.add('hidden');
  }
}

// ==================== DATABASE BACKUP EXPORT & IMPORT ====================

async function exportFullDatabaseBackup() {
  if (!STATE.isAdmin) {
    showToast("Admin access required", true);
    return;
  }
  document.getElementById('topSyncBar')?.classList.remove('hidden');
  try {
    const { data: admData, error } = await sb.rpc('get_admin_full_state');
    if (error || admData?.status !== 'success') throw new Error("Unauthorized");

    const backupPayload = {
      app: "Jnanodaya Library Management System",
      version: "Supabase-Hardened-v2",
      exportedAt: new Date().toISOString(),
      tables: {
        books: STATE.books.map(b => ({
          book_id: b.Book_ID, title: b.Title, type: b.Type, author: b.Author,
          price: b.Price, shelf: b.Shelf, total_copies: b.Total_Copies,
          available_copies: b.Available_Copies, added_date: b.Added_Date
        })),
        members: admData.members || [],
        transactions: admData.transactions || [],
        orders: admData.orders || [],
        reviews: STATE.reviews.map(r => ({
          review_id: r.Review_ID, book_id: r.Book_ID, member_id: r.Member_ID,
          member_name: r.Member_Name, rating: r.Rating, comment: r.Comment, date: r.Date
        })),
        suggestions: admData.suggestions || [],
        settings: admData.settings || []
      }
    };

    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jnanodaya_Library_Backup_${getLocalTodayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("Full Database Backup Downloaded!");
  } catch (err) {
    showToast("Backup failed: " + err.message, true);
  } finally {
    document.getElementById('topSyncBar')?.classList.add('hidden');
  }
}

async function importFullDatabaseBackup() {
  if (!STATE.isAdmin) {
    showToast("Admin access required", true);
    return;
  }
  const fileInput = document.getElementById('dbBackupFileInput');
  const file = fileInput?.files?.[0];
  if (!file) {
    showToast("ദയവായി ഒരു .json ബാക്കപ്പ് ഫയൽ തിരഞ്ഞെടുക്കുക.", true);
    return;
  }

  showCustomDialog({
    title: "Restore Database Backup",
    message: "തിരഞ്ഞെടുത്ത ബാക്കപ്പ് ഫയലിലെ വിവരങ്ങൾ ഡാറ്റാബേസിലേക്ക് ഇമ്പോർട്ട് ചെയ്യണോ? (നിലവിലുള്ള ഒരേ ID-കൾ അപ്ഡേറ്റ് ആകും).",
    confirmText: "Yes, Restore",
    onConfirm: async () => {
      document.getElementById('topSyncBar')?.classList.remove('hidden');
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || !parsed.tables) {
          throw new Error("Invalid backup file format");
        }
        const { data: rpcRes, error } = await sb.rpc('secure_admin_restore_backup', {
          p_tables: parsed.tables
        });
        if (error) throw error;
        if (rpcRes?.status !== 'success') throw new Error(rpcRes?.message || 'Restore failed');

        fileInput.value = '';
        await fetchAllData();
        showToast("Database Backup Restored Successfully!");
      } catch (err) {
        showToast("Restore failed: " + err.message, true);
      } finally {
        document.getElementById('topSyncBar')?.classList.add('hidden');
      }
    }
  });
}

// ==================== SECURE RPC & DATABASE ACTIONS ====================

async function postAction(payload) {
  document.getElementById('topSyncBar')?.classList.remove('hidden');
  try {
    const { action, data } = payload;
    const today = getLocalTodayISO();

    // 1. Secure Guest Direct Request (Generates Random 6-digit One-Time PIN)
    if (action === 'guestDirectRequest') {
      const { data: rpcRes, error } = await sb.rpc('secure_guest_request', {
        p_phone: String(data.Phone || '').trim(),
        p_name: String(data.Name || '').trim(),
        p_address: String(data.Address || '').trim(),
        p_book_id: data.Book_ID,
        p_deliv_mode: data.Delivery_Mode || 'Direct Pickup',
        p_remarks: data.Remarks || ''
      });
      if (error) return { status: 'error', message: error.message };
      return rpcRes;
    }

    // 2. Secure Member Auth
    if (action === 'userSignup') {
      const { data: rpcRes, error } = await sb.rpc('secure_member_signup', {
        p_name: data.Name,
        p_phone: data.Phone,
        p_address: data.Address,
        p_pass: data.Password
      });
      if (error) return { status: 'error', message: error.message };
      return rpcRes;
    }

    if (action === 'userLogin') {
      const { data: rpcRes, error } = await sb.rpc('secure_member_login', {
        p_phone: payload.phone,
        p_pass: payload.password
      });
      if (error) return { status: 'error', message: error.message };
      if (!rpcRes || rpcRes.status !== 'success') {
        return { status: 'error', message: rpcRes?.message || 'മൊബൈൽ നമ്പറോ പാസ്‌വേഡോ തെറ്റാണ്.' };
      }
      STATE.transactions = (rpcRes.transactions || []).map(mapTxn);
      STATE.orders = (rpcRes.orders || []).map(mapOrder);
      STATE.suggestions = (rpcRes.suggestions || []).map(mapSuggestion);
      return { status: 'success', user: mapMember(rpcRes.user) };
    }

    if (action === 'changeUserPassword') {
      const { data: rpcRes, error } = await sb.rpc('secure_member_action', {
        p_member_id: STATE.currentUser.Member_ID,
        p_phone: STATE.currentUser.Phone,
        p_action: 'changePassword',
        p_payload: { oldPassword: payload.oldPassword, newPassword: payload.newPassword }
      });
      if (error) return { status: 'error', message: error.message };
      return rpcRes;
    }

    // 3. Real Supabase Admin Auth (JWT + Old Password Verification)
    if (action === 'adminLogin') {
      const { data: authData, error } = await sb.auth.signInWithPassword({
        email: payload.username,
        password: payload.password
      });
      if (error) return { status: 'error', message: error.message };
      STATE.settings.ADMIN_USER = authData.user.email;
      return { status: 'success', message: 'Admin authenticated' };
    }

    if (action === 'changeAdminPassword') {
      const email = STATE.settings.ADMIN_USER;
      const { error: verifyErr } = await sb.auth.signInWithPassword({ email, password: payload.oldPassword });
      if (verifyErr) return { status: 'error', message: 'നിലവിലെ അഡ്മിൻ പാസ്‌വേഡ് തെറ്റാണ്!' };
      const { error } = await sb.auth.updateUser({ password: payload.newPassword });
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Admin password updated!' };
    }

    // 4. Secure Books CRUD (Admin Only)
    if (action === 'addBook' || action === 'updateBook' || action === 'deleteBook') {
      const actType = action === 'addBook' ? 'add' : action === 'updateBook' ? 'update' : 'delete';
      const { data: rpcRes, error } = await sb.rpc('secure_admin_manage_book', {
        p_action: actType,
        p_book_id: payload.bookId || data?.Book_ID || '',
        p_title: data?.Title || '',
        p_type: data?.Type || 'General',
        p_author: data?.Author || '-',
        p_price: Number(data?.Price) || 0,
        p_shelf: data?.Shelf || '',
        p_total_copies: Number(data?.Total_Copies) || 1
      });
      if (error) return { status: 'error', message: error.message };
      return rpcRes || { status: 'error', message: 'Book operation failed' };
    }

    // 5. Members Admin Actions
    if (action === 'adminCreateMember') {
      const pass = data.Password || '';
      const { data: rpcRes, error } = await sb.rpc('secure_admin_create_member', {
        p_name: String(data.Name || '').trim(),
        p_phone: String(data.Phone || '').trim(),
        p_address: String(data.Address || '').trim(),
        p_pass: pass
      });
      if (error) return { status: 'error', message: error.message };
      return rpcRes || { status: 'error', message: 'Failed to create member' };
    }

if (action === 'updateMember') {
      const { error } = await sb.from('members').update({
        name: String(data.Name || '').trim(),
        phone: String(data.Phone || '').trim(),
        address: String(data.Address || '').trim(),
        status: data.Status
      }).eq('member_id', data.Member_ID);

      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Member updated!' };
    }

    if (action === 'adminResetMemberPin') {
      const { data: rpcRes, error } = await sb.rpc('secure_admin_reset_member_pin', {
        p_member_id: payload.memberId
      });
      if (error) return { status: 'error', message: error.message };
      return rpcRes || { status: 'error', message: 'PIN reset failed' };
    }
    // 6. Orders, Secure Issue & Return
    if (action === 'placeBatchOrder') {
      const { data: rpcRes, error } = await sb.rpc('secure_member_action', {
        p_member_id: STATE.currentUser.Member_ID,
        p_phone: STATE.currentUser.Phone,
        p_action: 'placeBatchOrder',
        p_payload: {
          bookIds: data.Book_IDs,
          deliveryMode: data.Delivery_Mode || 'Direct Pickup',
          remarks: data.Remarks || ''
        }
      });
      if (error) return { status: 'error', message: error.message };
      if (rpcRes?.status === 'success') {
        const loginRefresh = await sb.rpc('secure_member_login', {
          p_phone: STATE.currentUser.Phone,
          p_pass: STATE._memSessionPass || ''
        });
        if (loginRefresh.data?.status === 'success') {
          STATE.orders = (loginRefresh.data.orders || []).map(mapOrder);
        }
      }
      return rpcRes;
    }

    if (action === 'updateOrder') {
      const upd = { status: payload.status };
      if (payload.deliveryMode) upd.delivery_mode = payload.deliveryMode;
      if (payload.remarks) upd.remarks = payload.remarks;
      const { error } = await sb.from('orders').update(upd).eq('order_id', payload.orderId);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Order updated' };
    }

    if (action === 'issueBook' || action === 'returnBook') {
      const { data: rpcRes, error } = await sb.rpc('secure_admin_circulation', {
        p_action: action === 'issueBook' ? 'issue' : 'return',
        p_txn_id: data.Txn_ID || '',
        p_member_id: data.Member_ID || '',
        p_book_id: data.Book_ID || '',
        p_order_id: data.Order_ID || '',
        p_deliv_mode: data.Delivery_Mode || 'Direct Pickup',
        p_issue_date: data.Issue_Date || today,
        p_due_date: data.Due_Date || today,
        p_return_date: data.Return_Date || today
      });
      if (error) return { status: 'error', message: error.message };
      return rpcRes || { status: 'error', message: 'Circulation operation failed' };
    }

    // 7. Reviews, Suggestions & CMS
    if (action === 'addReview') {
      const { data: rpcRes, error } = await sb.rpc('secure_member_action', {
        p_member_id: STATE.currentUser.Member_ID,
        p_phone: STATE.currentUser.Phone,
        p_action: 'addReview',
        p_payload: {
          bookId: data.Book_ID,
          rating: Number(data.Rating) || 5,
          comment: data.Comment
        }
      });
      if (error) return { status: 'error', message: error.message };
      return rpcRes;
    }

    if (action === 'addSuggestion') {
      const { data: rpcRes, error } = await sb.rpc('secure_member_action', {
        p_member_id: STATE.currentUser.Member_ID,
        p_phone: STATE.currentUser.Phone,
        p_action: 'addSuggestion',
        p_payload: {
          bookTitle: data.Book_Title,
          author: data.Author || '',
          notes: data.Notes || ''
        }
      });
      if (error) return { status: 'error', message: error.message };
      return rpcRes;
    }

    if (action === 'approveSuggestionToBook') {
      const { data: rpcRes, error } = await sb.rpc('secure_admin_approve_suggestion', {
        p_sug_id: payload.sugId,
        p_title: payload.bookData.Title,
        p_type: payload.bookData.Type || 'General',
        p_author: payload.bookData.Author || '-',
        p_price: Number(payload.bookData.Price) || 0,
        p_shelf: payload.bookData.Shelf || '',
        p_total_copies: Number(payload.bookData.Total_Copies) || 1
      });
      if (error) return { status: 'error', message: error.message };
      return rpcRes;
    }

    if (action === 'saveCmsConfig') {
      const { data: rpcRes, error } = await sb.rpc('secure_admin_save_settings', {
        p_items: [{ key: 'CMS_CONFIG', value: JSON.stringify(payload.cms) }]
      });
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Home Page updated!' };
    }

    if (action === 'updateSettings') {
      const { data: rpcRes, error } = await sb.rpc('secure_admin_save_settings', {
        p_items: [
          { key: 'LOAN_DAYS', value: String(data.LOAN_DAYS) },
          { key: 'MAX_BOOKS_PER_USER', value: String(data.MAX_BOOKS_PER_USER) }
        ]
      });
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Library rules saved!' };
    }

    return { status: 'error', message: 'Unknown action' };
  } catch (err) {
    return { status: 'error', message: err.message || err.toString() };
  } finally {
    document.getElementById('topSyncBar')?.classList.add('hidden');
  }
}

// ==================== SHARED UI & AUTH HELPERS ====================

function showCustomDialog({ title, message, confirmText = "Confirm", isAlertOnly = false, onConfirm = null }) {
  document.getElementById('uiDialogTitle').textContent = title;
  document.getElementById('uiDialogBody').innerHTML = message;
  const cancelBtn = document.getElementById('uiDialogCancelBtn');
  const confirmBtn = document.getElementById('uiDialogConfirmBtn');
  cancelBtn.classList.toggle('hidden', isAlertOnly);
  confirmBtn.textContent = confirmText;
  confirmBtn.onclick = () => {
    closeModal('uiDialogModal');
    if (onConfirm) onConfirm();
  };
  openModal('uiDialogModal');
}

function saveSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    currentUser: STATE.currentUser,
    transactions: STATE.transactions,
    orders: STATE.orders,
    suggestions: STATE.suggestions
  }));
}

async function restoreSavedSession() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session && session.user) {
      STATE.isAdmin = true;
      STATE.currentUser = null;
      STATE.settings.ADMIN_USER = session.user.email;
      updateHeaderAuthUI();
      navigateTo('admin');
      return;
    }

    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { navigateTo('home'); return; }
    const saved = JSON.parse(raw);
    if (saved.currentUser && saved.currentUser.Member_ID) {
      STATE.currentUser = saved.currentUser;
      STATE.transactions = saved.transactions || [];
      STATE.orders = saved.orders || [];
      STATE.suggestions = saved.suggestions || [];
      STATE.isAdmin = false;
      updateHeaderAuthUI();
      navigateTo('member');
    } else {
      navigateTo('home');
    }
  } catch (e) {
    navigateTo('home');
  }
}

function navigateTo(view) {
  ['home', 'member', 'admin'].forEach(v => {
    const el = document.getElementById('view_' + v);
    if (!el) return;
    el.classList.toggle('hidden', v !== view);
    el.style.display = v === view ? 'block' : 'none';
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToDashboard() {
  if (STATE.isAdmin) { switchAdminTab('overview'); navigateTo('admin'); }
  else if (STATE.currentUser) { switchMemberTab('browse'); navigateTo('member'); }
}

function openProfileView() {
  if (STATE.isAdmin) { navigateTo('admin'); switchAdminTab('profile'); }
  else if (STATE.currentUser) { navigateTo('member'); switchMemberTab('profile'); }
}

function openUnifiedAuth(mode = 'userLogin', prefillPhone = '') {
  switchUnifiedRole(mode);
  if (prefillPhone && document.getElementById('loginPhone')) {
    document.getElementById('loginPhone').value = prefillPhone;
  }
  openModal('unifiedAuthModal');
}

function switchUnifiedRole(mode) {
  ['userLogin', 'adminLogin', 'userSignup'].forEach(f => {
    document.getElementById('uForm_' + f)?.classList.toggle('hidden', f !== mode);
  });
  const toggleBox = document.getElementById('roleToggleContainer');
  const heading = document.getElementById('authModalHeading');
  if (mode === 'userSignup') {
    toggleBox.classList.add('hidden');
    heading.textContent = "New Member Sign Up";
  } else {
    toggleBox.classList.remove('hidden');
    const isUser = mode === 'userLogin';
    heading.textContent = isUser ? "Member Login" : "Admin Login";
    document.getElementById('roleBtn_user').className = isUser ? "py-2 rounded-lg bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "py-2 rounded-lg text-slate-500";
    document.getElementById('roleBtn_admin').className = !isUser ? "py-2 rounded-lg bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "py-2 rounded-lg text-slate-500";
  }
}

async function handleMemberSignup(e) {
  e.preventDefault();
  const data = {
    Name: document.getElementById('regName').value.trim(),
    Phone: document.getElementById('regPhone').value.trim(),
    Address: document.getElementById('regAddress').value.trim(),
    Password: document.getElementById('regPass').value
  };
  const res = await postAction({ action: 'userSignup', data });
  if (res.status === 'success') {
    e.target.reset();
    switchUnifiedRole('userLogin');
    document.getElementById('loginPhone').value = data.Phone;
    showToast(res.message);
    fetchAllData();
  } else {
    showToast(res.message, true);
  }
}

async function handleMemberLogin(e) {
  if (e) e.preventDefault();
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPass').value;
  const res = await postAction({ action: 'userLogin', phone, password });
  if (res.status === 'success' && res.user) {
    STATE.currentUser = res.user;
    STATE._memSessionPass = password;
    STATE.isAdmin = false;
    saveSession();
    closeModal('unifiedAuthModal');
    updateHeaderAuthUI();
    navigateTo('member');
    if (typeof renderMemberDashboard === 'function') renderMemberDashboard();

    if (res.user.mustChangePass) {
      switchMemberTab('profile');
      showToast("സുരക്ഷയ്ക്കായി ദയവായി നിങ്ങളുടെ പുതിയ പാസ്‌വേഡ് സെറ്റ് ചെയ്യുക!", true);
    } else {
      showToast(`സ്വാഗതം, ${res.user.Name}!`);
    }
  } else {
    showToast(res.message, true);
  }
}

async function handleAdminLogin(e) {
  if (e) e.preventDefault();
  const username = document.getElementById('admUser').value.trim();
  const password = document.getElementById('admPass').value;
  const res = await postAction({ action: 'adminLogin', username, password });
  if (res.status === 'success') {
    STATE.isAdmin = true;
    STATE.currentUser = null;
    closeModal('unifiedAuthModal');
    updateHeaderAuthUI();
    await fetchAllData();
    switchAdminTab('overview');
    navigateTo('admin');
    showToast("Admin Logged In");
  } else {
    showToast(res.message, true);
  }
}

function updateHeaderAuthUI() {
  const isLogged = !!(STATE.currentUser || STATE.isAdmin);
  document.getElementById('guestNavBtns').classList.toggle('hidden', isLogged);
  document.getElementById('loggedInNavBtns').classList.toggle('hidden', !isLogged);
  document.getElementById('loggedInNavBtns').classList.toggle('flex', isLogged);
  document.getElementById('hdrCartBtn').classList.toggle('hidden', !STATE.currentUser);

  if (STATE.currentUser) document.getElementById('loggedUserBadge').textContent = STATE.currentUser.Name;
  else if (STATE.isAdmin) document.getElementById('loggedUserBadge').textContent = "Admin";
  renderMobileBottomNav();
}

function confirmLogout() {
  showCustomDialog({
    title: "Logout",
    message: "നിങ്ങൾക്ക് അക്കൗണ്ടിൽ നിന്ന് ലോഗൗട്ട് ചെയ്യണോ?",
    confirmText: "Logout",
    onConfirm: async () => {
      if (STATE.isAdmin) await sb.auth.signOut();
      STATE.currentUser = null;
      STATE._memSessionPass = null;
      STATE.isAdmin = false;
      STATE.cart = [];
      STATE.members = [];
      STATE.transactions = [];
      STATE.orders = [];
      STATE.auditLogs = [];
      localStorage.removeItem(SESSION_KEY);
      updateHeaderAuthUI();
      await fetchAllData();
      navigateTo('home');
      showToast("Logged out");
    }
  });
}

function syncCategoryDropdowns() {
  const defaults = ['Novel', 'Story', 'Poem', 'General'];
  const fromBooks = STATE.books.map(b => String(b.Type || '').trim()).filter(Boolean);
  const uniqueCats = [...new Set([...defaults, ...fromBooks])].sort();

  const datalist = document.getElementById('categorySuggestionsList');
  if (datalist) datalist.innerHTML = uniqueCats.map(c => `<option value="${esc(c)}">`).join('');

  ['homeTypeFilter', 'memBookType'].forEach(selectId => {
    const el = document.getElementById(selectId);
    if (!el) return;
    const prev = el.value;
    el.innerHTML = `<option value="">All Categories</option>` + uniqueCats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    el.value = prev;
  });
}

function updateDueDateField(startId, endId) {
  const startEl = document.getElementById(startId);
  const endEl = document.getElementById(endId);
  if (!startEl || !endEl || !startEl.value) return;
  const d = new Date(startEl.value);
  d.setDate(d.getDate() + Number(STATE.settings.LOAN_DAYS || 14));
  const offset = d.getTimezoneOffset() * 60000;
  endEl.value = new Date(d.getTime() - offset).toISOString().split('T')[0];
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('flex');
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('hidden');
    el.classList.remove('flex');
  }
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  if (!toast || !icon) return;
  document.getElementById('toastMsg').textContent = msg;
  icon.className = `w-2.5 h-2.5 rounded-full shrink-0 ${isError ? 'bg-rose-400' : 'bg-emerald-400'}`;
  toast.classList.remove('translate-y-28', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('translate-y-28', 'opacity-0');
  }, 3800);
}

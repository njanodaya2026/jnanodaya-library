const SUPABASE_URL = "https://kgjesxofqjdpxrfjpfdb.supabase.co";
const SUPABASE_KEY = "sb_publishable_o5mv_eYW4RU7MU5fmYNUFQ_UQdTSx_P";

if (!window.supabase) {
  alert("Supabase SDK load ayilla! Internet connection check cheyyuka.");
  throw new Error("Supabase SDK missing");
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global XSS Sanitizer
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// Strict HTTP/HTTPS URL Validator for Logo
function safeHttpUrl(url) {
  const clean = String(url || '').trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(clean) ? clean : '';
}

// India Standard Time (IST) Local Date Helper
function getLocalTodayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
}

const SESSION_KEY = "jnanodaya_lib_session_supabase_v2";
const VIEW_MODE_KEY = "jnanodaya_view_mode_v3";
const THEME_KEY = "jnanodaya_theme_v2";

const DEFAULT_CMS = {
  libraryName: 'ജ്ഞാനോദയ ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബ് ലൈബ്രറി',
  tagline: 'ഗ്രന്ഥശാല & വായനശാല പോർട്ടൽ',
  logoUrl: '',
  allowHomeDelivery: true,
  aboutText: 'നമ്മുടെ നാടിന്റെ സാംസ്കാരികവും കായികവുമായ മുന്നേറ്റത്തിനൊപ്പം വായനയുടെ പുതിയ ലോകം തുറന്നിടുന്ന ജ്ഞാനോദയ ലൈബ്രറി.',
  noticeTicker: '📢 ജ്ഞാനോദയ ലൈബ്രറിയിലേക്ക് സ്വാഗതം! ലോഗിൻ ചെയ്യാതെ തന്നെ നേരിട്ട് പുസ്തകങ്ങൾ റിക്വസ്റ്റ് ചെയ്യാവുന്നതാണ്.',
  timings: 'തിങ്കൾ - ശനി: 4:00 PM - 8:00 PM',
  address: 'ജ്ഞാനോദയ ആർട്സ് & സ്പോർട്സ് ക്ലബ്ബ്, മേപ്പയൂർ, കോഴിക്കോട്',
  contactPhone: '+91 98765 43210',
  bearers: [
    { role: 'പ്രസിഡന്റ്', name: 'വിജയൻ എം.', phone: '9876543210' },
    { role: 'സെക്രട്ടറി', name: 'അനിൽ കുമാർ കെ.', phone: '9876543211' },
    { role: 'ലൈബ്രേറിയൻ', name: 'രാഹുൽ കൃഷ്ണൻ', phone: '9876543212' }
  ]
};

let STATE = {
  books: [],
  members: [],
  transactions: [],
  orders: [],
  reviews: [],
  suggestions: [],
  auditLogs: [],
  publicSummary: {
    activeMembers: 0,
    topBooks: [],
    topReaders: []
  },
  settings: {
    LOAN_DAYS: 14,
    MAX_BOOKS_PER_USER: 3,
    ADMIN_USER: 'admin'
  },
  cms: { ...DEFAULT_CMS },
  currentUser: null,
  isAdmin: false,
  isMobileMode: false,
  isDarkMode: false,
  homeCurrentPage: 1,
  cart: [],
  categoryChartInstance: null
};

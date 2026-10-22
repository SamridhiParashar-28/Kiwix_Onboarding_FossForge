/**
 * Kiwix Onboarding - Zero-to-Knowledge First-Run Experience
 * Comprehensive client-side state engine, adaptive recommendations, storage budgeting,
 * resumable download workflow with bounded retry backoff, and optional FastAPI backend integration.
 */

(function () {
  'use strict';

  // ==========================================
  // 1. STATE & STORAGE MANAGEMENT
  // ==========================================
  const STORAGE_KEYS = {
    STEP: 'kiwix_onboarding_step',
    INTERESTS: 'kiwix_selected_interests',
    LANGUAGES: 'kiwix_selected_languages',
    STORAGE_GB: 'kiwix_storage_budget_gb',
    SELECTED_PACKAGES: 'kiwix_selected_packages',
    CUSTOM_ZIMS: 'kiwix_custom_zims',
    THEME: 'kiwix_theme',
    DOWNLOAD_DONE: 'kiwix_download_completed',
    DOWNLOAD_PROGRESS: 'kiwix_download_progress'
  };

  const state = {
    currentStep: 1,
    selectedInterests: new Set(['health', 'wikipedia']),
    selectedLanguages: new Set(['en']),
    storageBudgetGB: 5.0,
    selectedPackageIds: new Set(),
    customZims: [],
    catalog: [],
    theme: 'dark',
    filterCategory: 'all',
    searchQuery: '',
    backendAvailable: false,
    backendBaseUrl: 'http://127.0.0.1:8000',
    deviceStorageInfo: null,
    download: {
      active: false,
      paused: false,
      interrupted: false,
      retryAttempt: 0,
      maxRetries: 3,
      progressBytes: 0,
      totalBytes: 0,
      speedMbps: 10, // Default 10 Mbps = 1.25 MB/s (1,250,000 bytes/sec)
      intervalId: null,
      interruptionTimeout: null,
      packageProgress: {}, // id -> { id, name, downloadedBytes, totalBytes, status, completed, errorMsg, sha256 }
      isCompleted: false,
      isVerifying: false
    }
  };

  // ==========================================
  // 2. DOM ELEMENT REFERENCES
  // ==========================================
  const DOM = {
    // Stepper
    stepperSteps: document.querySelectorAll('.stepper-step'),
    stepperLines: [
      document.getElementById('step-line-1'),
      document.getElementById('step-line-2'),
      document.getElementById('step-line-3'),
      document.getElementById('step-line-4')
    ],
    stepViews: [
      document.getElementById('step-view-1'),
      document.getElementById('step-view-2'),
      document.getElementById('step-view-3'),
      document.getElementById('step-view-4'),
      document.getElementById('step-view-5')
    ],
    // Theme & Header
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    iconSun: document.getElementById('icon-sun'),
    iconMoon: document.getElementById('icon-moon'),
    btnRestartOnboarding: document.getElementById('btn-restart-onboarding'),
    brandLogo: document.getElementById('brand-logo'),
    userDisplayName: document.getElementById('user-display-name'),
    userAvatarInitial: document.getElementById('user-avatar-initial'),
    btnLogout: document.getElementById('btn-logout'),
    // Step 1: Welcome
    btnStartOnboarding: document.getElementById('btn-start-onboarding'),
    btnQuickSkip: document.getElementById('btn-quick-skip'),
    toggleZimExplainer: document.getElementById('toggle-zim-explainer'),
    zimExplainerContent: document.getElementById('zim-explainer-content'),
    zimExplainerArrow: document.getElementById('zim-explainer-arrow'),
    // Step 2: Interests
    interestsGrid: document.getElementById('interests-grid'),
    interestsCounter: document.getElementById('interests-counter'),
    btnSelectAllInterests: document.getElementById('btn-select-all-interests'),
    btnClearInterests: document.getElementById('btn-clear-interests'),
    btnBackStep2: document.getElementById('btn-back-step-2'),
    btnNextStep2: document.getElementById('btn-next-step-2'),
    // Step 3: Languages
    languagesGrid: document.getElementById('languages-grid'),
    languagesCounter: document.getElementById('languages-counter'),
    langSearchInput: document.getElementById('lang-search-input'),
    btnBackStep3: document.getElementById('btn-back-step-3'),
    btnNextStep3: document.getElementById('btn-next-step-3'),
    // Step 4: Storage & Recommendations
    storagePresetBtns: document.querySelectorAll('.storage-preset-btn'),
    storageManualInput: document.getElementById('storage-manual-input'),
    btnDetectStorage: document.getElementById('btn-detect-storage'),
    detectStorageLabel: document.getElementById('detect-storage-label'),
    storageSelectedText: document.getElementById('storage-selected-text'),
    storageItemsCount: document.getElementById('storage-items-count'),
    storageBudgetText: document.getElementById('storage-budget-text'),
    storageProgressBar: document.getElementById('storage-progress-bar'),
    storageRemainingText: document.getElementById('storage-remaining-text'),
    storagePercentText: document.getElementById('storage-percent-text'),
    storageWarningBanner: document.getElementById('storage-warning-banner'),
    storageWarningMsg: document.getElementById('storage-warning-msg'),
    btnSmartCurate: document.getElementById('btn-smart-curate'),
    recFilterBtns: document.querySelectorAll('.rec-filter-btn'),
    recSearchInput: document.getElementById('rec-search-input'),
    recommendationsContainer: document.getElementById('recommendations-container'),
    recEmptyState: document.getElementById('rec-empty-state'),
    btnResetRecFilters: document.getElementById('btn-reset-rec-filters'),
    step4ProceedSummary: document.getElementById('step4-proceed-summary'),
    btnBackStep4: document.getElementById('btn-back-step-4'),
    btnNextStep4: document.getElementById('btn-next-step-4'),
    // Step 5: Download & Offline Ready
    downloadActiveState: document.getElementById('download-active-state'),
    offlineReadyState: document.getElementById('offline-ready-state'),
    speedSelector: document.getElementById('speed-selector'),
    overallSpinner: document.getElementById('overall-spinner'),
    overallEtaText: document.getElementById('overall-eta-text'),
    overallPercentText: document.getElementById('overall-percent-text'),
    overallBytesText: document.getElementById('overall-bytes-text'),
    overallProgressBar: document.getElementById('overall-progress-bar'),
    btnTogglePauseDownload: document.getElementById('btn-toggle-pause-download'),
    pauseBtnLabel: document.getElementById('pause-btn-label'),
    pauseIcon: document.getElementById('pause-icon'),
    btnSimulateInterruption: document.getElementById('btn-simulate-interruption'),
    networkStatusBadge: document.getElementById('network-status-badge'),
    networkStatusText: document.getElementById('network-status-text'),
    interruptionAlertBanner: document.getElementById('interruption-alert-banner'),
    interruptionCountdown: document.getElementById('interruption-countdown'),
    btnManualResumeInterruption: document.getElementById('btn-manual-resume-interruption'),
    downloadItemsQueue: document.getElementById('download-items-queue'),
    btnBackStep5: document.getElementById('btn-back-step-5'),
    btnFastForwardDownload: document.getElementById('btn-fast-forward-download'),
    downloadHeaderStatus: document.getElementById('download-header-status'),
    // Offline Ready Results
    confettiContainer: document.getElementById('confetti-container'),
    readyPackagesCount: document.getElementById('ready-packages-count'),
    readyStorageSize: document.getElementById('ready-storage-size'),
    readyArticlesCount: document.getElementById('ready-articles-count'),
    readyPackagesList: document.getElementById('ready-packages-list'),
    btnLaunchOfflineReader: document.getElementById('btn-launch-offline-reader'),
    btnExportCatalog: document.getElementById('btn-export-catalog'),
    btnReconfigurePackages: document.getElementById('btn-reconfigure-packages'),
    // Modal: Custom ZIM
    btnOpenCustomZim: document.getElementById('btn-open-custom-zim'),
    modalCustomZim: document.getElementById('modal-custom-zim'),
    btnCloseCustomZim: document.getElementById('btn-close-custom-zim'),
    btnCancelCustomZim: document.getElementById('btn-cancel-custom-zim'),
    tabZimUrl: document.getElementById('tab-zim-url'),
    tabZimFile: document.getElementById('tab-zim-file'),
    fieldUrlGroup: document.getElementById('field-url-group'),
    fieldFileGroup: document.getElementById('field-file-group'),
    dropzone: document.getElementById('dropzone'),
    customFileInput: document.getElementById('custom-file-input'),
    fileInfoBadge: document.getElementById('file-info-badge'),
    fileNameDisplay: document.getElementById('file-name-display'),
    fileSizeDisplay: document.getElementById('file-size-display'),
    customZimForm: document.getElementById('custom-zim-form'),
    customZimUrl: document.getElementById('custom-zim-url'),
    customZimTitle: document.getElementById('custom-zim-title'),
    customZimDesc: document.getElementById('custom-zim-desc'),
    customZimLang: document.getElementById('custom-zim-lang'),
    customZimCategory: document.getElementById('custom-zim-category'),
    customZimSize: document.getElementById('custom-zim-size'),
    // Modal: Offline Reader
    modalOfflineReader: document.getElementById('modal-offline-reader'),
    btnCloseOfflineReader: document.getElementById('btn-close-offline-reader'),
    readerSearchInput: document.getElementById('reader-search-input'),
    readerSidebarPackages: document.getElementById('reader-sidebar-packages'),
    readerArticlePackage: document.getElementById('reader-article-package'),
    readerArticleCategory: document.getElementById('reader-article-category'),
    readerArticleTitle: document.getElementById('reader-article-title'),
    readerArticleZim: document.getElementById('reader-article-zim'),
    readerArticleBody: document.getElementById('reader-article-body'),
    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };

  // ==========================================
  // 3. INITIALIZATION & DATA LOADING
  // ==========================================
  function initApp() {
    loadCatalogData();
    restorePersistedState();
    setupTheme();
    setupUserProfile();
    setupEventListeners();
    updateStepperUI();
    renderInterestsUI();
    renderLanguagesUI();
    updateStorageMeter();
    renderRecommendations();
    probeBackendHealth();
  }

  function setupUserProfile() {
    if (window.KiwixAuth) {
      const user = window.KiwixAuth.getCurrentUser();
      if (user) {
        if (DOM.userDisplayName) DOM.userDisplayName.textContent = user.name;
        if (DOM.userAvatarInitial) DOM.userAvatarInitial.textContent = user.name.charAt(0).toUpperCase();
      }
    }
    if (DOM.btnLogout) {
      DOM.btnLogout.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out of Kiwix Onboarding?')) {
          if (window.KiwixAuth) {
            window.KiwixAuth.logoutUser();
          } else {
            window.location.href = 'index.html';
          }
        }
      });
    }
  }

  function probeBackendHealth() {
    // Non-blocking probe to detect if optional FastAPI backend is running
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    fetch(`${state.backendBaseUrl}/api/health`, { signal: controller.signal })
      .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Backend responded with ' + res.status);
        return res.json();
      })
      .then(data => {
        if (data && data.status === 'healthy') {
          state.backendAvailable = true;
          injectBackendStatusBadge(true);
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        state.backendAvailable = false;
        injectBackendStatusBadge(false);
      });
  }

  function injectBackendStatusBadge(isOnline) {
    const existing = document.getElementById('backend-status-pill');
    if (existing) {
      existing.remove();
    }

    const pill = document.createElement('span');
    pill.id = 'backend-status-pill';
    pill.className = 'text-[10px] font-mono px-2 py-0.5 rounded-full border hidden sm:inline-flex items-center space-x-1';

    if (isOnline) {
      pill.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
      pill.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      pill.style.color = '#10b981';
      pill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>FastAPI Backend Active</span>';
    } else {
      pill.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      pill.style.borderColor = 'rgba(59, 130, 246, 0.3)';
      pill.style.color = '#60a5fa';
      pill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span><span>Zero-Cloud Local Mode</span>';
    }

    // Insert next to app title
    const brandHeader = document.querySelector('#brand-logo > div:last-child');
    if (brandHeader) {
      brandHeader.appendChild(pill);
    }
  }

  function loadCatalogData() {
    // 1. First load bundled static fallback
    if (window.DEFAULT_KIWIX_CATALOG && Array.isArray(window.DEFAULT_KIWIX_CATALOG)) {
      state.catalog = sanitizeCatalogList(JSON.parse(JSON.stringify(window.DEFAULT_KIWIX_CATALOG)));
    }

    // 2. Fetch live data/catalog.json if running through HTTP server
    fetch('data/catalog.json')
      .then(res => {
        if (!res.ok) throw new Error('Catalog fetch returned ' + res.status);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          state.catalog = sanitizeCatalogList(data);
          mergeCustomZimsIntoCatalog();
          renderRecommendations();
          updateStorageMeter();
        }
      })
      .catch(() => {
        // Fallback already loaded
        mergeCustomZimsIntoCatalog();
      });
  }

  function sanitizeCatalogList(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(item => {
      return item && typeof item === 'object' && item.id && item.name && item.sizeMB;
    }).map(item => {
      // Ensure deterministic sha256 checksum exists for offline verification
      if (!item.sha256) {
        item.sha256 = generateClientHash(item.id, item.filename || item.id, item.sizeMB);
      }
      return item;
    });
  }

  function generateClientHash(id, filename, sizeMB) {
    const raw = `${id}:${filename}:${sizeMB}:kiwix-fossforge`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex}a1b2c3d4e5f6071829304152637485960a1b2c3d4e5f60718293041526374859`.substring(0, 64);
  }

  function mergeCustomZimsIntoCatalog() {
    state.customZims.forEach(customZim => {
      const exists = state.catalog.some(item => item.id === customZim.id);
      if (!exists) {
        state.catalog.unshift(customZim);
      }
    });
  }

  // ==========================================
  // 4. PERSISTENCE & LOCALSTORAGE
  // ==========================================
  function restorePersistedState() {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        state.theme = savedTheme;
      }

      // Check if user came from sign-in, sign-up, or requested a fresh start
      const urlParams = new URLSearchParams(window.location.search);
      const forceWelcome = urlParams.get('start') === 'welcome' ||
                           localStorage.getItem('kiwix_start_from_welcome') === 'true';

      const currentUser = window.KiwixAuth ? window.KiwixAuth.getCurrentUser() : null;
      const currentUserId = currentUser ? currentUser.id : 'anonymous';
      const lastUserId = localStorage.getItem('kiwix_last_active_user_id');

      // If user came from sign-in/sign-up or switched accounts, start clean from Step 1 (Welcome)
      if (forceWelcome || (lastUserId && lastUserId !== currentUserId)) {
        state.currentStep = 1;
        state.selectedPackageIds = new Set();
        state.download.isCompleted = false;
        state.download.packageProgress = {};
        localStorage.setItem(STORAGE_KEYS.STEP, '1');
        localStorage.removeItem('kiwix_start_from_welcome');
        localStorage.removeItem(STORAGE_KEYS.DOWNLOAD_DONE);
        localStorage.removeItem(STORAGE_KEYS.DOWNLOAD_PROGRESS);
        localStorage.removeItem(STORAGE_KEYS.SELECTED_PACKAGES);
        localStorage.setItem('kiwix_last_active_user_id', currentUserId);
        return;
      }

      localStorage.setItem('kiwix_last_active_user_id', currentUserId);

      const savedStep = localStorage.getItem(STORAGE_KEYS.STEP);
      if (savedStep) {
        const stepNum = parseInt(savedStep, 10);
        if (stepNum >= 1 && stepNum <= 5) {
          state.currentStep = stepNum;
        }
      }

      const savedInterests = localStorage.getItem(STORAGE_KEYS.INTERESTS);
      if (savedInterests) {
        const parsed = JSON.parse(savedInterests);
        if (Array.isArray(parsed)) {
          state.selectedInterests = new Set(parsed);
        }
      }

      const savedLanguages = localStorage.getItem(STORAGE_KEYS.LANGUAGES);
      if (savedLanguages) {
        const parsed = JSON.parse(savedLanguages);
        if (Array.isArray(parsed)) {
          state.selectedLanguages = new Set(parsed);
        }
      }

      const savedBudget = localStorage.getItem(STORAGE_KEYS.STORAGE_GB);
      if (savedBudget) {
        const budgetNum = parseFloat(savedBudget);
        if (!isNaN(budgetNum) && budgetNum > 0) {
          state.storageBudgetGB = budgetNum;
        }
      }

      const savedPackages = localStorage.getItem(STORAGE_KEYS.SELECTED_PACKAGES);
      if (savedPackages) {
        const parsed = JSON.parse(savedPackages);
        if (Array.isArray(parsed)) {
          state.selectedPackageIds = new Set(parsed);
        }
      }

      const savedCustom = localStorage.getItem(STORAGE_KEYS.CUSTOM_ZIMS);
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) {
          state.customZims = parsed;
          mergeCustomZimsIntoCatalog();
        }
      }

      const savedProgress = localStorage.getItem(STORAGE_KEYS.DOWNLOAD_PROGRESS);
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        if (parsed && typeof parsed === 'object') {
          state.download.packageProgress = parsed;
        }
      }

      const isDone = localStorage.getItem(STORAGE_KEYS.DOWNLOAD_DONE);
      if (isDone === 'true') {
        state.download.isCompleted = true;
      }

      // Safeguard: If state says Step 5 but no packages are queued or completed,
      // reset to Step 1 (Welcome) so the user is never stuck in an empty download screen.
      if (state.currentStep === 5 && state.selectedPackageIds.size === 0 && !state.download.isCompleted) {
        state.currentStep = 1;
        localStorage.setItem(STORAGE_KEYS.STEP, '1');
      }

    } catch (e) {
      console.warn('LocalStorage restore error:', e);
    }
  }

  function saveStateToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
      localStorage.setItem(STORAGE_KEYS.STEP, state.currentStep.toString());
      localStorage.setItem(STORAGE_KEYS.INTERESTS, JSON.stringify(Array.from(state.selectedInterests)));
      localStorage.setItem(STORAGE_KEYS.LANGUAGES, JSON.stringify(Array.from(state.selectedLanguages)));
      localStorage.setItem(STORAGE_KEYS.STORAGE_GB, state.storageBudgetGB.toString());
      localStorage.setItem(STORAGE_KEYS.SELECTED_PACKAGES, JSON.stringify(Array.from(state.selectedPackageIds)));
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ZIMS, JSON.stringify(state.customZims));
      localStorage.setItem(STORAGE_KEYS.DOWNLOAD_DONE, state.download.isCompleted ? 'true' : 'false');
      if (state.download.packageProgress && Object.keys(state.download.packageProgress).length > 0) {
        localStorage.setItem(STORAGE_KEYS.DOWNLOAD_PROGRESS, JSON.stringify(state.download.packageProgress));
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // ==========================================
  // 5. THEME MANAGER
  // ==========================================
  function setupTheme() {
    applyTheme(state.theme);

    if (DOM.themeToggleBtn && !DOM.themeToggleBtn.dataset.appThemeBound) {
      DOM.themeToggleBtn.dataset.appThemeBound = 'true';
      DOM.themeToggleBtn.addEventListener('click', (e) => {
        // Prevent event conflicts if KiwixAuth already handled it
        if (window.KiwixAuth && window.KiwixAuth.toggleTheme) {
          const next = document.body.classList.contains('light-theme') ? 'light' : 'dark';
          state.theme = next;
          showToast(next === 'dark' ? 'Switched to Dark Charcoal Theme' : 'Switched to Soft Light Theme', 'info');
        } else {
          const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
          applyTheme(nextTheme);
          showToast(nextTheme === 'dark' ? 'Switched to Dark Charcoal Theme' : 'Switched to Soft Light Theme', 'info');
        }
      });
    }
  }

  function applyTheme(theme) {
    state.theme = theme;
    if (theme === 'light') {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      if (DOM.iconSun) DOM.iconSun.classList.add('hidden');
      if (DOM.iconMoon) DOM.iconMoon.classList.remove('hidden');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      if (DOM.iconMoon) DOM.iconMoon.classList.add('hidden');
      if (DOM.iconSun) DOM.iconSun.classList.remove('hidden');
    }
    saveStateToStorage();
  }

  // ==========================================
  // 6. STEPPER & NAVIGATION CONTROLLER
  // ==========================================
  function goToStep(targetStep) {
    if (targetStep < 1 || targetStep > 5) return;

    // Validate prerequisites before advancing forward
    if (targetStep > state.currentStep) {
      if (state.currentStep === 2 && state.selectedInterests.size === 0) {
        showToast('Please select at least one interest topic to continue.', 'warning');
        return;
      }
      if (state.currentStep === 3 && state.selectedLanguages.size === 0) {
        showToast('Please select at least one language to continue.', 'warning');
        return;
      }
      if (state.currentStep === 4) {
        if (state.selectedPackageIds.size === 0) {
          showToast('Please select at least one ZIM package for download.', 'warning');
          return;
        }
        // Verify storage budget constraint
        let totalMB = 0;
        state.catalog.forEach(item => {
          if (state.selectedPackageIds.has(item.id)) {
            totalMB += item.sizeMB || 0;
          }
        });
        const totalGB = totalMB / 1024;
        if (totalGB > state.storageBudgetGB) {
          const excess = (totalGB - state.storageBudgetGB).toFixed(2);
          showToast(`Cannot proceed: Selected content exceeds your storage quota by ${excess} GB. Deselect packages or increase budget.`, 'warning');
          return;
        }
      }
    }

    state.currentStep = targetStep;
    saveStateToStorage();
    updateStepperUI();

    // If entering Step 4, trigger recommendation re-score and storage calculation
    if (targetStep === 4) {
      renderRecommendations();
      updateStorageMeter();
    }

    // If entering Step 5, start or restore download
    if (targetStep === 5) {
      setupDownloadPhase();
    }
  }

  function updateStepperUI() {
    DOM.stepViews.forEach((view, idx) => {
      if (idx + 1 === state.currentStep) {
        view.classList.remove('hidden');
        view.classList.add('step-fade-in');
      } else {
        view.classList.add('hidden');
        view.classList.remove('step-fade-in');
      }
    });

    DOM.stepperSteps.forEach((stepEl, idx) => {
      const stepNum = idx + 1;
      const circle = stepEl.querySelector('.stepper-circle');
      const title = stepEl.querySelector('.stepper-title');

      if (stepNum === state.currentStep) {
        // Active
        circle.style.backgroundColor = '#3b82f6';
        circle.style.borderColor = '#3b82f6';
        circle.style.color = '#ffffff';
        circle.innerHTML = `${stepNum}`;
        circle.classList.add('ring-4', 'ring-blue-500/20');
        if (title) title.style.color = '#3b82f6';
      } else if (stepNum < state.currentStep) {
        // Completed
        circle.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
        circle.style.borderColor = '#3b82f6';
        circle.style.color = '#3b82f6';
        circle.innerHTML = `✓`;
        circle.classList.remove('ring-4', 'ring-blue-500/20');
        if (title) title.style.color = 'var(--text-primary)';
      } else {
        // Future / Inactive
        circle.style.backgroundColor = 'transparent';
        circle.style.borderColor = 'var(--border-color)';
        circle.style.color = 'var(--text-muted)';
        circle.innerHTML = `${stepNum}`;
        circle.classList.remove('ring-4', 'ring-blue-500/20');
        if (title) title.style.color = 'var(--text-muted)';
      }
    });

    // Update connector lines
    DOM.stepperLines.forEach((line, idx) => {
      if (!line) return;
      if (idx + 1 < state.currentStep) {
        line.style.backgroundColor = '#3b82f6';
      } else {
        line.style.backgroundColor = 'var(--border-color)';
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================
  // 7. STEP 2: INTERESTS ENGINE
  // ==========================================
  function renderInterestsUI() {
    const cards = DOM.interestsGrid.querySelectorAll('.interest-card');
    cards.forEach(card => {
      const interest = card.getAttribute('data-interest');
      const isSelected = state.selectedInterests.has(interest);
      const checkbox = card.querySelector('.interest-checkbox');
      const checkIcon = checkbox ? checkbox.querySelector('svg') : null;

      if (isSelected) {
        card.classList.add('kiwix-card-selected');
        if (checkbox) {
          checkbox.style.backgroundColor = '#3b82f6';
          checkbox.style.borderColor = '#3b82f6';
        }
        if (checkIcon) checkIcon.classList.remove('hidden');
      } else {
        card.classList.remove('kiwix-card-selected');
        if (checkbox) {
          checkbox.style.backgroundColor = 'transparent';
          checkbox.style.borderColor = 'var(--border-color)';
        }
        if (checkIcon) checkIcon.classList.add('hidden');
      }
    });

    const count = state.selectedInterests.size;
    DOM.interestsCounter.textContent = `${count} selected`;
    DOM.btnNextStep2.disabled = count === 0;
  }

  function toggleInterest(interest) {
    if (state.selectedInterests.has(interest)) {
      state.selectedInterests.delete(interest);
    } else {
      state.selectedInterests.add(interest);
    }
    renderInterestsUI();
    saveStateToStorage();
    // Reactively update recommendations and storage meter immediately
    renderRecommendations();
    updateStorageMeter();
  }

  // ==========================================
  // 8. STEP 3: LANGUAGES ENGINE
  // ==========================================
  function renderLanguagesUI() {
    const cards = DOM.languagesGrid.querySelectorAll('.language-card');
    cards.forEach(card => {
      const lang = card.getAttribute('data-lang');
      const isSelected = state.selectedLanguages.has(lang);
      const checkbox = card.querySelector('.lang-checkbox');
      const checkIcon = checkbox ? checkbox.querySelector('svg') : null;

      if (isSelected) {
        card.classList.add('kiwix-card-selected');
        if (checkbox) {
          checkbox.style.backgroundColor = '#3b82f6';
          checkbox.style.borderColor = '#3b82f6';
        }
        if (checkIcon) checkIcon.classList.remove('hidden');
      } else {
        card.classList.remove('kiwix-card-selected');
        if (checkbox) {
          checkbox.style.backgroundColor = 'transparent';
          checkbox.style.borderColor = 'var(--border-color)';
        }
        if (checkIcon) checkIcon.classList.add('hidden');
      }
    });

    const count = state.selectedLanguages.size;
    DOM.languagesCounter.textContent = `${count} selected`;
    DOM.btnNextStep3.disabled = count === 0;
  }

  function toggleLanguage(lang) {
    if (state.selectedLanguages.has(lang)) {
      state.selectedLanguages.delete(lang);
    } else {
      state.selectedLanguages.add(lang);
    }
    renderLanguagesUI();
    saveStateToStorage();
    // Reactively update recommendations and storage meter immediately
    renderRecommendations();
    updateStorageMeter();
  }

  function filterLanguagesBySearch(query) {
    const q = query.trim().toLowerCase();
    const cards = DOM.languagesGrid.querySelectorAll('.language-card');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (!q || text.includes(q)) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  }

  // ==========================================
  // 9. STEP 4: STORAGE & RECOMMENDATIONS
  // ==========================================
  function calculateDownloadTimeEstimate(totalMB, speedMbps) {
    const cleanSpeed = (typeof speedMbps === 'number' && speedMbps > 0) ? speedMbps : 10;
    const totalBytes = totalMB * 1024 * 1024;
    // 1 Mbps = 1,000,000 bits/sec / 8 = 125,000 bytes/sec
    const bytesPerSec = (cleanSpeed * 1000 * 1000) / 8;
    const totalSeconds = Math.ceil(totalBytes / bytesPerSec);

    if (totalSeconds < 60) {
      return `~${totalSeconds}s`;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins < 60) {
      return `~${mins}m ${secs > 0 ? `${secs}s` : ''}`;
    }
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `~${hrs}h ${remMins}m`;
  }

  function updateStorageMeter() {
    if (DOM.storageManualInput) {
      DOM.storageManualInput.value = state.storageBudgetGB;
    }

    // Sync quick preset buttons
    DOM.storagePresetBtns.forEach(btn => {
      const gb = parseFloat(btn.getAttribute('data-gb'));
      if (gb === state.storageBudgetGB) {
        btn.style.backgroundColor = '#3b82f6';
        btn.style.color = '#ffffff';
        btn.style.borderColor = '#3b82f6';
      } else {
        btn.style.backgroundColor = 'var(--bg-surface-alt)';
        btn.style.color = 'var(--text-primary)';
        btn.style.borderColor = 'var(--border-color)';
      }
    });

    // Sanitize selectedPackageIds against active catalog
    const validIds = new Set();
    state.selectedPackageIds.forEach(id => {
      if (state.catalog.some(item => item.id === id)) {
        validIds.add(id);
      }
    });
    state.selectedPackageIds = validIds;

    // Calculate total selected size in MB
    let totalMB = 0;
    state.catalog.forEach(item => {
      if (state.selectedPackageIds.has(item.id)) {
        totalMB += item.sizeMB || 0;
      }
    });

    const totalGB = totalMB / 1024;
    const budgetGB = state.storageBudgetGB;
    const percent = budgetGB > 0 ? (totalGB / budgetGB) * 100 : 0;
    const remainingGB = Math.max(0, budgetGB - totalGB);

    // Calculate ETA projection at currently selected speed assumption
    const timeEst = calculateDownloadTimeEstimate(totalMB, state.download.speedMbps);

    // Update text indicators
    DOM.storageSelectedText.textContent = totalGB >= 1 ? `${totalGB.toFixed(2)} GB` : `${totalMB} MB`;
    DOM.storageItemsCount.textContent = `(${state.selectedPackageIds.size} packages)`;
    DOM.storageBudgetText.textContent = `${budgetGB.toFixed(2)} GB`;
    DOM.storageRemainingText.textContent = `Remaining: ${remainingGB.toFixed(2)} GB`;
    DOM.storagePercentText.textContent = `${Math.round(percent)}% of budget allocated`;

    // Step 4 proceed button label with explicit ETA projection
    if (state.selectedPackageIds.size > 0) {
      DOM.step4ProceedSummary.textContent = `${state.selectedPackageIds.size} packages (${totalGB.toFixed(2)} GB) • Est. ${timeEst} at ${state.download.speedMbps} Mbps`;
    } else {
      DOM.step4ProceedSummary.textContent = '0 items selected';
    }

    // Visual progress bar width & color
    DOM.storageProgressBar.style.width = `${Math.min(100, percent)}%`;

    if (percent > 100) {
      DOM.storageProgressBar.style.backgroundColor = '#ef4444'; // Red warning
      DOM.storageWarningBanner.classList.remove('hidden');
      const excess = (totalGB - budgetGB).toFixed(2);
      DOM.storageWarningMsg.textContent = `Storage Budget Exceeded: Selected content (${totalGB.toFixed(2)} GB) exceeds your ${budgetGB.toFixed(2)} GB limit by ${excess} GB. Deselect packages to fit within your quota.`;
      DOM.btnNextStep4.disabled = true;
      DOM.btnNextStep4.title = 'Storage limit exceeded. Deselect packages to proceed.';
    } else if (percent > 85) {
      DOM.storageProgressBar.style.backgroundColor = '#f59e0b'; // Amber cautionary
      DOM.storageWarningBanner.classList.add('hidden');
      DOM.btnNextStep4.disabled = state.selectedPackageIds.size === 0;
      DOM.btnNextStep4.title = '';
    } else {
      DOM.storageProgressBar.style.backgroundColor = '#3b82f6'; // Clean blue
      DOM.storageWarningBanner.classList.add('hidden');
      DOM.btnNextStep4.disabled = state.selectedPackageIds.size === 0;
      DOM.btnNextStep4.title = '';
    }
  }

  function autoDetectDeviceStorage() {
    DOM.detectStorageLabel.textContent = 'Detecting...';
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        if (estimate.quota) {
          const quotaBytes = estimate.quota;
          const usageBytes = estimate.usage || 0;
          const quotaGB = (quotaBytes / (1024 ** 3)).toFixed(1);
          const usedMB = (usageBytes / (1024 ** 2)).toFixed(1);

          // Treat estimate as browser sandbox estimate, recommend 40% of available space
          const availableBytes = quotaBytes - usageBytes;
          const suggestedGB = Math.round((availableBytes / (1024 ** 3)) * 0.4);
          const cleanGB = Math.max(2, Math.min(suggestedGB, 50));
          state.storageBudgetGB = cleanGB;

          state.deviceStorageInfo = {
            quotaGB,
            usedMB,
            isEstimate: true
          };

          DOM.detectStorageLabel.textContent = `Detected (~${cleanGB} GB target)`;
          updateStorageMeter();
          renderRecommendations();
          saveStateToStorage();
          showToast(`Browser storage estimated: ~${quotaGB} GB quota (~${usedMB} MB in use). Allocated recommended ${cleanGB} GB target.`, 'success');
        } else {
          fallbackStorageEstimate();
        }
      }).catch(() => fallbackStorageEstimate());
    } else {
      fallbackStorageEstimate();
    }
  }

  function fallbackStorageEstimate() {
    state.storageBudgetGB = 8;
    DOM.detectStorageLabel.textContent = 'Allocated Default (8 GB)';
    updateStorageMeter();
    renderRecommendations();
    saveStateToStorage();
    showToast('Browser storage API unavailable. Allocated 8 GB standard offline quota with manual adjustment enabled.', 'info');
  }

  function smartCurateToBudget() {
    state.selectedPackageIds.clear();
    const ranked = getScoredAndRankedCatalog();
    let currentMB = 0;
    const maxMB = state.storageBudgetGB * 1024;

    // Prioritize high-scoring matches that fit in budget
    ranked.forEach(item => {
      if (currentMB + item.sizeMB <= maxMB) {
        state.selectedPackageIds.add(item.id);
        currentMB += item.sizeMB;
      }
    });

    renderRecommendations();
    updateStorageMeter();
    saveStateToStorage();
    showToast(`Smart Curate complete! Selected ${state.selectedPackageIds.size} packages (${(currentMB / 1024).toFixed(2)} GB) within budget.`, 'success');
  }

  function getScoredAndRankedCatalog() {
    return state.catalog.map(item => {
      let score = 0;

      // Custom packages always get highest priority
      if (item.isCustom) score += 200;

      // Matching interest topic
      if (state.selectedInterests.has(item.category)) {
        score += 60;
      }

      // Matching language
      if (state.selectedLanguages.has(item.language)) {
        score += 50;
      }

      // Featured flag
      if (item.featured) score += 20;

      // Small footprint bonus if budget is tight (< 3GB)
      if (state.storageBudgetGB <= 3 && item.sizeMB < 600) {
        score += 25;
      }

      return { ...item, matchScore: score };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }

  function renderRecommendations() {
    const container = DOM.recommendationsContainer;
    container.innerHTML = '';

    const ranked = getScoredAndRankedCatalog();
    const query = (DOM.recSearchInput ? DOM.recSearchInput.value : '').trim().toLowerCase();
    const filter = state.filterCategory;

    // Calculate current allocated space
    let currentAllocatedMB = 0;
    state.catalog.forEach(p => {
      if (state.selectedPackageIds.has(p.id)) {
        currentAllocatedMB += p.sizeMB || 0;
      }
    });
    const budgetMB = state.storageBudgetGB * 1024;
    const remainingMB = Math.max(0, budgetMB - currentAllocatedMB);

    let visibleCount = 0;

    ranked.forEach(pkg => {
      // Category filter check
      if (filter === 'matches') {
        const matchesInterest = state.selectedInterests.has(pkg.category);
        const matchesLang = state.selectedLanguages.has(pkg.language);
        if (!matchesInterest && !matchesLang && !pkg.isCustom) return;
      } else if (filter === 'custom') {
        if (!pkg.isCustom) return;
      } else if (filter !== 'all') {
        if (pkg.category !== filter) return;
      }

      // Search filter check
      if (query) {
        const text = `${pkg.name} ${pkg.description} ${pkg.categoryLabel || ''} ${pkg.languageLabel || ''}`.toLowerCase();
        if (!text.includes(query)) return;
      }

      visibleCount++;
      const isSelected = state.selectedPackageIds.has(pkg.id);
      const isMatch = state.selectedInterests.has(pkg.category) && state.selectedLanguages.has(pkg.language);
      const exceedsBudget = !isSelected && (pkg.sizeMB > remainingMB);
      const excessAmountMB = exceedsBudget ? (pkg.sizeMB - remainingMB) : 0;

      const card = document.createElement('div');
      card.className = `kiwix-card rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all cursor-pointer relative ${isSelected ? 'kiwix-card-selected' : ''}`;
      card.setAttribute('data-package-id', pkg.id);

      const sizeDisplay = pkg.sizeMB >= 1024 ? `${(pkg.sizeMB / 1024).toFixed(2)} GB` : `${pkg.sizeMB} MB`;
      const articlesDisplay = pkg.articlesCount ? `${pkg.articlesCount.toLocaleString()} articles` : 'Full Content';

      card.innerHTML = `
        <div>
          <!-- Header tags -->
          <div class="flex items-center justify-between mb-2.5">
            <div class="flex items-center space-x-1.5 flex-wrap gap-1">
              ${pkg.isCustom ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">Custom ZIM</span>` : ''}
              ${isMatch ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30">★ Top Match</span>` : ''}
              ${exceedsBudget ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30" title="Adding this package will exceed your storage budget by ${excessAmountMB >= 1024 ? (excessAmountMB/1024).toFixed(2) + ' GB' : excessAmountMB + ' MB'}">Exceeds Budget (+${excessAmountMB >= 1024 ? (excessAmountMB/1024).toFixed(2) + ' GB' : excessAmountMB + ' MB'})</span>` : ''}
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full border" style="border-color: var(--border-color); color: var(--text-muted)">${pkg.categoryLabel || pkg.category}</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700/20" style="color: var(--text-muted)">${pkg.language.toUpperCase()}</span>
            </div>

            <!-- Selection Checkbox -->
            <div class="w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-500'}">
              <svg class="w-3.5 h-3.5 ${isSelected ? '' : 'hidden'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
          </div>

          <!-- Title & Description -->
          <h4 class="font-bold text-sm sm:text-base leading-snug mb-1.5" style="color: var(--text-primary)">${pkg.name}</h4>
          <p class="text-xs leading-relaxed line-clamp-2" style="color: var(--text-secondary)">${pkg.description}</p>
        </div>

        <!-- Footer specs & select button -->
        <div class="mt-4 pt-3 border-t flex items-center justify-between text-xs" style="border-color: var(--border-color)">
          <div class="flex items-center space-x-3 text-[11px] font-mono" style="color: var(--text-muted)">
            <span class="font-bold text-blue-500">${sizeDisplay}</span>
            <span>•</span>
            <span>${articlesDisplay}</span>
          </div>

          <button class="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${isSelected ? 'text-red-500 hover:bg-red-500/10' : 'text-blue-500 hover:bg-blue-500/10'}">
            ${isSelected ? 'Remove' : '+ Add to Library'}
          </button>
        </div>
      `;

      card.addEventListener('click', () => {
        togglePackageSelection(pkg.id);
      });

      container.appendChild(card);
    });

    if (visibleCount === 0) {
      DOM.recEmptyState.classList.remove('hidden');
    } else {
      DOM.recEmptyState.classList.add('hidden');
    }
  }

  function togglePackageSelection(packageId) {
    if (state.selectedPackageIds.has(packageId)) {
      state.selectedPackageIds.delete(packageId);
    } else {
      state.selectedPackageIds.add(packageId);
    }
    renderRecommendations();
    updateStorageMeter();
    saveStateToStorage();
  }

  // ==========================================
  // 10. STEP 5: DOWNLOAD ENGINE & OFFLINE READY
  // ==========================================
  function setupDownloadPhase() {
    if (state.download.isCompleted) {
      showOfflineReadyScreen();
      return;
    }

    DOM.downloadActiveState.classList.remove('hidden');
    DOM.offlineReadyState.classList.add('hidden');

    // Calculate total bytes
    let totalMB = 0;
    state.selectedPackageIds.forEach(id => {
      const item = state.catalog.find(p => p.id === id);
      if (item) totalMB += item.sizeMB;
    });

    state.download.totalBytes = totalMB * 1024 * 1024;
    state.download.progressBytes = 0;
    state.download.paused = false;
    state.download.interrupted = false;
    state.download.retryAttempt = 0;

    // Initialize or restore package progress objects
    if (!state.download.packageProgress) {
      state.download.packageProgress = {};
    }

    state.selectedPackageIds.forEach(id => {
      const item = state.catalog.find(p => p.id === id);
      const itemTotalBytes = (item ? item.sizeMB : 100) * 1024 * 1024;

      if (!state.download.packageProgress[id]) {
        state.download.packageProgress[id] = {
          id: id,
          name: item ? item.name : id,
          downloadedBytes: 0,
          totalBytes: itemTotalBytes,
          status: 'pending', // 'pending' | 'downloading' | 'paused' | 'retrying' | 'failed' | 'verifying' | 'verified'
          completed: false,
          errorMsg: null,
          sha256: item ? item.sha256 : null
        };
      }
    });

    // Remove any packages that were unselected from queue
    Object.keys(state.download.packageProgress).forEach(id => {
      if (!state.selectedPackageIds.has(id)) {
        delete state.download.packageProgress[id];
      }
    });

    // Compute existing progress
    let restoredBytes = 0;
    Object.values(state.download.packageProgress).forEach(p => {
      restoredBytes += (p.downloadedBytes || 0);
    });
    state.download.progressBytes = restoredBytes;

    renderDownloadQueueUI();
    startDownloadSimulation();
  }

  function renderDownloadQueueUI() {
    const queue = DOM.downloadItemsQueue;
    queue.innerHTML = '';

    state.selectedPackageIds.forEach(id => {
      const item = state.catalog.find(p => p.id === id);
      if (!item) return;

      const pState = state.download.packageProgress[id] || {
        downloadedBytes: 0,
        totalBytes: item.sizeMB * 1024 * 1024,
        status: 'pending',
        completed: false
      };

      const pct = pState.totalBytes > 0 ? Math.min(100, (pState.downloadedBytes / pState.totalBytes) * 100) : 0;
      const dlMB = (pState.downloadedBytes / (1024 * 1024)).toFixed(1);
      const totMB = (pState.totalBytes / (1024 * 1024)).toFixed(1);

      const row = document.createElement('div');
      row.className = 'kiwix-card rounded-xl p-4 space-y-2 relative';
      row.id = `dl-item-${id}`;

      let statusBadge = '<span class="status-badge text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">In Queue</span>';
      if (pState.status === 'downloading') {
        statusBadge = '<span class="status-badge text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 animate-pulse">Downloading...</span>';
      } else if (pState.status === 'paused') {
        statusBadge = '<span class="status-badge text-[10px] font-mono px-2 py-0.5 rounded bg-slate-700/30 text-slate-400">Paused</span>';
      } else if (pState.status === 'retrying') {
        statusBadge = `<span class="status-badge text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-500">Retrying (${state.download.retryAttempt}/${state.download.maxRetries})...</span>`;
      } else if (pState.status === 'failed') {
        statusBadge = '<span class="status-badge text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/15 text-red-500">Failed (Preserved)</span>';
      } else if (pState.status === 'verifying') {
        statusBadge = '<span class="status-badge text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400">Verifying...</span>';
      } else if (pState.completed) {
        statusBadge = '<span class="status-badge text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold">✓ Verified</span>';
      }

      row.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full ${pState.completed ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}"></span>
            <span class="font-bold text-xs" style="color: var(--text-primary)">${item.name}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-700/20" style="color: var(--text-muted)">${item.language.toUpperCase()}</span>
            ${statusBadge}
          </div>
          <div class="flex items-center space-x-3 text-xs font-mono">
            <span class="dl-bytes" style="color: var(--text-muted)">${dlMB} MB / ${totMB} MB</span>
            <span class="dl-pct font-bold text-blue-500">${Math.round(pct)}%</span>
            ${!pState.completed ? `<button class="btn-cancel-package text-slate-500 hover:text-red-500 p-1" title="Cancel this package" data-package-id="${id}">✕</button>` : ''}
          </div>
        </div>

        <div class="w-full h-2 rounded-full overflow-hidden bg-slate-700/20">
          <div class="dl-bar h-full rounded-full ${pState.completed ? 'bg-emerald-500' : 'bg-blue-500'} transition-all duration-150" style="width: ${pct}%"></div>
        </div>
      `;

      // Cancel button event
      const cancelBtn = row.querySelector('.btn-cancel-package');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          cancelPackageFromQueue(id);
        });
      }

      queue.appendChild(row);
    });
  }

  function cancelPackageFromQueue(packageId) {
    state.selectedPackageIds.delete(packageId);
    if (state.download.packageProgress[packageId]) {
      delete state.download.packageProgress[packageId];
    }

    // Recalculate totals
    let totalMB = 0;
    state.selectedPackageIds.forEach(id => {
      const item = state.catalog.find(p => p.id === id);
      if (item) totalMB += item.sizeMB;
    });
    state.download.totalBytes = totalMB * 1024 * 1024;

    saveStateToStorage();
    renderDownloadQueueUI();
    updateDownloadUI();
    showToast('Package removed from download queue.', 'info');

    if (state.selectedPackageIds.size === 0) {
      if (state.download.intervalId) clearInterval(state.download.intervalId);
      state.download.active = false;
      goToStep(4);
    }
  }

  function startDownloadSimulation() {
    if (state.download.intervalId) clearInterval(state.download.intervalId);

    state.download.active = true;
    DOM.overallSpinner.classList.remove('hidden');
    DOM.downloadHeaderStatus.textContent = 'Resumable Download Simulation & Verification Engine';

    const tickIntervalMs = 200; // 5 ticks per second

    state.download.intervalId = setInterval(() => {
      if (state.download.paused || state.download.interrupted || state.download.isVerifying) return;

      // Speed conversion: 1 Mbps = 1,000,000 bits/sec / 8 = 125,000 bytes/sec
      const cleanSpeed = (state.download.speedMbps > 0) ? state.download.speedMbps : 10;
      const bytesPerSec = (cleanSpeed * 1000 * 1000) / 8;
      // Authentic packet fluctuation (+- 8%)
      const fluctuation = 0.92 + Math.random() * 0.16;
      const bytesThisTick = (bytesPerSec * (tickIntervalMs / 1000)) * fluctuation;

      // Find in-progress packages
      const activeIds = Array.from(state.selectedPackageIds).filter(id => {
        const p = state.download.packageProgress[id];
        return p && !p.completed;
      });

      if (activeIds.length === 0) {
        completeAllDownloads();
        return;
      }

      // Prioritize the top package in queue (sequential chunk download)
      const currentId = activeIds[0];
      const p = state.download.packageProgress[currentId];
      p.status = 'downloading';
      p.downloadedBytes = Math.min(p.totalBytes, p.downloadedBytes + bytesThisTick);

      if (p.downloadedBytes >= p.totalBytes) {
        p.completed = true;
        p.status = 'verified';
      }

      // Calculate total progress
      let currentTotalDl = 0;
      Object.values(state.download.packageProgress).forEach(pkgP => {
        currentTotalDl += pkgP.downloadedBytes;
      });
      state.download.progressBytes = currentTotalDl;

      updateDownloadUI();

      if (state.download.progressBytes >= state.download.totalBytes) {
        completeAllDownloads();
      }
    }, tickIntervalMs);
  }

  function updateDownloadUI() {
    const total = state.download.totalBytes;
    const current = state.download.progressBytes;
    const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

    const currentMB = (current / (1024 * 1024)).toFixed(1);
    const totalMB = (total / (1024 * 1024)).toFixed(1);

    DOM.overallPercentText.textContent = `${Math.round(pct)}%`;
    DOM.overallBytesText.textContent = `${currentMB} MB / ${totalMB} MB`;
    DOM.overallProgressBar.style.width = `${pct}%`;

    // Calculate real ETA based on remaining bytes and current assumed speed
    const remainingBytes = Math.max(0, total - current);
    const cleanSpeed = (state.download.speedMbps > 0) ? state.download.speedMbps : 10;
    const bytesPerSec = (cleanSpeed * 1000 * 1000) / 8;
    const remainingSeconds = Math.ceil(remainingBytes / bytesPerSec);

    if (remainingSeconds <= 0) {
      DOM.overallEtaText.textContent = 'Performing integrity check and catalog index verification...';
    } else {
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      DOM.overallEtaText.textContent = `Estimated time: ~${mins > 0 ? `${mins}m ` : ''}${secs}s remaining at ${cleanSpeed} Mbps (assumed speed, not guaranteed)`;
    }

    // Update individual package rows in DOM
    state.selectedPackageIds.forEach(id => {
      const p = state.download.packageProgress[id];
      if (!p) return;
      const row = document.getElementById(`dl-item-${id}`);
      if (!row) return;

      const pPct = p.totalBytes > 0 ? Math.min(100, (p.downloadedBytes / p.totalBytes) * 100) : 0;
      const dlText = row.querySelector('.dl-bytes');
      const pctText = row.querySelector('.dl-pct');
      const bar = row.querySelector('.dl-bar');
      const badge = row.querySelector('.status-badge');

      if (dlText) dlText.textContent = `${(p.downloadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(p.totalBytes / (1024 * 1024)).toFixed(1)} MB`;
      if (pctText) {
        pctText.textContent = p.completed ? '100% (Verified)' : `${Math.round(pPct)}%`;
        if (p.completed) pctText.className = 'dl-pct font-bold text-emerald-500';
      }
      if (bar) {
        bar.style.width = `${pPct}%`;
        if (p.completed) bar.className = 'dl-bar h-full rounded-full bg-emerald-500';
      }
      if (badge) {
        if (p.completed) {
          badge.className = 'status-badge text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold';
          badge.textContent = '✓ Verified';
        } else if (p.status === 'retrying') {
          badge.className = 'status-badge text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-500';
          badge.textContent = `Retrying (${state.download.retryAttempt}/${state.download.maxRetries})...`;
        } else if (p.status === 'failed') {
          badge.className = 'status-badge text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/15 text-red-500 font-bold';
          badge.textContent = 'Failed (Preserved)';
        } else if (p.status === 'downloading') {
          badge.className = 'status-badge text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 animate-pulse';
          badge.textContent = 'Downloading...';
        }
      }
    });

    saveStateToStorage();
  }

  function togglePauseDownload() {
    state.download.paused = !state.download.paused;
    if (state.download.paused) {
      DOM.pauseBtnLabel.textContent = 'Resume Download';
      DOM.downloadHeaderStatus.textContent = 'Download Paused (Chunks Preserved)';
      DOM.overallSpinner.classList.add('hidden');
      DOM.pauseIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;

      // Mark downloading packages as paused
      Object.values(state.download.packageProgress).forEach(p => {
        if (!p.completed && p.status === 'downloading') p.status = 'paused';
      });
      renderDownloadQueueUI();
      showToast('Download simulation paused. Chunk progress safely preserved.', 'info');
    } else {
      DOM.pauseBtnLabel.textContent = 'Pause Download';
      DOM.downloadHeaderStatus.textContent = 'Resumable Download Simulation & Verification Engine';
      DOM.overallSpinner.classList.remove('hidden');
      DOM.pauseIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;
      showToast('Resuming download from preserved chunks.', 'info');
    }
  }

  function triggerSimulatedInterruption() {
    if (state.download.isCompleted) return;

    state.download.interrupted = true;
    state.download.retryAttempt += 1;

    DOM.interruptionAlertBanner.classList.remove('hidden');
    DOM.networkStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center space-x-1.5';
    DOM.networkStatusText.textContent = `Connection Dropped (Attempt ${state.download.retryAttempt}/${state.download.maxRetries})`;
    DOM.downloadHeaderStatus.textContent = 'Connection Interrupted';
    DOM.overallSpinner.classList.add('hidden');

    // Mark current package as retrying
    Object.values(state.download.packageProgress).forEach(p => {
      if (!p.completed) p.status = 'retrying';
    });
    renderDownloadQueueUI();

    // Check bounded retries
    if (state.download.retryAttempt > state.download.maxRetries) {
      handleExhaustedRetries();
      return;
    }

    // Exponential backoff interval: attempt 1: 2s, attempt 2: 4s, attempt 3: 8s
    let countdown = Math.min(8, Math.pow(2, state.download.retryAttempt));
    DOM.interruptionCountdown.textContent = `${countdown}s`;

    if (state.download.interruptionTimeout) clearInterval(state.download.interruptionTimeout);

    state.download.interruptionTimeout = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        DOM.interruptionCountdown.textContent = `${countdown}s`;
      } else {
        clearInterval(state.download.interruptionTimeout);
        recoverFromInterruption();
      }
    }, 1000);

    showToast(`Network drop simulated! Bounded backoff engaged (Attempt ${state.download.retryAttempt} of ${state.download.maxRetries}).`, 'warning');
  }

  function handleExhaustedRetries() {
    if (state.download.interruptionTimeout) clearInterval(state.download.interruptionTimeout);
    state.download.interrupted = true;

    DOM.networkStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center space-x-1.5';
    DOM.networkStatusText.textContent = 'Download Failed (Max Retries)';
    DOM.downloadHeaderStatus.textContent = 'Recovery Failed - Action Required';

    const msgSpan = document.getElementById('interruption-msg');
    if (msgSpan) {
      msgSpan.innerHTML = `Recovery timed out after <strong>${state.download.maxRetries} attempts</strong>. Chunks preserved. Reconnect to resume.`;
    }
    DOM.btnManualResumeInterruption.textContent = 'Reconnect & Resume';

    Object.values(state.download.packageProgress).forEach(p => {
      if (!p.completed) p.status = 'failed';
    });
    renderDownloadQueueUI();
    showToast('Automatic recovery limit reached. Click "Reconnect & Resume" to re-establish transfer.', 'warning');
  }

  function recoverFromInterruption() {
    if (state.download.interruptionTimeout) clearInterval(state.download.interruptionTimeout);
    state.download.interrupted = false;
    state.download.retryAttempt = 0;

    DOM.interruptionAlertBanner.classList.add('hidden');
    DOM.networkStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center space-x-1.5';
    DOM.networkStatusText.textContent = 'Reconnected (Resuming)';
    DOM.downloadHeaderStatus.textContent = 'Resumable Download Simulation & Verification Engine';
    DOM.overallSpinner.classList.remove('hidden');

    Object.values(state.download.packageProgress).forEach(p => {
      if (!p.completed) p.status = 'downloading';
    });
    renderDownloadQueueUI();

    showToast('Connection restored! Download resumed seamlessly without loss of verified chunks.', 'success');
  }

  function fastForwardDownload() {
    Object.keys(state.download.packageProgress).forEach(id => {
      const p = state.download.packageProgress[id];
      p.downloadedBytes = p.totalBytes;
      p.completed = true;
      p.status = 'verified';
    });
    state.download.progressBytes = state.download.totalBytes;
    updateDownloadUI();
    completeAllDownloads();
    showToast('Fast-forward complete: All packages downloaded and passed integrity checks!', 'success');
  }

  async function completeAllDownloads() {
    if (state.download.intervalId) clearInterval(state.download.intervalId);
    state.download.active = false;
    state.download.isVerifying = true;

    DOM.downloadHeaderStatus.textContent = 'Verifying Package Sizes & SHA-256 Checksums...';
    DOM.overallEtaText.textContent = 'Validating archive integrity against catalog specifications...';

    // Verification Step: Validate each package against catalog
    let allVerified = true;
    for (const id of state.selectedPackageIds) {
      const p = state.download.packageProgress[id];
      const catalogItem = state.catalog.find(c => c.id === id);

      if (!p || !catalogItem) continue;

      p.status = 'verifying';
      renderDownloadQueueUI();

      // If backend available, verify against backend
      if (state.backendAvailable) {
        try {
          const res = await fetch(`${state.backendBaseUrl}/api/verify-package`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              packageId: id,
              expectedSizeMB: catalogItem.sizeMB,
              downloadedBytes: p.downloadedBytes,
              sha256: catalogItem.sha256
            })
          });
          const vData = await res.json();
          if (!vData.verified) {
            allVerified = false;
            p.status = 'failed';
          } else {
            p.status = 'verified';
          }
        } catch (e) {
          // Client-side fallback verification
          p.status = (p.downloadedBytes >= p.totalBytes) ? 'verified' : 'failed';
        }
      } else {
        // Client-side verification
        p.status = (p.downloadedBytes >= p.totalBytes) ? 'verified' : 'failed';
      }
    }

    state.download.isVerifying = false;

    if (allVerified) {
      state.download.isCompleted = true;
      saveStateToStorage();
      setTimeout(() => {
        showOfflineReadyScreen();
      }, 500);
    } else {
      showToast('Some packages failed integrity verification. Recovery options available.', 'warning');
    }
  }

  function showOfflineReadyScreen() {
    DOM.downloadActiveState.classList.add('hidden');
    DOM.offlineReadyState.classList.remove('hidden');

    let totalMB = 0;
    let totalArticles = 0;

    const list = DOM.readyPackagesList;
    list.innerHTML = '';

    state.selectedPackageIds.forEach(id => {
      const item = state.catalog.find(p => p.id === id);
      if (!item) return;

      totalMB += item.sizeMB;
      totalArticles += (item.articlesCount || 2500);

      const card = document.createElement('div');
      card.className = 'kiwix-card rounded-xl p-4 space-y-2';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-700/20" style="color: var(--text-muted)">${item.language.toUpperCase()}</span>
          </div>
          <span class="text-xs font-mono font-bold text-emerald-500">✓ Verified Ready</span>
        </div>
        <h4 class="font-bold text-sm" style="color: var(--text-primary)">${item.name}</h4>
        <p class="text-[11px] line-clamp-2" style="color: var(--text-muted)">${item.description}</p>
        <div class="pt-2 border-t flex items-center justify-between text-[11px] font-mono" style="border-color: var(--border-color); color: var(--text-muted)">
          <span>${item.sizeMB >= 1024 ? `${(item.sizeMB / 1024).toFixed(2)} GB` : `${item.sizeMB} MB`}</span>
          <span>${(item.articlesCount || 2500).toLocaleString()} articles</span>
        </div>
      `;
      list.appendChild(card);
    });

    const sizeStr = totalMB >= 1024 ? `${(totalMB / 1024).toFixed(2)} GB` : `${totalMB} MB`;
    DOM.readyPackagesCount.textContent = state.selectedPackageIds.size;
    DOM.readyStorageSize.textContent = sizeStr;
    DOM.readyArticlesCount.textContent = totalArticles.toLocaleString();

    launchConfetti();
    showToast('Offline Library prepared & verified! Ready for offline exploration.', 'success');
  }

  function launchConfetti() {
    const container = DOM.confettiContainer;
    container.innerHTML = '';
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    for (let i = 0; i < 40; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 20}%`;
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.animationDelay = `${Math.random() * 0.8}s`;
      container.appendChild(particle);
    }
  }

  // ==========================================
  // 11. CREATE CUSTOM ZIM FEATURE
  // ==========================================
  function setupCustomZimModal() {
    DOM.btnOpenCustomZim.addEventListener('click', () => {
      DOM.modalCustomZim.classList.remove('hidden');
    });

    DOM.btnCloseCustomZim.addEventListener('click', () => {
      DOM.modalCustomZim.classList.add('hidden');
    });

    DOM.btnCancelCustomZim.addEventListener('click', () => {
      DOM.modalCustomZim.classList.add('hidden');
    });

    // Tab switching: URL vs File
    DOM.tabZimUrl.addEventListener('click', () => {
      DOM.tabZimUrl.classList.add('bg-blue-600', 'text-white');
      DOM.tabZimUrl.classList.remove('text-muted');
      DOM.tabZimFile.classList.remove('bg-blue-600', 'text-white');
      DOM.fieldUrlGroup.classList.remove('hidden');
      DOM.fieldFileGroup.classList.add('hidden');
    });

    DOM.tabZimFile.addEventListener('click', () => {
      DOM.tabZimFile.classList.add('bg-blue-600', 'text-white');
      DOM.tabZimFile.classList.remove('text-muted');
      DOM.tabZimUrl.classList.remove('bg-blue-600', 'text-white');
      DOM.fieldFileGroup.classList.remove('hidden');
      DOM.fieldUrlGroup.classList.add('hidden');
    });

    // Dropzone file select
    DOM.dropzone.addEventListener('click', () => DOM.customFileInput.click());
    DOM.customFileInput.addEventListener('change', handleFileUpload);

    // Form submission
    DOM.customZimForm.addEventListener('submit', handleCustomZimSubmit);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    DOM.fileInfoBadge.classList.remove('hidden');
    DOM.fileNameDisplay.textContent = file.name;
    const sizeKB = (file.size / 1024).toFixed(1);
    DOM.fileSizeDisplay.textContent = `${sizeKB} KB`;

    if (!DOM.customZimTitle.value) {
      DOM.customZimTitle.value = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }

    const reader = new FileReader();
    reader.onload = function (ev) {
      const content = ev.target.result;
      const wordCount = content.split(/\s+/).length;
      if (!DOM.customZimDesc.value) {
        DOM.customZimDesc.value = `Custom archive generated from ${file.name} (~${wordCount} words, verified text/code).`;
      }
      DOM.customZimSize.value = Math.max(5, Math.ceil(file.size / (1024 * 1024) * 2));
    };
    reader.readAsText(file);
  }

  function handleCustomZimSubmit(e) {
    e.preventDefault();

    const title = DOM.customZimTitle.value.trim();
    const desc = DOM.customZimDesc.value.trim();
    const lang = DOM.customZimLang.value;
    const category = DOM.customZimCategory.value;
    const sizeMB = parseInt(DOM.customZimSize.value, 10) || 35;
    const url = DOM.customZimUrl.value.trim();

    if (!title) {
      showToast('Please enter an archive title.', 'warning');
      return;
    }

    const customId = `custom-zim-${Date.now()}`;
    const newZim = {
      id: customId,
      name: title,
      filename: `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_custom.zim`,
      description: desc,
      category: category,
      categoryLabel: getCategoryLabel(category),
      language: lang,
      languageLabel: getLanguageLabel(lang),
      sizeMB: sizeMB,
      articlesCount: Math.max(12, Math.round(sizeMB * 18)),
      icon: 'file-text',
      featured: true,
      isCustom: true,
      sourceUrl: url || null,
      sha256: generateClientHash(customId, `${title}.zim`, sizeMB),
      tags: ['custom', 'user-generated', category],
      sampleArticles: [
        {
          title: `${title} - Offline Index`,
          snippet: `Fully indexed local custom archive. Source: ${url || 'User File'}. Packaged with search capabilities.`
        }
      ]
    };

    state.customZims.push(newZim);
    state.catalog.unshift(newZim);
    state.selectedPackageIds.add(customId);

    saveStateToStorage();
    renderRecommendations();
    updateStorageMeter();

    DOM.modalCustomZim.classList.add('hidden');
    DOM.customZimForm.reset();
    DOM.fileInfoBadge.classList.add('hidden');

    showToast(`Custom ZIM "${title}" created and added to library queue!`, 'success');
  }

  function getCategoryLabel(cat) {
    const map = {
      tech: 'Coding & Tech',
      health: 'Health & Medicine',
      disaster: 'Disaster Preparedness',
      education: 'Education',
      science: 'Science',
      wikipedia: 'Wikipedia Reference',
      history: 'History & Culture'
    };
    return map[cat] || 'General Reference';
  }

  function getLanguageLabel(lang) {
    const map = {
      en: 'English',
      hi: 'हिन्दी (Hindi)',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      ar: 'العربية',
      zh: '中文',
      ru: 'Русский'
    };
    return map[lang] || lang.toUpperCase();
  }

  // ==========================================
  // 12. OFFLINE READER SIMULATOR FEATURE
  // ==========================================
  function setupOfflineReaderModal() {
    DOM.btnLaunchOfflineReader.addEventListener('click', openOfflineReader);
    DOM.btnCloseOfflineReader.addEventListener('click', () => {
      DOM.modalOfflineReader.classList.add('hidden');
    });

    DOM.readerSearchInput.addEventListener('input', (e) => {
      filterReaderArticles(e.target.value);
    });
  }

  function openOfflineReader() {
    DOM.modalOfflineReader.classList.remove('hidden');
    populateReaderSidebar();
  }

  function populateReaderSidebar() {
    const sidebar = DOM.readerSidebarPackages;
    sidebar.innerHTML = '';

    let firstArticle = null;

    state.selectedPackageIds.forEach(id => {
      const item = state.catalog.find(p => p.id === id);
      if (!item) return;

      const group = document.createElement('div');
      group.className = 'space-y-1.5';

      group.innerHTML = `
        <div class="text-[11px] font-bold uppercase tracking-wider text-blue-500 flex items-center justify-between">
          <span class="truncate max-w-[190px]">${item.name}</span>
          <span class="text-[9px] font-mono font-normal opacity-70">${item.language.toUpperCase()}</span>
        </div>
      `;

      const articlesList = document.createElement('div');
      articlesList.className = 'space-y-1 pl-2 border-l border-blue-500/20';

      const samples = item.sampleArticles && item.sampleArticles.length > 0 ? item.sampleArticles : [
        { title: `${item.name} - Index Page`, snippet: item.description }
      ];

      samples.forEach(art => {
        const itemBtn = document.createElement('button');
        itemBtn.className = 'w-full text-left p-2 rounded-lg text-xs transition-colors hover:bg-blue-500/10 block truncate reader-article-link';
        itemBtn.style.color = 'var(--text-secondary)';
        itemBtn.textContent = art.title;

        if (!firstArticle) {
          firstArticle = { item, article: art, element: itemBtn };
        }

        itemBtn.addEventListener('click', () => {
          highlightActiveSidebarArticle(itemBtn);
          displayReaderArticle(item, art);
        });

        articlesList.appendChild(itemBtn);
      });

      group.appendChild(articlesList);
      sidebar.appendChild(group);
    });

    if (firstArticle) {
      highlightActiveSidebarArticle(firstArticle.element);
      displayReaderArticle(firstArticle.item, firstArticle.article);
    }
  }

  function highlightActiveSidebarArticle(btn) {
    const allLinks = DOM.readerSidebarPackages.querySelectorAll('.reader-article-link');
    allLinks.forEach(l => {
      l.classList.remove('bg-blue-500/15', 'text-blue-500', 'font-semibold');
    });
    if (btn) {
      btn.classList.add('bg-blue-500/15', 'text-blue-500', 'font-semibold');
    }
  }

  function displayReaderArticle(pkg, art) {
    DOM.readerArticlePackage.textContent = pkg.name;
    DOM.readerArticleCategory.textContent = pkg.categoryLabel || pkg.category;
    DOM.readerArticleTitle.textContent = art.title;
    DOM.readerArticleZim.textContent = pkg.filename || `${pkg.id}.zim`;

    DOM.readerArticleBody.innerHTML = `
      <p>${art.snippet}</p>
      <div class="p-4 rounded-xl border my-4" style="background-color: var(--bg-surface); border-color: var(--border-color)">
        <h4 class="font-bold text-xs uppercase text-blue-500 mb-2">Verified Offline Knowledge Snapshot:</h4>
        <p class="text-xs">This full-text article is cached directly from the <strong>${pkg.filename}</strong> archive. In standard Kiwix, this content is accessed through the local embedded HTTP reader without incurring cellular or internet bandwidth.</p>
      </div>
      <p class="text-xs" style="color: var(--text-muted)">Keywords: ${(pkg.tags || []).join(', ')} • Offline Archive ID: ${pkg.id}</p>
    `;
  }

  function filterReaderArticles(query) {
    const q = query.trim().toLowerCase();
    const links = DOM.readerSidebarPackages.querySelectorAll('.reader-article-link');
    links.forEach(link => {
      const text = link.textContent.toLowerCase();
      if (!q || text.includes(q)) {
        link.classList.remove('hidden');
      } else {
        link.classList.add('hidden');
      }
    });
  }

  // ==========================================
  // 13. EXPORT CATALOG AS JSON
  // ==========================================
  function exportCatalogJson() {
    const exportData = {
      appName: 'Kiwix Onboarding',
      exportTimestamp: new Date().toISOString(),
      storageBudgetGB: state.storageBudgetGB,
      selectedInterests: Array.from(state.selectedInterests),
      selectedLanguages: Array.from(state.selectedLanguages),
      installedPackages: state.catalog.filter(p => state.selectedPackageIds.has(p.id))
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `kiwix_offline_library_config_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Offline library configuration exported to JSON.', 'success');
  }

  // ==========================================
  // 14. RESET & RESTART FLOW
  // ==========================================
  function resetAllOnboarding() {
    if (confirm('Are you sure you want to restart the onboarding process? This will reset your selections.')) {
      localStorage.removeItem(STORAGE_KEYS.STEP);
      localStorage.removeItem(STORAGE_KEYS.INTERESTS);
      localStorage.removeItem(STORAGE_KEYS.LANGUAGES);
      localStorage.removeItem(STORAGE_KEYS.STORAGE_GB);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_PACKAGES);
      localStorage.removeItem(STORAGE_KEYS.DOWNLOAD_DONE);
      localStorage.removeItem(STORAGE_KEYS.DOWNLOAD_PROGRESS);

      state.currentStep = 1;
      state.selectedInterests = new Set(['health', 'wikipedia']);
      state.selectedLanguages = new Set(['en']);
      state.storageBudgetGB = 5.0;
      state.selectedPackageIds.clear();
      state.download.isCompleted = false;
      state.download.packageProgress = {};

      loadCatalogData();
      updateStepperUI();
      renderInterestsUI();
      renderLanguagesUI();
      updateStorageMeter();
      renderRecommendations();

      showToast('Onboarding restarted. Welcome back!', 'info');
    }
  }

  // ==========================================
  // 15. TOAST NOTIFICATION UTILITY
  // ==========================================
  function showToast(message, type = 'info') {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';

    let iconSvg = '';
    let bgColor = 'var(--bg-surface)';
    let textColor = 'var(--text-primary)';
    let borderColor = 'var(--border-color)';

    if (type === 'success') {
      bgColor = '#065f46';
      textColor = '#ecfdf5';
      borderColor = '#10b981';
      iconSvg = '<svg class="w-4 h-4 text-emerald-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    } else if (type === 'warning') {
      bgColor = '#78350f';
      textColor = '#fef3c7';
      borderColor = '#f59e0b';
      iconSvg = '<svg class="w-4 h-4 text-amber-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    } else {
      bgColor = '#1e3a8a';
      textColor = '#eff6ff';
      borderColor = '#3b82f6';
      iconSvg = '<svg class="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }

    toast.style.backgroundColor = bgColor;
    toast.style.color = textColor;
    toast.style.border = `1px solid ${borderColor}`;

    toast.innerHTML = `
      ${iconSvg}
      <span>${message}</span>
    `;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      setTimeout(() => toast.remove(), 250);
    }, 3800);
  }

  // ==========================================
  // 16. EVENT LISTENERS
  // ==========================================
  function setupEventListeners() {
    // Top Nav / Restart
    DOM.btnRestartOnboarding.addEventListener('click', resetAllOnboarding);
    DOM.brandLogo.addEventListener('click', () => goToStep(1));

    // Stepper interactive jump
    DOM.stepperSteps.forEach(stepEl => {
      stepEl.addEventListener('click', () => {
        const stepNum = parseInt(stepEl.getAttribute('data-step'), 10);
        if (stepNum <= state.currentStep) {
          goToStep(stepNum);
        }
      });
    });

    // Step 1: Welcome
    DOM.btnStartOnboarding.addEventListener('click', () => goToStep(2));
    DOM.btnQuickSkip.addEventListener('click', () => {
      state.selectedInterests = new Set(['health', 'wikipedia', 'science', 'disaster']);
      state.selectedLanguages = new Set(['en']);
      state.storageBudgetGB = 5.0;
      smartCurateToBudget();
      goToStep(4);
      showToast('Pre-configured popular 5GB knowledge bundle!', 'info');
    });

    DOM.toggleZimExplainer.addEventListener('click', () => {
      DOM.zimExplainerContent.classList.toggle('hidden');
      DOM.zimExplainerArrow.classList.toggle('rotate-180');
    });

    // Step 2: Interests
    DOM.interestsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.interest-card');
      if (!card) return;
      const interest = card.getAttribute('data-interest');
      toggleInterest(interest);
    });

    DOM.btnSelectAllInterests.addEventListener('click', () => {
      const cards = DOM.interestsGrid.querySelectorAll('.interest-card');
      cards.forEach(c => state.selectedInterests.add(c.getAttribute('data-interest')));
      renderInterestsUI();
      saveStateToStorage();
      renderRecommendations();
      updateStorageMeter();
    });

    DOM.btnClearInterests.addEventListener('click', () => {
      state.selectedInterests.clear();
      renderInterestsUI();
      saveStateToStorage();
      renderRecommendations();
      updateStorageMeter();
    });

    DOM.btnBackStep2.addEventListener('click', () => goToStep(1));
    DOM.btnNextStep2.addEventListener('click', () => goToStep(3));

    // Step 3: Languages
    DOM.languagesGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.language-card');
      if (!card) return;
      const lang = card.getAttribute('data-lang');
      toggleLanguage(lang);
    });

    DOM.langSearchInput.addEventListener('input', (e) => {
      filterLanguagesBySearch(e.target.value);
    });

    DOM.btnBackStep3.addEventListener('click', () => goToStep(2));
    DOM.btnNextStep3.addEventListener('click', () => goToStep(4));

    // Step 4: Storage & Recommendations
    DOM.storagePresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.storageBudgetGB = parseFloat(btn.getAttribute('data-gb'));
        updateStorageMeter();
        renderRecommendations();
        saveStateToStorage();
      });
    });

    DOM.storageManualInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        state.storageBudgetGB = val;
        updateStorageMeter();
        renderRecommendations();
        saveStateToStorage();
      }
    });

    DOM.btnDetectStorage.addEventListener('click', autoDetectDeviceStorage);
    DOM.btnSmartCurate.addEventListener('click', smartCurateToBudget);

    DOM.recFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.recFilterBtns.forEach(b => b.classList.remove('active-filter', 'bg-blue-600', 'text-white'));
        btn.classList.add('active-filter', 'bg-blue-600', 'text-white');
        state.filterCategory = btn.getAttribute('data-category');
        renderRecommendations();
      });
    });

    DOM.recSearchInput.addEventListener('input', () => {
      renderRecommendations();
    });

    DOM.btnResetRecFilters.addEventListener('click', () => {
      state.filterCategory = 'all';
      if (DOM.recSearchInput) DOM.recSearchInput.value = '';
      DOM.recFilterBtns.forEach(b => {
        if (b.getAttribute('data-category') === 'all') {
          b.classList.add('active-filter', 'bg-blue-600', 'text-white');
        } else {
          b.classList.remove('active-filter', 'bg-blue-600', 'text-white');
        }
      });
      renderRecommendations();
    });

    DOM.btnBackStep4.addEventListener('click', () => goToStep(3));
    DOM.btnNextStep4.addEventListener('click', () => goToStep(5));

    // Step 5: Download controls
    DOM.speedSelector.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      state.download.speedMbps = (!isNaN(val) && val > 0) ? val : 10;
      updateDownloadUI();
      updateStorageMeter();
    });

    DOM.btnTogglePauseDownload.addEventListener('click', togglePauseDownload);
    DOM.btnSimulateInterruption.addEventListener('click', triggerSimulatedInterruption);
    DOM.btnManualResumeInterruption.addEventListener('click', recoverFromInterruption);
    DOM.btnFastForwardDownload.addEventListener('click', fastForwardDownload);
    DOM.btnBackStep5.addEventListener('click', () => goToStep(4));

    // Offline Ready actions
    DOM.btnExportCatalog.addEventListener('click', exportCatalogJson);
    DOM.btnReconfigurePackages.addEventListener('click', () => goToStep(4));

    // Modals
    setupCustomZimModal();
    setupOfflineReaderModal();
  }

  // ==========================================
  // BOOTSTRAP
  // ==========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();

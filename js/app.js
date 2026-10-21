/**
 * Kiwix Onboarding - Zero-to-Knowledge First-Run Experience
 * Clean, modern vanilla JavaScript application state & engines
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
    DOWNLOAD_DONE: 'kiwix_download_completed'
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
    download: {
      active: false,
      paused: false,
      interrupted: false,
      progressBytes: 0,
      totalBytes: 0,
      speedMbps: 10, // Default 10 Mbps = 1.25 MB/s
      intervalId: null,
      interruptionTimeout: null,
      packageProgress: {}, // id -> { downloadedBytes, totalBytes, completed }
      isCompleted: false
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

  function loadCatalogData() {
    // 1. Try to fetch from external catalog.json, or fallback to window.DEFAULT_KIWIX_CATALOG
    if (window.DEFAULT_KIWIX_CATALOG && Array.isArray(window.DEFAULT_KIWIX_CATALOG)) {
      state.catalog = JSON.parse(JSON.stringify(window.DEFAULT_KIWIX_CATALOG));
    }

    // Attempt fetch for live update if running on web server
    fetch('data/catalog.json')
      .then(res => {
        if (!res.ok) throw new Error('Catalog fetch returned ' + res.status);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          state.catalog = data;
          mergeCustomZimsIntoCatalog();
          renderRecommendations();
        }
      })
      .catch(() => {
        // Safe offline fallback already loaded
        mergeCustomZimsIntoCatalog();
      });
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.selectedInterests = new Set(parsed);
        }
      }

      const savedLanguages = localStorage.getItem(STORAGE_KEYS.LANGUAGES);
      if (savedLanguages) {
        const parsed = JSON.parse(savedLanguages);
        if (Array.isArray(parsed) && parsed.length > 0) {
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

      const isDone = localStorage.getItem(STORAGE_KEYS.DOWNLOAD_DONE);
      if (isDone === 'true' && state.currentStep === 5) {
        state.download.isCompleted = true;
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
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // ==========================================
  // 5. THEME MANAGER
  // ==========================================
  function setupTheme() {
    applyTheme(state.theme);

    DOM.themeToggleBtn.addEventListener('click', () => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      showToast(nextTheme === 'dark' ? 'Switched to Dark Charcoal Theme' : 'Switched to Soft Light Theme', 'info');
    });
  }

  function applyTheme(theme) {
    state.theme = theme;
    if (theme === 'light') {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      DOM.iconSun.classList.add('hidden');
      DOM.iconMoon.classList.remove('hidden');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      DOM.iconMoon.classList.add('hidden');
      DOM.iconSun.classList.remove('hidden');
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
      if (state.currentStep === 4 && state.selectedPackageIds.size === 0) {
        showToast('Please select at least one ZIM package for download.', 'warning');
        return;
      }
    }

    state.currentStep = targetStep;
    saveStateToStorage();
    updateStepperUI();

    // If entering Step 4, trigger recommendation re-score
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

    // Scroll to top of content
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
  function updateStorageMeter() {
    // Sync manual input value
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

    // Update text indicators
    DOM.storageSelectedText.textContent = totalGB >= 1 ? `${totalGB.toFixed(2)} GB` : `${totalMB} MB`;
    DOM.storageItemsCount.textContent = `(${state.selectedPackageIds.size} packages)`;
    DOM.storageBudgetText.textContent = `${budgetGB.toFixed(2)} GB`;
    DOM.storageRemainingText.textContent = `Remaining: ${remainingGB.toFixed(2)} GB`;
    DOM.storagePercentText.textContent = `${Math.round(percent)}% of budget allocated`;
    DOM.step4ProceedSummary.textContent = `${state.selectedPackageIds.size} items (${totalGB.toFixed(2)} GB)`;

    // Update visual progress bar width & color
    DOM.storageProgressBar.style.width = `${Math.min(100, percent)}%`;

    if (percent > 100) {
      DOM.storageProgressBar.style.backgroundColor = '#ef4444'; // Red warning
      DOM.storageWarningBanner.classList.remove('hidden');
      const excess = (totalGB - budgetGB).toFixed(2);
      DOM.storageWarningMsg.textContent = `Storage Exceeded: Selected content (${totalGB.toFixed(2)} GB) exceeds your ${budgetGB.toFixed(2)} GB limit by ${excess} GB. Consider deselecting larger packages.`;
    } else if (percent > 85) {
      DOM.storageProgressBar.style.backgroundColor = '#f59e0b'; // Amber cautionary
      DOM.storageWarningBanner.classList.add('hidden');
    } else {
      DOM.storageProgressBar.style.backgroundColor = '#3b82f6'; // Clean blue
      DOM.storageWarningBanner.classList.add('hidden');
    }

    // Enable/disable proceed button
    DOM.btnNextStep4.disabled = state.selectedPackageIds.size === 0;
  }

  function autoDetectDeviceStorage() {
    DOM.detectStorageLabel.textContent = 'Detecting...';
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        if (estimate.quota) {
          const availableBytes = estimate.quota - (estimate.usage || 0);
          const availableGB = Math.round((availableBytes / (1024 * 1024 * 1024)) * 0.4); // Suggest 40% of available space
          const cleanGB = Math.max(2, Math.min(availableGB, 50));
          state.storageBudgetGB = cleanGB;
          DOM.detectStorageLabel.textContent = `Detected (~${cleanGB} GB target)`;
          updateStorageMeter();
          saveStateToStorage();
          showToast(`Storage detected! Allocated recommended ${cleanGB} GB quota.`, 'success');
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
    saveStateToStorage();
    showToast('Allocated 8 GB standard offline storage quota.', 'info');
  }

  function smartCurateToBudget() {
    // Automatically select the best combination of packages matching interests & languages that fits in budget
    state.selectedPackageIds.clear();
    const ranked = getScoredAndRankedCatalog();
    let currentMB = 0;
    const maxMB = state.storageBudgetGB * 1024;

    // Prioritize high-scoring matches
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

      // Custom packages always get top priority
      if (item.isCustom) score += 200;

      // Matching interest
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
        const text = `${pkg.name} ${pkg.description} ${pkg.categoryLabel} ${pkg.languageLabel}`.toLowerCase();
        if (!text.includes(query)) return;
      }

      visibleCount++;
      const isSelected = state.selectedPackageIds.has(pkg.id);
      const isMatch = state.selectedInterests.has(pkg.category) && state.selectedLanguages.has(pkg.language);

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

    // Initialize package progress objects
    state.download.packageProgress = {};
    state.selectedPackageIds.forEach(id => {
      const item = state.catalog.find(p => p.id === id);
      const itemTotalBytes = (item ? item.sizeMB : 100) * 1024 * 1024;
      state.download.packageProgress[id] = {
        downloadedBytes: 0,
        totalBytes: itemTotalBytes,
        completed: false
      };
    });

    renderDownloadQueueUI();
    startDownloadSimulation();
  }

  function renderDownloadQueueUI() {
    const queue = DOM.downloadItemsQueue;
    queue.innerHTML = '';

    state.selectedPackageIds.forEach(id => {
      const item = state.catalog.find(p => p.id === id);
      if (!item) return;

      const pState = state.download.packageProgress[id] || { downloadedBytes: 0, totalBytes: item.sizeMB * 1024 * 1024, completed: false };
      const pct = pState.totalBytes > 0 ? Math.min(100, (pState.downloadedBytes / pState.totalBytes) * 100) : 0;
      const dlMB = (pState.downloadedBytes / (1024 * 1024)).toFixed(1);
      const totMB = (pState.totalBytes / (1024 * 1024)).toFixed(1);

      const row = document.createElement('div');
      row.className = 'kiwix-card rounded-xl p-4 space-y-2';
      row.id = `dl-item-${id}`;

      row.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full ${pState.completed ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}"></span>
            <span class="font-bold text-xs" style="color: var(--text-primary)">${item.name}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-700/20" style="color: var(--text-muted)">${item.language.toUpperCase()}</span>
          </div>
          <div class="flex items-center space-x-2 text-xs font-mono">
            <span class="dl-bytes" style="color: var(--text-muted)">${dlMB} MB / ${totMB} MB</span>
            <span class="dl-pct font-bold text-blue-500">${Math.round(pct)}%</span>
          </div>
        </div>

        <div class="w-full h-2 rounded-full overflow-hidden bg-slate-700/20">
          <div class="dl-bar h-full rounded-full ${pState.completed ? 'bg-emerald-500' : 'bg-blue-500'} transition-all duration-150" style="width: ${pct}%"></div>
        </div>
      `;

      queue.appendChild(row);
    });
  }

  function startDownloadSimulation() {
    if (state.download.intervalId) clearInterval(state.download.intervalId);

    state.download.active = true;
    DOM.overallSpinner.classList.remove('hidden');

    const tickIntervalMs = 200; // 5 ticks per second

    state.download.intervalId = setInterval(() => {
      if (state.download.paused || state.download.interrupted) return;

      // Speed math: e.g. 10 Mbps = 1.25 MB/s = 1,310,720 bytes/sec
      const bytesPerSec = (state.download.speedMbps * 1000 * 1000) / 8;
      // Slightly fluctuate speed to feel authentic (+- 10%)
      const fluctuation = 0.9 + Math.random() * 0.2;
      const bytesThisTick = (bytesPerSec * (tickIntervalMs / 1000)) * fluctuation;

      // Distribute bytes across in-progress packages
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
      p.downloadedBytes = Math.min(p.totalBytes, p.downloadedBytes + bytesThisTick);

      if (p.downloadedBytes >= p.totalBytes) {
        p.completed = true;
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

    // Calculate real ETA
    const remainingBytes = Math.max(0, total - current);
    const bytesPerSec = (state.download.speedMbps * 1000 * 1000) / 8;
    const remainingSeconds = Math.ceil(remainingBytes / bytesPerSec);

    if (remainingSeconds <= 0) {
      DOM.overallEtaText.textContent = 'Finalizing package indexing and checksum verification...';
    } else {
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      DOM.overallEtaText.textContent = `ETA: ~${mins > 0 ? `${mins}m ` : ''}${secs}s remaining at ${state.download.speedMbps} Mbps`;
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

      if (dlText) dlText.textContent = `${(p.downloadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(p.totalBytes / (1024 * 1024)).toFixed(1)} MB`;
      if (pctText) {
        pctText.textContent = p.completed ? '100% (Verified)' : `${Math.round(pPct)}%`;
        if (p.completed) pctText.className = 'dl-pct font-bold text-emerald-500';
      }
      if (bar) {
        bar.style.width = `${pPct}%`;
        if (p.completed) bar.className = 'dl-bar h-full rounded-full bg-emerald-500';
      }
    });
  }

  function togglePauseDownload() {
    state.download.paused = !state.download.paused;
    if (state.download.paused) {
      DOM.pauseBtnLabel.textContent = 'Resume Download';
      DOM.downloadHeaderStatus.textContent = 'Download Paused';
      DOM.overallSpinner.classList.add('hidden');
      DOM.pauseIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;
      showToast('Download simulation paused.', 'info');
    } else {
      DOM.pauseBtnLabel.textContent = 'Pause Download';
      DOM.downloadHeaderStatus.textContent = 'Simulating Resumable Retrieval...';
      DOM.overallSpinner.classList.remove('hidden');
      DOM.pauseIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;
      showToast('Resuming download from preserved chunks.', 'info');
    }
  }

  function triggerSimulatedInterruption() {
    if (state.download.isCompleted) return;

    state.download.interrupted = true;
    DOM.interruptionAlertBanner.classList.remove('hidden');
    DOM.networkStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center space-x-1.5';
    DOM.networkStatusText.textContent = 'Connection Dropped';
    DOM.downloadHeaderStatus.textContent = 'Connection Interrupted';
    DOM.overallSpinner.classList.add('hidden');

    let countdown = 3;
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

    showToast('Network interruption simulated! Automatic recovery engaged.', 'warning');
  }

  function recoverFromInterruption() {
    if (state.download.interruptionTimeout) clearInterval(state.download.interruptionTimeout);
    state.download.interrupted = false;

    DOM.interruptionAlertBanner.classList.add('hidden');
    DOM.networkStatusBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center space-x-1.5';
    DOM.networkStatusText.textContent = 'Reconnected (Resuming)';
    DOM.downloadHeaderStatus.textContent = 'Simulating Resumable Retrieval...';
    DOM.overallSpinner.classList.remove('hidden');

    showToast('Connection restored! Download resumed seamlessly without data loss.', 'success');
  }

  function fastForwardDownload() {
    // Instantly sets all package progress to 100% for rapid evaluation & testing
    Object.keys(state.download.packageProgress).forEach(id => {
      const p = state.download.packageProgress[id];
      p.downloadedBytes = p.totalBytes;
      p.completed = true;
    });
    state.download.progressBytes = state.download.totalBytes;
    updateDownloadUI();
    completeAllDownloads();
    showToast('Fast-forward complete: All packages downloaded & verified!', 'success');
  }

  function completeAllDownloads() {
    if (state.download.intervalId) clearInterval(state.download.intervalId);
    state.download.active = false;
    state.download.isCompleted = true;
    saveStateToStorage();

    setTimeout(() => {
      showOfflineReadyScreen();
    }, 400);
  }

  function showOfflineReadyScreen() {
    DOM.downloadActiveState.classList.add('hidden');
    DOM.offlineReadyState.classList.remove('hidden');

    // Calculate metrics
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
          <span class="text-xs font-mono font-bold text-emerald-500">Verified</span>
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
    showToast('Offline Library is 100% prepared! Ready for offline exploration.', 'success');
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

    // Pre-populate title if empty
    if (!DOM.customZimTitle.value) {
      DOM.customZimTitle.value = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }

    // Read snippet
    const reader = new FileReader();
    reader.onload = function (ev) {
      const content = ev.target.result;
      const wordCount = content.split(/\s+/).length;
      if (!DOM.customZimDesc.value) {
        DOM.customZimDesc.value = `Custom archive generated from ${file.name} (~${wordCount} words, verified code/text reference).`;
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
      wikipedia: 'Wikipedia Reference'
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
          firstArticle = { item, article: art };
        }

        itemBtn.addEventListener('click', () => {
          displayReaderArticle(item, art);
        });

        articlesList.appendChild(itemBtn);
      });

      group.appendChild(articlesList);
      sidebar.appendChild(group);
    });

    if (firstArticle) {
      displayReaderArticle(firstArticle.item, firstArticle.article);
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
    if (confirm('Are you sure you want to restart the onboarding process? This will clear your current selections.')) {
      localStorage.clear();
      state.currentStep = 1;
      state.selectedInterests = new Set(['health', 'wikipedia']);
      state.selectedLanguages = new Set(['en']);
      state.storageBudgetGB = 5.0;
      state.selectedPackageIds.clear();
      state.customZims = [];
      state.download.isCompleted = false;

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
      iconSvg = '<svg class="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    } else if (type === 'warning') {
      bgColor = '#78350f';
      textColor = '#fef3c7';
      borderColor = '#f59e0b';
      iconSvg = '<svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    } else {
      bgColor = '#1e3a8a';
      textColor = '#eff6ff';
      borderColor = '#3b82f6';
      iconSvg = '<svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
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
        // Only allow clicking to current or completed steps
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
    });

    DOM.btnClearInterests.addEventListener('click', () => {
      state.selectedInterests.clear();
      renderInterestsUI();
      saveStateToStorage();
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
        saveStateToStorage();
      });
    });

    DOM.storageManualInput.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        state.storageBudgetGB = val;
        updateStorageMeter();
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
      state.download.speedMbps = parseFloat(e.target.value);
      updateDownloadUI();
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

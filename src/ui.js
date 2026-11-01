
    // Simple tab management
    const ipcRenderer = window.desktop;
    const currentVersionPromise = ipcRenderer.invoke('get-app-version');

    function parseTagName(tag) {
      if (!tag) return null;
      // expect vMAJOR.MINOR.PATCH
      const m = tag.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
      if (!m) return null;
      return { major: +m[1], minor: +m[2], patch: +m[3] };
    }

    function cmpSemver(a, b) {
      if (a.major !== b.major) return a.major - b.major;
      if (a.minor !== b.minor) return a.minor - b.minor;
      return a.patch - b.patch;
    }

    let latestReleaseUrl = null;

    async function checkForUpdate() {
      try {
        const currentVersionStr = await currentVersionPromise;
        const cur = parseTagName('v' + currentVersionStr);
        if (!cur) return;
        const data = await fetchLatestRelease();
        if (!data || !data.tag_name) return;
        const latest = parseTagName(data.tag_name);
        if (!latest) return;
        if (cmpSemver(latest, cur) > 0) {
          const el = document.getElementById('update-indicator');
          const btn = document.getElementById('update-btn');

          // Validate and set the release URL
          let releaseUrl = data.html_url;
          if (!releaseUrl) {
            releaseUrl = `https://github.com/AnRkey/Grok-Desktop/releases/tag/${data.tag_name}`;
          }

          // Validate that the URL is a legitimate GitHub release URL
          const githubReleasePattern = /^https:\/\/github\.com\/AnRkey\/Grok-Desktop\/releases\/tag\/[^/]+$/;
          if (githubReleasePattern.test(releaseUrl)) {
            latestReleaseUrl = releaseUrl;
            if (btn) {
              btn.style.display = 'inline-block';
              btn.title = `Version ${data.tag_name} available`;
            }
          }
        }
      } catch (_) {}
    }

    function fetchLatestRelease() {
      return fetch('https://api.github.com/repos/AnRkey/Grok-Desktop/releases/latest', {
        headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(10000)
      }).then(response => response.ok ? response.json() : null);
    }

    // Apply theme on message from main
    ipcRenderer.on('system-theme-updated', (theme) => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    const tabManager = {
      tabs: [],
      activeTabId: null,
      tabsContainer: document.getElementById('tabs'),
      viewsContainer: document.getElementById('views'),
      newTabButton: null,
      
      init() {
        // Create the new tab button
        this.createNewTabButton();
        
        // Set up reload button
        const reloadButton = document.getElementById('reload-button');
        reloadButton.addEventListener('click', () => {
          const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
          if (activeTab && activeTab.webview) {
            // Add loading state
            reloadButton.classList.add('loading');

            // Remove loading state when page finishes loading
            const removeLoading = () => {
              reloadButton.classList.remove('loading');
              activeTab.webview.removeEventListener('did-stop-loading', removeLoading);
            };
            activeTab.webview.addEventListener('did-stop-loading', removeLoading);

            // Reload the webview (after listener is attached)
            activeTab.webview.reload();
          }
        });
        
        // Set up AOT button (default off; only on when user opts in)
        const aotButton = document.getElementById('aot-button');
        const syncAotButton = (isAlwaysOnTop) => {
          if (isAlwaysOnTop) {
            aotButton.classList.add('active');
          } else {
            aotButton.classList.remove('active');
          }
          try { localStorage.setItem('grokDesktopAot', String(!!isAlwaysOnTop)); } catch (e) {}
        };
        aotButton.addEventListener('click', () => {
          ipcRenderer.invoke('toggle-always-on-top').then((isAlwaysOnTop) => {
            syncAotButton(isAlwaysOnTop);
          });
        });
        // Force UI to match process state (main process starts with AOT off)
        ipcRenderer.invoke('get-always-on-top').then((isAlwaysOnTop) => {
          syncAotButton(!!isAlwaysOnTop);
        }).catch(() => syncAotButton(false));
        
        // Create initial tab
        this.createTab('https://grok.com');

        // After initial UI is ready, check for updates
        checkForUpdate();

        // Setup tab scroll buttons visibility and behavior
        this.setupScrollButtons();
      },
      
      createNewTabButton() {
        // Create the new tab button if it doesn't exist
        if (!this.newTabButton) {
          this.newTabButton = document.createElement('button');
          this.newTabButton.className = 'new-tab-button';
          this.newTabButton.textContent = '+';
          this.newTabButton.addEventListener('click', () => {
            this.createTab('https://grok.com');
          });
        }
        
        // Add it to the tabs container
        this.tabsContainer.appendChild(this.newTabButton);
      },
      
      updateNewTabButtonPosition() {
        // Move the new tab button to the end of the tabs list
        if (this.newTabButton && this.newTabButton.parentNode) {
          this.newTabButton.parentNode.removeChild(this.newTabButton);
        }
        this.tabsContainer.appendChild(this.newTabButton);
        // Re-evaluate scroll buttons after tab changes
        this.updateScrollButtons();
      },
      
      createTab(url, background = false) {
        const tabId = 'tab-' + crypto.randomUUID();
        
        // Create tab element
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.id = tabId;
        tabElement.innerHTML = `
          <div class="tab-title">New Tab</div>
          <button class="tab-close">×</button>
        `;
        
        // Create view element with webview
        const viewElement = document.createElement('div');
        viewElement.className = 'view';
        viewElement.id = 'view-' + tabId;
        
        const webview = document.createElement('webview');
        webview.src = url;
        webview.partition = 'persist:grok';
        webview.setAttribute('allowpopups', '');
        webview.setAttribute('allow', 'microphone; camera; autoplay; clipboard-read; clipboard-write; display-capture');
        
        viewElement.appendChild(webview);

        const ensureWebviewBackground = () => {
          const bg = getComputedStyle(webview).backgroundColor;
          if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
            webview.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-content').trim() || '#ffffff';
          }
        };
        ensureWebviewBackground();

        const applyAppleLightScheme = async () => {
          let currentUrl = '';
          try { currentUrl = webview.getURL ? webview.getURL() : ''; } catch (_) {}
          const target = (currentUrl || '').toLowerCase();
          const wcId = webview.getWebContentsId ? webview.getWebContentsId() : null;
          if (wcId && new URL(currentUrl).hostname === 'appleid.apple.com') {
            try { await ipcRenderer.invoke('force-light-color-scheme', wcId, true); } catch (_) {}
            // Fallback CSS to force light palette in case site ignores color scheme
            const lightCss = `:root{color-scheme:light !important}
              html,body{background:#ffffff !important;color:#000000 !important}
              input,textarea,select{background:#ffffff !important;color:#000000 !important;border-color:#bbb !important}
              header,nav{background:#ffffff !important;color:#000000 !important}
            `;
            try { webview.insertCSS(lightCss).catch(()=>{}); } catch (_) {}
            webview.style.backgroundColor = '#ffffff';
          } else if (wcId) {
            try { await ipcRenderer.invoke('force-light-color-scheme', wcId, false); } catch (_) {}
            // Reset background to themed content color
            webview.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-content').trim() || '';
          }
        };
        
        // Add to DOM - insert before the new tab button
        this.tabsContainer.appendChild(tabElement);
        this.viewsContainer.appendChild(viewElement);
        
        // Update the new tab button position
        this.updateNewTabButtonPosition();
        
        // Set up event listeners
        tabElement.addEventListener('click', (e) => {
          if (!e.target.classList.contains('tab-close')) {
            this.activateTab(tabId);
          }
        });
        
        tabElement.querySelector('.tab-close').addEventListener('click', () => {
          this.closeTab(tabId);
        });
        
        // Set up webview events
        webview.addEventListener('page-title-updated', (e) => {
          const titleElement = tabElement.querySelector('.tab-title');
          titleElement.textContent = e.title;
          titleElement.title = e.title;
        });
        
        webview.addEventListener('did-start-loading', () => {
          tabElement.classList.add('loading');
        });
        
        webview.addEventListener('did-stop-loading', () => {
          tabElement.classList.remove('loading');
        });

        webview.addEventListener('dom-ready', () => {
          ensureWebviewBackground();
          applyAppleLightScheme();
        });

        webview.addEventListener('did-navigate', () => applyAppleLightScheme());
        webview.addEventListener('did-navigate-in-page', () => applyAppleLightScheme());
        
        // Navigation and popup policy runs in the main process, before the
        // request can load; webview DOM events cannot cancel main navigation.

        // Store tab info
        this.tabs.push({
          id: tabId,
          element: tabElement,
          view: viewElement,
          webview: webview
        });
        
        // Activate the new tab
        if (!background || !this.activeTabId) this.activateTab(tabId);
        return tabId;
      },

      activateNextTab() {
        if (!this.tabs.length) return;
        if (!this.activeTabId) {
          this.activateTab(this.tabs[0].id);
          return;
        }
        const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
        const nextIndex = (currentIndex + 1) % this.tabs.length;
        this.activateTab(this.tabs[nextIndex].id);
      },

      activatePrevTab() {
        if (!this.tabs.length) return;
        if (!this.activeTabId) {
          this.activateTab(this.tabs[0].id);
          return;
        }
        const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
        const prevIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
        this.activateTab(this.tabs[prevIndex].id);
      },

      reloadActiveTab() {
        const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
        if (!activeTab || !activeTab.webview) return;
        const reloadButton = document.getElementById('reload-button');
        if (reloadButton) {
          reloadButton.classList.add('loading');
          const removeLoading = () => {
            reloadButton.classList.remove('loading');
            activeTab.webview.removeEventListener('did-stop-loading', removeLoading);
          };
          activeTab.webview.addEventListener('did-stop-loading', removeLoading);
        }
        activeTab.webview.reload();
      },

      setupScrollButtons() {
        this.leftBtn = document.getElementById('tabs-scroll-left');
        this.rightBtn = document.getElementById('tabs-scroll-right');
        this.scrollContainer = this.tabsContainer; // tabs container is the scroll target for x
        if (this.leftBtn && this.rightBtn) {
          this.leftBtn.addEventListener('click', () => this.scrollByAmount(-200));
          this.rightBtn.addEventListener('click', () => this.scrollByAmount(200));
          // Update on scroll and resize
          this.scrollContainer.addEventListener('scroll', () => this.updateScrollButtons(), { passive: true });
          window.addEventListener('resize', () => this.updateScrollButtons());

          // Add mouse wheel functionality when hovering over tabs
          this.scrollContainer.addEventListener('wheel', (e) => {
            // Only handle if we're over the tabs area (not scroll buttons)
            if (e.target.closest('.tabs-scroll')) return;

            // Check if Ctrl is pressed for tab switching
            if (e.ctrlKey) {
              // Ctrl + scroll = switch tabs
              e.preventDefault(); // Prevent any default behavior
              if (e.deltaY > 0) {
                // Scroll down = next tab
                this.activateNextTab();
              } else if (e.deltaY < 0) {
                // Scroll up = previous tab
                this.activatePrevTab();
              }
            } else {
              // Regular scroll = horizontal scrolling of tabs
              const deltaX = e.deltaY * 0.5; // Scale down for smoother scrolling
              this.scrollContainer.scrollBy({
                left: deltaX,
                behavior: 'auto' // Use 'auto' for immediate response to wheel
              });

              // Prevent default vertical scrolling when over tabs
              e.preventDefault();
            }
          }, { passive: false });

          // Initial
          this.updateScrollButtons();
        }
      },

      scrollByAmount(dx) {
        this.scrollContainer.scrollBy({ left: dx, behavior: 'smooth' });
      },

      updateScrollButtons() {
        if (!this.leftBtn || !this.rightBtn) return;
        const sc = this.scrollContainer;
        const canScrollLeft = sc.scrollLeft > 0;
        const canScrollRight = Math.ceil(sc.scrollLeft + sc.clientWidth) < sc.scrollWidth;
        this.leftBtn.style.display = canScrollLeft ? 'inline-flex' : 'none';
        this.rightBtn.style.display = canScrollRight ? 'inline-flex' : 'none';
      },
      
      activateTab(tabId) {
        // Deactivate current active tab
        if (this.activeTabId) {
          const activeTab = this.tabs.find(tab => tab.id === this.activeTabId);
          if (activeTab) {
            activeTab.element.classList.remove('active');
            activeTab.view.classList.remove('active');
          }
        }
        
        // Activate new tab
        const tab = this.tabs.find(tab => tab.id === tabId);
        if (tab) {
          tab.element.classList.add('active');
          tab.view.classList.add('active');
          this.activeTabId = tabId;
        }
      },
      
      closeTab(tabId) {
        const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
        
        if (tabIndex !== -1) {
          const tab = this.tabs[tabIndex];
          
          // Remove from DOM
          tab.element.remove();
          tab.view.remove();
          
          // Remove from tabs array
          this.tabs.splice(tabIndex, 1);
          
          // If this was the active tab, activate another one
          if (this.activeTabId === tabId) {
            if (this.tabs.length > 0) {
              // Activate the tab to the left, or the first tab if this was the leftmost
              const newActiveIndex = Math.max(0, tabIndex - 1);
              this.activateTab(this.tabs[newActiveIndex].id);
            } else {
              this.activeTabId = null;
            }
          }
          
          // If no tabs left, create a new one
          if (this.tabs.length === 0) {
            this.createTab('https://grok.com');
          } else {
            // Update the new tab button position
            this.updateNewTabButtonPosition();
          }
        }
      }
    };
    
    ipcRenderer.on('open-internal-tab', (url, background) => tabManager.createTab(url, background));

    // Global shortcut handlers from main process
    ipcRenderer.on('shortcut-new-tab', () => {
      tabManager.createTab('https://grok.com');
    });
    ipcRenderer.on('shortcut-next-tab', () => {
      tabManager.activateNextTab();
    });
    ipcRenderer.on('shortcut-prev-tab', () => {
      tabManager.activatePrevTab();
    });
    ipcRenderer.on('shortcut-reload-tab', () => {
      tabManager.reloadActiveTab();
    });
    ipcRenderer.on('shortcut-show-info', () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.invoke('show-app-info');
      } else if (typeof ipcRenderer !== 'undefined') {
        ipcRenderer.invoke('show-app-info');
      }
    });
    ipcRenderer.on('open-about-tab', (aboutUrl) => {
      tabManager.createTab(aboutUrl);
    });

    // Usage stats management
    // Feature inspired by Joshua Wang's Grok Usage Watch extension
    // https://github.com/JoshuaWang2211 - Thanks for your contribution!
    const usageStats = {
      isActive: false,
      refreshInterval: null,
      statusBar: null,
      button: null,
      grok4Hidden: false,
      
      init() {
        this.statusBar = document.getElementById('usage-status-bar');
        this.button = document.getElementById('usage-btn');
        
        if (this.button) {
          this.button.addEventListener('click', () => this.toggle());
        }
        
        // Load usage bar visibility preference
        try {
          this.isActive = localStorage.getItem('grokDesktopUsageBarActive') === 'true';
        } catch (e) {}
        
        // Apply saved state on startup
        if (this.isActive) {
          this.button.classList.add('active');
          this.statusBar.classList.add('active');
          document.body.classList.add('usage-bar-active');
          this.fetchStats();
          this.refreshInterval = setInterval(() => this.fetchStats(), 5000);
        }
        
        // Load Grok 4 visibility preference
        try {
          this.grok4Hidden = localStorage.getItem('grokDesktopHideGrok4') === 'true';
        } catch (e) {}
        
        // Set up Grok 4 toggle
        const grok4Toggle = document.getElementById('usage-grok4-toggle');
        const grok4Container = document.getElementById('usage-grok4-container');
        if (grok4Toggle && grok4Container) {
          this.applyGrok4Visibility();
          grok4Toggle.addEventListener('click', () => this.toggleGrok4());
        }
      },
      
      toggleGrok4() {
        this.grok4Hidden = !this.grok4Hidden;
        try {
          localStorage.setItem('grokDesktopHideGrok4', this.grok4Hidden);
        } catch (e) {}
        this.applyGrok4Visibility();
      },
      
      applyGrok4Visibility() {
        const grok4Toggle = document.getElementById('usage-grok4-toggle');
        const grok4Container = document.getElementById('usage-grok4-container');
        if (this.grok4Hidden) {
          grok4Container.classList.add('hidden-stat');
          grok4Toggle.classList.add('hidden');
        } else {
          grok4Container.classList.remove('hidden-stat');
          grok4Toggle.classList.remove('hidden');
        }
      },
      
      toggle() {
        this.isActive = !this.isActive;
        
        // Save state to localStorage
        try {
          localStorage.setItem('grokDesktopUsageBarActive', this.isActive);
        } catch (e) {}
        
        if (this.isActive) {
          this.button.classList.add('active');
          this.statusBar.classList.add('active');
          document.body.classList.add('usage-bar-active');
          this.fetchStats();
          // Refresh every 5 seconds when active
          this.refreshInterval = setInterval(() => this.fetchStats(), 5000);
        } else {
          this.button.classList.remove('active');
          this.statusBar.classList.remove('active');
          document.body.classList.remove('usage-bar-active');
          if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
          }
        }
      },
      
      async fetchStats() {
        try {
          const data = await ipcRenderer.invoke('fetch-grok-rate-limits', tabManager.tabs.find(tab => tab.id === tabManager.activeTabId)?.webview.getWebContentsId());
          this.updateDisplay(data);
        } catch (error) {
          this.showError();
        }
      },
      
      updateDisplay(data) {
        const lowEffortEl = document.getElementById('usage-low-effort');
        const highEffortEl = document.getElementById('usage-high-effort');
        const grok4HeavyEl = document.getElementById('usage-grok4-heavy');
        const refillContainer = document.getElementById('usage-refill-container');
        const refillEl = document.getElementById('usage-refill');

        [lowEffortEl, highEffortEl, grok4HeavyEl].forEach(el => el.classList.remove('warning', 'critical'));
        if (!data || data.error || data.DEFAULT?.error) {
          lowEffortEl.textContent = data?.DEFAULT?.error === 'UNAUTHORIZED' ? 'Login required' : 'Unavailable';
          highEffortEl.textContent = '--';
          grok4HeavyEl.textContent = '--';
          refillContainer.style.display = 'none';
          return;
        }
        
        // Low Effort
        const lowRemaining = data.DEFAULT?.lowEffortRateLimits?.remainingQueries ?? '--';
        const totalTokens = data.DEFAULT?.totalTokens ?? null;
        if (lowRemaining !== '--' && totalTokens) {
          lowEffortEl.textContent = `${lowRemaining} / ${totalTokens}`;
          this.applyWarningClass(lowEffortEl, lowRemaining, totalTokens);
        } else {
          lowEffortEl.textContent = lowRemaining;
        }
        
        // High Effort
        const highRemaining = data.DEFAULT?.highEffortRateLimits?.remainingQueries ?? '--';
        const highCost = data.DEFAULT?.highEffortRateLimits?.cost ?? null;
        if (highRemaining !== '--' && totalTokens && highCost) {
          const highTotal = Math.floor(totalTokens / highCost);
          highEffortEl.textContent = `${highRemaining} / ${highTotal}`;
          this.applyWarningClass(highEffortEl, highRemaining, highTotal);
        } else {
          highEffortEl.textContent = highRemaining;
        }
        
        // Grok 4 Heavy
        const grok4Remaining = data.GROK4HEAVY?.remainingQueries ?? '--';
        const grok4Total = data.GROK4HEAVY?.totalQueries ?? null;
        if (grok4Remaining !== '--' && grok4Total) {
          grok4HeavyEl.textContent = `${grok4Remaining} / ${grok4Total}`;
          this.applyWarningClass(grok4HeavyEl, grok4Remaining, grok4Total);
        } else {
          grok4HeavyEl.textContent = grok4Remaining;
        }
        
        // Refill time
        const lowWait = data.DEFAULT?.lowEffortRateLimits?.waitTimeSeconds ?? 0;
        const highWait = data.DEFAULT?.highEffortRateLimits?.waitTimeSeconds ?? 0;
        const maxWait = Math.max(lowWait, highWait);
        
        if (maxWait > 0) {
          refillContainer.style.display = 'flex';
          refillEl.textContent = this.formatTime(maxWait);
        } else {
          refillContainer.style.display = 'none';
        }
      },
      
      applyWarningClass(element, remaining, total) {
        element.classList.remove('warning', 'critical');
        if (typeof remaining === 'number' && typeof total === 'number' && total > 0) {
          const ratio = remaining / total;
          if (ratio <= 0.1) {
            element.classList.add('critical');
          } else if (ratio <= 0.25) {
            element.classList.add('warning');
          }
        }
      },
      
      formatTime(seconds) {
        if (!seconds || seconds <= 0) return '';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes > 0) {
          return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
      },
      
      showError() {
        document.getElementById('usage-low-effort').textContent = 'Error';
        document.getElementById('usage-high-effort').textContent = '--';
        document.getElementById('usage-grok4-heavy').textContent = '--';
        document.getElementById('usage-refill-container').style.display = 'none';
      }
    };

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      tabManager.init();
      usageStats.init();
      // Click to open latest release page
      const indicator = document.getElementById('update-indicator');
      if (indicator) {
        indicator.addEventListener('click', () => {
          const url = latestReleaseUrl || 'https://github.com/AnRkey/Grok-Desktop/releases/latest';
          if (window.ipcRenderer) {
            window.ipcRenderer.invoke('open-external-url', url);
          } else if (typeof ipcRenderer !== 'undefined') {
            ipcRenderer.invoke('open-external-url', url);
          }
        });
      }
      const updateBtn = document.getElementById('update-btn');
      if (updateBtn) {
        updateBtn.addEventListener('click', () => {
          const url = latestReleaseUrl || 'https://github.com/AnRkey/Grok-Desktop/releases/latest';
          if (window.ipcRenderer) {
            window.ipcRenderer.invoke('open-external-url', url);
          } else if (typeof ipcRenderer !== 'undefined') {
            ipcRenderer.invoke('open-external-url', url);
          }
        });
      }
      const infoBtn = document.getElementById('info-btn');
      if (infoBtn) {
        infoBtn.addEventListener('click', () => {
          if (window.ipcRenderer) {
            window.ipcRenderer.invoke('show-app-info');
          } else if (typeof ipcRenderer !== 'undefined') {
            ipcRenderer.invoke('show-app-info');
          }
        });
      }
    });

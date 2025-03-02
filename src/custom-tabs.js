/**
 * A simple custom tabs implementation for Electron
 */
class CustomTabGroup {
  constructor(options = {}) {
    this.options = options;
    this.tabs = [];
    this.activeTab = null;
    this.tabsContainer = document.querySelector('.etabs-tabs');
    this.viewsContainer = document.querySelector('.etabs-views');
    
    if (!this.tabsContainer || !this.viewsContainer) {
      throw new Error('Required DOM elements not found');
    }
  }

  addTab(options = {}) {
    const tab = new CustomTab(this, options);
    this.tabs.push(tab);
    
    if (options.active || this.tabs.length === 1) {
      this.setActiveTab(tab);
    }
    
    return tab;
  }

  setActiveTab(tab) {
    if (this.activeTab) {
      this.activeTab.deactivate();
    }
    
    tab.activate();
    this.activeTab = tab;
  }

  removeTab(tab) {
    const index = this.tabs.indexOf(tab);
    if (index !== -1) {
      this.tabs.splice(index, 1);
      
      if (this.activeTab === tab) {
        if (this.tabs.length > 0) {
          this.setActiveTab(this.tabs[Math.max(0, index - 1)]);
        } else {
          this.activeTab = null;
        }
      }
      
      tab.destroy();
    }
  }
}

class CustomTab {
  constructor(tabGroup, options = {}) {
    this.tabGroup = tabGroup;
    this.title = options.title || 'New Tab';
    this.src = options.src || '';
    this.webviewAttributes = options.webviewAttributes || {};
    
    this.element = document.createElement('div');
    this.element.classList.add('etabs-tab');
    this.element.innerHTML = `
      <div class="etabs-tab-title">${this.title}</div>
      <div class="etabs-tab-buttons">
        <button class="etabs-tab-button-close">×</button>
      </div>
    `;
    
    this.view = document.createElement('div');
    this.view.classList.add('etabs-view');
    
    this.webview = document.createElement('webview');
    this.webview.src = this.src;
    
    // Apply webview attributes
    for (const [key, value] of Object.entries(this.webviewAttributes)) {
      this.webview.setAttribute(key, value);
    }
    
    this.view.appendChild(this.webview);
    
    // Add to DOM
    this.tabGroup.tabsContainer.appendChild(this.element);
    this.tabGroup.viewsContainer.appendChild(this.view);
    
    // Set up event listeners
    this.element.addEventListener('click', () => {
      this.tabGroup.setActiveTab(this);
    });
    
    this.element.querySelector('.etabs-tab-button-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.tabGroup.removeTab(this);
    });
  }

  setTitle(title) {
    this.title = title;
    this.element.querySelector('.etabs-tab-title').textContent = title;
  }

  activate() {
    this.element.classList.add('active');
    this.view.classList.add('active');
  }

  deactivate() {
    this.element.classList.remove('active');
    this.view.classList.remove('active');
  }

  destroy() {
    this.element.remove();
    this.view.remove();
  }
}

module.exports = { CustomTabGroup, CustomTab }; 
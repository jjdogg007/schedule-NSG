// Main Application Controller
class ScheduleApp {
    constructor() {
        this.currentView = 'schedule';
        this.isInitialized = false;
        this.notifications = [];
        
        // Initialize after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        try {
            // Set up global error handling
            this.setupErrorHandling();
            
            // Initialize notification system
            this.initializeNotifications();
            
            // Set up navigation
            this.setupNavigation();
            
            // Set up PWA features
            this.setupPWA();
            
            // Set up mobile features
            this.setupMobileFeatures();
            
            // Initialize default view
            this.showView('schedule');
            
            // Start background tasks
            this.startBackgroundTasks();
            
            this.isInitialized = true;
            console.log('Schedule NSG App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showNotification('Failed to initialize application', 'error');
        }
    }
    
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showNotification('An unexpected error occurred', 'error');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showNotification('A background operation failed', 'error');
        });
    }
    
    initializeNotifications() {
        // Create notification container if it doesn't exist
        let container = Utils.$('#notification-system');
        if (!container) {
            container = Utils.createElement('div', { id: 'notification-system' });
            document.body.appendChild(container);
        }
        
        // Set up global notification function
        window.showNotification = (message, type = 'info', duration = 5000) => {
            this.showNotification(message, type, duration);
        };
    }
    
    setupNavigation() {
        // Add click handlers to navigation items
        Utils.$$('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                if (view) {
                    this.showView(view);
                }
            });
        });
        
        // Set up mobile navigation if needed
        if (Utils.isMobile()) {
            this.setupMobileNavigation();
        }
    }
    
    setupMobileNavigation() {
        // Add mobile-specific navigation handlers
        const navItems = Utils.$$('.nav-item');
        navItems.forEach(item => {
            // Add haptic feedback simulation
            item.addEventListener('touchstart', () => {
                item.classList.add('haptic-feedback');
                setTimeout(() => item.classList.remove('haptic-feedback'), 100);
            });
        });
    }
    
    setupPWA() {
        // Register service worker if available
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered successfully');
                })
                .catch(error => {
                    console.log('Service Worker registration failed');
                });
        }
        
        // Handle install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallPrompt();
        });
        
        // Handle app install
        window.addEventListener('appinstalled', () => {
            this.showNotification('App installed successfully!', 'success');
        });
    }
    
    setupMobileFeatures() {
        if (Utils.isMobile()) {
            // Add mobile quick actions
            this.createMobileQuickActions();
            
            // Set up touch gestures
            this.setupTouchGestures();
            
            // Add mobile-specific wellness features
            this.setupMobileWellness();
        }
    }
    
    createMobileQuickActions() {
        const quickActions = Utils.createElement('div', {
            className: 'mobile-quick-actions',
            innerHTML: `
                <button class="quick-action-btn" onclick="scheduleApp.quickWellnessCheckin()">💚</button>
                <button class="quick-action-btn" onclick="scheduleApp.quickScheduleView()">📅</button>
                <button class="quick-action-btn" onclick="scheduleApp.quickSync()">🔄</button>
            `
        });
        
        document.body.appendChild(quickActions);
    }
    
    setupTouchGestures() {
        // Add swipe gestures for navigation
        let startX, startY, startTime;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });
        
        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            
            const diffX = endX - startX;
            const diffY = endY - startY;
            const diffTime = endTime - startTime;
            
            // Check if it's a swipe (not a tap)
            if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100 && diffTime < 300) {
                if (diffX > 0) {
                    // Swipe right - previous view
                    this.navigateViews(-1);
                } else {
                    // Swipe left - next view
                    this.navigateViews(1);
                }
            }
            
            startX = startY = null;
        });
    }
    
    setupMobileWellness() {
        // Create quick wellness check-in for mobile
        const quickCheckin = Utils.createElement('div', {
            className: 'wellness-quick-checkin',
            innerHTML: `
                <button onclick="scheduleApp.quickMoodLog('😫')">😫</button>
                <button onclick="scheduleApp.quickMoodLog('😔')">😔</button>
                <button onclick="scheduleApp.quickMoodLog('😐')">😐</button>
                <button onclick="scheduleApp.quickMoodLog('😊')">😊</button>
                <button onclick="scheduleApp.quickMoodLog('😄')">😄</button>
            `
        });
        
        // Only show on wellness or employee views
        document.addEventListener('viewchange', (e) => {
            if (['wellness', 'employee'].includes(e.detail.view)) {
                document.body.appendChild(quickCheckin);
            } else {
                quickCheckin.remove();
            }
        });
    }
    
    showView(viewName) {
        // Hide all views
        Utils.$$('.view-container').forEach(view => {
            view.classList.remove('active');
        });
        
        // Remove active class from all nav items
        Utils.$$('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Show selected view
        const targetView = Utils.$(`#${viewName}-view`);
        const targetNav = Utils.$(`[data-view="${viewName}"]`);
        
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
        }
        
        if (targetNav) {
            targetNav.classList.add('active');
        }
        
        // Trigger view-specific initialization
        this.initializeView(viewName);
        
        // Dispatch view change event
        document.dispatchEvent(new CustomEvent('viewchange', {
            detail: { view: viewName, previousView: this.currentView }
        }));
        
        // Update URL without page reload
        if (history.pushState) {
            history.pushState(null, null, `#${viewName}`);
        }
    }
    
    initializeView(viewName) {
        switch (viewName) {
            case 'calendar':
                if (window.calendarIntegration && window.calendarIntegration.isInitialized) {
                    window.calendarIntegration.renderCalendarView();
                }
                break;
            case 'wellness':
                if (window.wellnessHub && window.wellnessHub.isInitialized) {
                    window.wellnessHub.renderWellnessView();
                }
                break;
            case 'schedule':
                this.initializeScheduleView();
                break;
            case 'employee':
                this.initializeEmployeePortal();
                break;
            case 'admin':
                this.initializeAdminView();
                break;
        }
    }
    
    initializeScheduleView() {
        // Initialize or update the schedule view
        // This would integrate with the existing schedule functionality
        console.log('Initializing schedule view');
    }
    
    initializeEmployeePortal() {
        // Initialize employee portal
        console.log('Initializing employee portal');
    }
    
    initializeAdminView() {
        // Initialize admin dashboard
        console.log('Initializing admin view');
    }
    
    navigateViews(direction) {
        const views = ['schedule', 'calendar', 'wellness', 'employee', 'admin'];
        const currentIndex = views.indexOf(this.currentView);
        let newIndex = currentIndex + direction;
        
        if (newIndex < 0) newIndex = views.length - 1;
        if (newIndex >= views.length) newIndex = 0;
        
        this.showView(views[newIndex]);
    }
    
    showNotification(message, type = 'info', duration = 5000) {
        const notification = Utils.createElement('div', {
            className: `notification ${type}`,
            innerHTML: `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${message}</span>
                    <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">×</button>
                </div>
            `
        });
        
        const container = Utils.$('#notification-system');
        container.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
        
        // Add to notifications array
        this.notifications.push({
            id: Utils.generateId('notification'),
            message,
            type,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(-50);
        }
    }
    
    showInstallPrompt() {
        const installButton = Utils.createElement('button', {
            className: 'btn btn-primary',
            textContent: '📱 Install App',
            onclick: () => this.installApp()
        });
        
        // Add to navigation or show as notification
        this.showNotification('Install this app for the best experience!', 'info', 10000);
    }
    
    async installApp() {
        if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            const { outcome } = await window.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                this.showNotification('App installation started!', 'success');
            }
            
            window.deferredPrompt = null;
        }
    }
    
    // Quick action methods for mobile
    quickWellnessCheckin() {
        this.showView('wellness');
        // Focus on check-in form
        setTimeout(() => {
            const checkinForm = Utils.$('.wellness-checkin');
            if (checkinForm) {
                checkinForm.scrollIntoView({ behavior: 'smooth' });
            }
        }, 300);
    }
    
    quickScheduleView() {
        this.showView('schedule');
    }
    
    async quickSync() {
        this.showNotification('Syncing calendars...', 'info');
        
        try {
            if (window.calendarIntegration) {
                await window.calendarIntegration.syncAllCalendars();
            }
            this.showNotification('Sync completed!', 'success');
        } catch (error) {
            this.showNotification('Sync failed', 'error');
        }
    }
    
    quickMoodLog(mood) {
        // Log mood quickly
        const moodValues = { '😫': 1, '😔': 2, '😐': 3, '😊': 4, '😄': 5 };
        const moodValue = moodValues[mood];
        
        if (window.wellnessHub) {
            // This would be a simplified mood logging
            console.log(`Quick mood logged: ${mood} (${moodValue})`);
            this.showNotification(`Mood logged: ${mood}`, 'success', 2000);
        }
    }
    
    startBackgroundTasks() {
        // Start periodic tasks
        setInterval(() => {
            this.performBackgroundSync();
        }, 300000); // Every 5 minutes
        
        setInterval(() => {
            this.checkForUpdates();
        }, 3600000); // Every hour
    }
    
    async performBackgroundSync() {
        if (!navigator.onLine) return;
        
        try {
            // Sync calendar data
            if (window.calendarIntegration && 
                window.calendarIntegration.settings.syncFrequency === 'real-time') {
                await window.calendarIntegration.syncAllCalendars();
            }
            
            // Check wellness alerts
            if (window.wellnessHub) {
                window.wellnessHub.performAutomaticChecks();
            }
            
        } catch (error) {
            console.error('Background sync failed:', error);
        }
    }
    
    checkForUpdates() {
        // Check for app updates
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ command: 'CHECK_FOR_UPDATES' });
        }
    }
    
    // Handle URL hash changes for navigation
    handleHashChange() {
        const hash = window.location.hash.substr(1);
        const validViews = ['schedule', 'calendar', 'wellness', 'employee', 'admin'];
        
        if (validViews.includes(hash)) {
            this.showView(hash);
        }
    }
    
    // Export data functionality
    exportAllData() {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            schedule: Utils.getLocalStorage('schedule_data', {}),
            employees: Utils.getLocalStorage('employee_data', {}),
            calendar: Utils.getLocalStorage('calendar_settings', {}),
            wellness: Utils.getLocalStorage('wellness_data', {}),
            notifications: this.notifications
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schedule-nsg-backup-${Utils.formatDate(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Data exported successfully!', 'success');
    }
    
    // Import data functionality
    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.version && data.schedule) {
                // Restore data
                Utils.setLocalStorage('schedule_data', data.schedule);
                Utils.setLocalStorage('employee_data', data.employees || {});
                Utils.setLocalStorage('calendar_settings', data.calendar || {});
                Utils.setLocalStorage('wellness_data', data.wellness || {});
                
                // Reload modules
                if (window.calendarIntegration) {
                    window.calendarIntegration.loadSettings();
                    window.calendarIntegration.loadProviderStates();
                }
                
                if (window.wellnessHub) {
                    window.wellnessHub.loadWellnessData();
                    window.wellnessHub.loadSettings();
                }
                
                this.showNotification('Data imported successfully!', 'success');
                
                // Refresh current view
                this.initializeView(this.currentView);
                
            } else {
                throw new Error('Invalid backup file format');
            }
            
        } catch (error) {
            console.error('Import failed:', error);
            this.showNotification('Failed to import data', 'error');
        }
    }
}

// Global helper functions for backward compatibility
function openEmployeeModal() {
    console.log('Opening employee modal - legacy function');
    scheduleApp.showNotification('Employee management would open here', 'info');
}

function autoGenerateFullSchedule() {
    console.log('Auto-generating schedule - legacy function');
    scheduleApp.showNotification('Schedule generation would run here', 'info');
}

function findConflicts() {
    console.log('Finding conflicts - legacy function');
    scheduleApp.showNotification('Conflict detection would run here', 'info');
}

function syncAllCalendars() {
    if (window.calendarIntegration) {
        window.calendarIntegration.syncAllCalendars();
    }
}

function openCalendarSettings() {
    console.log('Opening calendar settings');
    scheduleApp.showNotification('Calendar settings would open here', 'info');
}

function openWellnessSettings() {
    console.log('Opening wellness settings');
    scheduleApp.showNotification('Wellness settings would open here', 'info');
}

function generateWellnessReport() {
    console.log('Generating wellness report');
    scheduleApp.showNotification('Wellness report would generate here', 'info');
}

function openReportsModal() {
    console.log('Opening reports modal');
    scheduleApp.showNotification('Reports would open here', 'info');
}

function showValidationResults() {
    console.log('Showing validation results');
    scheduleApp.showNotification('Schedule validation would run here', 'info');
}

// Handle hash changes for navigation
window.addEventListener('hashchange', () => {
    if (window.scheduleApp) {
        window.scheduleApp.handleHashChange();
    }
});

// Initialize the application
window.scheduleApp = new ScheduleApp();
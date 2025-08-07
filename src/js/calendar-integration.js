// Calendar Integration Module
class CalendarIntegration {
    constructor() {
        this.providers = {
            google: {
                name: 'Google Calendar',
                icon: '📅',
                connected: false,
                accessToken: null,
                refreshToken: null,
                lastSync: null,
                calendars: []
            },
            outlook: {
                name: 'Microsoft Outlook',
                icon: '📆',
                connected: false,
                accessToken: null,
                refreshToken: null,
                lastSync: null,
                calendars: []
            },
            apple: {
                name: 'Apple Calendar',
                icon: '🍎',
                connected: false,
                feedUrl: null,
                lastSync: null,
                calendars: []
            }
        };
        
        this.settings = {
            syncFrequency: 'real-time', // real-time, hourly, daily
            syncDirection: 'two-way', // one-way, two-way
            eventTypes: {
                work: true,
                pto: true,
                meetings: true,
                training: true,
                personal: false
            },
            conflictResolution: 'prompt', // auto-resolve, prompt, ignore
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            privacy: {
                shareDetails: true,
                shareLocation: false,
                shareAttendees: false
            }
        };
        
        this.conflicts = [];
        this.syncQueue = [];
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        this.loadSettings();
        this.loadProviderStates();
        this.setupEventListeners();
        this.renderCalendarView();
        this.startSyncScheduler();
        this.isInitialized = true;
    }
    
    loadSettings() {
        const savedSettings = Utils.getLocalStorage('calendar_settings', {});
        this.settings = { ...this.settings, ...savedSettings };
    }
    
    saveSettings() {
        Utils.setLocalStorage('calendar_settings', this.settings);
    }
    
    loadProviderStates() {
        const savedProviders = Utils.getLocalStorage('calendar_providers', {});
        Object.keys(savedProviders).forEach(provider => {
            if (this.providers[provider]) {
                this.providers[provider] = { ...this.providers[provider], ...savedProviders[provider] };
            }
        });
    }
    
    saveProviderStates() {
        Utils.setLocalStorage('calendar_providers', this.providers);
    }
    
    setupEventListeners() {
        // Navigation click handler
        document.addEventListener('click', (e) => {
            if (e.target.dataset.view === 'calendar') {
                this.renderCalendarView();
            }
        });
        
        // Settings form handler
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('calendar-setting')) {
                this.updateSetting(e.target.name, e.target.value, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
            }
        });
    }
    
    renderCalendarView() {
        const container = Utils.$('#calendar-view');
        if (!container) return;
        
        const integrationContainer = Utils.$('#calendar-integration-container');
        if (!integrationContainer) return;
        
        integrationContainer.innerHTML = `
            ${this.renderSyncStatus()}
            <div class="calendar-integration-container">
                ${this.renderProviders()}
                ${this.renderSettings()}
            </div>
            ${this.renderCalendarFeeds()}
            ${this.renderConflictDetection()}
        `;
        
        this.attachEventHandlers();
    }
    
    renderSyncStatus() {
        const lastSync = this.getLastSyncTime();
        const totalEvents = this.getTotalSyncedEvents();
        const pendingSync = this.syncQueue.length;
        
        return `
            <div class="sync-status-container">
                <div class="sync-status-header">
                    <h3>🔄 Calendar Sync Status</h3>
                    <button class="btn btn-primary" onclick="calendarIntegration.syncAllCalendars()">
                        Sync All Calendars
                    </button>
                </div>
                <div class="sync-metrics">
                    <div class="sync-metric">
                        <h4>${totalEvents}</h4>
                        <p>Events Synced</p>
                    </div>
                    <div class="sync-metric">
                        <h4>${pendingSync}</h4>
                        <p>Pending Changes</p>
                    </div>
                    <div class="sync-metric">
                        <h4>${lastSync}</h4>
                        <p>Last Sync</p>
                    </div>
                    <div class="sync-metric">
                        <h4>${this.conflicts.length}</h4>
                        <p>Active Conflicts</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderProviders() {
        return `
            <div class="calendar-providers">
                <h3>🔗 Calendar Providers</h3>
                ${Object.entries(this.providers).map(([key, provider]) => `
                    <div class="calendar-provider" data-provider="${key}">
                        <div class="calendar-provider-info">
                            <div class="calendar-provider-icon">${provider.icon}</div>
                            <div class="calendar-provider-details">
                                <h4>${provider.name}</h4>
                                <p>${provider.connected ? `Last synced: ${provider.lastSync || 'Never'}` : 'Not connected'}</p>
                            </div>
                        </div>
                        <div class="calendar-provider-status">
                            <span class="status-indicator ${provider.connected ? 'status-connected' : 'status-disconnected'}"></span>
                            <button class="btn ${provider.connected ? 'btn-danger' : 'btn-primary'}" 
                                    onclick="calendarIntegration.${provider.connected ? 'disconnect' : 'connect'}Provider('${key}')">
                                ${provider.connected ? 'Disconnect' : 'Connect'}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderSettings() {
        return `
            <div class="calendar-settings">
                <h3>⚙️ Sync Settings</h3>
                
                <div class="setting-group">
                    <h4>Sync Frequency</h4>
                    <div class="setting-item">
                        <label>Sync Frequency:</label>
                        <select name="syncFrequency" class="calendar-setting">
                            <option value="real-time" ${this.settings.syncFrequency === 'real-time' ? 'selected' : ''}>Real-time</option>
                            <option value="hourly" ${this.settings.syncFrequency === 'hourly' ? 'selected' : ''}>Hourly</option>
                            <option value="daily" ${this.settings.syncFrequency === 'daily' ? 'selected' : ''}>Daily</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>Sync Direction:</label>
                        <select name="syncDirection" class="calendar-setting">
                            <option value="one-way" ${this.settings.syncDirection === 'one-way' ? 'selected' : ''}>One-way (to calendar)</option>
                            <option value="two-way" ${this.settings.syncDirection === 'two-way' ? 'selected' : ''}>Two-way sync</option>
                        </select>
                    </div>
                </div>
                
                <div class="setting-group">
                    <h4>Event Types</h4>
                    ${Object.entries(this.settings.eventTypes).map(([type, enabled]) => `
                        <div class="setting-item">
                            <label>${Utils.capitalizeWords(type)} Schedules</label>
                            <div class="toggle-switch ${enabled ? 'active' : ''}" 
                                 onclick="calendarIntegration.toggleEventType('${type}')">
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="setting-group">
                    <h4>Privacy & Sharing</h4>
                    ${Object.entries(this.settings.privacy).map(([setting, enabled]) => `
                        <div class="setting-item">
                            <label>${Utils.capitalizeWords(setting.replace(/([A-Z])/g, ' $1'))}</label>
                            <div class="toggle-switch ${enabled ? 'active' : ''}" 
                                 onclick="calendarIntegration.togglePrivacySetting('${setting}')">
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderCalendarFeeds() {
        const baseUrl = window.location.origin;
        const feeds = [
            { name: 'Work Schedule Feed', url: `${baseUrl}/api/calendar/work-schedule.ics` },
            { name: 'PTO Calendar Feed', url: `${baseUrl}/api/calendar/pto.ics` },
            { name: 'Team Meetings Feed', url: `${baseUrl}/api/calendar/meetings.ics` },
            { name: 'Training Sessions Feed', url: `${baseUrl}/api/calendar/training.ics` }
        ];
        
        return `
            <div class="calendar-feeds">
                <h3>📊 Calendar Subscription Feeds</h3>
                <p>Use these read-only calendar URLs to subscribe in any calendar app:</p>
                ${feeds.map(feed => `
                    <div class="feed-item">
                        <label>${feed.name}:</label>
                        <input type="text" value="${feed.url}" readonly onclick="this.select()">
                        <button class="btn btn-secondary" onclick="calendarIntegration.copyFeedUrl('${feed.url}')">
                            📋 Copy
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderConflictDetection() {
        if (this.conflicts.length === 0) {
            return `
                <div class="conflict-detection" style="background: #d4edda; border-color: #c3e6cb;">
                    <h3 style="color: #155724;">✅ No Calendar Conflicts</h3>
                    <p>All calendar events are properly synchronized without conflicts.</p>
                </div>
            `;
        }
        
        return `
            <div class="conflict-detection">
                <h3>⚠️ Calendar Conflicts Detected</h3>
                <div class="conflict-list">
                    ${this.conflicts.map(conflict => `
                        <div class="conflict-item">
                            <div class="conflict-details">
                                <h4>${conflict.title}</h4>
                                <p>${conflict.description}</p>
                            </div>
                            <div class="conflict-actions">
                                <button class="btn btn-warning btn-sm" onclick="calendarIntegration.resolveConflict('${conflict.id}', 'work')">
                                    Keep Work
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="calendarIntegration.resolveConflict('${conflict.id}', 'personal')">
                                    Keep Personal
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="calendarIntegration.resolveConflict('${conflict.id}', 'ignore')">
                                    Ignore
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    attachEventHandlers() {
        // Handle provider connection buttons
        Utils.$$('.calendar-provider button').forEach(button => {
            button.removeEventListener('click', this.handleProviderButton);
            button.addEventListener('click', this.handleProviderButton.bind(this));
        });
        
        // Handle toggle switches
        Utils.$$('.toggle-switch').forEach(toggle => {
            toggle.removeEventListener('click', this.handleToggle);
            toggle.addEventListener('click', this.handleToggle.bind(this));
        });
    }
    
    handleProviderButton(e) {
        e.preventDefault();
        const provider = e.target.closest('.calendar-provider').dataset.provider;
        const isConnected = this.providers[provider].connected;
        
        if (isConnected) {
            this.disconnectProvider(provider);
        } else {
            this.connectProvider(provider);
        }
    }
    
    handleToggle(e) {
        const toggle = e.target;
        toggle.classList.toggle('active');
    }
    
    async connectProvider(provider) {
        try {
            switch (provider) {
                case 'google':
                    await this.connectGoogleCalendar();
                    break;
                case 'outlook':
                    await this.connectOutlookCalendar();
                    break;
                case 'apple':
                    await this.connectAppleCalendar();
                    break;
            }
            
            this.providers[provider].connected = true;
            this.providers[provider].lastSync = new Date().toISOString();
            this.saveProviderStates();
            this.renderCalendarView();
            
            this.showNotification(`${this.providers[provider].name} connected successfully!`, 'success');
        } catch (error) {
            console.error(`Failed to connect ${provider}:`, error);
            this.showNotification(`Failed to connect ${this.providers[provider].name}`, 'error');
        }
    }
    
    async disconnectProvider(provider) {
        try {
            this.providers[provider].connected = false;
            this.providers[provider].accessToken = null;
            this.providers[provider].refreshToken = null;
            this.providers[provider].calendars = [];
            this.saveProviderStates();
            this.renderCalendarView();
            
            this.showNotification(`${this.providers[provider].name} disconnected`, 'info');
        } catch (error) {
            console.error(`Failed to disconnect ${provider}:`, error);
        }
    }
    
    async connectGoogleCalendar() {
        // Simulate OAuth flow for demo
        return new Promise((resolve) => {
            setTimeout(() => {
                this.providers.google.accessToken = 'demo_google_token';
                this.providers.google.calendars = [
                    { id: 'primary', name: 'Primary Calendar', selected: true },
                    { id: 'work', name: 'Work Calendar', selected: true }
                ];
                resolve();
            }, 1000);
        });
    }
    
    async connectOutlookCalendar() {
        // Simulate OAuth flow for demo
        return new Promise((resolve) => {
            setTimeout(() => {
                this.providers.outlook.accessToken = 'demo_outlook_token';
                this.providers.outlook.calendars = [
                    { id: 'calendar', name: 'Calendar', selected: true },
                    { id: 'work', name: 'Work Calendar', selected: true }
                ];
                resolve();
            }, 1000);
        });
    }
    
    async connectAppleCalendar() {
        // Apple Calendar uses CalDAV - simulate setup
        return new Promise((resolve) => {
            setTimeout(() => {
                this.providers.apple.feedUrl = 'https://caldav.icloud.com/published/demo';
                this.providers.apple.calendars = [
                    { id: 'home', name: 'Home', selected: true },
                    { id: 'work', name: 'Work', selected: true }
                ];
                resolve();
            }, 1000);
        });
    }
    
    async syncAllCalendars() {
        this.showNotification('Starting calendar sync...', 'info');
        
        const connectedProviders = Object.keys(this.providers).filter(
            provider => this.providers[provider].connected
        );
        
        for (const provider of connectedProviders) {
            await this.syncProvider(provider);
        }
        
        this.detectConflicts();
        this.renderCalendarView();
        this.showNotification('Calendar sync completed!', 'success');
    }
    
    async syncProvider(provider) {
        const providerData = this.providers[provider];
        
        try {
            // Get schedule data from the main schedule system
            const scheduleData = this.getScheduleData();
            
            // Sync to provider
            await this.pushEventsToProvider(provider, scheduleData);
            
            // If two-way sync, pull events from provider
            if (this.settings.syncDirection === 'two-way') {
                await this.pullEventsFromProvider(provider);
            }
            
            providerData.lastSync = new Date().toISOString();
            this.saveProviderStates();
            
        } catch (error) {
            console.error(`Sync failed for ${provider}:`, error);
            throw error;
        }
    }
    
    getScheduleData() {
        // Get data from the main schedule system
        // This would integrate with the existing schedule data
        return {
            workShifts: [],
            ptoRequests: [],
            meetings: [],
            training: []
        };
    }
    
    async pushEventsToProvider(provider, scheduleData) {
        // Simulate pushing events to calendar provider
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`Pushed events to ${provider}:`, scheduleData);
                resolve();
            }, 500);
        });
    }
    
    async pullEventsFromProvider(provider) {
        // Simulate pulling events from calendar provider
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`Pulled events from ${provider}`);
                resolve();
            }, 500);
        });
    }
    
    detectConflicts() {
        // Simulate conflict detection
        this.conflicts = [
            {
                id: Utils.generateId('conflict'),
                title: 'Personal Appointment vs Work Shift',
                description: 'Doctor appointment conflicts with scheduled work shift on March 15th, 2:00 PM',
                type: 'schedule_conflict',
                date: '2024-03-15',
                workEvent: { title: 'Work Shift', time: '2:00 PM - 10:00 PM' },
                personalEvent: { title: 'Doctor Appointment', time: '2:00 PM - 3:00 PM' }
            }
        ];
    }
    
    resolveConflict(conflictId, resolution) {
        const conflictIndex = this.conflicts.findIndex(c => c.id === conflictId);
        if (conflictIndex === -1) return;
        
        const conflict = this.conflicts[conflictIndex];
        
        switch (resolution) {
            case 'work':
                // Keep work event, remove personal event
                this.showNotification('Kept work event, removed personal event', 'info');
                break;
            case 'personal':
                // Keep personal event, remove work event
                this.showNotification('Kept personal event, removed work event', 'warning');
                break;
            case 'ignore':
                // Ignore conflict
                this.showNotification('Conflict ignored', 'info');
                break;
        }
        
        this.conflicts.splice(conflictIndex, 1);
        this.renderCalendarView();
    }
    
    toggleEventType(type) {
        this.settings.eventTypes[type] = !this.settings.eventTypes[type];
        this.saveSettings();
        this.renderCalendarView();
    }
    
    togglePrivacySetting(setting) {
        this.settings.privacy[setting] = !this.settings.privacy[setting];
        this.saveSettings();
        this.renderCalendarView();
    }
    
    updateSetting(name, value) {
        this.settings[name] = value;
        this.saveSettings();
    }
    
    copyFeedUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.showNotification('Calendar feed URL copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy URL', 'error');
        });
    }
    
    getLastSyncTime() {
        const lastSyncs = Object.values(this.providers)
            .map(p => p.lastSync)
            .filter(s => s)
            .sort()
            .reverse();
        
        if (lastSyncs.length === 0) return 'Never';
        
        const lastSync = new Date(lastSyncs[0]);
        const now = new Date();
        const diffMinutes = Math.floor((now - lastSync) / 60000);
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
        return Utils.formatDate(lastSync);
    }
    
    getTotalSyncedEvents() {
        return Object.values(this.providers)
            .reduce((total, provider) => total + (provider.calendars?.length || 0), 0) * 10;
    }
    
    startSyncScheduler() {
        // Set up automatic sync based on frequency setting
        const intervals = {
            'real-time': 60000, // 1 minute for demo
            'hourly': 3600000,  // 1 hour
            'daily': 86400000   // 24 hours
        };
        
        const interval = intervals[this.settings.syncFrequency] || intervals['hourly'];
        
        setInterval(() => {
            if (Object.values(this.providers).some(p => p.connected)) {
                this.syncAllCalendars();
            }
        }, interval);
    }
    
    showNotification(message, type = 'info') {
        // Use the existing notification system or create a simple one
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Initialize calendar integration
window.calendarIntegration = new CalendarIntegration();
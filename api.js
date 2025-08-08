// api.js - Handles Supabase and data logic
// Provides clean separation between data management and UI

export class ApiManager {
    constructor() {
        this.uiManager = null;
        this.isOnline = navigator.onLine;
        this.supabaseClient = null;
        this.syncQueue = JSON.parse(localStorage.getItem('syncQueue')) || [];
        
        // Supabase configuration
        this.supabaseUrl = "https://ulefvfpvgfdavztlwmpu.supabase.co";
        this.supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZWZ2ZnB2Z2ZkYXZ6dGx3bXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTIzMDksImV4cCI6MjA3MDA2ODMwOX0.Se8nQg3BZUAYnt3bahw7iNePXm8G3X5PbH83XHY8edo";
        
        this.initializeSupabase();
        this.setupConnectionListeners();

        // Start periodic online check
        this.checkOnlineStatus(); // Initial check
        setInterval(() => this.checkOnlineStatus(), 10000); // Check every 10 seconds
    }

    async initializeSupabase() {
        try {
            if (typeof supabase !== 'undefined') {
                this.supabaseClient = supabase.createClient(this.supabaseUrl, this.supabaseKey);
                console.log('Supabase client initialized successfully');
                
                // Test connection and sync if online
                if (this.isOnline) {
                    await this.syncPendingChanges();
                }
            } else {
                console.warn('Supabase library not available, using localStorage only');
            }
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            this.supabaseClient = null;
        }
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager;
        if (this.uiManager) {
            this.uiManager.updateConnectionStatus(this.isOnline);
        }
    }

    async checkOnlineStatus() {
        console.log('Running online status check at', new Date().toLocaleTimeString());
        try {
            // Fetch a small, non-cached resource to be sure.
            const response = await fetch('https://httpbin.org/get?d=' + Date.now(), {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }

            if (!this.isOnline) {
                console.log('Connection restored - syncing data...');
                this.isOnline = true;
                if (this.uiManager) this.uiManager.updateConnectionStatus(true);
                this.syncPendingChanges();
            }
        } catch (error) {
            if (this.isOnline) {
                console.log('Connection lost - switching to offline mode');
                this.isOnline = false;
                if (this.uiManager) this.uiManager.updateConnectionStatus(false);
            }
        }
    }

    setupConnectionListeners() {
        // These listeners provide immediate feedback but are verified by checkOnlineStatus
        window.addEventListener('online', () => this.checkOnlineStatus());
        window.addEventListener('offline', () => {
            console.log("Offline event triggered!");
            this.isOnline = false;
            if (this.uiManager) this.uiManager.updateConnectionStatus(false);
        });
    }

    async loadEmployeeData() {
        try {
            // Try to load from Supabase first (source of truth)
            if (this.isOnline && this.supabaseClient) {
                return await this.loadFromSupabase();
            } else {
                // Fall back to localStorage
                return this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('Error loading employee data:', error);
            return this.loadFromLocalStorage();
        }
    }

    async loadFromSupabase() {
        try {
            const { data: employeesData, error: employeesError } = await this.supabaseClient
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });

            if (employeesError) throw employeesError;

            const { data: auditData, error: auditError } = await this.supabaseClient
                .from('audit_log')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(100);

            if (auditError) throw auditError;

            // Update localStorage cache
            localStorage.setItem('employees', JSON.stringify(employeesData || []));
            localStorage.setItem('auditLog', JSON.stringify(auditData || []));

            this.updateLastSavedIndicator('Synced with cloud');

            return {
                employees: employeesData || [],
                auditLog: auditData || []
            };
        } catch (error) {
            console.error('Failed to load from Supabase:', error);
            throw error;
        }
    }

    loadFromLocalStorage() {
        console.log('Loading data from localStorage');
        const employees = JSON.parse(localStorage.getItem('employees')) || [];
        const auditLog = JSON.parse(localStorage.getItem('auditLog')) || [];
        
        this.updateLastSavedIndicator('Offline mode');
        
        return { employees, auditLog };
    }

    async saveEmployeeData(employees, auditLog) {
        // Always save to localStorage first
        localStorage.setItem('employees', JSON.stringify(employees));
        localStorage.setItem('auditLog', JSON.stringify(auditLog));

        // If online, sync to Supabase
        if (this.isOnline && this.supabaseClient) {
            try {
                await this.syncToSupabase(employees, auditLog);
                this.updateLastSavedIndicator('Saved to cloud');
            } catch (error) {
                console.error('Failed to sync to Supabase:', error);
                this.addToSyncQueue({ employees, auditLog });
                this.updateLastSavedIndicator('Saved locally, will sync later');
            }
        } else {
            this.addToSyncQueue({ employees, auditLog });
            this.updateLastSavedIndicator('Saved locally');
        }
    }

    async syncToSupabase(employees, auditLog) {
        // Sync employees
        for (const employee of employees) {
            const { error } = await this.supabaseClient
                .from('employees')
                .upsert(employee, { onConflict: 'id' });
            
            if (error) throw error;
        }

        // Sync audit log
        for (const logEntry of auditLog) {
            const { error } = await this.supabaseClient
                .from('audit_log')
                .upsert(logEntry, { onConflict: 'id' });
            
            if (error) throw error;
        }

        console.log('Successfully synced to Supabase');
    }

    addToSyncQueue(data) {
        this.syncQueue.push({
            timestamp: new Date().toISOString(),
            data
        });
        localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    }

    async syncPendingChanges() {
        if (!this.isOnline || !this.supabaseClient || this.syncQueue.length === 0) {
            return;
        }

        console.log(`Syncing ${this.syncQueue.length} pending changes...`);

        const successfulSyncs = [];
        
        for (const queueItem of this.syncQueue) {
            try {
                await this.syncToSupabase(queueItem.data.employees, queueItem.data.auditLog);
                successfulSyncs.push(queueItem);
            } catch (error) {
                console.error('Failed to sync queue item:', error);
                break; // Stop on first failure to maintain order
            }
        }

        // Remove successfully synced items
        this.syncQueue = this.syncQueue.filter(item => !successfulSyncs.includes(item));
        localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));

        if (successfulSyncs.length > 0) {
            this.updateLastSavedIndicator(`Synced ${successfulSyncs.length} changes`);
        }
    }

    updateLastSavedIndicator(message) {
        const indicator = document.getElementById('last-saved-indicator');
        if (indicator) {
            indicator.textContent = message;
            indicator.title = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    }

    generateId() {
        return 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateAuditId() {
        return 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    createAuditEntry(action, details, userId = 'system') {
        return {
            id: this.generateAuditId(),
            timestamp: new Date().toISOString(),
            userId,
            action,
            details,
            userAgent: navigator.userAgent.substring(0, 100) // Truncate for storage
        };
    }

    // Validation functions
    validateEmployee(employeeData) {
        const errors = [];
        
        if (!employeeData.name || employeeData.name.trim().length < 1) {
            errors.push('Employee name is required');
        }
        
        if (employeeData.name && employeeData.name.length > 100) {
            errors.push('Employee name must be less than 100 characters');
        }
        
        if (employeeData.email && !this.isValidEmail(employeeData.email)) {
            errors.push('Invalid email format');
        }
        
        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
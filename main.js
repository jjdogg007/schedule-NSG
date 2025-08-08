// Main.js - Supabase integration with localStorage fallback
// Implements offline-first architecture with automatic sync

class ScheduleDataManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.supabaseClient = null;
        this.syncQueue = JSON.parse(localStorage.getItem('syncQueue')) || [];
        this.employees = [];
        this.auditLog = [];
        
        // Supabase configuration
        this.supabaseUrl = "https://ulefvfpvgfdavztlwmpu.supabase.co";
        this.supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZWZ2ZnB2Z2ZkYXZ6dGx3bXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTIzMDksImV4cCI6MjA3MDA2ODMwOX0.Se8nQg3BZUAYnt3bahw7iNePXm8G3X5PbH83XHY8edo";
        
        this.initializeSupabase();
        this.setupEventListeners();
        this.loadInitialData();
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

    setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Connection restored - syncing data...');
            this.syncPendingChanges();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Connection lost - switching to offline mode');
        });

        // UI Event listeners
        const addButton = document.getElementById('add-employee');
        const saveButton = document.getElementById('save-employees');
        const employeeNameInput = document.getElementById('employee-name');

        if (addButton) {
            addButton.addEventListener('click', () => this.addEmployee());
        }

        if (saveButton) {
            saveButton.addEventListener('click', () => this.bulkSaveEmployees());
        }

        if (employeeNameInput) {
            employeeNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addEmployee();
                }
            });
        }
    }

    async loadInitialData() {
        try {
            // Try to load from Supabase first (source of truth)
            if (this.isOnline && this.supabaseClient) {
                await this.loadFromSupabase();
            } else {
                // Fall back to localStorage
                this.loadFromLocalStorage();
            }
            
            this.renderEmployees();
            this.renderAuditLog();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.loadFromLocalStorage();
            this.renderEmployees();
            this.renderAuditLog();
        }
    }

    async loadFromSupabase() {
        try {
            // Load employees
            const { data: employeesData, error: employeesError } = await this.supabaseClient
                .from('employees')
                .select('*')
                 console.log('Fetched employees from Supabase:', employeesData, employeesError);
                .order('created_at', { ascending: true });

            if (employeesError) throw employeesError;

            // Load audit log
            const { data: auditData, error: auditError } = await this.supabaseClient
                .from('audit_log')
                .select('*')
                .order('timestamp', { ascending: false });

            if (auditError) throw auditError;

            this.employees = employeesData || [];
            this.auditLog = auditData || [];

            // Update localStorage cache
            localStorage.setItem('employees', JSON.stringify(this.employees));
            localStorage.setItem('auditLog', JSON.stringify(this.auditLog));

            console.log('Data loaded from Supabase successfully');
        } catch (error) {
            console.error('Error loading from Supabase:', error);
            throw error;
        }
    }

    loadFromLocalStorage() {
        this.employees = JSON.parse(localStorage.getItem('employees')) || [];
        this.auditLog = JSON.parse(localStorage.getItem('auditLog')) || [];
        console.log('Data loaded from localStorage');
    }

    async addEmployee() {
        const nameInput = document.getElementById('employee-name');
        const name = nameInput?.value?.trim();

        if (!name) {
            alert('Please enter an employee name');
            return;
        }

        const employee = {
            id: Date.now().toString(),
            name: name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            if (this.isOnline && this.supabaseClient) {
                // Save directly to Supabase
                const { data, error } = await this.supabaseClient
                    .from('employees')
                    .insert([employee])
                    .select();

                if (error) throw error;

                this.employees.push(data[0]);
                await this.addAuditEntry('employee_added', `Employee "${name}" was added`);
            } else {
                // Queue for sync when back online
                this.employees.push(employee);
                this.queueAction('add_employee', employee);
                await this.addAuditEntry('employee_added', `Employee "${name}" was added (offline)`);
            }

            // Update localStorage and UI
            localStorage.setItem('employees', JSON.stringify(this.employees));
            this.renderEmployees();
            nameInput.value = '';

        } catch (error) {
            console.error('Error adding employee:', error);
            // Fall back to offline mode
            this.employees.push(employee);
            this.queueAction('add_employee', employee);
            localStorage.setItem('employees', JSON.stringify(this.employees));
            this.renderEmployees();
            nameInput.value = '';
        }
    }

    async deleteEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        try {
            if (this.isOnline && this.supabaseClient) {
                // Delete from Supabase
                const { error } = await this.supabaseClient
                    .from('employees')
                    .delete()
                    .eq('id', employeeId);

                if (error) throw error;

                await this.addAuditEntry('employee_deleted', `Employee "${employee.name}" was deleted`);
            } else {
                // Queue for sync when back online
                this.queueAction('delete_employee', { id: employeeId });
                await this.addAuditEntry('employee_deleted', `Employee "${employee.name}" was deleted (offline)`);
            }

            // Update local data
            this.employees = this.employees.filter(emp => emp.id !== employeeId);
            localStorage.setItem('employees', JSON.stringify(this.employees));
            this.renderEmployees();

        } catch (error) {
            console.error('Error deleting employee:', error);
            // Fall back to offline mode
            this.employees = this.employees.filter(emp => emp.id !== employeeId);
            this.queueAction('delete_employee', { id: employeeId });
            localStorage.setItem('employees', JSON.stringify(this.employees));
            this.renderEmployees();
        }
    }

    async bulkSaveEmployees() {
        try {
            if (this.isOnline && this.supabaseClient) {
                // Bulk save to Supabase
                const { error } = await this.supabaseClient
                    .from('employees')
                    .upsert(this.employees);

                if (error) throw error;

                await this.addAuditEntry('bulk_save', `Bulk save of ${this.employees.length} employees completed`);
            } else {
                // Queue for sync when back online
                this.queueAction('bulk_save_employees', this.employees);
                await this.addAuditEntry('bulk_save', `Bulk save of ${this.employees.length} employees queued (offline)`);
            }

            // Update localStorage
            localStorage.setItem('employees', JSON.stringify(this.employees));
            alert('Employees saved successfully!');

        } catch (error) {
            console.error('Error bulk saving employees:', error);
            // Fall back to offline mode
            this.queueAction('bulk_save_employees', this.employees);
            localStorage.setItem('employees', JSON.stringify(this.employees));
            alert('Employees saved offline - will sync when connection is restored');
        }
    }

    async addAuditEntry(action, description) {
        const entry = {
            id: Date.now().toString(),
            action: action,
            description: description,
            timestamp: new Date().toISOString(),
            user: 'System' // Can be enhanced to track actual user
        };

        try {
            if (this.isOnline && this.supabaseClient) {
                const { data, error } = await this.supabaseClient
                    .from('audit_log')
                    .insert([entry])
                    .select();

                if (error) throw error;

                this.auditLog.unshift(data[0]);
            } else {
                this.auditLog.unshift(entry);
                this.queueAction('add_audit_entry', entry);
            }

            localStorage.setItem('auditLog', JSON.stringify(this.auditLog));
            this.renderAuditLog();

        } catch (error) {
            console.error('Error adding audit entry:', error);
            this.auditLog.unshift(entry);
            this.queueAction('add_audit_entry', entry);
            localStorage.setItem('auditLog', JSON.stringify(this.auditLog));
            this.renderAuditLog();
        }
    }

    queueAction(actionType, data) {
        const queueItem = {
            id: Date.now().toString(),
            actionType: actionType,
            data: data,
            timestamp: new Date().toISOString()
        };

        this.syncQueue.push(queueItem);
        localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
        console.log('Action queued for sync:', actionType);
    }

    async syncPendingChanges() {
        if (!this.isOnline || !this.supabaseClient || this.syncQueue.length === 0) {
            return;
        }

        console.log(`Syncing ${this.syncQueue.length} pending changes...`);

        const syncPromises = this.syncQueue.map(async (item) => {
            try {
                switch (item.actionType) {
                    case 'add_employee':
                        await this.supabaseClient
                            .from('employees')
                            .insert([item.data]);
                        break;

                    case 'delete_employee':
                        await this.supabaseClient
                            .from('employees')
                            .delete()
                            .eq('id', item.data.id);
                        break;

                    case 'bulk_save_employees':
                        await this.supabaseClient
                            .from('employees')
                            .upsert(item.data);
                        break;

                    case 'add_audit_entry':
                        await this.supabaseClient
                            .from('audit_log')
                            .insert([item.data]);
                        break;
                }

                return item.id; // Return ID of successfully synced item
            } catch (error) {
                console.error('Error syncing item:', item, error);
                return null; // Keep in queue
            }
        });

        const results = await Promise.allSettled(syncPromises);
        
        // Remove successfully synced items from queue
        const syncedIds = results
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value);

        this.syncQueue = this.syncQueue.filter(item => !syncedIds.includes(item.id));
        localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));

        console.log(`Sync completed. ${syncedIds.length} items synced, ${this.syncQueue.length} items remaining.`);

        // Reload data from Supabase to ensure consistency
        await this.loadFromSupabase();
        this.renderEmployees();
        this.renderAuditLog();
    }

    renderEmployees() {
        const employeeList = document.getElementById('employee-list');
        if (!employeeList) return;

        employeeList.innerHTML = '';

        this.employees.forEach(employee => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${employee.name}</span>
                <button onclick="dataManager.deleteEmployee('${employee.id}')" style="margin-left: 10px; background: #dc3545; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">Delete</button>
            `;
            employeeList.appendChild(li);
        });
    }

    renderAuditLog() {
        const auditLogList = document.getElementById('audit-log');
        if (!auditLogList) return;

        auditLogList.innerHTML = '';

        this.auditLog.slice(0, 20).forEach(entry => { // Show only last 20 entries
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="margin-bottom: 10px; padding: 8px; border-left: 3px solid #007bff; background: #f8f9fa;">
                    <strong>${entry.action}</strong> - ${entry.description}
                    <br><small style="color: #6c757d;">${new Date(entry.timestamp).toLocaleString()}</small>
                </div>
            `;
            auditLogList.appendChild(li);
        });
    }

    // Public method to get connection status
    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            hasSupabase: !!this.supabaseClient,
            queueLength: this.syncQueue.length
        };
    }
}

// Initialize the data manager when DOM is loaded
let dataManager;

document.addEventListener('DOMContentLoaded', () => {
    dataManager = new ScheduleDataManager();
    
    // Add status indicator to show connection state
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'connection-status';
    statusIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 5px 10px;
        border-radius: 5px;
        color: white;
        font-size: 12px;
        z-index: 1000;
    `;
    document.body.appendChild(statusIndicator);
    
    // Update status indicator
    function updateStatusIndicator() {
        const status = dataManager.getConnectionStatus();
        const indicator = document.getElementById('connection-status');
        
        if (status.isOnline && status.hasSupabase) {
            indicator.textContent = `Online (${status.queueLength} queued)`;
            indicator.style.backgroundColor = '#28a745';
        } else if (status.isOnline) {
            indicator.textContent = 'Online (No Supabase)';
            indicator.style.backgroundColor = '#ffc107';
        } else {
            indicator.textContent = `Offline (${status.queueLength} queued)`;
            indicator.style.backgroundColor = '#dc3545';
        }
    }
    
    // Update status every 5 seconds
    updateStatusIndicator();
    setInterval(updateStatusIndicator, 5000);
});

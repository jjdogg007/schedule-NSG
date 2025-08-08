// main.js - Coordinates app lifecycle and event listeners
// Entry point for the modular schedule application

import { ApiManager } from './api.js';
import { UIManager } from './ui.js';

class ScheduleApp {
    constructor() {
        this.apiManager = null;
        this.uiManager = null;
        this.isInitialized = false;
        
        this.initialize();
    }

    async initialize() {
        try {
            console.log('Initializing Schedule NSG application...');
            
            // Initialize API manager
            this.apiManager = new ApiManager();
            
            // Initialize UI manager with API manager reference
            this.uiManager = new UIManager(this.apiManager);
            
            // Make managers globally accessible for event handlers
            window.apiManager = this.apiManager;
            window.uiManager = this.uiManager;
            
            // Load and render initial data
            await this.uiManager.initializeData();
            
            // Setup app-level event listeners
            this.setupAppEventListeners();
            
            // Focus management for accessibility
            this.uiManager.focusFirstInput();
            
            this.isInitialized = true;
            console.log('Schedule NSG application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }

    setupAppEventListeners() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.uiManager.showErrorFeedback('An unexpected error occurred');
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.uiManager.showErrorFeedback('A system error occurred');
        });

        // Page visibility change (for potential sync on focus)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.apiManager.isOnline) {
                // Page became visible and we're online - could trigger sync
                this.apiManager.syncPendingChanges();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + S to save
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                this.uiManager.bulkSaveEmployees();
            }
            
            // Ctrl/Cmd + N to add new employee (if name input is focused)
            if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
                const nameInput = document.getElementById('employee-name');
                if (nameInput) {
                    event.preventDefault();
                    nameInput.focus();
                }
            }
        });
    }

    handleInitializationError(error) {
        console.error('Initialization failed:', error);
        
        // Show fallback error UI
        const errorContainer = document.createElement('div');
        errorContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #dc2626;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            z-index: 10000;
            max-width: 400px;
        `;
        
        errorContainer.innerHTML = `
            <div style="color: #dc2626; font-size: 2rem; margin-bottom: 10px;">⚠️</div>
            <h3 style="color: #dc2626; margin: 0 0 10px 0;">Application Error</h3>
            <p style="margin: 0 0 15px 0;">Failed to initialize the application. Please refresh the page to try again.</p>
            <button onclick="location.reload()" style="background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                Refresh Page
            </button>
        `;
        
        document.body.appendChild(errorContainer);
    }

    // Public methods for external access
    getEmployees() {
        return this.uiManager ? this.uiManager.employees : [];
    }

    getAuditLog() {
        return this.uiManager ? this.uiManager.auditLog : [];
    }

    async refreshData() {
        if (this.uiManager) {
            await this.uiManager.initializeData();
        }
    }
}

// Legacy compatibility - maintain existing global functions
// These ensure the existing HTML event handlers still work
class LegacyCompatibility {
    constructor() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        // Legacy data manager for backward compatibility
        window.dataManager = {
            employees: [],
            auditLog: [],
            
            addEmployee: () => {
                if (window.uiManager) {
                    window.uiManager.addEmployee();
                }
            },
            
            deleteEmployee: (id) => {
                if (window.uiManager) {
                    window.uiManager.deleteEmployee(id);
                }
            },
            
            bulkSaveEmployees: () => {
                if (window.uiManager) {
                    window.uiManager.bulkSaveEmployees();
                }
            },
            
            renderEmployees: () => {
                if (window.uiManager) {
                    window.uiManager.renderEmployees();
                }
            },
            
            renderAuditLog: () => {
                if (window.uiManager) {
                    window.uiManager.renderAuditLog();
                }
            }
        };
    }
}

// Employee data functions for unit testing
export const EmployeeUtils = {
    validateEmployeeName(name) {
        if (typeof name !== 'string') {
            return { isValid: false, error: 'Name must be a string' };
        }
        
        if (name.trim().length === 0) {
            return { isValid: false, error: 'Name cannot be empty' };
        }
        
        if (name.length > 100) {
            return { isValid: false, error: 'Name must be less than 100 characters' };
        }
        
        return { isValid: true };
    },
    
    formatEmployeeName(name) {
        if (typeof name !== 'string') return '';
        return name.trim().replace(/\s+/g, ' ');
    },
    
    generateEmployeeId() {
        return 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    createEmployee(name, email = '') {
        const nameValidation = this.validateEmployeeName(name);
        if (!nameValidation.isValid) {
            throw new Error(nameValidation.error);
        }
        
        return {
            id: this.generateEmployeeId(),
            name: this.formatEmployeeName(name),
            email: email.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    },
    
    updateEmployee(employee, updates) {
        if (!employee || typeof employee !== 'object') {
            throw new Error('Invalid employee object');
        }
        
        const updatedEmployee = { ...employee };
        
        if (updates.name !== undefined) {
            const nameValidation = this.validateEmployeeName(updates.name);
            if (!nameValidation.isValid) {
                throw new Error(nameValidation.error);
            }
            updatedEmployee.name = this.formatEmployeeName(updates.name);
        }
        
        if (updates.email !== undefined) {
            updatedEmployee.email = updates.email.trim();
        }
        
        updatedEmployee.updatedAt = new Date().toISOString();
        return updatedEmployee;
    },
    
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }
};

// Initialize the application only if we're in a browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const scheduleApp = new ScheduleApp();
    const legacyCompat = new LegacyCompatibility();
}

// Export for module access
export { scheduleApp: typeof window !== 'undefined' ? window.scheduleApp : null };
// ui.js - Handles DOM manipulation and rendering
// Provides clean separation between UI logic and data management

export class UIManager {
    constructor(apiManager) {
        this.apiManager = apiManager;
        this.employees = [];
        this.auditLog = [];
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Employee management events
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

    async initializeData() {
        try {
            this.showLoadingIndicator('Loading employee data...');
            const data = await this.apiManager.loadEmployeeData();
            this.employees = data.employees;
            this.auditLog = data.auditLog;
            
            this.renderEmployees();
            this.renderAuditLog();
            this.hideLoadingIndicator();
            
        } catch (error) {
            console.error('Error initializing data:', error);
            this.showErrorFeedback('Failed to load employee data. Using offline mode.');
            this.hideLoadingIndicator();
        }
    }

    showLoadingIndicator(message = 'Loading...') {
        const indicator = document.getElementById('loading-spinner');
        const messageElement = indicator?.querySelector('.loading-message');
        
        if (indicator) {
            indicator.style.display = 'flex';
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('loading-spinner');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    showErrorFeedback(message, type = 'error') {
        this.showNotification(message, type);
    }

    showSuccessFeedback(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#0369a1'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>${icon}</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    renderEmployees() {
        const employeeList = document.getElementById('employee-list');
        if (!employeeList) {
            console.warn('Employee list container not found');
            return;
        }

        // Clear existing content
        employeeList.innerHTML = '';

        // Check if employees array is empty
        if (!this.employees || this.employees.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.style.cssText = `
                text-align: center;
                color: #6b7280;
                font-style: italic;
                padding: 20px;
            `;
            emptyMessage.textContent = 'No employees added yet';
            employeeList.appendChild(emptyMessage);
            return;
        }

        // Render each employee
        this.employees.forEach((employee, index) => {
            const li = document.createElement('li');
            li.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid #e5e7eb;
                background: ${index % 2 === 0 ? '#f9fafb' : 'white'};
            `;
            
            li.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: 500; color: #111827;">${this.escapeHtml(employee.name)}</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">
                        ${employee.email ? this.escapeHtml(employee.email) : 'No email provided'}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button 
                        onclick="uiManager.editEmployee('${employee.id}')" 
                        style="background: #0369a1; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;"
                        title="Edit employee">
                        Edit
                    </button>
                    <button 
                        onclick="uiManager.deleteEmployee('${employee.id}')" 
                        style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;"
                        title="Delete employee">
                        Delete
                    </button>
                </div>
            `;
            
            employeeList.appendChild(li);
        });

        // Update employee count in UI if element exists
        const countElement = document.getElementById('employee-count');
        if (countElement) {
            countElement.textContent = this.employees.length;
        }
    }

    renderAuditLog() {
        const auditLogList = document.getElementById('audit-log');
        if (!auditLogList) {
            console.warn('Audit log container not found');
            return;
        }

        // Clear existing content
        auditLogList.innerHTML = '';

        // Check if audit log is empty
        if (!this.auditLog || this.auditLog.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.style.cssText = `
                text-align: center;
                color: #6b7280;
                font-style: italic;
                padding: 20px;
            `;
            emptyMessage.textContent = 'No audit log entries';
            auditLogList.appendChild(emptyMessage);
            return;
        }

        // Show only last 20 entries
        const recentEntries = this.auditLog.slice(0, 20);
        
        recentEntries.forEach((entry, index) => {
            const li = document.createElement('li');
            li.style.cssText = `
                padding: 8px 10px;
                border-bottom: 1px solid #e5e7eb;
                background: ${index % 2 === 0 ? '#f9fafb' : 'white'};
                font-size: 0.875rem;
            `;
            
            const timestamp = new Date(entry.timestamp).toLocaleString();
            
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; color: #111827;">${this.escapeHtml(entry.action)}</div>
                        <div style="color: #6b7280; margin-top: 2px;">${this.escapeHtml(entry.details)}</div>
                    </div>
                    <div style="font-size: 0.75rem; color: #9ca3af; text-align: right;">
                        <div>${timestamp}</div>
                        <div>User: ${this.escapeHtml(entry.userId)}</div>
                    </div>
                </div>
            `;
            
            auditLogList.appendChild(li);
        });
    }

    async addEmployee() {
        const nameInput = document.getElementById('employee-name');
        const emailInput = document.getElementById('employee-email');
        
        if (!nameInput) {
            this.showErrorFeedback('Employee name input not found');
            return;
        }

        const name = nameInput.value.trim();
        const email = emailInput ? emailInput.value.trim() : '';

        if (!name) {
            this.showErrorFeedback('Please enter an employee name');
            nameInput.focus();
            return;
        }

        // Validate employee data
        const employeeData = { name, email };
        const validationErrors = this.apiManager.validateEmployee(employeeData);
        
        if (validationErrors.length > 0) {
            this.showErrorFeedback(validationErrors.join(', '));
            return;
        }

        // Check for duplicate names
        if (this.employees.some(emp => emp.name.toLowerCase() === name.toLowerCase())) {
            this.showErrorFeedback('An employee with this name already exists');
            return;
        }

        try {
            this.showLoadingIndicator('Adding employee...');

            // Create new employee
            const newEmployee = {
                id: this.apiManager.generateId(),
                name,
                email,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Add to local array
            this.employees.unshift(newEmployee);

            // Create audit log entry
            const auditEntry = this.apiManager.createAuditEntry(
                'employee_added',
                `Added new employee: ${name}`
            );
            this.auditLog.unshift(auditEntry);

            // Save to storage
            await this.apiManager.saveEmployeeData(this.employees, this.auditLog);

            // Update UI
            this.renderEmployees();
            this.renderAuditLog();

            // Clear inputs
            nameInput.value = '';
            if (emailInput) emailInput.value = '';

            this.hideLoadingIndicator();
            this.showSuccessFeedback(`Employee "${name}" added successfully`);

        } catch (error) {
            console.error('Error adding employee:', error);
            this.hideLoadingIndicator();
            this.showErrorFeedback('Failed to add employee');
        }
    }

    async deleteEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.showErrorFeedback('Employee not found');
            return;
        }

        if (!confirm(`Are you sure you want to delete "${employee.name}"?`)) {
            return;
        }

        try {
            this.showLoadingIndicator('Deleting employee...');

            // Remove from local array
            this.employees = this.employees.filter(emp => emp.id !== employeeId);

            // Create audit log entry
            const auditEntry = this.apiManager.createAuditEntry(
                'employee_deleted',
                `Deleted employee: ${employee.name}`
            );
            this.auditLog.unshift(auditEntry);

            // Save to storage
            await this.apiManager.saveEmployeeData(this.employees, this.auditLog);

            // Update UI
            this.renderEmployees();
            this.renderAuditLog();

            this.hideLoadingIndicator();
            this.showSuccessFeedback(`Employee "${employee.name}" deleted successfully`);

        } catch (error) {
            console.error('Error deleting employee:', error);
            this.hideLoadingIndicator();
            this.showErrorFeedback('Failed to delete employee');
        }
    }

    async editEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            this.showErrorFeedback('Employee not found');
            return;
        }

        // Simple prompt-based editing (could be enhanced with a modal)
        const newName = prompt('Edit employee name:', employee.name);
        if (newName === null) return; // User cancelled

        const trimmedName = newName.trim();
        if (!trimmedName) {
            this.showErrorFeedback('Employee name cannot be empty');
            return;
        }

        // Check for duplicate names (excluding current employee)
        if (this.employees.some(emp => emp.id !== employeeId && emp.name.toLowerCase() === trimmedName.toLowerCase())) {
            this.showErrorFeedback('An employee with this name already exists');
            return;
        }

        try {
            this.showLoadingIndicator('Updating employee...');

            const oldName = employee.name;
            employee.name = trimmedName;
            employee.updatedAt = new Date().toISOString();

            // Create audit log entry
            const auditEntry = this.apiManager.createAuditEntry(
                'employee_updated',
                `Updated employee name from "${oldName}" to "${trimmedName}"`
            );
            this.auditLog.unshift(auditEntry);

            // Save to storage
            await this.apiManager.saveEmployeeData(this.employees, this.auditLog);

            // Update UI
            this.renderEmployees();
            this.renderAuditLog();

            this.hideLoadingIndicator();
            this.showSuccessFeedback(`Employee updated successfully`);

        } catch (error) {
            console.error('Error updating employee:', error);
            this.hideLoadingIndicator();
            this.showErrorFeedback('Failed to update employee');
        }
    }

    async bulkSaveEmployees() {
        try {
            this.showLoadingIndicator('Saving all employees...');
            
            await this.apiManager.saveEmployeeData(this.employees, this.auditLog);
            
            this.hideLoadingIndicator();
            this.showSuccessFeedback(`Saved ${this.employees.length} employees successfully`);
            
        } catch (error) {
            console.error('Error in bulk save:', error);
            this.hideLoadingIndicator();
            this.showErrorFeedback('Failed to save employees');
        }
    }

    // Helper function to escape HTML and prevent XSS
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

    // Accessibility helper to announce changes to screen readers
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Update sync status in UI
    updateSyncStatus(status, details = '') {
        const statusElement = document.getElementById('sync-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.title = details;
        }
    }

    // Focus management for accessibility
    focusFirstInput() {
        const firstInput = document.getElementById('employee-name');
        if (firstInput) {
            firstInput.focus();
        }
    }
}
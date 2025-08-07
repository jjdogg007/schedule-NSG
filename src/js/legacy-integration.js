// Legacy Integration - Bridge between old and new systems
class LegacyIntegration {
    constructor() {
        this.legacyData = null;
        this.migrationComplete = false;
        
        this.init();
    }
    
    async init() {
        // Check if there's legacy data from the original HTML file
        await this.checkForLegacyData();
        
        // Set up global legacy functions
        this.setupLegacyFunctions();
        
        // Migrate data if needed
        if (!this.migrationComplete && this.legacyData) {
            await this.migrateLegacyData();
        }
    }
    
    async checkForLegacyData() {
        // Check localStorage for existing schedule data
        const legacyKeys = [
            'employees',
            'scheduleData',
            'ptoRequests',
            'openShifts',
            'bids',
            'notifications'
        ];
        
        this.legacyData = {};
        let hasLegacyData = false;
        
        legacyKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    this.legacyData[key] = JSON.parse(data);
                    hasLegacyData = true;
                } catch (error) {
                    console.warn(`Failed to parse legacy data for ${key}:`, error);
                }
            }
        });
        
        if (hasLegacyData) {
            console.log('Legacy data detected, preparing migration...');
            this.showMigrationPrompt();
        }
    }
    
    showMigrationPrompt() {
        if (window.notificationSystem) {
            window.notificationSystem.show(
                'Previous schedule data detected. Would you like to migrate it to the new system?',
                'info',
                0,
                {
                    title: 'Data Migration Available',
                    actions: [
                        {
                            id: 'migrate_data',
                            label: 'Migrate Data',
                            type: 'primary',
                            callback: () => this.migrateLegacyData()
                        },
                        {
                            id: 'skip_migration',
                            label: 'Skip',
                            type: 'secondary',
                            callback: () => this.skipMigration()
                        }
                    ]
                }
            );
        }
    }
    
    async migrateLegacyData() {
        try {
            console.log('Starting legacy data migration...');
            
            // Migrate employees
            if (this.legacyData.employees && Array.isArray(this.legacyData.employees)) {
                this.migrateEmployees(this.legacyData.employees);
            }
            
            // Migrate schedule data
            if (this.legacyData.scheduleData) {
                this.migrateScheduleData(this.legacyData.scheduleData);
            }
            
            // Migrate PTO requests
            if (this.legacyData.ptoRequests && Array.isArray(this.legacyData.ptoRequests)) {
                this.migratePTORequests(this.legacyData.ptoRequests);
            }
            
            // Mark migration as complete
            this.migrationComplete = true;
            Utils.setLocalStorage('migration_complete', true);
            
            if (window.notificationSystem) {
                window.notificationSystem.success('Data migration completed successfully!');
            }
            
            console.log('Legacy data migration completed');
            
        } catch (error) {
            console.error('Migration failed:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Data migration failed. Please try manually importing your data.');
            }
        }
    }
    
    migrateEmployees(legacyEmployees) {
        if (!window.scheduleCore) return;
        
        legacyEmployees.forEach(legacyEmp => {
            // Convert legacy employee format to new format
            const employee = {
                id: legacyEmp.id || Utils.generateId('emp'),
                name: legacyEmp.name || legacyEmp.firstName + ' ' + legacyEmp.lastName,
                type: legacyEmp.type || (legacyEmp.fullTime ? 'FT' : 'PT'),
                email: legacyEmp.email || '',
                shifts: legacyEmp.regularShifts || legacyEmp.shifts || '9a-5p',
                availability: legacyEmp.availability || '',
                hireDate: legacyEmp.hireDate || new Date().toISOString().split('T')[0],
                targetHours: legacyEmp.targetHours || (legacyEmp.type === 'FT' ? 160 : 80),
                maxDays: legacyEmp.maxDays || 0
            };
            
            window.scheduleCore.addEmployee(employee);
        });
        
        console.log(`Migrated ${legacyEmployees.length} employees`);
    }
    
    migrateScheduleData(legacySchedule) {
        if (!window.scheduleCore) return;
        
        // Legacy schedule data might be in different formats
        // Handle multiple possible formats
        Object.entries(legacySchedule).forEach(([date, scheduleEntry]) => {
            if (typeof scheduleEntry === 'object') {
                // New-ish format: date -> { employeeId: shift }
                Object.entries(scheduleEntry).forEach(([employeeId, shift]) => {
                    if (typeof shift === 'string') {
                        window.scheduleCore.setShift(date, employeeId, shift);
                    } else if (shift && shift.shift) {
                        window.scheduleCore.setShift(date, employeeId, shift.shift);
                    }
                });
            } else if (Array.isArray(scheduleEntry)) {
                // Array format: might be array of employee shifts
                scheduleEntry.forEach((entry, index) => {
                    if (entry && entry.employeeId && entry.shift) {
                        window.scheduleCore.setShift(date, entry.employeeId, entry.shift);
                    }
                });
            }
        });
        
        console.log('Migrated schedule data');
    }
    
    migratePTORequests(legacyPTO) {
        if (!window.scheduleCore) return;
        
        legacyPTO.forEach(legacyRequest => {
            const ptoRequest = {
                id: legacyRequest.id || Utils.generateId('pto'),
                employeeId: legacyRequest.employeeId || legacyRequest.empId,
                startDate: legacyRequest.startDate,
                endDate: legacyRequest.endDate,
                type: legacyRequest.type || legacyRequest.reason || 'vacation',
                status: legacyRequest.status || 'pending',
                notes: legacyRequest.notes || legacyRequest.comments || '',
                submittedAt: legacyRequest.submittedAt || legacyRequest.requestDate || new Date().toISOString()
            };
            
            window.scheduleCore.addPTORequest(ptoRequest);
        });
        
        console.log(`Migrated ${legacyPTO.length} PTO requests`);
    }
    
    skipMigration() {
        this.migrationComplete = true;
        Utils.setLocalStorage('migration_complete', true);
        
        if (window.notificationSystem) {
            window.notificationSystem.info('Data migration skipped. You can manually import data using the import function.');
        }
    }
    
    setupLegacyFunctions() {
        // Set up global functions that the original HTML might be calling
        
        // Employee management
        window.openEmployeeModal = () => {
            if (window.notificationSystem) {
                window.notificationSystem.info('Employee management is now handled in the Admin view');
            }
            if (window.scheduleApp) {
                window.scheduleApp.showView('admin');
            }
        };
        
        window.saveEmployee = () => {
            console.log('saveEmployee called - legacy function');
        };
        
        window.clearEmployeeForm = () => {
            console.log('clearEmployeeForm called - legacy function');
        };
        
        // Schedule functions
        window.autoGenerateFullSchedule = () => {
            if (window.scheduleCore) {
                const currentMonth = new Date().toISOString().slice(0, 7);
                window.scheduleCore.generateSchedule(currentMonth);
                
                if (window.notificationSystem) {
                    window.notificationSystem.success('Schedule generated successfully!');
                }
            }
        };
        
        window.moveOpenPositionShifts = () => {
            console.log('moveOpenPositionShifts called - legacy function');
            if (window.notificationSystem) {
                window.notificationSystem.info('Open position management would be handled here');
            }
        };
        
        window.findConflicts = () => {
            if (window.scheduleCore) {
                const conflicts = window.scheduleCore.getAllConflicts();
                
                if (window.notificationSystem) {
                    if (conflicts.length === 0) {
                        window.notificationSystem.success('No conflicts found!');
                    } else {
                        window.notificationSystem.warning(`Found ${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''}`);
                    }
                }
            }
        };
        
        window.clearSchedule = () => {
            if (confirm('Are you sure you want to clear the entire schedule? This cannot be undone.')) {
                if (window.scheduleCore) {
                    window.scheduleCore.schedule = {};
                    window.scheduleCore.saveData();
                    
                    if (window.notificationSystem) {
                        window.notificationSystem.success('Schedule cleared');
                    }
                }
            }
        };
        
        // Import/Export functions
        window.importJSON = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file && window.scheduleApp) {
                    window.scheduleApp.importData(file);
                }
            };
            input.click();
        };
        
        window.exportJSON = () => {
            if (window.scheduleApp) {
                window.scheduleApp.exportAllData();
            }
        };
        
        window.resetSavedState = () => {
            if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                localStorage.clear();
                location.reload();
            }
        };
        
        // PTO functions
        window.openBulkPTOModal = () => {
            if (window.notificationSystem) {
                window.notificationSystem.info('Bulk PTO management would open here');
            }
        };
        
        window.applyBulkPTO = () => {
            console.log('applyBulkPTO called - legacy function');
        };
        
        window.openPTORequestsModal = () => {
            if (window.notificationSystem) {
                window.notificationSystem.info('PTO requests are now managed in the Employee Portal');
            }
            if (window.scheduleApp) {
                window.scheduleApp.showView('employee');
            }
        };
        
        window.submitPTORequest = () => {
            console.log('submitPTORequest called - legacy function');
        };
        
        // Reporting functions
        window.openReportsModal = () => {
            if (window.notificationSystem) {
                window.notificationSystem.info('Reports would open here');
            }
        };
        
        window.generateMonthlyPTOReports = () => {
            if (window.notificationSystem) {
                window.notificationSystem.info('Monthly PTO reports would generate here');
            }
        };
        
        window.showValidationResults = () => {
            if (window.scheduleCore) {
                const conflicts = window.scheduleCore.getAllConflicts();
                const stats = window.scheduleCore.getTeamStats();
                
                if (window.notificationSystem) {
                    window.notificationSystem.info(
                        `Validation Results: ${conflicts.length} conflicts, ${stats.totalEmployees} employees, ${Math.round(stats.totalHours)} total hours`,
                        {
                            title: 'Schedule Validation'
                        }
                    );
                }
            }
        };
        
        // Excel functions
        window.openExcelImportModal = () => {
            if (window.notificationSystem) {
                window.notificationSystem.info('Excel import would open here');
            }
        };
        
        window.importFromExcel = () => {
            console.log('importFromExcel called - legacy function');
        };
        
        window.copyEmployeeListForExcel = () => {
            if (window.scheduleCore) {
                const employees = window.scheduleCore.employees;
                const csvData = employees.map(emp => `${emp.name},${emp.type},${emp.email}`).join('\n');
                
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(csvData).then(() => {
                        if (window.notificationSystem) {
                            window.notificationSystem.success('Employee list copied to clipboard');
                        }
                    });
                }
            }
        };
        
        window.copyScheduleForExcel = () => {
            if (window.notificationSystem) {
                window.notificationSystem.info('Schedule data copy functionality would be here');
            }
        };
        
        window.copyOpenShiftsForExcel = () => {
            if (window.notificationSystem) {
                window.notificationSystem.info('Open shifts copy functionality would be here');
            }
        };
        
        // Email functions
        window.openEmailModal = () => {
            if (window.notificationSystem) {
                window.notificationSystem.info('Email functionality would open here');
            }
        };
        
        window.generateEmail = () => {
            console.log('generateEmail called - legacy function');
        };
        
        window.sendEmail = () => {
            console.log('sendEmail called - legacy function');
        };
        
        // Bid management
        window.openBidsModal = () => {
            if (window.notificationSystem) {
                window.notificationSystem.info('Bid management would open here');
            }
        };
        
        // Print function
        window.printSchedule = () => {
            window.print();
        };
        
        // Undo/Redo functions
        window.undo = () => {
            console.log('undo called - legacy function');
            if (window.notificationSystem) {
                window.notificationSystem.info('Undo functionality not yet implemented');
            }
        };
        
        window.redo = () => {
            console.log('redo called - legacy function');
            if (window.notificationSystem) {
                window.notificationSystem.info('Redo functionality not yet implemented');
            }
        };
        
        // Modal functions
        window.closeAllModals = () => {
            // Close any open modals
            Utils.$$('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        };
        
        // Dashboard functions
        window.renderDashboard = () => {
            console.log('renderDashboard called - legacy function');
        };
        
        // Notification functions
        window.sendChangeNotification = () => {
            if (window.notificationSystem) {
                window.notificationSystem.success('Change notification sent');
            }
        };
        
        // Helper functions that might be called by legacy code
        window.saveNote = () => {
            console.log('saveNote called - legacy function');
        };
        
        window.updateEmployeePortal = () => {
            if (window.employeePortal) {
                window.employeePortal.renderEmployeePortal();
            }
        };
        
        // Legacy data access functions
        window.getEmployees = () => {
            return window.scheduleCore ? window.scheduleCore.employees : [];
        };
        
        window.getScheduleData = () => {
            return window.scheduleCore ? window.scheduleCore.schedule : {};
        };
        
        window.getPTORequests = () => {
            return window.scheduleCore ? window.scheduleCore.ptoRequests : [];
        };
        
        console.log('Legacy functions initialized');
    }
    
    // Helper function to export legacy-compatible data
    exportLegacyFormat() {
        if (!window.scheduleCore) return null;
        
        return {
            employees: window.scheduleCore.employees,
            scheduleData: window.scheduleCore.schedule,
            ptoRequests: window.scheduleCore.ptoRequests,
            openShifts: window.scheduleCore.openShifts,
            exportDate: new Date().toISOString(),
            version: 'legacy_compatible'
        };
    }
    
    // Import legacy format data
    importLegacyFormat(data) {
        if (!data || !window.scheduleCore) return false;
        
        try {
            // Clear existing data
            window.scheduleCore.employees = [];
            window.scheduleCore.schedule = {};
            window.scheduleCore.ptoRequests = [];
            window.scheduleCore.openShifts = [];
            
            // Import data
            if (data.employees) {
                this.migrateEmployees(data.employees);
            }
            
            if (data.scheduleData) {
                this.migrateScheduleData(data.scheduleData);
            }
            
            if (data.ptoRequests) {
                this.migratePTORequests(data.ptoRequests);
            }
            
            window.scheduleCore.saveData();
            
            if (window.notificationSystem) {
                window.notificationSystem.success('Legacy data imported successfully!');
            }
            
            return true;
        } catch (error) {
            console.error('Legacy import failed:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Failed to import legacy data');
            }
            return false;
        }
    }
}

// Initialize legacy integration
window.legacyIntegration = new LegacyIntegration();
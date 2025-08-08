// ui.js - Handles DOM manipulation and rendering
// Provides clean separation between UI logic and data management

export class UIManager {
    constructor(apiManager) {
        this.apiManager = apiManager;

        // State properties
        this.employees = [];
        this.scheduleData = {};
        this.notesData = {};
        this.bidsData = {};
        this.notifications = {};
        this.ptoRequests = {};
        this.employeePTOBalances = {};
        this.announcements = [];
        this.auditLogs = [];
        this.history = [];
        this.historyIndex = -1;
        this.currentDates = [];
        this.contextMenuTarget = null;
        this.conflicts = [];
        this.notificationInfo = null;
        
        this.isInitialLoadComplete = false;

        // Constants
        this.shiftsInfo = { "10p-6a": 8, "2p-10:30p": 8.5, "10a-6:30p": 8.5, "6:30p-3a": 8.5, "5:30a-2p": 8.5, "6a-2:30p": 8.5, "1p-9:30p": 8.5, "7a-7p": 12, "9:30p-6a": 8.5 };
        this.shiftTemplates = {
            "Weekend Coverage": { "Sat": "10a-6:30p", "Sun": "10a-6:30p" },
            "Weekday Standard": { "Mon": "10a-6:30p", "Tue": "10a-6:30p", "Wed": "10a-6:30p", "Thu": "10a-6:30p", "Fri": "10a-6:30p" },
            "Night Shift": { "Mon": "10p-6a", "Tue": "10p-6a", "Wed": "10p-6a", "Thu": "10p-6a", "Fri": "10p-6a" }
        };
        this.shiftTypes = {
            opening: ["5:30a-2p", "6a-2:30p", "7a-7p"],
            closing: ["2p-10:30p", "6:30p-3a", "10p-6a", "9:30p-6a"]
        };
    }

    updateConnectionStatus(isOnline) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (isOnline) {
                statusElement.textContent = 'Connected';
                statusElement.style.color = '#059669';
            } else {
                statusElement.textContent = 'Offline: Changes will be saved when reconnected';
                statusElement.style.color = '#dc2626';
            }
        }
    }

    initialize() {
        this.initializeDashboard(); // Create the basic HTML structure first
        this.setupEventListeners(); // Then attach listeners to it
        this.initializeData(); // Finally, load the data
    }

    initializeDashboard() {
        const managerView = document.getElementById('manager-view');
        if (!managerView || managerView.innerHTML.trim() !== '') return;

        const currentMonth = new Date().toISOString().slice(0, 7);
        managerView.innerHTML = `
        <div class="dashboard-header">
            <div class="dashboard-title">
                <div>
                    <h1>Schedule Dashboard</h1>
                    <p class="dashboard-subtitle">Complete employee scheduling workspace</p>
                </div>
                <div style="text-align: right;">
                    <label for="scheduleMonth" style="display: block; font-size: 0.875rem; color: #cbd5e1; margin-bottom: 0.5rem;">Current Month:</label>
                    <input id="scheduleMonth" type="month" value="${currentMonth}" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 0.5rem; border-radius: 0.5rem;"/>
                </div>
            </div>
        </div>
        <div class="dashboard-main">
            <div class="schedule-section">
                <div class="schedule-header">
                    <h2>📅 Current Schedule</h2>
                </div>
                <div class="schedule-content">
                    <div class="table-container">
                        <table id="schedule-table"><thead></thead><tbody></tbody></table>
                    </div>
                </div>
            </div>
            <div class="action-cards">
                <div class="action-card">
                    <h3>Team Management</h3>
                    <button class="btn btn-primary" data-action="openEmployeeModal">👥 Manage Employees</button>
                </div>
            </div>
        </div>
        `;
    }

    setupEventListeners() {
        // Use a single delegated event listener for simplicity and performance
        document.body.addEventListener('click', (event) => {
            const target = event.target;
            const actionTarget = target.closest('[data-action]');

            if (!actionTarget) return;

            const action = actionTarget.dataset.action;
            const params = actionTarget.dataset.params;

            if (action === 'closeAllModals' || target.classList.contains('close')) this.closeAllModals();
            if (action === 'openEmployeeModal') this.openEmployeeModal();
            if (action === 'saveEmployee') this.saveEmployee();
            if (action === 'clearEmployeeForm') this.clearEmployeeForm();
            if (action === 'deleteEmployee' && params) this.deleteEmployee(parseInt(params));
            if (action === 'editEmployee' && params) this.editEmployee(parseInt(params));
            if (action === 'copyPortalLink' && params) this.copyPortalLink(parseInt(params));
            if (action === 'openNoteModal') this.openNoteModal();
            if (action === 'saveNote') this.saveNote();
        });

        // Listeners that aren't simple clicks
        const scheduleMonthInput = document.getElementById('scheduleMonth');
        if (scheduleMonthInput) {
            scheduleMonthInput.addEventListener('change', (e) => {
                this.generateSchedule(e.target.value);
            });
        }

        const newTypeSelect = document.getElementById('newType');
        if (newTypeSelect) {
            newTypeSelect.addEventListener('change', () => this.handleEmployeeTypeChange());
        }
    }

    async initializeData() {
        this.showLoadingSpinner('Initializing Application...');
        try {
            await this.loadState();
            this.hideLoadingSpinner();
        } catch (error) {
            console.error('Error during initialization:', error);
            this.showNotification('Failed to load data. Check console for details.', 'error');
            this.hideLoadingSpinner();
        }
    }

    updateConnectionStatus(isOnline) {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;

        if (isOnline) {
            statusEl.textContent = 'Connected';
            statusEl.style.color = '#059669'; // Green
        } else {
            statusEl.textContent = 'Offline: Changes will be saved when reconnected';
            statusEl.style.color = '#ef4444'; // Red
        }
    }

    showLoadingSpinner(message = 'Loading...') {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.display = 'flex';
            const messageEl = spinner.querySelector('.loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }

    hideLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white; padding: 15px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10001;
            animation: fadeIn 0.3s, fadeOut 0.3s 3.7s;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }

    generateSchedule(monthString) {
        if (!monthString) {
            console.error('generateSchedule: monthString is required');
            return;
        }
        
        const [year, month] = monthString.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        this.currentDates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1));
        
        this.employees.forEach(emp => {
            if (!this.scheduleData[emp.name]) this.scheduleData[emp.name] = {};
            if (!this.notesData[emp.name]) this.notesData[emp.name] = {};
        });
        
        this.renderTable();
    }

    getSortedEmployees() {
        return [...this.employees].sort((a, b) => {
            const aIsOpen = a.name.startsWith('OPEN SHIFTS');
            const bIsOpen = b.name.startsWith('OPEN SHIFTS');
            if (aIsOpen && !bIsOpen) return -1;
            if (!aIsOpen && bIsOpen) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    renderTable() {
        const table = document.getElementById('schedule-table');
        if (!table) {
            console.error('schedule-table element not found');
            return;
        }

        const tbody = table.querySelector('tbody') || table.appendChild(document.createElement('tbody'));
        const thead = table.querySelector('thead') || table.appendChild(document.createElement('thead'));

        if (!this.currentDates || this.currentDates.length === 0) {
            thead.innerHTML = '<tr><th class="employee-name">Employee</th><th>No dates loaded</th></tr>';
            tbody.innerHTML = '';
            return;
        }

        thead.innerHTML = `<tr><th class="employee-name">Employee</th>${this.currentDates.map(d => `<th>${d.getDate()}<br>${d.toLocaleDateString('en-US', { weekday: 'short' })}</th>`).join('')}</tr>`;

        const sortedEmployees = this.getSortedEmployees();

        tbody.innerHTML = sortedEmployees.map(emp => {
            const cells = this.currentDates.map(date => {
                const dateKey = date.toISOString().split('T')[0];
                const shift = this.scheduleData[emp.name]?.[dateKey] || '';
                const note = this.notesData[emp.name]?.[dateKey] || '';
                // const shiftNote = this.getShiftNote(emp.name, dateKey, shift); // Re-enable when shift notes are refactored

                let cellClass = (date.getDay() === 0 || date.getDay() === 6) ? ' weekend' : '';
                if (shift.toUpperCase() === 'PTO') {
                    cellClass += ' pto-cell'; // Simplified for now
                }
                if (this.conflicts.some(c => c.empName === emp.name && c.dateKey === dateKey)) cellClass += ' conflict-cell';

                const noteIndicator = note ? `<div class="note-indicator" title="${note}"></div>` : '';

                return `<td class="${cellClass}"
                            contenteditable="true"
                            data-original-shift="${shift}"
                            data-employee="${emp.name}"
                            data-date="${dateKey}">
                            <div class="shift-cell-content">
                                <span class="shift-text">${shift}</span>
                            </div>
                            ${noteIndicator}
                        </td>`;
            }).join('');
            return `<tr class="${emp.name.startsWith('OPEN SHIFTS') ? 'open-shift-row' : ''}"><td class="employee-name">${emp.name}</td>${cells}</tr>`;
        }).join('');

        // Add event listeners after rendering
        tbody.querySelectorAll('td[contenteditable="true"]').forEach(cell => {
            cell.addEventListener('blur', (e) => this.updateShift(e.target, cell.dataset.employee, cell.dataset.date));
            cell.addEventListener('contextmenu', (e) => this.showContextMenu(e, cell.dataset.employee, cell.dataset.date));
        });

        this.renderDashboard();
        this.updateMainMetrics();
    }

    renderDashboard() {
        if (document.getElementById('manager-view').style.display === 'none') return;

        const empTable = document.querySelector('#employee-dashboard-container table');
        const dailyTable = document.querySelector('#daily-dashboard-container table');
        if (!empTable || !dailyTable) return;

        const targetHours = parseFloat(document.getElementById('targetHours').value) || 0;
        const minStaff = parseInt(document.getElementById('minStaff').value) || 0;

        empTable.innerHTML = '<thead><tr><th>Employee</th><th>Days</th><th>Hours</th></tr></thead><tbody>' +
            this.getSortedEmployees().map(emp => {
                if (emp.name.startsWith('OPEN SHIFTS')) return '';
                let days = 0, hours = 0;
                if (this.scheduleData[emp.name]) {
                    for (const shift of Object.values(this.scheduleData[emp.name])) {
                        if (shift && shift.toUpperCase() !== 'PTO') {
                            days++;
                            hours += this.shiftsInfo[shift] || 0;
                        }
                    }
                }
                let class_ = '';
                const empTargetHours = emp.targetHours || (emp.type === 'FT' ? targetHours : 0);
                if (empTargetHours > 0) {
                    if (hours < empTargetHours * 0.8) class_ = 'dashboard-under';
                    if (hours > empTargetHours * 1.1) class_ = 'dashboard-over';
                }
                return `<tr class="${class_}"><td>${emp.name}</td><td>${days}</td><td>${hours.toFixed(1)}</td></tr>`;
            }).join('') + '</tbody>';

        dailyTable.innerHTML = '<thead><tr><th>Date</th><th>Staff</th><th>Hours</th></tr></thead><tbody>' + this.currentDates.map(date => {
            const dateKey = date.toISOString().split('T')[0];
            let staffCount = 0, dailyHours = 0;
            this.employees.forEach(emp => {
                const shift = this.scheduleData[emp.name]?.[dateKey] || '';
                if (shift && shift.toUpperCase() !== 'PTO') {
                    staffCount++;
                    dailyHours += this.shiftsInfo[shift] || 0;
                }
            });
            const class_ = staffCount < minStaff ? 'dashboard-low-staff' : '';
            return `<tr class="${class_}"><td>${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td><td>${staffCount}</td><td>${dailyHours.toFixed(1)}</td></tr>`;
        }).join('') + '</tbody>';
    }

    updateMainMetrics() {
        const actualEmployees = this.employees.filter(emp => !emp.name.startsWith('OPEN SHIFTS'));
        const totalEmployeesElement = document.getElementById('total-employees-metric');
        if (totalEmployeesElement) {
            totalEmployeesElement.textContent = actualEmployees.length;
        }
        
        const pendingPTORequests = Object.values(this.ptoRequests || {}).filter(req => req.status === 'pending').length;
        const ptoMetricElement = document.getElementById('pto-requests-metric');
        if (ptoMetricElement) {
            ptoMetricElement.textContent = pendingPTORequests;
        }

        let totalPossibleShifts = 0;
        let filledShifts = 0;
        const currentMonth = document.getElementById('scheduleMonth')?.value;
        if (currentMonth && this.scheduleData) {
            actualEmployees.forEach(emp => {
                if (this.scheduleData[emp.name]) {
                    Object.keys(this.scheduleData[emp.name]).forEach(dateKey => {
                        if (dateKey.startsWith(currentMonth)) {
                            totalPossibleShifts++;
                            if (this.scheduleData[emp.name][dateKey] && this.scheduleData[emp.name][dateKey].trim() !== '') {
                                filledShifts++;
                            }
                        }
                    });
                }
            });
        }
        
        const coveragePercentage = totalPossibleShifts > 0 ? Math.round((filledShifts / totalPossibleShifts) * 100) : 0;
        const coverageMetricElement = document.getElementById('coverage-metric');
        if (coverageMetricElement) {
            coverageMetricElement.textContent = `${coveragePercentage}%`;
        }
    }

    updateShift(element, employeeName, dateKey) {
        const originalShift = element.getAttribute('data-original-shift');
        const newShift = element.textContent.trim().replace(/<div.*<\/div>/, '');

        if (originalShift === newShift) {
            return;
        }

        this.recordHistory();

        if (originalShift && !employeeName.startsWith('OPEN SHIFTS')) {
            const employee = this.employees.find(e => e.name === employeeName);
            if (employee) {
                this.notificationInfo = {
                    employeeName,
                    dateKey,
                    originalShift,
                    newShift: newShift || "REMOVED"
                };
                document.getElementById('notification-text').innerHTML = `You changed a shift for <b>${employeeName}</b> from "<em>${originalShift}</em>" to "<em>${newShift || "REMOVED"}</em>".<br><br>Would you like to send an email notification?`;
                document.getElementById('notificationModal').style.display = 'block';
            }
        }

        if (newShift.toUpperCase() === 'PTO') {
            this.executePTO(employeeName, dateKey, originalShift);
        } else {
            this.scheduleData[employeeName][dateKey] = newShift;
        }

        this.saveState();
        this.renderTable();
    }

    recordHistory() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(JSON.parse(JSON.stringify({
            employees: this.employees,
            scheduleData: this.scheduleData,
            notesData: this.notesData,
            bidsData: this.bidsData,
            notifications: this.notifications
        })));
        this.historyIndex++;
        // this.updateUndoRedoButtons(); // Will be enabled later
    }

    executePTO(employeeName, dateKey, originalShift) {
        const employee = this.employees.find(e => e.name === employeeName);
        if (!employee || employee.name.startsWith('OPEN SHIFTS')) return;

        if (originalShift && originalShift.toUpperCase() !== 'PTO') {
            const openShiftsEmp = this.employees.find(e => e.name.startsWith('OPEN SHIFTS'));
            if (openShiftsEmp) {
                const currentOpenShifts = this.scheduleData[openShiftsEmp.name]?.[dateKey] || '';
                this.scheduleData[openShiftsEmp.name][dateKey] = currentOpenShifts ?
                    `${currentOpenShifts}, ${originalShift}` : originalShift;
            }
        }

        this.scheduleData[employeeName][dateKey] = 'PTO';
        this.saveState();
    }

    showContextMenu(event, employeeName, dateKey) {
        event.preventDefault();
        this.contextMenuTarget = { employeeName, dateKey, originalShift: this.scheduleData[employeeName]?.[dateKey] || '' };
        const menu = document.getElementById('contextMenu');

        // This will be replaced with event listeners later
        menu.innerHTML = `
            <div onclick="uiManager.markAsPTO()">Mark as PTO</div>
            <div onclick="uiManager.openNoteModal()">Add/Edit Note</div>
        `;
        menu.style.top = `${event.pageY}px`;
        menu.style.left = `${event.pageX}px`;
        menu.style.display = 'block';
    }

    async saveState() {
        const stateToSave = {
            employees: this.employees,
            schedule: this.scheduleData,
            notesData: this.notesData,
            bidsData: this.bidsData,
            notifications: this.notifications,
            ptoRequests: this.ptoRequests,
            employeePTOBalances: this.employeePTOBalances,
            announcements: this.announcements,
            auditLogs: this.auditLogs,
            month: document.getElementById('scheduleMonth')?.value || '',
            config: {
                targetHours: document.getElementById('targetHours')?.value || '',
                minStaff: document.getElementById('minStaff')?.value || ''
            }
        };

        try {
            await this.apiManager.saveData(stateToSave);
            this.showNotification('Data saved successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to save data. ' + error.message, 'error');
        }
    }

    async loadState() {
        const state = await this.apiManager.loadData();
        if (state) {
            this.employees = state.employees || [];
            this.scheduleData = state.schedule || {};
            // ... load other state properties
            const monthToLoad = state.month || new Date().toISOString().slice(0, 7);
            const scheduleMonthElement = document.getElementById('scheduleMonth');
            if (scheduleMonthElement) {
                scheduleMonthElement.value = monthToLoad;
            }
            this.generateSchedule(monthToLoad);
        } else {
            // Initialize with default data if no state is found
            this.initializeDefaultData();
        }
        this.isInitialLoadComplete = true;
    }

    openEmployeeModal(index = -1) {
        this.clearEmployeeForm();
        if (index > -1) {
            const emp = this.employees[index];
            document.getElementById('modal-title').textContent = 'Edit Employee';
            document.getElementById('empIndex').value = index;
            document.getElementById('empId').value = emp.id;
            document.getElementById('newName').value = emp.name;
            document.getElementById('newType').value = emp.type;
            document.getElementById('newShifts').value = emp.shifts;
            document.getElementById('newAvailability').value = emp.availability;
            document.getElementById('newMaxDays').value = emp.maxDays || 0;
            document.getElementById('newTargetHours').value = emp.targetHours || 0;
        }
        this.renderEmployeeList();
        document.getElementById('employeeModal').style.display = 'block';
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }

    clearEmployeeForm() {
        document.getElementById('modal-title').textContent = 'Add New Employee';
        document.getElementById('empIndex').value = '-1';
        document.getElementById('empId').value = '';
        document.getElementById('newName').value = '';
        document.getElementById('newType').value = 'FT';
        document.getElementById('newShifts').value = '';
        document.getElementById('newAvailability').value = '';
        document.getElementById('newMaxDays').value = '0';
        document.getElementById('newTargetHours').value = '0';
        document.getElementById('newEmail').value = '';
        document.getElementById('newHireDate').value = '';
        this.handleEmployeeTypeChange();
    }

    handleEmployeeTypeChange() {
        const typeSelect = document.getElementById('newType');
        const hoursInput = document.getElementById('newTargetHours');
        const selectedType = typeSelect.value;

        if (selectedType === 'FT') {
            hoursInput.value = '80';
            hoursInput.style.backgroundColor = '#f8f9fa';
            hoursInput.title = 'FT default: 80 hours per 2 weeks. Double-click to override.';
            hoursInput.readOnly = true;
            hoursInput.addEventListener('dblclick', function() {
                this.readOnly = false;
                this.style.backgroundColor = '#fff';
                this.title = 'Custom hours (overriding FT default)';
                this.focus();
            });
        } else if (selectedType === 'PT') {
            hoursInput.value = '60';
            hoursInput.style.backgroundColor = '#fff';
            hoursInput.title = 'Enter target hours for part-time employee';
            hoursInput.readOnly = false;
            hoursInput.focus();
        }
    }

    saveEmployee() {
        this.recordHistory();
        const name = document.getElementById('newName').value.trim();
        if (!name) { alert('Employee name cannot be empty.'); return; }

        const hireDate = document.getElementById('newHireDate').value;
        if (!hireDate && !name.startsWith('OPEN SHIFTS')) {
            alert('Hire date is required for all employees.');
            return;
        }
        const index = parseInt(document.getElementById('empIndex').value);
        let empId = document.getElementById('empId').value;
        if (!empId) { empId = this.generateUUID(); }
        const empData = {
            name,
            id: empId,
            type: document.getElementById('newType').value,
            shifts: document.getElementById('newShifts').value.trim(),
            availability: document.getElementById('newAvailability').value.trim(),
            email: document.getElementById('newEmail').value.trim(),
            hireDate: document.getElementById('newHireDate').value,
            maxDays: document.getElementById('newMaxDays').value,
            targetHours: document.getElementById('newTargetHours').value
        };

        if (index > -1) {
            const oldName = this.employees[index].name;
            if (oldName !== name) {
                this.scheduleData[name] = this.scheduleData[oldName]; this.notesData[name] = this.notesData[oldName];
                delete this.scheduleData[oldName]; delete this.notesData[oldName];
            }
            this.employees[index] = empData;
        } else {
            this.employees.push(empData);
            this.scheduleData[name] = {}; this.notesData[name] = {};
            if (empData.id) {
                this.employeePTOBalances[empData.id] = {
                    employeeName: empData.name,
                    hireDate: empData.hireDate || new Date().toISOString().split('T')[0],
                    totalPTODays: empData.type === "FT" ? 20 : 15,
                    usedPTODays: 0,
                    pendingPTODays: 0
                };
            }
        }
        this.renderEmployeeList();
        this.renderTable();
        this.saveState();
        this.closeAllModals();
    }

    renderEmployeeList() {
        const table = document.getElementById('employee-list-table');
        if (!table) return;
        table.innerHTML = '<thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Actions</th></tr></thead><tbody>' +
            this.getSortedEmployees().map((emp) => {
                if (emp.name.startsWith('OPEN SHIFTS')) return '';
                const originalIndex = this.employees.findIndex(originalEmp => originalEmp.name === emp.name);
                return `<tr>
                            <td>${emp.name}</td>
                            <td>${emp.type}</td>
                            <td>${emp.email || ''}</td>
                            <td>
                                <button class="btn btn-secondary btn-sm" data-action="editEmployee" data-params="${originalIndex}">Edit</button>
                                <button class="btn btn-danger btn-sm" data-action="deleteEmployee" data-params="${originalIndex}">Del</button>
                                <button class="btn btn-primary btn-sm" data-action="copyPortalLink" data-params="${originalIndex}">Copy Portal Link</button>
                            </td>
                        </tr>`;
            }).join('') + '</tbody>';
    }

    copyPortalLink(index) {
        const employee = this.employees[index];
        if (!employee.id) {
            alert("Could not generate link. Please save this employee again to create an ID.");
            return;
        }
        const url = new URL(window.location.href);
        url.search = `?portal=${employee.id}`;
        navigator.clipboard.writeText(url.href).then(() => {
            alert(`✅ Link for ${employee.name} copied to clipboard.`);
        });
    }

    editEmployee(index) {
        const emp = this.employees[index];
        document.getElementById('modal-title').textContent = 'Edit Employee';
        document.getElementById('empIndex').value = index;
        document.getElementById('empId').value = emp.id;
        document.getElementById('newName').value = emp.name;
        document.getElementById('newType').value = emp.type;
        document.getElementById('newShifts').value = emp.shifts || '';
        document.getElementById('newAvailability').value = emp.availability || '';
        document.getElementById('newEmail').value = emp.email || '';
        document.getElementById('newHireDate').value = emp.hireDate || '';
        document.getElementById('newMaxDays').value = emp.maxDays || 0;
        document.getElementById('newTargetHours').value = emp.targetHours || 0;
        document.getElementById('employeeModal').style.display = 'block';
    }

    deleteEmployee(index) {
        const employee = this.employees[index];
        if (!employee) return;

        const choice = confirm(
            `⚠️ Archive Employee: ${employee.name}\n\n` +
            `Choose an option:\n` +
            `• OK = Archive employee (preserve history, hide from schedule)\n` +
            `• Cancel = Keep employee active\n\n` +
            `Note: Archived employees can be restored later.`
        );

        if (choice) {
            this.recordHistory();

            this.employees[index].status = 'inactive';
            this.employees[index].archivedDate = new Date().toISOString();

            if (this.scheduleData[employee.name]) {
                this.scheduleData[employee.name + ' (Archived)'] = this.scheduleData[employee.name];
                delete this.scheduleData[employee.name];
            }

            this.renderEmployeeList();
            this.renderTable();
            this.saveState();

            alert(`✅ ${employee.name} has been archived.\n\nTheir history is preserved and they can be restored from the admin panel.`);
        }
    }

    initializeDefaultData() {
        // ... logic to create default employees and settings ...
        this.generateSchedule(new Date().toISOString().slice(0, 7));
    }

    openNoteModal() {
        if (this.contextMenuTarget) {
            const { employeeName, dateKey } = this.contextMenuTarget;
            document.getElementById('noteText').value = this.notesData[employeeName]?.[dateKey] || '';
            document.getElementById('noteModal').style.display = 'block';
        }
    }

    saveNote() {
        if (this.contextMenuTarget) {
            this.recordHistory();
            const { employeeName, dateKey } = this.contextMenuTarget;
            if (!this.notesData[employeeName]) this.notesData[employeeName] = {};
            this.notesData[employeeName][dateKey] = document.getElementById('noteText').value;
            this.closeAllModals();
            this.renderTable();
            this.saveState();
        }
    }

    openBulkPTOModal() {
        const select = document.getElementById('ptoEmployee');
        select.innerHTML = this.employees.filter(e => !e.name.startsWith('OPEN SHIFTS'))
            .map(e => `<option value="${e.name}">${e.name}</option>`).join('');

        if (this.currentDates.length > 0) {
            document.getElementById('ptoStartDate').value = this.currentDates[0].toISOString().split('T')[0];
            document.getElementById('ptoEndDate').value = this.currentDates[this.currentDates.length - 1].toISOString().split('T')[0];
        }

        document.getElementById('bulkPTOModal').style.display = 'block';
    }

    applyBulkPTO() {
        const employeeName = document.getElementById('ptoEmployee').value;
        const startDate = new Date(document.getElementById('ptoStartDate').value + 'T12:00:00Z');
        const endDate = new Date(document.getElementById('ptoEndDate').value + 'T12:00:00Z');

        if (!employeeName || !startDate || !endDate) {
            alert('Please fill in all fields');
            return;
        }

        if (startDate > endDate) {
            alert('Start date must be before end date');
            return;
        }

        this.recordHistory();

        let ptoCount = 0;
        this.currentDates.forEach(date => {
            if (date >= startDate && date <= endDate) {
                const dateKey = date.toISOString().split('T')[0];
                const originalShift = this.scheduleData[employeeName]?.[dateKey] || '';

                if (originalShift && originalShift.toUpperCase() !== 'PTO') {
                    this.executePTO(employeeName, dateKey, originalShift);
                    ptoCount++;
                }
            }
        });

        this.renderTable();
        this.closeAllModals();
        alert(`✅ Applied PTO to ${ptoCount} days for ${employeeName}`);
    }

    openImportExportModal() {
        document.getElementById('importExportModal').style.display = 'block';
    }

    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = readerEvent => {
            try {
                const content = JSON.parse(readerEvent.target.result);
                if (content.employees && content.scheduleData && content.month) {
                    if (confirm('⚠️ This will replace all current data. Are you sure you want to continue?')) {
                        this.recordHistory();
                        this.employees = content.employees;
                        this.scheduleData = content.scheduleData;
                        this.notesData = content.notesData || {};
                        this.bidsData = content.bidsData || {};
                        this.notifications = content.notifications || {};

                        if (content.config) {
                            document.getElementById('targetHours').value = content.config.targetHours || 160;
                            document.getElementById('minStaff').value = content.config.minStaff || 3;
                        }

                        this.generateSchedule(content.month);
                        this.saveState();
                        this.closeAllModals();
                        this.showNotification('✅ Data imported successfully!', 'success');
                    }
                } else {
                    this.showNotification('❌ Invalid backup file format. Please select a valid JSON backup file.', 'error');
                }
            } catch (error) {
                this.showNotification('❌ Error reading file. Please check the file format.', 'error');
            }
        };
        reader.readAsText(file, 'UTF-8');

        event.target.value = '';
    }

    exportJSON() {
        const backupData = {
            employees: this.employees,
            scheduleData: this.scheduleData,
            notesData: this.notesData,
            bidsData: this.bidsData,
            notifications: this.notifications,
            month: document.getElementById('scheduleMonth')?.value || '',
            config: {
                targetHours: document.getElementById('targetHours')?.value || '',
                minStaff: document.getElementById('minStaff')?.value || ''
            }
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `schedule_backup_${backupData.month}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        
        this.closeAllModals();
        this.showNotification('✅ Data exported successfully!', 'success');
    }

    openEmailModal() {
        const select = document.getElementById('emailEmployee');
        select.innerHTML = this.employees.filter(e => !e.name.startsWith('OPEN SHIFTS'))
            .map(e => `<option value="${e.name}">${e.name}</option>`).join('');
        
        document.getElementById('emailModal').style.display = 'block';
    }

    generateEmail() {
        const employeeName = document.getElementById('emailEmployee').value;
        const emailAddress = document.getElementById('emailAddress').value;

        if (!employeeName || !emailAddress) {
            alert('Please select an employee and enter an email address');
            return;
        }

        let scheduleText = `Schedule for ${employeeName} - ${document.getElementById('scheduleMonth').value}\n\n`;

        this.currentDates.forEach(date => {
            const dateKey = date.toISOString().split('T')[0];
            const shift = this.scheduleData[employeeName]?.[dateKey] || '';
            const note = this.notesData[employeeName]?.[dateKey] || '';

            if (shift) {
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                scheduleText += `${dayName}, ${dateStr}: ${shift}`;
                if (note) scheduleText += ` (${note})`;
                scheduleText += '\n';
            }
        });

        let totalHours = 0;
        Object.values(this.scheduleData[employeeName] || {}).forEach(shift => {
            if (shift && shift.toUpperCase() !== 'PTO') {
                totalHours += this.shiftsInfo[shift] || 0;
            }
        });

        scheduleText += `\nTotal Hours: ${totalHours}`;

        const emailContent = `
            <strong>To:</strong> ${emailAddress}<br>
            <strong>Subject:</strong> Your Work Schedule - ${document.getElementById('scheduleMonth').value}<br><br>
            <strong>Message:</strong><br>
            <pre>${scheduleText}</pre>
        `;

        document.getElementById('emailContent').innerHTML = emailContent;
        document.getElementById('emailPreview').style.display = 'block';
    }

    sendEmail() {
        const employeeName = document.getElementById('emailEmployee').value;
        const emailAddress = document.getElementById('emailAddress').value;

        let scheduleText = `Schedule for ${employeeName} - ${document.getElementById('scheduleMonth').value}\r\n\r\n`;

        this.currentDates.forEach(date => {
            const dateKey = date.toISOString().split('T')[0];
            const shift = this.scheduleData[employeeName]?.[dateKey] || '';
            const note = this.notesData[employeeName]?.[dateKey] || '';

            if (shift) {
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                scheduleText += `${dayName}, ${dateStr}: ${shift}`;
                if (note) scheduleText += ` (${note})`;
                scheduleText += '\r\n';
            }
        });

        let totalHours = 0;
        Object.values(this.scheduleData[employeeName] || {}).forEach(shift => {
            if (shift && shift.toUpperCase() !== 'PTO') {
                totalHours += this.shiftsInfo[shift] || 0;
            }
        });

        scheduleText += `\r\nTotal Hours: ${totalHours}`;

        const subject = `Your Work Schedule - ${document.getElementById('scheduleMonth').value}`;
        const mailtoLink = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(scheduleText)}`;

        window.open(mailtoLink, '_blank');
        this.closeAllModals();
    }

    openExcelImportModal() {
        const fileInput = document.getElementById('excel-file-input');
        fileInput.value = '';
        document.getElementById('excelImportModal').style.display = 'block';
    }

    importFromExcel() {
        const fileInput = document.getElementById('excel-file-input');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a file before processing.');
            return;
        }
        if (!this.currentDates.length) {
            alert('Please ensure a month is loaded in the schedule before importing.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array', cellDates:true});

                let firstVisibleSheetName = null;
                for (const sheetName of workbook.SheetNames) {
                    if (!workbook.Sheets[sheetName].Hidden) {
                        firstVisibleSheetName = sheetName;
                        break;
                    }
                }

                if (!firstVisibleSheetName) {
                    throw new Error("No visible sheets were found in the workbook.");
                }

                const worksheet = workbook.Sheets[firstVisibleSheetName];
                const sheetData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

                if (sheetData.length < 4) {
                    throw new Error("The visible sheet must have at least 4 rows to import.");
                }

                this.recordHistory();
                this.clearSchedule(false);

                const dateHeaders = sheetData[1];
                const appMonth = this.currentDates[0].getMonth();
                const appYear = this.currentDates[0].getFullYear();
                let shiftsImported = 0;
                let skippedShifts = 0;

                for (let i = 3; i < sheetData.length; i++) {
                    const row = sheetData[i];
                    const employeeName = row[0];

                    if (employeeName && this.employees.some(emp => emp.name === employeeName)) {
                        for (let j = 1; j < dateHeaders.length; j++) {
                            const headerDate = dateHeaders[j];
                            const shift = row[j];

                            if (headerDate instanceof Date && !isNaN(headerDate) && shift != null && String(shift).trim() !== '') {
                                if (headerDate.getMonth() === appMonth && headerDate.getFullYear() === appYear) {
                                    headerDate.setUTCHours(12, 0, 0, 0);
                                    const dateKey = headerDate.toISOString().split('T')[0];

                                    if (!this.scheduleData[employeeName]) {
                                        this.scheduleData[employeeName] = {};
                                    }
                                    this.scheduleData[employeeName][dateKey] = String(shift).trim();
                                    shiftsImported++;
                                } else {
                                    skippedShifts++;
                                }
                            }
                        }
                    }
                }

                this.renderTable();
                this.saveState();
                this.closeAllModals();

                let alertMessage = `✅ Import successful! ${shiftsImported} shifts were loaded from sheet "${firstVisibleSheetName}".`;
                if (skippedShifts > 0) {
                    alertMessage += `\n\n(Note: ${skippedShifts} shifts were skipped because their dates did not match the selected month.)`;
                }
                alert(alertMessage);

            } catch (error) {
                console.error("Excel import failed:", error);
                alert(`❌ Import Failed. Please ensure the file is not corrupt and matches the required format.\n\nError: ${error.message}`);
                this.closeAllModals();
            }
        };
        reader.readAsArrayBuffer(file);
    }
}
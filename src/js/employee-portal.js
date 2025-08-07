// Employee Portal functionality
class EmployeePortal {
    constructor() {
        this.currentEmployee = null;
        this.notifications = [];
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        this.loadNotifications();
        this.setupEventListeners();
        this.isInitialized = true;
    }
    
    loadNotifications() {
        this.notifications = Utils.getLocalStorage('employee_notifications', []);
    }
    
    saveNotifications() {
        Utils.setLocalStorage('employee_notifications', this.notifications);
    }
    
    setupEventListeners() {
        // Employee selector change
        document.addEventListener('change', (e) => {
            if (e.target.id === 'portal-employee-select') {
                this.setCurrentEmployee(e.target.value);
            }
        });
    }
    
    setCurrentEmployee(employeeId) {
        if (window.scheduleCore) {
            this.currentEmployee = window.scheduleCore.getEmployee(employeeId);
            this.renderEmployeePortal();
        }
    }
    
    renderEmployeePortal() {
        const container = Utils.$('#employee-portal-container');
        if (!container) return;
        
        this.populateEmployeeSelector();
        
        if (!this.currentEmployee) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h3>Welcome to the Employee Portal</h3>
                    <p>Please select an employee from the dropdown above to view their information.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="employee-portal-content">
                ${this.renderEmployeeHeader()}
                <div class="portal-sections">
                    ${this.renderScheduleSection()}
                    ${this.renderPTOSection()}
                    ${this.renderNotificationsSection()}
                    ${this.renderWellnessSection()}
                </div>
            </div>
        `;
        
        this.attachPortalEventHandlers();
    }
    
    populateEmployeeSelector() {
        const selector = Utils.$('#portal-employee-select');
        if (!selector || !window.scheduleCore) return;
        
        const employees = window.scheduleCore.employees;
        selector.innerHTML = '<option value="">Select Employee...</option>';
        
        employees.forEach(emp => {
            const option = Utils.createElement('option', {
                value: emp.id,
                textContent: emp.name
            });
            
            if (this.currentEmployee && emp.id === this.currentEmployee.id) {
                option.selected = true;
            }
            
            selector.appendChild(option);
        });
    }
    
    renderEmployeeHeader() {
        const employee = this.currentEmployee;
        const stats = window.scheduleCore ? 
            window.scheduleCore.getEmployeeStats(employee.id) : {};
        
        return `
            <div class="employee-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="margin: 0; font-size: 1.8rem;">${employee.name}</h2>
                        <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">${employee.type} Employee • ${employee.email || 'No email'}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: 600;">${stats.totalHours || 0}h</div>
                        <div style="opacity: 0.9;">This Month</div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-top: 1.5rem;">
                    <div style="text-align: center; background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 6px;">
                        <div style="font-size: 1.2rem; font-weight: 600;">${stats.daysWorked || 0}</div>
                        <div style="font-size: 0.875rem; opacity: 0.9;">Days Worked</div>
                    </div>
                    <div style="text-align: center; background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 6px;">
                        <div style="font-size: 1.2rem; font-weight: 600;">${stats.ptodays || 0}</div>
                        <div style="font-size: 0.875rem; opacity: 0.9;">PTO Days</div>
                    </div>
                    <div style="text-align: center; background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 6px;">
                        <div style="font-size: 1.2rem; font-weight: 600;">${(stats.averageHoursPerDay || 0).toFixed(1)}h</div>
                        <div style="font-size: 0.875rem; opacity: 0.9;">Avg/Day</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderScheduleSection() {
        const schedule = this.getEmployeeSchedule();
        
        return `
            <div class="portal-section" style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h3 style="margin-top: 0; color: #1c293a;">📅 Your Schedule</h3>
                <div class="schedule-view">
                    ${this.renderScheduleCalendar(schedule)}
                </div>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="employeePortal.exportPersonalSchedule()">
                        📤 Export Schedule
                    </button>
                    <button class="btn btn-secondary" onclick="employeePortal.syncToCalendar()">
                        🔗 Sync to Calendar
                    </button>
                </div>
            </div>
        `;
    }
    
    renderScheduleCalendar(schedule) {
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);
        const monthDates = Utils.getMonthDates(today.getFullYear(), today.getMonth());
        
        // Create calendar grid
        const firstDay = monthDates[0];
        const lastDay = monthDates[monthDates.length - 1];
        const startDate = new Date(firstDay);
        startDate.setDate(firstDay.getDate() - firstDay.getDay());
        const endDate = new Date(lastDay);
        endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
        
        const calendarDates = [];
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            calendarDates.push(new Date(date));
        }
        
        return `
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #dee2e6; border-radius: 4px; overflow: hidden;">
                ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => 
                    `<div style="background: #f8f9fa; padding: 0.75rem; text-align: center; font-weight: 600; font-size: 0.875rem;">${day}</div>`
                ).join('')}
                ${calendarDates.map(date => {
                    const dateStr = Utils.formatDate(date);
                    const isCurrentMonth = date.getMonth() === today.getMonth();
                    const isToday = dateStr === Utils.formatDate(today);
                    const shift = schedule[dateStr] || '';
                    
                    let cellClass = 'background: white; padding: 0.75rem; min-height: 80px; display: flex; flex-direction: column;';
                    if (!isCurrentMonth) cellClass += ' opacity: 0.5;';
                    if (isToday) cellClass += ' background: #e3f2fd;';
                    if (shift === 'PTO') cellClass += ' background: #d4edda;';
                    if (shift && shift !== 'OFF' && shift !== 'PTO') cellClass += ' background: #fff3cd;';
                    
                    return `
                        <div style="${cellClass}">
                            <div style="font-weight: 600; margin-bottom: 0.25rem;">${date.getDate()}</div>
                            ${shift ? `<div style="font-size: 0.75rem; color: #495057;">${shift}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    renderPTOSection() {
        const ptoRequests = this.getEmployeePTORequests();
        const ptoBalance = this.calculatePTOBalance();
        
        return `
            <div class="portal-section" style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h3 style="margin-top: 0; color: #1c293a;">🏖️ Time Off</h3>
                
                <div class="pto-balance" style="background: #e8f5e8; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem;">
                    <h4 style="margin: 0 0 0.5rem 0;">PTO Balance</h4>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Available: <strong>${ptoBalance.available} days</strong></span>
                        <span>Used: <strong>${ptoBalance.used} days</strong></span>
                        <span>Total: <strong>${ptoBalance.total} days</strong></span>
                    </div>
                </div>
                
                <div class="pto-request-form" style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem;">
                    <h4 style="margin: 0 0 1rem 0;">Request Time Off</h4>
                    <form id="pto-request-form">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.25rem;">Start Date:</label>
                                <input type="date" name="startDate" required style="width: 100%; padding: 0.5rem;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.25rem;">End Date:</label>
                                <input type="date" name="endDate" required style="width: 100%; padding: 0.5rem;">
                            </div>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.25rem;">Type:</label>
                            <select name="type" style="width: 100%; padding: 0.5rem;">
                                <option value="vacation">Vacation</option>
                                <option value="sick">Sick Leave</option>
                                <option value="personal">Personal</option>
                                <option value="emergency">Emergency</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.25rem;">Notes:</label>
                            <textarea name="notes" rows="2" style="width: 100%; padding: 0.5rem;" placeholder="Optional notes..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Submit Request</button>
                    </form>
                </div>
                
                <div class="pto-requests">
                    <h4>Recent Requests</h4>
                    ${ptoRequests.length === 0 ? 
                        '<p style="color: #6c757d; font-style: italic;">No PTO requests found.</p>' :
                        ptoRequests.map(request => this.renderPTORequest(request)).join('')
                    }
                </div>
            </div>
        `;
    }
    
    renderPTORequest(request) {
        const statusClass = {
            'pending': 'warning',
            'approved': 'success',
            'denied': 'danger'
        }[request.status] || 'secondary';
        
        const statusColor = {
            'pending': '#ffc107',
            'approved': '#28a745',
            'denied': '#dc3545'
        }[request.status] || '#6c757d';
        
        return `
            <div class="pto-request" style="border: 1px solid #dee2e6; border-left: 4px solid ${statusColor}; padding: 1rem; margin-bottom: 0.5rem; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h5 style="margin: 0 0 0.25rem 0;">${Utils.capitalizeWords(request.type)} - ${request.startDate} to ${request.endDate}</h5>
                        <p style="margin: 0; color: #6c757d; font-size: 0.875rem;">${request.notes || 'No notes provided'}</p>
                    </div>
                    <span class="badge badge-${statusClass}" style="background: ${statusColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; text-transform: uppercase;">
                        ${request.status}
                    </span>
                </div>
                <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #6c757d;">
                    Submitted: ${new Date(request.submittedAt).toLocaleDateString()}
                </div>
            </div>
        `;
    }
    
    renderNotificationsSection() {
        const employeeNotifications = this.getEmployeeNotifications();
        
        return `
            <div class="portal-section" style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h3 style="margin-top: 0; color: #1c293a;">🔔 Notifications</h3>
                
                ${employeeNotifications.length === 0 ? 
                    '<p style="color: #6c757d; font-style: italic;">No new notifications.</p>' :
                    employeeNotifications.map(notification => this.renderNotification(notification)).join('')
                }
                
                <div style="margin-top: 1rem;">
                    <button class="btn btn-secondary" onclick="employeePortal.markAllNotificationsRead()">
                        Mark All Read
                    </button>
                </div>
            </div>
        `;
    }
    
    renderNotification(notification) {
        const typeIcons = {
            'schedule_change': '📅',
            'pto_update': '🏖️',
            'wellness_reminder': '💚',
            'system': '🔧'
        };
        
        return `
            <div class="notification-item" style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 0.5rem; ${notification.read ? 'opacity: 0.7;' : ''}">
                <div style="font-size: 1.2rem;">${typeIcons[notification.type] || '📝'}</div>
                <div style="flex: 1;">
                    <h5 style="margin: 0 0 0.25rem 0; font-size: 0.95rem;">${notification.title}</h5>
                    <p style="margin: 0; color: #6c757d; font-size: 0.875rem;">${notification.message}</p>
                    <div style="margin-top: 0.25rem; font-size: 0.75rem; color: #6c757d;">
                        ${new Date(notification.timestamp).toLocaleString()}
                    </div>
                </div>
                ${!notification.read ? 
                    `<button class="btn btn-sm btn-outline-primary" onclick="employeePortal.markNotificationRead('${notification.id}')">Mark Read</button>` :
                    ''
                }
            </div>
        `;
    }
    
    renderWellnessSection() {
        if (!window.wellnessHub) {
            return `
                <div class="portal-section" style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 1.5rem;">
                    <h3 style="margin-top: 0; color: #1c293a;">💚 Wellness</h3>
                    <p style="color: #6c757d;">Wellness features are not available.</p>
                </div>
            `;
        }
        
        const wellnessScore = window.wellnessHub.calculateEmployeeWellnessScore(this.currentEmployee.id);
        const category = Utils.getWellnessCategory(wellnessScore);
        
        return `
            <div class="portal-section" style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 1.5rem;">
                <h3 style="margin-top: 0; color: #1c293a;">💚 Wellness Dashboard</h3>
                
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 3rem; font-weight: 700; color: ${this.getWellnessColor(category)};">${wellnessScore}</div>
                    <div style="font-size: 1.1rem; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">${category} Wellness</div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <button class="btn btn-primary" onclick="scheduleApp.showView('wellness')">
                        View Full Wellness Dashboard
                    </button>
                    <button class="btn btn-success" onclick="employeePortal.quickWellnessCheckin()">
                        Quick Check-in
                    </button>
                </div>
                
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px;">
                    <h5 style="margin: 0 0 0.5rem 0;">Wellness Tips</h5>
                    <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.875rem;">
                        <li>Take regular breaks every 2 hours</li>
                        <li>Stay hydrated throughout your shift</li>
                        <li>Practice good posture at your workstation</li>
                        <li>Get adequate sleep (7-9 hours) between shifts</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    attachPortalEventHandlers() {
        // PTO request form
        const ptoForm = Utils.$('#pto-request-form');
        if (ptoForm) {
            ptoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitPTORequest(ptoForm);
            });
        }
    }
    
    submitPTORequest(form) {
        const formData = new FormData(form);
        const request = {
            employeeId: this.currentEmployee.id,
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            type: formData.get('type'),
            notes: formData.get('notes')
        };
        
        if (window.scheduleCore) {
            window.scheduleCore.addPTORequest(request);
            this.renderEmployeePortal();
            this.showNotification('PTO request submitted successfully!', 'success');
        }
    }
    
    getEmployeeSchedule() {
        if (!window.scheduleCore || !this.currentEmployee) return {};
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthSchedule = window.scheduleCore.getMonthSchedule(currentMonth);
        const employeeSchedule = {};
        
        Object.entries(monthSchedule).forEach(([date, shifts]) => {
            if (shifts[this.currentEmployee.id]) {
                employeeSchedule[date] = shifts[this.currentEmployee.id].shift;
            }
        });
        
        return employeeSchedule;
    }
    
    getEmployeePTORequests() {
        if (!window.scheduleCore || !this.currentEmployee) return [];
        
        return window.scheduleCore.ptoRequests
            .filter(pto => pto.employeeId === this.currentEmployee.id)
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
            .slice(0, 5); // Last 5 requests
    }
    
    calculatePTOBalance() {
        // This would typically be calculated based on company policy
        const defaultBalance = {
            total: 20,
            used: 3,
            available: 17
        };
        
        if (!window.scheduleCore || !this.currentEmployee) return defaultBalance;
        
        const usedDays = window.scheduleCore.ptoRequests
            .filter(pto => 
                pto.employeeId === this.currentEmployee.id && 
                pto.status === 'approved' &&
                pto.startDate.startsWith(new Date().getFullYear().toString())
            )
            .reduce((total, pto) => {
                const start = new Date(pto.startDate);
                const end = new Date(pto.endDate);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                return total + days;
            }, 0);
        
        return {
            total: 20,
            used: usedDays,
            available: 20 - usedDays
        };
    }
    
    getEmployeeNotifications() {
        if (!this.currentEmployee) return [];
        
        return this.notifications
            .filter(notification => notification.employeeId === this.currentEmployee.id)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10); // Last 10 notifications
    }
    
    addNotification(notification) {
        notification.id = notification.id || Utils.generateId('notification');
        notification.timestamp = notification.timestamp || new Date().toISOString();
        notification.read = false;
        
        this.notifications.push(notification);
        this.saveNotifications();
    }
    
    markNotificationRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveNotifications();
            this.renderEmployeePortal();
        }
    }
    
    markAllNotificationsRead() {
        if (!this.currentEmployee) return;
        
        this.notifications
            .filter(n => n.employeeId === this.currentEmployee.id)
            .forEach(n => n.read = true);
        
        this.saveNotifications();
        this.renderEmployeePortal();
        this.showNotification('All notifications marked as read', 'info');
    }
    
    getWellnessColor(category) {
        const colors = {
            'excellent': '#4ade80',
            'good': '#22d3ee',
            'fair': '#fbbf24',
            'poor': '#f87171'
        };
        return colors[category] || '#6c757d';
    }
    
    exportPersonalSchedule() {
        const schedule = this.getEmployeeSchedule();
        const employee = this.currentEmployee;
        
        if (!employee) return;
        
        const scheduleText = Object.entries(schedule)
            .map(([date, shift]) => `${date}: ${shift}`)
            .join('\n');
        
        const content = `Schedule for ${employee.name}\nGenerated: ${new Date().toLocaleString()}\n\n${scheduleText}`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${employee.name.replace(/\s+/g, '_')}_schedule.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Schedule exported successfully!', 'success');
    }
    
    syncToCalendar() {
        this.showNotification('Calendar sync initiated...', 'info');
        
        if (window.calendarIntegration) {
            window.calendarIntegration.syncAllCalendars()
                .then(() => {
                    this.showNotification('Schedule synced to calendar!', 'success');
                })
                .catch(() => {
                    this.showNotification('Calendar sync failed', 'error');
                });
        } else {
            this.showNotification('Calendar integration not available', 'warning');
        }
    }
    
    quickWellnessCheckin() {
        this.showNotification('Quick wellness check-in opened', 'info');
        // This would open a quick modal or redirect to wellness view
        if (window.scheduleApp) {
            window.scheduleApp.quickWellnessCheckin();
        }
    }
    
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Initialize employee portal
window.employeePortal = new EmployeePortal();
// Core schedule functionality
class ScheduleCore {
    constructor() {
        this.employees = [];
        this.schedule = {};
        this.currentMonth = new Date().toISOString().slice(0, 7);
        this.openShifts = [];
        this.ptoRequests = [];
        this.conflicts = [];
        
        this.loadData();
    }
    
    loadData() {
        this.employees = Utils.getLocalStorage('schedule_employees', []);
        this.schedule = Utils.getLocalStorage('schedule_data', {});
        this.openShifts = Utils.getLocalStorage('schedule_open_shifts', []);
        this.ptoRequests = Utils.getLocalStorage('schedule_pto_requests', []);
    }
    
    saveData() {
        Utils.setLocalStorage('schedule_employees', this.employees);
        Utils.setLocalStorage('schedule_data', this.schedule);
        Utils.setLocalStorage('schedule_open_shifts', this.openShifts);
        Utils.setLocalStorage('schedule_pto_requests', this.ptoRequests);
    }
    
    // Employee management
    addEmployee(employee) {
        employee.id = employee.id || Utils.generateId('emp');
        employee.createdAt = new Date().toISOString();
        this.employees.push(employee);
        this.saveData();
        return employee;
    }
    
    updateEmployee(id, updates) {
        const index = this.employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
            this.employees[index] = { ...this.employees[index], ...updates };
            this.saveData();
            return this.employees[index];
        }
        return null;
    }
    
    removeEmployee(id) {
        this.employees = this.employees.filter(emp => emp.id !== id);
        
        // Remove from schedule
        Object.keys(this.schedule).forEach(date => {
            delete this.schedule[date][id];
        });
        
        this.saveData();
    }
    
    getEmployee(id) {
        return this.employees.find(emp => emp.id === id);
    }
    
    // Schedule management
    setShift(date, employeeId, shift) {
        if (!this.schedule[date]) {
            this.schedule[date] = {};
        }
        
        this.schedule[date][employeeId] = {
            shift,
            timestamp: new Date().toISOString()
        };
        
        this.saveData();
        this.checkForConflicts(date, employeeId);
    }
    
    getShift(date, employeeId) {
        return this.schedule[date]?.[employeeId]?.shift || '';
    }
    
    removeShift(date, employeeId) {
        if (this.schedule[date]) {
            delete this.schedule[date][employeeId];
            if (Object.keys(this.schedule[date]).length === 0) {
                delete this.schedule[date];
            }
        }
        this.saveData();
    }
    
    // Get schedule for a specific month
    getMonthSchedule(month = this.currentMonth) {
        const monthSchedule = {};
        const [year, monthNum] = month.split('-');
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${month}-${String(day).padStart(2, '0')}`;
            monthSchedule[date] = this.schedule[date] || {};
        }
        
        return monthSchedule;
    }
    
    // Auto-generate schedule
    generateSchedule(month, constraints = {}) {
        const {
            minStaff = 3,
            maxHoursPerWeek = 40,
            maxConsecutiveDays = 5,
            preferredShifts = {},
            avoidOvertimeFirst = true
        } = constraints;
        
        const monthSchedule = this.getMonthSchedule(month);
        const dates = Object.keys(monthSchedule).sort();
        
        // Simple schedule generation algorithm
        dates.forEach(date => {
            this.assignDayShifts(date, minStaff, constraints);
        });
        
        this.saveData();
        return this.getMonthSchedule(month);
    }
    
    assignDayShifts(date, minStaff, constraints) {
        const dayOfWeek = new Date(date).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Get available employees for this date
        const availableEmployees = this.employees.filter(emp => {
            return this.isEmployeeAvailable(emp, date, dayOfWeek);
        });
        
        // Sort by priority (least hours worked, preferences, etc.)
        availableEmployees.sort((a, b) => {
            const aHours = this.getWeeklyHours(a.id, date);
            const bHours = this.getWeeklyHours(b.id, date);
            return aHours - bHours;
        });
        
        // Assign shifts
        let assignedCount = 0;
        availableEmployees.forEach(emp => {
            if (assignedCount < minStaff || (!isWeekend && assignedCount < minStaff + 1)) {
                const preferredShift = this.getPreferredShift(emp, date);
                this.setShift(date, emp.id, preferredShift);
                assignedCount++;
            }
        });
    }
    
    isEmployeeAvailable(employee, date, dayOfWeek) {
        // Check PTO
        if (this.hasApprovedPTO(employee.id, date)) {
            return false;
        }
        
        // Check availability
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[dayOfWeek];
        
        if (employee.availability && !employee.availability.includes(dayName)) {
            return false;
        }
        
        // Check consecutive days limit
        if (this.getConsecutiveDays(employee.id, date) >= (employee.maxDays || 5)) {
            return false;
        }
        
        return true;
    }
    
    getPreferredShift(employee, date) {
        // Return employee's regular shift or default
        return employee.shifts || '9a-5p';
    }
    
    getWeeklyHours(employeeId, date) {
        const weekDates = Utils.getWeekDates(new Date(date));
        let totalHours = 0;
        
        weekDates.forEach(d => {
            const dateStr = Utils.formatDate(d);
            const shift = this.getShift(dateStr, employeeId);
            if (shift) {
                totalHours += this.calculateShiftHours(shift);
            }
        });
        
        return totalHours;
    }
    
    calculateShiftHours(shift) {
        if (!shift || shift === 'OFF' || shift === 'PTO') return 0;
        
        // Parse shift format like "9a-5p" or "9:00-17:00"
        const parts = shift.split('-');
        if (parts.length !== 2) return 8; // Default 8 hours
        
        try {
            const startMinutes = Utils.parseTimeToMinutes(parts[0]);
            const endMinutes = Utils.parseTimeToMinutes(parts[1]);
            return (endMinutes - startMinutes) / 60;
        } catch {
            return 8; // Default fallback
        }
    }
    
    getConsecutiveDays(employeeId, date) {
        let consecutiveDays = 0;
        const checkDate = new Date(date);
        
        // Look backwards for consecutive days
        for (let i = 1; i <= 14; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            const dateStr = Utils.formatDate(checkDate);
            const shift = this.getShift(dateStr, employeeId);
            
            if (shift && shift !== 'OFF' && shift !== 'PTO') {
                consecutiveDays++;
            } else {
                break;
            }
        }
        
        return consecutiveDays;
    }
    
    hasApprovedPTO(employeeId, date) {
        return this.ptoRequests.some(pto => 
            pto.employeeId === employeeId &&
            pto.status === 'approved' &&
            date >= pto.startDate &&
            date <= pto.endDate
        );
    }
    
    // Conflict detection
    checkForConflicts(date, employeeId) {
        const conflicts = [];
        const shift = this.getShift(date, employeeId);
        
        if (!shift) return conflicts;
        
        // Check for PTO conflicts
        if (this.hasApprovedPTO(employeeId, date)) {
            conflicts.push({
                type: 'pto_conflict',
                date,
                employeeId,
                message: 'Employee is scheduled during approved PTO'
            });
        }
        
        // Check for overtime
        const weeklyHours = this.getWeeklyHours(employeeId, date);
        if (weeklyHours > 40) {
            conflicts.push({
                type: 'overtime',
                date,
                employeeId,
                message: `Employee exceeds 40 hours (${weeklyHours.toFixed(1)}h)`
            });
        }
        
        // Check for consecutive days
        const consecutiveDays = this.getConsecutiveDays(employeeId, date);
        if (consecutiveDays > 6) {
            conflicts.push({
                type: 'consecutive_days',
                date,
                employeeId,
                message: `Employee has ${consecutiveDays} consecutive days`
            });
        }
        
        // Update conflicts array
        this.conflicts = this.conflicts.filter(c => 
            !(c.date === date && c.employeeId === employeeId)
        );
        this.conflicts.push(...conflicts);
        
        return conflicts;
    }
    
    getAllConflicts() {
        return this.conflicts;
    }
    
    // PTO management
    addPTORequest(request) {
        request.id = request.id || Utils.generateId('pto');
        request.submittedAt = new Date().toISOString();
        request.status = request.status || 'pending';
        
        this.ptoRequests.push(request);
        this.saveData();
        return request;
    }
    
    updatePTORequest(id, updates) {
        const index = this.ptoRequests.findIndex(pto => pto.id === id);
        if (index !== -1) {
            this.ptoRequests[index] = { ...this.ptoRequests[index], ...updates };
            this.saveData();
            return this.ptoRequests[index];
        }
        return null;
    }
    
    approvePTORequest(id) {
        const pto = this.updatePTORequest(id, { 
            status: 'approved',
            approvedAt: new Date().toISOString()
        });
        
        if (pto) {
            // Mark schedule with PTO
            const currentDate = new Date(pto.startDate);
            const endDate = new Date(pto.endDate);
            
            while (currentDate <= endDate) {
                const dateStr = Utils.formatDate(currentDate);
                this.setShift(dateStr, pto.employeeId, 'PTO');
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        return pto;
    }
    
    denyPTORequest(id, reason = '') {
        return this.updatePTORequest(id, { 
            status: 'denied',
            deniedAt: new Date().toISOString(),
            denialReason: reason
        });
    }
    
    // Statistics and reporting
    getEmployeeStats(employeeId, month = this.currentMonth) {
        const monthSchedule = this.getMonthSchedule(month);
        let totalHours = 0;
        let daysWorked = 0;
        let ptodays = 0;
        
        Object.entries(monthSchedule).forEach(([date, shifts]) => {
            const shift = shifts[employeeId]?.shift;
            if (shift) {
                if (shift === 'PTO') {
                    ptodays++;
                } else if (shift !== 'OFF') {
                    daysWorked++;
                    totalHours += this.calculateShiftHours(shift);
                }
            }
        });
        
        return {
            totalHours,
            daysWorked,
            ptodays,
            averageHoursPerDay: daysWorked > 0 ? totalHours / daysWorked : 0
        };
    }
    
    getTeamStats(month = this.currentMonth) {
        const stats = {
            totalEmployees: this.employees.length,
            totalHours: 0,
            averageHours: 0,
            ptoRequests: this.ptoRequests.filter(pto => 
                pto.startDate.startsWith(month)
            ).length,
            conflicts: this.conflicts.length
        };
        
        this.employees.forEach(emp => {
            const empStats = this.getEmployeeStats(emp.id, month);
            stats.totalHours += empStats.totalHours;
        });
        
        stats.averageHours = stats.totalEmployees > 0 ? 
            stats.totalHours / stats.totalEmployees : 0;
        
        return stats;
    }
}

// Global instance
window.scheduleCore = new ScheduleCore();
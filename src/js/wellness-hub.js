// Wellness Hub Module
class WellnessHub {
    constructor() {
        this.wellnessData = {
            employees: {},
            teamMetrics: {},
            challenges: [],
            resources: [],
            alerts: []
        };
        
        this.settings = {
            trackingEnabled: true,
            notificationsEnabled: true,
            burnoutThreshold: 70,
            maxConsecutiveDays: 6,
            maxWeeklyHours: 50,
            minBreakHours: 8,
            wellnessGoals: {
                stepsDaily: 8000,
                sleepHours: 7,
                stressLevel: 3,
                workLifeBalance: 7
            }
        };
        
        this.currentEmployee = null;
        this.wellnessResources = this.initializeResources();
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        this.loadWellnessData();
        this.loadSettings();
        this.setupEventListeners();
        this.startWellnessTracking();
        this.isInitialized = true;
    }
    
    loadWellnessData() {
        this.wellnessData = Utils.getLocalStorage('wellness_data', {
            employees: {},
            teamMetrics: {},
            challenges: [],
            resources: [],
            alerts: []
        });
    }
    
    saveWellnessData() {
        Utils.setLocalStorage('wellness_data', this.wellnessData);
    }
    
    loadSettings() {
        const savedSettings = Utils.getLocalStorage('wellness_settings', {});
        this.settings = { ...this.settings, ...savedSettings };
    }
    
    saveSettings() {
        Utils.setLocalStorage('wellness_settings', this.settings);
    }
    
    setupEventListeners() {
        // Navigation click handler
        document.addEventListener('click', (e) => {
            if (e.target.dataset.view === 'wellness') {
                this.renderWellnessView();
            }
        });
        
        // Wellness form handlers
        document.addEventListener('submit', (e) => {
            if (e.target.classList.contains('wellness-form')) {
                e.preventDefault();
                this.handleWellnessSubmission(e.target);
            }
        });
    }
    
    renderWellnessView() {
        const container = Utils.$('#wellness-view');
        if (!container) return;
        
        const hubContainer = Utils.$('#wellness-hub-container');
        if (!hubContainer) return;
        
        hubContainer.innerHTML = `
            ${this.renderWellnessDashboard()}
            <div class="wellness-hub-container">
                ${this.renderQuickCheckin()}
                ${this.renderWellnessResources()}
            </div>
            ${this.renderWellnessTrends()}
            ${this.renderTeamWellness()}
            ${this.renderWellnessAlerts()}
            ${this.renderWellnessCalendar()}
        `;
        
        this.attachWellnessEventHandlers();
    }
    
    renderWellnessDashboard() {
        const employee = this.getCurrentEmployee();
        const wellnessScore = this.calculateEmployeeWellnessScore(employee?.id);
        const category = Utils.getWellnessCategory(wellnessScore);
        
        const metrics = this.getEmployeeMetrics(employee?.id);
        
        return `
            <div class="wellness-dashboard">
                <div class="wellness-score-container">
                    <div class="wellness-score ${category}">${wellnessScore}</div>
                    <div class="wellness-label">${category} Wellness</div>
                </div>
                <div class="wellness-metrics">
                    <div class="wellness-metric">
                        <h4>${metrics.hoursWorked || 0}</h4>
                        <p>Hours This Week</p>
                    </div>
                    <div class="wellness-metric">
                        <h4>${metrics.consecutiveDays || 0}</h4>
                        <p>Consecutive Days</p>
                    </div>
                    <div class="wellness-metric">
                        <h4>${metrics.stressLevel || 5}/10</h4>
                        <p>Stress Level</p>
                    </div>
                    <div class="wellness-metric">
                        <h4>${metrics.workLifeBalance || 5}/10</h4>
                        <p>Work-Life Balance</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderQuickCheckin() {
        return `
            <div class="wellness-checkin">
                <h3>🎯 Quick Wellness Check-in</h3>
                <form class="wellness-form" data-type="checkin">
                    <div class="mood-selector">
                        <button type="button" class="mood-option" data-mood="1">😫</button>
                        <button type="button" class="mood-option" data-mood="2">😔</button>
                        <button type="button" class="mood-option" data-mood="3">😐</button>
                        <button type="button" class="mood-option" data-mood="4">😊</button>
                        <button type="button" class="mood-option" data-mood="5">😄</button>
                    </div>
                    
                    <div class="energy-level">
                        <label for="energy-slider">Energy Level: <span id="energy-value">5</span>/10</label>
                        <input type="range" id="energy-slider" class="energy-slider" 
                               min="1" max="10" value="5" oninput="this.parentNode.querySelector('#energy-value').textContent = this.value">
                    </div>
                    
                    <div class="form-group">
                        <label for="stress-level">Stress Level (1-10):</label>
                        <input type="range" id="stress-level" name="stressLevel" min="1" max="10" value="5">
                    </div>
                    
                    <div class="form-group">
                        <label for="sleep-hours">Sleep Hours Last Night:</label>
                        <input type="number" id="sleep-hours" name="sleepHours" min="0" max="12" step="0.5" value="7">
                    </div>
                    
                    <div class="form-group">
                        <label for="wellness-notes">Notes (optional):</label>
                        <textarea id="wellness-notes" name="notes" rows="2" placeholder="How are you feeling today?"></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">Submit Check-in</button>
                </form>
            </div>
        `;
    }
    
    renderWellnessResources() {
        return `
            <div class="wellness-resources">
                <h3>🌱 Wellness Resources</h3>
                
                <div class="resource-category">
                    <h4>Mental Health</h4>
                    <div class="resource-list">
                        ${this.wellnessResources.mentalHealth.map(resource => `
                            <div class="resource-item" onclick="wellnessHub.openResource('${resource.url}')">
                                <h5>${resource.title}</h5>
                                <p>${resource.description}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="resource-category">
                    <h4>Physical Wellness</h4>
                    <div class="resource-list">
                        ${this.wellnessResources.physical.map(resource => `
                            <div class="resource-item" onclick="wellnessHub.openResource('${resource.url}')">
                                <h5>${resource.title}</h5>
                                <p>${resource.description}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="resource-category">
                    <h4>Work-Life Balance</h4>
                    <div class="resource-list">
                        ${this.wellnessResources.workLife.map(resource => `
                            <div class="resource-item" onclick="wellnessHub.openResource('${resource.url}')">
                                <h5>${resource.title}</h5>
                                <p>${resource.description}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderWellnessTrends() {
        const trendData = this.getWellnessTrends();
        
        return `
            <div class="wellness-trends">
                <h3>📈 Wellness Trends</h3>
                <div class="trend-chart">
                    <p>Wellness trend chart would be rendered here with a charting library</p>
                    <small>(Chart showing wellness score over the past 30 days)</small>
                </div>
                <div class="trend-summary">
                    <div class="trend-item">
                        <h4>${trendData.averageScore}</h4>
                        <p>Avg. Wellness Score</p>
                        <span class="trend-change ${trendData.scoreChange.direction}">${trendData.scoreChange.text}</span>
                    </div>
                    <div class="trend-item">
                        <h4>${trendData.averageStress}</h4>
                        <p>Avg. Stress Level</p>
                        <span class="trend-change ${trendData.stressChange.direction}">${trendData.stressChange.text}</span>
                    </div>
                    <div class="trend-item">
                        <h4>${trendData.sleepAverage}h</h4>
                        <p>Avg. Sleep</p>
                        <span class="trend-change ${trendData.sleepChange.direction}">${trendData.sleepChange.text}</span>
                    </div>
                    <div class="trend-item">
                        <h4>${trendData.workLifeBalance}</h4>
                        <p>Work-Life Balance</p>
                        <span class="trend-change ${trendData.balanceChange.direction}">${trendData.balanceChange.text}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderTeamWellness() {
        const teamData = this.getTeamWellnessData();
        
        return `
            <div class="team-wellness">
                <h3>👥 Team Wellness</h3>
                <div class="team-overview">
                    <div class="team-metric">
                        <h4>${teamData.averageScore}</h4>
                        <p>Team Avg. Score</p>
                    </div>
                    <div class="team-metric">
                        <h4>${teamData.atRiskEmployees}</h4>
                        <p>At-Risk Employees</p>
                    </div>
                    <div class="team-metric">
                        <h4>${teamData.activeChallenges}</h4>
                        <p>Active Challenges</p>
                    </div>
                    <div class="team-metric">
                        <h4>${teamData.participationRate}%</h4>
                        <p>Participation Rate</p>
                    </div>
                </div>
                
                <div class="team-challenges">
                    <h4>Current Team Challenges</h4>
                    ${teamData.challenges.map(challenge => `
                        <div class="challenge-item">
                            <div class="challenge-info">
                                <h5>${challenge.name}</h5>
                                <p>${challenge.description}</p>
                            </div>
                            <div class="challenge-progress">
                                <span>${challenge.progress}%</span>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${challenge.progress}%"></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderWellnessAlerts() {
        const alerts = this.getWellnessAlerts();
        
        if (alerts.length === 0) {
            return `
                <div class="wellness-alerts" style="background: #d4edda; border-color: #c3e6cb;">
                    <h3 style="color: #155724;">✅ No Wellness Alerts</h3>
                    <p>All team members are within healthy wellness ranges.</p>
                </div>
            `;
        }
        
        return `
            <div class="wellness-alerts">
                <h3>⚠️ Wellness Alerts</h3>
                <div class="alert-list">
                    ${alerts.map(alert => `
                        <div class="alert-item">
                            <div class="alert-info">
                                <h4>${alert.title}</h4>
                                <p>${alert.description}</p>
                            </div>
                            <div class="alert-actions">
                                <span class="alert-severity severity-${alert.severity}">${alert.severity}</span>
                                <button class="btn btn-sm btn-primary" onclick="wellnessHub.handleAlert('${alert.id}')">
                                    Take Action
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="wellnessHub.dismissAlert('${alert.id}')">
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderWellnessCalendar() {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthDates = Utils.getMonthDates(year, month);
        
        // Get calendar grid (including previous/next month dates for full weeks)
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
            <div class="wellness-calendar">
                <h3>📅 Wellness Calendar - ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <div class="calendar-grid">
                    ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => 
                        `<div class="calendar-day" style="font-weight: bold; background: #f8f9fa;">${day}</div>`
                    ).join('')}
                    ${calendarDates.map(date => {
                        const isCurrentMonth = date.getMonth() === month;
                        const isToday = Utils.formatDate(date) === Utils.formatDate(new Date());
                        const wellnessScore = this.getDayWellnessScore(date);
                        const wellnessClass = Utils.getWellnessCategory(wellnessScore);
                        
                        return `
                            <div class="calendar-day ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}">
                                <div class="day-number">${date.getDate()}</div>
                                ${isCurrentMonth ? `<div class="wellness-indicator wellness-${wellnessClass}"></div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    attachWellnessEventHandlers() {
        // Mood selector
        Utils.$$('.mood-option').forEach(button => {
            button.addEventListener('click', (e) => {
                Utils.$$('.mood-option').forEach(btn => btn.classList.remove('selected'));
                e.target.classList.add('selected');
                e.target.closest('form').dataset.mood = e.target.dataset.mood;
            });
        });
        
        // Energy slider
        const energySlider = Utils.$('#energy-slider');
        if (energySlider) {
            energySlider.addEventListener('input', (e) => {
                Utils.$('#energy-value').textContent = e.target.value;
            });
        }
    }
    
    handleWellnessSubmission(form) {
        const formData = new FormData(form);
        const type = form.dataset.type;
        
        switch (type) {
            case 'checkin':
                this.submitWellnessCheckin(formData, form);
                break;
            default:
                console.log('Unknown wellness form type:', type);
        }
    }
    
    submitWellnessCheckin(formData, form) {
        const employee = this.getCurrentEmployee();
        if (!employee) {
            this.showNotification('Please select an employee first', 'warning');
            return;
        }
        
        const checkinData = {
            id: Utils.generateId('checkin'),
            employeeId: employee.id,
            date: new Date().toISOString(),
            mood: parseInt(form.dataset.mood) || 3,
            energy: parseInt(formData.get('energy') || Utils.$('#energy-slider').value),
            stressLevel: parseInt(formData.get('stressLevel')),
            sleepHours: parseFloat(formData.get('sleepHours')),
            notes: formData.get('notes') || ''
        };
        
        this.saveWellnessCheckin(checkinData);
        this.updateEmployeeMetrics(employee.id);
        this.checkForAlerts(employee.id);
        
        form.reset();
        Utils.$$('.mood-option').forEach(btn => btn.classList.remove('selected'));
        
        this.showNotification('Wellness check-in submitted successfully!', 'success');
        this.renderWellnessView();
    }
    
    saveWellnessCheckin(checkinData) {
        if (!this.wellnessData.employees[checkinData.employeeId]) {
            this.wellnessData.employees[checkinData.employeeId] = {
                checkins: [],
                metrics: {},
                alerts: []
            };
        }
        
        this.wellnessData.employees[checkinData.employeeId].checkins.push(checkinData);
        this.saveWellnessData();
    }
    
    updateEmployeeMetrics(employeeId) {
        const employeeData = this.wellnessData.employees[employeeId];
        if (!employeeData) return;
        
        const recentCheckins = employeeData.checkins.slice(-7); // Last 7 days
        
        const metrics = {
            averageMood: this.calculateAverage(recentCheckins, 'mood'),
            averageEnergy: this.calculateAverage(recentCheckins, 'energy'),
            averageStress: this.calculateAverage(recentCheckins, 'stressLevel'),
            averageSleep: this.calculateAverage(recentCheckins, 'sleepHours'),
            wellnessScore: 0,
            lastUpdated: new Date().toISOString()
        };
        
        metrics.wellnessScore = Utils.calculateWellnessScore({
            stressLevel: metrics.averageStress,
            sleepQuality: metrics.averageSleep * 1.4, // Convert hours to 1-10 scale
            workLifeBalance: metrics.averageMood * 2, // Convert mood to 1-10 scale
            hoursWorked: this.getEmployeeWeeklyHours(employeeId),
            consecutiveDays: this.getEmployeeConsecutiveDays(employeeId)
        });
        
        employeeData.metrics = metrics;
        this.saveWellnessData();
    }
    
    calculateAverage(data, field) {
        if (!data.length) return 0;
        const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
        return Math.round((sum / data.length) * 10) / 10;
    }
    
    calculateEmployeeWellnessScore(employeeId) {
        if (!employeeId) return 75; // Default score
        
        const employeeData = this.wellnessData.employees[employeeId];
        if (!employeeData || !employeeData.metrics) return 75;
        
        return employeeData.metrics.wellnessScore || 75;
    }
    
    getEmployeeMetrics(employeeId) {
        if (!employeeId) return {};
        
        const employeeData = this.wellnessData.employees[employeeId];
        if (!employeeData) return {};
        
        return {
            hoursWorked: this.getEmployeeWeeklyHours(employeeId),
            consecutiveDays: this.getEmployeeConsecutiveDays(employeeId),
            stressLevel: employeeData.metrics?.averageStress || 5,
            workLifeBalance: employeeData.metrics?.averageMood * 2 || 5
        };
    }
    
    getEmployeeWeeklyHours(employeeId) {
        // This would integrate with the schedule system to get actual hours
        return Math.floor(Math.random() * 20) + 35; // Mock data: 35-55 hours
    }
    
    getEmployeeConsecutiveDays(employeeId) {
        // This would integrate with the schedule system to get consecutive days
        return Math.floor(Math.random() * 7) + 1; // Mock data: 1-7 days
    }
    
    checkForAlerts(employeeId) {
        const metrics = this.getEmployeeMetrics(employeeId);
        const wellnessScore = this.calculateEmployeeWellnessScore(employeeId);
        const alerts = [];
        
        // Check for burnout risk
        if (wellnessScore < this.settings.burnoutThreshold) {
            alerts.push({
                id: Utils.generateId('alert'),
                employeeId,
                type: 'burnout_risk',
                severity: wellnessScore < 50 ? 'high' : 'medium',
                title: 'Burnout Risk Detected',
                description: `Employee wellness score (${wellnessScore}) is below threshold`,
                date: new Date().toISOString()
            });
        }
        
        // Check for excessive consecutive days
        if (metrics.consecutiveDays > this.settings.maxConsecutiveDays) {
            alerts.push({
                id: Utils.generateId('alert'),
                employeeId,
                type: 'consecutive_days',
                severity: 'medium',
                title: 'Too Many Consecutive Days',
                description: `Employee has worked ${metrics.consecutiveDays} consecutive days`,
                date: new Date().toISOString()
            });
        }
        
        // Check for excessive hours
        if (metrics.hoursWorked > this.settings.maxWeeklyHours) {
            alerts.push({
                id: Utils.generateId('alert'),
                employeeId,
                type: 'excessive_hours',
                severity: 'high',
                title: 'Excessive Weekly Hours',
                description: `Employee has worked ${metrics.hoursWorked} hours this week`,
                date: new Date().toISOString()
            });
        }
        
        this.wellnessData.alerts.push(...alerts);
        this.saveWellnessData();
        
        // Show immediate notifications for high severity alerts
        alerts.filter(alert => alert.severity === 'high').forEach(alert => {
            this.showNotification(alert.title, 'warning');
        });
    }
    
    getWellnessTrends() {
        // Mock trend data - in real implementation, this would calculate from historical data
        return {
            averageScore: 78,
            scoreChange: { direction: 'trend-up', text: '+5 from last week' },
            averageStress: 4.2,
            stressChange: { direction: 'trend-down', text: '-0.8 from last week' },
            sleepAverage: 7.2,
            sleepChange: { direction: 'trend-up', text: '+0.5 from last week' },
            workLifeBalance: 7.8,
            balanceChange: { direction: 'trend-stable', text: 'No change' }
        };
    }
    
    getTeamWellnessData() {
        // Mock team data - in real implementation, this would aggregate from all employees
        return {
            averageScore: 82,
            atRiskEmployees: 2,
            activeChallenges: 3,
            participationRate: 85,
            challenges: [
                {
                    name: '10,000 Steps Challenge',
                    description: 'Team goal: 10,000 steps per day for the month',
                    progress: 68
                },
                {
                    name: 'Meditation Streak',
                    description: '5 minutes of meditation daily',
                    progress: 42
                },
                {
                    name: 'Healthy Lunch Challenge',
                    description: 'Bring healthy lunch 4 days per week',
                    progress: 91
                }
            ]
        };
    }
    
    getWellnessAlerts() {
        // Return recent alerts that haven't been dismissed
        return this.wellnessData.alerts.slice(-5).map(alert => ({
            ...alert,
            severity: alert.severity || 'medium'
        }));
    }
    
    getDayWellnessScore(date) {
        // Mock day wellness score - in real implementation, this would be calculated from daily data
        return Math.floor(Math.random() * 40) + 60; // Random score between 60-100
    }
    
    handleAlert(alertId) {
        const alert = this.wellnessData.alerts.find(a => a.id === alertId);
        if (!alert) return;
        
        // Show action modal or redirect to appropriate action
        this.showNotification(`Taking action for: ${alert.title}`, 'info');
        
        // Mark alert as handled
        alert.handled = true;
        this.saveWellnessData();
        this.renderWellnessView();
    }
    
    dismissAlert(alertId) {
        const alertIndex = this.wellnessData.alerts.findIndex(a => a.id === alertId);
        if (alertIndex === -1) return;
        
        this.wellnessData.alerts.splice(alertIndex, 1);
        this.saveWellnessData();
        this.renderWellnessView();
        this.showNotification('Alert dismissed', 'info');
    }
    
    openResource(url) {
        if (url === '#') {
            this.showNotification('Resource would open in new window', 'info');
        } else {
            window.open(url, '_blank');
        }
    }
    
    getCurrentEmployee() {
        // This would integrate with the main employee system
        return { id: 'emp_001', name: 'Demo Employee' };
    }
    
    startWellnessTracking() {
        // Start periodic wellness checks and automatic data collection
        setInterval(() => {
            this.performAutomaticChecks();
        }, 300000); // Every 5 minutes
    }
    
    performAutomaticChecks() {
        // Perform automatic wellness checks based on schedule data
        const allEmployees = this.getAllEmployees();
        
        allEmployees.forEach(employee => {
            this.checkForAlerts(employee.id);
        });
    }
    
    getAllEmployees() {
        // This would integrate with the main employee system
        return [
            { id: 'emp_001', name: 'Demo Employee' }
        ];
    }
    
    initializeResources() {
        return {
            mentalHealth: [
                {
                    title: 'Employee Assistance Program',
                    description: 'Free confidential counseling services',
                    url: '#'
                },
                {
                    title: 'Stress Management Techniques',
                    description: 'Learn effective ways to manage workplace stress',
                    url: '#'
                },
                {
                    title: 'Mindfulness Meditation',
                    description: '10-minute guided meditation sessions',
                    url: '#'
                }
            ],
            physical: [
                {
                    title: 'Desk Exercises',
                    description: 'Simple exercises you can do at your workstation',
                    url: '#'
                },
                {
                    title: 'Ergonomic Guidelines',
                    description: 'Set up your workspace for optimal comfort',
                    url: '#'
                },
                {
                    title: 'Walking Program',
                    description: 'Join our daily walking group',
                    url: '#'
                }
            ],
            workLife: [
                {
                    title: 'Time Management Tips',
                    description: 'Improve your work-life balance',
                    url: '#'
                },
                {
                    title: 'Remote Work Best Practices',
                    description: 'Stay productive while working from home',
                    url: '#'
                },
                {
                    title: 'Boundary Setting',
                    description: 'Learn to set healthy work boundaries',
                    url: '#'
                }
            ]
        };
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

// Initialize wellness hub
window.wellnessHub = new WellnessHub();
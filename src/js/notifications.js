// Notifications system
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.subscribers = new Map();
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        this.loadNotifications();
        this.setupNotificationContainer();
        this.requestNotificationPermission();
        this.isInitialized = true;
    }
    
    loadNotifications() {
        this.notifications = Utils.getLocalStorage('system_notifications', []);
    }
    
    saveNotifications() {
        Utils.setLocalStorage('system_notifications', this.notifications);
    }
    
    setupNotificationContainer() {
        let container = Utils.$('#notification-system');
        if (!container) {
            container = Utils.createElement('div', {
                id: 'notification-system',
                style: 'position: fixed; top: 1rem; right: 1rem; z-index: 10001;'
            });
            document.body.appendChild(container);
        }
    }
    
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                await Notification.requestPermission();
            } catch (error) {
                console.log('Notification permission request failed:', error);
            }
        }
    }
    
    show(message, type = 'info', duration = 5000, options = {}) {
        const notification = {
            id: Utils.generateId('notification'),
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false,
            ...options
        };
        
        this.notifications.unshift(notification);
        
        // Keep only last 100 notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }
        
        this.saveNotifications();
        this.renderNotification(notification, duration);
        
        // Send browser notification for important types
        if (['warning', 'error'].includes(type)) {
            this.sendBrowserNotification(notification);
        }
        
        // Notify subscribers
        this.notifySubscribers('notification_added', notification);
        
        return notification.id;
    }
    
    renderNotification(notification, duration = 5000) {
        const container = Utils.$('#notification-system');
        if (!container) return;
        
        const element = Utils.createElement('div', {
            className: `notification ${notification.type}`,
            style: 'margin-bottom: 0.5rem; animation: slideIn 0.3s ease-out;',
            innerHTML: `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                    <div style="flex: 1;">
                        ${notification.title ? `<div style="font-weight: 600; margin-bottom: 0.25rem;">${notification.title}</div>` : ''}
                        <div>${notification.message}</div>
                        ${notification.actions ? this.renderNotificationActions(notification.actions, notification.id) : ''}
                    </div>
                    <button onclick="notificationSystem.dismiss('${notification.id}')" 
                            style="background: none; border: none; font-size: 1.2rem; cursor: pointer; opacity: 0.6; line-height: 1;">×</button>
                </div>
            `
        });
        
        element.dataset.notificationId = notification.id;
        container.appendChild(element);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(notification.id);
            }, duration);
        }
    }
    
    renderNotificationActions(actions, notificationId) {
        return `
            <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                ${actions.map(action => `
                    <button class="btn btn-sm btn-${action.type || 'secondary'}" 
                            onclick="notificationSystem.handleAction('${notificationId}', '${action.id}')">
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }
    
    dismiss(notificationId) {
        const element = Utils.$(`[data-notification-id="${notificationId}"]`);
        if (element) {
            element.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                element.remove();
            }, 300);
        }
        
        // Mark as read
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveNotifications();
        }
    }
    
    handleAction(notificationId, actionId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification || !notification.actions) return;
        
        const action = notification.actions.find(a => a.id === actionId);
        if (!action) return;
        
        // Execute action callback
        if (action.callback && typeof action.callback === 'function') {
            action.callback(notification);
        } else if (action.callback && typeof action.callback === 'string') {
            // Execute global function
            if (window[action.callback]) {
                window[action.callback](notification);
            }
        }
        
        // Dismiss notification after action
        this.dismiss(notificationId);
        
        // Notify subscribers
        this.notifySubscribers('notification_action', { notification, action });
    }
    
    sendBrowserNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const browserNotification = new Notification(notification.title || 'NSG Schedule', {
                    body: notification.message,
                    icon: '/public/icons/icon-192x192.png',
                    badge: '/public/icons/icon-192x192.png',
                    tag: notification.id,
                    requireInteraction: notification.type === 'error'
                });
                
                browserNotification.onclick = () => {
                    window.focus();
                    browserNotification.close();
                };
                
                // Auto-close browser notification
                setTimeout(() => {
                    browserNotification.close();
                }, 10000);
                
            } catch (error) {
                console.error('Browser notification failed:', error);
            }
        }
    }
    
    // Subscription system for components to listen to notifications
    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
        
        return () => {
            const callbacks = this.subscribers.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index !== -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
    
    notifySubscribers(event, data) {
        const callbacks = this.subscribers.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Notification subscriber error:', error);
                }
            });
        }
    }
    
    // Predefined notification types for common scenarios
    success(message, options = {}) {
        return this.show(message, 'success', 3000, options);
    }
    
    error(message, options = {}) {
        return this.show(message, 'error', 0, options); // Don't auto-dismiss errors
    }
    
    warning(message, options = {}) {
        return this.show(message, 'warning', 7000, options);
    }
    
    info(message, options = {}) {
        return this.show(message, 'info', 5000, options);
    }
    
    // Schedule-specific notifications
    scheduleChanged(employeeId, date, oldShift, newShift) {
        const employee = window.scheduleCore?.getEmployee(employeeId);
        const employeeName = employee?.name || 'Employee';
        
        this.show(
            `Schedule updated for ${employeeName} on ${Utils.formatDate(new Date(date), 'long')}`,
            'info',
            5000,
            {
                title: 'Schedule Change',
                actions: [
                    {
                        id: 'view_schedule',
                        label: 'View Schedule',
                        type: 'primary',
                        callback: () => window.scheduleApp?.showView('schedule')
                    },
                    {
                        id: 'notify_employee',
                        label: 'Notify Employee',
                        type: 'secondary',
                        callback: (notification) => this.notifyEmployeeOfChange(employeeId, date, newShift)
                    }
                ]
            }
        );
    }
    
    ptoRequestSubmitted(request) {
        const employee = window.scheduleCore?.getEmployee(request.employeeId);
        const employeeName = employee?.name || 'Employee';
        
        this.show(
            `${employeeName} submitted a PTO request for ${request.startDate} to ${request.endDate}`,
            'info',
            0,
            {
                title: 'New PTO Request',
                actions: [
                    {
                        id: 'approve_pto',
                        label: 'Approve',
                        type: 'success',
                        callback: () => this.approvePTORequest(request.id)
                    },
                    {
                        id: 'review_pto',
                        label: 'Review',
                        type: 'primary',
                        callback: () => this.showPTOReview(request.id)
                    }
                ]
            }
        );
    }
    
    wellnessAlert(alert) {
        const employee = window.scheduleCore?.getEmployee(alert.employeeId);
        const employeeName = employee?.name || 'Employee';
        
        const severityType = {
            'low': 'info',
            'medium': 'warning',
            'high': 'error'
        }[alert.severity] || 'warning';
        
        this.show(
            `${employeeName}: ${alert.description}`,
            severityType,
            severityType === 'error' ? 0 : 10000,
            {
                title: `Wellness Alert - ${Utils.capitalizeWords(alert.severity)}`,
                actions: [
                    {
                        id: 'view_wellness',
                        label: 'View Wellness',
                        type: 'primary',
                        callback: () => window.scheduleApp?.showView('wellness')
                    },
                    {
                        id: 'contact_employee',
                        label: 'Contact Employee',
                        type: 'warning',
                        callback: () => this.contactEmployee(alert.employeeId)
                    }
                ]
            }
        );
    }
    
    calendarSyncComplete(results) {
        const totalSynced = Object.values(results).reduce((sum, count) => sum + count, 0);
        
        this.success(
            `Calendar sync completed. ${totalSynced} events synchronized.`,
            {
                title: 'Calendar Sync',
                actions: [
                    {
                        id: 'view_calendar',
                        label: 'View Calendar',
                        type: 'primary',
                        callback: () => window.scheduleApp?.showView('calendar')
                    }
                ]
            }
        );
    }
    
    calendarConflictDetected(conflicts) {
        this.warning(
            `${conflicts.length} calendar conflict${conflicts.length > 1 ? 's' : ''} detected`,
            {
                title: 'Calendar Conflicts',
                actions: [
                    {
                        id: 'resolve_conflicts',
                        label: 'Resolve Conflicts',
                        type: 'warning',
                        callback: () => window.calendarIntegration?.renderCalendarView()
                    }
                ]
            }
        );
    }
    
    // Action handlers
    notifyEmployeeOfChange(employeeId, date, newShift) {
        // Add notification to employee's notification list
        if (window.employeePortal) {
            window.employeePortal.addNotification({
                employeeId,
                type: 'schedule_change',
                title: 'Schedule Updated',
                message: `Your shift for ${Utils.formatDate(new Date(date), 'long')} has been updated to: ${newShift}`
            });
        }
        
        this.success('Employee notified of schedule change');
    }
    
    approvePTORequest(requestId) {
        if (window.scheduleCore) {
            const approved = window.scheduleCore.approvePTORequest(requestId);
            if (approved) {
                this.success('PTO request approved');
                
                // Notify employee
                if (window.employeePortal) {
                    window.employeePortal.addNotification({
                        employeeId: approved.employeeId,
                        type: 'pto_update',
                        title: 'PTO Request Approved',
                        message: `Your PTO request for ${approved.startDate} to ${approved.endDate} has been approved.`
                    });
                }
            } else {
                this.error('Failed to approve PTO request');
            }
        }
    }
    
    showPTOReview(requestId) {
        // This would open a detailed PTO review modal
        this.info('PTO review interface would open here');
    }
    
    contactEmployee(employeeId) {
        const employee = window.scheduleCore?.getEmployee(employeeId);
        if (employee && employee.email) {
            // Open email client or contact form
            this.info(`Contact interface for ${employee.name} would open here`);
        } else {
            this.warning('Employee contact information not available');
        }
    }
    
    // Bulk notification management
    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }
    
    markAllRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveNotifications();
        this.notifySubscribers('notifications_marked_read', this.notifications);
    }
    
    clearAll() {
        this.notifications = [];
        this.saveNotifications();
        
        // Remove all notification elements
        const container = Utils.$('#notification-system');
        if (container) {
            container.innerHTML = '';
        }
        
        this.notifySubscribers('notifications_cleared', null);
    }
    
    // Get notifications for display in notification center
    getNotifications(limit = 50, includeRead = true) {
        let notifications = [...this.notifications];
        
        if (!includeRead) {
            notifications = notifications.filter(n => !n.read);
        }
        
        return notifications
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }
    
    // Notification center popup
    showNotificationCenter() {
        const existing = Utils.$('#notification-center-popup');
        if (existing) {
            existing.remove();
            return;
        }
        
        const notifications = this.getNotifications(20);
        
        const popup = Utils.createElement('div', {
            id: 'notification-center-popup',
            style: `
                position: fixed;
                top: 70px;
                right: 1rem;
                width: 350px;
                max-height: 500px;
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10002;
                overflow: hidden;
            `,
            innerHTML: `
                <div style="padding: 1rem; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0;">Notifications</h4>
                    <div>
                        <button onclick="notificationSystem.markAllRead()" style="background: none; border: none; color: #0d6efd; cursor: pointer; margin-right: 0.5rem;">Mark All Read</button>
                        <button onclick="notificationSystem.hideNotificationCenter()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">×</button>
                    </div>
                </div>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${notifications.length === 0 ? 
                        '<div style="padding: 2rem; text-align: center; color: #6c757d;">No notifications</div>' :
                        notifications.map(n => this.renderNotificationCenterItem(n)).join('')
                    }
                </div>
            `
        });
        
        document.body.appendChild(popup);
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick, true);
        }, 100);
    }
    
    hideNotificationCenter() {
        const popup = Utils.$('#notification-center-popup');
        if (popup) {
            popup.remove();
            document.removeEventListener('click', this.handleOutsideClick, true);
        }
    }
    
    handleOutsideClick = (e) => {
        const popup = Utils.$('#notification-center-popup');
        const trigger = Utils.$('#notification-center');
        
        if (popup && !popup.contains(e.target) && !trigger?.contains(e.target)) {
            this.hideNotificationCenter();
        }
    }
    
    renderNotificationCenterItem(notification) {
        const typeIcons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        return `
            <div style="padding: 1rem; border-bottom: 1px solid #f8f9fa; ${notification.read ? 'opacity: 0.7;' : ''}">
                <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                    <div style="font-size: 1.2rem;">${typeIcons[notification.type] || '📝'}</div>
                    <div style="flex: 1;">
                        ${notification.title ? `<div style="font-weight: 600; margin-bottom: 0.25rem; font-size: 0.9rem;">${notification.title}</div>` : ''}
                        <div style="font-size: 0.85rem; color: #495057;">${notification.message}</div>
                        <div style="font-size: 0.75rem; color: #6c757d; margin-top: 0.25rem;">
                            ${this.formatRelativeTime(notification.timestamp)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    formatRelativeTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMinutes = Math.floor((now - time) / 60000);
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
        
        return time.toLocaleDateString();
    }
}

// Add CSS for notification animations
const notificationStyles = `
<style>
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

.notification {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 1rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    max-width: 350px;
    position: relative;
}

.notification.success {
    border-left: 4px solid #28a745;
}

.notification.error {
    border-left: 4px solid #dc3545;
}

.notification.warning {
    border-left: 4px solid #ffc107;
}

.notification.info {
    border-left: 4px solid #17a2b8;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', notificationStyles);

// Initialize notification system
window.notificationSystem = new NotificationSystem();

// Set up notification center trigger
document.addEventListener('DOMContentLoaded', () => {
    const notificationTrigger = Utils.$('#notification-center');
    if (notificationTrigger) {
        notificationTrigger.addEventListener('click', () => {
            window.notificationSystem.showNotificationCenter();
        });
        
        // Update notification badge
        const updateBadge = () => {
            const unreadCount = window.notificationSystem.getUnreadCount();
            notificationTrigger.innerHTML = unreadCount > 0 ? `🔔 (${unreadCount})` : '🔔';
        };
        
        // Update badge on notification changes
        window.notificationSystem.subscribe('notification_added', updateBadge);
        window.notificationSystem.subscribe('notifications_marked_read', updateBadge);
        
        updateBadge();
    }
});
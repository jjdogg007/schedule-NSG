// Cloud Service Layer - Replaces all localStorage operations
// This module provides a cloud-first API for all data operations

class CloudService {
    constructor() {
        this.supabase = window.supabase.createClient(
            "https://ulefvfpvgfdavztlwmpu.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZWZ2ZnB2Z2ZkYXZ6dGx3bXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTIzMDksImV4cCI6MjA3MDA2ODMwOX0.Se8nQg3BZUAYnt3bahw7iNePXm8G3X5PbH83XHY8edo"
        );
        this.currentUser = null;
        this.currentCompany = null;
        this.realTimeSubscriptions = [];
        this.isOnline = navigator.onLine;
        
        // Monitor online status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.onConnectionStatusChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.onConnectionStatusChange(false);
        });
    }

    // ================== AUTHENTICATION ==================
    
    async signIn(email, password) {
        this.ensureOnline();
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        this.currentUser = data.user;
        await this.loadUserProfile();
        await this.logAuditEvent('login', {
            description: 'User signed in successfully',
            timestamp: new Date().toISOString()
        });
        
        return data;
    }

    async signUp(email, password, userData = {}) {
        this.ensureOnline();
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: userData
            }
        });
        
        if (error) throw error;
        return data;
    }

    async signOut() {
        this.ensureOnline();
        await this.logAuditEvent('logout', {
            description: 'User signed out',
            timestamp: new Date().toISOString()
        });
        
        // Clean up subscriptions
        this.cleanupSubscriptions();
        
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
        
        this.currentUser = null;
        this.currentCompany = null;
    }

    async getCurrentUser() {
        const { data: { user } } = await this.supabase.auth.getUser();
        this.currentUser = user;
        
        if (user) {
            await this.loadUserProfile();
        }
        
        return user;
    }

    async loadUserProfile() {
        if (!this.currentUser) return null;
        
        const { data, error } = await this.supabase
            .from('user_profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();
            
        if (error) throw error;
        
        this.currentUserProfile = data;
        return data;
    }

    // ================== EMPLOYEE MANAGEMENT ==================
    
    async getEmployees() {
        this.ensureOnline();
        const { data, error } = await this.supabase
            .from('employees')
            .select('*')
            .eq('company_id', this.currentCompany.id)
            .eq('is_active', true)
            .order('name');
            
        if (error) throw error;
        return data || [];
    }

    async saveEmployee(employeeData) {
        this.ensureOnline();
        const isUpdate = !!employeeData.id;
        
        if (isUpdate) {
            const { data, error } = await this.supabase
                .from('employees')
                .update({
                    ...employeeData,
                    company_id: this.currentCompany.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', employeeData.id)
                .select()
                .single();
                
            if (error) throw error;
            
            await this.logAuditEvent('employee_update', {
                description: `Updated employee: ${employeeData.name}`,
                entity_type: 'employee',
                entity_id: employeeData.id,
                after_value: employeeData
            });
            
            return data;
        } else {
            const { data, error } = await this.supabase
                .from('employees')
                .insert([{
                    ...employeeData,
                    company_id: this.currentCompany.id
                }])
                .select()
                .single();
                
            if (error) throw error;
            
            await this.logAuditEvent('employee_create', {
                description: `Created employee: ${employeeData.name}`,
                entity_type: 'employee',
                entity_id: data.id,
                after_value: employeeData
            });
            
            return data;
        }
    }

    async deleteEmployee(employeeId) {
        this.ensureOnline();
        const { data, error } = await this.supabase
            .from('employees')
            .update({ is_active: false })
            .eq('id', employeeId)
            .select()
            .single();
            
        if (error) throw error;
        
        await this.logAuditEvent('employee_delete', {
            description: `Deactivated employee: ${data.name}`,
            entity_type: 'employee',
            entity_id: employeeId
        });
        
        return data;
    }

    // ================== SCHEDULE MANAGEMENT ==================
    
    async getScheduleData(startDate, endDate) {
        this.ensureOnline();
        const { data, error } = await this.supabase
            .from('schedule_entries')
            .select(`
                *,
                employees:employee_id (
                    id,
                    name,
                    employee_type
                )
            `)
            .eq('company_id', this.currentCompany.id)
            .gte('date', startDate)
            .lte('date', endDate);
            
        if (error) throw error;
        
        // Transform to match existing data structure
        const scheduleData = {};
        data.forEach(entry => {
            const employeeName = entry.employees.name;
            if (!scheduleData[employeeName]) {
                scheduleData[employeeName] = {};
            }
            scheduleData[employeeName][entry.date] = entry.shift_time || '';
        });
        
        return scheduleData;
    }

    async updateScheduleEntry(employeeName, date, shiftTime, employeeId = null) {
        this.ensureOnline();
        
        if (!employeeId) {
            // Find employee ID by name
            const { data: employee } = await this.supabase
                .from('employees')
                .select('id')
                .eq('name', employeeName)
                .eq('company_id', this.currentCompany.id)
                .single();
            employeeId = employee?.id;
        }
        
        if (!employeeId) throw new Error('Employee not found');
        
        const { data, error } = await this.supabase
            .from('schedule_entries')
            .upsert({
                company_id: this.currentCompany.id,
                employee_id: employeeId,
                date: date,
                shift_time: shiftTime,
                is_pto: shiftTime?.toUpperCase() === 'PTO'
            })
            .select()
            .single();
            
        if (error) throw error;
        
        await this.logAuditEvent('schedule_change', {
            description: `Updated schedule for ${employeeName} on ${date}`,
            entity_type: 'schedule_entry',
            entity_id: data.id,
            after_value: { employeeName, date, shiftTime }
        });
        
        return data;
    }

    async clearSchedule() {
        this.ensureOnline();
        const { error } = await this.supabase
            .from('schedule_entries')
            .delete()
            .eq('company_id', this.currentCompany.id);
            
        if (error) throw error;
        
        await this.logAuditEvent('schedule_clear', {
            description: 'Cleared all schedule data',
            entity_type: 'schedule_entry'
        });
    }

    // ================== NOTES MANAGEMENT ==================
    
    async getScheduleNotes(startDate, endDate) {
        this.ensureOnline();
        const { data, error } = await this.supabase
            .from('schedule_notes')
            .select(`
                *,
                employees:employee_id (
                    name
                )
            `)
            .eq('company_id', this.currentCompany.id)
            .gte('date', startDate)
            .lte('date', endDate);
            
        if (error) throw error;
        
        // Transform to match existing data structure
        const notesData = {};
        data.forEach(note => {
            const employeeName = note.employees.name;
            if (!notesData[employeeName]) {
                notesData[employeeName] = {};
            }
            notesData[employeeName][note.date] = note.note_text;
        });
        
        return notesData;
    }

    async saveScheduleNote(employeeName, date, noteText, employeeId = null) {
        this.ensureOnline();
        
        if (!employeeId) {
            const { data: employee } = await this.supabase
                .from('employees')
                .select('id')
                .eq('name', employeeName)
                .eq('company_id', this.currentCompany.id)
                .single();
            employeeId = employee?.id;
        }
        
        if (!employeeId) throw new Error('Employee not found');
        
        const { data, error } = await this.supabase
            .from('schedule_notes')
            .upsert({
                company_id: this.currentCompany.id,
                employee_id: employeeId,
                date: date,
                note_text: noteText,
                created_by: this.currentUser.id
            })
            .select()
            .single();
            
        if (error) throw error;
        return data;
    }

    // ================== PTO MANAGEMENT ==================
    
    async getPTORequests(status = null) {
        this.ensureOnline();
        let query = this.supabase
            .from('pto_requests')
            .select(`
                *,
                employees:employee_id (
                    name,
                    email
                ),
                approved_by_user:approved_by (
                    email
                )
            `)
            .eq('company_id', this.currentCompany.id);
            
        if (status) {
            query = query.eq('status', status);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async submitPTORequest(ptoData) {
        this.ensureOnline();
        const { data, error } = await this.supabase
            .from('pto_requests')
            .insert([{
                ...ptoData,
                company_id: this.currentCompany.id
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        await this.logAuditEvent('pto_request', {
            description: `Submitted PTO request for ${ptoData.start_date} to ${ptoData.end_date}`,
            entity_type: 'pto_request',
            entity_id: data.id,
            after_value: ptoData
        });
        
        return data;
    }

    async updatePTORequest(requestId, updates) {
        this.ensureOnline();
        const { data, error } = await this.supabase
            .from('pto_requests')
            .update(updates)
            .eq('id', requestId)
            .select()
            .single();
            
        if (error) throw error;
        
        await this.logAuditEvent('pto_update', {
            description: `Updated PTO request status to ${updates.status}`,
            entity_type: 'pto_request',
            entity_id: requestId,
            after_value: updates
        });
        
        return data;
    }

    // ================== ANNOUNCEMENTS ==================
    
    async getAnnouncements() {
        this.ensureOnline();
        const { data, error } = await this.supabase
            .from('announcements')
            .select(`
                *,
                author:author_id (
                    email
                )
            `)
            .eq('company_id', this.currentCompany.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
    }

    async createAnnouncement(announcementData) {
        this.ensureOnline();
        const { data, error } = await this.supabase
            .from('announcements')
            .insert([{
                ...announcementData,
                company_id: this.currentCompany.id,
                author_id: this.currentUser.id
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        await this.logAuditEvent('announcement_create', {
            description: `Created announcement: ${announcementData.title}`,
            entity_type: 'announcement',
            entity_id: data.id
        });
        
        return data;
    }

    // ================== AUDIT LOGS ==================
    
    async logAuditEvent(action, details) {
        try {
            const { error } = await this.supabase
                .from('audit_logs')
                .insert([{
                    company_id: this.currentCompany?.id,
                    user_id: this.currentUser?.id,
                    action,
                    description: details.description,
                    entity_type: details.entity_type,
                    entity_id: details.entity_id,
                    before_value: details.before_value,
                    after_value: details.after_value,
                    ip_address: 'client-side',
                    user_agent: navigator.userAgent
                }]);
                
            if (error) console.error('Audit log error:', error);
        } catch (error) {
            console.error('Failed to log audit event:', error);
        }
    }

    async getAuditLogs(filters = {}) {
        this.ensureOnline();
        let query = this.supabase
            .from('audit_logs')
            .select(`
                *,
                user:user_id (
                    email
                )
            `)
            .eq('company_id', this.currentCompany.id);
            
        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
        }
        if (filters.action) {
            query = query.ilike('action', `%${filters.action}%`);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false }).limit(1000);
        if (error) throw error;
        return data || [];
    }

    // ================== TIME TRACKING ==================
    
    async clockIn(locationData = null) {
        this.ensureOnline();
        const { data, error } = await this.supabase
            .from('time_entries')
            .insert([{
                company_id: this.currentCompany.id,
                employee_id: this.getCurrentEmployeeId(),
                entry_type: 'clock_in',
                location_data: locationData,
                location_verified: this.verifyLocation(locationData)
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        await this.logAuditEvent('clock_in', {
            description: 'Employee clocked in',
            entity_type: 'time_entry',
            entity_id: data.id
        });
        
        return data;
    }

    async clockOut(locationData = null) {
        this.ensureOnline();
        const { data, error } = await this.supabase
            .from('time_entries')
            .insert([{
                company_id: this.currentCompany.id,
                employee_id: this.getCurrentEmployeeId(),
                entry_type: 'clock_out',
                location_data: locationData,
                location_verified: this.verifyLocation(locationData)
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        await this.logAuditEvent('clock_out', {
            description: 'Employee clocked out',
            entity_type: 'time_entry',
            entity_id: data.id
        });
        
        return data;
    }

    // ================== REAL-TIME SUBSCRIPTIONS ==================
    
    setupRealTimeSubscriptions() {
        if (!this.currentCompany) return;
        
        // Subscribe to schedule changes
        const scheduleSubscription = this.supabase
            .channel('schedule_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'schedule_entries',
                filter: `company_id=eq.${this.currentCompany.id}`
            }, (payload) => {
                this.onScheduleChange(payload);
            })
            .subscribe();
            
        // Subscribe to PTO request changes
        const ptoSubscription = this.supabase
            .channel('pto_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'pto_requests',
                filter: `company_id=eq.${this.currentCompany.id}`
            }, (payload) => {
                this.onPTOChange(payload);
            })
            .subscribe();
            
        // Subscribe to announcements
        const announcementSubscription = this.supabase
            .channel('announcement_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'announcements',
                filter: `company_id=eq.${this.currentCompany.id}`
            }, (payload) => {
                this.onAnnouncementChange(payload);
            })
            .subscribe();
            
        // Subscribe to notifications
        const notificationSubscription = this.supabase
            .channel('notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `recipient_id=eq.${this.currentUser.id}`
            }, (payload) => {
                this.onNotificationReceived(payload);
            })
            .subscribe();
            
        this.realTimeSubscriptions = [
            scheduleSubscription,
            ptoSubscription,
            announcementSubscription,
            notificationSubscription
        ];
    }

    cleanupSubscriptions() {
        this.realTimeSubscriptions.forEach(subscription => {
            this.supabase.removeChannel(subscription);
        });
        this.realTimeSubscriptions = [];
    }

    // ================== UTILITY METHODS ==================
    
    ensureOnline() {
        if (!this.isOnline) {
            throw new Error('This application requires an internet connection. Please check your network and try again.');
        }
    }

    onConnectionStatusChange(isOnline) {
        if (isOnline) {
            this.showNotification('Connection restored - you are back online!', 'success');
            // Attempt to reconnect real-time subscriptions
            this.setupRealTimeSubscriptions();
        } else {
            this.showNotification('Connection lost - you are now offline. Please check your internet connection.', 'error');
            this.cleanupSubscriptions();
        }
    }

    getCurrentEmployeeId() {
        // This should be implemented based on your employee selection logic
        // For now, return null - you'll need to implement this based on your UI
        return this.currentEmployeeId || null;
    }

    verifyLocation(locationData) {
        if (!locationData || !this.currentCompany?.workplace_location) return false;
        
        const workplace = this.currentCompany.workplace_location;
        const distance = this.calculateDistance(
            locationData.lat,
            locationData.lng,
            workplace.lat,
            workplace.lng
        );
        
        return distance <= workplace.radius;
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }

    showNotification(message, type = 'info') {
        // This will integrate with your existing notification system
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // ================== EVENT HANDLERS (to be implemented by the application) ==================
    
    onScheduleChange(payload) {
        // Implement in main application
        if (window.onCloudScheduleChange) {
            window.onCloudScheduleChange(payload);
        }
    }

    onPTOChange(payload) {
        // Implement in main application
        if (window.onCloudPTOChange) {
            window.onCloudPTOChange(payload);
        }
    }

    onAnnouncementChange(payload) {
        // Implement in main application
        if (window.onCloudAnnouncementChange) {
            window.onCloudAnnouncementChange(payload);
        }
    }

    onNotificationReceived(payload) {
        // Implement in main application
        if (window.onCloudNotificationReceived) {
            window.onCloudNotificationReceived(payload);
        }
    }
}

// Export the service for use in the main application
window.CloudService = CloudService;
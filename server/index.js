const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/src', express.static('src'));
app.use('/config', express.static('config'));

// Calendar API endpoints
app.get('/api/calendar/work-schedule.ics', (req, res) => {
    // Generate iCal format for work schedules
    const icalContent = generateWorkScheduleICal();
    res.set({
        'Content-Type': 'text/calendar',
        'Content-Disposition': 'attachment; filename=work-schedule.ics'
    });
    res.send(icalContent);
});

app.get('/api/calendar/pto.ics', (req, res) => {
    // Generate iCal format for PTO
    const icalContent = generatePTOICal();
    res.set({
        'Content-Type': 'text/calendar',
        'Content-Disposition': 'attachment; filename=pto.ics'
    });
    res.send(icalContent);
});

app.get('/api/calendar/meetings.ics', (req, res) => {
    // Generate iCal format for meetings
    const icalContent = generateMeetingsICal();
    res.set({
        'Content-Type': 'text/calendar',
        'Content-Disposition': 'attachment; filename=meetings.ics'
    });
    res.send(icalContent);
});

app.get('/api/calendar/training.ics', (req, res) => {
    // Generate iCal format for training
    const icalContent = generateTrainingICal();
    res.set({
        'Content-Type': 'text/calendar',
        'Content-Disposition': 'attachment; filename=training.ics'
    });
    res.send(icalContent);
});

// Wellness API endpoints
app.get('/api/wellness/dashboard/:employeeId', (req, res) => {
    const { employeeId } = req.params;
    // Return wellness dashboard data
    res.json({
        employeeId,
        wellnessScore: 82,
        metrics: {
            stress: 4,
            energy: 7,
            sleep: 7.5,
            mood: 8
        },
        trends: {
            weekly: [75, 78, 80, 82, 85, 83, 82],
            monthly: [78, 80, 82]
        }
    });
});

app.post('/api/wellness/checkin', (req, res) => {
    const { employeeId, mood, energy, stress, sleep, notes } = req.body;
    
    // Save wellness check-in
    console.log('Wellness check-in received:', { employeeId, mood, energy, stress, sleep });
    
    res.json({
        success: true,
        message: 'Wellness check-in saved successfully',
        wellnessScore: calculateWellnessScore({ mood, energy, stress, sleep })
    });
});

app.get('/api/wellness/alerts', (req, res) => {
    // Return wellness alerts
    res.json([
        {
            id: 'alert_1',
            type: 'burnout_risk',
            severity: 'medium',
            title: 'Burnout Risk Detected',
            description: 'Employee has worked excessive hours this week',
            employeeId: 'emp_001'
        }
    ]);
});

// Google Calendar OAuth endpoints
app.get('/auth/google', (req, res) => {
    // Redirect to Google OAuth
    const redirectUrl = 'https://accounts.google.com/oauth/authorize' +
        '?client_id=' + process.env.GOOGLE_CLIENT_ID +
        '&redirect_uri=' + encodeURIComponent(process.env.GOOGLE_REDIRECT_URI) +
        '&scope=' + encodeURIComponent('https://www.googleapis.com/auth/calendar') +
        '&response_type=code' +
        '&access_type=offline';
    
    res.redirect(redirectUrl);
});

app.get('/auth/google/callback', (req, res) => {
    const { code } = req.query;
    // Handle Google OAuth callback
    console.log('Google OAuth callback received:', code);
    res.redirect('/#calendar?connected=google');
});

// Microsoft OAuth endpoints
app.get('/auth/microsoft', (req, res) => {
    // Redirect to Microsoft OAuth
    const redirectUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize' +
        '?client_id=' + process.env.MICROSOFT_CLIENT_ID +
        '&response_type=code' +
        '&redirect_uri=' + encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI) +
        '&scope=' + encodeURIComponent('https://graph.microsoft.com/calendars.readwrite');
    
    res.redirect(redirectUrl);
});

app.get('/auth/microsoft/callback', (req, res) => {
    const { code } = req.query;
    // Handle Microsoft OAuth callback
    console.log('Microsoft OAuth callback received:', code);
    res.redirect('/#calendar?connected=microsoft');
});

// Schedule API endpoints
app.get('/api/schedule/:month', (req, res) => {
    const { month } = req.params;
    // Return schedule data for the month
    res.json({
        month,
        employees: [],
        schedule: {},
        openShifts: []
    });
});

app.post('/api/schedule/generate', (req, res) => {
    const { month, employees, constraints } = req.body;
    // Generate schedule
    console.log('Schedule generation requested for:', month);
    res.json({
        success: true,
        message: 'Schedule generated successfully'
    });
});

// Employee API endpoints
app.get('/api/employees', (req, res) => {
    // Return all employees
    res.json([
        {
            id: 'emp_001',
            name: 'Demo Employee',
            type: 'FT',
            email: 'demo@company.com',
            shifts: '9a-5p',
            availability: 'Mon,Tue,Wed,Thu,Fri'
        }
    ]);
});

app.post('/api/employees', (req, res) => {
    const employee = req.body;
    // Save employee
    console.log('Employee saved:', employee);
    res.json({
        success: true,
        employee: { ...employee, id: 'emp_' + Date.now() }
    });
});

// PTO API endpoints
app.get('/api/pto/requests', (req, res) => {
    // Return PTO requests
    res.json([
        {
            id: 'pto_001',
            employeeId: 'emp_001',
            startDate: '2024-03-15',
            endDate: '2024-03-17',
            type: 'vacation',
            status: 'pending',
            notes: 'Family vacation'
        }
    ]);
});

app.post('/api/pto/request', (req, res) => {
    const ptoRequest = req.body;
    // Save PTO request
    console.log('PTO request submitted:', ptoRequest);
    res.json({
        success: true,
        request: { ...ptoRequest, id: 'pto_' + Date.now(), status: 'pending' }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Catch all handler for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Helper functions
function generateWorkScheduleICal() {
    const now = new Date();
    const ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//NSG Schedule//Work Schedule//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Work Schedule',
        'X-WR-TIMEZONE:America/New_York',
        'BEGIN:VEVENT',
        'UID:work-shift-001@nsg-schedule.com',
        'DTSTAMP:' + formatDateForICal(now),
        'DTSTART:' + formatDateForICal(new Date(now.getTime() + 24*60*60*1000), '090000'),
        'DTEND:' + formatDateForICal(new Date(now.getTime() + 24*60*60*1000), '170000'),
        'SUMMARY:Work Shift - Demo Employee',
        'DESCRIPTION:Regular work shift',
        'LOCATION:Office',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    
    return ical;
}

function generatePTOICal() {
    const now = new Date();
    const ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//NSG Schedule//PTO Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:PTO Calendar',
        'X-WR-TIMEZONE:America/New_York',
        'BEGIN:VEVENT',
        'UID:pto-001@nsg-schedule.com',
        'DTSTAMP:' + formatDateForICal(now),
        'DTSTART;VALUE=DATE:' + formatDateForICal(new Date(now.getTime() + 7*24*60*60*1000)),
        'DTEND;VALUE=DATE:' + formatDateForICal(new Date(now.getTime() + 9*24*60*60*1000)),
        'SUMMARY:PTO - Demo Employee',
        'DESCRIPTION:Vacation time off',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    
    return ical;
}

function generateMeetingsICal() {
    const now = new Date();
    const ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//NSG Schedule//Meetings//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Team Meetings',
        'X-WR-TIMEZONE:America/New_York',
        'BEGIN:VEVENT',
        'UID:meeting-001@nsg-schedule.com',
        'DTSTAMP:' + formatDateForICal(now),
        'DTSTART:' + formatDateForICal(new Date(now.getTime() + 2*24*60*60*1000), '140000'),
        'DTEND:' + formatDateForICal(new Date(now.getTime() + 2*24*60*60*1000), '150000'),
        'SUMMARY:Team Meeting',
        'DESCRIPTION:Weekly team sync meeting',
        'LOCATION:Conference Room A',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    
    return ical;
}

function generateTrainingICal() {
    const now = new Date();
    const ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//NSG Schedule//Training//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Training Sessions',
        'X-WR-TIMEZONE:America/New_York',
        'BEGIN:VEVENT',
        'UID:training-001@nsg-schedule.com',
        'DTSTAMP:' + formatDateForICal(now),
        'DTSTART:' + formatDateForICal(new Date(now.getTime() + 5*24*60*60*1000), '100000'),
        'DTEND:' + formatDateForICal(new Date(now.getTime() + 5*24*60*60*1000), '120000'),
        'SUMMARY:Safety Training',
        'DESCRIPTION:Monthly safety training session',
        'LOCATION:Training Room',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    
    return ical;
}

function formatDateForICal(date, time = null) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (time) {
        return `${year}${month}${day}T${time}Z`;
    }
    return `${year}${month}${day}`;
}

function calculateWellnessScore(metrics) {
    const { mood = 5, energy = 5, stress = 5, sleep = 7 } = metrics;
    
    let score = 50; // Base score
    score += (mood - 3) * 10;      // Mood impact
    score += (energy - 5) * 8;     // Energy impact
    score -= (stress - 5) * 8;     // Stress impact (negative)
    score += (sleep - 7) * 5;      // Sleep impact
    
    return Math.max(0, Math.min(100, Math.round(score)));
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`NSG Schedule server running on port ${PORT}`);
    console.log(`Access the application at http://localhost:${PORT}`);
});
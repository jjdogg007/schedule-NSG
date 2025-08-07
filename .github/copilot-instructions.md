# Schedule-NSG: Definitive Schedule Generator

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

The Schedule-NSG repository contains a single-file HTML application called "Definitive Schedule Generator" - a complete employee scheduling workspace with PTO management, Excel integration, and workload analysis capabilities.

## Working Effectively

### Bootstrap and Run the Application
- **NO BUILD REQUIRED**: This is a static HTML application with no build system, package.json, or dependencies to install.
- Start a static file server to serve the HTML file:
  - `cd /home/runner/work/schedule-NSG/schedule-NSG`
  - `python3 -m http.server 8000` - NEVER CANCEL: Server starts instantly (< 5 seconds)
  - Access application at: `http://localhost:8000/final_fixed_schedule%20(1)_032416.html`
- Alternative server options:
  - `npx serve .` (if serve is installed)
  - `php -S localhost:8000` (if PHP available)

### Application Architecture
- **Single file**: `final_fixed_schedule (1)_032416.html` (3,821 lines)
- **Self-contained**: HTML structure + CSS styling + JavaScript functionality in one file
- **External dependencies via CDN**:
  - Supabase v2.39.3 (cloud database/storage)
  - XLSX.js v0.18.5 (Excel import/export)
  - jsPDF v2.5.1 (PDF generation)
  - QR Code Generator v1.4.4
- **Data persistence**: Browser localStorage (works offline, cloud features require CDN access)

## Validation Scenarios

**ALWAYS test the complete user workflow after making any changes:**

1. **Basic Application Setup**:
   - Start static file server: `python3 -m http.server 8000`
   - Navigate to the application URL
   - Verify page loads with "Definitive Schedule Generator" title
   - Confirm all UI sections are visible: Admin & Setup, Scheduling Actions, Export to Excel

2. **Employee Management Test**:
   - Click "👥 Manage Employees" button
   - Add test employee: Name="Smith, John", Type="Full Time", Hours=160, Email="test@test.com", Hire Date="2024-01-01"
   - Click "💾 Save Employee" 
   - Verify employee appears in Current Roster table
   - Close modal and verify employee appears in schedule grid

3. **Schedule Generation Test**:
   - Click "✨ Generate Full Schedule" button
   - Accept confirmation dialog
   - Verify success message appears
   - Check that employee appears in Interactive Schedule Preview
   - Verify workload dashboard updates with employee data

4. **Data Persistence Test**:
   - Refresh the browser page
   - Verify employee data persists (stored in localStorage)
   - Test that changes are maintained across sessions

5. **Export Functions Test**:
   - Test "1. Copy Employee List", "2. Copy Schedule Grid", "3. Copy Open Shifts List" buttons
   - Verify data is copied to clipboard (may require user interaction in browser)

### Known Limitations
- **CDN Dependencies**: External resources may be blocked in some environments (shows "ERR_BLOCKED_BY_CLIENT")
- **Cloud Features**: Supabase integration fails without proper CDN access, but local features work fully
- **Browser Requirements**: Modern browser needed for full functionality (localStorage, clipboard API)

## Development Guidelines

### Making Changes to the Application
- **Target file**: `final_fixed_schedule (1)_032416.html`
- **NO compilation or build step needed**
- **Test immediately**: Refresh browser page to see changes
- **Backup recommended**: Make a copy before major changes since it's a single file

### Code Structure (within the HTML file)
- **Lines 1-373**: HTML structure and CSS styling
- **Lines 374-377**: External script includes (CDN dependencies)
- **Lines 378-3819**: JavaScript functionality
- **Lines 3820-3821**: Additional script includes and closing tags

### Common Tasks

#### Adding New Features
- Locate the appropriate JavaScript section in the HTML file
- Add new functions following existing patterns
- Test immediately by refreshing the browser
- Always validate the complete user workflow

#### Modifying UI Elements
- Update HTML structure (lines 1-373)
- Modify CSS in the `<style>` section
- Update JavaScript event handlers if needed
- Test UI responsiveness and functionality

#### Data Structure Changes
- Understand localStorage schema used by existing code
- Update both save and load functions
- Test data persistence across browser sessions
- Validate backward compatibility with existing saved data

## Repository Information

### Files in Repository
```
.
├── README.md (minimal content: "readme")
├── final_fixed_schedule (1)_032416.html (main application)
└── .git/ (git repository)
```

### No Additional Tooling
- **No package.json**: Not a Node.js project
- **No build scripts**: Static HTML application  
- **No test framework**: Manual testing required
- **No linting**: No automated code quality tools
- **No CI/CD**: No GitHub Actions or automated workflows

### Application Features
- Employee roster management with hire dates, hours, availability
- Automated schedule generation with workload balancing
- PTO (Paid Time Off) request and approval system
- Excel import/export functionality
- PDF generation for printing schedules
- QR code generation for employee access
- Real-time workload and coverage dashboards
- Conflict detection and resolution
- Data backup and restore (JSON format)

## Time Expectations
- **Application startup**: Instant (static HTML file)
- **Feature testing**: 2-3 minutes per workflow
- **Data operations**: Near-instant (localStorage)
- **Server startup**: < 5 seconds
- **NEVER CANCEL any operations** - they complete quickly

## Troubleshooting

### CDN Resources Blocked
- Application works with limited functionality when CDN blocked
- Core scheduling features remain operational
- Excel export/import may be limited
- Cloud sync features unavailable

### Browser Compatibility Issues
- Requires modern browser with ES6+ support
- localStorage and clipboard API needed for full functionality
- Test in Chrome/Firefox/Safari for best results

### Data Loss Prevention
- Always export JSON backup before major changes
- Browser localStorage can be cleared by user
- Consider implementing additional backup mechanisms

Remember: This is a production scheduling tool used for actual employee management. Always validate changes thoroughly and maintain data integrity.
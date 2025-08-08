# Manual Test Checklist for Schedule NSG

This document provides a comprehensive manual testing checklist for the Schedule NSG application after modularization.

## Prerequisites
- Start the application server: `python3 -m http.server 8000`
- Navigate to: `http://localhost:8000/`
- Ensure you have a modern browser with ES6+ support

## 1. Application Initialization Tests

### 1.1 Page Load
- [ ] Application loads without JavaScript errors
- [ ] Console shows "Initializing Schedule NSG application..."
- [ ] Console shows "Schedule NSG application initialized successfully"
- [ ] Status bar shows connection status (🟢 Connected or 🔴 Offline)
- [ ] No error modals appear on startup

### 1.2 Module Loading
- [ ] No "Module not found" errors in console
- [ ] `window.apiManager` and `window.uiManager` are defined
- [ ] Legacy `window.dataManager` is available for backward compatibility

### 1.3 Offline/Online Detection
- [ ] Disconnect internet and verify status shows "🔴 Offline"
- [ ] Reconnect internet and verify status shows "🟢 Connected"
- [ ] Sync messages appear in console when coming back online

## 2. Employee Management Tests

### 2.1 Employee List Display
- [ ] Employee list container (`<ul id="employee-list">`) exists and is visible
- [ ] Empty state shows "No employees added yet" when no employees exist
- [ ] Employee count updates correctly in UI (if element exists)

### 2.2 Add Employee Functionality
- [ ] Employee name input field is present and accessible
- [ ] Email input field is present and accessible
- [ ] "Add Employee" button is present and clickable
- [ ] Focus moves to name input on page load

#### 2.2.1 Valid Employee Addition
- [ ] Enter valid name (e.g., "John Doe") and click "Add Employee"
- [ ] Success notification appears: "Employee 'John Doe' added successfully"
- [ ] Employee appears in the employee list
- [ ] Input fields are cleared after successful addition
- [ ] Employee list updates immediately

#### 2.2.2 Email Handling
- [ ] Add employee with valid email (e.g., "john@example.com")
- [ ] Email displays in employee list
- [ ] Add employee without email - should work fine
- [ ] Add employee with invalid email - should show validation error

#### 2.2.3 Validation Tests
- [ ] Try to add employee with empty name - should show error
- [ ] Try to add employee with only whitespace - should show error
- [ ] Try to add employee with very long name (>100 chars) - should show error
- [ ] Try to add duplicate employee name - should show error

### 2.3 Employee List Rendering
- [ ] Each employee displays with name and email (or "No email provided")
- [ ] Edit and Delete buttons are present for each employee
- [ ] Alternating row colors for better readability
- [ ] Employee list scrolls properly when many employees are added

### 2.4 Edit Employee Functionality
- [ ] Click "Edit" button on an employee
- [ ] Prompt appears with current name pre-filled
- [ ] Enter new name and confirm - employee name updates
- [ ] Cancel edit operation - no changes occur
- [ ] Try to edit name to empty string - should show error
- [ ] Try to edit name to duplicate - should show error

### 2.5 Delete Employee Functionality
- [ ] Click "Delete" button on an employee
- [ ] Confirmation dialog appears
- [ ] Confirm deletion - employee is removed from list
- [ ] Cancel deletion - employee remains in list
- [ ] Success notification appears after deletion

### 2.6 Bulk Save Functionality
- [ ] Click "Bulk Save" button
- [ ] Loading indicator appears briefly
- [ ] Success notification: "Saved X employees successfully"
- [ ] Data persists after browser refresh

## 3. Audit Log Tests

### 3.1 Audit Log Display
- [ ] Audit log container (`<ul id="audit-log">`) exists
- [ ] Empty state shows "No audit log entries" when no entries exist
- [ ] Audit log panel can be toggled on/off (if toggle exists)

### 3.2 Audit Log Entries
- [ ] Adding employee creates audit log entry
- [ ] Editing employee creates audit log entry
- [ ] Deleting employee creates audit log entry
- [ ] Bulk save creates appropriate audit entries
- [ ] Each audit entry shows timestamp, action, and details
- [ ] Most recent entries appear at the top
- [ ] Only last 20 entries are shown

## 4. Data Persistence Tests

### 4.1 Local Storage
- [ ] Add some employees and refresh page - data persists
- [ ] Employee list renders correctly after refresh
- [ ] Audit log entries persist after refresh

### 4.2 Supabase Integration (if online)
- [ ] Changes are synced to Supabase when online
- [ ] Status indicator shows "Saved to cloud" after successful sync
- [ ] Changes made offline are queued for sync
- [ ] Sync queue processes when connection is restored

## 5. Error Handling Tests

### 5.1 User Input Errors
- [ ] Invalid employee data shows appropriate error messages
- [ ] Error notifications are clearly visible and user-friendly
- [ ] Errors don't prevent further interaction with the app

### 5.2 Network Errors
- [ ] Going offline shows "Saved locally" status
- [ ] Coming back online triggers sync
- [ ] Failed sync attempts don't crash the application

### 5.3 JavaScript Errors
- [ ] Console errors (if any) don't prevent basic functionality
- [ ] Global error handler catches and displays errors gracefully

## 6. Accessibility Tests

### 6.1 Keyboard Navigation
- [ ] Tab through form elements in logical order
- [ ] Enter key in name input submits the form
- [ ] All interactive elements are keyboard accessible

### 6.2 Screen Reader Support
- [ ] Form labels are properly associated
- [ ] Success/error messages are announced
- [ ] Employee list items are readable by screen readers

### 6.3 ARIA Attributes
- [ ] Loading states have appropriate ARIA labels
- [ ] Required fields are marked as required
- [ ] Error states are properly communicated

## 7. Performance Tests

### 7.1 Loading Performance
- [ ] Application initializes quickly (<2 seconds)
- [ ] No unnecessary API calls during startup
- [ ] UI remains responsive during data operations

### 7.2 Large Data Sets
- [ ] Add 50+ employees - list remains responsive
- [ ] Scrolling in employee list is smooth
- [ ] Search/filter operations (if implemented) are fast

## 8. Keyboard Shortcuts Tests

### 8.1 Save Shortcut
- [ ] Ctrl+S (or Cmd+S on Mac) triggers bulk save
- [ ] Shortcut works from any focus state
- [ ] Browser's default save dialog is prevented

### 8.2 Add Employee Shortcut
- [ ] Ctrl+N (or Cmd+N on Mac) focuses name input
- [ ] Shortcut works when not already focused on input

## 9. Integration Tests

### 9.1 Existing Application Integration
- [ ] Modular code doesn't break existing schedule functionality
- [ ] Legacy event handlers still work
- [ ] CSS styles remain intact
- [ ] Other application features function normally

### 9.2 Cross-Module Communication
- [ ] UI Manager properly communicates with API Manager
- [ ] Error states are handled across module boundaries
- [ ] Data flows correctly between modules

## 10. Browser Compatibility Tests

### 10.1 Modern Browsers
- [ ] Chrome (latest) - all functionality works
- [ ] Firefox (latest) - all functionality works
- [ ] Safari (latest) - all functionality works
- [ ] Edge (latest) - all functionality works

### 10.2 ES Module Support
- [ ] Browser supports ES6 modules
- [ ] Import/export statements work correctly
- [ ] No module loading errors in older browsers

## 11. Mobile Responsiveness Tests

### 11.1 Mobile Layout
- [ ] Employee management panel displays correctly on mobile
- [ ] Input fields are appropriately sized for mobile
- [ ] Buttons are touch-friendly
- [ ] Text is readable at mobile viewport sizes

### 11.2 Touch Interactions
- [ ] All buttons respond to touch
- [ ] Form inputs work with mobile keyboards
- [ ] No issues with touch scrolling

## Test Results Summary

Date: ___________
Tester: ___________
Browser: ___________
Platform: ___________

**Overall Status:**
- [ ] All tests pass
- [ ] Minor issues found (document below)
- [ ] Major issues found (document below)

**Issues Found:**
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________
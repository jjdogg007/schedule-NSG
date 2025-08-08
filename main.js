// main.js - Coordinates app lifecycle and event listeners
// Entry point for the modular schedule application

import { ApiManager } from './api.js';
import { UIManager } from './ui.js';

class ScheduleApp {
    constructor() {
        this.apiManager = null;
        this.uiManager = null;
        this.isInitialized = false;
        
        this.initialize();
    }

    async initialize() {
        try {
            console.log('Initializing Schedule NSG application...');
            
            // Initialize API manager
            this.apiManager = new ApiManager();
            
            // Initialize UI manager with API manager reference
            this.uiManager = new UIManager(this.apiManager);
            this.apiManager.setUIManager(this.uiManager);
            
            // Make managers globally accessible for event handlers
            window.apiManager = this.apiManager;
            window.uiManager = this.uiManager;
            
            // Load and render initial data
            await this.uiManager.initializeData();
            
            this.isInitialized = true;
            console.log('Schedule NSG application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    }
}

// Initialize the application only if we're in a browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    new ScheduleApp();
}
// Storage management utilities
class StorageManager {
    constructor() {
        this.storageKey = 'nsg_schedule_data';
        this.version = '1.0';
        this.compressionEnabled = true;
    }
    
    // Enhanced localStorage with compression and versioning
    save(key, data) {
        try {
            const payload = {
                version: this.version,
                timestamp: new Date().toISOString(),
                data: data
            };
            
            let serialized = JSON.stringify(payload);
            
            // Simple compression for large data
            if (this.compressionEnabled && serialized.length > 1000) {
                serialized = this.compress(serialized);
            }
            
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Storage save failed:', error);
            return false;
        }
    }
    
    load(key, defaultValue = null) {
        try {
            let stored = localStorage.getItem(key);
            if (!stored) return defaultValue;
            
            // Check if data is compressed
            if (stored.startsWith('COMPRESSED:')) {
                stored = this.decompress(stored);
            }
            
            const payload = JSON.parse(stored);
            
            // Version check
            if (payload.version !== this.version) {
                console.warn(`Version mismatch for ${key}. Expected ${this.version}, got ${payload.version}`);
                return this.migrate(payload, defaultValue);
            }
            
            return payload.data;
        } catch (error) {
            console.error('Storage load failed:', error);
            return defaultValue;
        }
    }
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove failed:', error);
            return false;
        }
    }
    
    clear() {
        try {
            // Only clear NSG-related data
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('nsg_') || key.startsWith('schedule_') || 
                    key.startsWith('wellness_') || key.startsWith('calendar_')) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Storage clear failed:', error);
            return false;
        }
    }
    
    // Simple compression using basic run-length encoding for repeated patterns
    compress(data) {
        // This is a simplified compression - in production, use a proper library
        return 'COMPRESSED:' + btoa(data);
    }
    
    decompress(data) {
        return atob(data.replace('COMPRESSED:', ''));
    }
    
    migrate(oldPayload, defaultValue) {
        // Handle data migration between versions
        console.log('Migrating data from version', oldPayload.version);
        
        // For now, just return the old data
        return oldPayload.data || defaultValue;
    }
    
    // Get storage usage statistics
    getStorageStats() {
        let totalSize = 0;
        let nsgSize = 0;
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = localStorage[key].length;
                totalSize += size;
                
                if (key.startsWith('nsg_') || key.startsWith('schedule_') || 
                    key.startsWith('wellness_') || key.startsWith('calendar_')) {
                    nsgSize += size;
                }
            }
        }
        
        return {
            totalSize,
            nsgSize,
            available: 5 * 1024 * 1024 - totalSize, // Assuming 5MB limit
            usage: (totalSize / (5 * 1024 * 1024)) * 100
        };
    }
    
    // Export all NSG data
    exportData() {
        const data = {};
        
        for (let key in localStorage) {
            if (key.startsWith('nsg_') || key.startsWith('schedule_') || 
                key.startsWith('wellness_') || key.startsWith('calendar_')) {
                data[key] = this.load(key);
            }
        }
        
        return {
            exportDate: new Date().toISOString(),
            version: this.version,
            data: data
        };
    }
    
    // Import NSG data
    importData(exportedData) {
        try {
            if (!exportedData.data) {
                throw new Error('Invalid export format');
            }
            
            // Clear existing data
            this.clear();
            
            // Import new data
            Object.entries(exportedData.data).forEach(([key, value]) => {
                this.save(key, value);
            });
            
            return true;
        } catch (error) {
            console.error('Data import failed:', error);
            return false;
        }
    }
    
    // Backup data to server (if available)
    async backupToServer() {
        try {
            const data = this.exportData();
            
            const response = await fetch('/api/backup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                console.log('Data backed up to server successfully');
                return true;
            } else {
                throw new Error('Server backup failed');
            }
        } catch (error) {
            console.error('Server backup failed:', error);
            return false;
        }
    }
    
    // Restore data from server
    async restoreFromServer() {
        try {
            const response = await fetch('/api/backup');
            
            if (response.ok) {
                const data = await response.json();
                return this.importData(data);
            } else {
                throw new Error('Server restore failed');
            }
        } catch (error) {
            console.error('Server restore failed:', error);
            return false;
        }
    }
}

// Initialize global storage manager
window.storageManager = new StorageManager();
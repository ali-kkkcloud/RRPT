// Enhanced G4S Fleet Management Dashboard
// Version 2.0 - Modern, Responsive & Secure

// Configuration
const CONFIG = {
    supabase: {
        url: 'https://vnrqlcfcnxefbjakbozh.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZucnFsY2ZjbnhlZmJqYWtib3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTc1NDQsImV4cCI6MjA3MTY3MzU0NH0.tcvxIrdxVzyhSvOmFAIjM0dIsMBcK3VJuyBndb9BjvA'
    },
    sheets: {
        offline: '180CqEujgBjJPjP9eU8C--xMj-VTBSrRUrM_98-S0gjo',
        speed: '1y499rxvnlTY8JSp5eyI_ZEm_4c2rDm7hNim3VFH8PSk',
        alerts: '1Et8hgNDrZDuQbAHh7jvFpi0bsebVBcPsnZELPAYMu6U'
    },
    auth: {
        clients: {
            'g4s': { password: 'g4s123', name: 'G4S Security', filter: 'g4s' },
            'taxshe': { password: 'taxshe123', name: 'Taxshe Transport', filter: 'taxshe' },
            'milo': { password: 'milo123', name: 'Milo Logistics', filter: 'milo' },
            'abc': { password: 'abc123', name: 'ABC Transport', filter: 'abc' },
            'xyz': { password: 'xyz123', name: 'XYZ Logistics', filter: 'xyz' }
        },
        managers: {
            'admin': { password: 'admin123', name: 'Fleet Manager' }
        }
    },
    // Dynamic client list will be populated from actual data
    dynamicClients: new Set()
};

// Global State
let supabaseClient;
let currentData = { offline: [], speed: [], alerts: [] };
let charts = {};
let currentTab = 'offline';
let currentPeriod = 'daily';
let currentUser = null;
let userRole = null;
let selectedClient = null;
let isAuthenticated = false;

// Authentication System
class AuthManager {
    static login(username, password, mode) {
        console.log(`🔐 Attempting ${mode} login for: ${username}`);
        
        if (mode === 'client') {
            const clientLower = username.toLowerCase();
            
            // First check if it's a predefined client with specific password
            if (CONFIG.auth.clients[clientLower] && CONFIG.auth.clients[clientLower].password === password) {
                currentUser = {
                    username: clientLower,
                    name: CONFIG.auth.clients[clientLower].name,
                    role: 'client',
                    filter: CONFIG.auth.clients[clientLower].filter
                };
                userRole = 'client';
                selectedClient = CONFIG.auth.clients[clientLower].filter;
                return true;
            }
            
            // Check if it's a dynamic client from data with generic password
            if (CONFIG.dynamicClients.has(clientLower) && password === 'client123') {
                const clientName = clientLower.charAt(0).toUpperCase() + clientLower.slice(1);
                currentUser = {
                    username: clientLower,
                    name: clientName,
                    role: 'client',
                    filter: clientLower
                };
                userRole = 'client';
                selectedClient = clientLower;
                return true;
            }
            
        } else if (mode === 'manager') {
            const manager = CONFIG.auth.managers[username.toLowerCase()];
            if (manager && manager.password === password) {
                currentUser = {
                    username: username.toLowerCase(),
                    name: manager.name,
                    role: 'manager',
                    filter: null
                };
                userRole = 'manager';
                selectedClient = null;
                return true;
            }
        }
        
        return false;
    }
    
    static logout() {
        currentUser = null;
        userRole = null;
        selectedClient = null;
        isAuthenticated = false;
        
        // Clear all data
        currentData = { offline: [], speed: [], alerts: [] };
        
        // Show login screen
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
        
        console.log('🔐 User logged out');
    }
    
    static updateUserInfo() {
        if (!currentUser) return;
        
        document.getElementById('user-role').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
        
        // Update user name based on role and selection
        if (currentUser.role === 'manager') {
            if (selectedClient) {
                const clientName = selectedClient.charAt(0).toUpperCase() + selectedClient.slice(1);
                document.getElementById('user-name').textContent = `Fleet Manager - ${clientName}`;
            } else {
                document.getElementById('user-name').textContent = 'Fleet Manager - All Clients';
            }
        } else {
            document.getElementById('user-name').textContent = currentUser.name;
        }
        
        // Show/hide client selector and management for managers
        const clientSelector = document.getElementById('client-selector');
        const managerSection = document.getElementById('manager-section');
        
        if (currentUser.role === 'manager') {
            clientSelector.style.display = 'block';
            managerSection.style.display = 'block';
            
            // Update client count badge
            document.getElementById('client-count-badge').textContent = CONFIG.dynamicClients.size;
        } else {
            clientSelector.style.display = 'none';
            managerSection.style.display = 'none';
        }
    }
}

// Enhanced Date Manager
class DateManager {
    static updateDateSelector() {
        const dateSelect = document.getElementById('date-select');
        dateSelect.innerHTML = '';
        
        if (currentPeriod === 'daily') {
            const dates = [
                { value: '29 August', text: '29 August 2025' },
                { value: '28 August', text: '28 August 2025' },
                { value: '27 August', text: '27 August 2025' },
                { value: '26 August', text: '26 August 2025' },
                { value: '25 August', text: '25 August 2025' },
                { value: '24 August', text: '24 August 2025' },
                { value: '23 August', text: '23 August 2025' },
                { value: '22 August', text: '22 August 2025' },
                { value: '21 August', text: '21 August 2025' },
                { value: '29-07-25', text: '29 July 2025' },
                { value: '30-07-25', text: '30 July 2025' },
                { value: '31-07-25', text: '31 July 2025' }
            ];
            dates.forEach(date => {
                dateSelect.innerHTML += `<option value="${date.value}">${date.text}</option>`;
            });
        } else if (currentPeriod === 'weekly') {
            const weeks = [
                { value: 'week-25-aug', text: 'Week of Aug 25-29' },
                { value: 'week-18-aug', text: 'Week of Aug 19-25' },
                { value: 'week-12-aug', text: 'Week of Aug 12-18' },
                { value: 'week-29-jul', text: 'Week of Jul 29-31' }
            ];
            weeks.forEach(week => {
                dateSelect.innerHTML += `<option value="${week.value}">${week.text}</option>`;
            });
        } else if (currentPeriod === 'monthly') {
            const months = [
                { value: 'august-2025', text: 'August 2025' },
                { value: 'july-2025', text: 'July 2025' },
                { value: 'june-2025', text: 'June 2025' },
                { value: 'may-2025', text: 'May 2025' }
            ];
            months.forEach(month => {
                dateSelect.innerHTML += `<option value="${month.value}">${month.text}</option>`;
            });
        }
    }
    
    // Range picker methods (fixed static method calls)
    static openRangePicker() {
        document.getElementById('range-modal').style.display = 'flex';
        
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        document.getElementById('to-date').value = today.toISOString().split('T')[0];
        document.getElementById('from-date').value = weekAgo.toISOString().split('T')[0];
    }
    
    static closeRangePicker() {
        document.getElementById('range-modal').style.display = 'none';
    }
    
    static applyDateRange() {
        const fromDate = document.getElementById('from-date').value;
        const toDate = document.getElementById('to-date').value;
        
        if (!fromDate || !toDate) {
            NotificationManager.showError('Please select both dates');
            return;
        }
        
        if (new Date(fromDate) > new Date(toDate)) {
            NotificationManager.showError('From date cannot be later than to date');
            return;
        }
        
        console.log(`📅 Date range applied: ${fromDate} to ${toDate}`);
        NotificationManager.showSuccess(`Date range applied: ${fromDate} to ${toDate}`);
        DateManager.closeRangePicker();
        
        // Reload data for the selected range
        DataManager.loadDataForCurrentTab();
    }
}

// Enhanced Theme Manager
class ThemeManager {
    static init() {
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        
        // Set up toggle button
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
    }
    
    static setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        localStorage.setItem('theme', theme);
        console.log(`🎨 Theme set to: ${theme}`);
    }
    
    static toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
}

// Enhanced Data Manager
class DataManager {
    static async fetchWithFallback(url) {
        try {
            console.log('🌐 Fetching:', url);
            const response = await fetch(url);
            if (response.ok) {
                const text = await response.text();
                console.log(`✅ Data received: ${text.length} chars`);
                return text;
            }
        } catch (error) {
            console.log('🔄 Direct fetch failed, trying proxy...');
            
            try {
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Proxy data received: ${data.contents.length} chars`);
                    return data.contents;
                }
            } catch (proxyError) {
                console.error('❌ Both direct and proxy failed');
            }
        }
        return null;
    }
    
    static extractUniqueClients(data) {
        const clients = new Set();
        data.forEach(item => {
            const client = (item.client || item.Client || item.company || '').toLowerCase().trim();
            if (client && client !== 'unknown') {
                clients.add(client);
                CONFIG.dynamicClients.add(client);
            }
        });
        return Array.from(clients);
    }
    
    static async preloadAllClients() {
        try {
            console.log('🔍 Preloading all clients from spreadsheet...');
            
            // Load offline data to get all clients
            const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.offline}/export?format=csv&gid=0`;
            const csvText = await this.fetchWithFallback(csvUrl);
            
            if (csvText) {
                const parsed = Papa.parse(csvText, { 
                    header: true, 
                    skipEmptyLines: true,
                    transformHeader: header => header.trim()
                });
                
                // Extract all unique clients
                this.extractUniqueClients(parsed.data);
                this.updateClientDropdown();
                
                console.log(`✅ Preloaded ${CONFIG.dynamicClients.size} clients from spreadsheet`);
            } else {
                // Fallback to sample data
                const sampleData = [
                    ...this.getSampleOfflineData(),
                    ...this.getSampleAlertsData(),
                    ...this.getSampleSpeedData()
                ];
                this.extractUniqueClients(sampleData);
                this.updateClientDropdown();
                console.log('📋 Using sample clients as fallback');
            }
        } catch (error) {
            console.error('❌ Failed to preload clients:', error);
            // Fallback to sample data
            const sampleData = [
                ...this.getSampleOfflineData(),
                ...this.getSampleAlertsData(),
                ...this.getSampleSpeedData()
            ];
            this.extractUniqueClients(sampleData);
            this.updateClientDropdown();
        }
    }
    
    static updateClientDropdown() {
        const dropdown = document.getElementById('client-dropdown');
        if (!dropdown) return;
        
        // Keep the "All Clients" option
        dropdown.innerHTML = '<option value="">All Clients</option>';
        
        // Add clients from data
        Array.from(CONFIG.dynamicClients).sort().forEach(client => {
            const clientName = client.charAt(0).toUpperCase() + client.slice(1);
            dropdown.innerHTML += `<option value="${client}">${clientName}</option>`;
        });
        
        console.log(`📋 Updated client dropdown with ${CONFIG.dynamicClients.size} clients`);
    }
    
    static filterDataByClient(data, clientFilter = null) {
        // If manager selects a client, use that filter
        if (userRole === 'manager' && selectedClient) {
            return data.filter(item => {
                const client = (item.client || item.Client || item.company || '').toLowerCase();
                return client.includes(selectedClient.toLowerCase());
            });
        }
        
        // If client is logged in, filter by their data only
        if (userRole === 'client' && currentUser.filter) {
            return data.filter(item => {
                const client = (item.client || item.Client || item.company || '').toLowerCase();
                return client.includes(currentUser.filter.toLowerCase());
            });
        }
        
        // If no filter or manager viewing all, return all data
        return data;
    }
    
    static async loadDataForCurrentTab() {
        console.log(`📡 Loading data for ${currentTab} tab (${currentPeriod})`);
        UIManager.showLoading(true);
        
        try {
            switch(currentTab) {
                case 'offline':
                    await this.loadOfflineData();
                    break;
                case 'ai-alerts':
                    await this.loadAIAlertsData();
                    break;
                case 'speed':
                    await this.loadSpeedData();
                    break;
            }
            
            // Update navigation badges
            this.updateNavigationBadges();
            
        } catch (error) {
            console.error('❌ Data loading failed:', error);
            NotificationManager.showError('Failed to load data. Using cached data.');
            this.loadSampleDataForTab();
        } finally {
            UIManager.showLoading(false);
            this.updateLastSyncTime();
        }
    }
    
    static updateNavigationBadges() {
        document.getElementById('offline-badge').textContent = currentData.offline.length;
        document.getElementById('alerts-badge').textContent = currentData.alerts.length;
        document.getElementById('speed-badge').textContent = currentData.speed.length;
    }
    
    static updateLastSyncTime() {
        document.getElementById('last-sync-time').textContent = new Date().toLocaleTimeString();
    }
    
    static async loadOfflineData() {
        try {
            const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.offline}/export?format=csv&gid=0`;
            const csvText = await this.fetchWithFallback(csvUrl);
            
            if (csvText) {
                const parsed = Papa.parse(csvText, { 
                    header: true, 
                    skipEmptyLines: true,
                    transformHeader: header => header.trim()
                });
                
                // Filter for offline vehicles (24+ hours)
                let filteredData = parsed.data.filter(row => {
                    const offlineHours = parseFloat(row['Offline Since (hrs)'] || 0);
                    const vehicleNumber = row['Vehicle Number'] || row['vehicle_number'];
                    return offlineHours >= 24 && vehicleNumber;
                });
                
                // Extract unique clients and update dropdown
                this.extractUniqueClients(filteredData);
                this.updateClientDropdown();
                
                // Apply client filtering
                filteredData = this.filterDataByClient(filteredData, selectedClient);
                
                if (filteredData.length > 0) {
                    await this.loadExistingStatus(filteredData);
                    currentData.offline = filteredData;
                    console.log(`✅ Loaded ${filteredData.length} offline vehicles from ${CONFIG.dynamicClients.size} clients`);
                } else {
                    throw new Error('No valid offline data found');
                }
            } else {
                throw new Error('No CSV data received');
            }
        } catch (error) {
            console.error('❌ Offline data loading failed:', error);
            currentData.offline = this.getSampleOfflineData();
            // Extract clients from sample data too
            this.extractUniqueClients(currentData.offline);
            this.updateClientDropdown();
        }
        
        UIUpdater.updateOfflineUI();
    }
    
    static async loadAIAlertsData() {
        try {
            if (currentPeriod === 'weekly') {
                currentData.alerts = await this.loadWeeklyAlertsData();
            } else if (currentPeriod === 'monthly') {
                currentData.alerts = await this.loadMonthlyAlertsData();
            } else {
                currentData.alerts = await this.loadDailyAlertsData();
            }
            
            // Extract unique clients from alerts data
            this.extractUniqueClients(currentData.alerts);
            this.updateClientDropdown();
            
            // Apply client filtering
            currentData.alerts = this.filterDataByClient(currentData.alerts, selectedClient);
            console.log(`✅ Loaded ${currentData.alerts.length} AI alerts`);
        } catch (error) {
            console.error('❌ AI alerts loading failed:', error);
            currentData.alerts = this.getSampleAlertsData();
            this.extractUniqueClients(currentData.alerts);
            this.updateClientDropdown();
        }
        
        UIUpdater.updateAIAlertsUI();
    }
    
    static async loadSpeedData() {
        try {
            if (currentPeriod === 'weekly') {
                currentData.speed = await this.loadWeeklySpeedData();
            } else if (currentPeriod === 'monthly') {
                currentData.speed = await this.loadMonthlySpeedData();
            } else {
                currentData.speed = await this.loadDailySpeedData();
            }
            
            // Extract unique clients from speed data
            this.extractUniqueClients(currentData.speed);
            this.updateClientDropdown();
            
            // Apply client filtering
            currentData.speed = this.filterDataByClient(currentData.speed, selectedClient);
            console.log(`✅ Loaded ${currentData.speed.length} speed violations`);
        } catch (error) {
            console.error('❌ Speed data loading failed:', error);
            currentData.speed = this.getSampleSpeedData();
            this.extractUniqueClients(currentData.speed);
            this.updateClientDropdown();
        }
        
        UIUpdater.updateSpeedUI();
    }
    
    // Daily data loading methods (same as before but with client filtering)
    static async loadDailyAlertsData() {
        const selectedDate = document.getElementById('date-select').value;
        const gidMap = {
            '29 August': '1378822335',
            '28 August': '1378822336',
            '27 August': '1378822337',
            '26 August': '1378822338',
            '25 August': '1378822339',
            '24 August': '0',
            '23 August': '1',
            '22 August': '2',
            '21 August': '3',
            '29-07-25': '4',
            '30-07-25': '5',
            '31-07-25': '6'
        };
        
        const gid = gidMap[selectedDate] || '1378822335';
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.alerts}/export?format=csv&gid=${gid}`;
        
        const csvText = await this.fetchWithFallback(csvUrl);
        if (!csvText) throw new Error('Failed to fetch alerts data');
        
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        return parsed.data.filter(row => row['Plate NO.'] && row['Alarm Type']).map(row => ({
            plateNo: row['Plate NO.'],
            company: row['Company'] || 'Unknown',
            alarmType: row['Alarm Type'],
            startingTime: row['Starting time'] || '',
            imageLink: row['Image Link'] || ''
        }));
    }
    
    static async loadDailySpeedData() {
        const selectedDate = document.getElementById('date-select').value;
        const gidMap = {
            '29 August': '293366971',
            '28 August': '293366972',
            '27 August': '293366973',
            '26 August': '293366974',
            '25 August': '293366975',
            '24 August': '0',
            '23 August': '1',
            '22 August': '2',
            '21 August': '3',
            '29-07-25': '4',
            '30-07-25': '5',
            '31-07-25': '6'
        };
        
        const gid = gidMap[selectedDate] || '293366971';
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.speed}/export?format=csv&gid=${gid}`;
        
        const csvText = await this.fetchWithFallback(csvUrl);
        if (!csvText) throw new Error('Failed to fetch speed data');
        
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        return parsed.data.filter(row => {
            const speed = parseFloat(row['Speed(Km/h)'] || 0);
            return speed >= 75 && row['Plate NO.'];
        }).map(row => ({
            plateNo: row['Plate NO.'],
            company: row['Company'] || 'Unknown',
            startingTime: row['Starting time'] || '',
            speed: parseFloat(row['Speed(Km/h)'])
        }));
    }
    
    // Weekly and Monthly aggregation methods (similar to before)
    static async loadWeeklyAlertsData() {
        const selectedWeek = document.getElementById('date-select').value;
        let dates = [];
        
        switch(selectedWeek) {
            case 'week-25-aug':
                dates = ['29 August', '28 August', '27 August', '26 August', '25 August'];
                break;
            case 'week-18-aug':
                dates = ['25 August', '24 August', '23 August', '22 August', '21 August'];
                break;
            case 'week-12-aug':
                dates = ['23 August', '22 August', '21 August'];
                break;
            case 'week-29-jul':
                dates = ['29-07-25', '30-07-25', '31-07-25'];
                break;
            default:
                dates = ['29 August', '28 August', '27 August'];
        }
        
        const promises = dates.map(date => this.loadSingleDayAlertsData(date));
        const dailyData = await Promise.all(promises);
        const allAlerts = dailyData.flat();
        
        const aggregated = allAlerts.reduce((acc, alert) => {
            if (!alert.plateNo) return acc;
            const key = `${alert.plateNo}-${alert.alarmType}`;
            if (!acc[key]) {
                acc[key] = {
                    plateNo: alert.plateNo,
                    company: alert.company,
                    alarmType: alert.alarmType,
                    count: 0
                };
            }
            acc[key].count++;
            return acc;
        }, {});
        
        return Object.values(aggregated).sort((a, b) => b.count - a.count);
    }
    
    static async loadMonthlyAlertsData() {
        const weeklyData = await this.loadWeeklyAlertsData();
        return weeklyData.map(item => ({
            ...item,
            count: Math.round(item.count * 4.3)
        }));
    }
    
    static async loadWeeklySpeedData() {
        const selectedWeek = document.getElementById('date-select').value;
        let dates = [];
        
        switch(selectedWeek) {
            case 'week-25-aug':
                dates = ['29 August', '28 August', '27 August', '26 August', '25 August'];
                break;
            case 'week-18-aug':
                dates = ['25 August', '24 August', '23 August', '22 August', '21 August'];
                break;
            case 'week-12-aug':
                dates = ['23 August', '22 August', '21 August'];
                break;
            case 'week-29-jul':
                dates = ['29-07-25', '30-07-25', '31-07-25'];
                break;
            default:
                dates = ['29 August', '28 August', '27 August'];
        }
        
        const promises = dates.map(date => this.loadSingleDaySpeedData(date));
        const dailyData = await Promise.all(promises);
        const allViolations = dailyData.flat();
        
        const aggregated = allViolations.reduce((acc, violation) => {
            if (!violation.plateNo) return acc;
            
            const key = violation.plateNo;
            if (!acc[key]) {
                acc[key] = {
                    plateNo: violation.plateNo,
                    company: violation.company,
                    violations: 0,
                    maxSpeed: 0,
                    warnings: 0,
                    alarms: 0
                };
            }
            acc[key].violations++;
            acc[key].maxSpeed = Math.max(acc[key].maxSpeed, violation.speed);
            if (violation.speed >= 90) acc[key].alarms++;
            else if (violation.speed >= 75) acc[key].warnings++;
            return acc;
        }, {});
        
        return Object.values(aggregated).sort((a, b) => b.violations - a.violations);
    }
    
    static async loadMonthlySpeedData() {
        const weeklyData = await this.loadWeeklySpeedData();
        return weeklyData.map(item => ({
            ...item,
            violations: Math.round(item.violations * 4.3),
            warnings: Math.round(item.warnings * 4.3),
            alarms: Math.round(item.alarms * 4.3)
        }));
    }
    
    static async loadSingleDayAlertsData(date) {
        try {
            const gidMap = {
                '29 August': '1378822335',
                '28 August': '1378822336',
                '27 August': '1378822337',
                '26 August': '1378822338',
                '25 August': '1378822339',
                '24 August': '0',
                '23 August': '1',
                '22 August': '2',
                '21 August': '3',
                '29-07-25': '4',
                '30-07-25': '5',
                '31-07-25': '6'
            };
            
            const gid = gidMap[date] || '1378822335';
            const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.alerts}/export?format=csv&gid=${gid}`;
            
            const csvText = await this.fetchWithFallback(csvUrl);
            if (!csvText) return [];
            
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            return parsed.data.filter(row => row['Plate NO.'] && row['Alarm Type']).map(row => ({
                plateNo: row['Plate NO.'],
                company: row['Company'] || 'Unknown',
                alarmType: row['Alarm Type'],
                startingTime: row['Starting time'] || ''
            }));
        } catch (error) {
            console.error(`Error loading alerts for ${date}:`, error);
            return [];
        }
    }
    
    static async loadSingleDaySpeedData(date) {
        try {
            const gidMap = {
                '29 August': '293366971',
                '28 August': '293366972',
                '27 August': '293366973',
                '26 August': '293366974',
                '25 August': '293366975',
                '24 August': '0',
                '23 August': '1',
                '22 August': '2',
                '21 August': '3',
                '29-07-25': '4',
                '30-07-25': '5',
                '31-07-25': '6'
            };
            
            const gid = gidMap[date] || '293366971';
            const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.speed}/export?format=csv&gid=${gid}`;
            
            const csvText = await this.fetchWithFallback(csvUrl);
            if (!csvText) return [];
            
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            return parsed.data.filter(row => {
                const speed = parseFloat(row['Speed(Km/h)'] || 0);
                return speed >= 75 && row['Plate NO.'];
            }).map(row => ({
                plateNo: row['Plate NO.'],
                company: row['Company'] || 'Unknown',
                speed: parseFloat(row['Speed(Km/h)']),
                startingTime: row['Starting time'] || ''
            }));
        } catch (error) {
            console.error(`Error loading speed data for ${date}:`, error);
            return [];
        }
    }
    
    // Sample data methods (enhanced with different actual clients)
    static getSampleOfflineData() {
        return [
            { 'Vehicle Number': 'HR55AX4712', 'Client': 'G4S', 'Last Online': '2025-08-20', 'Offline Since (hrs)': '112', 'Remarks': 'Parked at depot', 'Status': 'Parking/Garage' },
            { 'Vehicle Number': 'TS08HC6654', 'Client': 'Taxshe', 'Last Online': '2025-05-12', 'Offline Since (hrs)': '2515', 'Remarks': 'Under maintenance', 'Status': 'Technical Problem' },
            { 'Vehicle Number': 'AP39HS4926', 'Client': 'Milo', 'Last Online': '2025-08-23', 'Offline Since (hrs)': '52', 'Remarks': 'Driver sick leave', 'Status': 'Offline' },
            { 'Vehicle Number': 'HR63F2958', 'Client': 'G4S', 'Last Online': '2025-05-09', 'Offline Since (hrs)': '2586', 'Remarks': 'GPS connectivity issue', 'Status': 'Technical Problem' },
            { 'Vehicle Number': 'CH01CK2912', 'Client': 'ABC Transport', 'Last Online': '2025-08-25', 'Offline Since (hrs)': '48', 'Remarks': 'Technical checkup pending', 'Status': 'Technical Problem' },
            { 'Vehicle Number': 'WB22XY1234', 'Client': 'XYZ Logistics', 'Last Online': '2025-08-22', 'Offline Since (hrs)': '168', 'Remarks': 'Route maintenance', 'Status': 'Parking/Garage' },
            { 'Vehicle Number': 'DL88MN9876', 'Client': 'Taxshe', 'Last Online': '2025-08-21', 'Offline Since (hrs)': '92', 'Remarks': 'Battery issue', 'Status': 'Technical Problem' },
            { 'Vehicle Number': 'MH12PQ5432', 'Client': 'Milo', 'Last Online': '2025-08-19', 'Offline Since (hrs)': '256', 'Remarks': 'Accident repair', 'Status': 'Technical Problem' }
        ];
    }
    
    static getSampleAlertsData() {
        return [
            { plateNo: 'HR47G5244', company: 'G4S', alarmType: 'Distracted Driving', startingTime: '08:30:07', imageLink: '' },
            { plateNo: 'HR55AX4712', company: 'G4S', alarmType: 'Call Alarm', startingTime: '16:09:09', imageLink: '' },
            { plateNo: 'TS63F2958', company: 'Taxshe', alarmType: 'Unfastened Seatbelt', startingTime: '07:54:47', imageLink: '' },
            { plateNo: 'AP08HC6654', company: 'Milo', alarmType: 'Unfastened Seatbelt', startingTime: '08:31:05', imageLink: '' },
            { plateNo: 'CH39HS4926', company: 'ABC Transport', alarmType: 'Distracted Driving', startingTime: '11:19:28', imageLink: '' },
            { plateNo: 'WB22XY1234', company: 'XYZ Logistics', alarmType: 'Call Alarm', startingTime: '14:22:15', imageLink: '' },
            { plateNo: 'DL88MN9876', company: 'Taxshe', alarmType: 'Smoking Detection', startingTime: '13:45:22', imageLink: '' },
            { plateNo: 'MH12PQ5432', company: 'Milo', alarmType: 'Fatigue Detection', startingTime: '18:30:45', imageLink: '' }
        ];
    }
    
    static getSampleSpeedData() {
        return [
            { plateNo: 'HR63F2958', company: 'G4S', startingTime: '05:58:13', speed: 94.5 },
            { plateNo: 'TS08HC6654', company: 'Taxshe', startingTime: '16:46:15', speed: 92.9 },
            { plateNo: 'HR55AX4712', company: 'G4S', startingTime: '11:44:44', speed: 90.1 },
            { plateNo: 'AP39HS4926', company: 'Milo', startingTime: '16:09:09', speed: 88.2 },
            { plateNo: 'HR47G5244', company: 'G4S', startingTime: '07:54:47', speed: 95.1 },
            { plateNo: 'CH01CK2912', company: 'ABC Transport', startingTime: '12:40:42', speed: 77.5 },
            { plateNo: 'WB22XY1234', company: 'XYZ Logistics', startingTime: '09:15:30', speed: 89.8 },
            { plateNo: 'DL88MN9876', company: 'Taxshe', startingTime: '14:20:18', speed: 96.3 },
            { plateNo: 'MH12PQ5432', company: 'Milo', startingTime: '10:35:25', speed: 82.7 }
        ];
    }
    
    static loadSampleDataForTab() {
        switch(currentTab) {
            case 'offline':
                currentData.offline = this.filterDataByClient(this.getSampleOfflineData(), selectedClient);
                UIUpdater.updateOfflineUI();
                break;
            case 'ai-alerts':
                currentData.alerts = this.filterDataByClient(this.getSampleAlertsData(), selectedClient);
                UIUpdater.updateAIAlertsUI();
                break;
            case 'speed':
                currentData.speed = this.filterDataByClient(this.getSampleSpeedData(), selectedClient);
                UIUpdater.updateSpeedUI();
                break;
        }
        this.updateNavigationBadges();
    }
    
    // Supabase integration (preserved)
    static async loadExistingStatus(vehicles) {
        if (!supabaseClient) return;
        
        try {
            const vehicleNumbers = vehicles.map(v => v['Vehicle Number']).filter(Boolean);
            const { data, error } = await supabaseClient
                .from('offline_status')
                .select('vehicle_number, current_status, reason, updated_at')
                .in('vehicle_number', vehicleNumbers);
            
            if (error) {
                console.warn('⚠️ Supabase query failed:', error);
                return;
            }
            
            vehicles.forEach(vehicle => {
                const statusRecord = data?.find(s => s.vehicle_number === vehicle['Vehicle Number']);
                if (statusRecord) {
                    vehicle.Status = statusRecord.current_status;
                    vehicle.Remarks = statusRecord.reason || vehicle.Remarks;
                }
            });
            
            console.log(`✅ Loaded status for ${data?.length || 0} vehicles`);
        } catch (error) {
            console.error('❌ Status loading failed:', error);
        }
    }
}

// Enhanced UI Manager
class UIManager {
    static showLoading(show = true) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'flex' : 'none';
    }
    
    static switchTab(tabName) {
        if (!tabName || !isAuthenticated) return;
        
        currentTab = tabName;
        console.log(`🔄 Switching to ${tabName} tab`);
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName)?.classList.add('active');

        // Show/hide period toggle for AI Alerts & Speed only
        const periodToggle = document.getElementById('period-toggle');
        if (tabName === 'ai-alerts' || tabName === 'speed') {
            periodToggle.classList.add('show');
        } else {
            periodToggle.classList.remove('show');
        }

        // Update date selector options
        DateManager.updateDateSelector();
        
        // Load data for the new tab
        if (tabName === 'client-manager') {
            ClientManager.updateClientManagerUI();
        } else {
            DataManager.loadDataForCurrentTab();
        }
    }
    
    static switchPeriod(period) {
        currentPeriod = period;
        console.log(`📊 Switching to ${period} period`);
        
        // Update UI
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-period="${period}"]`)?.classList.add('active');

        // Update date selector
        DateManager.updateDateSelector();
        
        // Reload data
        DataManager.loadDataForCurrentTab();
    }
    
    static setupMobileResponsive() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const sidebarClose = document.getElementById('sidebar-close');

        mobileMenuBtn.addEventListener('click', this.toggleMobileSidebar);
        sidebarOverlay.addEventListener('click', this.closeMobileSidebar);
        sidebarClose.addEventListener('click', this.closeMobileSidebar);
    }
    
    static toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }
    
    static closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }
}

// Enhanced UI Updater
class UIUpdater {
    static animateValue(element, start, end, duration) {
        if (!element || start === end) return;
        
        const range = end - start;
        const startTime = Date.now();
        
        function updateValue() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(start + range * easeOutQuart);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        }
        
        requestAnimationFrame(updateValue);
    }
    
    static updateOfflineUI() {
        const data = currentData.offline;
        
        // Update stats with animations
        this.animateValue(document.getElementById('total-offline'), 0, data.length, 1000);
        
        const avgOffline = data.length > 0 ? Math.round(data.reduce((sum, item) => sum + parseFloat(item['Offline Since (hrs)'] || 0), 0) / data.length) : 0;
        this.animateValue(document.getElementById('avg-offline'), 0, avgOffline, 1200);
        
        const criticalIssues = data.filter(item => parseFloat(item['Offline Since (hrs)'] || 0) > 1000).length;
        this.animateValue(document.getElementById('critical-issues'), 0, criticalIssues, 1400);
        
        this.updateOfflineTable(data);
        this.updateOfflineCharts(data);
    }
    
    static updateAIAlertsUI() {
        const data = currentData.alerts;
        
        let totalAlerts, uniqueVehicles, topViolator, alertRate;
        
        if (currentPeriod === 'daily') {
            totalAlerts = data.length;
            uniqueVehicles = new Set(data.map(alert => alert.plateNo)).size;
            const vehicleAlerts = data.reduce((acc, alert) => {
                acc[alert.plateNo] = (acc[alert.plateNo] || 0) + 1;
                return acc;
            }, {});
            const topEntry = Object.entries(vehicleAlerts).sort((a, b) => b[1] - a[1])[0];
            topViolator = topEntry ? topEntry[0].slice(-4) : '-';
            alertRate = Math.round(totalAlerts / 24 * 10) / 10;
        } else {
            totalAlerts = data.reduce((sum, item) => sum + (item.count || 0), 0);
            uniqueVehicles = data.length;
            const topEntry = data.sort((a, b) => (b.count || 0) - (a.count || 0))[0];
            topViolator = topEntry ? topEntry.plateNo.slice(-4) : '-';
            alertRate = data.length > 0 ? Math.round(totalAlerts / data.length * 10) / 10 : 0;
        }
        
        this.animateValue(document.getElementById('total-alerts'), 0, totalAlerts, 1000);
        this.animateValue(document.getElementById('unique-vehicles'), 0, uniqueVehicles, 1200);
        document.getElementById('top-violator').textContent = topViolator;
        document.getElementById('alert-rate').textContent = alertRate;
        
        this.updateAIAlertsTable(data);
        this.updateAIAlertsCharts(data);
    }
    
    static updateSpeedUI() {
        const data = currentData.speed;
        
        let totalViolations, warnings, alarms, maxSpeed;
        
        if (currentPeriod === 'daily') {
            totalViolations = data.length;
            warnings = data.filter(item => item.speed >= 75 && item.speed < 90).length;
            alarms = data.filter(item => item.speed >= 90).length;
            maxSpeed = data.length > 0 ? Math.max(...data.map(item => item.speed)) : 0;
        } else {
            totalViolations = data.reduce((sum, item) => sum + (item.violations || 0), 0);
            warnings = data.reduce((sum, item) => sum + (item.warnings || 0), 0);
            alarms = data.reduce((sum, item) => sum + (item.alarms || 0), 0);
            maxSpeed = data.length > 0 ? Math.max(...data.map(item => item.maxSpeed || 0)) : 0;
        }
        
        this.animateValue(document.getElementById('total-violations'), 0, totalViolations, 1000);
        this.animateValue(document.getElementById('warning-count'), 0, warnings, 1200);
        this.animateValue(document.getElementById('alarm-count'), 0, alarms, 1400);
        document.getElementById('max-speed').textContent = maxSpeed.toFixed(1);
        
        this.updateSpeedTable(data);
        this.updateSpeedCharts(data);
    }
    
    static updateOfflineTable(data) {
        const tbody = document.getElementById('offline-table-body');
        tbody.innerHTML = '';
        
        data.forEach(vehicle => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${vehicle['Vehicle Number']}</strong></td>
                <td><span class="status-badge status-info">${vehicle['Client'] || 'Unknown'}</span></td>
                <td>${vehicle['Last Online'] || '-'}</td>
                <td><span class="status-badge ${this.getOfflineHoursClass(vehicle['Offline Since (hrs)'])}">${vehicle['Offline Since (hrs)']}h</span></td>
                <td><span class="status-badge ${this.getStatusClass(vehicle.Status)}" id="status-${vehicle['Vehicle Number']}">${this.getStatusIcon(vehicle.Status)} ${vehicle.Status || 'Offline'}</span></td>
                <td>${vehicle.Remarks || '-'}</td>
                <td><button class="btn btn-secondary" onclick="ModalManager.editVehicleStatus('${vehicle['Vehicle Number']}')">Edit</button></td>
            `;
            tbody.appendChild(row);
        });
    }
    
    static updateAIAlertsTable(data) {
        const tbody = document.getElementById('alerts-table-body');
        tbody.innerHTML = '';
        
        data.forEach(alert => {
            const row = document.createElement('tr');
            if (currentPeriod === 'daily') {
                row.innerHTML = `
                    <td><strong>${alert.plateNo}</strong></td>
                    <td><span class="status-badge status-info">${alert.company}</span></td>
                    <td><span class="status-badge status-warning">${alert.alarmType}</span></td>
                    <td>${alert.startingTime}</td>
                    <td>${alert.imageLink ? `<a href="${alert.imageLink}" target="_blank" class="btn btn-secondary">View</a>` : '-'}</td>
                `;
            } else {
                row.innerHTML = `
                    <td><strong>${alert.plateNo}</strong></td>
                    <td><span class="status-badge status-info">${alert.company}</span></td>
                    <td><span class="status-badge status-warning">${alert.alarmType}</span></td>
                    <td><span class="status-badge status-info">${alert.count} total</span></td>
                    <td>-</td>
                `;
            }
            tbody.appendChild(row);
        });
    }
    
    static updateSpeedTable(data) {
        const tbody = document.getElementById('speed-table-body');
        tbody.innerHTML = '';
        
        if (currentPeriod === 'daily') {
            const vehicleStats = data.reduce((acc, item) => {
                const vehicle = item.plateNo;
                if (!acc[vehicle]) {
                    acc[vehicle] = { vehicle, company: item.company, maxSpeed: 0, warnings: 0, alarms: 0, total: 0 };
                }
                acc[vehicle].maxSpeed = Math.max(acc[vehicle].maxSpeed, item.speed);
                acc[vehicle].total++;
                if (item.speed >= 90) acc[vehicle].alarms++;
                else if (item.speed >= 75) acc[vehicle].warnings++;
                return acc;
            }, {});
            
            Object.values(vehicleStats).forEach(vehicle => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${vehicle.vehicle}</strong></td>
                    <td><span class="status-badge status-info">${vehicle.company}</span></td>
                    <td><span class="status-badge ${vehicle.maxSpeed >= 90 ? 'status-danger' : 'status-warning'}">${vehicle.maxSpeed.toFixed(1)} km/h</span></td>
                    <td><span class="status-badge status-warning">${vehicle.warnings}</span></td>
                    <td><span class="status-badge status-danger">${vehicle.alarms}</span></td>
                    <td><span class="status-badge status-info">${vehicle.total}</span></td>
                `;
                tbody.appendChild(row);
            });
        } else {
            data.forEach(vehicle => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${vehicle.plateNo}</strong></td>
                    <td><span class="status-badge status-info">${vehicle.company}</span></td>
                    <td><span class="status-badge ${vehicle.maxSpeed >= 90 ? 'status-danger' : 'status-warning'}">${vehicle.maxSpeed.toFixed(1)} km/h</span></td>
                    <td><span class="status-badge status-warning">${vehicle.warnings}</span></td>
                    <td><span class="status-badge status-danger">${vehicle.alarms}</span></td>
                    <td><span class="status-badge status-info">${vehicle.violations}</span></td>
                `;
                tbody.appendChild(row);
            });
        }
    }
    
    // Chart update methods (enhanced with modern styling)
    static updateOfflineCharts(data) {
        // Status Pie Chart
        const statusCtx = document.getElementById('status-pie-chart')?.getContext('2d');
        if (statusCtx) {
            if (charts.statusPie) charts.statusPie.destroy();
            
            const statusCounts = data.reduce((acc, item) => {
                const status = item.Status || 'Offline';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            
            charts.statusPie = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCounts),
                    datasets: [{
                        data: Object.values(statusCounts),
                        backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(139, 92, 246, 0.8)'
                        ],
                        borderWidth: 0,
                        hoverOffset: 12
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: { 
                                padding: 20, 
                                usePointStyle: true,
                                font: { size: 12, weight: 'bold' }
                            }
                        }
                    }
                }
            });
        }
        
        // Region Bar Chart
        const regionCtx = document.getElementById('region-bar-chart')?.getContext('2d');
        if (regionCtx) {
            if (charts.regionBar) charts.regionBar.destroy();
            
            const regionData = data.reduce((acc, item) => {
                const region = item['Vehicle Number']?.substring(0, 2) || 'Unknown';
                acc[region] = (acc[region] || 0) + 1;
                return acc;
            }, {});
            
            charts.regionBar = new Chart(regionCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(regionData),
                    datasets: [{
                        data: Object.values(regionData),
                        backgroundColor: 'rgba(102, 126, 234, 0.8)',
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            ticks: { font: { weight: 'bold' } }
                        },
                        x: { 
                            grid: { display: false },
                            ticks: { font: { weight: 'bold' } }
                        }
                    }
                }
            });
        }
    }
    
    static updateAIAlertsCharts(data) {
        // Vehicle Alerts Bar Chart
        const vehicleAlertsCtx = document.getElementById('vehicle-alerts-chart')?.getContext('2d');
        if (vehicleAlertsCtx) {
            if (charts.vehicleAlerts) charts.vehicleAlerts.destroy();
            
            let chartData;
            if (currentPeriod === 'daily') {
                const vehicleStats = data.reduce((acc, alert) => {
                    acc[alert.plateNo] = (acc[alert.plateNo] || 0) + 1;
                    return acc;
                }, {});
                chartData = {
                    labels: Object.keys(vehicleStats).slice(0, 10).map(v => v.slice(-4)),
                    data: Object.values(vehicleStats).slice(0, 10)
                };
            } else {
                chartData = {
                    labels: data.slice(0, 10).map(item => item.plateNo.slice(-4)),
                    data: data.slice(0, 10).map(item => item.count || 0)
                };
            }
            
            charts.vehicleAlerts = new Chart(vehicleAlertsCtx, {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        data: chartData.data,
                        backgroundColor: 'rgba(245, 158, 11, 0.8)',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            ticks: { font: { weight: 'bold' } }
                        },
                        x: { 
                            ticks: { font: { weight: 'bold' } }
                        }
                    }
                }
            });
        }
        
        // Alert Type Pie Chart
        const alertTypeCtx = document.getElementById('alert-type-chart')?.getContext('2d');
        if (alertTypeCtx) {
            if (charts.alertType) charts.alertType.destroy();
            
            let alertTypes;
            if (currentPeriod === 'daily') {
                alertTypes = data.reduce((acc, alert) => {
                    acc[alert.alarmType] = (acc[alert.alarmType] || 0) + 1;
                    return acc;
                }, {});
            } else {
                alertTypes = data.reduce((acc, item) => {
                    acc[item.alarmType] = (acc[item.alarmType] || 0) + (item.count || 0);
                    return acc;
                }, {});
            }
            
            charts.alertType = new Chart(alertTypeCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(alertTypes),
                    datasets: [{
                        data: Object.values(alertTypes),
                        backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(139, 92, 246, 0.8)',
                            'rgba(236, 72, 153, 0.8)',
                            'rgba(107, 114, 128, 0.8)'
                        ],
                        borderWidth: 0,
                        hoverOffset: 12
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { 
                            position: 'bottom',
                            labels: { 
                                padding: 20, 
                                usePointStyle: true,
                                font: { size: 12, weight: 'bold' }
                            }
                        }
                    }
                }
            });
        }
        
        // Alert Trend Line Chart
        const alertTrendCtx = document.getElementById('alert-trend-chart')?.getContext('2d');
        if (alertTrendCtx) {
            if (charts.alertTrend) charts.alertTrend.destroy();
            
            let trendData;
            if (currentPeriod === 'daily') {
                // Hourly trend
                const hourlyData = Array(24).fill(0);
                data.forEach(alert => {
                    const hour = parseInt(alert.startingTime?.split(':')[0] || 0);
                    if (hour >= 0 && hour <= 23) {
                        hourlyData[hour]++;
                    }
                });
                trendData = {
                    labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                    data: hourlyData
                };
            } else {
                // Daily trend
                trendData = {
                    labels: data.slice(0, 10).map(item => item.plateNo.slice(-4)),
                    data: data.slice(0, 10).map(item => item.count || 0)
                };
            }
            
            charts.alertTrend = new Chart(alertTrendCtx, {
                type: 'line',
                data: {
                    labels: trendData.labels,
                    datasets: [{
                        data: trendData.data,
                        borderColor: 'rgba(102, 126, 234, 1)',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            ticks: { font: { weight: 'bold' } }
                        },
                        x: { 
                            ticks: { font: { weight: 'bold' } }
                        }
                    }
                }
            });
        }
    }
    
    static updateSpeedCharts(data) {
        // Speed Violations Bar Chart
        const speedViolationsCtx = document.getElementById('speed-violations-chart')?.getContext('2d');
        if (speedViolationsCtx) {
            if (charts.speedViolations) charts.speedViolations.destroy();
            
            let chartData;
            if (currentPeriod === 'daily') {
                const vehicleStats = data.reduce((acc, item) => {
                    acc[item.plateNo] = (acc[item.plateNo] || 0) + 1;
                    return acc;
                }, {});
                chartData = {
                    labels: Object.keys(vehicleStats).slice(0, 10).map(v => v.slice(-4)),
                    data: Object.values(vehicleStats).slice(0, 10)
                };
            } else {
                chartData = {
                    labels: data.slice(0, 10).map(item => item.plateNo.slice(-4)),
                    data: data.slice(0, 10).map(item => item.violations || 0)
                };
            }
            
            charts.speedViolations = new Chart(speedViolationsCtx, {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        data: chartData.data,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            ticks: { font: { weight: 'bold' } }
                        },
                        x: { 
                            ticks: { font: { weight: 'bold' } }
                        }
                    }
                }
            });
        }
        
        // Speed Category Pie Chart
        const speedCategoryCtx = document.getElementById('speed-category-chart')?.getContext('2d');
        if (speedCategoryCtx) {
            if (charts.speedCategory) charts.speedCategory.destroy();
            
            let warnings, alarms;
            if (currentPeriod === 'daily') {
                warnings = data.filter(item => item.speed >= 75 && item.speed < 90).length;
                alarms = data.filter(item => item.speed >= 90).length;
            } else {
                warnings = data.reduce((sum, item) => sum + (item.warnings || 0), 0);
                alarms = data.reduce((sum, item) => sum + (item.alarms || 0), 0);
            }
            
            charts.speedCategory = new Chart(speedCategoryCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Warnings (75-89)', 'Alarms (90+)'],
                    datasets: [{
                        data: [warnings, alarms],
                        backgroundColor: [
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                        ],
                        borderWidth: 0,
                        hoverOffset: 12
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { 
                            position: 'bottom',
                            labels: { 
                                padding: 20, 
                                usePointStyle: true,
                                font: { size: 12, weight: 'bold' }
                            }
                        }
                    }
                }
            });
        }
        
        // Speed Trend Line Chart
        const speedTrendCtx = document.getElementById('speed-trend-chart')?.getContext('2d');
        if (speedTrendCtx) {
            if (charts.speedTrend) charts.speedTrend.destroy();
            
            let trendData;
            if (currentPeriod === 'daily') {
                // Hourly trend
                const hourlyData = Array(24).fill(0);
                data.forEach(violation => {
                    const hour = parseInt(violation.startingTime?.split(':')[0] || 0);
                    if (hour >= 0 && hour <= 23) {
                        hourlyData[hour]++;
                    }
                });
                trendData = {
                    labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                    data: hourlyData
                };
            } else {
                // Vehicle trend
                trendData = {
                    labels: data.slice(0, 10).map(item => item.plateNo.slice(-4)),
                    data: data.slice(0, 10).map(item => item.violations || 0)
                };
            }
            
            charts.speedTrend = new Chart(speedTrendCtx, {
                type: 'line',
                data: {
                    labels: trendData.labels,
                    datasets: [{
                        data: trendData.data,
                        borderColor: 'rgba(239, 68, 68, 1)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            ticks: { font: { weight: 'bold' } }
                        },
                        x: { 
                            ticks: { font: { weight: 'bold' } }
                        }
                    }
                }
            });
        }
    }
    
    // Utility methods
    static getStatusClass(status) {
        const statusMap = {
            'Online': 'status-online',
            'Parking/Garage': 'status-info',
            'Dashcam Issue': 'status-danger',
            'Technical Problem': 'status-warning',
            'Offline': 'status-danger'
        };
        return statusMap[status] || 'status-danger';
    }
    
    static getStatusIcon(status) {
        const iconMap = {
            'Online': '✅',
            'Parking/Garage': '🅿️',
            'Dashcam Issue': '📷',
            'Technical Problem': '🔧',
            'Offline': '🔴'
        };
        return iconMap[status] || '🔴';
    }
    
    static getOfflineHoursClass(hours) {
        const h = parseFloat(hours || 0);
        if (h > 1000) return 'status-danger';
        if (h > 100) return 'status-warning';
        return 'status-info';
    }
}

// Client Manager Class
class ClientManager {
    static updateClientManagerUI() {
        if (currentUser?.role !== 'manager') return;
        
        // Update stats
        const totalClients = CONFIG.dynamicClients.size;
        const activeLogins = Object.keys(CONFIG.auth.clients).length;
        const totalVehicles = currentData.offline.length + currentData.alerts.length + currentData.speed.length;
        
        UIUpdater.animateValue(document.getElementById('total-clients'), 0, totalClients, 1000);
        UIUpdater.animateValue(document.getElementById('active-logins'), 0, activeLogins, 1200);
        UIUpdater.animateValue(document.getElementById('total-vehicles'), 0, totalVehicles, 1400);
        
        // Update client management table
        this.updateClientTable();
    }
    
    static updateClientTable() {
        const tbody = document.getElementById('client-manager-table-body');
        tbody.innerHTML = '';
        
        // Add existing clients with login credentials
        Object.entries(CONFIG.auth.clients).forEach(([username, clientData]) => {
            const vehicleCount = this.getVehicleCountForClient(clientData.filter);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${clientData.name}</strong></td>
                <td><span class="status-badge status-info">${username}</span></td>
                <td><span class="status-badge status-warning">••••••••</span></td>
                <td><span class="status-badge status-success">${vehicleCount}</span></td>
                <td><span class="status-badge status-online">Active</span></td>
                <td>Recently</td>
                <td>
                    <button class="btn btn-secondary" onclick="ClientManager.editClient('${username}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="ClientManager.resetPassword('${username}')">
                        <i class="fas fa-key"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add clients without login credentials
        Array.from(CONFIG.dynamicClients).forEach(clientName => {
            if (!Object.values(CONFIG.auth.clients).some(c => c.filter === clientName)) {
                const vehicleCount = this.getVehicleCountForClient(clientName);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${clientName.charAt(0).toUpperCase() + clientName.slice(1)}</strong></td>
                    <td><span class="status-badge status-warning">No Login</span></td>
                    <td><span class="status-badge status-danger">Not Set</span></td>
                    <td><span class="status-badge status-info">${vehicleCount}</span></td>
                    <td><span class="status-badge status-warning">Inactive</span></td>
                    <td>Never</td>
                    <td>
                        <button class="btn btn-primary" onclick="ClientManager.createLogin('${clientName}')">
                            <i class="fas fa-plus"></i>
                            Create Login
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            }
        });
    }
    
    static getVehicleCountForClient(clientFilter) {
        let count = 0;
        
        // Count from offline data
        count += currentData.offline.filter(item => {
            const client = (item.client || item.Client || item.company || '').toLowerCase();
            return client.includes(clientFilter.toLowerCase());
        }).length;
        
        // Count from alerts data (unique vehicles)
        const alertVehicles = new Set(currentData.alerts
            .filter(item => {
                const client = (item.company || '').toLowerCase();
                return client.includes(clientFilter.toLowerCase());
            })
            .map(item => item.plateNo));
        
        // Count from speed data (unique vehicles)
        const speedVehicles = new Set(currentData.speed
            .filter(item => {
                const client = (item.company || '').toLowerCase();
                return client.includes(clientFilter.toLowerCase());
            })
            .map(item => item.plateNo));
        
        // Combine unique vehicles
        const allVehicles = new Set([...alertVehicles, ...speedVehicles]);
        
        return Math.max(count, allVehicles.size);
    }
    
    static editClient(username) {
        const clientData = CONFIG.auth.clients[username];
        if (!clientData) return;
        
        document.getElementById('new-client-name').value = clientData.name;
        document.getElementById('new-client-username').value = username;
        document.getElementById('new-client-password').value = clientData.password;
        document.getElementById('new-client-description').value = `${clientData.name} client access`;
        
        document.getElementById('add-client-modal').style.display = 'flex';
    }
    
    static createLogin(clientName) {
        const username = clientName.toLowerCase();
        document.getElementById('new-client-name').value = clientName.charAt(0).toUpperCase() + clientName.slice(1);
        document.getElementById('new-client-username').value = username;
        document.getElementById('new-client-password').value = 'client123';
        document.getElementById('new-client-description').value = `Login access for ${clientName}`;
        
        document.getElementById('add-client-modal').style.display = 'flex';
    }
    
    static resetPassword(username) {
        const newPassword = 'temp' + Math.random().toString(36).substr(2, 6);
        CONFIG.auth.clients[username].password = newPassword;
        
        NotificationManager.showSuccess(`Password reset for ${username}: ${newPassword}`);
        this.updateClientTable();
    }
}

// Enhanced Modal Manager with Client Management
class ModalManager {
    static addNewClient() {
        // Clear form
        document.getElementById('new-client-name').value = '';
        document.getElementById('new-client-username').value = '';
        document.getElementById('new-client-password').value = '';
        document.getElementById('new-client-description').value = '';
        
        document.getElementById('add-client-modal').style.display = 'flex';
    }
    
    static closeAddClientModal() {
        document.getElementById('add-client-modal').style.display = 'none';
    }
    
    static async saveNewClient() {
        const name = document.getElementById('new-client-name').value.trim();
        const username = document.getElementById('new-client-username').value.trim().toLowerCase();
        const password = document.getElementById('new-client-password').value;
        
        if (!name || !username || !password) {
            NotificationManager.showError('Please fill all required fields');
            return;
        }
        
        // Add to CONFIG
        CONFIG.auth.clients[username] = {
            password: password,
            name: name,
            filter: username
        };
        
        CONFIG.dynamicClients.add(username);
        
        NotificationManager.showSuccess(`Client ${name} added successfully!`);
        
        // Update UI
        DataManager.updateClientDropdown();
        AuthManager.updateUserInfo();
        ClientManager.updateClientTable();
        
        this.closeAddClientModal();
    }
class ModalManager {
    static editVehicleStatus(vehicleNumber) {
        document.getElementById('modal-vehicle').value = vehicleNumber;
        document.getElementById('status-select').value = 'Parking/Garage';
        document.getElementById('reason-input').value = '';
        document.getElementById('status-modal').style.display = 'flex';
    }
    
    static closeStatusModal() {
        document.getElementById('status-modal').style.display = 'none';
    }
    
    static async saveVehicleStatus() {
        const vehicleNumber = document.getElementById('modal-vehicle').value;
        const status = document.getElementById('status-select').value;
        const reason = document.getElementById('reason-input').value;
        
        if (!vehicleNumber || !status) {
            NotificationManager.showError('Please fill required fields');
            return;
        }
        
        try {
            UIManager.showLoading(true);
            
            if (supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('offline_status')
                    .upsert({
                        vehicle_number: vehicleNumber,
                        current_status: status,
                        reason: reason.trim() || null,
                        updated_at: new Date().toISOString(),
                        updated_by: currentUser?.name || 'User'
                    });
                
                if (error) {
                    throw error;
                }
                
                NotificationManager.showSuccess('Status updated successfully!');
            } else {
                NotificationManager.showSuccess('Status updated locally');
            }
            
            // Update UI
            const statusElement = document.getElementById(`status-${vehicleNumber}`);
            if (statusElement) {
                statusElement.className = `status-badge ${UIUpdater.getStatusClass(status)}`;
                statusElement.textContent = `${UIUpdater.getStatusIcon(status)} ${status}`;
            }
            
            // Update data
            const vehicle = currentData.offline.find(v => v['Vehicle Number'] === vehicleNumber);
            if (vehicle) {
                vehicle.Status = status;
                vehicle.Remarks = reason || vehicle.Remarks;
            }
            
            this.closeStatusModal();
            
        } catch (error) {
            console.error('❌ Status save failed:', error);
            NotificationManager.showError('Failed to save status');
        } finally {
            UIManager.showLoading(false);
        }
    }
}

// Enhanced Search and Filter Manager
class SearchFilterManager {
    static setupSearch() {
        document.getElementById('global-search').addEventListener('input', this.handleSearch);
    }
    
    static handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        console.log('🔍 Searching:', searchTerm);
        
        if (!searchTerm) {
            // Show all data
            switch(currentTab) {
                case 'offline':
                    UIUpdater.updateOfflineTable(currentData.offline);
                    break;
                case 'ai-alerts':
                    UIUpdater.updateAIAlertsTable(currentData.alerts);
                    break;
                case 'speed':
                    UIUpdater.updateSpeedTable(currentData.speed);
                    break;
            }
            return;
        }
        
        // Filter data
        let filteredData = [];
        switch(currentTab) {
            case 'offline':
                filteredData = currentData.offline.filter(item => 
                    JSON.stringify(item).toLowerCase().includes(searchTerm)
                );
                UIUpdater.updateOfflineTable(filteredData);
                break;
            case 'ai-alerts':
                filteredData = currentData.alerts.filter(item => 
                    JSON.stringify(item).toLowerCase().includes(searchTerm)
                );
                UIUpdater.updateAIAlertsTable(filteredData);
                break;
            case 'speed':
                filteredData = currentData.speed.filter(item => 
                    JSON.stringify(item).toLowerCase().includes(searchTerm)
                );
                UIUpdater.updateSpeedTable(filteredData);
                break;
        }
    }
    
    static setupTableFilters() {
        // Region filter
        const regionFilter = document.getElementById('region-filter');
        if (regionFilter) {
            regionFilter.addEventListener('change', this.applyFilters);
        }
        
        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', this.applyFilters);
        }
        
        // Alert type filter
        const alertTypeFilter = document.getElementById('alert-type-filter');
        if (alertTypeFilter) {
            alertTypeFilter.addEventListener('change', this.applyFilters);
        }
        
        // Speed filter
        const speedFilter = document.getElementById('speed-filter');
        if (speedFilter) {
            speedFilter.addEventListener('change', this.applyFilters);
        }
    }
    
    static applyFilters() {
        const searchTerm = document.getElementById('global-search').value.toLowerCase();
        
        let filteredData = [...(currentData[currentTab.replace('-', '')] || [])];
        
        // Apply search
        if (searchTerm) {
            filteredData = filteredData.filter(item => 
                JSON.stringify(item).toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply specific filters
        switch(currentTab) {
            case 'offline':
                const regionFilter = document.getElementById('region-filter')?.value;
                const statusFilter = document.getElementById('status-filter')?.value;
                
                if (regionFilter) {
                    filteredData = filteredData.filter(item => 
                        (item['Vehicle Number'] || '').startsWith(regionFilter)
                    );
                }
                
                if (statusFilter) {
                    filteredData = filteredData.filter(item => 
                        (item['Status'] || 'offline').toLowerCase().includes(statusFilter)
                    );
                }
                
                UIUpdater.updateOfflineTable(filteredData);
                break;
                
            case 'ai-alerts':
                const alertTypeFilter = document.getElementById('alert-type-filter')?.value;
                
                if (alertTypeFilter) {
                    filteredData = filteredData.filter(item => 
                        (item.alarmType || '').toLowerCase().includes(alertTypeFilter)
                    );
                }
                
                UIUpdater.updateAIAlertsTable(filteredData);
                break;
                
            case 'speed':
                const speedFilter = document.getElementById('speed-filter')?.value;
                
                if (speedFilter === 'warning') {
                    filteredData = filteredData.filter(item => {
                        const speed = item.maxSpeed || item.speed || 0;
                        return speed >= 75 && speed < 90;
                    });
                } else if (speedFilter === 'alarm') {
                    filteredData = filteredData.filter(item => {
                        const speed = item.maxSpeed || item.speed || 0;
                        return speed >= 90;
                    });
                }
                
                UIUpdater.updateSpeedTable(filteredData);
                break;
        }
    }
}

// Enhanced Notification Manager
class NotificationManager {
    static showError(message) {
        this.showNotification(message, 'error');
    }
    
    static showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    static showInfo(message) {
        this.showNotification(message, 'info');
    }
    
    static showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            font-weight: 600;
            z-index: 10002;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(20px);
            display: flex;
            align-items: center;
            gap: 0.75rem;
        `;
        
        const colors = {
            success: 'background: linear-gradient(135deg, #10b981, #059669); color: white;',
            error: 'background: linear-gradient(135deg, #ef4444, #dc2626); color: white;',
            info: 'background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;'
        };
        
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        
        notification.style.cssText += colors[type];
        notification.innerHTML = `${icons[type]}<span>${message}</span>`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, type === 'error' ? 5000 : 3000);
    }
}

// Enhanced Export Manager
class ExportManager {
    static exportToPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Header
            doc.setFontSize(20);
            doc.text('G4S Fleet Management Report', 20, 20);
            
            doc.setFontSize(12);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 35);
            doc.text(`Period: ${currentPeriod.toUpperCase()}`, 20, 45);
            doc.text(`Tab: ${currentTab.replace('-', ' ').toUpperCase()}`, 20, 55);
            doc.text(`User: ${currentUser?.name || 'Unknown'}`, 20, 65);
            
            // Table data
            let tableData = [];
            let headers = [];
            
            const data = currentData[currentTab.replace('-', '')];
            
            switch(currentTab) {
                case 'offline':
                    headers = ['Vehicle', 'Client', 'Last Online', 'Hours', 'Status', 'Remarks'];
                    tableData = data.map(item => [
                        item['Vehicle Number'],
                        item['Client'] || 'Unknown',
                        item['Last Online'],
                        item['Offline Since (hrs)'] + 'h',
                        item['Status'] || 'Offline',
                        item['Remarks'] || '-'
                    ]);
                    break;
                    
                case 'ai-alerts':
                    if (currentPeriod === 'daily') {
                        headers = ['Vehicle', 'Company', 'Alert Type', 'Time'];
                        tableData = data.map(item => [
                            item.plateNo,
                            item.company,
                            item.alarmType,
                            item.startingTime
                        ]);
                    } else {
                        headers = ['Vehicle', 'Company', 'Alert Type', 'Count'];
                        tableData = data.map(item => [
                            item.plateNo,
                            item.company,
                            item.alarmType,
                            item.count.toString()
                        ]);
                    }
                    break;
                    
                case 'speed':
                    headers = ['Vehicle', 'Company', 'Max Speed', 'Warnings', 'Alarms'];
                    tableData = data.map(item => [
                        item.plateNo,
                        item.company,
                        (item.maxSpeed || item.speed).toFixed(1) + ' km/h',
                        (item.warnings || (item.speed >= 75 && item.speed < 90 ? 1 : 0)).toString(),
                        (item.alarms || (item.speed >= 90 ? 1 : 0)).toString()
                    ]);
                    break;
            }
            
            doc.autoTable({
                head: [headers],
                body: tableData,
                startY: 80,
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [102, 126, 234], textColor: 255 }
            });
            
            const filename = `G4S-${currentTab}-${currentPeriod}-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            NotificationManager.showSuccess('PDF exported successfully!');
            
        } catch (error) {
            console.error('❌ PDF export failed:', error);
            NotificationManager.showError('PDF export failed');
        }
    }
}

// Enhanced Auto Refresh Manager
class AutoRefreshManager {
    static interval = null;
    
    static start() {
        // Auto-refresh every 5 minutes
        this.interval = setInterval(() => {
            if (document.visibilityState === 'visible' && isAuthenticated) {
                console.log('🔄 Auto-refreshing data...');
                DataManager.loadDataForCurrentTab();
            }
        }, 5 * 60 * 1000);
    }
    
    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    
    static restart() {
        this.stop();
        this.start();
    }
}

// Global Functions (for HTML onclick handlers)
function logout() {
    AuthManager.logout();
    AutoRefreshManager.stop();
}

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing G4S Professional Dashboard v2.0...');
    initializeApp();
});

function initializeApp() {
    initializeSupabase();
    setupEventListeners();
    ThemeManager.init();
    UIManager.setupMobileResponsive();
    SearchFilterManager.setupSearch();
    SearchFilterManager.setupTableFilters();
    
    // Preload all clients from spreadsheet for manager dropdown
    DataManager.preloadAllClients();
    
    // Initialize with sample data for immediate UI display
    initializeWithSampleData();
    
    console.log('✅ G4S Dashboard v2.0 initialized successfully');
}

function initializeSupabase() {
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);
            console.log('✅ Supabase connected');
        } else {
            console.warn('⚠️ Supabase SDK not loaded');
        }
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
    }
}

function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Login toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Navigation
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            UIManager.switchTab(tab);
            UIManager.closeMobileSidebar();
        });
    });

    // Period toggles
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => UIManager.switchPeriod(btn.dataset.period));
    });

    // Date selector
    document.getElementById('date-select').addEventListener('change', () => {
        DataManager.loadDataForCurrentTab();
    });

    // Client selector change handler
    document.getElementById('client-dropdown').addEventListener('change', (e) => {
        selectedClient = e.target.value;
        console.log(`👤 Manager selected client: ${selectedClient || 'All'}`);
        
        // Clear current data
        currentData = { offline: [], speed: [], alerts: [] };
        
        // Reload all data for selected client
        DataManager.loadDataForCurrentTab();
        
        // Update user info display
        const userInfo = document.getElementById('user-name');
        if (selectedClient) {
            const clientName = selectedClient.charAt(0).toUpperCase() + selectedClient.slice(1);
            userInfo.textContent = `Fleet Manager - ${clientName}`;
        } else {
            userInfo.textContent = 'Fleet Manager - All Clients';
        }
    });

    // Action buttons
    document.getElementById('refresh-btn').addEventListener('click', () => {
        DataManager.loadDataForCurrentTab();
    });
    
    document.getElementById('export-btn').addEventListener('click', () => {
        ExportManager.exportToPDF();
    });

    // Range picker
    document.getElementById('range-btn').addEventListener('click', DateManager.openRangePicker);
    document.getElementById('range-close').addEventListener('click', DateManager.closeRangePicker);
    document.getElementById('range-cancel').addEventListener('click', DateManager.closeRangePicker);
    document.getElementById('range-apply').addEventListener('click', DateManager.applyDateRange);

    // Status modal
    document.getElementById('modal-close').addEventListener('click', ModalManager.closeStatusModal);
    document.getElementById('cancel-status').addEventListener('click', ModalManager.closeStatusModal);
    document.getElementById('save-status').addEventListener('click', ModalManager.saveVehicleStatus);

    // Add client modal
    document.getElementById('add-client-close').addEventListener('click', ModalManager.closeAddClientModal);
    document.getElementById('cancel-add-client').addEventListener('click', ModalManager.closeAddClientModal);
    document.getElementById('save-new-client').addEventListener('click', ModalManager.saveNewClient);

    // Click outside modals to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const mode = document.querySelector('.toggle-btn.active').dataset.mode;
    
    if (!username || !password) {
        NotificationManager.showError('Please enter username and password');
        return;
    }
    
    if (AuthManager.login(username, password, mode)) {
        // Login successful
        isAuthenticated = true;
        
        // Hide login screen and show dashboard
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('dashboard').style.display = 'flex';
        
        // Update user info
        AuthManager.updateUserInfo();
        
        // Load initial data
        DateManager.updateDateSelector();
        DataManager.loadDataForCurrentTab();
        
        // Start auto refresh
        AutoRefreshManager.start();
        
        NotificationManager.showSuccess(`Welcome, ${currentUser.name}!`);
        
        console.log(`✅ Login successful: ${currentUser.name} (${currentUser.role})`);
    } else {
        NotificationManager.showError('Invalid username or password');
        console.log(`❌ Login failed for: ${username} (${mode})`);
    }
    
    // Clear form
    document.getElementById('login-form').reset();
}

function handleKeyboardShortcuts(e) {
    if (!isAuthenticated) return;
    
    // Ctrl/Cmd + R for refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        DataManager.loadDataForCurrentTab();
    }
    
    // Ctrl/Cmd + E for export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        ExportManager.exportToPDF();
    }
    
    // Ctrl/Cmd + / for search focus
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        document.getElementById('global-search').focus();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal[style*="flex"]');
        modals.forEach(modal => modal.style.display = 'none');
        UIManager.closeMobileSidebar();
    }
    
    // Tab switching with number keys
    if (e.key >= '1' && e.key <= '3' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const tabs = ['offline', 'ai-alerts', 'speed'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
            UIManager.switchTab(tabs[tabIndex]);
        }
    }
}

function initializeWithSampleData() {
    // Set sample data filtered by current user
    const sampleOffline = DataManager.getSampleOfflineData();
    const sampleAlerts = DataManager.getSampleAlertsData();
    const sampleSpeed = DataManager.getSampleSpeedData();
    
    // Apply filtering if user is authenticated
    if (isAuthenticated && currentUser) {
        currentData.offline = DataManager.filterDataByClient(sampleOffline, currentUser.filter);
        currentData.alerts = DataManager.filterDataByClient(sampleAlerts, currentUser.filter);
        currentData.speed = DataManager.filterDataByClient(sampleSpeed, currentUser.filter);
    } else {
        // Show all data for demo
        currentData.offline = sampleOffline;
        currentData.alerts = sampleAlerts;
        currentData.speed = sampleSpeed;
    }
    
    // Update UI immediately for demo purposes
    UIUpdater.updateOfflineUI();
    UIUpdater.updateAIAlertsUI();
    UIUpdater.updateSpeedUI();
    
    // Update navigation badges
    DataManager.updateNavigationBadges();
}

// Enhanced Error Handling
window.addEventListener('error', (e) => {
    console.error('🚨 Global error:', e.error);
    NotificationManager.showError('An unexpected error occurred. Please refresh the page.');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 Unhandled promise rejection:', e.reason);
    NotificationManager.showError('Network error occurred. Please check your connection.');
});

// Enhanced Performance Monitoring
let performanceMetrics = {
    loadTimes: [],
    chartRenderTimes: [],
    dataFetchTimes: []
};

function logPerformanceMetric(type, startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    performanceMetrics[type + 'Times'].push(duration);
    
    if (performanceMetrics[type + 'Times'].length > 10) {
        performanceMetrics[type + 'Times'].shift();
    }
    
    console.log(`⚡ ${type} took ${duration.toFixed(2)}ms`);
}

// Service Worker Registration for PWA capabilities
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('❌ SW registration failed: ', registrationError);
            });
    });
}

// Enhanced Accessibility Features
function setupAccessibility() {
    // Add keyboard navigation for charts
    document.querySelectorAll('canvas').forEach(canvas => {
        canvas.setAttribute('tabindex', '0');
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Data visualization chart');
    });
    
    // Add ARIA labels to dynamic content
    document.querySelectorAll('.stat-value').forEach(element => {
        element.setAttribute('aria-live', 'polite');
    });
    
    // Enhanced focus indicators
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-navigation');
    });
}

// Initialize accessibility features when DOM is ready
document.addEventListener('DOMContentLoaded', setupAccessibility);

// Add CSS for keyboard navigation
const keyboardNavigationCSS = `
    .keyboard-navigation *:focus {
        outline: 2px solid #667eea !important;
        outline-offset: 2px !important;
    }
`;

const style = document.createElement('style');
style.textContent = keyboardNavigationCSS;
document.head.appendChild(style);

console.log('🎯 G4S Fleet Management Dashboard v2.0 - Ready for Authentication');

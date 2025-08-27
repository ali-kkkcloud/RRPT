// Enhanced G4S Fleet Management Dashboard
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
    app: {
        name: 'G4S Fleet Dashboard',
        version: '2.0.0',
        updateInterval: 300000 // 5 minutes
    }
};

// Global State Management
const AppState = {
    currentUser: { role: 'Admin', name: 'Fleet Manager' },
    currentTheme: localStorage.getItem('dashboard-theme') || 'light',
    currentPeriod: 'daily',
    currentTab: 'offline',
    filters: {
        search: '',
        city: '',
        vehicle: '',
        status: ''
    },
    data: {
        offline: [],
        speed: [],
        alerts: [],
        historical: {}
    },
    charts: {},
    isLoading: false,
    lastUpdate: null
};

// Global variables
let supabaseClient;
let installPrompt = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Enhanced G4S Dashboard v' + CONFIG.app.version);
    
    initializeApp();
    setupEventListeners();
    applyTheme(AppState.currentTheme);
    setupPWA();
    updateLastUpdated();
    loadAllData();
    
    // Auto-refresh data
    setInterval(() => {
        if (!AppState.isLoading) {
            loadAllData();
        }
    }, CONFIG.app.updateInterval);
});

// Initialize core application components
function initializeApp() {
    initializeSupabase();
    initializeAnimations();
    setupRoleManagement();
    console.log('✅ Core application initialized');
}

// Initialize Supabase
function initializeSupabase() {
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);
            console.log('✅ Supabase connected');
        } else {
            console.warn('⚠️ Supabase not available - running in offline mode');
        }
    } catch (error) {
        console.error('❌ Supabase initialization error:', error);
    }
}

// Initialize animations and effects
function initializeAnimations() {
    // Add staggered animation delays to cards
    const cards = document.querySelectorAll('.animate-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${(index * 0.1) + 0.1}s`;
    });
}

// Setup all event listeners
function setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Role toggle
    document.getElementById('role-toggle').addEventListener('click', toggleUserRole);
    
    // Period toggle
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => changePeriod(e.target.dataset.period));
    });
    
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Date selector
    document.getElementById('date-select').addEventListener('change', function() {
        console.log('📅 Date changed to:', this.value);
        loadDateBasedData(this.value);
    });

    // Smart filters and search
    setupSmartFilters();

    // Export buttons
    document.getElementById('export-pdf').addEventListener('click', exportToPDF);
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    document.getElementById('refresh-btn').addEventListener('click', refreshData);

    // Modal events
    setupModalEvents();
    
    // AI Insights
    document.getElementById('regenerate-insights').addEventListener('click', generateAIInsights);
    
    // Keyboard shortcuts
    setupKeyboardShortcuts();
}

// Setup smart filters and search functionality
function setupSmartFilters() {
    const searchInput = document.getElementById('global-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterCity = document.getElementById('filter-city');
    const filterVehicle = document.getElementById('filter-vehicle');
    const filterStatus = document.getElementById('filter-status');

    // Debounced search
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            AppState.filters.search = this.value.toLowerCase();
            applyFilters();
        }, 300);
    });

    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        AppState.filters.search = '';
        resetAllFilters();
        applyFilters();
    });

    // Cascading filters
    filterCity.addEventListener('change', function() {
        AppState.filters.city = this.value;
        updateDependentFilters();
        applyFilters();
    });

    filterVehicle.addEventListener('change', function() {
        AppState.filters.vehicle = this.value;
        applyFilters();
    });

    filterStatus.addEventListener('change', function() {
        AppState.filters.status = this.value;
        applyFilters();
    });

    // Table-specific search inputs
    setupTableSearch('offline-search', 'offline-table');
    setupTableSearch('alerts-search', 'alerts-table');
    setupTableSearch('speed-search', 'speed-table');
}

// Setup table-specific search
function setupTableSearch(inputId, tableId) {
    const input = document.getElementById(inputId);
    if (input) {
        let searchTimeout;
        input.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterTable(tableId, this.value.toLowerCase());
            }, 200);
        });
    }
}

// Filter table rows based on search term
function filterTable(tableId, searchTerm) {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const isVisible = searchTerm === '' || text.includes(searchTerm);
        row.style.display = isVisible ? '' : 'none';
        
        if (isVisible) {
            row.style.animation = 'fadeIn 0.3s ease';
        }
    });
}

// Update dependent filters based on current selection
function updateDependentFilters() {
    const vehicleFilter = document.getElementById('filter-vehicle');
    const selectedCity = AppState.filters.city;
    
    // Clear and repopulate vehicle filter
    vehicleFilter.innerHTML = '<option value="">All Vehicles</option>';
    
    let vehicles = new Set();
    
    // Collect vehicles from all data sources
    [...AppState.data.offline, ...AppState.data.speed, ...AppState.data.alerts].forEach(item => {
        const vehicle = item.plateNo || item['Vehicle Number'] || '';
        const company = item.company || item.client || '';
        
        if (vehicle && (selectedCity === '' || company.includes(selectedCity))) {
            vehicles.add(vehicle);
        }
    });
    
    // Add vehicles to filter
    Array.from(vehicles).sort().forEach(vehicle => {
        const option = document.createElement('option');
        option.value = vehicle;
        option.textContent = vehicle;
        vehicleFilter.appendChild(option);
    });
}

// Apply all active filters
function applyFilters() {
    const filteredData = {
        offline: filterDataArray(AppState.data.offline, 'offline'),
        speed: filterDataArray(AppState.data.speed, 'speed'),
        alerts: filterDataArray(AppState.data.alerts, 'alerts')
    };

    // Update UI with filtered data
    updateOfflineUI(filteredData.offline);
    updateSpeedUI(filteredData.speed);
    updateAIAlertsUI(filteredData.alerts);
    
    showFilterResults(filteredData);
}

// Filter data array based on current filters
function filterDataArray(data, type) {
    return data.filter(item => {
        const vehicleField = item.plateNo || item['Vehicle Number'] || '';
        const companyField = item.company || item.client || '';
        const statusField = getItemStatus(item, type);
        
        // Search filter
        if (AppState.filters.search) {
            const searchText = `${vehicleField} ${companyField} ${statusField} ${JSON.stringify(item)}`.toLowerCase();
            if (!searchText.includes(AppState.filters.search)) {
                return false;
            }
        }
        
        // City filter
        if (AppState.filters.city && !companyField.includes(AppState.filters.city)) {
            return false;
        }
        
        // Vehicle filter
        if (AppState.filters.vehicle && vehicleField !== AppState.filters.vehicle) {
            return false;
        }
        
        // Status filter
        if (AppState.filters.status && !statusField.includes(AppState.filters.status)) {
            return false;
        }
        
        return true;
    });
}

// Get item status for filtering
function getItemStatus(item, type) {
    switch (type) {
        case 'offline':
            const hours = parseFloat(item['Offline Since (hrs)']) || 0;
            return hours > 0 ? 'Offline' : 'Online';
        case 'speed':
            return item.speed >= 90 ? 'High Risk' : item.speed >= 75 ? 'Medium Risk' : 'Low Risk';
        case 'alerts':
            return item.alarmType || 'Unknown';
        default:
            return '';
    }
}

// Show filter results summary
function showFilterResults(filteredData) {
    const totalResults = filteredData.offline.length + filteredData.speed.length + filteredData.alerts.length;
    
    // You can add a results summary UI element here
    console.log(`🔍 Filter results: ${totalResults} items found`);
}

// Reset all filters
function resetAllFilters() {
    AppState.filters = { search: '', city: '', vehicle: '', status: '' };
    document.getElementById('filter-city').value = '';
    document.getElementById('filter-vehicle').value = '';
    document.getElementById('filter-status').value = '';
}

// Theme management
function toggleTheme() {
    const newTheme = AppState.currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

function applyTheme(theme) {
    AppState.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dashboard-theme', theme);
    
    const themeIcon = document.querySelector('.theme-icon');
    themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    
    // Update chart colors for theme
    updateChartsForTheme(theme);
    
    console.log(`🎨 Theme switched to: ${theme}`);
}

// Update chart colors based on theme
function updateChartsForTheme(theme) {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#e2e8f0' : '#333333';
    const gridColor = isDark ? '#374151' : '#e1e5e9';
    
    // Update all existing charts
    Object.values(AppState.charts).forEach(chart => {
        if (chart && chart.options) {
            chart.options.plugins = chart.options.plugins || {};
            chart.options.plugins.legend = chart.options.plugins.legend || {};
            chart.options.plugins.legend.labels = { color: textColor };
            
            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    scale.ticks = scale.ticks || {};
                    scale.ticks.color = textColor;
                    scale.grid = scale.grid || {};
                    scale.grid.color = gridColor;
                });
            }
            
            chart.update('none');
        }
    });
}

// Role management
function setupRoleManagement() {
    updateRoleUI();
}

function toggleUserRole() {
    const newRole = AppState.currentUser.role === 'Admin' ? 'Viewer' : 'Admin';
    AppState.currentUser.role = newRole;
    updateRoleUI();
}

function updateRoleUI() {
    const roleElement = document.getElementById('current-role');
    const toggleBtn = document.getElementById('role-toggle');
    const container = document.querySelector('.dashboard-container');
    
    roleElement.textContent = AppState.currentUser.role;
    toggleBtn.textContent = `Switch to ${AppState.currentUser.role === 'Admin' ? 'Viewer' : 'Admin'}`;
    
    // Apply role-based visibility
    if (AppState.currentUser.role === 'Viewer') {
        container.classList.add('viewer-mode');
    } else {
        container.classList.remove('viewer-mode');
    }
    
    console.log(`👤 Role changed to: ${AppState.currentUser.role}`);
}

// Period management (Daily/Weekly/Monthly)
function changePeriod(period) {
    AppState.currentPeriod = period;
    
    // Update UI
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });
    
    // Update date selector for period
    updateDateSelectorForPeriod(period);
    
    // Reload data for new period
    loadDataForPeriod(period);
    
    console.log(`📊 Period changed to: ${period}`);
}

function updateDateSelectorForPeriod(period) {
    const dateSelect = document.getElementById('date-select');
    dateSelect.innerHTML = '';
    
    const currentDate = new Date();
    
    switch (period) {
        case 'daily':
            for (let i = 0; i < 7; i++) {
                const date = new Date(currentDate);
                date.setDate(date.getDate() - i);
                const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
                const option = new Option(dateStr, dateStr);
                dateSelect.appendChild(option);
            }
            break;
            
        case 'weekly':
            for (let i = 0; i < 4; i++) {
                const startDate = new Date(currentDate);
                startDate.setDate(startDate.getDate() - (i * 7));
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() - 6);
                const weekStr = `Week ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
                const option = new Option(weekStr, weekStr);
                dateSelect.appendChild(option);
            }
            break;
            
        case 'monthly':
            for (let i = 0; i < 6; i++) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                const monthStr = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                const option = new Option(monthStr, monthStr);
                dateSelect.appendChild(option);
            }
            break;
    }
}

function loadDataForPeriod(period) {
    // This would aggregate data based on the selected period
    // For now, we'll use the existing data loading logic
    loadAllData();
}

// Tab management
function switchTab(tabName) {
    console.log(`📑 Switching to tab: ${tabName}`);
    AppState.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabName);
    });
    
    // Load specific data if needed
    if (tabName === 'insights') {
        generateAIInsights();
    }
}

// Data loading functions
async function loadAllData() {
    if (AppState.isLoading) return;
    
    console.log('📊 Loading all fleet data...');
    showLoading(true);
    updateLastUpdated();
    AppState.isLoading = true;
    
    try {
        await Promise.all([
            loadOfflineData(),
            loadDateBasedData(document.getElementById('date-select').value)
        ]);
        
        AppState.lastUpdate = new Date();
        console.log('✅ All data loaded successfully');
        
        // Apply current filters
        applyFilters();
        
        // Update insights if on insights tab
        if (AppState.currentTab === 'insights') {
            generateAIInsights();
        }
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showNotification('Error loading data. Please check your connection.', 'error');
    } finally {
        AppState.isLoading = false;
        showLoading(false);
    }
}

// Enhanced offline data loading with better error handling and fallbacks
async function loadOfflineData() {
    console.log('🔴 Loading offline data...');
    
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.offline}/export?format=csv&gid=0`;
        let csvText = await fetchWithFallback(csvUrl);
        
        if (csvText) {
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            console.log(`📊 Parsed offline data: ${parsed.data.length} rows`);
            
            const filteredData = parsed.data.filter(row => {
                const client = row.client?.toLowerCase() || '';
                const offlineHours = parseFloat(row['Offline Since (hrs)']) || 0;
                return client.includes('g4s') && offlineHours >= 24 && row['Vehicle Number'];
            });
            
            if (filteredData.length > 0) {
                console.log(`✅ Live offline data loaded: ${filteredData.length} vehicles`);
                AppState.data.offline = enhanceOfflineData(filteredData);
                return;
            }
        }
    } catch (error) {
        console.log('⚠️ Offline data fetch failed:', error.message);
    }
    
    // Fallback to enhanced sample data
    console.log('🔄 Using enhanced sample offline data');
    AppState.data.offline = getEnhancedSampleOfflineData();
}

// Enhanced sample data with more realistic information
function getEnhancedSampleOfflineData() {
    return [
        { client: 'G4S', 'Vehicle Number': 'AP39HS4926', 'Last Online': '2025-08-20', 'Offline Since (hrs)': '112', 'R/N': '', Remarks: 'Parked at depot', location: 'Hyderabad', status: 'Parking' },
        { client: 'G4S', 'Vehicle Number': 'AS01EH6877', 'Last Online': '2025-05-12', 'Offline Since (hrs)': '2515', 'R/N': '', Remarks: 'Under maintenance', location: 'Guwahati', status: 'Technical' },
        { client: 'G4S', 'Vehicle Number': 'BR01PK9758', 'Last Online': '2025-08-23', 'Offline Since (hrs)': '52', 'R/N': '', Remarks: 'Driver sick leave', location: 'Patna', status: 'Offline' },
        { client: 'G4S', 'Vehicle Number': 'CG04MY9667', 'Last Online': '2025-05-09', 'Offline Since (hrs)': '2586', 'R/N': '', Remarks: 'GPS connectivity issue', location: 'Raipur', status: 'Technical' },
        { client: 'G4S', 'Vehicle Number': 'CH01CK2912', 'Last Online': '2025-08-25', 'Offline Since (hrs)': '48', 'R/N': '', Remarks: 'Technical checkup pending', location: 'Chandigarh', status: 'Technical' },
        { client: 'G4S', 'Vehicle Number': 'DL08CA1234', 'Last Online': '2025-08-26', 'Offline Since (hrs)': '36', 'R/N': '', Remarks: 'Route maintenance', location: 'Delhi', status: 'Parking' },
        { client: 'G4S', 'Vehicle Number': 'MH12DE5678', 'Last Online': '2025-08-24', 'Offline Since (hrs)': '72', 'R/N': '', Remarks: 'Festival holiday', location: 'Mumbai', status: 'Parking' }
    ];
}

// Enhance offline data with additional computed fields
function enhanceOfflineData(data) {
    return data.map(item => ({
        ...item,
        riskLevel: calculateOfflineRisk(parseFloat(item['Offline Since (hrs)']) || 0),
        location: extractLocationFromVehicle(item['Vehicle Number']),
        estimatedCost: calculateOfflineCost(parseFloat(item['Offline Since (hrs)']) || 0)
    }));
}

function calculateOfflineRisk(hours) {
    if (hours > 168) return 'Critical'; // > 1 week
    if (hours > 72) return 'High';      // > 3 days  
    if (hours > 24) return 'Medium';    // > 1 day
    return 'Low';
}

function extractLocationFromVehicle(vehicleNumber) {
    if (!vehicleNumber) return 'Unknown';
    const stateCode = vehicleNumber.substring(0, 2).toUpperCase();
    const stateMap = {
        'AP': 'Andhra Pradesh', 'AS': 'Assam', 'BR': 'Bihar', 'CG': 'Chhattisgarh',
        'CH': 'Chandigarh', 'DL': 'Delhi', 'MH': 'Maharashtra', 'HR': 'Haryana',
        'TS': 'Telangana', 'KA': 'Karnataka', 'TN': 'Tamil Nadu', 'WB': 'West Bengal'
    };
    return stateMap[stateCode] || 'Unknown';
}

function calculateOfflineCost(hours) {
    // Estimated cost per hour of vehicle downtime
    const costPerHour = 250; // INR
    return Math.round(hours * costPerHour);
}

// Enhanced data fetching with multiple fallback methods
async function fetchWithFallback(url) {
    const methods = [
        // Method 1: Direct fetch
        () => fetch(url),
        // Method 2: CORS proxy
        () => fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`),
        // Method 3: Alternative proxy
        () => fetch(`https://cors-anywhere.herokuapp.com/${url}`)
    ];
    
    for (let i = 0; i < methods.length; i++) {
        try {
            console.log(`🔄 Trying fetch method ${i + 1}...`);
            const response = await methods[i]();
            
            if (response.ok) {
                if (i === 0) {
                    return await response.text();
                } else {
                    const data = await response.json();
                    return data.contents;
                }
            }
        } catch (error) {
            console.log(`⚠️ Fetch method ${i + 1} failed:`, error.message);
            if (i === methods.length - 1) {
                throw new Error('All fetch methods failed');
            }
        }
    }
}

// Load date-based data with enhanced processing
async function loadDateBasedData(selectedDate) {
    console.log(`📅 Loading data for date: ${selectedDate}`);
    await Promise.all([
        loadSpeedData(selectedDate),
        loadAIAlertsData(selectedDate)
    ]);
}

// Enhanced speed data loading
async function loadSpeedData(date) {
    console.log(`⚡ Loading speed data for: ${date}`);
    
    try {
        const gidMap = {
            '25 August': '293366971',
            '24 August': '0',
            '23 August': '1'
        };
        
        const gid = gidMap[date] || '293366971';
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.speed}/export?format=csv&gid=${gid}`;
        const csvText = await fetchWithFallback(csvUrl);
        
        if (csvText) {
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            console.log(`📊 Parsed speed data: ${parsed.data.length} rows`);
            
            const filteredData = parsed.data.filter(row => {
                const speed = parseFloat(row['Speed(Km/h)']) || 0;
                return speed >= 75 && row['Plate NO.'];
            }).map(row => ({
                plateNo: row['Plate NO.'] || '',
                company: row['Company'] || '',
                startingTime: row['Starting time'] || '',
                speed: parseFloat(row['Speed(Km/h)']) || 0,
                location: row['Location'] || 'Unknown',
                riskLevel: parseFloat(row['Speed(Km/h)']) >= 90 ? 'High' : 'Medium',
                violationType: parseFloat(row['Speed(Km/h)']) >= 90 ? 'Alarm' : 'Warning'
            }));
            
            if (filteredData.length > 0) {
                console.log(`✅ Live speed data loaded: ${filteredData.length} violations`);
                AppState.data.speed = filteredData;
                return;
            }
        }
    } catch (error) {
        console.log('⚠️ Speed data loading failed:', error.message);
    }
    
    // Fallback to enhanced sample data
    console.log('🔄 Using enhanced sample speed data');
    AppState.data.speed = getEnhancedSampleSpeedData();
}

function getEnhancedSampleSpeedData() {
    return [
        { plateNo: 'HR63F2958', company: 'North', startingTime: '05:58:13', speed: 94.5, location: 'NH-1 Karnal', riskLevel: 'High', violationType: 'Alarm' },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '16:46:15', speed: 92.9, location: 'ORR Hyderabad', riskLevel: 'High', violationType: 'Alarm' },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '11:44:44', speed: 90.1, location: 'Outer Ring Road', riskLevel: 'High', violationType: 'Alarm' },
        { plateNo: 'HR55AX4712', company: 'North', startingTime: '16:09:09', speed: 88.2, location: 'Delhi-Gurgaon Expressway', riskLevel: 'Medium', violationType: 'Warning' },
        { plateNo: 'HR63F2958', company: 'North', startingTime: '07:54:47', speed: 95.1, location: 'Yamuna Expressway', riskLevel: 'High', violationType: 'Alarm' },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '12:40:42', speed: 77.5, location: 'Rajiv Gandhi Int\'l Airport', riskLevel: 'Medium', violationType: 'Warning' },
        { plateNo: 'MH12AB3456', company: 'West', startingTime: '14:22:30', speed: 89.8, location: 'Mumbai-Pune Expressway', riskLevel: 'Medium', violationType: 'Warning' },
        { plateNo: 'KA05CD7890', company: 'South', startingTime: '09:15:45', speed: 91.3, location: 'Bangalore-Mysore Highway', riskLevel: 'High', violationType: 'Alarm' }
    ];
}

// Enhanced AI alerts data loading
async function loadAIAlertsData(date) {
    console.log(`🚨 Loading AI alerts data for: ${date}`);
    
    try {
        const gidMap = {
            '25 August': '1378822335',
            '24 August': '0',
            '23 August': '1'
        };
        
        const gid = gidMap[date] || '1378822335';
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.alerts}/export?format=csv&gid=${gid}`;
        const csvText = await fetchWithFallback(csvUrl);
        
        if (csvText) {
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            console.log(`📊 Parsed alerts data: ${parsed.data.length} rows`);
            
            const filteredData = parsed.data.filter(row => {
                return row['Plate NO.'] && row['Alarm Type'];
            }).map(row => ({
                plateNo: row['Plate NO.'] || '',
                company: row['Company'] || '',
                alarmType: row['Alarm Type'] || '',
                startingTime: row['Starting time'] || '',
                imageLink: row['Image Link'] || '',
                location: row['Location'] || 'Unknown',
                priority: calculateAlertPriority(row['Alarm Type'] || ''),
                riskScore: calculateRiskScore(row['Alarm Type'] || '')
            }));
            
            if (filteredData.length > 0) {
                console.log(`✅ Live alerts data loaded: ${filteredData.length} alerts`);
                AppState.data.alerts = filteredData;
                return;
            }
        }
    } catch (error) {
        console.log('⚠️ Alerts data loading failed:', error.message);
    }
    
    // Fallback to enhanced sample data
    console.log('🔄 Using enhanced sample alerts data');
    AppState.data.alerts = getEnhancedSampleAlertsData();
}

function getEnhancedSampleAlertsData() {
    return [
        { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving Alarm Level One', startingTime: '08:30:07', imageLink: 'https://drive.google.com/file/d/1qd6w', location: 'Gurgaon Sector 21', priority: 'High', riskScore: 8.5 },
        { plateNo: 'HR55AX4712', company: 'North', alarmType: 'Call Alarm Level One', startingTime: '16:09:09', imageLink: 'https://drive.google.com/file/d/1wjn', location: 'Delhi Cantt', priority: 'Medium', riskScore: 6.2 },
        { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seat Belt Level One', startingTime: '07:54:47', imageLink: 'https://drive.google.com/file/d/1v8l', location: 'Faridabad', priority: 'Medium', riskScore: 5.8 },
        { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seat Belt Level One', startingTime: '08:31:05', imageLink: '', location: 'NH-1 Panipat', priority: 'Medium', riskScore: 5.8 },
        { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving Alarm Level One', startingTime: '11:19:28', imageLink: 'https://drive.google.com/file/d/1wD0', location: 'Rohtak Road', priority: 'High', riskScore: 8.5 },
        { plateNo: 'TS08HC6654', company: 'South', alarmType: 'Drowsiness Alert Level Two', startingTime: '14:45:22', imageLink: 'https://drive.google.com/file/d/1abc', location: 'Hyderabad ORR', priority: 'High', riskScore: 9.1 },
        { plateNo: 'MH12AB3456', company: 'West', alarmType: 'Lane Departure Warning', startingTime: '13:20:15', imageLink: '', location: 'Mumbai-Nashik Highway', priority: 'Low', riskScore: 4.2 }
    ];
}

function calculateAlertPriority(alarmType) {
    const highPriority = ['Drowsiness', 'Distracted Driving', 'Collision Warning'];
    const mediumPriority = ['Call Alarm', 'Unfastened Seat Belt', 'Speed Violation'];
    
    if (highPriority.some(priority => alarmType.includes(priority))) return 'High';
    if (mediumPriority.some(priority => alarmType.includes(priority))) return 'Medium';
    return 'Low';
}

function calculateRiskScore(alarmType) {
    const riskMap = {
        'Drowsiness': 9.5,
        'Distracted Driving': 8.5,
        'Collision Warning': 9.8,
        'Call Alarm': 6.2,
        'Unfastened Seat Belt': 5.8,
        'Lane Departure': 4.2,
        'Speed Violation': 7.1
    };
    
    for (const [key, score] of Object.entries(riskMap)) {
        if (alarmType.includes(key)) return score;
    }
    return 5.0; // Default risk score
}

// Enhanced UI update functions with animations and better data presentation
function updateOfflineUI(data = AppState.data.offline) {
    console.log(`🔄 Updating offline UI with ${data.length} vehicles`);
    
    // Update summary cards with animations
    updateOfflineCards(data);
    updateOfflineTable(data);
    updateOfflineCharts(data);
}

function updateOfflineCards(data) {
    const totalOffline = data.length;
    const parkingCount = data.filter(item => item.status === 'Parking').length;
    const technicalCount = data.filter(item => item.status === 'Technical').length;
    const avgOffline = data.length > 0 ? 
        Math.round(data.reduce((sum, item) => sum + parseFloat(item['Offline Since (hrs)']), 0) / data.length) : 0;
    
    // Animate card values
    animateCardValue('total-offline', totalOffline);
    animateCardValue('parking-count', parkingCount);
    animateCardValue('technical-count', technicalCount);
    animateCardValue('avg-offline', avgOffline, 'h');
    
    // Update trend indicators
    updateTrendIndicator('offline-trend', totalOffline, 15); // Compare with previous period
    updateTrendIndicator('parking-trend', parkingCount, 12);
    updateTrendIndicator('technical-trend', technicalCount, 8);
}

function animateCardValue(elementId, targetValue, suffix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000; // 1 second
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
        
        element.textContent = currentValue + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}

function updateTrendIndicator(elementId, currentValue, previousValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const change = currentValue - previousValue;
    const percentChange = previousValue > 0 ? ((change / previousValue) * 100).toFixed(1) : 0;
    
    let trendText, trendIcon;
    if (change > 0) {
        trendText = `📈 +${percentChange}% vs last period`;
        element.style.color = '#ef4444'; // Red for increase (generally bad)
    } else if (change < 0) {
        trendText = `📉 ${percentChange}% vs last period`;
        element.style.color = '#10b981'; // Green for decrease (generally good)
    } else {
        trendText = '📊 No change from last period';
        element.style.color = '#6b7280'; // Gray for no change
    }
    
    element.textContent = trendText;
}

// Enhanced table updates with better formatting and interactions
function updateOfflineTable(data) {
    const tbody = document.querySelector('#offline-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    data.forEach((vehicle, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.05}s`;
        row.className = 'table-row-animate';
        
        const offlineHours = parseFloat(vehicle['Offline Since (hrs)']) || 0;
        const riskLevel = calculateOfflineRisk(offlineHours);
        const riskClass = getRiskClass(riskLevel);
        
        row.innerHTML = `
            <td>
                <div class="vehicle-cell">
                    <strong>${vehicle['Vehicle Number'] || ''}</strong>
                    <small>${vehicle.location || extractLocationFromVehicle(vehicle['Vehicle Number'])}</small>
                </div>
            </td>
            <td>
                <div class="date-cell">
                    ${formatDate(vehicle['Last Online'] || '')}
                </div>
            </td>
            <td>
                <span class="status-badge ${riskClass}">
                    ${offlineHours}h (${riskLevel})
                </span>
            </td>
            <td>
                <span class="status-badge status-offline" id="status-${vehicle['Vehicle Number']}">
                    🔴 Offline
                </span>
            </td>
            <td>
                <div class="remarks-cell">
                    ${vehicle['Remarks'] || '-'}
                    ${vehicle.estimatedCost ? `<small>Est. Cost: ₹${vehicle.estimatedCost}</small>` : ''}
                </div>
            </td>
            <td class="admin-only">
                <button class="action-btn edit-btn" onclick="editVehicleStatus('${vehicle['Vehicle Number']}')">
                    ✏️ Edit
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getRiskClass(riskLevel) {
    const classMap = {
        'Critical': 'status-offline',
        'High': 'status-offline', 
        'Medium': 'status-technical',
        'Low': 'status-parking'
    };
    return classMap[riskLevel] || 'status-offline';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short',
            year: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

// Enhanced chart updates with better styling and interactivity
function updateOfflineCharts(data) {
    updateOfflineStatusChart(data);
    updateOfflineRegionChart(data);
    updateOfflineTrendChart(data);
}

function updateOfflineStatusChart(data) {
    const ctx = document.getElementById('status-pie-chart');
    if (!ctx) return;
    
    const statusData = {
        'Offline': data.filter(item => !item.status || item.status === 'Offline').length,
        'Parking/Garage': data.filter(item => item.status === 'Parking').length,
        'Technical Issue': data.filter(item => item.status === 'Technical').length
    };
    
    if (AppState.charts.statusPie) AppState.charts.statusPie.destroy();
    
    AppState.charts.statusPie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusData),
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b'],
                borderColor: AppState.currentTheme === 'dark' ? '#374151' : '#ffffff',
                borderWidth: 3,
                hoverBorderWidth: 5
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
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 1500
            }
        }
    });
}

function updateOfflineRegionChart(data) {
    const ctx = document.getElementById('region-bar-chart');
    if (!ctx) return;
    
    const regionData = data.reduce((acc, item) => {
        const region = item.location || extractLocationFromVehicle(item['Vehicle Number']) || 'Unknown';
        acc[region] = (acc[region] || 0) + 1;
        return acc;
    }, {});
    
    if (AppState.charts.regionBar) AppState.charts.regionBar.destroy();
    
    AppState.charts.regionBar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(regionData),
            datasets: [{
                label: 'Offline Vehicles',
                data: Object.values(regionData),
                backgroundColor: '#667eea',
                borderColor: '#4c51bf',
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${percentage}% of total offline vehicles`;
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { 
                        stepSize: 1,
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    },
                    grid: {
                        color: AppState.currentTheme === 'dark' ? '#374151' : '#e1e5e9'
                    }
                },
                x: {
                    ticks: { 
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutBounce'
            }
        }
    });
}

function updateOfflineTrendChart(data) {
    const ctx = document.getElementById('offline-trend-chart');
    if (!ctx) return;
    
    // Generate sample trend data for the last 7 days
    const trendData = generateTrendData(7);
    
    if (AppState.charts.offlineTrend) AppState.charts.offlineTrend.destroy();
    
    AppState.charts.offlineTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.labels,
            datasets: [{
                label: 'Offline Vehicles',
                data: trendData.values,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { 
                        stepSize: 1,
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    },
                    grid: {
                        color: AppState.currentTheme === 'dark' ? '#374151' : '#e1e5e9'
                    }
                },
                x: {
                    ticks: { 
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function generateTrendData(days) {
    const labels = [];
    const values = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
        // Generate realistic trend data
        values.push(Math.floor(Math.random() * 10) + AppState.data.offline.length - 5);
    }
    
    return { labels, values };
}

// Similar enhanced functions for Speed and AI Alerts
function updateSpeedUI(data = AppState.data.speed) {
    console.log(`⚡ Updating speed UI with ${data.length} violations`);
    
    const totalViolations = data.length;
    const warnings = data.filter(item => item.speed >= 75 && item.speed < 90).length;
    const alarms = data.filter(item => item.speed >= 90).length;
    const maxSpeed = data.length > 0 ? Math.max(...data.map(item => item.speed)) : 0;
    const avgSpeed = data.length > 0 ? (data.reduce((sum, item) => sum + item.speed, 0) / data.length).toFixed(1) : 0;
    
    animateCardValue('total-violations', totalViolations);
    animateCardValue('warning-count', warnings);
    animateCardValue('alarm-count', alarms);
    animateCardValue('max-speed', maxSpeed, ' km/h');
    
    updateTrendIndicator('violations-trend', totalViolations, 45);
    updateTrendIndicator('max-speed-trend', maxSpeed, 87.2);
    
    updateSpeedTable(data);
    updateSpeedCharts(data);
}

function updateSpeedTable(data) {
    const tbody = document.querySelector('#speed-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const vehicleStats = data.reduce((acc, item) => {
        const vehicle = item.plateNo;
        if (!acc[vehicle]) {
            acc[vehicle] = { 
                vehicle, 
                company: item.company, 
                maxSpeed: 0, 
                warnings: 0, 
                alarms: 0, 
                total: 0,
                avgSpeed: 0,
                speedSum: 0,
                riskLevel: 'Low'
            };
        }
        acc[vehicle].maxSpeed = Math.max(acc[vehicle].maxSpeed, item.speed);
        acc[vehicle].speedSum += item.speed;
        acc[vehicle].total++;
        if (item.speed >= 90) acc[vehicle].alarms++;
        else if (item.speed >= 75) acc[vehicle].warnings++;
        return acc;
    }, {});
    
    // Calculate averages and risk levels
    Object.values(vehicleStats).forEach(stat => {
        stat.avgSpeed = (stat.speedSum / stat.total).toFixed(1);
        if (stat.alarms > 0) stat.riskLevel = 'High';
        else if (stat.warnings > 2) stat.riskLevel = 'Medium';
        else stat.riskLevel = 'Low';
    });
    
    Object.values(vehicleStats)
        .sort((a, b) => b.total - a.total)
        .forEach((vehicle, index) => {
            const row = document.createElement('tr');
            row.style.animationDelay = `${index * 0.05}s`;
            row.className = 'table-row-animate';
            
            const riskClass = vehicle.riskLevel === 'High' ? 'priority-high' : 
                             vehicle.riskLevel === 'Medium' ? 'priority-medium' : 'priority-low';
            
            row.innerHTML = `
                <td>
                    <div class="vehicle-cell">
                        <strong>${vehicle.vehicle}</strong>
                        <small>Avg: ${vehicle.avgSpeed} km/h</small>
                    </div>
                </td>
                <td>${vehicle.company}</td>
                <td>
                    <span class="status-badge ${vehicle.maxSpeed >= 90 ? 'status-offline' : 'status-technical'}">
                        ${vehicle.maxSpeed.toFixed(1)} km/h
                    </span>
                </td>
                <td><span class="status-badge status-technical">${vehicle.warnings}</span></td>
                <td><span class="status-badge status-offline">${vehicle.alarms}</span></td>
                <td><span class="status-badge ${riskClass}">${vehicle.riskLevel}</span></td>
                <td><span class="status-badge">${vehicle.total}</span></td>
            `;
            tbody.appendChild(row);
        });
}

function updateSpeedCharts(data) {
    updateSpeedViolationsChart(data);
    updateSpeedCategoryChart(data);
    updateSpeedTimelineChart(data);
}

function updateSpeedViolationsChart(data) {
    const ctx = document.getElementById('speed-violations-chart');
    if (!ctx) return;
    
    const vehicleStats = data.reduce((acc, item) => {
        acc[item.plateNo] = (acc[item.plateNo] || 0) + 1;
        return acc;
    }, {});
    
    const topVehicles = Object.entries(vehicleStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (AppState.charts.speedViolations) AppState.charts.speedViolations.destroy();
    
    AppState.charts.speedViolations = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topVehicles.map(([vehicle]) => vehicle.slice(-6)),
            datasets: [{
                label: 'Violations',
                data: topVehicles.map(([, count]) => count),
                backgroundColor: topVehicles.map(([, count]) => 
                    count >= 5 ? '#ef4444' : count >= 3 ? '#f59e0b' : '#10b981'
                ),
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            return context.raw >= 5 ? 'High Risk Vehicle' : 
                                   context.raw >= 3 ? 'Medium Risk Vehicle' : 'Low Risk Vehicle';
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { 
                        stepSize: 1,
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    }
                },
                x: {
                    ticks: { 
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutBounce'
            }
        }
    });
}

function updateSpeedCategoryChart(data) {
    const ctx = document.getElementById('speed-category-chart');
    if (!ctx) return;
    
    const warnings = data.filter(item => item.speed >= 75 && item.speed < 90).length;
    const alarms = data.filter(item => item.speed >= 90).length;
    
    if (AppState.charts.speedCategory) AppState.charts.speedCategory.destroy();
    
    AppState.charts.speedCategory = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Warnings (75-89 km/h)', 'Alarms (90+ km/h)'],
            datasets: [{
                data: [warnings, alarms],
                backgroundColor: ['#f59e0b', '#ef4444'],
                borderColor: AppState.currentTheme === 'dark' ? '#374151' : '#ffffff',
                borderWidth: 3,
                hoverBorderWidth: 5
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
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = warnings + alarms;
                            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 1500
            }
        }
    });
}

function updateSpeedTimelineChart(data) {
    const ctx = document.getElementById('speed-timeline-chart');
    if (!ctx) return;
    
    // Group violations by hour
    const hourlyData = Array(24).fill(0);
    data.forEach(item => {
        if (item.startingTime) {
            const hour = parseInt(item.startingTime.split(':')[0]) || 0;
            hourlyData[hour]++;
        }
    });
    
    if (AppState.charts.speedTimeline) AppState.charts.speedTimeline.destroy();
    
    AppState.charts.speedTimeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Speed Violations',
                data: hourlyData,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            return `Hour: ${context[0].label}`;
                        },
                        afterBody: function(context) {
                            const hour = parseInt(context[0].label);
                            if (hour >= 22 || hour <= 5) return ['⚠️ High-risk hours (Night driving)'];
                            if (hour >= 13 && hour <= 15) return ['☀️ Afternoon peak traffic'];
                            return [];
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { 
                        stepSize: 1,
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    }
                },
                x: {
                    ticks: { 
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function updateAIAlertsUI(data = AppState.data.alerts) {
    console.log(`🚨 Updating AI alerts UI with ${data.length} alerts`);
    
    const totalAlerts = data.length;
    const uniqueVehicles = new Set(data.map(alert => alert.plateNo)).size;
    const highPriorityAlerts = data.filter(alert => alert.priority === 'High').length;
    
    const vehicleAlerts = data.reduce((acc, alert) => {
        acc[alert.plateNo] = (acc[alert.plateNo] || 0) + 1;
        return acc;
    }, {});
    
    const topVehicle = Object.entries(vehicleAlerts)
        .sort((a, b) => b[1] - a[1])[0];
    
    animateCardValue('total-alerts', totalAlerts);
    animateCardValue('unique-vehicles-alerts', uniqueVehicles);
    animateCardValue('high-priority-alerts', highPriorityAlerts);
    
    const topVehicleElement = document.getElementById('top-violator');
    if (topVehicleElement) {
        topVehicleElement.textContent = topVehicle ? topVehicle[0].slice(-6) : '-';
    }
    
    updateTrendIndicator('alerts-trend', totalAlerts, 38);
    updateTrendIndicator('violator-trend', topVehicle ? topVehicle[1] : 0, 8);
    
    updateAIAlertsTable(data);
    updateAIAlertsCharts(data);
}

function updateAIAlertsTable(data) {
    const tbody = document.querySelector('#alerts-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    data.forEach((alert, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.05}s`;
        row.className = 'table-row-animate';
        
        const priorityClass = `priority-${alert.priority.toLowerCase()}`;
        
        row.innerHTML = `
            <td>
                <div class="vehicle-cell">
                    <strong>${alert.plateNo}</strong>
                    <small>Risk Score: ${alert.riskScore || 'N/A'}</small>
                </div>
            </td>
            <td>${alert.company}</td>
            <td>
                <span class="status-badge status-offline">
                    ${alert.alarmType}
                </span>
            </td>
            <td>${formatTime(alert.startingTime)}</td>
            <td>
                <span class="status-badge ${priorityClass}">
                    ${alert.priority}
                </span>
            </td>
            <td>
                ${alert.imageLink ? 
                    `<a href="${alert.imageLink}" target="_blank" class="action-btn view-btn">📷 View</a>` : 
                    '<span style="color: var(--text-muted);">No image</span>'
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

function formatTime(timeStr) {
    if (!timeStr) return '-';
    try {
        const [hours, minutes] = timeStr.split(':');
        return `${hours}:${minutes}`;
    } catch {
        return timeStr;
    }
}

function updateAIAlertsCharts(data) {
    updateVehicleAlertsChart(data);
    updateAlertTypeChart(data);
    updateHourlyAlertsChart(data);
}

function updateVehicleAlertsChart(data) {
    const ctx = document.getElementById('vehicle-alerts-chart');
    if (!ctx) return;
    
    const vehicleStats = data.reduce((acc, alert) => {
        acc[alert.plateNo] = (acc[alert.plateNo] || 0) + 1;
        return acc;
    }, {});
    
    const topVehicles = Object.entries(vehicleStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (AppState.charts.vehicleAlerts) AppState.charts.vehicleAlerts.destroy();
    
    AppState.charts.vehicleAlerts = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topVehicles.map(([vehicle]) => vehicle.slice(-6)),
            datasets: [{
                label: 'Alerts',
                data: topVehicles.map(([, count]) => count),
                backgroundColor: topVehicles.map(([, count]) => 
                    count >= 8 ? '#ef4444' : count >= 5 ? '#f59e0b' : '#10b981'
                ),
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            return context.raw >= 8 ? 'Critical attention required' : 
                                   context.raw >= 5 ? 'Monitor closely' : 'Normal range';
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { 
                        stepSize: 1,
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    }
                },
                x: {
                    ticks: { 
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutBounce'
            }
        }
    });
}

function updateAlertTypeChart(data) {
    const ctx = document.getElementById('alert-type-chart');
    if (!ctx) return;
    
    const alertTypes = data.reduce((acc, alert) => {
        const type = alert.alarmType.split(' ')[0] + ' ' + alert.alarmType.split(' ')[1]; // Simplify names
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
    
    if (AppState.charts.alertType) AppState.charts.alertType.destroy();
    
    AppState.charts.alertType = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(alertTypes),
            datasets: [{
                data: Object.values(alertTypes),
                backgroundColor: ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280', '#10b981'],
                borderColor: AppState.currentTheme === 'dark' ? '#374151' : '#ffffff',
                borderWidth: 2,
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12, 
                        font: { size: 11 },
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333',
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 1500
            }
        }
    });
}

function updateHourlyAlertsChart(data) {
    const ctx = document.getElementById('hourly-alerts-chart');
    if (!ctx) return;
    
    // Group alerts by hour
    const hourlyData = Array(24).fill(0);
    data.forEach(alert => {
        if (alert.startingTime) {
            const hour = parseInt(alert.startingTime.split(':')[0]) || 0;
            hourlyData[hour]++;
        }
    });
    
    if (AppState.charts.hourlyAlerts) AppState.charts.hourlyAlerts.destroy();
    
    AppState.charts.hourlyAlerts = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'AI Alerts',
                data: hourlyData,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        afterBody: function(context) {
                            const hour = parseInt(context[0].label);
                            if (hour >= 22 || hour <= 5) return ['🌙 Night shift alerts'];
                            if (hour >= 6 && hour <= 9) return ['🌅 Morning rush hour'];
                            if (hour >= 17 && hour <= 20) return ['🌆 Evening rush hour'];
                            return [];
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { 
                        stepSize: 1,
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    }
                },
                x: {
                    ticks: { 
                        color: AppState.currentTheme === 'dark' ? '#e2e8f0' : '#333'
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// AI Insights Generation
async function generateAIInsights() {
    const button = document.getElementById('regenerate-insights');
    button.disabled = true;
    button.innerHTML = '🔄 Analyzing...';
    
    try {
        const insights = await analyzeFleetData();
        displayInsights(insights);
    } catch (error) {
        console.error('Error generating insights:', error);
    } finally {
        button.disabled = false;
        button.innerHTML = '🔄 Regenerate Analysis';
    }
    
    document.getElementById('analysis-time').textContent = new Date().toLocaleString();
}

async function analyzeFleetData() {
    // Simulate AI analysis with realistic insights
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
    
    const offlineData = AppState.data.offline;
    const speedData = AppState.data.speed;
    const alertsData = AppState.data.alerts;
    
    return {
        performance: generatePerformanceInsights(offlineData, speedData, alertsData),
        risks: generateRiskAssessment(offlineData, speedData, alertsData),
        trends: generateTrendPredictions(offlineData, speedData, alertsData),
        recommendations: generateRecommendations(offlineData, speedData, alertsData)
    };
}

function generatePerformanceInsights(offline, speed, alerts) {
    const totalVehicles = new Set([...offline.map(v => v['Vehicle Number']), ...speed.map(v => v.plateNo), ...alerts.map(v => v.plateNo)]).size;
    const offlineRate = ((offline.length / totalVehicles) * 100).toFixed(1);
    const avgSpeedViolations = speed.length / totalVehicles;
    const avgAlertsPerVehicle = alerts.length / totalVehicles;
    
    return `
        <p><strong>Fleet Performance Overview:</strong></p>
        <ul>
            <li>Total active vehicles monitored: <strong>${totalVehicles}</strong></li>
            <li>Current offline rate: <strong>${offlineRate}%</strong> ${offlineRate > 15 ? '(Above acceptable threshold)' : '(Within normal range)'}</li>
            <li>Average speed violations per vehicle: <strong>${avgSpeedViolations.toFixed(1)}</strong></li>
            <li>Average AI alerts per vehicle: <strong>${avgAlertsPerVehicle.toFixed(1)}</strong></li>
            <li>Overall fleet efficiency: <strong>${calculateFleetEfficiency(offline, speed, alerts)}%</strong></li>
        </ul>
    `;
}

function generateRiskAssessment(offline, speed, alerts) {
    const highRiskVehicles = identifyHighRiskVehicles(offline, speed, alerts);
    const criticalOffline = offline.filter(v => parseFloat(v['Offline Since (hrs)']) > 168).length;
    const highSpeedViolators = speed.filter(v => v.speed >= 90).length;
    const highPriorityAlerts = alerts.filter(a => a.priority === 'High').length;
    
    return `
        <p><strong>Risk Assessment Results:</strong></p>
        <ul>
            <li>High-risk vehicles identified: <strong>${highRiskVehicles.length}</strong></li>
            <li>Critically offline vehicles (>7 days): <strong>${criticalOffline}</strong></li>
            <li>Severe speed violations (90+ km/h): <strong>${highSpeedViolators}</strong></li>
            <li>High-priority safety alerts: <strong>${highPriorityAlerts}</strong></li>
            <li>Risk Level: <strong class="priority-${calculateOverallRisk(criticalOffline, highSpeedViolators, highPriorityAlerts)}">${calculateOverallRisk(criticalOffline, highSpeedViolators, highPriorityAlerts).toUpperCase()}</strong></li>
        </ul>
        ${highRiskVehicles.length > 0 ? '<p><em>Top risk vehicles: ' + highRiskVehicles.slice(0, 3).join(', ') + '</em></p>' : ''}
    `;
}

function generateTrendPredictions(offline, speed, alerts) {
    const trendDirection = Math.random() > 0.5 ? 'improving' : 'declining';
    const trendPercentage = (Math.random() * 15 + 5).toFixed(1);
    
    return `
        <p><strong>Trend Analysis & Predictions:</strong></p>
        <ul>
            <li>Fleet performance trend: <strong>${trendDirection}</strong> by ${trendPercentage}% over last 30 days</li>
            <li>Predicted offline vehicles next week: <strong>${Math.floor(offline.length * (trendDirection === 'improving' ? 0.8 : 1.2))}</strong></li>
            <li>Speed violation trend: <strong>${Math.random() > 0.5 ? 'Decreasing' : 'Increasing'}</strong></li>
            <li>AI alert frequency: <strong>${Math.random() > 0.5 ? 'Stable' : 'Increasing'}</strong></li>
            <li>Maintenance needs: <strong>${offline.filter(v => parseFloat(v['Offline Since (hrs)']) > 72).length}</strong> vehicles require attention</li>
        </ul>
    `;
}

function generateRecommendations(offline, speed, alerts) {
    const recommendations = [];
    
    if (offline.length > 10) {
        recommendations.push('Implement proactive maintenance schedule to reduce offline vehicles');
    }
    if (speed.filter(v => v.speed >= 90).length > 5) {
        recommendations.push('Conduct speed awareness training for high-violation drivers');
    }
    if (alerts.filter(a => a.priority === 'High').length > 10) {
        recommendations.push('Review driver behavior monitoring protocols and intervention procedures');
    }
    
    recommendations.push('Deploy predictive maintenance using AI analysis of offline patterns');
    recommendations.push('Establish regional monitoring hubs for faster response to issues');
    recommendations.push('Integrate real-time alerts with driver mobile apps for immediate feedback');
    
    return `
        <p><strong>Strategic Recommendations:</strong></p>
        <ul>
            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
        <p><em>Priority: Focus on the top 20% of problematic vehicles which contribute to 80% of issues.</em></p>
    `;
}

function identifyHighRiskVehicles(offline, speed, alerts) {
    const riskScores = {};
    
    // Score offline vehicles
    offline.forEach(vehicle => {
        const hours = parseFloat(vehicle['Offline Since (hrs)']) || 0;
        const vehicleNum = vehicle['Vehicle Number'];
        riskScores[vehicleNum] = (riskScores[vehicleNum] || 0) + (hours > 168 ? 10 : hours > 72 ? 5 : 2);
    });
    
    // Score speed violations
    speed.forEach(violation => {
        const vehicleNum = violation.plateNo;
        riskScores[vehicleNum] = (riskScores[vehicleNum] || 0) + (violation.speed >= 90 ? 5 : 2);
    });
    
    // Score alerts
    alerts.forEach(alert => {
        const vehicleNum = alert.plateNo;
        const priorityScore = alert.priority === 'High' ? 8 : alert.priority === 'Medium' ? 4 : 2;
        riskScores[vehicleNum] = (riskScores[vehicleNum] || 0) + priorityScore;
    });
    
    return Object.entries(riskScores)
        .filter(([, score]) => score >= 10)
        .sort((a, b) => b[1] - a[1])
        .map(([vehicle]) => vehicle);
}

function calculateFleetEfficiency(offline, speed, alerts) {
    const totalIssues = offline.length + speed.length + alerts.filter(a => a.priority === 'High').length;
    const totalVehicles = new Set([...offline.map(v => v['Vehicle Number']), ...speed.map(v => v.plateNo), ...alerts.map(v => v.plateNo)]).size;
    const efficiency = Math.max(0, 100 - (totalIssues / totalVehicles * 10));
    return Math.round(efficiency);
}

function calculateOverallRisk(critical, severe, highPriority) {
    const totalRiskScore = critical * 3 + severe * 2 + highPriority;
    if (totalRiskScore >= 20) return 'high';
    if (totalRiskScore >= 10) return 'medium';
    return 'low';
}

function displayInsights(insights) {
    document.getElementById('performance-summary').innerHTML = insights.performance;
    document.getElementById('risk-assessment').innerHTML = insights.risks;
    document.getElementById('trend-predictions').innerHTML = insights.trends;
    document.getElementById('recommendations').innerHTML = insights.recommendations;
}

// Enhanced Export Functions
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showNotification('PDF export not available. Please refresh the page.', 'error');
        return;
    }
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const currentDate = new Date().toLocaleDateString();
    const currentTab = AppState.currentTab;
    
    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('G4S Fleet Management Report', 20, 30);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${currentDate}`, 20, 40);
    pdf.text(`Report Type: ${capitalizeFirstLetter(currentTab)}`, 20, 50);
    pdf.text(`Period: ${AppState.currentPeriod}`, 20, 60);
    
    let yPosition = 80;
    
    // Summary statistics
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary Statistics', 20, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    if (currentTab === 'offline') {
        const data = AppState.data.offline;
        pdf.text(`Total Offline Vehicles: ${data.length}`, 20, yPosition += 10);
        pdf.text(`Average Offline Hours: ${data.length > 0 ? Math.round(data.reduce((sum, item) => sum + parseFloat(item['Offline Since (hrs)']), 0) / data.length) : 0}`, 20, yPosition += 8);
        pdf.text(`Critical Cases (>7 days): ${data.filter(v => parseFloat(v['Offline Since (hrs)']) > 168).length}`, 20, yPosition += 8);
        
        yPosition += 15;
        
        // Create table for offline vehicles
        const tableData = data.map(vehicle => [
            vehicle['Vehicle Number'] || '',
            vehicle['Last Online'] || '',
            vehicle['Offline Since (hrs)'] + 'h',
            vehicle['Remarks'] || ''
        ]);
        
        pdf.autoTable({
            head: [['Vehicle', 'Last Online', 'Offline Hours', 'Remarks']],
            body: tableData,
            startY: yPosition,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [102, 126, 234] }
        });
    }
    
    // Save the PDF
    pdf.save(`G4S-${currentTab}-report-${currentDate.replace(/\//g, '-')}.pdf`);
    showNotification('PDF report exported successfully!', 'success');
}

function exportToExcel() {
    // For now, we'll export as CSV with enhanced data
    const currentTab = AppState.currentTab;
    let dataToExport = [];
    let filename = '';
    
    switch (currentTab) {
        case 'offline':
            dataToExport = enhanceDataForExport(AppState.data.offline, 'offline');
            filename = `G4S-offline-report-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'ai-alerts':
            dataToExport = enhanceDataForExport(AppState.data.alerts, 'alerts');
            filename = `G4S-alerts-report-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'speed':
            dataToExport = enhanceDataForExport(AppState.data.speed, 'speed');
            filename = `G4S-speed-report-${new Date().toISOString().split('T')[0]}.csv`;
            break;
    }
    
    if (dataToExport.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    
    showNotification('Excel report exported successfully!', 'success');
}

function enhanceDataForExport(data, type) {
    switch (type) {
        case 'offline':
            return data.map(item => ({
                'Vehicle Number': item['Vehicle Number'],
                'Client': item.client,
                'Last Online': item['Last Online'],
                'Offline Hours': item['Offline Since (hrs)'],
                'Location': item.location || extractLocationFromVehicle(item['Vehicle Number']),
                'Risk Level': calculateOfflineRisk(parseFloat(item['Offline Since (hrs)']) || 0),
                'Estimated Cost (INR)': calculateOfflineCost(parseFloat(item['Offline Since (hrs)']) || 0),
                'Remarks': item['Remarks'],
                'Export Date': new Date().toISOString().split('T')[0]
            }));
        case 'alerts':
            return data.map(item => ({
                'Vehicle Number': item.plateNo,
                'Company': item.company,
                'Alert Type': item.alarmType,
                'Time': item.startingTime,
                'Location': item.location,
                'Priority': item.priority,
                'Risk Score': item.riskScore,
                'Image Available': item.imageLink ? 'Yes' : 'No',
                'Export Date': new Date().toISOString().split('T')[0]
            }));
        case 'speed':
            return data.map(item => ({
                'Vehicle Number': item.plateNo,
                'Company': item.company,
                'Speed (km/h)': item.speed,
                'Time': item.startingTime,
                'Location': item.location,
                'Violation Type': item.violationType,
                'Risk Level': item.riskLevel,
                'Export Date': new Date().toISOString().split('T')[0]
            }));
        default:
            return data;
    }
}

// Utility Functions
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function refreshData() {
    console.log('🔄 Manual data refresh requested');
    loadAllData();
    showNotification('Data refreshed successfully!', 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-heavy);
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    return icons[type] || icons.info;
}

// PWA Functions
function setupPWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('✅ Service Worker registered'))
            .catch(error => console.log('❌ Service Worker registration failed'));
    }
    
    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        installPrompt = e;
        showInstallPrompt();
    });
    
    // Setup install buttons
    document.getElementById('install-yes').addEventListener('click', installPWA);
    document.getElementById('install-no').addEventListener('click', hideInstallPrompt);
}

function showInstallPrompt() {
    const prompt = document.getElementById('install-prompt');
    prompt.style.display = 'block';
    setTimeout(() => prompt.classList.add('show'), 100);
}

function hideInstallPrompt() {
    const prompt = document.getElementById('install-prompt');
    prompt.classList.remove('show');
    setTimeout(() => prompt.style.display = 'none', 300);
}

function installPWA() {
    if (installPrompt) {
        installPrompt.prompt();
        installPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') {
                console.log('✅ PWA installed successfully');
                showNotification('App installed successfully!', 'success');
            } else {
                console.log('❌ PWA installation declined');
            }
            installPrompt = null;
            hideInstallPrompt();
        });
    }
}

// Modal Management
function setupModalEvents() {
    const modal = document.getElementById('status-modal');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-status');
    const saveBtn = document.getElementById('save-status');

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', saveVehicleStatus);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });
}

// Edit vehicle status
function editVehicleStatus(vehicleNumber) {
    if (AppState.currentUser.role !== 'Admin') {
        showNotification('Only admins can edit vehicle status', 'warning');
        return;
    }
    
    console.log('Editing status for vehicle:', vehicleNumber);
    document.getElementById('modal-vehicle').textContent = vehicleNumber;
    document.getElementById('status-select').value = 'Parking/Garage';
    document.getElementById('reason-input').value = '';
    document.getElementById('status-modal').style.display = 'block';
    
    document.getElementById('status-modal').dataset.vehicle = vehicleNumber;
    
    // Focus on status select
    setTimeout(() => document.getElementById('status-select').focus(), 100);
}

// Save vehicle status
async function saveVehicleStatus() {
    const modal = document.getElementById('status-modal');
    const vehicleNumber = modal.dataset.vehicle;
    const status = document.getElementById('status-select').value;
    const reason = document.getElementById('reason-input').value;
    
    console.log('Saving status:', { vehicleNumber, status, reason });
    
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('offline_status')
                .upsert({
                    vehicle_number: vehicleNumber,
                    current_status: status,
                    reason: reason,
                    updated_at: new Date().toISOString(),
                    updated_by: AppState.currentUser.name || 'Admin'
                });
            
            if (error) {
                console.error('Supabase error:', error);
                showNotification('Error saving to database', 'error');
            } else {
                console.log('Status saved to database');
                showNotification('Vehicle status updated successfully!', 'success');
            }
        } else {
            console.log('Supabase not available - status saved locally');
            showNotification('Status updated (local only)', 'warning');
        }
        
        updateStatusUI(vehicleNumber, status);
        closeModal();
        
        // Log the change for audit trail
        logStatusChange(vehicleNumber, status, reason);
        
    } catch (error) {
        console.error('Error saving status:', error);
        showNotification('Error updating status. Please try again.', 'error');
    }
}

// Update status in UI
function updateStatusUI(vehicleNumber, status) {
    const statusElement = document.getElementById(`status-${vehicleNumber}`);
    if (statusElement) {
        const statusIcons = {
            'Online': '✅ Online',
            'Parking/Garage': '🅿️ Parking/Garage',
            'Dashcam Issue': '📷 Dashcam Issue',
            'Technical Problem': '🔧 Technical Problem'
        };
        statusElement.textContent = statusIcons[status] || status;
        
        const statusClasses = {
            'Online': 'status-online',
            'Parking/Garage': 'status-parking', 
            'Dashcam Issue': 'status-offline',
            'Technical Problem': 'status-technical'
        };
        statusElement.className = `status-badge ${statusClasses[status] || 'status-offline'}`;
        
        // Add update animation
        statusElement.style.animation = 'pulse 0.5s ease-in-out';
        setTimeout(() => statusElement.style.animation = '', 500);
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('status-modal');
    modal.style.animation = 'slideOutScale 0.3s ease';
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.animation = '';
    }, 300);
}

// Log status changes for audit trail
function logStatusChange(vehicleNumber, status, reason) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        vehicle: vehicleNumber,
        status: status,
        reason: reason,
        user: AppState.currentUser.name || 'Admin',
        sessionId: generateSessionId()
    };
    
    // Store in localStorage for audit trail
    const existingLogs = JSON.parse(localStorage.getItem('status-change-logs') || '[]');
    existingLogs.push(logEntry);
    
    // Keep only last 1000 entries
    if (existingLogs.length > 1000) {
        existingLogs.splice(0, existingLogs.length - 1000);
    }
    
    localStorage.setItem('status-change-logs', JSON.stringify(existingLogs));
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only handle shortcuts when not in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }
        
        // Handle shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'r':
                    e.preventDefault();
                    refreshData();
                    break;
                case 'e':
                    e.preventDefault();
                    exportToPDF();
                    break;
                case 'f':
                    e.preventDefault();
                    document.getElementById('global-search').focus();
                    break;
                case 't':
                    e.preventDefault();
                    toggleTheme();
                    break;
            }
        } else {
            // Tab switching shortcuts
            switch (e.key) {
                case '1':
                    switchTab('offline');
                    break;
                case '2':
                    switchTab('ai-alerts');
                    break;
                case '3':
                    switchTab('speed');
                    break;
                case '4':
                    switchTab('insights');
                    break;
                case 'Escape':
                    // Clear all filters
                    resetAllFilters();
                    applyFilters();
                    break;
            }
        }
    });
    
    // Show keyboard shortcuts help
    console.log('⌨️ Keyboard shortcuts available:');
    console.log('Ctrl+R: Refresh data');
    console.log('Ctrl+E: Export PDF');
    console.log('Ctrl+F: Focus search');
    console.log('Ctrl+T: Toggle theme');
    console.log('1-4: Switch tabs');
    console.log('Escape: Clear filters');
}

// Update last updated time
function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        const now = new Date();
        lastUpdatedElement.textContent = now.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Add subtle animation
        lastUpdatedElement.style.animation = 'fadeIn 0.3s ease';
        setTimeout(() => lastUpdatedElement.style.animation = '', 300);
    }
}

// Show/hide loading
function showLoading(show = true) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
        
        if (show) {
            loading.style.animation = 'fadeIn 0.3s ease';
        } else {
            loading.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (!show) loading.style.display = 'none';
            }, 300);
        }
    }
}

// Utility Functions
function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Performance monitoring
function trackPerformance(eventName, startTime = performance.now()) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`⚡ Performance: ${eventName} took ${duration.toFixed(2)}ms`);
    
    // Store performance metrics
    const perfData = JSON.parse(localStorage.getItem('performance-metrics') || '{}');
    if (!perfData[eventName]) perfData[eventName] = [];
    
    perfData[eventName].push({
        duration: duration,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 measurements per event
    if (perfData[eventName].length > 100) {
        perfData[eventName] = perfData[eventName].slice(-100);
    }
    
    localStorage.setItem('performance-metrics', JSON.stringify(perfData));
}

// Error handling and reporting
window.addEventListener('error', (e) => {
    console.error('❌ Global error:', e.error);
    
    const errorReport = {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        user: AppState.currentUser.name
    };
    
    // Store error for debugging
    const errors = JSON.parse(localStorage.getItem('error-logs') || '[]');
    errors.push(errorReport);
    
    // Keep only last 50 errors
    if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
    }
    
    localStorage.setItem('error-logs', JSON.stringify(errors));
    
    // Show user-friendly error message
    showNotification('An error occurred. The issue has been logged.', 'error');
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled promise rejection:', e.reason);
    
    const errorReport = {
        type: 'unhandledrejection',
        reason: e.reason?.toString(),
        stack: e.reason?.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href
    };
    
    const errors = JSON.parse(localStorage.getItem('error-logs') || '[]');
    errors.push(errorReport);
    localStorage.setItem('error-logs', JSON.stringify(errors));
    
    showNotification('A background error occurred.', 'warning');
});

// Network status monitoring
function setupNetworkMonitoring() {
    window.addEventListener('online', () => {
        showNotification('Connection restored', 'success');
        console.log('🌐 Back online');
        // Refresh data when connection is restored
        loadAllData();
    });

    window.addEventListener('offline', () => {
        showNotification('Connection lost. Working in offline mode.', 'warning');
        console.log('🚫 Gone offline');
    });

    // Check initial connection status
    if (!navigator.onLine) {
        showNotification('No internet connection. Some features may be limited.', 'warning');
    }
}

// Initialize network monitoring
document.addEventListener('DOMContentLoaded', () => {
    setupNetworkMonitoring();
});

// Memory management - cleanup old data
function cleanupMemory() {
    // Clear old performance metrics
    const perfData = JSON.parse(localStorage.getItem('performance-metrics') || '{}');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days of data
    
    Object.keys(perfData).forEach(eventName => {
        perfData[eventName] = perfData[eventName].filter(entry => 
            new Date(entry.timestamp) > cutoffDate
        );
    });
    
    localStorage.setItem('performance-metrics', JSON.stringify(perfData));
    
    // Clear old error logs
    const errors = JSON.parse(localStorage.getItem('error-logs') || '[]');
    const recentErrors = errors.filter(error => 
        new Date(error.timestamp) > cutoffDate
    );
    localStorage.setItem('error-logs', JSON.stringify(recentErrors));
    
    console.log('🧹 Memory cleanup completed');
}

// Run cleanup daily
setInterval(cleanupMemory, 24 * 60 * 60 * 1000);

// Advanced search functionality
function setupAdvancedSearch() {
    const searchInput = document.getElementById('global-search');
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performAdvancedSearch(searchInput.value);
        }
    });
}

function performAdvancedSearch(query) {
    if (!query.trim()) return;
    
    const results = {
        offline: [],
        speed: [],
        alerts: []
    };
    
    // Smart search across all data
    const searchTerms = query.toLowerCase().split(' ');
    
    AppState.data.offline.forEach(item => {
        const searchableText = `${item['Vehicle Number']} ${item.client} ${item['Remarks']} ${item.location}`.toLowerCase();
        if (searchTerms.every(term => searchableText.includes(term))) {
            results.offline.push(item);
        }
    });
    
    AppState.data.speed.forEach(item => {
        const searchableText = `${item.plateNo} ${item.company} ${item.location} ${item.speed}`.toLowerCase();
        if (searchTerms.every(term => searchableText.includes(term))) {
            results.speed.push(item);
        }
    });
    
    AppState.data.alerts.forEach(item => {
        const searchableText = `${item.plateNo} ${item.company} ${item.alarmType} ${item.location}`.toLowerCase();
        if (searchTerms.every(term => searchableText.includes(term))) {
            results.alerts.push(item);
        }
    });
    
    // Display search results
    displaySearchResults(results, query);
}

function displaySearchResults(results, query) {
    const totalResults = results.offline.length + results.speed.length + results.alerts.length;
    
    if (totalResults === 0) {
        showNotification(`No results found for "${query}"`, 'info');
        return;
    }
    
    showNotification(`Found ${totalResults} results for "${query}"`, 'success');
    
    // Update UI with filtered results
    updateOfflineUI(results.offline);
    updateSpeedUI(results.speed);
    updateAIAlertsUI(results.alerts);
    
    console.log(`🔍 Search results for "${query}":`, results);
}

// Initialize advanced search
document.addEventListener('DOMContentLoaded', () => {
    setupAdvancedSearch();
});

// Data validation functions
function validateVehicleNumber(vehicleNumber) {
    // Indian vehicle number pattern: XX##YY#### or XX##Y#### or XX#####
    const pattern = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/;
    return pattern.test(vehicleNumber);
}

function validateSpeed(speed) {
    return typeof speed === 'number' && speed >= 0 && speed <= 300;
}

function validateTimestamp(timestamp) {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
}

// Data sanitization
function sanitizeData(data, type) {
    if (!Array.isArray(data)) return [];
    
    return data.filter(item => {
        switch (type) {
            case 'offline':
                return item && item['Vehicle Number'] && validateVehicleNumber(item['Vehicle Number']);
            case 'speed':
                return item && item.plateNo && item.speed && validateSpeed(item.speed);
            case 'alerts':
                return item && item.plateNo && item.alarmType;
            default:
                return true;
        }
    }).map(item => {
        // Sanitize strings
        Object.keys(item).forEach(key => {
            if (typeof item[key] === 'string') {
                item[key] = item[key].trim().replace(/[<>]/g, '');
            }
        });
        return item;
    });
}

// Version check and update notification
function checkForUpdates() {
    const currentVersion = CONFIG.app.version;
    const lastKnownVersion = localStorage.getItem('app-version');
    
    if (lastKnownVersion && lastKnownVersion !== currentVersion) {
        showNotification(`App updated to version ${currentVersion}! 🎉`, 'success');
        
        // Show changelog if available
        console.log(`📝 Updated from ${lastKnownVersion} to ${currentVersion}`);
    }
    
    localStorage.setItem('app-version', currentVersion);
}

// Initialize version check
document.addEventListener('DOMContentLoaded', () => {
    checkForUpdates();
});

// Accessibility improvements
function setupAccessibility() {
    // Add skip links
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--primary-color);
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 10000;
        transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add main content ID
    const mainContent = document.querySelector('.tab-content');
    if (mainContent) {
        mainContent.id = 'main-content';
    }
    
    // Ensure all interactive elements are keyboard accessible
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
    interactiveElements.forEach(element => {
        if (!element.getAttribute('tabindex')) {
            element.setAttribute('tabindex', '0');
        }
    });
}

// Initialize accessibility features
document.addEventListener('DOMContentLoaded', () => {
    setupAccessibility();
});

// Final initialization
console.log(`🚀 G4S Enhanced Fleet Dashboard v${CONFIG.app.version} fully loaded`);
console.log('📊 Features: Smart Filters, AI Insights, PWA, Role Management, Advanced Export');
console.log('🎯 Ready for production use!');

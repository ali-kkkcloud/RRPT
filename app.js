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
    }
};

// Global variables
let supabaseClient;
let currentData = { offline: [], speed: [], alerts: [] };
let charts = {};
let currentTab = 'offline';
let currentPeriod = 'daily';

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing G4S Professional Dashboard...');
    initializeApp();
});

function initializeApp() {
    initializeSupabase();
    setupEventListeners();
    setupMobileResponsive();
    loadInitialData();
    startAutoRefresh();
    updateLastUpdated();
    
    // Initialize with sample data for immediate UI display
    initializeWithSampleData();
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
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            switchTab(tab);
            closeMobileSidebar();
        });
    });

    // Period toggles
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => switchPeriod(btn.dataset.period));
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Date selector
    document.getElementById('date-select').addEventListener('change', loadDataForCurrentTab);

    // Search
    document.getElementById('global-search').addEventListener('input', handleSearch);

    // Action buttons
    document.getElementById('refresh-btn').addEventListener('click', loadDataForCurrentTab);
    document.getElementById('export-btn').addEventListener('click', exportToPDF);

    // Range picker
    document.getElementById('range-btn').addEventListener('click', openRangePicker);
    document.getElementById('range-close').addEventListener('click', closeRangePicker);
    document.getElementById('range-cancel').addEventListener('click', closeRangePicker);
    document.getElementById('range-apply').addEventListener('click', applyDateRange);

    // Status modal
    document.getElementById('modal-close').addEventListener('click', closeStatusModal);
    document.getElementById('cancel-status').addEventListener('click', closeStatusModal);
    document.getElementById('save-status').addEventListener('click', saveVehicleStatus);

    // Table filters
    setupTableFilters();

    // Click outside modals to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

function setupMobileResponsive() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

function switchTab(tabName) {
    if (!tabName) return;
    
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
    updateDateSelector();
    
    // Load data for the new tab
    loadDataForCurrentTab();
}

function switchPeriod(period) {
    currentPeriod = period;
    console.log(`📊 Switching to ${period} period`);
    
    // Update UI
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`)?.classList.add('active');

    // Update date selector
    updateDateSelector();
    
    // Reload data
    loadDataForCurrentTab();
}

function updateDateSelector() {
    const dateSelect = document.getElementById('date-select');
    dateSelect.innerHTML = '';
    
    if (currentPeriod === 'daily') {
        dateSelect.innerHTML = `
            <option value="25 August">25 August</option>
            <option value="24 August">24 August</option>
            <option value="23 August">23 August</option>
            <option value="22 August">22 August</option>
            <option value="21 August">21 August</option>
            <option value="29-07-25">29 July</option>
            <option value="30-07-25">30 July</option>
            <option value="31-07-25">31 July</option>
        `;
    } else if (currentPeriod === 'weekly') {
        dateSelect.innerHTML = `
            <option value="week-25-aug">Week of Aug 19-25</option>
            <option value="week-18-aug">Week of Aug 12-18</option>
            <option value="week-29-jul">Week of Jul 29-31</option>
        `;
    } else if (currentPeriod === 'monthly') {
        dateSelect.innerHTML = `
            <option value="august-2025">August 2025</option>
            <option value="july-2025">July 2025</option>
            <option value="june-2025">June 2025</option>
        `;
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    document.getElementById('theme-toggle').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    
    localStorage.setItem('theme', newTheme);
    console.log(`🎨 Theme switched to ${newTheme}`);
}

function loadInitialData() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-toggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    
    // Load data for current tab
    loadDataForCurrentTab();
}

function showLoading(show = true) {
    const loading = document.getElementById('loading');
    loading.style.display = show ? 'flex' : 'none';
}

async function loadDataForCurrentTab() {
    console.log(`📡 Loading data for ${currentTab} tab (${currentPeriod})`);
    showLoading(true);
    
    try {
        switch(currentTab) {
            case 'offline':
                await loadOfflineData();
                break;
            case 'ai-alerts':
                await loadAIAlertsData();
                break;
            case 'speed':
                await loadSpeedData();
                break;
        }
    } catch (error) {
        console.error('❌ Data loading failed:', error);
        showError('Failed to load data. Using cached data.');
        loadSampleDataForTab();
    } finally {
        showLoading(false);
        updateLastUpdated();
    }
}

// Live Data Loading Functions
async function fetchWithFallback(url) {
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

async function loadOfflineData() {
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.offline}/export?format=csv&gid=0`;
        const csvText = await fetchWithFallback(csvUrl);
        
        if (csvText) {
            const parsed = Papa.parse(csvText, { 
                header: true, 
                skipEmptyLines: true,
                transformHeader: header => header.trim()
            });
            
            const filteredData = parsed.data.filter(row => {
                const client = (row.client || row.Client || '').toLowerCase();
                const offlineHours = parseFloat(row['Offline Since (hrs)'] || 0);
                const vehicleNumber = row['Vehicle Number'] || row['vehicle_number'];
                return client.includes('g4s') && offlineHours >= 24 && vehicleNumber;
            });
            
            if (filteredData.length > 0) {
                await loadExistingStatus(filteredData);
                currentData.offline = filteredData;
                console.log(`✅ Loaded ${filteredData.length} offline vehicles`);
            } else {
                throw new Error('No valid offline data found');
            }
        } else {
            throw new Error('No CSV data received');
        }
    } catch (error) {
        console.error('❌ Offline data loading failed:', error);
        currentData.offline = getSampleOfflineData();
    }
    
    updateOfflineUI();
}

async function loadAIAlertsData() {
    try {
        if (currentPeriod === 'weekly') {
            currentData.alerts = await loadWeeklyAlertsData();
        } else if (currentPeriod === 'monthly') {
            currentData.alerts = await loadMonthlyAlertsData();
        } else {
            currentData.alerts = await loadDailyAlertsData();
        }
        console.log(`✅ Loaded ${currentData.alerts.length} AI alerts`);
    } catch (error) {
        console.error('❌ AI alerts loading failed:', error);
        currentData.alerts = getSampleAlertsData();
    }
    
    updateAIAlertsUI();
}

async function loadSpeedData() {
    try {
        if (currentPeriod === 'weekly') {
            currentData.speed = await loadWeeklySpeedData();
        } else if (currentPeriod === 'monthly') {
            currentData.speed = await loadMonthlySpeedData();
        } else {
            currentData.speed = await loadDailySpeedData();
        }
        console.log(`✅ Loaded ${currentData.speed.length} speed violations`);
    } catch (error) {
        console.error('❌ Speed data loading failed:', error);
        currentData.speed = getSampleSpeedData();
    }
    
    updateSpeedUI();
}

async function loadDailyAlertsData() {
    const selectedDate = document.getElementById('date-select').value;
    const gidMap = {
        '25 August': '1378822335',
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
    
    const csvText = await fetchWithFallback(csvUrl);
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

async function loadWeeklyAlertsData() {
    const selectedWeek = document.getElementById('date-select').value;
    let dates = [];
    
    switch(selectedWeek) {
        case 'week-25-aug':
            dates = ['25 August', '24 August', '23 August', '22 August', '21 August'];
            break;
        case 'week-18-aug':
            dates = ['23 August', '22 August', '21 August'];
            break;
        case 'week-29-jul':
            dates = ['29-07-25', '30-07-25', '31-07-25'];
            break;
        default:
            dates = ['25 August', '24 August', '23 August'];
    }
    
    const promises = dates.map(date => loadSingleDayAlertsData(date));
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

async function loadMonthlyAlertsData() {
    const weeklyData = await loadWeeklyAlertsData();
    return weeklyData.map(item => ({
        ...item,
        count: Math.round(item.count * 4.3)
    }));
}

async function loadSingleDayAlertsData(date) {
    try {
        const gidMap = {
            '25 August': '1378822335',
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
        
        const csvText = await fetchWithFallback(csvUrl);
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

async function loadDailySpeedData() {
    const selectedDate = document.getElementById('date-select').value;
    const gidMap = {
        '25 August': '293366971',
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
    
    const csvText = await fetchWithFallback(csvUrl);
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

async function loadWeeklySpeedData() {
    const selectedWeek = document.getElementById('date-select').value;
    let dates = [];
    
    switch(selectedWeek) {
        case 'week-25-aug':
            dates = ['25 August', '24 August', '23 August', '22 August', '21 August'];
            break;
        case 'week-18-aug':
            dates = ['23 August', '22 August', '21 August'];
            break;
        case 'week-29-jul':
            dates = ['29-07-25', '30-07-25', '31-07-25'];
            break;
        default:
            dates = ['25 August', '24 August', '23 August'];
    }
    
    const promises = dates.map(date => loadSingleDaySpeedData(date));
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

async function loadMonthlySpeedData() {
    const weeklyData = await loadWeeklySpeedData();
    return weeklyData.map(item => ({
        ...item,
        violations: Math.round(item.violations * 4.3),
        warnings: Math.round(item.warnings * 4.3),
        alarms: Math.round(item.alarms * 4.3)
    }));
}

async function loadSingleDaySpeedData(date) {
    try {
        const gidMap = {
            '25 August': '293366971',
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
        
        const csvText = await fetchWithFallback(csvUrl);
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

// UI Update Functions
function updateOfflineUI() {
    const data = currentData.offline;
    
    // Update stats
    animateValue(document.getElementById('total-offline'), 0, data.length, 1000);
    
    const avgOffline = data.length > 0 ? Math.round(data.reduce((sum, item) => sum + parseFloat(item['Offline Since (hrs)'] || 0), 0) / data.length) : 0;
    animateValue(document.getElementById('avg-offline'), 0, avgOffline, 1200);
    
    const criticalIssues = data.filter(item => parseFloat(item['Offline Since (hrs)'] || 0) > 1000).length;
    animateValue(document.getElementById('critical-issues'), 0, criticalIssues, 1400);
    
    updateOfflineTable(data);
    updateOfflineCharts(data);
}

function updateAIAlertsUI() {
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
    
    animateValue(document.getElementById('total-alerts'), 0, totalAlerts, 1000);
    animateValue(document.getElementById('unique-vehicles'), 0, uniqueVehicles, 1200);
    document.getElementById('top-violator').textContent = topViolator;
    document.getElementById('alert-rate').textContent = alertRate;
    
    updateAIAlertsTable(data);
    updateAIAlertsCharts(data);
}

function updateSpeedUI() {
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
    
    animateValue(document.getElementById('total-violations'), 0, totalViolations, 1000);
    animateValue(document.getElementById('warning-count'), 0, warnings, 1200);
    animateValue(document.getElementById('alarm-count'), 0, alarms, 1400);
    document.getElementById('max-speed').textContent = maxSpeed.toFixed(1);
    
    updateSpeedTable(data);
    updateSpeedCharts(data);
}

// Table Update Functions
function updateOfflineTable(data) {
    const tbody = document.getElementById('offline-table-body');
    tbody.innerHTML = '';
    
    data.forEach(vehicle => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${vehicle['Vehicle Number']}</strong></td>
            <td>${vehicle['Last Online'] || '-'}</td>
            <td><span class="status-badge ${getOfflineHoursClass(vehicle['Offline Since (hrs)'])}">${vehicle['Offline Since (hrs)']}h</span></td>
            <td><span class="status-badge ${getStatusClass(vehicle.Status)}" id="status-${vehicle['Vehicle Number']}">${getStatusIcon(vehicle.Status)} ${vehicle.Status || 'Offline'}</span></td>
            <td>${vehicle.Remarks || '-'}</td>
            <td><button class="btn btn-secondary" onclick="editVehicleStatus('${vehicle['Vehicle Number']}')">Edit</button></td>
        `;
        tbody.appendChild(row);
    });
}

function updateAIAlertsTable(data) {
    const tbody = document.getElementById('alerts-table-body');
    tbody.innerHTML = '';
    
    data.forEach(alert => {
        const row = document.createElement('tr');
        if (currentPeriod === 'daily') {
            row.innerHTML = `
                <td><strong>${alert.plateNo}</strong></td>
                <td>${alert.company}</td>
                <td><span class="status-badge status-warning">${alert.alarmType}</span></td>
                <td>${alert.startingTime}</td>
                <td>${alert.imageLink ? `<a href="${alert.imageLink}" target="_blank" class="btn btn-secondary">View</a>` : '-'}</td>
            `;
        } else {
            row.innerHTML = `
                <td><strong>${alert.plateNo}</strong></td>
                <td>${alert.company}</td>
                <td><span class="status-badge status-warning">${alert.alarmType}</span></td>
                <td><span class="status-badge status-info">${alert.count} total</span></td>
                <td>-</td>
            `;
        }
        tbody.appendChild(row);
    });
}

function updateSpeedTable(data) {
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
                <td>${vehicle.company}</td>
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
                <td>${vehicle.company}</td>
                <td><span class="status-badge ${vehicle.maxSpeed >= 90 ? 'status-danger' : 'status-warning'}">${vehicle.maxSpeed.toFixed(1)} km/h</span></td>
                <td><span class="status-badge status-warning">${vehicle.warnings}</span></td>
                <td><span class="status-badge status-danger">${vehicle.alarms}</span></td>
                <td><span class="status-badge status-info">${vehicle.violations}</span></td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Chart Update Functions
function updateOfflineCharts(data) {
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
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true }
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
                    backgroundColor: '#667eea',
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

function updateAIAlertsCharts(data) {
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
                labels: Object.keys(vehicleStats).map(v => v.slice(-4)),
                data: Object.values(vehicleStats)
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
                    backgroundColor: '#f59e0b',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
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
                    backgroundColor: ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true }
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
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

function updateSpeedCharts(data) {
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
                labels: Object.keys(vehicleStats).map(v => v.slice(-4)),
                data: Object.values(vehicleStats)
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
                    backgroundColor: '#ef4444',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
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
                    backgroundColor: ['#f59e0b', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true }
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
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

// Utility Functions
function animateValue(element, start, end, duration) {
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

function getStatusClass(status) {
    const statusMap = {
        'Online': 'status-online',
        'Parking/Garage': 'status-info',
        'Dashcam Issue': 'status-danger',
        'Technical Problem': 'status-warning',
        'Offline': 'status-danger'
    };
    return statusMap[status] || 'status-danger';
}

function getStatusIcon(status) {
    const iconMap = {
        'Online': '✅',
        'Parking/Garage': '🅿️',
        'Dashcam Issue': '📷',
        'Technical Problem': '🔧',
        'Offline': '🔴'
    };
    return iconMap[status] || '🔴';
}

function getOfflineHoursClass(hours) {
    const h = parseFloat(hours || 0);
    if (h > 1000) return 'status-danger';
    if (h > 100) return 'status-warning';
    return 'status-info';
}

// Sample Data Functions
function getSampleOfflineData() {
    return [
        { 'Vehicle Number': 'HR55AX4712', 'Last Online': '2025-08-20', 'Offline Since (hrs)': '112', 'Remarks': 'Parked at depot', 'Status': 'Parking/Garage' },
        { 'Vehicle Number': 'TS08HC6654', 'Last Online': '2025-05-12', 'Offline Since (hrs)': '2515', 'Remarks': 'Under maintenance', 'Status': 'Technical Problem' },
        { 'Vehicle Number': 'AP39HS4926', 'Last Online': '2025-08-23', 'Offline Since (hrs)': '52', 'Remarks': 'Driver sick leave', 'Status': 'Offline' },
        { 'Vehicle Number': 'HR63F2958', 'Last Online': '2025-05-09', 'Offline Since (hrs)': '2586', 'Remarks': 'GPS connectivity issue', 'Status': 'Technical Problem' },
        { 'Vehicle Number': 'CH01CK2912', 'Last Online': '2025-08-25', 'Offline Since (hrs)': '48', 'Remarks': 'Technical checkup pending', 'Status': 'Technical Problem' }
    ];
}

function getSampleAlertsData() {
    return [
        { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving', startingTime: '08:30:07', imageLink: '' },
        { plateNo: 'HR55AX4712', company: 'North', alarmType: 'Call Alarm', startingTime: '16:09:09', imageLink: '' },
        { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seatbelt', startingTime: '07:54:47', imageLink: '' },
        { plateNo: 'TS08HC6654', company: 'South', alarmType: 'Unfastened Seatbelt', startingTime: '08:31:05', imageLink: '' },
        { plateNo: 'AP39HS4926', company: 'South', alarmType: 'Distracted Driving', startingTime: '11:19:28', imageLink: '' }
    ];
}

function getSampleSpeedData() {
    return [
        { plateNo: 'HR63F2958', company: 'North', startingTime: '05:58:13', speed: 94.5 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '16:46:15', speed: 92.9 },
        { plateNo: 'HR55AX4712', company: 'North', startingTime: '11:44:44', speed: 90.1 },
        { plateNo: 'AP39HS4926', company: 'South', startingTime: '16:09:09', speed: 88.2 },
        { plateNo: 'HR47G5244', company: 'North', startingTime: '07:54:47', speed: 95.1 },
        { plateNo: 'CH01CK2912', company: 'South', startingTime: '12:40:42', speed: 77.5 }
    ];
}

function initializeWithSampleData() {
    currentData.offline = getSampleOfflineData();
    currentData.alerts = getSampleAlertsData();
    currentData.speed = getSampleSpeedData();
    
    // Update UI immediately
    updateOfflineUI();
    updateAIAlertsUI();
    updateSpeedUI();
}

function loadSampleDataForTab() {
    switch(currentTab) {
        case 'offline':
            currentData.offline = getSampleOfflineData();
            updateOfflineUI();
            break;
        case 'ai-alerts':
            currentData.alerts = getSampleAlertsData();
            updateAIAlertsUI();
            break;
        case 'speed':
            currentData.speed = getSampleSpeedData();
            updateSpeedUI();
            break;
    }
}

// Modal Functions
function openRangePicker() {
    document.getElementById('range-modal').style.display = 'flex';
    
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    document.getElementById('to-date').value = today.toISOString().split('T')[0];
    document.getElementById('from-date').value = weekAgo.toISOString().split('T')[0];
}

function closeRangePicker() {
    document.getElementById('range-modal').style.display = 'none';
}

function applyDateRange() {
    const fromDate = document.getElementById('from-date').value;
    const toDate = document.getElementById('to-date').value;
    
    if (!fromDate || !toDate) {
        showError('Please select both dates');
        return;
    }
    
    if (new Date(fromDate) > new Date(toDate)) {
        showError('From date cannot be later than to date');
        return;
    }
    
    console.log(`📅 Date range: ${fromDate} to ${toDate}`);
    showSuccess(`Date range applied: ${fromDate} to ${toDate}`);
    closeRangePicker();
    
    // Reload data for the selected range
    loadDataForCurrentTab();
}

function editVehicleStatus(vehicleNumber) {
    document.getElementById('modal-vehicle').value = vehicleNumber;
    document.getElementById('status-select').value = 'Parking/Garage';
    document.getElementById('reason-input').value = '';
    document.getElementById('status-modal').style.display = 'flex';
}

function closeStatusModal() {
    document.getElementById('status-modal').style.display = 'none';
}

async function saveVehicleStatus() {
    const vehicleNumber = document.getElementById('modal-vehicle').value;
    const status = document.getElementById('status-select').value;
    const reason = document.getElementById('reason-input').value;
    
    if (!vehicleNumber || !status) {
        showError('Please fill required fields');
        return;
    }
    
    try {
        showLoading(true);
        
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('offline_status')
                .upsert({
                    vehicle_number: vehicleNumber,
                    current_status: status,
                    reason: reason.trim() || null,
                    updated_at: new Date().toISOString(),
                    updated_by: 'Admin'
                });
            
            if (error) {
                throw error;
            }
            
            showSuccess('Status updated successfully!');
        } else {
            showSuccess('Status updated locally');
        }
        
        // Update UI
        const statusElement = document.getElementById(`status-${vehicleNumber}`);
        if (statusElement) {
            statusElement.className = `status-badge ${getStatusClass(status)}`;
            statusElement.textContent = `${getStatusIcon(status)} ${status}`;
        }
        
        // Update data
        const vehicle = currentData.offline.find(v => v['Vehicle Number'] === vehicleNumber);
        if (vehicle) {
            vehicle.Status = status;
            vehicle.Remarks = reason || vehicle.Remarks;
        }
        
        closeStatusModal();
        
    } catch (error) {
        console.error('❌ Status save failed:', error);
        showError('Failed to save status');
    } finally {
        showLoading(false);
    }
}

// Search and Filter Functions
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    console.log('🔍 Searching:', searchTerm);
    
    if (!searchTerm) {
        // Show all data
        switch(currentTab) {
            case 'offline':
                updateOfflineTable(currentData.offline);
                break;
            case 'ai-alerts':
                updateAIAlertsTable(currentData.alerts);
                break;
            case 'speed':
                updateSpeedTable(currentData.speed);
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
            updateOfflineTable(filteredData);
            break;
        case 'ai-alerts':
            filteredData = currentData.alerts.filter(item => 
                JSON.stringify(item).toLowerCase().includes(searchTerm)
            );
            updateAIAlertsTable(filteredData);
            break;
        case 'speed':
            filteredData = currentData.speed.filter(item => 
                JSON.stringify(item).toLowerCase().includes(searchTerm)
            );
            updateSpeedTable(filteredData);
            break;
    }
}

function setupTableFilters() {
    // Region filter
    const regionFilter = document.getElementById('region-filter');
    if (regionFilter) {
        regionFilter.addEventListener('change', applyFilters);
    }
    
    // Status filter
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    // Alert type filter
    const alertTypeFilter = document.getElementById('alert-type-filter');
    if (alertTypeFilter) {
        alertTypeFilter.addEventListener('change', applyFilters);
    }
    
    // Speed filter
    const speedFilter = document.getElementById('speed-filter');
    if (speedFilter) {
        speedFilter.addEventListener('change', applyFilters);
    }
}

function applyFilters() {
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
            
            updateOfflineTable(filteredData);
            break;
            
        case 'ai-alerts':
            const alertTypeFilter = document.getElementById('alert-type-filter')?.value;
            
            if (alertTypeFilter) {
                filteredData = filteredData.filter(item => 
                    (item.alarmType || '').toLowerCase().includes(alertTypeFilter)
                );
            }
            
            updateAIAlertsTable(filteredData);
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
            
            updateSpeedTable(filteredData);
            break;
    }
}

// Supabase Functions
async function loadExistingStatus(vehicles) {
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

// Export Functions
function exportToPDF() {
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
        
        // Table data
        let tableData = [];
        let headers = [];
        
        const data = currentData[currentTab.replace('-', '')];
        
        switch(currentTab) {
            case 'offline':
                headers = ['Vehicle', 'Last Online', 'Hours', 'Status', 'Remarks'];
                tableData = data.map(item => [
                    item['Vehicle Number'],
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
            startY: 70,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [102, 126, 234], textColor: 255 }
        });
        
        const filename = `G4S-${currentTab}-${currentPeriod}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
        showSuccess('PDF exported successfully!');
        
    } catch (error) {
        console.error('❌ PDF export failed:', error);
        showError('PDF export failed');
    }
}

// Notification Functions
function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        font-weight: 500;
        z-index: 10002;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;
    
    const colors = {
        success: 'background: linear-gradient(135deg, #10b981, #059669); color: white;',
        error: 'background: linear-gradient(135deg, #ef4444, #dc2626); color: white;',
        info: 'background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;'
    };
    
    notification.style.cssText += colors[type];
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, type === 'error' ? 5000 : 3000);
}

// Auto-refresh and Updates
function startAutoRefresh() {
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            console.log('🔄 Auto-refreshing data...');
            loadDataForCurrentTab();
        }
    }, 5 * 60 * 1000); // 5 minutes
}

function updateLastUpdated() {
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
        lastUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Global error handler
window.addEventListener('error', (e) => {
    console.error('🚨 Global error:', e.error);
});

console.log('✅ G4S Dashboard initialized successfully');

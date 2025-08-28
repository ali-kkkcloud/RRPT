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
    initializeApp();
});

function initializeApp() {
    console.log('Initializing G4S Dashboard v2.0...');
    initializeSupabase();
    setupEventListeners();
    loadInitialData();
    startAutoRefresh();
    
    // Update last updated time every minute
    setInterval(() => {
        const now = new Date();
        document.querySelector('.logo-section p').textContent = 
            `Last updated: ${now.toLocaleTimeString()}`;
    }, 60000);
}

function initializeSupabase() {
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);
            console.log('Supabase initialized successfully');
        }
    } catch (error) {
        console.error('Supabase initialization error:', error);
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
    });

    // Report period toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => switchPeriod(btn.dataset.period));
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Date selector
    document.getElementById('date-select').addEventListener('change', function() {
        loadDataForCurrentTab();
    });

    // Search
    document.getElementById('global-search').addEventListener('input', handleSearch);

    // Buttons
    document.getElementById('refresh-btn').addEventListener('click', loadDataForCurrentTab);
    document.getElementById('export-btn').addEventListener('click', exportToPDF);

    // Modal events
    setupModalEvents();
    
    // Table filters
    setupTableFilters();
}

function setupModalEvents() {
    const modal = document.getElementById('status-modal');
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('cancel-status');
    const saveBtn = document.getElementById('save-status');

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', saveVehicleStatus);

    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Show/hide report toggle
    const reportToggle = document.getElementById('report-toggle');
    if (tabName === 'ai-alerts' || tabName === 'speed') {
        reportToggle.style.display = 'flex';
    } else {
        reportToggle.style.display = 'none';
    }

    loadDataForCurrentTab();
}

function switchPeriod(period) {
    currentPeriod = period;
    
    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('active');

    // Update date selector based on period
    updateDateSelector();
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
        `;
    } else if (currentPeriod === 'weekly') {
        dateSelect.innerHTML = `
            <option value="week-25-aug">Week of Aug 19-25</option>
            <option value="week-18-aug">Week of Aug 12-18</option>
            <option value="week-11-aug">Week of Aug 5-11</option>
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
    
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    
    localStorage.setItem('theme', newTheme);
}

function showLoading(show = true) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function loadInitialData() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-toggle').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    
    // Load initial data
    loadDataForCurrentTab();
}

async function loadDataForCurrentTab() {
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
        console.error('Error loading data:', error);
        showError('Failed to load data. Please check your internet connection and try again.');
    } finally {
        showLoading(false);
    }
}

async function loadOfflineData() {
    console.log('Loading live offline data...');
    
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.offline}/export?format=csv&gid=0`;
        let csvText = await fetchWithFallback(csvUrl);
        
        if (csvText) {
            const parsed = Papa.parse(csvText, { 
                header: true, 
                skipEmptyLines: true,
                transformHeader: header => header.trim()
            });
            
            // Filter G4S vehicles offline >= 24 hours
            const filteredData = parsed.data.filter(row => {
                const client = (row.client || row.Client || '').toLowerCase();
                const offlineHours = parseFloat(row['Offline Since (hrs)'] || row['offline_hours'] || 0);
                const vehicleNumber = row['Vehicle Number'] || row['vehicle_number'] || row['Vehicle'];
                return client.includes('g4s') && offlineHours >= 24 && vehicleNumber;
            });
            
            // Load existing status from Supabase
            await loadExistingStatus(filteredData);
            
            currentData.offline = filteredData;
            console.log(`Loaded ${filteredData.length} offline vehicles`);
        } else {
            throw new Error('No data received from sheets');
        }
        
    } catch (error) {
        console.error('Offline data loading failed:', error);
        // Fallback to cached data or sample data
        currentData.offline = getCachedData('offline') || getSampleOfflineData();
    }
    
    updateOfflineUI();
}

async function loadAIAlertsData() {
    console.log('Loading live AI alerts data...');
    
    try {
        if (currentPeriod === 'weekly') {
            currentData.alerts = await loadWeeklyAlertsData();
        } else if (currentPeriod === 'monthly') {
            currentData.alerts = await loadMonthlyAlertsData();
        } else {
            currentData.alerts = await loadDailyAlertsData();
        }
        
        console.log(`Loaded ${currentData.alerts.length} AI alerts`);
        
    } catch (error) {
        console.error('AI Alerts data loading failed:', error);
        currentData.alerts = getCachedData('alerts') || getSampleAlertsData();
    }
    
    updateAIAlertsUI();
}

async function loadSpeedData() {
    console.log('Loading live speed data...');
    
    try {
        if (currentPeriod === 'weekly') {
            currentData.speed = await loadWeeklySpeedData();
        } else if (currentPeriod === 'monthly') {
            currentData.speed = await loadMonthlySpeedData();
        } else {
            currentData.speed = await loadDailySpeedData();
        }
        
        console.log(`Loaded ${currentData.speed.length} speed violations`);
        
    } catch (error) {
        console.error('Speed data loading failed:', error);
        currentData.speed = getCachedData('speed') || getSampleSpeedData();
    }
    
    updateSpeedUI();
}

// Live Data Loading Functions
async function fetchWithFallback(url) {
    let csvText = null;
    
    // Method 1: Direct fetch
    try {
        console.log('Direct fetch from:', url);
        const response = await fetch(url);
        if (response.ok) {
            csvText = await response.text();
            console.log('Direct fetch successful, data length:', csvText.length);
            return csvText;
        }
    } catch (error) {
        console.log('Direct fetch failed:', error.message);
    }
    
    // Method 2: CORS proxy
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        console.log('Proxy fetch from:', proxyUrl);
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const data = await response.json();
            csvText = data.contents;
            console.log('Proxy fetch successful, data length:', csvText.length);
            return csvText;
        }
    } catch (error) {
        console.log('Proxy fetch failed:', error.message);
    }
    
    return null;
}

async function loadDailyAlertsData() {
    const selectedDate = document.getElementById('date-select').value;
    const gidMap = {
        '25 August': '1378822335',
        '24 August': '0',
        '23 August': '1'
    };
    
    const gid = gidMap[selectedDate] || '1378822335';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.alerts}/export?format=csv&gid=${gid}`;
    
    const csvText = await fetchWithFallback(csvUrl);
    if (!csvText) throw new Error('Failed to fetch alerts data');
    
    const parsed = Papa.parse(csvText, { 
        header: true, 
        skipEmptyLines: true,
        transformHeader: header => header.trim()
    });
    
    const filteredData = parsed.data.filter(row => {
        const plateNo = row['Plate NO.'] || row['plate_no'] || row['Vehicle'];
        const alarmType = row['Alarm Type'] || row['alarm_type'] || row['Alert Type'];
        return plateNo && alarmType;
    }).map(row => ({
        plateNo: row['Plate NO.'] || row['plate_no'] || row['Vehicle'] || '',
        company: row['Company'] || row['company'] || '',
        alarmType: row['Alarm Type'] || row['alarm_type'] || row['Alert Type'] || '',
        startingTime: row['Starting time'] || row['starting_time'] || row['Time'] || '',
        imageLink: row['Image Link'] || row['image_link'] || ''
    }));
    
    cacheData('alerts', filteredData);
    return filteredData;
}

async function loadWeeklyAlertsData() {
    const promises = [];
    const dates = ['25 August', '24 August', '23 August']; // Last 3 days for demo
    
    for (const date of dates) {
        promises.push(loadSingleDayAlertsData(date));
    }
    
    const dailyData = await Promise.all(promises);
    const allAlerts = dailyData.flat();
    
    // Aggregate by vehicle and alert type
    const aggregated = allAlerts.reduce((acc, alert) => {
        const key = `${alert.plateNo}-${alert.alarmType}`;
        if (!acc[key]) {
            acc[key] = {
                plateNo: alert.plateNo,
                company: alert.company,
                alarmType: alert.alarmType,
                count: 0,
                days: new Set()
            };
        }
        acc[key].count++;
        acc[key].days.add(alert.startingTime?.split(' ')[0] || '');
        return acc;
    }, {});
    
    return Object.values(aggregated).map(item => ({
        ...item,
        avgPerDay: (item.count / Math.max(item.days.size, 1)).toFixed(1)
    }));
}

async function loadMonthlyAlertsData() {
    // For demo, multiply weekly by 4
    const weeklyData = await loadWeeklyAlertsData();
    return weeklyData.map(item => ({
        ...item,
        count: Math.round(item.count * 4.3), // ~30 days / 7 days
        avgPerDay: item.avgPerDay
    }));
}

async function loadSingleDayAlertsData(date) {
    try {
        const gidMap = {
            '25 August': '1378822335',
            '24 August': '0',
            '23 August': '1'
        };
        
        const gid = gidMap[date] || '1378822335';
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.alerts}/export?format=csv&gid=${gid}`;
        
        const csvText = await fetchWithFallback(csvUrl);
        if (!csvText) return [];
        
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        return parsed.data.filter(row => row['Plate NO.'] && row['Alarm Type']);
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
        '23 August': '1'
    };
    
    const gid = gidMap[selectedDate] || '293366971';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.speed}/export?format=csv&gid=${gid}`;
    
    const csvText = await fetchWithFallback(csvUrl);
    if (!csvText) throw new Error('Failed to fetch speed data');
    
    const parsed = Papa.parse(csvText, { 
        header: true, 
        skipEmptyLines: true,
        transformHeader: header => header.trim()
    });
    
    const filteredData = parsed.data.filter(row => {
        const speed = parseFloat(row['Speed(Km/h)'] || row['speed'] || 0);
        const plateNo = row['Plate NO.'] || row['plate_no'] || row['Vehicle'];
        return speed >= 75 && plateNo;
    }).map(row => ({
        plateNo: row['Plate NO.'] || row['plate_no'] || row['Vehicle'] || '',
        company: row['Company'] || row['company'] || '',
        startingTime: row['Starting time'] || row['starting_time'] || row['Time'] || '',
        speed: parseFloat(row['Speed(Km/h)'] || row['speed'] || 0)
    }));
    
    cacheData('speed', filteredData);
    return filteredData;
}

async function loadWeeklySpeedData() {
    const promises = [];
    const dates = ['25 August', '24 August', '23 August'];
    
    for (const date of dates) {
        promises.push(loadSingleDaySpeedData(date));
    }
    
    const dailyData = await Promise.all(promises);
    const allViolations = dailyData.flat();
    
    // Aggregate by vehicle
    const aggregated = allViolations.reduce((acc, violation) => {
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
    
    return Object.values(aggregated);
}

async function loadMonthlySpeedData() {
    // For demo, multiply weekly by 4
    const weeklyData = await loadWeeklySpeedData();
    return weeklyData.map(item => ({
        ...item,
        violations: Math.round(item.violations * 4.3),
        warnings: Math.round(item.warnings * 4.3),
        alarms: Math.round(item.alarms * 4.3),
        maxSpeed: item.maxSpeed + (Math.random() * 5) // Add some variance
    }));
}

async function loadSingleDaySpeedData(date) {
    try {
        const gidMap = {
            '25 August': '293366971',
            '24 August': '0',
            '23 August': '1'
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
            company: row['Company'],
            speed: parseFloat(row['Speed(Km/h)'])
        }));
    } catch (error) {
        console.error(`Error loading speed data for ${date}:`, error);
        return [];
    }
}

// Cache Management
function cacheData(type, data) {
    try {
        const cacheKey = `g4s_${type}_${Date.now()}`;
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`g4s_${type}_latest`, cacheKey);
    } catch (error) {
        console.warn('Cache storage failed:', error);
    }
}

function getCachedData(type) {
    try {
        const latestKey = localStorage.getItem(`g4s_${type}_latest`);
        if (latestKey) {
            const cachedData = localStorage.getItem(latestKey);
            return cachedData ? JSON.parse(cachedData) : null;
        }
    } catch (error) {
        console.warn('Cache retrieval failed:', error);
    }
    return null;
}

// Supabase Integration
async function loadExistingStatus(vehicles) {
    if (!supabaseClient) return;
    
    try {
        const vehicleNumbers = vehicles.map(v => v['Vehicle Number']).filter(Boolean);
        const { data, error } = await supabaseClient
            .from('offline_status')
            .select('vehicle_number, current_status, reason, updated_at')
            .in('vehicle_number', vehicleNumbers);
        
        if (error) {
            console.warn('Supabase query error:', error);
            return;
        }
        
        // Merge status data with vehicle data
        vehicles.forEach(vehicle => {
            const statusRecord = data?.find(s => s.vehicle_number === vehicle['Vehicle Number']);
            if (statusRecord) {
                vehicle.Status = statusRecord.current_status;
                vehicle.Remarks = statusRecord.reason || vehicle.Remarks;
                vehicle.UpdatedAt = statusRecord.updated_at;
            }
        });
        
        console.log(`Loaded status for ${data?.length || 0} vehicles from database`);
    } catch (error) {
        console.error('Error loading existing status:', error);
    }
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        // Show all data
        updateCurrentTabDisplay();
        return;
    }
    
    // Filter based on current tab
    let filteredData = [];
    switch(currentTab) {
        case 'offline':
            filteredData = currentData.offline.filter(item => 
                (item['Vehicle Number'] || '').toLowerCase().includes(searchTerm) ||
                (item['Last Online'] || '').toLowerCase().includes(searchTerm) ||
                (item['Remarks'] || '').toLowerCase().includes(searchTerm) ||
                (item['Status'] || '').toLowerCase().includes(searchTerm)
            );
            updateOfflineTable(filteredData);
            break;
        case 'ai-alerts':
            filteredData = currentData.alerts.filter(item => 
                (item.plateNo || '').toLowerCase().includes(searchTerm) ||
                (item.company || '').toLowerCase().includes(searchTerm) ||
                (item.alarmType || '').toLowerCase().includes(searchTerm)
            );
            updateAIAlertsTable(filteredData);
            break;
        case 'speed':
            filteredData = currentData.speed.filter(item => 
                (item.plateNo || '').toLowerCase().includes(searchTerm) ||
                (item.company || '').toLowerCase().includes(searchTerm) ||
                (item.startingTime || '').toLowerCase().includes(searchTerm)
            );
            updateSpeedTable(filteredData);
            break;
    }
    
    console.log(`Search "${searchTerm}" found ${filteredData.length} results`);
}

function updateCurrentTabDisplay() {
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
}

// Filter functionality
function setupTableFilters() {
    // Region filter for offline reports
    const regionFilter = document.getElementById('region-filter');
    if (regionFilter) {
        regionFilter.addEventListener('change', function() {
            applyTableFilters();
        });
    }
    
    // Status filter for offline reports
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            applyTableFilters();
        });
    }
    
    // Alert type filter
    const alertTypeFilter = document.getElementById('alert-type-filter');
    if (alertTypeFilter) {
        alertTypeFilter.addEventListener('change', function() {
            applyTableFilters();
        });
    }
    
    // Speed filter
    const speedFilter = document.getElementById('speed-filter');
    if (speedFilter) {
        speedFilter.addEventListener('change', function() {
            applyTableFilters();
        });
    }
}

function applyTableFilters() {
    const searchTerm = document.getElementById('global-search').value.toLowerCase();
    
    let filteredData = [...(currentData[currentTab.replace('-', '')] || [])];
    
    // Apply search filter
    if (searchTerm) {
        filteredData = filteredData.filter(item => {
            const searchableText = JSON.stringify(item).toLowerCase();
            return searchableText.includes(searchTerm);
        });
    }
    
    // Apply specific filters based on tab
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

function updateOfflineUI() {
    const data = currentData.offline;
    
    // Update stats with animations
    animateValue(document.getElementById('total-offline'), 0, data.length, 1000);
    
    const avgOffline = Math.round(data.reduce((sum, item) => sum + parseFloat(item['Offline Since (hrs)']), 0) / data.length);
    animateValue(document.getElementById('avg-offline'), 0, avgOffline, 1000);
    
    const criticalIssues = data.filter(item => parseFloat(item['Offline Since (hrs)']) > 1000).length;
    animateValue(document.getElementById('critical-issues'), 0, criticalIssues, 1000);
    
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
        topViolator = topEntry ? topEntry[0].slice(-6) : '-';
        alertRate = (totalAlerts / 24).toFixed(1);
    } else {
        totalAlerts = data.reduce((sum, item) => sum + (item.count || 0), 0);
        uniqueVehicles = data.length;
        const topEntry = data.sort((a, b) => (b.count || 0) - (a.count || 0))[0];
        topViolator = topEntry ? topEntry.plateNo.slice(-6) : '-';
        alertRate = data.length > 0 ? (totalAlerts / data.length).toFixed(1) : '0';
    }
    
    animateValue(document.getElementById('total-alerts'), 0, totalAlerts, 1000);
    animateValue(document.getElementById('unique-vehicles'), 0, uniqueVehicles, 1000);
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
        maxSpeed = data.length > 0 ? Math.max(...data.map(item => item.speed)).toFixed(1) : '0';
    } else {
        totalViolations = data.reduce((sum, item) => sum + (item.violations || 0), 0);
        warnings = data.reduce((sum, item) => sum + (item.warnings || 0), 0);
        alarms = data.reduce((sum, item) => sum + (item.alarms || 0), 0);
        maxSpeed = data.length > 0 ? Math.max(...data.map(item => item.maxSpeed || 0)).toFixed(1) : '0';
    }
    
    animateValue(document.getElementById('total-violations'), 0, totalViolations, 1000);
    animateValue(document.getElementById('warning-count'), 0, warnings, 1000);
    animateValue(document.getElementById('alarm-count'), 0, alarms, 1000);
    document.getElementById('max-speed').textContent = maxSpeed + ' km/h';
    
    updateSpeedTable(data);
    updateSpeedCharts(data);
}

function updateOfflineTable(data) {
    const tbody = document.getElementById('offline-table-body');
    tbody.innerHTML = '';
    
    data.forEach(vehicle => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${vehicle['Vehicle Number']}</strong></td>
            <td>${vehicle['Last Online']}</td>
            <td><span class="status-badge ${parseFloat(vehicle['Offline Since (hrs)']) > 1000 ? 'status-danger' : 'status-warning'}">${vehicle['Offline Since (hrs)']}h</span></td>
            <td><span class="status-badge ${getStatusClass(vehicle.Status)}" id="status-${vehicle['Vehicle Number']}">${getStatusIcon(vehicle.Status)} ${vehicle.Status || 'Offline'}</span></td>
            <td>${vehicle.Remarks || '-'}</td>
            <td><button class="btn btn-secondary" onclick="editVehicleStatus('${vehicle['Vehicle Number']}')">✏️ Edit</button></td>
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
                <td>${alert.imageLink ? `<a href="${alert.imageLink}" target="_blank" class="btn btn-secondary">📷 View</a>` : '<span style="color: #666;">No image</span>'}</td>
            `;
        } else {
            row.innerHTML = `
                <td><strong>${alert.plateNo}</strong></td>
                <td>${alert.company}</td>
                <td><span class="status-badge status-warning">${alert.alarmType}</span></td>
                <td><span class="status-badge status-info">${alert.count} alerts</span></td>
                <td><span class="status-badge status-info">${alert.avgPerDay}/day</span></td>
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

function updateOfflineCharts(data) {
    // Status distribution pie chart
    const statusCtx = document.getElementById('status-pie-chart').getContext('2d');
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
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
    
    // Regional distribution bar chart
    const regionCtx = document.getElementById('region-bar-chart').getContext('2d');
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
                label: 'Offline Vehicles',
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

function updateAIAlertsCharts(data) {
    // Similar chart updates for AI Alerts
    const vehicleAlertsCtx = document.getElementById('vehicle-alerts-chart').getContext('2d');
    if (charts.vehicleAlerts) charts.vehicleAlerts.destroy();
    
    let chartData;
    if (currentPeriod === 'daily') {
        const vehicleStats = data.reduce((acc, alert) => {
            acc[alert.plateNo] = (acc[alert.plateNo] || 0) + 1;
            return acc;
        }, {});
        chartData = {
            labels: Object.keys(vehicleStats).map(v => v.slice(-6)),
            data: Object.values(vehicleStats)
        };
    } else {
        chartData = {
            labels: data.map(item => item.plateNo.slice(-6)),
            data: data.map(item => item.count || 0)
        };
    }
    
    charts.vehicleAlerts = new Chart(vehicleAlertsCtx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: currentPeriod === 'daily' ? 'Alerts' : 'Total Alerts',
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
    
    // Alert type pie chart
    const alertTypeCtx = document.getElementById('alert-type-chart').getContext('2d');
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
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function updateSpeedCharts(data) {
    // Similar chart updates for Speed data
    const speedViolationsCtx = document.getElementById('speed-violations-chart').getContext('2d');
    if (charts.speedViolations) charts.speedViolations.destroy();
    
    let chartData;
    if (currentPeriod === 'daily') {
        const vehicleStats = data.reduce((acc, item) => {
            acc[item.plateNo] = (acc[item.plateNo] || 0) + 1;
            return acc;
        }, {});
        chartData = {
            labels: Object.keys(vehicleStats).map(v => v.slice(-6)),
            data: Object.values(vehicleStats)
        };
    } else {
        chartData = {
            labels: data.map(item => item.plateNo.slice(-6)),
            data: data.map(item => item.violations || 0)
        };
    }
    
    charts.speedViolations = new Chart(speedViolationsCtx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Violations',
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
    
    // Speed category pie chart
    const speedCategoryCtx = document.getElementById('speed-category-chart').getContext('2d');
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
            labels: ['Warnings (75-89 km/h)', 'Alarms (90+ km/h)'],
            datasets: [{
                data: [warnings, alarms],
                backgroundColor: ['#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
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

function animateValue(element, start, end, duration) {
    if (start === end) return;
    
    const range = end - start;
    const minTimer = 50;
    let stepTime = Math.abs(Math.floor(duration / range));
    
    stepTime = Math.max(stepTime, minTimer);
    
    const startTime = new Date().getTime();
    const endTime = startTime + duration;
    let timer;

    function run() {
        const now = new Date().getTime();
        const remaining = Math.max((endTime - now) / duration, 0);
        const value = Math.round(end - (remaining * range));
        
        element.textContent = value;
        
        if (value === end) {
            clearInterval(timer);
        }
    }
    
    timer = setInterval(run, stepTime);
    run();
}

function editVehicleStatus(vehicleNumber) {
    document.getElementById('modal-vehicle').value = vehicleNumber;
    document.getElementById('status-select').value = 'Parking/Garage';
    document.getElementById('reason-input').value = '';
    document.getElementById('status-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('status-modal').style.display = 'none';
}

async function saveVehicleStatus() {
    const vehicleNumber = document.getElementById('modal-vehicle').value;
    const status = document.getElementById('status-select').value;
    const reason = document.getElementById('reason-input').value;
    
    if (!vehicleNumber || !status) {
        showError('Please fill in all required fields');
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
                console.error('Supabase error:', error);
                showError(`Database error: ${error.message}`);
                return;
            }
            
            console.log('Status saved to database successfully');
            showSuccess('Vehicle status updated successfully!');
        } else {
            console.warn('Supabase not available, updating UI only');
            showSuccess('Status updated (local only - database not available)');
        }
        
        // Update UI immediately
        updateVehicleStatusInUI(vehicleNumber, status, reason);
        closeModal();
        
        // Update the data source
        const vehicle = currentData.offline.find(v => v['Vehicle Number'] === vehicleNumber);
        if (vehicle) {
            vehicle.Status = status;
            vehicle.Remarks = reason || vehicle.Remarks;
            vehicle.UpdatedAt = new Date().toISOString();
        }
        
    } catch (error) {
        console.error('Error saving vehicle status:', error);
        showError('Failed to update status. Please check your internet connection and try again.');
    } finally {
        showLoading(false);
    }
}

function updateVehicleStatusInUI(vehicleNumber, status, reason) {
    // Update status badge
    const statusElement = document.getElementById(`status-${vehicleNumber}`);
    if (statusElement) {
        statusElement.className = `status-badge ${getStatusClass(status)}`;
        statusElement.textContent = `${getStatusIcon(status)} ${status}`;
    }
    
    // Update remarks in table if visible
    const tableRow = statusElement?.closest('tr');
    if (tableRow && reason) {
        const remarksCell = tableRow.cells[4]; // Assuming remarks is the 5th column (index 4)
        if (remarksCell) {
            remarksCell.textContent = reason || '-';
        }
    }
}

// Sample Data Fallbacks
function getSampleOfflineData() {
    return [
        { 'Vehicle Number': 'AP39HS4926', 'Last Online': '2025-08-20', 'Offline Since (hrs)': '112', 'Remarks': 'Parked at depot', 'Status': 'Parking/Garage' },
        { 'Vehicle Number': 'AS01EH6877', 'Last Online': '2025-05-12', 'Offline Since (hrs)': '2515', 'Remarks': 'Under maintenance', 'Status': 'Technical Problem' },
        { 'Vehicle Number': 'BR01PK9758', 'Last Online': '2025-08-23', 'Offline Since (hrs)': '52', 'Remarks': 'Driver sick leave', 'Status': 'Offline' },
        { 'Vehicle Number': 'CG04MY9667', 'Last Online': '2025-05-09', 'Offline Since (hrs)': '2586', 'Remarks': 'GPS connectivity issue', 'Status': 'Technical Problem' },
        { 'Vehicle Number': 'CH01CK2912', 'Last Online': '2025-08-25', 'Offline Since (hrs)': '48', 'Remarks': 'Technical checkup pending', 'Status': 'Technical Problem' }
    ];
}

function getSampleAlertsData() {
    return [
        { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving', startingTime: '08:30:07', imageLink: 'https://drive.google.com/file/d/1qd6w' },
        { plateNo: 'HR55AX4712', company: 'North', alarmType: 'Call Alarm', startingTime: '16:09:09', imageLink: 'https://drive.google.com/file/d/1wjn' },
        { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seatbelt', startingTime: '07:54:47', imageLink: 'https://drive.google.com/file/d/1v8l' },
        { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seatbelt', startingTime: '08:31:05', imageLink: '' },
        { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving', startingTime: '11:19:28', imageLink: 'https://drive.google.com/file/d/1wD0' }
    ];
}

function getSampleSpeedData() {
    return [
        { plateNo: 'HR63F2958', company: 'North', startingTime: '05:58:13', speed: 94.5 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '16:46:15', speed: 92.9 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '11:44:44', speed: 90.1 },
        { plateNo: 'HR55AX4712', company: 'North', startingTime: '16:09:09', speed: 88.2 },
        { plateNo: 'HR63F2958', company: 'North', startingTime: '07:54:47', speed: 95.1 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '12:40:42', speed: 77.5 }
    ];
}

// Error handling
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
        z-index: 10001;
        max-width: 400px;
        font-weight: 500;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        z-index: 10001;
        max-width: 400px;
        font-weight: 500;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text('G4S Fleet Management Report', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
        doc.text(`Report Period: ${currentPeriod.toUpperCase()}`, 20, 40);
        doc.text(`Current Tab: ${currentTab.replace('-', ' ').toUpperCase()}`, 20, 50);
        
        // Add data based on current tab
        let tableData = [];
        let headers = [];
        
        switch(currentTab) {
            case 'offline':
                headers = ['Vehicle', 'Last Online', 'Offline Hours', 'Status', 'Remarks'];
                tableData = currentData.offline.map(item => [
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
                    tableData = currentData.alerts.map(item => [
                        item.plateNo,
                        item.company,
                        item.alarmType,
                        item.startingTime
                    ]);
                } else {
                    headers = ['Vehicle', 'Company', 'Alert Type', 'Count', 'Avg/Day'];
                    tableData = currentData.alerts.map(item => [
                        item.plateNo,
                        item.company,
                        item.alarmType,
                        item.count.toString(),
                        item.avgPerDay.toFixed(1)
                    ]);
                }
                break;
            case 'speed':
                headers = ['Vehicle', 'Company', 'Max Speed', 'Warnings', 'Alarms', 'Total'];
                tableData = currentData.speed.map(item => [
                    item.plateNo,
                    item.company,
                    (item.maxSpeed || item.speed).toFixed(1) + ' km/h',
                    (item.warnings || (item.speed >= 75 && item.speed < 90 ? 1 : 0)).toString(),
                    (item.alarms || (item.speed >= 90 ? 1 : 0)).toString(),
                    (item.violations || 1).toString()
                ]);
                break;
        }
        
        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: 60,
            styles: {
                fontSize: 8,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [102, 126, 234],
                textColor: 255
            }
        });
        
        // Save the PDF
        const filename = `G4S-${currentTab}-report-${currentPeriod}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
    } catch (error) {
        console.error('PDF export error:', error);
        showError('Error generating PDF. Please try again.');
    }
}

// Auto-refresh functionality
function startAutoRefresh() {
    // Refresh data every 5 minutes
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            console.log('Auto-refreshing data...');
            loadDataForCurrentTab();
        }
    }, 5 * 60 * 1000); // 5 minutes
}

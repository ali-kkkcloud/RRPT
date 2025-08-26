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
let currentData = {
    offline: [],
    speed: [],
    alerts: []
};
let aggregatedData = {
    weekly: { speed: [], alerts: [] },
    monthly: { speed: [], alerts: [] }
};
let charts = {};
let currentReportType = 'daily';

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeSupabase();
    setupEventListeners();
    updateLastUpdated();
    loadAllData();
});

// Initialize Supabase
function initializeSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase not loaded');
        return;
    }
    supabaseClient = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);
}

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Report type selector
    document.getElementById('report-type').addEventListener('change', function() {
        handleReportTypeChange(this.value);
    });

    // Date selectors
    document.getElementById('date-select').addEventListener('change', function() {
        if (currentReportType === 'daily') {
            loadDateBasedData(this.value);
        }
    });

    document.getElementById('week-select').addEventListener('change', function() {
        if (currentReportType === 'weekly') {
            loadWeeklyData(this.value);
        }
    });

    document.getElementById('month-select').addEventListener('change', function() {
        if (currentReportType === 'monthly') {
            loadMonthlyData(this.value);
        }
    });

    // Refresh and export buttons
    document.getElementById('refresh-btn').addEventListener('click', loadAllData);
    document.getElementById('export-btn').addEventListener('click', exportData);

    // Modal events
    setupModalEvents();
}

// Handle report type change
function handleReportTypeChange(reportType) {
    currentReportType = reportType;
    
    // Hide all selectors
    document.getElementById('daily-selector').style.display = 'none';
    document.getElementById('weekly-selector').style.display = 'none';
    document.getElementById('monthly-selector').style.display = 'none';
    
    // Show relevant selector
    document.getElementById(`${reportType}-selector`).style.display = 'flex';
    
    // Load appropriate data
    switch(reportType) {
        case 'daily':
            loadDateBasedData(document.getElementById('date-select').value);
            break;
        case 'weekly':
            loadWeeklyData(document.getElementById('week-select').value);
            break;
        case 'monthly':
            loadMonthlyData(document.getElementById('month-select').value);
            break;
    }
}

// Setup modal events
function setupModalEvents() {
    const modal = document.getElementById('status-modal');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-status');
    const saveBtn = document.getElementById('save-status');

    closeBtn.addEventListener('click', () => closeModal());
    cancelBtn.addEventListener('click', () => closeModal());
    saveBtn.addEventListener('click', () => saveVehicleStatus());

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
}

// Update last updated time
function updateLastUpdated() {
    document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
}

// Show/hide loading
function showLoading(show = true) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

// Load all data based on current report type
async function loadAllData() {
    showLoading(true);
    updateLastUpdated();
    
    try {
        await loadOfflineData();
        
        switch(currentReportType) {
            case 'daily':
                await loadDateBasedData(document.getElementById('date-select').value);
                break;
            case 'weekly':
                await loadWeeklyData(document.getElementById('week-select').value);
                break;
            case 'monthly':
                await loadMonthlyData(document.getElementById('month-select').value);
                break;
        }
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Please check your internet connection and try again.');
    } finally {
        showLoading(false);
    }
}

// Load offline reports data
async function loadOfflineData() {
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.offline}/export?format=csv&gid=0`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`;
        const response = await fetch(proxyUrl);
        const responseData = await response.json();
        const csvText = responseData.contents;
        
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        // Filter G4S vehicles offline >= 24 hours
        currentData.offline = parsed.data.filter(row => {
            const client = row.client?.toLowerCase() || '';
            const offlineHours = parseFloat(row['Offline Since (hrs)']) || 0;
            return client.includes('g4s') && offlineHours >= 24;
        });

        updateOfflineUI();
        
    } catch (error) {
        console.error('Error loading offline data:', error);
        // Use sample data for demo
        currentData.offline = generateSampleOfflineData();
        updateOfflineUI();
    }
}

// Generate sample offline data
function generateSampleOfflineData() {
    return [
        { 'Vehicle Number': 'AP39HS4926', 'Last Online': '2025-08-20', 'Offline Since (hrs)': '112', 'Remarks': 'Parked at depot' },
        { 'Vehicle Number': 'AS01EH6877', 'Last Online': '2025-05-12', 'Offline Since (hrs)': '2515', 'Remarks': 'Under maintenance' },
        { 'Vehicle Number': 'BR01PK9758', 'Last Online': '2025-08-23', 'Offline Since (hrs)': '52', 'Remarks': 'Driver sick leave' },
        { 'Vehicle Number': 'CG04MY9667', 'Last Online': '2025-05-09', 'Offline Since (hrs)': '2586', 'Remarks': 'Same device wants to install in new vehicle' },
        { 'Vehicle Number': 'CH01CK2912', 'Last Online': '2025-08-25', 'Offline Since (hrs)': '0', 'Remarks': '' }
    ];
}

// Load date-based data (Daily reports)
async function loadDateBasedData(selectedDate) {
    try {
        await Promise.all([
            loadSpeedData(selectedDate),
            loadAIAlertsData(selectedDate)
        ]);
    } catch (error) {
        console.error('Error loading date-based data:', error);
    }
}

// Load weekly aggregated data
async function loadWeeklyData(weekRange) {
    try {
        // Load multiple days of data and aggregate
        const dates = getWeekDates(weekRange);
        let allSpeedData = [];
        let allAlertsData = [];
        
        for (const date of dates) {
            const speedData = await loadSpeedDataSilent(date);
            const alertsData = await loadAIAlertsDataSilent(date);
            allSpeedData = allSpeedData.concat(speedData);
            allAlertsData = allAlertsData.concat(alertsData);
        }
        
        aggregatedData.weekly.speed = allSpeedData;
        aggregatedData.weekly.alerts = allAlertsData;
        
        currentData.speed = allSpeedData;
        currentData.alerts = allAlertsData;
        
        updateSpeedUI();
        updateAIAlertsUI();
        
    } catch (error) {
        console.error('Error loading weekly data:', error);
        // Use sample data
        currentData.speed = generateSampleSpeedData();
        currentData.alerts = generateSampleAlertsData();
        updateSpeedUI();
        updateAIAlertsUI();
    }
}

// Load monthly aggregated data
async function loadMonthlyData(month) {
    try {
        // Generate sample monthly data for demo
        currentData.speed = generateSampleSpeedData(30);
        currentData.alerts = generateSampleAlertsData(30);
        
        updateSpeedUI();
        updateAIAlertsUI();
        
    } catch (error) {
        console.error('Error loading monthly data:', error);
    }
}

// Get week dates from range
function getWeekDates(weekRange) {
    // Simple implementation - return sample dates
    return ['25 August', '24 August', '23 August', '22 August', '21 August', '20 August', '19 August'];
}

// Load speed data
async function loadSpeedData(date) {
    try {
        const speedData = await loadSpeedDataSilent(date);
        currentData.speed = speedData;
        updateSpeedUI();
    } catch (error) {
        console.error('Error loading speed data:', error);
        currentData.speed = generateSampleSpeedData();
        updateSpeedUI();
    }
}

// Load speed data without UI update (for aggregation)
async function loadSpeedDataSilent(date) {
    try {
        const gidMap = {
            '25 August': '293366971',
            '24 August': '0',
            '23 August': '1',
            '22 August': '2',
            '21 August': '3'
        };
        
        const gid = gidMap[date] || '293366971';
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.speed}/export?format=csv&gid=${gid}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`;
        
        const response = await fetch(proxyUrl);
        const responseData = await response.json();
        const csvText = responseData.contents;
        
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        return parsed.data.filter(row => {
            const speed = parseFloat(row['Speed(Km/h)']) || 0;
            return speed >= 75;
        }).map(row => ({
            plateNo: row['Plate NO.'] || '',
            company: row['Company'] || '',
            startingTime: row['Starting time'] || '',
            speed: parseFloat(row['Speed(Km/h)']) || 0
        }));
        
    } catch (error) {
        console.error('Error loading speed data for date:', date);
        return generateSampleSpeedData();
    }
}

// Generate sample speed data
function generateSampleSpeedData(multiplier = 1) {
    const baseData = [
        { plateNo: 'HR63F2958', company: 'North', startingTime: '05:58:13', speed: 94.5 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '16:46:15', speed: 92.9 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '11:44:44', speed: 90.1 },
        { plateNo: 'HR55AX4712', company: 'North', startingTime: '16:09:09', speed: 88.2 },
        { plateNo: 'HR63F2958', company: 'North', startingTime: '07:54:47', speed: 95.1 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '12:40:42', speed: 77.5 },
        { plateNo: 'HR47G5244', company: 'North', startingTime: '08:30:07', speed: 82.3 }
    ];
    
    let result = [...baseData];
    for (let i = 1; i < multiplier; i++) {
        result = result.concat(baseData.map(item => ({
            ...item,
            speed: item.speed + (Math.random() * 10 - 5)
        })));
    }
    
    return result;
}

// Load AI alerts data
async function loadAIAlertsData(date) {
    try {
        const alertsData = await loadAIAlertsDataSilent(date);
        currentData.alerts = alertsData;
        updateAIAlertsUI();
    } catch (error) {
        console.error('Error loading AI alerts data:', error);
        currentData.alerts = generateSampleAlertsData();
        updateAIAlertsUI();
    }
}

// Load AI alerts data without UI update (for aggregation)
async function loadAIAlertsDataSilent(date) {
    try {
        const gidMap = {
            '25 August': '1378822335',
            '24 August': '0',
            '23 August': '1',
            '22 August': '2',
            '21 August': '3'
        };
        
        const gid = gidMap[date] || '1378822335';
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheets.alerts}/export?format=csv&gid=${gid}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`;
        
        const response = await fetch(proxyUrl);
        const responseData = await response.json();
        const csvText = responseData.contents;
        
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        return parsed.data.filter(row => {
            return row['Plate NO.'] && row['Alarm Type'];
        }).map(row => ({
            plateNo: row['Plate NO.'] || '',
            company: row['Company'] || '',
            alarmType: row['Alarm Type'] || '',
            startingTime: row['Starting time'] || '',
            imageLink: row['Image Link'] || ''
        }));
        
    } catch (error) {
        console.error('Error loading AI alerts data for date:', date);
        return generateSampleAlertsData();
    }
}

// Generate sample alerts data
function generateSampleAlertsData(multiplier = 1) {
    const baseData = [
        { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving Alarm Level One', startingTime: '08:30:07', imageLink: 'https://drive.google.com/file/d/1qd6w' },
        { plateNo: 'HR55AX4712', company: 'North', alarmType: 'Call Alarm Level One', startingTime: '16:09:09', imageLink: 'https://drive.google.com/file/d/1wjn' },
        { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seat Belt Level One', startingTime: '07:54:47', imageLink: 'https://drive.google.com/file/d/1v8l' },
        { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seat Belt Level One', startingTime: '08:31:05', imageLink: '' },
        { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving Alarm Level One', startingTime: '11:19:28', imageLink: 'https://drive.google.com/file/d/1wD0' }
    ];
    
    let result = [...baseData];
    for (let i = 1; i < multiplier; i++) {
        result = result.concat(baseData);
    }
    
    return result;
}

// Update offline reports UI
function updateOfflineUI() {
    const data = currentData.offline;
    
    // Update summary cards
    document.getElementById('total-offline').textContent = data.length;
    
    // Calculate status distribution
    loadStatusUpdates().then(statusUpdates => {
        const parkingCount = Object.values(statusUpdates).filter(s => s.current_status === 'Parking/Garage').length;
        const technicalCount = Object.values(statusUpdates).filter(s => s.current_status === 'Technical Problem').length;
        const avgOffline = data.length > 0 ? Math.round(data.reduce((sum, item) => sum + parseFloat(item['Offline Since (hrs)']), 0) / data.length) : 0;
        
        document.getElementById('parking-count').textContent = parkingCount;
        document.getElementById('technical-count').textContent = technicalCount;
        document.getElementById('avg-offline').textContent = avgOffline + 'h';
        
        // Update charts with real status data
        updateOfflineCharts(data, statusUpdates);
    });
    
    // Update table
    updateOfflineTable(data);
}

// Update offline table
function updateOfflineTable(data) {
    const tbody = document.querySelector('#offline-table tbody');
    tbody.innerHTML = '';
    
    data.forEach(vehicle => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vehicle['Vehicle Number'] || ''}</td>
            <td>${vehicle['Last Online'] || ''}</td>
            <td><span class="status-badge status-offline">${vehicle['Offline Since (hrs)']}h</span></td>
            <td><span class="status-badge status-offline" id="status-${vehicle['Vehicle Number']}">🔴 Offline</span></td>
            <td>${vehicle['Remarks'] || '-'}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editVehicleStatus('${vehicle['Vehicle Number']}')">
                    ✏️ Edit
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update offline charts
function updateOfflineCharts(data, statusUpdates = {}) {
    // Status distribution pie chart
    const statusCtx = document.getElementById('status-pie-chart').getContext('2d');
    if (charts.statusPie) charts.statusPie.destroy();
    
    const offlineCount = data.length;
    const parkingCount = Object.values(statusUpdates).filter(s => s.current_status === 'Parking/Garage').length;
    const technicalCount = Object.values(statusUpdates).filter(s => s.current_status === 'Technical Problem').length;
    
    charts.statusPie = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: ['Offline', 'Parking/Garage', 'Technical Issue'],
            datasets: [{
                data: [offlineCount - parkingCount - technicalCount, parkingCount, technicalCount],
                backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b']
            }]
        },
        options: {
            responsive: true,
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
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Update speed UI
function updateSpeedUI() {
    const data = currentData.speed;
    
    // Calculate statistics
    const totalViolations = data.length;
    const warnings = data.filter(item => item.speed >= 75 && item.speed < 90).length;
    const alarms = data.filter(item => item.speed >= 90).length;
    const maxSpeed = data.length > 0 ? Math.max(...data.map(item => item.speed)) : 0;
    
    // Update summary cards
    document.getElementById('total-violations').textContent = totalViolations;
    document.getElementById('warning-count').textContent = warnings;
    document.getElementById('alarm-count').textContent = alarms;
    document.getElementById('max-speed').textContent = maxSpeed.toFixed(1) + ' km/h';
    
    // Update table and charts
    updateSpeedTable(data);
    updateSpeedCharts(data);
}

// Update speed table
function updateSpeedTable(data) {
    const tbody = document.querySelector('#speed-table tbody');
    tbody.innerHTML = '';
    
    // Group by vehicle
    const vehicleStats = data.reduce((acc, item) => {
        const vehicle = item.plateNo;
        if (!acc[vehicle]) {
            acc[vehicle] = {
                vehicle,
                company: item.company,
                maxSpeed: 0,
                warnings: 0,
                alarms: 0,
                total: 0
            };
        }
        
        acc[vehicle].maxSpeed = Math.max(acc[vehicle].maxSpeed, item.speed);
        acc[vehicle].total++;
        
        if (item.speed >= 90) acc[vehicle].alarms++;
        else if (item.speed >= 75) acc[vehicle].warnings++;
        
        return acc;
    }, {});
    
    Object.values(vehicleStats)
        .sort((a, b) => b.total - a.total)
        .forEach(vehicle => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${vehicle.vehicle}</td>
                <td>${vehicle.company}</td>
                <td><span class="status-badge ${vehicle.maxSpeed >= 90 ? 'status-offline' : 'status-technical'}">${vehicle.maxSpeed.toFixed(1)} km/h</span></td>
                <td><span class="status-badge status-technical">${vehicle.warnings}</span></td>
                <td><span class="status-badge status-offline">${vehicle.alarms}</span></td>
                <td><span class="status-badge">${vehicle.total}</span></td>
            `;
            tbody.appendChild(row);
        });
}

// Update speed charts
function updateSpeedCharts(data) {
    // Speed violations by vehicle (top 10)
    const vehicleViolationsCtx = document.getElementById('speed-violations-chart').getContext('2d');
    if (charts.speedViolations) charts.speedViolations.destroy();
    
    const vehicleStats = data.reduce((acc, item) => {
        acc[item.plateNo] = (acc[item.plateNo] || 0) + 1;
        return acc;
    }, {});
    
    const topVehicles = Object.entries(vehicleStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    charts.speedViolations = new Chart(vehicleViolationsCtx, {
        type: 'bar',
        data: {
            labels: topVehicles.map(([vehicle]) => vehicle.length > 8 ? vehicle.slice(-6) : vehicle),
            datasets: [{
                label: 'Violations',
                data: topVehicles.map(([, count]) => count),
                backgroundColor: '#ef4444'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
    
    // Speed category distribution
    const speedCategoryCtx = document.getElementById('speed-category-chart').getContext('2d');
    if (charts.speedCategory) charts.speedCategory.destroy();
    
    const warnings = data.filter(item => item.speed >= 75 && item.speed < 90).length;
    const alarms = data.filter(item => item.speed >= 90).length;
    
    charts.speedCategory = new Chart(speedCategoryCtx, {
        type: 'pie',
        data: {
            labels: ['Warnings (75-89 km/h)', 'Alarms (90+ km/h)'],
            datasets: [{
                data: [warnings, alarms],
                backgroundColor: ['#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// Update AI alerts UI
function updateAIAlertsUI() {
    const data = currentData.alerts;
    
    // Calculate statistics
    const totalAlerts = data.length;
    const uniqueVehicles = new Set(data.map(alert => alert.plateNo)).size;
    
    const vehicleAlerts = data.reduce((acc, alert) => {
        acc[alert.plateNo] = (acc[alert.plateNo] || 0) + 1;
        return acc;
    }, {});
    
    const topVehicle = Object.entries(vehicleAlerts)
        .sort((a, b) => b[1] - a[1])[0];
    
    // Update summary cards
    document.getElementById('total-alerts').textContent = totalAlerts;
    document.getElementById('unique-vehicles-alerts').textContent = uniqueVehicles;
    document.getElementById('top-violator').textContent = topVehicle ? (topVehicle[0].length > 8 ? topVehicle[0].slice(-6) : topVehicle[0]) : '-';
    
    // Update table and charts
    updateAIAlertsTable(data);
    updateAIAlertsCharts(data);
}

// Update AI alerts table
function updateAIAlertsTable(data) {
    const tbody = document.querySelector('#alerts-table tbody');
    tbody.innerHTML = '';
    
    data.slice(0, 20).forEach(alert => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${alert.plateNo}</td>
            <td>${alert.company}</td>
            <td><span class="status-badge status-offline">${alert.alarmType}</span></td>
            <td>${alert.startingTime}</td>
            <td>
                ${alert.imageLink ? 
                    `<a href="${alert.imageLink}" target="_blank" class="action-btn edit-btn">📷 View</a>` : 
                    '<span style="color: #666;">No image</span>'
                }
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update AI alerts charts
function updateAIAlertsCharts(data) {
    // Vehicle-wise alerts (top 10)
    const vehicleAlertsCtx = document.getElementById('vehicle-alerts-chart').getContext('2d');
    if (charts.vehicleAlerts) charts.vehicleAlerts.destroy();
    
    const vehicleStats = data.reduce((acc, alert) => {
        acc[alert.plateNo] = (acc[alert.plateNo] || 0) + 1;
        return acc;
    }, {});
    
    const topVehicles = Object.entries(vehicleStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    charts.vehicleAlerts = new Chart(vehicleAlertsCtx, {
        type: 'bar',
        data: {
            labels: topVehicles.map(([vehicle]) => vehicle.length > 8 ? vehicle.slice(-6) : vehicle),
            datasets: [{
                label: 'Alerts',
                data: topVehicles.map(([, count]) => count),
                backgroundColor: '#f59e0b'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
    
    // Alert type distribution
    const alertTypeCtx = document.getElementById('alert-type-chart').getContext('2d');
    if (charts.alertType) charts.alertType.destroy();
    
    const alertTypes = data.reduce((acc, alert) => {
        acc[alert.alarmType] = (acc[alert.alarmType] || 0) + 1;
        return acc;
    }, {});
    
    const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280', '#10b981'];
    
    charts.alertType = new Chart(alertTypeCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(alertTypes),
            datasets: [{
                data: Object.values(alertTypes),
                backgroundColor: colors.slice(0, Object.keys(alertTypes).length)
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { 
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12,
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

// Load status updates from Supabase
async function loadStatusUpdates() {
    try {
        if (!supabaseClient) return {};
        
        const { data, error } = await supabaseClient
            .from('offline_status')
            .select('*');
        
        if (error) {
            console.error('Supabase error:', error);
            return {};
        }
        
        const statusMap = {};
        data?.forEach(status => {
            statusMap[status.vehicle_number] = status;
        });
        
        return statusMap;
    } catch (error) {
        console.error('Error loading status updates:', error);
        return {};
    }
}

// Edit vehicle status
function editVehicleStatus(vehicleNumber) {
    document.getElementById('modal-vehicle').textContent = vehicleNumber;
    document.getElementById('status-select').value = 'Parking/Garage';
    document.getElementById('reason-input').value = '';
    document.getElementById('status-modal').style.display = 'block';
    
    // Store vehicle number for saving
    document.getElementById('status-modal').dataset.vehicle = vehicleNumber;
}

// Save vehicle status
async function saveVehicleStatus() {
    const modal = document.getElementById('status-modal');
    const vehicleNumber = modal.dataset.vehicle;
    const status = document.getElementById('status-select').value;
    const reason = document.getElementById('reason-input').value;
    
    try {
        if (!supabaseClient) {
            alert('Database connection not available. Status updated locally only.');
            updateStatusUI(vehicleNumber, status);
            closeModal();
            return;
        }
        
        const { data, error } = await supabaseClient
            .from('offline_status')
            .upsert({
                vehicle_number: vehicleNumber,
                current_status: status,
                reason: reason,
                updated_at: new Date().toISOString(),
                updated_by: 'Admin'
            });
        
        if (error) {
            console.error('Supabase error:', error);
            alert('Database error. Status updated locally only.');
        }
        
        // Update UI regardless of database success
        updateStatusUI(vehicleNumber, status);
        closeModal();
        
    } catch (error) {
        console.error('Error saving status:', error);
        alert('Error updating status. Please try again.');
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
        statusElement.className = `status-badge status-${status.toLowerCase().replace(/[^a-z]/g, '')}`;
    }
}

// Close modal
function closeModal() {
    document.getElementById('status-modal').style.display = 'none';
}

// Export data based on current report type and tab
function exportData() {
    const currentTab = document.querySelector('.tab-btn.active').dataset.tab;
    const reportType = currentReportType;
    
    let dataToExport = [];
    let filename = '';
    let reportTitle = '';
    
    // Determine data source and filename
    switch (currentTab) {
        case 'offline':
            dataToExport = currentData.offline;
            reportTitle = 'Offline Reports';
            filename = `offline-reports-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'ai-alerts':
            dataToExport = currentData.alerts;
            reportTitle = 'AI Alerts';
            filename = `ai-alerts-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'speed':
            dataToExport = currentData.speed;
            reportTitle = 'Speed Violations';
            filename = `speed-violations-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
            break;
    }
    
    if (dataToExport.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Add report metadata
    const metadata = [
        [`G4S Fleet Management - ${reportTitle}`],
        [`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`],
        [`Generated: ${new Date().toLocaleString()}`],
        [`Total Records: ${dataToExport.length}`],
        [''], // Empty row
    ];
    
    // Convert to CSV with metadata
    const metaCsv = metadata.map(row => row.join(',')).join('\n');
    const dataCsv = Papa.unparse(dataToExport);
    const fullCsv = metaCsv + '\n' + dataCsv;
    
    // Download
    downloadCSV(fullCsv, filename);
}

// Download CSV file
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        // Fallback for older browsers
        window.open('data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    }
}

// Error handling
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global error:', { msg, url, lineNo, columnNo, error });
    return false;
};

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Initialize service worker for PWA functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed:', err);
            });
    });
}

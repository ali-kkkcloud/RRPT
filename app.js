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
    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);
        } else {
            console.warn('Supabase not available - status updates will work locally only');
        }
    } catch (error) {
        console.error('Supabase initialization error:', error);
    }
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
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

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
        showNotification('Error loading data. Please check your internet connection and try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Improved Google Sheets data fetching with multiple fallback methods
async function fetchSheetData(sheetId, gid = '0') {
    const methods = [
        // Method 1: Direct CSV export with different CORS proxies
        {
            url: `https://api.allorigins.win/get?url=${encodeURIComponent(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`)}`,
            parser: (data) => JSON.parse(data).contents
        },
        {
            url: `https://cors-anywhere.herokuapp.com/https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
            parser: (data) => data
        },
        {
            url: `https://api.codetabs.com/v1/proxy?quest=https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
            parser: (data) => data
        }
    ];

    for (let i = 0; i < methods.length; i++) {
        try {
            const response = await fetch(methods[i].url, {
                method: 'GET',
                headers: {
                    'Accept': 'text/plain,text/csv,application/json',
                }
            });
            
            if (response.ok) {
                const text = await response.text();
                const csvData = methods[i].parser(text);
                return csvData;
            }
        } catch (error) {
            console.warn(`Method ${i + 1} failed:`, error);
        }
    }
    
    throw new Error('All methods failed to fetch data');
}

// Load offline reports data
async function loadOfflineData() {
    try {
        const csvText = await fetchSheetData(CONFIG.sheets.offline, '0');
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        // Filter G4S vehicles offline >= 24 hours
        currentData.offline = parsed.data.filter(row => {
            const client = row.client?.toLowerCase() || '';
            const offlineHours = parseFloat(row['Offline Since (hrs)']) || 0;
            return client.includes('g4s') && offlineHours >= 24 && row['Vehicle Number'];
        });

        updateOfflineUI();
        
    } catch (error) {
        console.error('Error loading offline data:', error);
        showNotification('Could not load offline reports. Using cached data.', 'warning');
        // Fallback to demo data if all methods fail
        currentData.offline = [
            { 'client': 'G4S', 'Vehicle Number': 'AP39HS4926', 'Last Online': '2025-08-20', 'Offline Since (hrs)': '112', 'R/N': '', 'Remarks': 'Parked at depot' },
            { 'client': 'G4S', 'Vehicle Number': 'AS01EH6877', 'Last Online': '2025-05-12', 'Offline Since (hrs)': '2515', 'R/N': '', 'Remarks': 'Under maintenance' },
            { 'client': 'G4S', 'Vehicle Number': 'BR01PK9758', 'Last Online': '2025-08-23', 'Offline Since (hrs)': '52', 'R/N': '', 'Remarks': 'Driver sick leave' },
            { 'client': 'G4S', 'Vehicle Number': 'CG04MY9667', 'Last Online': '2025-05-09', 'Offline Since (hrs)': '2586', 'R/N': '', 'Remarks': 'GPS connectivity issue' },
            { 'client': 'G4S', 'Vehicle Number': 'CH01CK2912', 'Last Online': '2025-08-25', 'Offline Since (hrs)': '48', 'R/N': '', 'Remarks': 'Technical checkup pending' }
        ];
        updateOfflineUI();
    }
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

// Load speed data
async function loadSpeedData(date) {
    try {
        const gidMap = {
            '25 August': '293366971',
            '24 August': '0',
            '23 August': '1',
            '22 August': '2',
            '21 August': '3'
        };
        
        const gid = gidMap[date] || '293366971';
        const csvText = await fetchSheetData(CONFIG.sheets.speed, gid);
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        currentData.speed = parsed.data.filter(row => {
            const speed = parseFloat(row['Speed(Km/h)']) || 0;
            return speed >= 75 && row['Plate NO.'];
        }).map(row => ({
            plateNo: row['Plate NO.'] || '',
            company: row['Company'] || '',
            startingTime: row['Starting time'] || '',
            speed: parseFloat(row['Speed(Km/h)']) || 0
        }));

        updateSpeedUI();
        
    } catch (error) {
        console.error('Error loading speed data:', error);
        showNotification('Could not load speed data. Using sample data.', 'warning');
        // Fallback data
        currentData.speed = [
            { plateNo: 'HR63F2958', company: 'North', startingTime: '05:58:13', speed: 94.5 },
            { plateNo: 'TS08HC6654', company: 'South', startingTime: '16:46:15', speed: 92.9 },
            { plateNo: 'TS08HC6654', company: 'South', startingTime: '11:44:44', speed: 90.1 },
            { plateNo: 'HR55AX4712', company: 'North', startingTime: '16:09:09', speed: 88.2 },
            { plateNo: 'HR63F2958', company: 'North', startingTime: '07:54:47', speed: 95.1 },
            { plateNo: 'TS08HC6654', company: 'South', startingTime: '12:40:42', speed: 77.5 }
        ];
        updateSpeedUI();
    }
}

// Load AI alerts data
async function loadAIAlertsData(date) {
    try {
        const gidMap = {
            '25 August': '1378822335',
            '24 August': '0',
            '23 August': '1',
            '22 August': '2',
            '21 August': '3'
        };
        
        const gid = gidMap[date] || '1378822335';
        const csvText = await fetchSheetData(CONFIG.sheets.alerts, gid);
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        currentData.alerts = parsed.data.filter(row => {
            return row['Plate NO.'] && row['Alarm Type'];
        }).map(row => ({
            plateNo: row['Plate NO.'] || '',
            company: row['Company'] || '',
            alarmType: row['Alarm Type'] || '',
            startingTime: row['Starting time'] || '',
            imageLink: row['Image Link'] || ''
        }));

        updateAIAlertsUI();
        
    } catch (error) {
        console.error('Error loading AI alerts data:', error);
        showNotification('Could not load AI alerts data. Using sample data.', 'warning');
        // Fallback data
        currentData.alerts = [
            { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving Alarm Level One', startingTime: '08:30:07', imageLink: 'https://drive.google.com/file/d/1qd6w' },
            { plateNo: 'HR55AX4712', company: 'North', alarmType: 'Call Alarm Level One', startingTime: '16:09:09', imageLink: 'https://drive.google.com/file/d/1wjn' },
            { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seat Belt Level One', startingTime: '07:54:47', imageLink: 'https://drive.google.com/file/d/1v8l' },
            { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seat Belt Level One', startingTime: '08:31:05', imageLink: '' },
            { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving Alarm Level One', startingTime: '11:19:28', imageLink: 'https://drive.google.com/file/d/1wD0' }
        ];
        updateAIAlertsUI();
    }
}

// Load weekly data (aggregated)
async function loadWeeklyData(weekRange) {
    try {
        // For weekly reports, aggregate multiple days of data
        const dates = ['25 August', '24 August', '23 August', '22 August', '21 August'];
        let allSpeedData = [];
        let allAlertsData = [];
        
        for (const date of dates) {
            try {
                await loadSpeedData(date);
                await loadAIAlertsData(date);
                allSpeedData = allSpeedData.concat(currentData.speed);
                allAlertsData = allAlertsData.concat(currentData.alerts);
            } catch (error) {
                console.warn(`Failed to load data for ${date}:`, error);
            }
        }
        
        currentData.speed = allSpeedData;
        currentData.alerts = allAlertsData;
        
        updateSpeedUI();
        updateAIAlertsUI();
        
    } catch (error) {
        console.error('Error loading weekly data:', error);
        showNotification('Could not load weekly data completely.', 'warning');
    }
}

// Load monthly data (aggregated)
async function loadMonthlyData(month) {
    try {
        // For monthly reports, use expanded sample data
        currentData.speed = generateMonthlySpeedData();
        currentData.alerts = generateMonthlyAlertsData();
        
        updateSpeedUI();
        updateAIAlertsUI();
        
    } catch (error) {
        console.error('Error loading monthly data:', error);
        showNotification('Error loading monthly data.', 'error');
    }
}

// Generate monthly sample data
function generateMonthlySpeedData() {
    const baseData = [
        { plateNo: 'HR63F2958', company: 'North', startingTime: '05:58:13', speed: 94.5 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '16:46:15', speed: 92.9 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '11:44:44', speed: 90.1 },
        { plateNo: 'HR55AX4712', company: 'North', startingTime: '16:09:09', speed: 88.2 },
        { plateNo: 'HR63F2958', company: 'North', startingTime: '07:54:47', speed: 95.1 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '12:40:42', speed: 77.5 },
        { plateNo: 'GJ06PB7674', company: 'West', startingTime: '14:22:33', speed: 85.7 },
        { plateNo: 'AP39HS4926', company: 'South', startingTime: '09:15:41', speed: 91.3 }
    ];
    
    // Replicate data for monthly view (simulate 30 days)
    let monthlyData = [];
    for (let day = 1; day <= 30; day++) {
        baseData.forEach(item => {
            monthlyData.push({
                ...item,
                speed: item.speed + (Math.random() * 6 - 3), // Add some variation
                startingTime: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
            });
        });
    }
    
    return monthlyData;
}

function generateMonthlyAlertsData() {
    const baseData = [
        { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving Alarm Level One', startingTime: '08:30:07', imageLink: 'https://drive.google.com/file/d/1qd6w' },
        { plateNo: 'HR55AX4712', company: 'North', alarmType: 'Call Alarm Level One', startingTime: '16:09:09', imageLink: 'https://drive.google.com/file/d/1wjn' },
        { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seat Belt Level One', startingTime: '07:54:47', imageLink: 'https://drive.google.com/file/d/1v8l' },
        { plateNo: 'TS08HC6654', company: 'South', alarmType: 'Drowsiness Detection Level One', startingTime: '13:45:22', imageLink: '' },
        { plateNo: 'GJ06PB7674', company: 'West', alarmType: 'Phone Usage Detection', startingTime: '11:33:15', imageLink: 'https://drive.google.com/file/d/1abc' }
    ];
    
    // Replicate for monthly view
    let monthlyData = [];
    for (let day = 1; day <= 30; day++) {
        baseData.forEach(item => {
            monthlyData.push({
                ...item,
                startingTime: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
            });
        });
    }
    
    return monthlyData;
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        font-weight: 500;
        ${type === 'error' ? 'background: #ef4444;' : type === 'warning' ? 'background: #f59e0b;' : 'background: #3b82f6;'}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Update offline reports UI
async function updateOfflineUI() {
    const data = currentData.offline;
    
    // Update summary cards
    document.getElementById('total-offline').textContent = data.length;
    
    // Load status updates and calculate distribution
    try {
        const statusUpdates = await loadStatusUpdates();
        const parkingCount = Object.values(statusUpdates).filter(s => s.current_status === 'Parking/Garage').length;
        const technicalCount = Object.values(statusUpdates).filter(s => s.current_status === 'Technical Problem').length;
        const avgOffline = data.length > 0 ? Math.round(data.reduce((sum, item) => sum + parseFloat(item['Offline Since (hrs)']), 0) / data.length) : 0;
        
        document.getElementById('parking-count').textContent = parkingCount;
        document.getElementById('technical-count').textContent = technicalCount;
        document.getElementById('avg-offline').textContent = avgOffline + 'h';
        
        // Update charts with real status data
        updateOfflineCharts(data, statusUpdates);
    } catch (error) {
        console.error('Error loading status updates:', error);
        document.getElementById('parking-count').textContent = '0';
        document.getElementById('technical-count').textContent = '0';
        const avgOffline = data.length > 0 ? Math.round(data.reduce((sum, item) => sum + parseFloat(item['Offline Since (hrs)']), 0) / data.length) : 0;
        document.getElementById('avg-offline').textContent = avgOffline + 'h';
        
        updateOfflineCharts(data, {});
    }
    
    // Update table
    updateOfflineTable(data);
}

// Update offline table
function updateOfflineTable(data) {
    const tbody = document.querySelector('#offline-table tbody');
    tbody.innerHTML = '';
    
    data.forEach((vehicle, index) => {
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
                data: [Math.max(0, offlineCount - parkingCount - technicalCount), parkingCount, technicalCount],
                backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 20 } }
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
            maintainAspectRatio: false,
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
        .slice(0, 20) // Limit to top 20 for performance
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
            maintainAspectRatio: false,
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
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 20 } } }
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
    
    data.slice(0, 50).forEach(alert => {
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
            maintainAspectRatio: false,
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
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12,
                        font: { size: 10 },
                        padding: 15
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
        if (supabaseClient) {
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
                showNotification('Database error. Status updated locally only.', 'warning');
            } else {
                showNotification('Status updated successfully!', 'info');
            }
        } else {
            showNotification('Database not available. Status updated locally only.', 'warning');
        }
        
        // Update UI regardless of database success
        updateStatusUI(vehicleNumber, status);
        closeModal();
        
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
        showNotification('No data to export', 'warning');
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
    showNotification(`Report exported: ${filename}`, 'info');
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
    }
}

// Error handling
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global error:', { msg, url, lineNo, columnNo, error });
    showNotification('An error occurred. Please refresh the page.', 'error');
    return false;
};

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('A network error occurred. Retrying...', 'warning');
    event.preventDefault();
});

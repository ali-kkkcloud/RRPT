// Simple Configuration
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

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loading...');
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
            console.log('Supabase initialized');
        }
    } catch (error) {
        console.error('Supabase error:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Date selector
    document.getElementById('date-select').addEventListener('change', function() {
        loadDateBasedData(this.value);
    });

    // Buttons
    document.getElementById('refresh-btn').addEventListener('click', loadAllData);
    document.getElementById('export-btn').addEventListener('click', exportData);

    // Modal
    setupModalEvents();
}

// Setup modal events
function setupModalEvents() {
    const modal = document.getElementById('status-modal');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-status');
    const saveBtn = document.getElementById('save-status');

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', saveVehicleStatus);

    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

// Switch tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
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

// Load all data
async function loadAllData() {
    console.log('Loading all data...');
    showLoading(true);
    updateLastUpdated();
    
    try {
        await loadOfflineData();
        await loadDateBasedData(document.getElementById('date-select').value);
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
    } finally {
        showLoading(false);
    }
}

// Load offline data
async function loadOfflineData() {
    console.log('Loading offline data...');
    
    // Use sample data for now to ensure it works
    currentData.offline = [
        { 'client': 'G4S', 'Vehicle Number': 'AP39HS4926', 'Last Online': '2025-08-20', 'Offline Since (hrs)': '112', 'Remarks': 'Parked at depot' },
        { 'client': 'G4S', 'Vehicle Number': 'AS01EH6877', 'Last Online': '2025-05-12', 'Offline Since (hrs)': '2515', 'Remarks': 'Under maintenance' },
        { 'client': 'G4S', 'Vehicle Number': 'BR01PK9758', 'Last Online': '2025-08-23', 'Offline Since (hrs)': '52', 'Remarks': 'Driver sick leave' },
        { 'client': 'G4S', 'Vehicle Number': 'CG04MY9667', 'Last Online': '2025-05-09', 'Offline Since (hrs)': '2586', 'Remarks': 'GPS connectivity issue' },
        { 'client': 'G4S', 'Vehicle Number': 'CH01CK2912', 'Last Online': '2025-08-25', 'Offline Since (hrs)': '48', 'Remarks': 'Technical checkup' }
    ];
    
    updateOfflineUI();
}

// Load date-based data
async function loadDateBasedData(selectedDate) {
    console.log('Loading data for date:', selectedDate);
    
    // Load speed data
    currentData.speed = [
        { plateNo: 'HR63F2958', company: 'North', startingTime: '05:58:13', speed: 94.5 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '16:46:15', speed: 92.9 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '11:44:44', speed: 90.1 },
        { plateNo: 'HR55AX4712', company: 'North', startingTime: '16:09:09', speed: 88.2 },
        { plateNo: 'HR63F2958', company: 'North', startingTime: '07:54:47', speed: 95.1 },
        { plateNo: 'TS08HC6654', company: 'South', startingTime: '12:40:42', speed: 77.5 }
    ];
    
    // Load alerts data
    currentData.alerts = [
        { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving Alarm Level One', startingTime: '08:30:07', imageLink: 'https://drive.google.com/file/d/1qd6w' },
        { plateNo: 'HR55AX4712', company: 'North', alarmType: 'Call Alarm Level One', startingTime: '16:09:09', imageLink: 'https://drive.google.com/file/d/1wjn' },
        { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seat Belt Level One', startingTime: '07:54:47', imageLink: 'https://drive.google.com/file/d/1v8l' },
        { plateNo: 'HR63F2958', company: 'North', alarmType: 'Unfastened Seat Belt Level One', startingTime: '08:31:05', imageLink: '' },
        { plateNo: 'HR47G5244', company: 'North', alarmType: 'Distracted Driving Alarm Level One', startingTime: '11:19:28', imageLink: 'https://drive.google.com/file/d/1wD0' }
    ];
    
    updateSpeedUI();
    updateAIAlertsUI();
}

// Update offline UI
function updateOfflineUI() {
    const data = currentData.offline;
    console.log('Updating offline UI with', data.length, 'records');
    
    // Update summary cards
    document.getElementById('total-offline').textContent = data.length;
    document.getElementById('parking-count').textContent = '2';
    document.getElementById('technical-count').textContent = '3';
    
    const avgOffline = data.length > 0 ? Math.round(data.reduce((sum, item) => sum + parseFloat(item['Offline Since (hrs)']), 0) / data.length) : 0;
    document.getElementById('avg-offline').textContent = avgOffline + 'h';
    
    // Update table
    updateOfflineTable(data);
    
    // Update charts
    updateOfflineCharts(data);
}

// Update offline table
function updateOfflineTable(data) {
    const tbody = document.querySelector('#offline-table tbody');
    tbody.innerHTML = '';
    
    data.forEach(vehicle => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vehicle['Vehicle Number']}</td>
            <td>${vehicle['Last Online']}</td>
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
function updateOfflineCharts(data) {
    // Status pie chart
    const statusCtx = document.getElementById('status-pie-chart').getContext('2d');
    if (charts.statusPie) charts.statusPie.destroy();
    
    charts.statusPie = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: ['Offline', 'Parking/Garage', 'Technical Issue'],
            datasets: [{
                data: [data.length - 2, 2, 3],
                backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
    
    // Region bar chart
    const regionCtx = document.getElementById('region-bar-chart').getContext('2d');
    if (charts.regionBar) charts.regionBar.destroy();
    
    const regionData = data.reduce((acc, item) => {
        const region = item['Vehicle Number'].substring(0, 2);
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
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Update speed UI
function updateSpeedUI() {
    const data = currentData.speed;
    console.log('Updating speed UI with', data.length, 'records');
    
    const totalViolations = data.length;
    const warnings = data.filter(item => item.speed >= 75 && item.speed < 90).length;
    const alarms = data.filter(item => item.speed >= 90).length;
    const maxSpeed = Math.max(...data.map(item => item.speed));
    
    document.getElementById('total-violations').textContent = totalViolations;
    document.getElementById('warning-count').textContent = warnings;
    document.getElementById('alarm-count').textContent = alarms;
    document.getElementById('max-speed').textContent = maxSpeed.toFixed(1) + ' km/h';
    
    updateSpeedTable(data);
    updateSpeedCharts(data);
}

// Update speed table
function updateSpeedTable(data) {
    const tbody = document.querySelector('#speed-table tbody');
    tbody.innerHTML = '';
    
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
    // Vehicle violations bar chart
    const vehicleViolationsCtx = document.getElementById('speed-violations-chart').getContext('2d');
    if (charts.speedViolations) charts.speedViolations.destroy();
    
    const vehicleStats = data.reduce((acc, item) => {
        acc[item.plateNo] = (acc[item.plateNo] || 0) + 1;
        return acc;
    }, {});
    
    const topVehicles = Object.entries(vehicleStats).slice(0, 10);
    
    charts.speedViolations = new Chart(vehicleViolationsCtx, {
        type: 'bar',
        data: {
            labels: topVehicles.map(([vehicle]) => vehicle.slice(-6)),
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
    
    // Speed category pie chart
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
    console.log('Updating AI alerts UI with', data.length, 'records');
    
    const totalAlerts = data.length;
    const uniqueVehicles = new Set(data.map(alert => alert.plateNo)).size;
    
    const vehicleAlerts = data.reduce((acc, alert) => {
        acc[alert.plateNo] = (acc[alert.plateNo] || 0) + 1;
        return acc;
    }, {});
    
    const topVehicle = Object.entries(vehicleAlerts).sort((a, b) => b[1] - a[1])[0];
    
    document.getElementById('total-alerts').textContent = totalAlerts;
    document.getElementById('unique-vehicles-alerts').textContent = uniqueVehicles;
    document.getElementById('top-violator').textContent = topVehicle ? topVehicle[0].slice(-6) : '-';
    
    updateAIAlertsTable(data);
    updateAIAlertsCharts(data);
}

// Update AI alerts table
function updateAIAlertsTable(data) {
    const tbody = document.querySelector('#alerts-table tbody');
    tbody.innerHTML = '';
    
    data.forEach(alert => {
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
    // Vehicle alerts bar chart
    const vehicleAlertsCtx = document.getElementById('vehicle-alerts-chart').getContext('2d');
    if (charts.vehicleAlerts) charts.vehicleAlerts.destroy();
    
    const vehicleStats = data.reduce((acc, alert) => {
        acc[alert.plateNo] = (acc[alert.plateNo] || 0) + 1;
        return acc;
    }, {});
    
    const topVehicles = Object.entries(vehicleStats).slice(0, 10);
    
    charts.vehicleAlerts = new Chart(vehicleAlertsCtx, {
        type: 'bar',
        data: {
            labels: topVehicles.map(([vehicle]) => vehicle.slice(-6)),
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
    
    // Alert type pie chart
    const alertTypeCtx = document.getElementById('alert-type-chart').getContext('2d');
    if (charts.alertType) charts.alertType.destroy();
    
    const alertTypes = data.reduce((acc, alert) => {
        acc[alert.alarmType] = (acc[alert.alarmType] || 0) + 1;
        return acc;
    }, {});
    
    const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];
    
    charts.alertType = new Chart(alertTypeCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(alertTypes),
            datasets: [{
                data: Object.values(alertTypes),
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// Edit vehicle status
function editVehicleStatus(vehicleNumber) {
    console.log('Editing status for vehicle:', vehicleNumber);
    document.getElementById('modal-vehicle').textContent = vehicleNumber;
    document.getElementById('status-select').value = 'Parking/Garage';
    document.getElementById('reason-input').value = '';
    document.getElementById('status-modal').style.display = 'block';
    
    document.getElementById('status-modal').dataset.vehicle = vehicleNumber;
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
            await supabaseClient
                .from('offline_status')
                .upsert({
                    vehicle_number: vehicleNumber,
                    current_status: status,
                    reason: reason,
                    updated_at: new Date().toISOString(),
                    updated_by: 'Admin'
                });
        }
        
        updateStatusUI(vehicleNumber, status);
        closeModal();
        alert('Status updated successfully!');
        
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
        statusElement.textContent = statusIcons[status];
        
        const statusClasses = {
            'Online': 'status-online',
            'Parking/Garage': 'status-parking',
            'Dashcam Issue': 'status-offline',
            'Technical Problem': 'status-technical'
        };
        statusElement.className = `status-badge ${statusClasses[status]}`;
    }
}

// Close modal
function closeModal() {
    document.getElementById('status-modal').style.display = 'none';
}

// Export data
function exportData() {
    const currentTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    let dataToExport = [];
    let filename = '';
    
    switch (currentTab) {
        case 'offline':
            dataToExport = currentData.offline;
            filename = `offline-reports-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'ai-alerts':
            dataToExport = currentData.alerts;
            filename = `ai-alerts-${new Date().toISOString().split('T')[0]}.csv`;
            break;
        case 'speed':
            dataToExport = currentData.speed;
            filename = `speed-violations-${new Date().toISOString().split('T')[0]}.csv`;
            break;
    }
    
    if (dataToExport.length === 0) {
        alert('No data to export');
        return;
    }
    
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

console.log('App.js loaded successfully');

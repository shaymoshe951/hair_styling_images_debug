class SupabaseDebugTool {
    constructor() {
        this.supabase = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadConfig();
        this.setDefaultDates();
    }

    setupEventListeners() {
        // Config panel events
        document.getElementById('show-config').addEventListener('click', () => {
            this.toggleConfigPanel(true);
        });

        document.getElementById('toggle-config').addEventListener('click', () => {
            this.toggleConfigPanel(false);
        });

        document.getElementById('save-config').addEventListener('click', () => {
            this.saveConfig();
        });

        // Filter events
        document.getElementById('last-day-btn').addEventListener('click', () => {
            this.setLastDayFilter();
        });

        document.getElementById('filter-btn').addEventListener('click', () => {
            this.filterData();
        });

        // Enter key support for inputs
        document.getElementById('start-date').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.filterData();
        });

        document.getElementById('end-date').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.filterData();
        });

        // Cache dates when manually changed
        document.getElementById('start-date').addEventListener('change', () => {
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            if (startDate && endDate) {
                this.cacheDates(startDate, endDate);
            }
        });

        document.getElementById('end-date').addEventListener('change', () => {
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            if (startDate && endDate) {
                this.cacheDates(startDate, endDate);
            }
        });
    }

    setDefaultDates() {
        // Try to load cached dates first
        const cachedStartDate = localStorage.getItem('debug-tool-start-date');
        const cachedEndDate = localStorage.getItem('debug-tool-end-date');
        
        if (cachedStartDate && cachedEndDate) {
            document.getElementById('start-date').value = cachedStartDate;
            document.getElementById('end-date').value = cachedEndDate;
        } else {
            // Set default to last 24 hours if no cached dates
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            document.getElementById('start-date').value = this.formatDateForInput(yesterday);
            document.getElementById('end-date').value = this.formatDateForInput(now);
        }
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    setLastDayFilter() {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const startDateValue = this.formatDateForInput(yesterday);
        const endDateValue = this.formatDateForInput(now);
        
        document.getElementById('start-date').value = startDateValue;
        document.getElementById('end-date').value = endDateValue;
        
        // Cache the new dates
        this.cacheDates(startDateValue, endDateValue);
    }

    cacheDates(startDate, endDate) {
        localStorage.setItem('debug-tool-start-date', startDate);
        localStorage.setItem('debug-tool-end-date', endDate);
    }

    toggleConfigPanel(show) {
        const panel = document.getElementById('config-panel');
        const toggle = document.getElementById('show-config');
        
        if (show) {
            panel.style.display = 'block';
            toggle.style.display = 'none';
        } else {
            panel.style.display = 'none';
            toggle.style.display = 'block';
        }
    }

    loadConfig() {
        const url = localStorage.getItem('supabase-url');
        const key = localStorage.getItem('supabase-key');
        
        if (url && key) {
            document.getElementById('supabase-url').value = url;
            document.getElementById('supabase-key').value = key;
            this.initSupabase(url, key);
            this.toggleConfigPanel(false);
        } else {
            this.toggleConfigPanel(true);
        }
    }

    saveConfig() {
        const url = document.getElementById('supabase-url').value.trim();
        const key = document.getElementById('supabase-key').value.trim();
        
        if (!url || !key) {
            this.showError('Please provide both Supabase URL and key');
            return;
        }

        localStorage.setItem('supabase-url', url);
        localStorage.setItem('supabase-key', key);
        
        this.initSupabase(url, key);
        this.toggleConfigPanel(false);
        this.showSuccess('Configuration saved successfully!');
    }

    initSupabase(url, key) {
        try {
            this.supabase = supabase.createClient(url, key);
            console.log('Supabase client initialized');
        } catch (error) {
            this.showError('Failed to initialize Supabase client: ' + error.message);
        }
    }

    async filterData() {
        if (!this.supabase) {
            this.showError('Please configure Supabase connection first');
            return;
        }

        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        if (!startDate || !endDate) {
            this.showError('Please select both start and end dates');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            this.showError('Start date must be before end date');
            return;
        }

        // Cache the selected dates
        this.cacheDates(startDate, endDate);

        this.showLoading(true);
        this.hideError();

        try {
            // Fetch both metadata summary and processed images
            const [metadataSummary, processedImages] = await Promise.all([
                this.fetchMetadataSummary(startDate, endDate),
                this.fetchProcessedImages(startDate, endDate)
            ]);
            
            await this.displayMetadataSummary(metadataSummary);
            await this.displayResults(processedImages);
        } catch (error) {
            this.showError('Error fetching data: ' + error.message);
            console.error('Error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async fetchProcessedImages(startDate, endDate) {
        const startISO = new Date(startDate).toISOString();
        const endISO = new Date(endDate).toISOString();

        const { data, error } = await this.supabase
            .from('processed_images')
            .select('*')
            .gte('created_at', startISO)
            .lte('created_at', endISO)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Database query failed: ${error.message}`);
        }

        return data || [];
    }

    async fetchMetadataSummary(startDate, endDate) {
        const startISO = new Date(startDate).toISOString();
        const endISO = new Date(endDate).toISOString();

        // Get user metadata for users who have processed images in the date range
        const { data: processedUsers, error: processedError } = await this.supabase
            .from('processed_images')
            .select('user_id')
            .gte('created_at', startISO)
            .lte('created_at', endISO)
            .not('user_id', 'is', null);

        if (processedError) {
            throw new Error(`Failed to fetch processed users: ${processedError.message}`);
        }

        // Get unique user IDs
        const uniqueUserIds = [...new Set(processedUsers.map(row => row.user_id))];

        if (uniqueUserIds.length === 0) {
            return {
                totalUsers: 0,
                anonymousUsers: 0,
                indiaUsers: 0,
                totalTransforms: 0,
                totalShares: 0,
                totalLikes: 0,
                totalDislikes: 0,
                totalBuyCreditsCalls: 0,
                avgTransforms: 0,
                avgShares: 0
            };
        }

        // Fetch metadata for these users
        const { data: metadata, error: metadataError } = await this.supabase
            .from('user_metadata')
            .select('*')
            .in('user_id', uniqueUserIds);

        if (metadataError) {
            throw new Error(`Failed to fetch user metadata: ${metadataError.message}`);
        }

        // Calculate summary statistics
        const totalUsers = metadata.length;
        const totalTransforms = metadata.reduce((sum, user) => sum + (user.total_transforms || 0), 0);
        const totalShares = metadata.reduce((sum, user) => sum + (user.total_shares || 0), 0);
        
        const summary = {
            totalUsers: totalUsers,
            anonymousUsers: metadata.filter(user => user.is_anonymous).length,
            indiaUsers: metadata.filter(user => user.is_india).length,
            totalTransforms: totalTransforms,
            totalShares: totalShares,
            totalLikes: metadata.reduce((sum, user) => sum + (user.total_likes || 0), 0),
            totalDislikes: metadata.reduce((sum, user) => sum + (user.total_dislikes || 0), 0),
            totalBuyCreditsCalls: metadata.reduce((sum, user) => sum + (user.total_buy_credits_calls || 0), 0),
            avgTransforms: totalUsers > 0 ? Math.round((totalTransforms / totalUsers) * 100) / 100 : 0,
            avgShares: totalUsers > 0 ? Math.round((totalShares / totalUsers) * 100) / 100 : 0
        };

        return summary;
    }

    async displayMetadataSummary(summary) {
        const metadataSummary = document.getElementById('metadata-summary');
        
        // Update totals row values
        document.getElementById('total-transforms').textContent = summary.totalTransforms;
        document.getElementById('total-shares').textContent = summary.totalShares;
        document.getElementById('total-likes').textContent = summary.totalLikes;
        document.getElementById('total-dislikes').textContent = summary.totalDislikes;
        document.getElementById('total-buy-credits').textContent = summary.totalBuyCreditsCalls;

        // Update counts row values
        document.getElementById('total-users').textContent = summary.totalUsers;
        document.getElementById('anonymous-users').textContent = summary.anonymousUsers;
        document.getElementById('india-users').textContent = summary.indiaUsers;
        document.getElementById('avg-transforms').textContent = summary.avgTransforms;
        document.getElementById('avg-shares').textContent = summary.avgShares;

        // Show the metadata summary
        metadataSummary.style.display = 'block';
    }

    async getStorageImages(userId) {
        const images = {
            source: null,
            result: null,
            target: null
        };

        const types = ['source', 'result', 'target'];
        
        for (const type of types) {
            try {
                const { data: files } = await this.supabase.storage
                    .from('user-uploads')
                    .list(`${userId}/${type}`, {
                        limit: 100,
                        sortBy: { column: 'created_at', order: 'desc' }
                    });

                if (files && files.length > 0) {
                    // Get the most recent image
                    const latestFile = files[0];
                    const { data: urlData } = await this.supabase.storage
                        .from('user-uploads')
                        .createSignedUrl(`${userId}/${type}/${latestFile.name}`, 3600); // 1 hour expiry

                    if (urlData) {
                        images[type] = urlData.signedUrl;
                    }
                }
            } catch (error) {
                console.warn(`Could not fetch ${type} image for user ${userId}:`, error);
            }
        }

        return images;
    }

    async displayResults(processedImages) {
        const tableBody = document.getElementById('table-body');
        const table = document.getElementById('results-table');
        const stats = document.getElementById('stats');
        const recordCount = document.getElementById('record-count');

        // Clear previous results
        tableBody.innerHTML = '';

        if (processedImages.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">No records found for the selected date range</td></tr>';
            table.style.display = 'table';
            stats.style.display = 'block';
            recordCount.textContent = '0';
            return;
        }

        // Group records by user_id but keep all individual records
        const userGroups = this.groupByUserId(processedImages);
        const uniqueUsers = Object.keys(userGroups);

        // Show stats
        recordCount.textContent = `${processedImages.length} records from ${uniqueUsers.length} unique users`;
        stats.style.display = 'block';

        // Process each user group
        for (let userIndex = 0; userIndex < uniqueUsers.length; userIndex++) {
            const userId = uniqueUsers[userIndex];
            const userRecords = userGroups[userId].records;
            
            // Get storage images for this user (once per user)
            let storageImages = { source: null, result: null, target: null };
            if (userId && userId !== 'null') {
                try {
                    storageImages = await this.getStorageImages(userId);
                } catch (error) {
                    console.warn(`Could not fetch images for user ${userId}:`, error);
                }
            }

            // Add user group header row
            if (userRecords.length > 1) {
                const headerRow = document.createElement('tr');
                headerRow.className = 'user-group-header';
                headerRow.innerHTML = `
                    <td colspan="7" class="user-group-title">
                        <strong>👤 User: ${userId || 'N/A'} (${userRecords.length} records)</strong>
                    </td>
                `;
                tableBody.appendChild(headerRow);
            }

            // Process each individual record for this user
            for (let recordIndex = 0; recordIndex < userRecords.length; recordIndex++) {
                const record = userRecords[recordIndex];
                const row = document.createElement('tr');
                
                // Add visual grouping class
                row.className = userRecords.length > 1 ? 'grouped-record' : 'single-record';
                if (recordIndex === userRecords.length - 1) {
                    row.classList.add('last-in-group');
                }

                // Extract targetStyleUrl from this record's task data
                let targetStyleUrl = null;
                if (record.task) {
                    try {
                        const taskData = typeof record.task === 'string' ? JSON.parse(record.task) : record.task;
                        if (taskData && typeof taskData === 'object') {
                            targetStyleUrl = taskData.targetStyleUrl;
                        }
                    } catch (error) {
                        // Ignore parsing errors
                    }
                }

                row.innerHTML = `
                    <td>
                        <div class="user-id">${userId || 'N/A'}</div>
                        ${userRecords.length > 1 ? `<div class="record-number">#${recordIndex + 1}</div>` : ''}
                    </td>
                    <td class="date-cell">
                        ${this.formatDateTime(record.created_at)}
                    </td>
                    <td class="task-cell">
                        ${this.formatTaskData(record.task)}
                    </td>
                    <td class="image-cell">
                        ${this.createImageCell(storageImages.source, 'Source')}
                    </td>
                    <td class="image-cell">
                        ${this.createImageCell(storageImages.target, 'Profile')}
                    </td>
                    <td class="image-cell">
                        ${this.createImageCell(targetStyleUrl, 'Target Style')}
                    </td>
                    <td class="image-cell">
                        ${this.createImageCell(record.result_url, 'Result URL')}
                    </td>
                `;

                tableBody.appendChild(row);
            }
        }

        table.style.display = 'table';
    }

    groupByUserId(processedImages) {
        const groups = {};

        processedImages.forEach(record => {
            const userId = record.user_id || 'null';
            
            if (!groups[userId]) {
                groups[userId] = {
                    records: [],
                    count: 0
                };
            }

            groups[userId].records.push(record);
            groups[userId].count++;
        });

        // Sort records within each group by created_at (most recent first)
        Object.values(groups).forEach(group => {
            group.records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });

        return groups;
    }

    createImageCell(imageUrl, altText) {
        if (imageUrl) {
            return `<img src="${imageUrl}" alt="${altText}" class="image-preview" onclick="window.open('${imageUrl}', '_blank')" title="Click to view full size">`;
        } else {
            return `<div class="image-placeholder">No ${altText}</div>`;
        }
    }

    formatTaskData(taskData) {
        if (!taskData) {
            return 'N/A';
        }

        // If it's a string, try to parse it as JSON
        let parsedData;
        if (typeof taskData === 'string') {
            try {
                parsedData = JSON.parse(taskData);
            } catch (error) {
                // If it's not valid JSON, return as is
                return taskData;
            }
        } else {
            parsedData = taskData;
        }

        // If it's an object, filter out unwanted fields
        if (typeof parsedData === 'object' && parsedData !== null) {
            const filteredData = { ...parsedData };
            delete filteredData.taskId;
            delete filteredData.source_url;
            delete filteredData.targetStyleUrl;

            // If no fields remain after filtering, return N/A
            if (Object.keys(filteredData).length === 0) {
                return 'N/A';
            }

            // Return formatted JSON string
            return JSON.stringify(filteredData, null, 2);
        }

        return taskData.toString();
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        };
        return date.toLocaleString('en-US', options);
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const error = document.getElementById('error');
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = message;
        error.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.hideError();
        }, 10000);
    }

    hideError() {
        const error = document.getElementById('error');
        error.style.display = 'none';
    }

    showSuccess(message) {
        // Create temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'error';
        successDiv.style.backgroundColor = '#27ae60';
        successDiv.innerHTML = `<p>${message}</p>`;
        
        const container = document.querySelector('.container');
        const filters = document.querySelector('.filters');
        container.insertBefore(successDiv, filters.nextSibling);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SupabaseDebugTool();
});

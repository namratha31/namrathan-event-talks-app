// Application State
let releaseNotes = [];
let filteredNotes = [];
let currentFilter = 'all';
let currentSearch = '';
let selectedNote = null;

// UX & Usability States
let visibleCount = 15;
const bookmarkedNotes = new Set(JSON.parse(localStorage.getItem('bookmarks') || '[]'));

// DOM Elements
const releaseFeed = document.getElementById('release-feed');
const emptyState = document.getElementById('empty-state');
const btnEmptyReset = document.getElementById('btn-empty-reset');
const btnRefresh = document.getElementById('btn-refresh');
const lastUpdatedTime = document.getElementById('last-updated-time');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const categoryFilters = document.getElementById('category-filters');
const btnExport = document.getElementById('btn-export');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const loadMoreContainer = document.getElementById('load-more-container');
const btnLoadMore = document.getElementById('btn-load-more');
const toastContainer = document.getElementById('toast-container');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statAnnouncements = document.getElementById('stat-announcements');
const statDeprecations = document.getElementById('stat-deprecations');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const modalClose = document.getElementById('modal-close');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const tweetLinkDisplay = document.getElementById('tweet-link-display');
const btnCancelTweet = document.getElementById('btn-cancel-tweet');
const btnSubmitTweet = document.getElementById('btn-submit-tweet');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleases();
    setupEventListeners();
    setupKeyboardShortcuts();
});

// Theme Initialization
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        updateThemeIcon(true);
    } else {
        updateThemeIcon(false);
    }
}

// Update Toggle Icon
function updateThemeIcon(isLight) {
    if (isLight) {
        btnThemeToggle.innerHTML = '<i data-feather="moon"></i>';
    } else {
        btnThemeToggle.innerHTML = '<i data-feather="sun"></i>';
    }
    feather.replace();
}

// Reusable Toast Notification System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';
    
    toast.innerHTML = `
        <i data-feather="${iconName}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    feather.replace();
    
    // Smooth fadeout and remove toast
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// Keyboard shortcuts mapping
function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        // Press "/" to focus search (unless in an input field already)
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            searchInput.focus();
            showToast("Search focused", "info");
        }
        
        // Press "Escape" to close active modals
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetModal();
            showToast("Composer closed", "info");
        }
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Refresh button
    btnRefresh.addEventListener('click', () => {
        fetchReleases(true);
    });

    // Theme Toggle
    btnThemeToggle.addEventListener('click', () => {
        const isCurrentlyLight = document.body.classList.contains('light-theme');
        if (isCurrentlyLight) {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
            updateThemeIcon(false);
            showToast("Switched to dark theme", "info");
        } else {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            updateThemeIcon(true);
            showToast("Switched to light theme", "info");
        }
    });

    // Export CSV
    btnExport.addEventListener('click', () => {
        exportToCSV();
    });

    // Load More action
    btnLoadMore.addEventListener('click', () => {
        visibleCount += 15;
        renderFeed();
    });

    // Empty state Reset
    btnEmptyReset.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        searchClear.style.display = 'none';
        
        const allPill = categoryFilters.querySelector('[data-filter="all"]');
        if (allPill) {
            allPill.click();
        } else {
            currentFilter = 'all';
            applyFiltersAndSearch();
        }
        showToast("Search and filters reset", "info");
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        searchClear.style.display = currentSearch ? 'flex' : 'none';
        applyFiltersAndSearch();
    });

    // Clear search
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        currentSearch = '';
        searchClear.style.display = 'none';
        applyFiltersAndSearch();
        searchInput.focus();
    });

    // Category pills filter
    categoryFilters.addEventListener('click', (e) => {
        const targetPill = e.target.closest('.pill');
        if (!targetPill) return;

        // Toggle active states
        categoryFilters.querySelectorAll('.pill').forEach(pill => pill.classList.remove('active'));
        targetPill.classList.add('active');

        currentFilter = targetPill.dataset.filter;
        applyFiltersAndSearch();
    });

    // Metric cards filter shortcuts
    document.querySelectorAll('.metric-card').forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.filter;
            let targetPill;
            
            if (category === 'all') {
                targetPill = categoryFilters.querySelector('[data-filter="all"]');
            } else if (category === 'feature') {
                targetPill = categoryFilters.querySelector('[data-filter="Feature"]');
            } else if (category === 'announcement') {
                targetPill = categoryFilters.querySelector('[data-filter="Announcement"]');
            } else if (category === 'deprecation') {
                targetPill = categoryFilters.querySelector('[data-filter="Deprecated"]');
            }

            if (targetPill) {
                targetPill.click();
            }
        });
    });

    // Modal Close operations
    modalClose.addEventListener('click', closeTweetModal);
    btnCancelTweet.addEventListener('click', closeTweetModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeTweetModal);

    // Textarea input changes (character count)
    tweetTextarea.addEventListener('input', updateCharCount);

    // Tweet Submission
    btnSubmitTweet.addEventListener('click', submitTweet);
}

// Fetch Releases from API
async function fetchReleases(forceRefresh = false) {
    const spinner = btnRefresh.querySelector('.spinner-icon');
    spinner.classList.add('spinning');
    btnRefresh.disabled = true;
    
    if (releaseNotes.length === 0) {
        renderSkeleton();
    }

    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'success' || data.status === 'warning') {
            releaseNotes = data.releases;
            
            // Format Last Updated Text
            const fetchDate = new Date(data.last_fetched * 1000);
            lastUpdatedTime.textContent = `Updated: ${fetchDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            
            updateStats();
            applyFiltersAndSearch();
            
            if (forceRefresh) {
                if (data.status === 'warning') {
                    showToast(data.message, "error");
                } else {
                    showToast("Changelog feed refreshed successfully!", "success");
                }
            }
        } else {
            showErrorState(data.message || "Failed to load release notes");
            showToast(data.message, "error");
        }
    } catch (err) {
        showErrorState("Network error fetching release notes. Please check connection.");
        showToast("Network error. Serving offline mode.", "error");
        console.error(err);
    } finally {
        spinner.classList.remove('spinning');
        btnRefresh.disabled = false;
    }
}

// Compute and render stats
function updateStats() {
    statTotal.textContent = releaseNotes.length;
    
    const features = releaseNotes.filter(n => n.type === 'Feature').length;
    const announcements = releaseNotes.filter(n => n.type === 'Announcement').length;
    const deprecations = releaseNotes.filter(n => n.type === 'Deprecated').length;

    statFeatures.textContent = features;
    statAnnouncements.textContent = announcements;
    statDeprecations.textContent = deprecations;
}

// Apply filter and search combination
function applyFiltersAndSearch() {
    filteredNotes = releaseNotes;

    // Reset pagination to first chunk on filter change
    visibleCount = 15;

    // 1. Filter by category
    if (currentFilter !== 'all') {
        filteredNotes = filteredNotes.filter(note => note.type.toLowerCase() === currentFilter.toLowerCase());
    }

    // 2. Filter by search query
    if (currentSearch) {
        filteredNotes = filteredNotes.filter(note => 
            note.date.toLowerCase().includes(currentSearch) ||
            note.type.toLowerCase().includes(currentSearch) ||
            note.plain_text.toLowerCase().includes(currentSearch)
        );
    }

    renderFeed();
}

// Render Feed items
function renderFeed() {
    releaseFeed.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        emptyState.style.display = 'flex';
        loadMoreContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';

    // Paginate visible notes
    const visibleNotes = filteredNotes.slice(0, visibleCount);

    visibleNotes.forEach(note => {
        const card = document.createElement('article');
        const categoryClass = `category-${note.type.toLowerCase().replace(' ', '-')}`;
        card.className = `release-card ${categoryClass}`;
        card.id = note.id;

        const isBookmarked = bookmarkedNotes.has(note.id);

        // Render card inner content
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta-left">
                    <span class="card-date">
                        <i data-feather="calendar"></i>
                        ${note.date}
                    </span>
                    <span class="badge badge-${note.type.toLowerCase().replace(' ', '-')}">
                        ${note.type}
                    </span>
                </div>
                <div class="card-actions">
                    <a href="${note.link}" target="_blank" class="btn-icon" title="View official release documentation">
                        <i data-feather="external-link"></i>
                    </a>
                    <button class="btn-icon btn-bookmark-action ${isBookmarked ? 'bookmarked' : ''}" title="${isBookmarked ? 'Remove bookmark' : 'Bookmark this update'}" data-id="${note.id}">
                        <i data-feather="bookmark"></i>
                    </button>
                    <button class="btn-icon btn-copy-action" title="Copy update text to clipboard" data-id="${note.id}">
                        <i data-feather="copy"></i>
                    </button>
                    <button class="btn-icon btn-tweet-action" title="Tweet this update" data-id="${note.id}">
                        <i data-feather="twitter"></i>
                    </button>
                </div>
            </div>
            <div class="card-content">
                ${note.content_html}
            </div>
        `;

        // Attach Event listener to tweet button
        const tweetBtn = card.querySelector('.btn-tweet-action');
        tweetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTweetModal(note);
        });

        // Attach Event listener to copy button
        const copyBtn = card.querySelector('.btn-copy-action');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(note.plain_text, copyBtn);
        });

        // Attach Event listener to bookmark button
        const bookmarkBtn = card.querySelector('.btn-bookmark-action');
        bookmarkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBookmark(note.id, bookmarkBtn);
        });

        releaseFeed.appendChild(card);
    });

    // Manage visibility of "Load More" button
    if (filteredNotes.length > visibleCount) {
        loadMoreContainer.style.display = 'flex';
    } else {
        loadMoreContainer.style.display = 'none';
    }

    // Trigger feather replacement for new elements
    feather.replace();
}

// Bookmark status toggle
function toggleBookmark(noteId, buttonElement) {
    if (bookmarkedNotes.has(noteId)) {
        bookmarkedNotes.delete(noteId);
        buttonElement.classList.remove('bookmarked');
        buttonElement.setAttribute('title', 'Bookmark this update');
        showToast("Bookmark removed", "info");
    } else {
        bookmarkedNotes.add(noteId);
        buttonElement.classList.add('bookmarked');
        buttonElement.setAttribute('title', 'Remove bookmark');
        showToast("Bookmark added successfully!", "success");
    }
    
    // Save to local storage
    localStorage.setItem('bookmarks', JSON.stringify(Array.from(bookmarkedNotes)));
    feather.replace();
}

// Copy update text to clipboard
function copyToClipboard(text, buttonElement) {
    navigator.clipboard.writeText(text).then(() => {
        // Success state feedback
        buttonElement.classList.add('btn-copy-action-success');
        buttonElement.innerHTML = '<i data-feather="check"></i>';
        buttonElement.setAttribute('title', 'Copied!');
        feather.replace();
        
        showToast("Content copied to clipboard", "success");

        // Revert feedback back after 2.5 seconds
        setTimeout(() => {
            buttonElement.classList.remove('btn-copy-action-success');
            buttonElement.innerHTML = '<i data-feather="copy"></i>';
            buttonElement.setAttribute('title', 'Copy update text to clipboard');
            feather.replace();
        }, 2500);
    }).catch(err => {
        showToast("Copy failed", "error");
        console.error('Could not copy text to clipboard: ', err);
    });
}

// Export parsed notes to CSV
function exportToCSV() {
    if (filteredNotes.length === 0) {
        showToast("No data to export", "error");
        return;
    }

    const headers = ['Date', 'Type', 'Link', 'Content'];
    const csvRows = [headers.join(',')];

    filteredNotes.forEach(note => {
        // Escape quotes inside field data to make it CSV compliant
        const cleanContent = note.plain_text.replace(/"/g, '""');
        const row = [
            `"${note.date}"`,
            `"${note.type}"`,
            `"${note.link}"`,
            `"${cleanContent}"`
        ];
        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    // Create virtual anchor link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const filterSuffix = currentFilter.toLowerCase().replace(' ', '-');
    const today = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_releases_${filterSuffix}_${today}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${filteredNotes.length} rows to CSV`, "success");
}

// Render Skeleton Screen
function renderSkeleton() {
    releaseFeed.innerHTML = `
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
    `;
    emptyState.style.display = 'none';
    loadMoreContainer.style.display = 'none';
}

// Show Error state
function showErrorState(msg) {
    releaseFeed.innerHTML = `
        <div class="empty-state" style="border-color: var(--color-deprecation-border);">
            <div class="empty-icon" style="color: var(--color-deprecation);">
                <i data-feather="alert-octagon"></i>
            </div>
            <h3>An error occurred</h3>
            <p>${msg}</p>
        </div>
    `;
    emptyState.style.display = 'none';
    loadMoreContainer.style.display = 'none';
    feather.replace();
}

// Twitter Composer modal handling
function openTweetModal(note) {
    selectedNote = note;
    
    // Auto-generate standard tweet content (safely keeping character boundaries)
    const hashtags = " #BigQuery #GCP";
    const dateFormatted = note.date;
    const prefix = `BigQuery [${note.type}] (${dateFormatted}): `;
    
    // A standard URL inside tweet intents is wrapped to 23 chars. 
    // We compute available text length based on Twitter limitations:
    // Max Tweet: 280. URL: 23. Space + hashtag space: ~20 chars.
    const urlLengthForTwitter = 23;
    const reservedChars = prefix.length + urlLengthForTwitter + hashtags.length + 4;
    const maxTextLength = 280 - reservedChars;
    
    let plainText = note.plain_text;
    if (plainText.length > maxTextLength) {
        plainText = plainText.substring(0, maxTextLength - 3) + "...";
    }
    
    // Fill text content
    tweetTextarea.value = `${prefix}${plainText}${hashtags}`;
    
    // Set URL display
    const cleanUrl = note.link ? note.link.replace('https://', '') : 'docs.cloud.google.com/...';
    tweetLinkDisplay.querySelector('.url-text').textContent = cleanUrl;
    
    // Update counter
    updateCharCount();
    
    // Show Modal
    tweetModal.classList.add('active');
    tweetTextarea.focus();
}

function closeTweetModal() {
    tweetModal.classList.remove('active');
    selectedNote = null;
}

function updateCharCount() {
    // Real URL size on X is 23 characters regardless of length.
    // Length computed = current text area value + 23 characters (for the link) + 1 (for separating space)
    const textLength = tweetTextarea.value.length;
    const linkLength = selectedNote && selectedNote.link ? 24 : 0;
    const totalLength = textLength + linkLength;

    charCount.textContent = totalLength;

    // Stylings for character counts
    charCount.className = '';
    if (totalLength > 280) {
        charCount.classList.add('danger');
        btnSubmitTweet.disabled = true;
    } else if (totalLength > 260) {
        charCount.classList.add('warning');
        btnSubmitTweet.disabled = false;
    } else {
        btnSubmitTweet.disabled = false;
    }
}

function submitTweet() {
    if (!selectedNote) return;

    const tweetText = tweetTextarea.value;
    const tweetUrl = selectedNote.link;

    // Generate Twitter Web Intent URL
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(tweetUrl)}`;

    // Open Web Intent in a new browser tab/window
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');

    closeTweetModal();
}

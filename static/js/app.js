// Application State
let releaseNotes = [];
let filteredNotes = [];
let currentFilter = 'all';
let currentSearch = '';
let selectedNote = null;

// DOM Elements
const releaseFeed = document.getElementById('release-feed');
const emptyState = document.getElementById('empty-state');
const btnRefresh = document.getElementById('btn-refresh');
const lastUpdatedTime = document.getElementById('last-updated-time');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const categoryFilters = document.getElementById('category-filters');

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
    fetchReleases();
    setupEventListeners();
});

// Setup Listeners
function setupEventListeners() {
    // Refresh button
    btnRefresh.addEventListener('click', () => {
        fetchReleases(true);
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
    // Show spinner and loader
    const spinner = btnRefresh.querySelector('.spinner-icon');
    spinner.classList.add('spinning');
    btnRefresh.disabled = true;
    
    // Render loading state if empty
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
        } else {
            showErrorState(data.message || "Failed to load release notes");
        }
    } catch (err) {
        showErrorState("Network error fetching release notes. Please check connection.");
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
    // Refresh Feather icons in case icons are rendered
    releaseFeed.innerHTML = '';
    
    if (filteredNotes.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    filteredNotes.forEach(note => {
        const card = document.createElement('article');
        const categoryClass = `category-${note.type.toLowerCase().replace(' ', '-')}`;
        card.className = `release-card ${categoryClass}`;
        card.id = note.id;

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

        releaseFeed.appendChild(card);
    });

    // Trigger feather replacement for new elements
    feather.replace();
}

// Render Skeleton Screen
function renderSkeleton() {
    releaseFeed.innerHTML = `
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
    `;
    emptyState.style.display = 'none';
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

/* ==========================================================================
   BigQuery Release Notes Navigator - Frontend Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let updates = [];
    let selectedIds = new Set();
    let activeFilter = 'all';
    let searchQuery = '';
    
    // Tweet composer modal state
    let activeTweetId = null; // null means batch/selected tweet
    let activeTweetStyle = 'standard';
    const TWITTER_CHAR_LIMIT = 280;

    // DOM Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const spinnerIcon = document.getElementById('spinner-icon');
    const statTotal = document.getElementById('stat-total');
    const statLatest = document.getElementById('stat-latest');
    const statSelected = document.getElementById('stat-selected');
    const selectedCountBadge = document.getElementById('selected-count-badge');
    const btnTweetBatch = document.getElementById('btn-tweet-batch');
    
    const searchInput = document.getElementById('search-input');
    const btnSearchClear = document.getElementById('btn-search-clear');
    const filterChips = document.querySelectorAll('.chip');
    
    const feedLoading = document.getElementById('feed-loading');
    const feedError = document.getElementById('feed-error');
    const feedEmpty = document.getElementById('feed-empty');
    const notesList = document.getElementById('notes-list');
    const btnRetry = document.getElementById('btn-retry');
    const errorMessage = document.getElementById('error-message');

    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const btnModalClose = document.getElementById('btn-modal-close');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const btnTweetSubmit = document.getElementById('btn-tweet-submit');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const xTweetPreviewText = document.getElementById('x-tweet-preview-text');
    const progressCircle = document.getElementById('progress-circle');
    const charCountNumber = document.getElementById('char-count-number');
    const charLimitWarning = document.getElementById('char-limit-warning');
    const templateButtons = document.querySelectorAll('.btn-template');

    // Toast Notification Element
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Progress circle radius & circumference
    const circleRadius = 9;
    const circleCircumference = 2 * Math.PI * circleRadius; // ~56.548
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
        progressCircle.style.strokeDashoffset = circleCircumference;
    }

    // ==========================================================================
    // 1. Fetching Data & Lifecycle
    // ==========================================================================
    
    async function fetchReleases() {
        // Set loading states
        feedLoading.classList.remove('d-none');
        feedError.classList.add('d-none');
        feedEmpty.classList.add('d-none');
        notesList.classList.add('d-none');
        
        spinnerIcon.classList.add('spinning');
        btnRefresh.disabled = true;
        
        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }
            const result = await response.json();
            
            if (result.status === 'success') {
                updates = result.data;
                selectedIds.clear();
                
                // Update header stats
                statTotal.textContent = updates.length;
                if (updates.length > 0) {
                    statLatest.textContent = updates[0].date;
                } else {
                    statLatest.textContent = 'N/A';
                }
                
                applyFiltersAndRender();
            } else {
                throw new Error(result.message || 'Unknown server error');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            errorMessage.textContent = error.message;
            feedLoading.classList.add('d-none');
            feedError.classList.remove('d-none');
        } finally {
            spinnerIcon.classList.remove('spinning');
            btnRefresh.disabled = false;
        }
    }

    // ==========================================================================
    // 2. Filtering & Rendering Notes List
    // ==========================================================================

    function applyFiltersAndRender() {
        // Filter elements
        const query = searchQuery.toLowerCase().trim();
        const filtered = updates.filter(item => {
            const matchesType = activeFilter === 'all' || item.type.toLowerCase() === activeFilter.toLowerCase();
            
            // Search inside text content, date, or type
            const matchesSearch = !query || 
                item.content_text.toLowerCase().includes(query) ||
                item.date.toLowerCase().includes(query) ||
                item.type.toLowerCase().includes(query);
                
            return matchesType && matchesSearch;
        });

        // Toggle clear search button
        if (searchQuery.length > 0) {
            btnSearchClear.classList.remove('d-none');
        } else {
            btnSearchClear.classList.add('d-none');
        }

        // Hide loading
        feedLoading.classList.add('d-none');
        
        if (filtered.length === 0) {
            feedEmpty.classList.remove('d-none');
            notesList.classList.add('d-none');
            return;
        }

        feedEmpty.classList.add('d-none');
        notesList.classList.remove('d-none');
        
        // Render cards
        notesList.innerHTML = '';
        filtered.forEach(item => {
            const card = document.createElement('div');
            const cardTypeClass = `card-${item.type.toLowerCase()}`;
            const isSelected = selectedIds.has(item.id);
            
            card.className = `note-card ${cardTypeClass} ${isSelected ? 'selected' : ''}`;
            card.dataset.id = item.id;
            
            const badgeClass = `badge-${item.type.toLowerCase()}`;
            
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-meta">
                        <input type="checkbox" class="card-selection-checkbox" ${isSelected ? 'checked' : ''} title="Select this update to draft a summary tweet">
                        <span class="card-date">
                            <i class="fa-regular fa-calendar-days"></i>
                            ${item.date}
                        </span>
                    </div>
                    <span class="card-type-badge ${badgeClass}">${item.type}</span>
                </div>
                <div class="card-body">
                    ${item.content_html}
                </div>
                <div class="card-footer">
                    <button class="btn btn-secondary btn-icon-only btn-tweet" title="Tweet about this specific update">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" title="View official release notes source">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        <span>Source</span>
                    </a>
                </div>
            `;
            
            // Wire checkbox listener
            const checkbox = card.querySelector('.card-selection-checkbox');
            checkbox.addEventListener('change', (e) => {
                toggleSelection(item.id, checkbox.checked);
            });
            
            // Wire tweet button click
            const btnTweet = card.querySelector('.btn-tweet');
            btnTweet.addEventListener('click', (e) => {
                e.stopPropagation();
                openTweetComposer(item.id);
            });

            // Make clicking the card content toggle selection (except links & checkbox & buttons)
            card.addEventListener('click', (e) => {
                if (e.target.tagName !== 'A' && 
                    e.target.tagName !== 'BUTTON' && 
                    e.target.tagName !== 'I' && 
                    !e.target.classList.contains('card-selection-checkbox') && 
                    !e.target.closest('a') && 
                    !e.target.closest('button')) {
                    
                    const newChecked = !checkbox.checked;
                    checkbox.checked = newChecked;
                    toggleSelection(item.id, newChecked);
                }
            });

            notesList.appendChild(card);
        });

        updateSelectionBar();
    }

    // ==========================================================================
    // 3. Selection System
    // ==========================================================================

    function toggleSelection(id, isSelected) {
        if (isSelected) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }
        
        // Toggle selected class on card directly for instant responsiveness
        const card = document.querySelector(`.note-card[data-id="${id}"]`);
        if (card) {
            if (isSelected) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        }
        
        updateSelectionBar();
    }

    function updateSelectionBar() {
        const count = selectedIds.size;
        statSelected.textContent = count;
        
        if (count > 0) {
            selectedCountBadge.classList.remove('d-none');
            btnTweetBatch.classList.remove('d-none');
        } else {
            selectedCountBadge.classList.add('d-none');
            btnTweetBatch.classList.add('d-none');
        }
    }

    // ==========================================================================
    // 4. Twitter Share & Modal Logic
    // ==========================================================================

    // Truncate helper to make text fit X limits elegantly
    function truncateText(text, limit) {
        if (text.length <= limit) return text;
        const sub = text.substring(0, limit - 3);
        // Try to snap to last word space
        const lastSpace = sub.lastIndexOf(' ');
        if (lastSpace > limit * 0.75) {
            return sub.substring(0, lastSpace) + '...';
        }
        return sub + '...';
    }

    function buildTweetDraft() {
        if (activeTweetId) {
            // SINGLE TWEET drafting
            const item = updates.find(x => x.id === activeTweetId);
            if (!item) return '';

            // Strip extra markup from text and format nicely
            let bodyText = item.content_text;
            
            // Truncation limits calculations
            // Core templates:
            // Standard: "BigQuery Release Note ({date}):\n\n[{type}] {body}\n\nSource: {link}"
            // Bullet: "BigQuery Update • {date}\n⚡ Type: {type}\n\n📝 {body}\n\nLink: {link}"
            // Hype: "🚀 NEW BigQuery Release! ({date})\n\n👉 [{type}] {body}\n\nCheck it: {link}"
            
            let draft = '';
            
            if (activeTweetStyle === 'standard') {
                const prefix = `BigQuery Release Note (${item.date}):\n\n[${item.type}] `;
                const suffix = `\n\nSource: ${item.link}`;
                const allowedLength = TWITTER_CHAR_LIMIT - prefix.length - suffix.length;
                
                draft = prefix + truncateText(bodyText, allowedLength) + suffix;
            } 
            else if (activeTweetStyle === 'bullet') {
                const prefix = `BigQuery Update • ${item.date}\n⚡ Type: ${item.type}\n\n📝 `;
                const suffix = `\n\nLink: ${item.link}`;
                const allowedLength = TWITTER_CHAR_LIMIT - prefix.length - suffix.length;
                
                draft = prefix + truncateText(bodyText, allowedLength) + suffix;
            } 
            else if (activeTweetStyle === 'hype') {
                const prefix = `🚀 NEW BigQuery Release! (${item.date})\n\n👉 [${item.type}] `;
                const suffix = `\n\nCheck it out here: ${item.link}`;
                const allowedLength = TWITTER_CHAR_LIMIT - prefix.length - suffix.length;
                
                draft = prefix + truncateText(bodyText, allowedLength) + suffix;
            }
            
            return draft;
        } else {
            // BATCH TWEET (Selected items)
            const selectedItems = updates.filter(x => selectedIds.has(x.id));
            if (selectedItems.length === 0) return '';
            
            // Sort selected items by date (newest first)
            selectedItems.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const mainLink = 'https://cloud.google.com/bigquery/docs/release-notes';
            let draft = '';
            
            if (activeTweetStyle === 'standard') {
                const prefix = `BigQuery Release Notes Summary (${selectedItems.length} updates):\n\n`;
                const suffix = `\n\nFull notes: ${mainLink}`;
                
                // Construct updates body
                let bodyParts = [];
                let allowedLength = TWITTER_CHAR_LIMIT - prefix.length - suffix.length;
                
                selectedItems.forEach(item => {
                    const line = `• [${item.type}] ${item.content_text}`;
                    bodyParts.push(line);
                });
                
                let combinedBody = bodyParts.join('\n');
                draft = prefix + truncateText(combinedBody, allowedLength) + suffix;
            } 
            else if (activeTweetStyle === 'bullet') {
                const prefix = `BigQuery Updates Roundup ⚡\n\n`;
                const suffix = `\n\nRead more: ${mainLink}`;
                
                let bodyParts = [];
                let allowedLength = TWITTER_CHAR_LIMIT - prefix.length - suffix.length;
                
                selectedItems.forEach(item => {
                    const line = `🔹 [${item.type}] ${item.content_text}`;
                    bodyParts.push(line);
                });
                
                let combinedBody = bodyParts.join('\n');
                draft = prefix + truncateText(combinedBody, allowedLength) + suffix;
            } 
            else if (activeTweetStyle === 'hype') {
                const prefix = `🔥 Check out these awesome new BigQuery releases!\n\n`;
                const suffix = `\n\nDetails: ${mainLink}`;
                
                let bodyParts = [];
                let allowedLength = TWITTER_CHAR_LIMIT - prefix.length - suffix.length;
                
                selectedItems.forEach(item => {
                    const line = `👉 [${item.type}] ${item.content_text}`;
                    bodyParts.push(line);
                });
                
                let combinedBody = bodyParts.join('\n');
                draft = prefix + truncateText(combinedBody, allowedLength) + suffix;
            }
            
            return draft;
        }
    }

    function openTweetComposer(id = null) {
        activeTweetId = id;
        
        // Reset modal styles & values
        const draftText = buildTweetDraft();
        tweetTextarea.value = draftText;
        
        updateTweetMetrics(draftText);
        
        // Show modal
        tweetModal.classList.remove('d-none');
        tweetTextarea.focus();
    }

    function closeTweetComposer() {
        tweetModal.classList.add('d-none');
        activeTweetId = null;
    }

    function updateTweetMetrics(text) {
        const count = text.length;
        charCountNumber.textContent = count;
        
        // Update SVG circle progress
        const percent = Math.min(count / TWITTER_CHAR_LIMIT, 1);
        const offset = circleCircumference * (1 - percent);
        if (progressCircle) {
            progressCircle.style.strokeDashoffset = offset;
            
            // Coloring
            if (count > TWITTER_CHAR_LIMIT) {
                progressCircle.style.stroke = '#ef4444'; // Red
                charCountNumber.style.color = '#ef4444';
            } else if (count >= TWITTER_CHAR_LIMIT - 30) {
                progressCircle.style.stroke = '#f59e0b'; // Amber
                charCountNumber.style.color = '#f59e0b';
            } else {
                progressCircle.style.stroke = '#1a73e8'; // Blue
                charCountNumber.style.color = '#94a3b8';
            }
        }
        
        // Handle tweet submit button disabled state if empty or too long
        btnTweetSubmit.disabled = count === 0 || count > TWITTER_CHAR_LIMIT;
        
        // Update the live Twitter-styled preview card
        // Parse links in preview and highlight them
        let previewHtml = escapeHtml(text);
        
        // regex match URLs and wrap them in anchors
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        previewHtml = previewHtml.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
        
        xTweetPreviewText.innerHTML = previewHtml;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function shareOnTwitter() {
        const text = tweetTextarea.value.trim();
        if (!text || text.length > TWITTER_CHAR_LIMIT) return;
        
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank', 'width=550,height=420,toolbar=no,menubar=no,scrollbars=yes');
        
        closeTweetComposer();
        showToast('Opened Twitter share dialog!');
    }

    // ==========================================================================
    // 5. Toast Notification
    // ==========================================================================

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.remove('d-none');
        
        // Simple 3 seconds active state
        setTimeout(() => {
            toast.classList.add('d-none');
        }, 3000);
    }

    // ==========================================================================
    // 6. Event Listeners Wire-up
    // ==========================================================================

    // Refresh Action
    btnRefresh.addEventListener('click', fetchReleases);
    btnRetry.addEventListener('click', fetchReleases);

    // Search Box Actions
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        applyFiltersAndRender();
    });

    btnSearchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        applyFiltersAndRender();
        searchInput.focus();
    });

    // Chip Filter Actions
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Remove active from all siblings
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            activeFilter = chip.dataset.type;
            applyFiltersAndRender();
        });
    });

    // Batch Tweet Click
    btnTweetBatch.addEventListener('click', () => {
        openTweetComposer(null); // null means selected batch mode
    });

    // Modal Actions
    btnModalClose.addEventListener('click', closeTweetComposer);
    btnModalCancel.addEventListener('click', closeTweetComposer);
    btnTweetSubmit.addEventListener('click', shareOnTwitter);
    
    // Live update on text composing
    tweetTextarea.addEventListener('input', (e) => {
        updateTweetMetrics(e.target.value);
    });

    // Modal template switching
    templateButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            templateButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            activeTweetStyle = btn.dataset.template;
            const draftText = buildTweetDraft();
            tweetTextarea.value = draftText;
            updateTweetMetrics(draftText);
        });
    });

    // Close modal on click outside content
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetComposer();
        }
    });

    // Initial Load
    fetchReleases();
});

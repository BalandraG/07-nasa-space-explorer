// ============================================================
// NASA Space Explorer — application logic
// Custom JavaScript belongs here. Do not edit dateRange.js.
// ============================================================

const EARLIEST_APOD_DATE = '1995-06-16';
const MAX_RANGE_DAYS = 30;
const VISIBLE_THUMBS = 3;
const GALLERY_PAGE_SIZE = 9;
const IMAGE_OVERLAY_DELAY_MS = 200;
const IMAGE_FADE_MS = 250;
const IMAGE_RETRY_DELAY_MS = 1000;
const VIDEO_PLACEHOLDER_SRC = 'img/video-placeholder.svg';

// Compact, scientifically accurate facts for the "Did You Know?" panel.
const SPACE_FACTS = [
  'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
  'One day on Venus is longer than one year on Venus because Venus rotates very slowly.',
  'Jupiter’s Great Red Spot is a storm large enough to fit more than one Earth across.',
  'Neutron stars can spin dozens of times per second and pack more mass than the Sun into a city-sized sphere.',
  'The Milky Way and the Andromeda Galaxy are approaching and are expected to merge in billions of years.',
  'There are more stars in the observable universe than grains of sand on all of Earth’s beaches.',
  'Saturn’s rings are made mostly of ice particles ranging from tiny grains to house-sized chunks.',
  'A black hole’s event horizon is the boundary beyond which nothing, not even light, can escape.',
  'Earth’s magnetic field helps shield the atmosphere from the solar wind.',
  'Olympus Mons on Mars is the tallest known volcano in the Solar System, about 22 kilometers high.',
  'The International Space Station orbits Earth roughly every 90 minutes.',
  'Most of the atoms in your body were forged inside stars before the Solar System formed.'
];

// Current NASA APOD endpoint (WordPress API). Path /{YYMMDD} returns one day.
const APOD_BASE_URL = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic';

// ----- DOM references -----
let startInput = document.getElementById('startDate');
let endInput = document.getElementById('endDate');
const exploreBtn = document.getElementById('explore-btn');
const validationError = document.getElementById('validation-error');
const datesNotApplied = document.getElementById('dates-not-applied');
const rangeBadge = document.getElementById('range-badge');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const galleryPlaceholder = document.getElementById('gallery-placeholder');
const featuredBlock = document.getElementById('featured-block');
const featuredFrame = document.getElementById('featured-frame');
const featuredMediaStack = document.getElementById('featured-media-stack');
const featuredLoadingOverlay = document.getElementById('featured-loading-overlay');
const featuredStatus = document.getElementById('featured-status');
const featuredTitle = document.getElementById('featured-title');
const featuredDateText = document.getElementById('featured-date-text');
const viewDetailsBtn = document.getElementById('view-details-btn');
const thumbnailCarousel = document.getElementById('thumbnail-carousel');
const carouselWindow = document.getElementById('carousel-window');
const carouselPrev = document.getElementById('carousel-prev');
const carouselNext = document.getElementById('carousel-next');
const galleryToggleWrap = document.getElementById('gallery-toggle-wrap');
const toggleGalleryBtn = document.getElementById('toggle-gallery-btn');
const expandedGallery = document.getElementById('expanded-gallery');
const galleryGrid = document.getElementById('gallery-grid');
const galleryEmpty = document.getElementById('gallery-empty');
const galleryEmptyMessage = document.getElementById('gallery-empty-message');
const galleryResultCount = document.getElementById('gallery-result-count');
const gallerySearchInput = document.getElementById('gallery-search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const activeSearchIndicator = document.getElementById('active-search-indicator');
const loadMoreBtn = document.getElementById('load-more-btn');
const emptyClearSearchBtn = document.getElementById('empty-clear-search');
const emptyShowAllMediaBtn = document.getElementById('empty-show-all-media');
const sortNewestBtn = document.getElementById('sort-newest');
const sortOldestBtn = document.getElementById('sort-oldest');
const filterAllBtn = document.getElementById('filter-all');
const filterImagesBtn = document.getElementById('filter-images');
const filterVideosBtn = document.getElementById('filter-videos');
const brandHome = document.getElementById('brand-home');
const navExplore = document.getElementById('nav-explore');
const navGallery = document.getElementById('nav-gallery');
const presetButtons = Array.from(document.querySelectorAll('.preset-btn'));
const modalBackdrop = document.getElementById('modal-backdrop');
const apodModal = document.getElementById('apod-modal');
const modalTitle = document.getElementById('modal-title');
const modalDate = document.getElementById('modal-date');
const modalClose = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');
const modalMedia = document.getElementById('modal-media');
const modalMediaLoading = document.getElementById('modal-media-loading');
const modalMediaContent = document.getElementById('modal-media-content');
const modalCredit = document.getElementById('modal-credit');
const modalExplanation = document.getElementById('modal-explanation');
const modalPrev = document.getElementById('modal-prev');
const modalNext = document.getElementById('modal-next');
const modalPosition = document.getElementById('modal-position');
const modalLive = document.getElementById('modal-live');
const fullscreenViewer = document.getElementById('fullscreen-viewer');
const fullscreenTitle = document.getElementById('fullscreen-title');
const fullscreenDate = document.getElementById('fullscreen-date');
const fullscreenCredit = document.getElementById('fullscreen-credit');
const fullscreenClose = document.getElementById('fullscreen-close');
const fullscreenStage = document.getElementById('fullscreen-stage');
const fullscreenLoading = document.getElementById('fullscreen-loading');
const fullscreenError = document.getElementById('fullscreen-error');
const fullscreenErrorMessage = document.getElementById('fullscreen-error-message');
const fullscreenRetry = document.getElementById('fullscreen-retry');
const fullscreenImage = document.getElementById('fullscreen-image');
const fullscreenOriginal = document.getElementById('fullscreen-original');
const spaceFactText = document.getElementById('space-fact-text');

/**
 * Instructor setupDateInputs() sets min/max and adds an anonymous start-date
 * listener that forces end = start + 8. Cloning the start input once after setup
 * preserves min/max while allowing independent date editing.
 */
setupDateInputs(startInput, endInput);
startInput = detachInstructorStartDateAutoAdjust(startInput);

function detachInstructorStartDateAutoAdjust(input) {
  const clone = input.cloneNode(true);
  input.replaceWith(clone);
  return clone;
}

// ----- Centralized application state -----
const appState = {
  entries: [],
  loadedRange: { start: null, end: null },
  status: 'idle', // idle | loading | success | error
  errorMessage: null,
  selectedDate: null,
  displayedDate: null,
  carouselIndex: 0,
  focusIndex: 0,
  galleryExpanded: false,
  searchQuery: '',
  filterMediaType: 'all', // all | image | video
  sortOrder: 'newest', // newest | oldest
  visibleCount: GALLERY_PAGE_SIZE,
  expandedSummaryDate: null,
  modal: {
    open: false,
    entryDate: null,
    opener: null,
    loadId: 0,
    lastFocused: null,
    scrollTop: 0
  },
  fullscreen: {
    open: false,
    entryDate: null,
    opener: null,
    loadId: 0,
    originalUrl: ''
  },
  activePreset: 7,
  abortController: null,
  requestId: 0,
  featuredLoadId: 0,
  overlayTimer: null,
  retryTimer: null
};

// ============================================================
// Date helpers
// ============================================================

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayLocal() {
  return formatLocalDate(new Date());
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function daysInclusive(startDate, endDate) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function getDatesInRange(startDate, endDate) {
  const dates = [];
  const current = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (current <= end) {
    dates.push(formatLocalDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function toApodDateSlug(dateString) {
  const [year, month, day] = dateString.split('-');
  return `${year.slice(2)}${month}${day}`;
}

function clampStartForPreset(days) {
  const today = getTodayLocal();
  let start = addDays(today, -(days - 1));
  if (start < EARLIEST_APOD_DATE) {
    start = EARLIEST_APOD_DATE;
  }
  return { start, end: today };
}

function applyInitialSevenDayRange() {
  const range = clampStartForPreset(7);
  startInput.value = range.start;
  endInput.value = range.end;
  setActivePreset(7);
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ============================================================
// UI: presets, validation, nav
// ============================================================

function setActivePreset(days) {
  appState.activePreset = days;
  presetButtons.forEach((button) => {
    const isActive = Number(button.dataset.days) === days;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function clearActivePreset() {
  appState.activePreset = null;
  presetButtons.forEach((button) => {
    button.classList.remove('is-active');
    button.setAttribute('aria-pressed', 'false');
  });
}

function showValidationError(message) {
  validationError.textContent = message;
  validationError.hidden = !message;
}

function clearValidationError() {
  showValidationError('');
}

function inputsMatchLoadedRange() {
  if (!appState.loadedRange.start || !appState.loadedRange.end) {
    return false;
  }
  return (
    startInput.value === appState.loadedRange.start &&
    endInput.value === appState.loadedRange.end
  );
}

function updateDatesNotAppliedIndicator() {
  const show =
    Boolean(startInput.value && endInput.value) &&
    !inputsMatchLoadedRange() &&
    appState.status !== 'loading';
  datesNotApplied.hidden = !show;
}

function setNavActive(section) {
  navExplore.classList.toggle('is-active', section === 'explore');
  navGallery.classList.toggle('is-active', section === 'gallery');

  if (section === 'explore') {
    navExplore.setAttribute('aria-current', 'true');
    navGallery.removeAttribute('aria-current');
  } else if (section === 'gallery') {
    navGallery.setAttribute('aria-current', 'true');
    navExplore.removeAttribute('aria-current');
  } else {
    navExplore.removeAttribute('aria-current');
    navGallery.removeAttribute('aria-current');
  }
}

function validateDateInputs() {
  const startDate = startInput.value;
  const endDate = endInput.value;
  const today = getTodayLocal();

  if (!startDate || !endDate) {
    return 'Please select both a start date and an end date.';
  }
  if (startDate > endDate) {
    return 'Start date must be on or before the end date.';
  }
  if (startDate < EARLIEST_APOD_DATE) {
    return `Start date cannot be earlier than ${EARLIEST_APOD_DATE}.`;
  }
  if (endDate > today || startDate > today) {
    return 'Future dates are not available.';
  }

  const count = daysInclusive(startDate, endDate);
  if (count > MAX_RANGE_DAYS) {
    return `Please choose a range of ${MAX_RANGE_DAYS} days or fewer (currently ${count}).`;
  }

  return null;
}

// ============================================================
// API integration
// ============================================================

function normalizeApodEntry(raw, requestedDate) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      return null;
    }
    return normalizeApodEntry(raw[0], requestedDate);
  }

  if (raw.error || raw.code) {
    return null;
  }

  const date = raw.date || requestedDate;
  if (!date) {
    return null;
  }

  const mediaType = (raw.media_type || 'image').toLowerCase();
  const videoSource = extractVideoSource(raw);
  // WordPress APOD: `url` is usually a permalink. Legacy APOD may use `url` as a standard image.
  const directUrl = isDirectImageUrl(raw.url) ? raw.url : '';
  const hdurl = raw.hdurl || '';

  return {
    date,
    title: raw.title || 'Untitled APOD',
    explanation: raw.explanation || '',
    media_type: mediaType,
    url: raw.url || '',
    hdurl,
    image_url: hdurl || directUrl,
    standard_url: directUrl && directUrl !== hdurl ? directUrl : '',
    permalink: raw.permalink || (!directUrl ? raw.url : '') || '',
    alt: raw.alt || raw.title || 'Astronomy Picture of the Day',
    credit: raw.credit || '',
    copyright: raw.copyright || '',
    basic_html: raw.basic_html || '',
    video_src: videoSource,
    thumbnail: hdurl || directUrl || '',
    raw
  };
}

function isDirectImageUrl(url) {
  if (!url) {
    return false;
  }
  const value = String(url);
  // data: URLs are valid image sources.
  if (/^data:image\//i.test(value)) {
    return true;
  }
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(value);
}

/**
 * Resolve preview/original image URLs for fullscreen.
 * WordPress APOD typically only has hdurl; legacy APIs may have standard + HD.
 */
function getFullscreenImageSources(entry) {
  if (!entry) {
    return { preview: '', original: '', hasUpgrade: false };
  }

  const hd = isDirectImageUrl(entry.hdurl) ? entry.hdurl : '';
  const standard = isDirectImageUrl(entry.standard_url)
    ? entry.standard_url
    : isDirectImageUrl(entry.url) && entry.url !== hd
      ? entry.url
      : '';

  if (standard && hd && standard !== hd) {
    return { preview: standard, original: hd, hasUpgrade: true };
  }

  if (hd) {
    return { preview: hd, original: hd, hasUpgrade: false };
  }

  if (standard) {
    return { preview: standard, original: standard, hasUpgrade: false };
  }

  if (isDirectImageUrl(entry.image_url)) {
    return {
      preview: entry.image_url,
      original: entry.image_url,
      hasUpgrade: false
    };
  }

  return { preview: '', original: '', hasUpgrade: false };
}

function extractVideoSource(entry) {
  if (!entry) {
    return '';
  }

  if (entry.basic_html) {
    const sourceMatch = String(entry.basic_html).match(
      /<source[^>]+src=["']([^"']+)["']/i
    );
    if (sourceMatch) {
      return sourceMatch[1];
    }

    const videoMatch = String(entry.basic_html).match(
      /<video[^>]+src=["']([^"']+)["']/i
    );
    if (videoMatch) {
      return videoMatch[1];
    }

    const iframeMatch = String(entry.basic_html).match(
      /<iframe[^>]+src=["']([^"']+)["']/i
    );
    if (iframeMatch) {
      return iframeMatch[1];
    }
  }

  if (entry.url && /\.(mp4|webm)(\?|$)/i.test(entry.url)) {
    return entry.url;
  }

  return '';
}

function getFallbackImageUrl(entry, primaryUrl) {
  // Only use another NASA-provided image URL for the same entry when present.
  // On the WordPress APOD API, `url` is usually a permalink, not a media file.
  if (!entry) {
    return '';
  }

  const candidates = [
    entry.hdurl,
    entry.standard_url,
    entry.image_url,
    entry.thumbnail,
    entry.url
  ];
  for (const candidate of candidates) {
    if (
      candidate &&
      candidate !== primaryUrl &&
      /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(candidate)
    ) {
      return candidate;
    }
  }

  return '';
}

async function fetchApodByDate(dateString, signal) {
  const slug = toApodDateSlug(dateString);
  const response = await fetch(`${APOD_BASE_URL}/${slug}`, { signal });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`APOD request failed for ${dateString} (HTTP ${response.status})`);
  }

  const data = await response.json();
  return normalizeApodEntry(data, dateString);
}

async function fetchApodRange(startDate, endDate) {
  if (appState.abortController) {
    appState.abortController.abort();
  }

  const controller = new AbortController();
  appState.abortController = controller;
  const requestId = ++appState.requestId;

  appState.status = 'loading';
  appState.errorMessage = null;
  renderStatus();
  updateDatesNotAppliedIndicator();

  const dates = getDatesInRange(startDate, endDate);
  let hadRequestFailure = false;

  try {
    const settled = await Promise.all(
      dates.map(async (dateString) => {
        try {
          return await fetchApodByDate(dateString, controller.signal);
        } catch (error) {
          if (error.name === 'AbortError') {
            throw error;
          }
          hadRequestFailure = true;
          console.warn(error.message || error);
          return null;
        }
      })
    );

    if (requestId !== appState.requestId) {
      return;
    }

    const entries = settled
      .filter(Boolean)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    if (entries.length === 0) {
      appState.status = 'error';
      if (appState.entries.length) {
        appState.errorMessage = 'Could not load that date range. Your previous results are still shown.';
      } else if (!navigator.onLine) {
        appState.errorMessage =
          'You are offline and this date range has no cached APOD data. Reconnect or try a previously loaded date range.';
      } else if (hadRequestFailure) {
        appState.errorMessage =
          'Could not retrieve APOD data for that date range. Check your connection or try again.';
      } else {
        appState.errorMessage =
          'No Astronomy Pictures were available for that date range. Try different dates.';
      }
      renderStatus();
      updateDatesNotAppliedIndicator();
      return;
    }

    cancelFeaturedLoading();
    appState.entries = entries;
    appState.loadedRange = { start: startDate, end: endDate };
    appState.selectedDate = entries[0].date;
    appState.displayedDate = null;
    appState.carouselIndex = 0;
    appState.focusIndex = 0;
    appState.visibleCount = GALLERY_PAGE_SIZE;
    appState.expandedSummaryDate = null;
    appState.status = hadRequestFailure ? 'error' : 'success';
    appState.errorMessage = hadRequestFailure
      ? navigator.onLine
        ? 'Some APOD dates could not be retrieved. Showing the dates that were available.'
        : 'You are offline. Showing available cached APOD data; reconnect to load the remaining dates.'
      : null;

    clearValidationError();
    renderStatus();
    renderCarousel();
    updateGalleryToggleVisibility();
    selectEntry(entries[0].date, { fromRangeLoad: true, scrollIntoView: false });
    syncSearchInputFromState();
    renderExpandedGallery({ animateNew: false });
    updateDatesNotAppliedIndicator();
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }

    if (requestId !== appState.requestId) {
      return;
    }

    console.error('Unable to retrieve APOD data:', error);
    appState.status = 'error';
    appState.errorMessage =
      'Unable to load images right now. Your previous results are still available if loaded.';
    renderStatus();
    updateDatesNotAppliedIndicator();
  }
}

// ============================================================
// Rendering helpers
// ============================================================

function renderStatus() {
  const isLoading = appState.status === 'loading';
  const isError = appState.status === 'error';
  const hasEntries = appState.entries.length > 0;

  loadingState.hidden = !isLoading;
  errorState.hidden = !isError;
  if (isError) {
    errorMessage.textContent = appState.errorMessage || 'Unable to load images.';
  }

  galleryPlaceholder.hidden = hasEntries || isLoading;
  if (!hasEntries && !isLoading && !isError) {
    galleryPlaceholder.hidden = false;
  }

  if (appState.loadedRange.start && appState.loadedRange.end) {
    rangeBadge.textContent = `${appState.loadedRange.start} → ${appState.loadedRange.end}`;
  } else {
    rangeBadge.textContent = 'No range loaded yet';
  }

  exploreBtn.disabled = isLoading;
}

function getSelectedEntry() {
  return appState.entries.find((entry) => entry.date === appState.selectedDate) || null;
}

function getEntryByDate(date) {
  return appState.entries.find((entry) => entry.date === date) || null;
}

function getEntryIndex(date) {
  return appState.entries.findIndex((entry) => entry.date === date);
}

function shortenTitle(title, maxLength = 28) {
  const text = String(title || '').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function isVideoEntry(entry) {
  return Boolean(entry && (entry.media_type === 'video' || entry.media_type === 'iframe'));
}

function toSafeEmbedUrl(url) {
  try {
    const absolute = String(url || '').startsWith('//') ? `https:${url}` : url;
    const parsed = new URL(absolute, window.location.href);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.pathname.includes('/embed/')) {
        return `https://www.youtube-nocookie.com${parsed.pathname}${parsed.search}`;
      }
      if (parsed.searchParams.has('v')) {
        return `https://www.youtube-nocookie.com/embed/${parsed.searchParams.get('v')}`;
      }
    }

    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      if (id) {
        return `https://www.youtube-nocookie.com/embed/${id}`;
      }
    }

    // Do not embed arbitrary third-party URLs in iframes.
    return '';
  } catch (error) {
    return '';
  }
}

function setFeaturedMeta(entry) {
  if (!entry) {
    return;
  }
  featuredTitle.textContent = entry.title;
  featuredDateText.textContent = entry.date;
  viewDetailsBtn.disabled = false;
  viewDetailsBtn.title = 'Open explanation details';
  viewDetailsBtn.setAttribute('aria-label', `View details for ${entry.title}`);
  appState.displayedDate = entry.date;
}

function setFeaturedStatus(message) {
  featuredStatus.textContent = message || '';
}

function cancelFeaturedLoading() {
  appState.featuredLoadId += 1;
  if (appState.overlayTimer) {
    clearTimeout(appState.overlayTimer);
    appState.overlayTimer = null;
  }
  if (appState.retryTimer) {
    clearTimeout(appState.retryTimer);
    appState.retryTimer = null;
  }
  featuredLoadingOverlay.hidden = true;
  setFeaturedStatus('');
}

function showLoadingOverlaySoon(loadId) {
  if (appState.overlayTimer) {
    clearTimeout(appState.overlayTimer);
  }

  appState.overlayTimer = setTimeout(() => {
    if (loadId !== appState.featuredLoadId) {
      return;
    }
    featuredLoadingOverlay.hidden = false;
    setFeaturedStatus('Loading image…');
  }, IMAGE_OVERLAY_DELAY_MS);
}

function hideLoadingOverlay() {
  if (appState.overlayTimer) {
    clearTimeout(appState.overlayTimer);
    appState.overlayTimer = null;
  }
  featuredLoadingOverlay.hidden = true;
}

function createMediaLayer() {
  const layer = document.createElement('div');
  layer.className = 'featured-media-layer';
  return layer;
}

function createSignalLost(entry, onRetry) {
  const wrap = document.createElement('div');
  wrap.className = 'featured-signal-lost';
  wrap.innerHTML = `
    <svg class="signal-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="10" fill="none" stroke="currentColor" stroke-width="3"/>
      <path d="M18 18c8-8 20-8 28 0M12 12c12-12 28-12 40 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M32 42v8M26 54h12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
    <p><strong>Signal Lost</strong></p>
    <p>Unable to load this image right now.</p>
  `;

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn btn-secondary';
  retry.textContent = 'Retry Image';
  retry.addEventListener('click', onRetry);
  wrap.appendChild(retry);
  return wrap;
}

/**
 * Keep previous media visible until the next image is ready.
 * Title/date stay synced with the currently displayed media.
 */
function renderFeaturedForEntry(entry, options = {}) {
  const { forceReload = false } = options;
  if (!entry) {
    featuredBlock.hidden = true;
    return;
  }

  featuredBlock.hidden = false;

  // Skip reload when the requested image is already presented.
  if (
    !forceReload &&
    appState.displayedDate === entry.date &&
    featuredMediaStack.querySelector(
      '.featured-media-layer img, .featured-media-layer video, .featured-media-layer iframe, .featured-signal-lost'
    )
  ) {
    setFeaturedMeta(entry);
    hideLoadingOverlay();
    setFeaturedStatus('');
    return;
  }

  cancelFeaturedLoading();
  const loadId = appState.featuredLoadId;

  if (isVideoEntry(entry)) {
    setFeaturedMeta(entry);
    renderFeaturedVideo(entry, loadId);
    return;
  }

  const imageUrl = entry.hdurl || entry.image_url || '';
  if (!imageUrl) {
    setFeaturedMeta(entry);
    renderSignalLostLayer(entry, loadId);
    return;
  }

  loadFeaturedImage(entry, imageUrl, {
    loadId,
    attempt: 1,
    forceReload
  });
}

function renderFeaturedVideo(entry, loadId) {
  if (loadId !== appState.featuredLoadId) {
    return;
  }

  const layer = createMediaLayer();
  layer.classList.add('is-visible');

  if (entry.video_src && /\.(mp4|webm)(\?|$)/i.test(entry.video_src)) {
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('controlslist', 'nodownload');
    if (entry.thumbnail) {
      video.poster = entry.thumbnail;
    }
    video.setAttribute('aria-label', entry.title);

    const source = document.createElement('source');
    source.src = entry.video_src;
    source.type = entry.video_src.includes('.webm') ? 'video/webm' : 'video/mp4';
    video.appendChild(source);
    layer.appendChild(video);
  } else if (entry.video_src) {
    const embedUrl = toSafeEmbedUrl(entry.video_src);
    if (embedUrl) {
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.title = entry.title;
      iframe.allow =
        'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.setAttribute(
        'sandbox',
        'allow-scripts allow-same-origin allow-presentation allow-popups'
      );
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      layer.appendChild(iframe);
    } else if (entry.hdurl) {
      const img = document.createElement('img');
      img.src = entry.hdurl;
      img.alt = `${entry.title} (video poster)`;
      layer.appendChild(img);
    } else {
      layer.appendChild(
        createSignalLost(entry, () => {
          selectEntry(entry.date, { forceReload: true, scrollIntoView: false });
        })
      );
    }
  } else if (entry.hdurl) {
    const img = document.createElement('img');
    img.src = entry.hdurl;
    img.alt = `${entry.title} (video poster)`;
    layer.appendChild(img);
  } else {
    layer.appendChild(createSignalLost(entry, () => {
      selectEntry(entry.date, { forceReload: true, scrollIntoView: false });
    }));
  }

  replaceFeaturedLayer(layer, { immediate: true });
  hideLoadingOverlay();
  setFeaturedStatus('');
}

function presentFeaturedImage(entry, img, loadId) {
  if (loadId !== appState.featuredLoadId || appState.selectedDate !== entry.date) {
    return;
  }

  const layer = createMediaLayer();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'featured-image-button';
  button.setAttribute('aria-label', `View details for ${entry.title}`);
  button.addEventListener('click', handleFeaturedImageActivate);
  button.appendChild(img);
  layer.appendChild(button);

  setFeaturedMeta(entry);
  commitFeaturedImageLayer(layer, loadId);
}

function loadFeaturedImage(entry, imageUrl, context) {
  const { loadId, attempt } = context;
  if (loadId !== appState.featuredLoadId) {
    return;
  }

  showLoadingOverlaySoon(loadId);

  const img = new Image();
  img.decoding = 'async';
  img.alt = entry.alt || entry.title;

  let settled = false;
  const settleSuccess = () => {
    if (settled) {
      return;
    }
    settled = true;
    presentFeaturedImage(entry, img, loadId);
  };

  const settleError = () => {
    if (settled) {
      return;
    }
    settled = true;

    if (loadId !== appState.featuredLoadId || appState.selectedDate !== entry.date) {
      return;
    }

    if (attempt === 1) {
      setFeaturedStatus('Retrying image…');
      featuredLoadingOverlay.hidden = false;
      appState.retryTimer = setTimeout(() => {
        if (loadId !== appState.featuredLoadId || appState.selectedDate !== entry.date) {
          return;
        }

        const fallback = getFallbackImageUrl(entry, imageUrl);
        const nextUrl = fallback || imageUrl;
        loadFeaturedImage(entry, nextUrl, {
          loadId,
          attempt: 2
        });
      }, IMAGE_RETRY_DELAY_MS);
      return;
    }

    setFeaturedMeta(entry);
    renderSignalLostLayer(entry, loadId);
  };

  img.onload = settleSuccess;
  img.onerror = settleError;
  img.src = imageUrl;

  // Cached images can be complete immediately after assigning src.
  if (img.complete && img.naturalWidth > 0) {
    settleSuccess();
  }
}

function commitFeaturedImageLayer(layer, loadId) {
  if (loadId !== appState.featuredLoadId) {
    return;
  }

  const reduceMotion = prefersReducedMotion();
  // Capture every existing layer so overlapping crossfades cannot leave
  // stale layers behind — each commit cleans up all layers before it.
  const previousLayers = Array.from(
    featuredMediaStack.querySelectorAll('.featured-media-layer')
  ).filter((el) => el !== layer);

  if (!previousLayers.length || reduceMotion) {
    replaceFeaturedLayer(layer, { immediate: true });
    hideLoadingOverlay();
    setFeaturedStatus('');
    return;
  }

  layer.classList.add('is-entering');
  featuredMediaStack.appendChild(layer);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (loadId !== appState.featuredLoadId) {
        return;
      }

      previousLayers.forEach((el) => el.classList.add('is-fading-out'));
      layer.classList.remove('is-entering');
      layer.classList.add('is-visible');
      hideLoadingOverlay();
      setFeaturedStatus('');

      setTimeout(() => {
        previousLayers.forEach((el) => {
          if (el.parentNode === featuredMediaStack) {
            el.remove();
          }
        });
      }, IMAGE_FADE_MS);
    });
  });
}

function replaceFeaturedLayer(layer, { immediate = false } = {}) {
  featuredMediaStack.replaceChildren();
  if (immediate) {
    layer.classList.add('is-visible');
  }
  featuredMediaStack.appendChild(layer);
}

function renderSignalLostLayer(entry, loadId) {
  if (loadId !== appState.featuredLoadId) {
    return;
  }

  const layer = createMediaLayer();
  layer.classList.add('is-visible');
  layer.appendChild(
    createSignalLost(entry, () => {
      selectEntry(entry.date, { forceReload: true, scrollIntoView: false });
    })
  );
  replaceFeaturedLayer(layer, { immediate: true });
  hideLoadingOverlay();
  setFeaturedStatus('Image unavailable. Signal lost.');
}

function handleFeaturedImageActivate(event) {
  event.preventDefault();
  const date = appState.selectedDate || appState.displayedDate;
  if (!date) {
    return;
  }
  openExplanationModal(date, event.currentTarget);
}

// ============================================================
// Selection + carousel
// ============================================================

function selectEntry(date, options = {}) {
  const {
    scrollIntoView = false,
    forceReload = false,
    fromRangeLoad = false,
    syncFocus = true
  } = options;

  const entry = getEntryByDate(date);
  if (!entry) {
    return;
  }

  const index = getEntryIndex(date);
  appState.selectedDate = date;
  if (syncFocus) {
    appState.focusIndex = index;
  }

  ensureCarouselShowsIndex(index);
  updateCarouselSelectionStyles();
  updateGalleryCardSelectionStyles();

  if (!fromRangeLoad && scrollIntoView) {
    scrollFeaturedIntoViewIfNeeded();
  }

  renderFeaturedForEntry(entry, { forceReload });
}

function getMaxCarouselIndex() {
  return Math.max(0, appState.entries.length - VISIBLE_THUMBS);
}

function ensureCarouselShowsIndex(index) {
  if (index < appState.carouselIndex) {
    appState.carouselIndex = index;
  } else if (index > appState.carouselIndex + VISIBLE_THUMBS - 1) {
    appState.carouselIndex = index - VISIBLE_THUMBS + 1;
  }

  appState.carouselIndex = Math.min(
    Math.max(0, appState.carouselIndex),
    getMaxCarouselIndex()
  );
  renderCarousel();
}

function moveCarouselWindow(delta) {
  const next = Math.min(
    Math.max(0, appState.carouselIndex + delta),
    getMaxCarouselIndex()
  );
  if (next === appState.carouselIndex) {
    return;
  }
  appState.carouselIndex = next;
  renderCarousel();
}

function renderCarousel() {
  const entries = appState.entries;

  if (!entries.length) {
    thumbnailCarousel.hidden = true;
    carouselWindow.replaceChildren();
    updateGalleryToggleVisibility();
    return;
  }

  thumbnailCarousel.hidden = false;
  updateGalleryToggleVisibility();
  const maxIndex = getMaxCarouselIndex();
  appState.carouselIndex = Math.min(appState.carouselIndex, maxIndex);

  const slice = entries.slice(
    appState.carouselIndex,
    appState.carouselIndex + VISIBLE_THUMBS
  );

  carouselWindow.replaceChildren();

  slice.forEach((entry, offset) => {
    const absoluteIndex = appState.carouselIndex + offset;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb-item';
    button.setAttribute('role', 'option');
    button.dataset.date = entry.date;
    button.dataset.index = String(absoluteIndex);
    // Accessible name comes from the visible date + title text below,
    // keeping it in sync with what sighted users see (voice control).
    button.setAttribute(
      'aria-selected',
      entry.date === appState.selectedDate ? 'true' : 'false'
    );
    button.tabIndex = absoluteIndex === appState.focusIndex ? 0 : -1;

    if (entry.date === appState.selectedDate) {
      button.classList.add('is-selected');
    }

    const media = document.createElement('div');
    media.className = 'thumb-media';

    const preview = entry.thumbnail || entry.hdurl;
    if (preview) {
      const img = document.createElement('img');
      img.src = preview;
      img.alt = '';
      media.appendChild(img);
    } else if (isVideoEntry(entry)) {
      const img = document.createElement('img');
      img.src = VIDEO_PLACEHOLDER_SRC;
      img.alt = '';
      media.appendChild(img);
    }

    const thumbImg = media.querySelector('img');
    if (thumbImg && isVideoEntry(entry)) {
      thumbImg.addEventListener('error', () => {
        if (thumbImg.src.includes(VIDEO_PLACEHOLDER_SRC)) {
          return;
        }
        thumbImg.src = VIDEO_PLACEHOLDER_SRC;
      });
    }

    if (isVideoEntry(entry)) {
      const play = document.createElement('span');
      play.className = 'thumb-play';
      play.setAttribute('aria-hidden', 'true');
      play.innerHTML = `
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.45)"/>
          <path d="M10 8 L17 12 L10 16 Z" fill="#fff"/>
        </svg>
      `;
      media.appendChild(play);
    }

    const label = document.createElement('div');
    label.className = 'thumb-label';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'thumb-label-date';
    dateSpan.textContent = entry.date;
    const titleSpan = document.createElement('span');
    titleSpan.className = 'thumb-label-title';
    titleSpan.textContent = shortenTitle(entry.title);
    label.appendChild(dateSpan);
    label.appendChild(titleSpan);

    button.appendChild(media);
    button.appendChild(label);

    button.addEventListener('click', () => {
      const shouldScroll =
        window.matchMedia('(max-width: 639px)').matches &&
        !isFeaturedFullyVisible();
      selectEntry(entry.date, { scrollIntoView: shouldScroll, syncFocus: true });
    });

    carouselWindow.appendChild(button);
  });

  carouselPrev.disabled = appState.carouselIndex <= 0;
  carouselNext.disabled = appState.carouselIndex >= maxIndex;
}

function updateCarouselSelectionStyles() {
  const buttons = carouselWindow.querySelectorAll('.thumb-item');
  buttons.forEach((button) => {
    const date = button.dataset.date;
    const index = Number(button.dataset.index);
    const selected = date === appState.selectedDate;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
    button.tabIndex = index === appState.focusIndex ? 0 : -1;
  });
}

function focusThumbnailAtIndex(index, { moveWindow = true } = {}) {
  if (!appState.entries.length) {
    return;
  }

  const clamped = Math.min(Math.max(0, index), appState.entries.length - 1);
  appState.focusIndex = clamped;

  if (moveWindow) {
    ensureCarouselShowsIndex(clamped);
  } else {
    updateCarouselSelectionStyles();
  }

  const target = carouselWindow.querySelector(`.thumb-item[data-index="${clamped}"]`);
  if (target) {
    target.focus({ preventScroll: true });
  }
}

function isFeaturedFullyVisible() {
  const rect = featuredBlock.getBoundingClientRect();
  const headerOffset = 56;
  return rect.top >= headerOffset && rect.bottom <= window.innerHeight;
}

function scrollFeaturedIntoViewIfNeeded() {
  if (isFeaturedFullyVisible()) {
    return;
  }

  const headerOffset = 56;
  const top = window.scrollY + featuredBlock.getBoundingClientRect().top - headerOffset;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth'
  });
}

// ============================================================
// Carousel keyboard + swipe
// ============================================================

function handleCarouselKeydown(event) {
  if (!appState.entries.length) {
    return;
  }

  const key = event.key;
  if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Enter' && key !== ' ') {
    return;
  }

  // Only handle when focus is inside the carousel controls/window.
  if (!thumbnailCarousel.contains(document.activeElement)) {
    return;
  }

  if (key === 'ArrowLeft') {
    event.preventDefault();
    focusThumbnailAtIndex(appState.focusIndex - 1);
    return;
  }

  if (key === 'ArrowRight') {
    event.preventDefault();
    focusThumbnailAtIndex(appState.focusIndex + 1);
    return;
  }

  if (key === 'Enter' || key === ' ') {
    if (document.activeElement && document.activeElement.classList.contains('thumb-item')) {
      event.preventDefault();
      const date = document.activeElement.dataset.date;
      selectEntry(date, {
        scrollIntoView: window.matchMedia('(max-width: 639px)').matches,
        syncFocus: true
      });
      // Selection re-renders the carousel, which destroys the focused
      // thumbnail. Restore keyboard focus to the same entry's thumbnail.
      focusThumbnailAtIndex(appState.focusIndex, { moveWindow: false });
    }
  }
}

const swipeState = {
  active: false,
  startX: 0,
  startY: 0,
  locked: false,
  handled: false
};

function onCarouselTouchStart(event) {
  if (!event.touches || event.touches.length !== 1) {
    return;
  }
  const touch = event.touches[0];
  swipeState.active = true;
  swipeState.startX = touch.clientX;
  swipeState.startY = touch.clientY;
  swipeState.locked = false;
  swipeState.handled = false;
}

function onCarouselTouchMove(event) {
  if (!swipeState.active || swipeState.handled || !event.touches || event.touches.length !== 1) {
    return;
  }

  const touch = event.touches[0];
  const dx = touch.clientX - swipeState.startX;
  const dy = touch.clientY - swipeState.startY;

  if (!swipeState.locked) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      return;
    }
    // Prefer vertical page scroll when the gesture is mostly vertical.
    if (Math.abs(dy) > Math.abs(dx)) {
      swipeState.active = false;
      return;
    }
    swipeState.locked = true;
  }

  if (Math.abs(dx) >= 40) {
    swipeState.handled = true;
    moveCarouselWindow(dx < 0 ? 1 : -1);
  }
}

function onCarouselTouchEnd() {
  swipeState.active = false;
  swipeState.locked = false;
}

// ============================================================
// Expanded gallery
// ============================================================

function htmlToPlainText(html) {
  const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
  return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function firstNWords(text, count = 100) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= count) {
    return words.join(' ');
  }
  return `${words.slice(0, count).join(' ')}…`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function appendHighlightedText(container, text, query) {
  container.replaceChildren();
  const source = String(text || '');
  const q = String(query || '').trim();

  if (!q) {
    container.appendChild(document.createTextNode(source));
    return;
  }

  const regex = new RegExp(`(${escapeRegExp(q)})`, 'ig');
  const parts = source.split(regex);

  parts.forEach((part) => {
    if (!part) {
      return;
    }
    if (part.toLowerCase() === q.toLowerCase()) {
      const mark = document.createElement('mark');
      mark.textContent = part;
      container.appendChild(mark);
    } else {
      container.appendChild(document.createTextNode(part));
    }
  });
}

function buildSearchExcerpt(plainText, query, radius = 42) {
  const text = String(plainText || '');
  const q = String(query || '').trim();
  if (!q) {
    return firstNWords(text, 28);
  }

  const lower = text.toLowerCase();
  const index = lower.indexOf(q.toLowerCase());
  if (index < 0) {
    return firstNWords(text, 28);
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + q.length + radius);
  let excerpt = text.slice(start, end).trim();
  if (start > 0) {
    excerpt = `…${excerpt}`;
  }
  if (end < text.length) {
    excerpt = `${excerpt}…`;
  }
  return excerpt;
}

function getMediaCounts() {
  let images = 0;
  let videos = 0;
  appState.entries.forEach((entry) => {
    if (isVideoEntry(entry)) {
      videos += 1;
    } else {
      images += 1;
    }
  });
  return {
    all: appState.entries.length,
    image: images,
    video: videos
  };
}

function getFilteredSortedEntries() {
  const query = appState.searchQuery.trim().toLowerCase();

  let list = appState.entries.filter((entry) => {
    if (appState.filterMediaType === 'image' && isVideoEntry(entry)) {
      return false;
    }
    if (appState.filterMediaType === 'video' && !isVideoEntry(entry)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const title = String(entry.title || '').toLowerCase();
    const explanation = htmlToPlainText(entry.explanation).toLowerCase();
    return title.includes(query) || explanation.includes(query);
  });

  list = list.slice().sort((a, b) => {
    if (appState.sortOrder === 'oldest') {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    }
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });

  return list;
}

function updateGalleryToggleVisibility() {
  const show = appState.entries.length > 0;
  galleryToggleWrap.hidden = !show;
  if (!show) {
    setGalleryExpanded(false, { focusToggle: false, scrollToCarousel: false });
  }
}

function syncSearchInputFromState() {
  gallerySearchInput.value = appState.searchQuery;
  const hasQuery = Boolean(appState.searchQuery.trim());
  clearSearchBtn.hidden = !hasQuery;
  if (hasQuery) {
    activeSearchIndicator.hidden = false;
    activeSearchIndicator.textContent = `Active search: “${appState.searchQuery.trim()}” (loaded date range only)`;
  } else {
    activeSearchIndicator.hidden = true;
    activeSearchIndicator.textContent = '';
  }
}

function updateFilterChipLabels() {
  const counts = getMediaCounts();
  filterAllBtn.textContent = `All (${counts.all})`;
  filterImagesBtn.textContent = `Images (${counts.image})`;
  filterVideosBtn.textContent = `Videos (${counts.video})`;

  [
    [filterAllBtn, 'all'],
    [filterImagesBtn, 'image'],
    [filterVideosBtn, 'video']
  ].forEach(([button, value]) => {
    const active = appState.filterMediaType === value;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  const newest = appState.sortOrder === 'newest';
  sortNewestBtn.classList.toggle('is-active', newest);
  sortOldestBtn.classList.toggle('is-active', !newest);
  sortNewestBtn.setAttribute('aria-pressed', newest ? 'true' : 'false');
  sortOldestBtn.setAttribute('aria-pressed', newest ? 'false' : 'true');
}

function setGalleryExpanded(expanded, options = {}) {
  const { focusToggle = false, scrollToCarousel = false } = options;
  appState.galleryExpanded = expanded;

  toggleGalleryBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  toggleGalleryBtn.textContent = expanded ? 'Hide All Images' : 'View All Images';

  if (expanded) {
    expandedGallery.hidden = false;
    // Force reflow so the open transition runs.
    void expandedGallery.offsetHeight;
    expandedGallery.classList.add('is-open');
    renderExpandedGallery({ animateNew: false });
  } else {
    expandedGallery.classList.remove('is-open');
    const collapseDelay = prefersReducedMotion() ? 0 : 320;
    setTimeout(() => {
      if (!appState.galleryExpanded) {
        expandedGallery.hidden = true;
      }
    }, collapseDelay);

    if (scrollToCarousel) {
      const headerOffset = 56;
      const top =
        window.scrollY + thumbnailCarousel.getBoundingClientRect().top - headerOffset;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
    }

    if (focusToggle) {
      toggleGalleryBtn.focus({ preventScroll: true });
    }
  }
}

function toggleExpandedGallery() {
  if (appState.galleryExpanded) {
    setGalleryExpanded(false, { focusToggle: true, scrollToCarousel: true });
  } else {
    setGalleryExpanded(true);
  }
}

function renderExpandedGallery(options = {}) {
  const { animateNew = false, previousVisible = 0 } = options;

  updateFilterChipLabels();
  syncSearchInputFromState();

  if (!appState.galleryExpanded) {
    return;
  }

  const matched = getFilteredSortedEntries();
  const totalLoaded = appState.entries.length;
  const matchedCount = matched.length;

  if (matchedCount > 0 && appState.visibleCount <= 0) {
    appState.visibleCount = Math.min(GALLERY_PAGE_SIZE, matchedCount);
  }
  if (appState.visibleCount > matchedCount) {
    appState.visibleCount = matchedCount;
  }

  const visible = matched.slice(0, appState.visibleCount);
  const hasActiveSearch = Boolean(appState.searchQuery.trim());
  const hasActiveFilter = appState.filterMediaType !== 'all';

  if (!hasActiveSearch && !hasActiveFilter) {
    galleryResultCount.textContent = `${totalLoaded} images and videos`;
  } else {
    galleryResultCount.textContent = `${matchedCount} of ${totalLoaded} results`;
  }

  galleryGrid.replaceChildren();

  if (matchedCount === 0) {
    galleryEmpty.hidden = false;
    loadMoreBtn.hidden = true;
    galleryEmptyMessage.textContent =
      'No entries in the currently loaded date range match your search or filter.';
    emptyClearSearchBtn.hidden = !hasActiveSearch;
    emptyShowAllMediaBtn.hidden = !hasActiveFilter;
    return;
  }

  galleryEmpty.hidden = true;
  emptyClearSearchBtn.hidden = true;
  emptyShowAllMediaBtn.hidden = true;

  visible.forEach((entry, index) => {
    const card = createGalleryCard(entry);
    if (animateNew && index >= previousVisible) {
      card.classList.add('is-entering');
      galleryGrid.appendChild(card);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.classList.remove('is-entering');
          card.classList.add('is-visible');
        });
      });
    } else {
      card.classList.add('is-visible');
      galleryGrid.appendChild(card);
    }
  });

  const remaining = matchedCount - visible.length;
  if (remaining <= 0) {
    loadMoreBtn.hidden = true;
    loadMoreBtn.textContent = 'Load More';
  } else {
    const nextBatch = Math.min(GALLERY_PAGE_SIZE, remaining);
    loadMoreBtn.hidden = false;
    loadMoreBtn.textContent = `Load ${nextBatch} More`;
  }
}

function createGalleryCard(entry) {
  const card = document.createElement('article');
  card.className = 'gallery-card';
  card.dataset.date = entry.date;
  if (entry.date === appState.selectedDate) {
    card.classList.add('is-selected');
  }

  const mediaBtn = document.createElement('button');
  mediaBtn.type = 'button';
  mediaBtn.className = 'gallery-card-media';
  mediaBtn.setAttribute(
    'aria-label',
    `Select ${entry.title} as featured Astronomy Picture`
  );

  const preview = entry.thumbnail || entry.hdurl;
  if (preview) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = preview;
    if (isVideoEntry(entry)) {
      img.addEventListener('error', () => {
        if (!img.src.includes(VIDEO_PLACEHOLDER_SRC)) {
          img.src = VIDEO_PLACEHOLDER_SRC;
        }
      });
    }
    mediaBtn.appendChild(img);
  } else if (isVideoEntry(entry)) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = VIDEO_PLACEHOLDER_SRC;
    mediaBtn.appendChild(img);
  }

  if (isVideoEntry(entry)) {
    const play = document.createElement('span');
    play.className = 'gallery-card-play';
    play.setAttribute('aria-hidden', 'true');
    play.innerHTML = `
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.45)"/>
        <path d="M10 8 L17 12 L10 16 Z" fill="#fff"/>
      </svg>
    `;
    mediaBtn.appendChild(play);
  }

  if (entry.date === appState.selectedDate) {
    const badge = document.createElement('span');
    badge.className = 'gallery-featured-badge';
    badge.textContent = 'Featured';
    mediaBtn.appendChild(badge);
  }

  mediaBtn.addEventListener('click', () => {
    selectEntry(entry.date, { scrollIntoView: true, syncFocus: true });
  });

  const body = document.createElement('div');
  body.className = 'gallery-card-body';

  const title = document.createElement('h3');
  title.className = 'gallery-card-title';
  appendHighlightedText(title, entry.title, appState.searchQuery);

  const date = document.createElement('p');
  date.className = 'gallery-card-date';
  date.textContent = entry.date;

  body.appendChild(title);
  body.appendChild(date);

  const plainExplanation = htmlToPlainText(entry.explanation);
  const query = appState.searchQuery.trim();
  if (query) {
    const excerpt = document.createElement('p');
    excerpt.className = 'gallery-card-excerpt';
    appendHighlightedText(
      excerpt,
      buildSearchExcerpt(plainExplanation, query),
      query
    );
    body.appendChild(excerpt);
  }

  const summaryId = `summary-${entry.date}`;
  const summary = document.createElement('div');
  summary.className = 'gallery-card-summary';
  summary.id = summaryId;
  summary.hidden = appState.expandedSummaryDate !== entry.date;
  if (!summary.hidden) {
    summary.textContent = firstNWords(plainExplanation, 100);
  }

  const actions = document.createElement('div');
  actions.className = 'gallery-card-actions';

  const summaryBtn = document.createElement('button');
  summaryBtn.type = 'button';
  summaryBtn.className = 'btn btn-secondary';
  const summaryOpen = appState.expandedSummaryDate === entry.date;
  summaryBtn.textContent = summaryOpen ? 'Hide Summary' : 'Show Summary';
  summaryBtn.setAttribute('aria-expanded', summaryOpen ? 'true' : 'false');
  summaryBtn.setAttribute('aria-controls', summaryId);
  summaryBtn.addEventListener('click', () => {
    if (appState.expandedSummaryDate === entry.date) {
      appState.expandedSummaryDate = null;
    } else {
      appState.expandedSummaryDate = entry.date;
    }
    renderExpandedGallery({ animateNew: false });
  });

  const detailsBtn = document.createElement('button');
  detailsBtn.type = 'button';
  detailsBtn.className = 'btn btn-secondary';
  detailsBtn.textContent = 'Details';
  detailsBtn.setAttribute('aria-label', `View details for ${entry.title}`);
  detailsBtn.title = 'Open explanation details';
  detailsBtn.addEventListener('click', (event) => {
    event.preventDefault();
    openExplanationModal(entry.date, detailsBtn);
  });

  actions.appendChild(summaryBtn);
  actions.appendChild(detailsBtn);
  body.appendChild(summary);
  body.appendChild(actions);

  card.appendChild(mediaBtn);
  card.appendChild(body);
  return card;
}

function updateGalleryCardSelectionStyles() {
  if (!appState.galleryExpanded) {
    return;
  }

  const matchedDates = new Set(getFilteredSortedEntries().map((entry) => entry.date));
  const cards = galleryGrid.querySelectorAll('.gallery-card');

  cards.forEach((card) => {
    const date = card.dataset.date;
    const isSelected =
      date === appState.selectedDate && matchedDates.has(date);
    card.classList.toggle('is-selected', isSelected);

    const media = card.querySelector('.gallery-card-media');
    if (!media) {
      return;
    }

    let badge = media.querySelector('.gallery-featured-badge');
    if (isSelected && !badge) {
      badge = document.createElement('span');
      badge.className = 'gallery-featured-badge';
      badge.textContent = 'Featured';
      media.appendChild(badge);
    } else if (!isSelected && badge) {
      badge.remove();
    }
  });
}

function handleGallerySearchInput() {
  appState.searchQuery = gallerySearchInput.value;
  appState.visibleCount = GALLERY_PAGE_SIZE;
  appState.expandedSummaryDate = null;
  renderExpandedGallery({ animateNew: false });
}

function clearGallerySearch() {
  appState.searchQuery = '';
  appState.visibleCount = GALLERY_PAGE_SIZE;
  appState.expandedSummaryDate = null;
  syncSearchInputFromState();
  renderExpandedGallery({ animateNew: false });
  gallerySearchInput.focus({ preventScroll: true });
}

function setGalleryFilter(filter) {
  appState.filterMediaType = filter;
  appState.visibleCount = GALLERY_PAGE_SIZE;
  appState.expandedSummaryDate = null;
  renderExpandedGallery({ animateNew: false });
}

function setGallerySort(sortOrder) {
  const previousVisible = appState.visibleCount;
  appState.sortOrder = sortOrder;
  // Preserve visible-card count on sort changes.
  appState.visibleCount = previousVisible;
  renderExpandedGallery({ animateNew: false });
}

function handleLoadMore() {
  const matched = getFilteredSortedEntries();
  const previousVisible = appState.visibleCount;
  appState.visibleCount = Math.min(
    matched.length,
    appState.visibleCount + GALLERY_PAGE_SIZE
  );
  renderExpandedGallery({
    animateNew: !prefersReducedMotion(),
    previousVisible
  });
}

// ============================================================
// Explanation modal
// ============================================================

const ALLOWED_EXPLANATION_TAGS = new Set([
  'P', 'BR', 'A', 'STRONG', 'EM', 'B', 'I', 'UL', 'OL', 'LI', 'SPAN'
]);

function isSafeHttpUrl(value) {
  try {
    const absolute = String(value || '').startsWith('//')
      ? `https:${value}`
      : value;
    const parsed = new URL(absolute, window.location.href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function sanitizeRichText(html) {
  const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const fragment = document.createDocumentFragment();

  function walk(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(node.textContent || ''));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const tag = node.tagName.toUpperCase();
    if (!ALLOWED_EXPLANATION_TAGS.has(tag)) {
      Array.from(node.childNodes).forEach((child) => walk(child, parent));
      return;
    }

    let element;
    if (tag === 'A') {
      const href = node.getAttribute('href') || '';
      if (!isSafeHttpUrl(href)) {
        Array.from(node.childNodes).forEach((child) => walk(child, parent));
        return;
      }
      element = document.createElement('a');
      element.href = href.startsWith('//') ? `https:${href}` : href;
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    } else if (tag === 'BR') {
      parent.appendChild(document.createElement('br'));
      return;
    } else {
      element = document.createElement(tag.toLowerCase());
    }

    Array.from(node.childNodes).forEach((child) => walk(child, element));
    parent.appendChild(element);
  }

  Array.from(parsed.body.childNodes).forEach((child) => walk(child, fragment));

  // If the API returned a single text blob without paragraphs, wrap it.
  if (!fragment.childNodes.length) {
    const p = document.createElement('p');
    p.textContent = htmlToPlainText(html);
    fragment.appendChild(p);
  }

  return fragment;
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getModalEntryIndex(date) {
  return appState.entries.findIndex((entry) => entry.date === date);
}

function announceModalEntry(entry, index) {
  const total = appState.entries.length;
  modalLive.textContent = `Now viewing: ${entry.title}, ${formatDisplayDate(entry.date)}. Entry ${index + 1} of ${total}.`;
}

function openExplanationModal(date, opener) {
  const entry = getEntryByDate(date);
  if (!entry) {
    return;
  }

  appState.modal.open = true;
  appState.modal.entryDate = date;
  appState.modal.opener = opener || document.activeElement;
  appState.modal.lastFocused = document.activeElement;

  modalBackdrop.hidden = false;
  document.body.classList.add('modal-open');
  renderModalEntry(date, { announce: true });
  modalClose.focus({ preventScroll: true });
}

function closeExplanationModal() {
  if (!appState.modal.open || appState.fullscreen.open) {
    return;
  }

  const lastDate = appState.modal.entryDate;
  const opener = appState.modal.opener;

  appState.modal.open = false;
  appState.modal.loadId += 1;
  modalBackdrop.hidden = true;
  document.body.classList.remove('modal-open');
  modalLive.textContent = '';
  modalMediaContent.replaceChildren();
  modalMediaLoading.hidden = true;

  if (lastDate) {
    selectEntry(lastDate, { scrollIntoView: false, syncFocus: true });
  }

  restoreModalFocus(opener);
  appState.modal.opener = null;
}

function restoreModalFocus(opener) {
  const candidate = opener;
  if (
    candidate &&
    document.contains(candidate) &&
    typeof candidate.focus === 'function' &&
    !candidate.disabled &&
    candidate.offsetParent !== null
  ) {
    candidate.focus({ preventScroll: true });
    return;
  }

  if (!viewDetailsBtn.disabled) {
    viewDetailsBtn.focus({ preventScroll: true });
  }
}

function renderModalEntry(date, options = {}) {
  const { announce = false, focusNav = null } = options;
  const entry = getEntryByDate(date);
  if (!entry) {
    return;
  }

  const index = getModalEntryIndex(date);
  appState.modal.entryDate = date;

  modalTitle.textContent = entry.title;
  modalDate.textContent = formatDisplayDate(entry.date);
  modalPosition.textContent = `${index + 1} of ${appState.entries.length}`;

  modalPrev.disabled = index <= 0;
  modalNext.disabled = index >= appState.entries.length - 1;

  const creditSource = entry.copyright || entry.credit || '';
  if (creditSource) {
    modalCredit.hidden = false;
    modalCredit.replaceChildren();
    const creditFrag = sanitizeRichText(creditSource);
    modalCredit.appendChild(creditFrag);
  } else {
    modalCredit.hidden = true;
    modalCredit.replaceChildren();
  }

  modalExplanation.replaceChildren();
  modalExplanation.appendChild(sanitizeRichText(entry.explanation || 'No explanation available.'));

  modalBody.scrollTop = 0;
  renderModalMedia(entry);

  if (announce) {
    announceModalEntry(entry, index);
  }

  if (focusNav === 'prev') {
    modalPrev.focus({ preventScroll: true });
  } else if (focusNav === 'next') {
    modalNext.focus({ preventScroll: true });
  }
}

function renderModalMedia(entry) {
  const loadId = ++appState.modal.loadId;
  modalMediaContent.replaceChildren();
  modalMediaLoading.hidden = true;

  // Clear previous error UI if present.
  const oldError = modalMedia.querySelector('.modal-media-error');
  if (oldError) {
    oldError.remove();
  }

  if (isVideoEntry(entry)) {
    renderModalVideo(entry);
    return;
  }

  const imageUrl = entry.hdurl || entry.image_url || '';
  if (!imageUrl) {
    showModalMediaError(entry, loadId, 'No image URL is available for this entry.');
    return;
  }

  loadModalImage(entry, imageUrl, loadId, 1);
}

function renderModalVideo(entry) {
  modalMediaLoading.hidden = true;

  if (entry.video_src && /\.(mp4|webm)(\?|$)/i.test(entry.video_src)) {
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('controlslist', 'nodownload');
    if (entry.thumbnail) {
      video.poster = entry.thumbnail;
    }
    video.setAttribute('aria-label', entry.title);
    const source = document.createElement('source');
    source.src = entry.video_src;
    source.type = entry.video_src.includes('.webm') ? 'video/webm' : 'video/mp4';
    video.appendChild(source);
    modalMediaContent.appendChild(video);
    return;
  }

  if (entry.video_src) {
    const embedUrl = toSafeEmbedUrl(entry.video_src);
    if (embedUrl) {
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.title = entry.title;
      iframe.allow =
        'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.setAttribute(
        'sandbox',
        'allow-scripts allow-same-origin allow-presentation allow-popups'
      );
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      modalMediaContent.appendChild(iframe);
      return;
    }
  }

  if (entry.hdurl) {
    const img = document.createElement('img');
    img.src = entry.hdurl;
    img.alt = `${entry.title} (video poster)`;
    modalMediaContent.appendChild(img);
    return;
  }

  showModalMediaError(entry, appState.modal.loadId, 'Video media is unavailable for this entry.');
}

function loadModalImage(entry, imageUrl, loadId, attempt) {
  if (loadId !== appState.modal.loadId) {
    return;
  }

  modalMediaLoading.hidden = false;

  const img = new Image();
  img.decoding = 'async';
  img.alt = entry.alt || entry.title;

  img.onload = () => {
    if (loadId !== appState.modal.loadId || appState.modal.entryDate !== entry.date) {
      return;
    }

    modalMediaLoading.hidden = true;
    const oldError = modalMedia.querySelector('.modal-media-error');
    if (oldError) {
      oldError.remove();
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'modal-image-button';
    button.setAttribute('aria-label', `Open fullscreen view for ${entry.title}`);
    button.addEventListener('click', handleModalImageActivate);
    button.appendChild(img);
    modalMediaContent.replaceChildren(button);
  };

  img.onerror = () => {
    if (loadId !== appState.modal.loadId || appState.modal.entryDate !== entry.date) {
      return;
    }

    if (attempt === 1) {
      const fallback = getFallbackImageUrl(entry, imageUrl);
      if (fallback) {
        loadModalImage(entry, fallback, loadId, 2);
        return;
      }
      loadModalImage(entry, imageUrl, loadId, 2);
      return;
    }

    showModalMediaError(entry, loadId, 'Unable to load this image.');
  };

  img.src = imageUrl;
}

function showModalMediaError(entry, loadId, message) {
  if (loadId !== appState.modal.loadId) {
    return;
  }

  modalMediaLoading.hidden = true;
  modalMediaContent.replaceChildren();

  const error = document.createElement('div');
  error.className = 'modal-media-error';
  const text = document.createElement('p');
  text.textContent = message;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn btn-secondary';
  retry.textContent = 'Retry Image';
  retry.addEventListener('click', () => {
    if (appState.modal.entryDate === entry.date) {
      renderModalMedia(entry);
    }
  });
  error.appendChild(text);
  error.appendChild(retry);
  modalMedia.appendChild(error);
}

function handleModalImageActivate(event) {
  event.preventDefault();
  const date = appState.modal.entryDate;
  const entry = getEntryByDate(date);
  if (!entry || isVideoEntry(entry)) {
    return;
  }
  openFullscreenViewer(date, event.currentTarget);
}

function navigateModal(delta, focusNav) {
  if (!appState.modal.open || appState.fullscreen.open) {
    return;
  }

  const currentIndex = getModalEntryIndex(appState.modal.entryDate);
  const nextIndex = currentIndex + delta;
  if (nextIndex < 0 || nextIndex >= appState.entries.length) {
    return;
  }

  const nextEntry = appState.entries[nextIndex];
  renderModalEntry(nextEntry.date, { announce: true, focusNav });
}

function handleDialogKeydown(event) {
  if (appState.fullscreen.open) {
    handleFullscreenKeydown(event);
    return;
  }

  if (!appState.modal.open) {
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    closeExplanationModal();
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    navigateModal(-1, 'prev');
    return;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    navigateModal(1, 'next');
    return;
  }

  if (event.key === 'Tab') {
    trapFocusWithin(apodModal, event, modalClose);
  }
}

// ============================================================
// Fullscreen image viewer
// ============================================================

function setExplanationModalInert(isInert) {
  if (isInert) {
    apodModal.setAttribute('inert', '');
    apodModal.setAttribute('aria-hidden', 'true');
  } else {
    apodModal.removeAttribute('inert');
    apodModal.removeAttribute('aria-hidden');
  }
}

function openFullscreenViewer(date, opener) {
  const entry = getEntryByDate(date);
  if (!entry || isVideoEntry(entry) || !appState.modal.open) {
    return;
  }

  appState.modal.scrollTop = modalBody.scrollTop;
  appState.fullscreen.open = true;
  appState.fullscreen.entryDate = date;
  appState.fullscreen.opener = opener || document.activeElement;
  appState.fullscreen.loadId += 1;

  setExplanationModalInert(true);
  fullscreenViewer.hidden = false;
  renderFullscreenViewer(entry);
  fullscreenClose.focus({ preventScroll: true });
}

function closeFullscreenViewer() {
  if (!appState.fullscreen.open) {
    return;
  }

  const opener = appState.fullscreen.opener;
  const savedScroll = appState.modal.scrollTop;

  appState.fullscreen.open = false;
  appState.fullscreen.loadId += 1;
  appState.fullscreen.opener = null;
  appState.fullscreen.originalUrl = '';

  fullscreenViewer.hidden = true;
  fullscreenImage.hidden = true;
  fullscreenImage.removeAttribute('src');
  fullscreenLoading.hidden = true;
  fullscreenError.hidden = true;
  fullscreenOriginal.hidden = true;
  fullscreenOriginal.removeAttribute('href');

  setExplanationModalInert(false);
  modalBody.scrollTop = savedScroll;

  if (
    opener &&
    document.contains(opener) &&
    typeof opener.focus === 'function' &&
    !opener.disabled
  ) {
    opener.focus({ preventScroll: true });
  } else {
    modalClose.focus({ preventScroll: true });
  }
}

function renderFullscreenViewer(entry) {
  fullscreenTitle.textContent = entry.title;
  fullscreenDate.textContent = formatDisplayDate(entry.date);

  const creditSource = entry.copyright || entry.credit || '';
  if (creditSource) {
    fullscreenCredit.hidden = false;
    fullscreenCredit.replaceChildren();
    fullscreenCredit.appendChild(sanitizeRichText(creditSource));
  } else {
    fullscreenCredit.hidden = true;
    fullscreenCredit.replaceChildren();
  }

  const sources = getFullscreenImageSources(entry);
  appState.fullscreen.originalUrl = sources.original || sources.preview || '';

  if (appState.fullscreen.originalUrl) {
    fullscreenOriginal.hidden = false;
    fullscreenOriginal.href = appState.fullscreen.originalUrl;
    fullscreenOriginal.setAttribute(
      'aria-label',
      `Open original image for ${entry.title} in a new tab`
    );
  } else {
    fullscreenOriginal.hidden = true;
    fullscreenOriginal.removeAttribute('href');
  }

  loadFullscreenImage(entry, sources, appState.fullscreen.loadId);
}

function loadFullscreenImage(entry, sources, loadId) {
  if (loadId !== appState.fullscreen.loadId) {
    return;
  }

  fullscreenError.hidden = true;
  fullscreenImage.hidden = true;
  fullscreenImage.removeAttribute('src');

  const previewUrl = sources.preview;
  const originalUrl = sources.original;
  const hasUpgrade = sources.hasUpgrade;

  if (!previewUrl && !originalUrl) {
    showFullscreenError('No image URL is available for this entry.');
    return;
  }

  fullscreenLoading.hidden = false;

  const firstUrl = previewUrl || originalUrl;
  const previewImg = new Image();
  previewImg.decoding = 'async';

  previewImg.onload = () => {
    if (loadId !== appState.fullscreen.loadId || appState.fullscreen.entryDate !== entry.date) {
      return;
    }

    fullscreenLoading.hidden = true;
    fullscreenError.hidden = true;
    fullscreenImage.alt = entry.alt || entry.title;
    fullscreenImage.src = firstUrl;
    fullscreenImage.hidden = false;

    if (hasUpgrade && originalUrl && originalUrl !== firstUrl) {
      upgradeFullscreenImage(entry, originalUrl, loadId);
    }
  };

  previewImg.onerror = () => {
    if (loadId !== appState.fullscreen.loadId || appState.fullscreen.entryDate !== entry.date) {
      return;
    }

    if (hasUpgrade && originalUrl && originalUrl !== firstUrl) {
      // Preview failed; try original/HD directly.
      const hdImg = new Image();
      hdImg.decoding = 'async';
      hdImg.onload = () => {
        if (loadId !== appState.fullscreen.loadId || appState.fullscreen.entryDate !== entry.date) {
          return;
        }
        fullscreenLoading.hidden = true;
        fullscreenImage.alt = entry.alt || entry.title;
        fullscreenImage.src = originalUrl;
        fullscreenImage.hidden = false;
      };
      hdImg.onerror = () => {
        if (loadId !== appState.fullscreen.loadId) {
          return;
        }
        showFullscreenError('Unable to load this image.');
      };
      hdImg.src = originalUrl;
      return;
    }

    showFullscreenError('Unable to load this image.');
  };

  previewImg.src = firstUrl;
}

function upgradeFullscreenImage(entry, hdUrl, loadId) {
  const hdImg = new Image();
  hdImg.decoding = 'async';

  hdImg.onload = () => {
    if (loadId !== appState.fullscreen.loadId || appState.fullscreen.entryDate !== entry.date) {
      return;
    }

    if (prefersReducedMotion()) {
      fullscreenImage.src = hdUrl;
      return;
    }

    fullscreenImage.classList.add('is-fading');
    setTimeout(() => {
      if (loadId !== appState.fullscreen.loadId) {
        return;
      }
      fullscreenImage.src = hdUrl;
      requestAnimationFrame(() => {
        fullscreenImage.classList.remove('is-fading');
      });
    }, 120);
  };

  hdImg.onerror = () => {
    // Keep the already-visible standard image; do not show an error.
  };

  hdImg.src = hdUrl;
}

function showFullscreenError(message) {
  fullscreenLoading.hidden = true;
  fullscreenImage.hidden = true;
  fullscreenError.hidden = false;
  fullscreenErrorMessage.textContent = message || 'Unable to load this image.';
}

function handleFullscreenRetry() {
  const entry = getEntryByDate(appState.fullscreen.entryDate);
  if (!entry) {
    return;
  }
  appState.fullscreen.loadId += 1;
  loadFullscreenImage(entry, getFullscreenImageSources(entry), appState.fullscreen.loadId);
}

function handleFullscreenKeydown(event) {
  if (!appState.fullscreen.open) {
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeFullscreenViewer();
    return;
  }

  if (event.key === 'Tab') {
    trapFocusWithin(fullscreenViewer, event, fullscreenClose);
  }
}

function trapFocusWithin(container, event, fallback) {
  const focusable = container.querySelectorAll(
    'button:not([disabled]), [href]:not([hidden]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const list = Array.from(focusable).filter((el) => {
    if (
      el.hasAttribute('hidden') ||
      el.getAttribute('aria-hidden') === 'true' ||
      el.closest('[hidden]')
    ) {
      return false;
    }
    return el.offsetParent !== null || el === document.activeElement;
  });

  if (!list.length) {
    event.preventDefault();
    if (fallback) {
      fallback.focus();
    }
    return;
  }

  const first = list[0];
  const last = list[list.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleModalBackdropClick(event) {
  if (appState.fullscreen.open) {
    return;
  }
  if (event.target === modalBackdrop) {
    closeExplanationModal();
  }
}

// ============================================================
// Event handlers
// ============================================================

function handleExplore() {
  clearValidationError();
  const error = validateDateInputs();
  if (error) {
    showValidationError(error);
    updateDatesNotAppliedIndicator();
    return;
  }

  fetchApodRange(startInput.value, endInput.value);
}

function handlePresetClick(event) {
  const button = event.currentTarget;
  const days = Number(button.dataset.days);
  const range = clampStartForPreset(days);

  startInput.value = range.start;
  endInput.value = range.end;
  setActivePreset(days);
  clearValidationError();
  updateDatesNotAppliedIndicator();
}

function handleDateInputChange() {
  clearActivePreset();
  clearValidationError();
  updateDatesNotAppliedIndicator();
}

function handleBrandHome() {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  setNavActive('explore');
}

function handleNavClick(event) {
  setNavActive(event.currentTarget.dataset.nav);
}

exploreBtn.addEventListener('click', handleExplore);
retryBtn.addEventListener('click', handleExplore);
presetButtons.forEach((button) => {
  button.addEventListener('click', handlePresetClick);
});
startInput.addEventListener('change', handleDateInputChange);
endInput.addEventListener('change', handleDateInputChange);
brandHome.addEventListener('click', handleBrandHome);
navExplore.addEventListener('click', handleNavClick);
navGallery.addEventListener('click', handleNavClick);

carouselPrev.addEventListener('click', (event) => {
  moveCarouselWindow(-1);
  event.currentTarget.focus({ preventScroll: true });
});

carouselNext.addEventListener('click', (event) => {
  moveCarouselWindow(1);
  event.currentTarget.focus({ preventScroll: true });
});

toggleGalleryBtn.addEventListener('click', toggleExpandedGallery);
gallerySearchInput.addEventListener('input', handleGallerySearchInput);
clearSearchBtn.addEventListener('click', clearGallerySearch);
emptyClearSearchBtn.addEventListener('click', clearGallerySearch);
emptyShowAllMediaBtn.addEventListener('click', () => setGalleryFilter('all'));
loadMoreBtn.addEventListener('click', handleLoadMore);
sortNewestBtn.addEventListener('click', () => setGallerySort('newest'));
sortOldestBtn.addEventListener('click', () => setGallerySort('oldest'));
filterAllBtn.addEventListener('click', () => setGalleryFilter('all'));
filterImagesBtn.addEventListener('click', () => setGalleryFilter('image'));
filterVideosBtn.addEventListener('click', () => setGalleryFilter('video'));

viewDetailsBtn.addEventListener('click', () => {
  const date = appState.selectedDate || appState.displayedDate;
  if (date) {
    openExplanationModal(date, viewDetailsBtn);
  }
});

modalClose.addEventListener('click', () => {
  if (!appState.fullscreen.open) {
    closeExplanationModal();
  }
});
modalPrev.addEventListener('click', () => navigateModal(-1, 'prev'));
modalNext.addEventListener('click', () => navigateModal(1, 'next'));
modalBackdrop.addEventListener('click', handleModalBackdropClick);
document.addEventListener('keydown', handleDialogKeydown);

fullscreenClose.addEventListener('click', closeFullscreenViewer);
fullscreenRetry.addEventListener('click', handleFullscreenRetry);
// Backdrop/image clicks intentionally do not close fullscreen.

thumbnailCarousel.addEventListener('keydown', handleCarouselKeydown);
carouselWindow.addEventListener('touchstart', onCarouselTouchStart, { passive: true });
carouselWindow.addEventListener('touchmove', onCarouselTouchMove, { passive: true });
carouselWindow.addEventListener('touchend', onCarouselTouchEnd, { passive: true });
carouselWindow.addEventListener('touchcancel', onCarouselTouchEnd, { passive: true });

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      if (entry.target.id === 'gallery-section') {
        setNavActive('gallery');
      } else if (entry.target.id === 'date-controls') {
        setNavActive('explore');
      }
    });
  },
  { rootMargin: '-40% 0px -40% 0px', threshold: 0.01 }
);

const dateControlsSection = document.getElementById('date-controls');
const gallerySection = document.getElementById('gallery-section');
if (dateControlsSection) {
  sectionObserver.observe(dateControlsSection);
}
if (gallerySection) {
  sectionObserver.observe(gallerySection);
}

// ============================================================
// Boot
// ============================================================

function renderRandomSpaceFact() {
  if (!spaceFactText || !SPACE_FACTS.length) {
    return;
  }
  const index = Math.floor(Math.random() * SPACE_FACTS.length);
  spaceFactText.textContent = SPACE_FACTS[index];
}

applyInitialSevenDayRange();
setNavActive('explore');
updateDatesNotAppliedIndicator();
renderRandomSpaceFact();
fetchApodRange(startInput.value, endInput.value);

// Development-only fixture helpers. Host-locked to local development.
// Intentionally NOT gated by URL query params so deployed sites cannot opt in.
(function exposeDevTestApi() {
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return;
  }

  window.__nasaExplorerTestApi = {
    getFullscreenImageSources,
    getEntryByDate,
    openFullscreenViewer,
    closeFullscreenViewer,
    loadFullscreenImage,
    showFullscreenError,
    openExplanationModal,
    closeExplanationModal,
    isVideoEntry
  };
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const appScope = new URL('./', document.baseURI);
    navigator.serviceWorker
      .register(new URL('service-worker.js', appScope), { scope: appScope.pathname })
      .then((registration) => {
        console.log("[App] Service worker registered:", registration.scope);
      })
      .catch((error) => {
        console.error("[App] Service worker registration failed:", error);
      });
  });
}

const offlineBanner = document.getElementById('offline-banner');

function updateOnlineStatus() {
  if (navigator.onLine) {
    offlineBanner.classList.add('hidden');
  } else {
    offlineBanner.classList.remove('hidden');
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// ----- Installation and notification controls -----
let deferredInstallPrompt = null;
const installBanner = document.getElementById('install-banner');
const installYesButton = document.getElementById('install-yes');
const installDismissButton = document.getElementById('install-dismiss');
const installMessage = document.getElementById('install-message');
const notificationButton = document.getElementById('notification-button');
const notificationStatus = document.getElementById('notification-status');
const INSTALL_DISMISSED_KEY = 'nasa-space-explorer-install-dismissed';
let installPromptDismissedInMemory = false;
let appIsInstalled =
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
  navigator.standalone === true;

function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function hasDismissedInstallPrompt() {
  try {
    return installPromptDismissedInMemory ||
      window.sessionStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';
  } catch (error) {
    console.warn('[App] Unable to read install prompt dismissal state:', error);
    return installPromptDismissedInMemory;
  }
}

function dismissInstallPromptForSession() {
  installPromptDismissedInMemory = true;
  try {
    window.sessionStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
  } catch (error) {
    console.warn('[App] Unable to save install prompt dismissal state:', error);
  }
  deferredInstallPrompt = null;
  installBanner.classList.add('hidden');
}

function showInstallInstructions(message, canPrompt = false) {
  installMessage.textContent = message;
  installYesButton.hidden = !canPrompt;
  installBanner.classList.remove('hidden');
}

function handleAppInstalled() {
  appIsInstalled = true;
  deferredInstallPrompt = null;
  installBanner.classList.add('hidden');
}

if (appIsInstalled || hasDismissedInstallPrompt()) {
  installBanner.classList.add('hidden');
} else if (isIosDevice()) {
  showInstallInstructions(
    'To install on iPhone or iPad, tap Share in your browser, then choose Add to Home Screen.'
  );
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  if (appIsInstalled || hasDismissedInstallPrompt()) {
    return;
  }
  deferredInstallPrompt = event;
  showInstallInstructions('Install the app on your device for quick access.', true);
});

installYesButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt || appIsInstalled) {
    return;
  }

  const installPrompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  installYesButton.disabled = true;

  try {
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`[App] Install prompt outcome: ${outcome}`);

    if (outcome === 'accepted') {
      handleAppInstalled();
    } else {
      dismissInstallPromptForSession();
    }
  } catch (error) {
    console.error('[App] Unable to show the installation prompt:', error);
    installBanner.classList.add('hidden');
  } finally {
    installYesButton.disabled = false;
  }
});

installDismissButton.addEventListener('click', dismissInstallPromptForSession);
window.addEventListener('appinstalled', handleAppInstalled);

function updateNotificationStatus(permission = null) {
  if (!window.isSecureContext) {
    notificationStatus.textContent = 'Notifications require a secure HTTPS connection.';
    notificationButton.disabled = true;
    return;
  }

  if (typeof window.Notification === 'undefined') {
    notificationStatus.textContent = 'Notifications are not supported by this browser.';
    notificationButton.disabled = true;
    return;
  }

  const currentPermission = permission || window.Notification.permission;
  if (currentPermission === 'granted') {
    notificationStatus.textContent =
      'Notification permission is allowed. This app does not currently send notifications.';
    notificationButton.disabled = true;
  } else if (currentPermission === 'denied') {
    notificationStatus.textContent =
      'Notifications are blocked. Change this site’s permission in your browser settings to allow them.';
    notificationButton.disabled = true;
  } else {
    notificationStatus.textContent = 'Notifications have not been enabled.';
    notificationButton.disabled = false;
  }
}

notificationButton.addEventListener('click', async () => {
  if (!window.isSecureContext) {
    updateNotificationStatus();
    return;
  }

  if (typeof window.Notification === 'undefined') {
    updateNotificationStatus();
    return;
  }

  if (window.Notification.permission !== 'default') {
    updateNotificationStatus();
    return;
  }

  notificationButton.disabled = true;
  try {
    const permission = await window.Notification.requestPermission();
    updateNotificationStatus(permission);
  } catch (error) {
    console.error('[App] Unable to request notification permission:', error);
    notificationStatus.textContent =
      'The browser could not request notification permission. Check your site settings and try again.';
    notificationButton.disabled = false;
  }
});

updateNotificationStatus();

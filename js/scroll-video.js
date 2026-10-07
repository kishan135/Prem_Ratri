(() => {
    'use strict';

    const sequence = document.getElementById('sequence');
    const video = document.getElementById('sequenceVideo');
    const cue = document.getElementById('scrollCue');

    if (!sequence || !video) return;

    const mobileQuery = window.matchMedia('(max-width: 700px)');
    const isMobile = mobileQuery.matches;
    const selectedSource = isMobile ? video.dataset.mobileSrc : video.dataset.desktopSrc;

    if (isMobile) video.poster = 'video/prem-ratri-mobile-poster.jpg';
    if (selectedSource && video.getAttribute('src') !== selectedSource) video.src = selectedSource;

    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';

    let duration = 0;
    let targetTime = 0;
    let lastRequestedTime = -1;
    let ready = false;
    let seekInFlight = false;
    let rafPending = false;
    let active = true;
    let sequenceTop = 0;
    let scrollDistance = 1;
    let lastProgress = -1;
    let viewportRaf = 0;

    // Mobile decoders need fewer precise seeks than desktop. These values keep
    // the film responsive while avoiding dozens of redundant decode requests.
    const SEEK_THRESHOLD = isMobile ? 0.075 : 0.045;
    const END_EPSILON = 0.034;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    function viewportHeight() {
        return window.visualViewport ? window.visualViewport.height : window.innerHeight;
    }

    function syncViewportHeight() {
        document.documentElement.style.setProperty('--app-height', `${viewportHeight()}px`);
    }

    // Layout reads are intentionally kept out of the scroll handler.
    function measureSequence() {
        const rect = sequence.getBoundingClientRect();
        sequenceTop = window.scrollY + rect.top;
        scrollDistance = Math.max(1, sequence.offsetHeight - viewportHeight());
    }

    function getProgress() {
        return clamp((window.scrollY - sequenceTop) / scrollDistance, 0, 1);
    }

    function updateCue(progress) {
        if (!cue) return;
        const opacity = progress > 0.012 ? '0' : '.78';
        if (cue.style.opacity !== opacity) cue.style.opacity = opacity;
    }

    function scheduleFrame() {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(processFrame);
    }

    function processFrame() {
        rafPending = false;
        if (!ready || !duration || !active) return;

        const difference = Math.abs(targetTime - lastRequestedTime);
        if (difference < SEEK_THRESHOLD) return;

        // Keep only the newest scroll position. If the browser is still
        // decoding the previous seek, seeked() will process the latest target.
        if (seekInFlight || video.seeking) return;

        seekInFlight = true;
        lastRequestedTime = targetTime;

        try {
            video.currentTime = targetTime;
        } catch (_) {
            seekInFlight = false;
        }
    }

    function updateTarget() {
        if (!duration) return;

        const progress = getProgress();
        updateCue(progress);

        // Avoid work when scroll events fire without changing sequence progress.
        if (Math.abs(progress - lastProgress) < 0.00005) return;
        lastProgress = progress;

        targetTime = progress * Math.max(0, duration - END_EPSILON);
        scheduleFrame();
    }

    function initialiseVideo() {
        duration = Number.isFinite(video.duration) ? video.duration : 0;
        if (!duration) return;

        ready = true;
        measureSequence();

        const progress = getProgress();
        lastProgress = progress;
        updateCue(progress);
        targetTime = progress * Math.max(0, duration - END_EPSILON);

        // Start close to the requested position without forcing repeated seeks.
        const initialTime = clamp(targetTime || 0.1, 0, Math.max(0, duration - END_EPSILON));
        lastRequestedTime = initialTime;
        seekInFlight = true;
        try {
            video.currentTime = initialTime;
        } catch (_) {
            seekInFlight = false;
        }
    }

    video.addEventListener('loadedmetadata', initialiseVideo, { once: true });

    video.addEventListener('loadeddata', () => {
        ready = true;
        scheduleFrame();
    }, { once: true });

    video.addEventListener('canplay', () => {
        ready = true;
        scheduleFrame();
    }, { once: true });

    video.addEventListener('seeked', () => {
        seekInFlight = false;
        // The user may have moved far ahead while this seek was decoding.
        scheduleFrame();
    });

    video.addEventListener('error', () => {
        seekInFlight = false;
        console.error('Prem Ratri scroll video failed to load.');
    });

    // Stop decoder work when the long video sequence is completely off-screen.
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            active = entries[0] ? entries[0].isIntersecting : true;
            if (active) {
                measureSequence();
                updateTarget();
            }
        }, { rootMargin: '100% 0px 100% 0px' });
        observer.observe(sequence);
    }

    function unlockVideo() {
        video.muted = true;
        const promise = video.play();

        if (promise && typeof promise.then === 'function') {
            promise.then(() => {
                video.pause();
                if (video.duration) duration = video.duration;
                ready = true;
                measureSequence();
                updateTarget();
            }).catch(() => {
                ready = true;
                measureSequence();
                updateTarget();
            });
        } else {
            video.pause();
            ready = true;
            measureSequence();
            updateTarget();
        }
    }

    function onViewportChange() {
        cancelAnimationFrame(viewportRaf);
        viewportRaf = requestAnimationFrame(() => {
            syncViewportHeight();
            measureSequence();
            lastProgress = -1;
            updateTarget();
        });
    }

    document.addEventListener('touchstart', unlockVideo, { passive: true, once: true });

    // Scroll handler performs no layout reads and no direct video seeks.
    window.addEventListener('scroll', updateTarget, { passive: true });
    window.addEventListener('resize', onViewportChange, { passive: true });
    window.addEventListener('orientationchange', onViewportChange, { passive: true });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', onViewportChange, { passive: true });
    }

    syncViewportHeight();
    measureSequence();
    video.load();
})();

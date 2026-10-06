(() => {
    'use strict';

    const sequence = document.getElementById('sequence');
    const video = document.getElementById('sequenceVideo');
    const cue = document.getElementById('scrollCue');

    if (!sequence || !video) return;

    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const selectedSource = isMobile ? video.dataset.mobileSrc : video.dataset.desktopSrc;

    if (isMobile) {
        video.poster = 'video/prem-ratri-mobile-poster.jpg';
    }

    if (selectedSource && video.getAttribute('src') !== selectedSource) {
        video.src = selectedSource;
    }

    let duration = 0;
    let targetTime = 0;
    let displayedTime = -1;
    let ready = false;
    let ticking = false;

    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';

    function clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }

    function viewportHeight() {
        return window.visualViewport ? window.visualViewport.height : window.innerHeight;
    }

    function syncViewportHeight() {
        document.documentElement.style.setProperty('--app-height', `${viewportHeight()}px`);
    }

    function progress() {
        const r = sequence.getBoundingClientRect();
        const d = Math.max(1, sequence.offsetHeight - viewportHeight());
        return clamp(-r.top / d, 0, 1);
    }

    function updateTarget() {
        const p = progress();
        targetTime = p * Math.max(0, duration - 0.034);

        if (cue) {
            cue.style.opacity = p > 0.012 ? '0' : '.78';
        }

        requestVideoUpdate();
    }

    function requestVideoUpdate() {
        if (!ready || !duration || ticking || video.seeking) return;

        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;

            const difference = Math.abs(targetTime - displayedTime);
            if (difference < 0.033) return;

            displayedTime = targetTime;
            try {
                video.currentTime = targetTime;
            } catch (e) {}
        });
    }

    function initialiseVideo() {
        if (!duration) return;

        ready = true;
        const initialTime = Math.min(Math.max(targetTime, 0.1), duration);
        displayedTime = initialTime;

        try {
            video.currentTime = initialTime;
        } catch (e) {}

        updateTarget();
    }

    video.addEventListener('loadedmetadata', () => {
        duration = video.duration || 0;
        initialiseVideo();
    });

    video.addEventListener('loadeddata', () => {
        ready = true;
        requestVideoUpdate();
    });

    video.addEventListener('canplay', () => {
        ready = true;
        requestVideoUpdate();
    });

    video.addEventListener('seeked', requestVideoUpdate);

    video.addEventListener('error', () => {
        console.error('Prem Ratri scroll video failed to load.');
    });

    function unlockVideo() {
        video.muted = true;
        const playPromise = video.play();

        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(() => {
                video.pause();
                if (video.duration) duration = video.duration;
                ready = true;
                updateTarget();
            }).catch(() => {
                ready = true;
                updateTarget();
            });
        } else {
            video.pause();
            ready = true;
            updateTarget();
        }
    }

    document.addEventListener('touchstart', unlockVideo, { passive: true, once: true });
    window.addEventListener('scroll', updateTarget, { passive: true });
    window.addEventListener('resize', () => {
        syncViewportHeight();
        updateTarget();
    }, { passive: true });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            syncViewportHeight();
            updateTarget();
        }, { passive: true });
    }

    syncViewportHeight();
    video.load();
    updateTarget();
})();

(() => {
  'use strict';

  // Prem Ratri Waitlist — standalone module.
  // To detach: remove #premRatriWaitlist from index.html and remove the
  // waitlist.css + waitlist.js includes. No other site file depends on this module.
  const SUPABASE_URL = 'https://ywrpmzjreidqqmjxvyks.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_y_tLD3VBpF-ZiKbyZMtscg_v6U7dnOO';
  const mount = document.getElementById('premRatriWaitlist');
  if (!mount) return;

  // Header shortcut is created by this module too, so removing waitlist.js detaches it.
  const siteHeader = document.getElementById('siteHeader');
  if (siteHeader && !siteHeader.querySelector('.waitlist-header-link')) {
    const waitlistLink = document.createElement('a');
    waitlistLink.className = 'waitlist-header-link';
    waitlistLink.href = '#premRatriWaitlist';
    waitlistLink.textContent = 'WAITLIST';
    waitlistLink.setAttribute('aria-label', 'Scroll to Prem Ratri waitlist');
    waitlistLink.addEventListener('click', (event) => {
      event.preventDefault();
      mount.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    siteHeader.appendChild(waitlistLink);
  }

  mount.innerHTML = `
    <section class="waitlist-module" aria-labelledby="waitlistTitle">
      <h2 class="waitlist-module__title" id="waitlistTitle">JOIN THE WAITLIST</h2>
      <p class="waitlist-module__copy">Be the first to know when Prem Ratri passes go live.</p>
      <form class="waitlist-form" id="waitlistForm" novalidate>
        <div class="waitlist-form__field">
          <label for="waitlistName">Full Name</label>
          <input id="waitlistName" name="name" type="text" autocomplete="name" maxlength="100" placeholder="Enter your full name" required>
        </div>
        <div class="waitlist-form__field">
          <label for="waitlistPhone">Phone Number</label>
          <input id="waitlistPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="Enter your phone number" required>
        </div>
        <div class="waitlist-form__field">
          <label for="waitlistEmail">Email Address</label>
          <input id="waitlistEmail" name="email" type="email" autocomplete="email" maxlength="254" placeholder="Enter your email" required>
        </div>
        <div class="waitlist-form__field waitlist-form__field--wide">
          <label for="waitlistInstagram">Instagram <span>(Optional)</span></label>
          <input id="waitlistInstagram" name="instagram" type="text" autocomplete="off" maxlength="50" placeholder="@username">
        </div>
        <button class="waitlist-form__submit" type="submit">JOIN WAITLIST</button>
        <p class="waitlist-form__status" id="waitlistStatus" role="status" aria-live="polite"></p>
        <p class="waitlist-form__privacy">By joining, you agree that Prem Ratri may use these details for event and pass updates. See our <a href="privacy-policy.html">Privacy Policy</a>.</p>
      </form>
    </section>`;

  const form = mount.querySelector('#waitlistForm');
  const status = mount.querySelector('#waitlistStatus');
  const submit = form.querySelector('button[type="submit"]');

  const setStatus = (message, state = '') => {
    status.textContent = message;
    status.dataset.state = state;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');

    const name = form.elements.name.value.trim().replace(/\s+/g, ' ');
    const phone = form.elements.phone.value.trim().replace(/[\s()-]/g, '');
    const email = form.elements.email.value.trim().toLowerCase();
    const instagramRaw = form.elements.instagram.value.trim();
    const instagram = instagramRaw ? (instagramRaw.startsWith('@') ? instagramRaw : `@${instagramRaw}`) : null;

    if (name.length < 2) return setStatus('Please enter your full name.', 'error');
    if (!/^\+?[0-9]{8,15}$/.test(phone)) return setStatus('Please enter a valid phone number.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus('Please enter a valid email address.', 'error');
    if (instagram && !/^@[A-Za-z0-9._]{1,30}$/.test(instagram)) return setStatus('Please enter a valid Instagram username.', 'error');

    submit.disabled = true;
    submit.textContent = 'JOINING...';

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ name, phone, email, instagram })
      });

      if (response.ok) {
        form.reset();
        setStatus("You're on the waitlist. We'll keep you posted!", 'success');
        return;
      }

      if (response.status === 409) {
        setStatus('This phone number is already on the waitlist.', 'error');
        return;
      }

      setStatus('We could not add you right now. Please try again.', 'error');
    } catch (_) {
      setStatus('Connection problem. Please try again.', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = 'JOIN WAITLIST';
    }
  });
})();

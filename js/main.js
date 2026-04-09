/* =============================================================================
   BackMellow — main.js
   All frontend interactions: slideshow, lightbox, cart, FAQ accordion,
   mobile menu, purchase section, smooth scroll, scroll animations.
   ============================================================================= */

'use strict';

// =============================================================================
// CONFIGURATION
// =============================================================================
const CFG = {
  regularPrice:  34.99,
  originalPrice: 49.99,
  bundlePrice:   30.00,
  bundleMin:     3,
  maxQty:        5,
  autoplayMs:    4500,
  images: [
    { src: 'Image_1.avif', alt: 'BackMellow lumbar pillow — front view' },
    { src: 'Image_2.avif', alt: 'BackMellow lumbar pillow — side profile' },
    { src: 'Image_3.avif', alt: 'BackMellow lumbar pillow — cover texture detail' },
    { src: 'Image_4.avif', alt: 'BackMellow lumbar pillow — on an office chair' },
    { src: 'Image_5.avif', alt: 'BackMellow lumbar pillow — grey colorway' },
    { src: 'Image_6.avif', alt: 'BackMellow lumbar pillow — lifestyle use' },
  ],
};

// =============================================================================
// STATE
// =============================================================================
const S = {
  cart:          [],   // [{ color: 'Black'|'Grey', qty: number }]
  slideIndex:    0,
  slideshowTimer:null,
  lbIndex:       0,
  selColor:      'Black',
  selQty:        1,
  cartOpen:      false,
  menuOpen:      false,
};

// =============================================================================
// CART — LOGIC
// =============================================================================

function cartTotalQty() {
  return S.cart.reduce((s, i) => s + i.qty, 0);
}

/** Price per unit given the projected total quantity in cart */
function unitPrice(totalQty) {
  return totalQty >= CFG.bundleMin ? CFG.bundlePrice : CFG.regularPrice;
}

function cartSubtotal() {
  const qty  = cartTotalQty();
  return qty * unitPrice(qty);
}

function regularTotal() {
  return cartTotalQty() * CFG.regularPrice;
}

function cartSavings() {
  return regularTotal() - cartSubtotal();
}

function bundleActive() {
  return cartTotalQty() >= CFG.bundleMin;
}

function addToCart(color, qty) {
  const room = CFG.maxQty - cartTotalQty();
  if (room <= 0) {
    showToast('Maximum of 5 units per order reached.', 'error');
    return;
  }
  const actual = Math.min(qty, room);
  if (actual < qty) {
    showToast(`Only ${room} spot${room > 1 ? 's' : ''} left — added ${actual}.`);
  }

  const existing = S.cart.find(i => i.color === color);
  if (existing) {
    existing.qty += actual;
  } else {
    S.cart.push({ color, qty: actual });
  }

  saveCart();
  syncCartUI();
  openCart();
  showToast('Added to cart!', 'success');
}

function setCartItemQty(color, newQty) {
  const otherQty = S.cart.filter(i => i.color !== color).reduce((s, i) => s + i.qty, 0);
  const max      = CFG.maxQty - otherQty;
  const clamped  = Math.min(Math.max(0, newQty), max);

  if (clamped === 0) {
    S.cart = S.cart.filter(i => i.color !== color);
  } else {
    const item = S.cart.find(i => i.color === color);
    if (item) item.qty = clamped;
  }

  saveCart();
  syncCartUI();
}

function removeCartItem(color) {
  S.cart = S.cart.filter(i => i.color !== color);
  saveCart();
  syncCartUI();
}

function saveCart() {
  try { localStorage.setItem('bm_cart_v1', JSON.stringify(S.cart)); } catch {}
}

function loadCart() {
  try {
    const raw = localStorage.getItem('bm_cart_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) S.cart = parsed;
    }
  } catch { S.cart = []; }
}

// =============================================================================
// CART — RENDER
// =============================================================================

function syncCartUI() {
  renderCartBadge();
  renderCartBody();
  renderCartFooter();
}

function renderCartBadge() {
  const total = cartTotalQty();
  const badge = document.getElementById('cart-count');
  const btn   = document.getElementById('cart-btn');
  if (!badge) return;
  badge.textContent = total;
  if (total > 0) badge.removeAttribute('hidden');
  else           badge.setAttribute('hidden', '');
  if (btn) btn.setAttribute('aria-label', `View cart (${total} item${total !== 1 ? 's' : ''})`);
}

function renderCartBody() {
  const body = document.getElementById('cart-body');
  if (!body) return;

  if (S.cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <p>Your cart is empty.</p>
        <a href="#shop" class="btn btn-primary" onclick="closeCart()">Start Shopping</a>
      </div>`;
    return;
  }

  const totalQty  = cartTotalQty();
  const priceEach = unitPrice(totalQty);

  body.innerHTML = S.cart.map(item => {
    const imgSrc    = item.color === 'Grey' ? 'Image_5.avif' : 'Image_1.avif';
    const lineTotal = (item.qty * priceEach).toFixed(2);
    const ec        = esc(item.color);
    const canInc    = totalQty < CFG.maxQty;
    return `
      <div class="cart-item">
        <div class="cart-item-img">
          <img src="${imgSrc}" alt="BackMellow Lumbar Pillow in ${ec}" loading="lazy"/>
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">BackMellow Lumbar Pillow</div>
          <div class="cart-item-variant">Color: ${ec}</div>
          <div class="cart-item-unit-price">$${priceEach.toFixed(2)} each</div>
          <div class="cart-item-line-price">$${lineTotal}</div>
          <div class="cart-item-controls">
            <button class="cart-qty-btn" data-action="dec" data-color="${ec}"
                    aria-label="Decrease quantity" ${item.qty <= 1 ? 'disabled' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <span class="cart-qty-val">${item.qty}</span>
            <button class="cart-qty-btn" data-action="inc" data-color="${ec}"
                    aria-label="Increase quantity" ${!canInc ? 'disabled' : ''}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button class="cart-remove-btn" data-action="remove" data-color="${ec}"
                    aria-label="Remove ${ec} pillow from cart">Remove</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderCartFooter() {
  const footer = document.getElementById('cart-footer');
  if (!footer) return;

  if (S.cart.length === 0) { footer.innerHTML = ''; return; }

  const totalQty = cartTotalQty();
  const subtotal = cartSubtotal();
  const savings  = cartSavings();
  const isBundle = bundleActive();
  const needed   = CFG.bundleMin - totalQty;

  const bundleHtml = isBundle
    ? `<div class="cart-bundle-note">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
           <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
         </svg>
         Bundle deal applied — $30 per pillow
       </div>`
    : `<div class="cart-bundle-note cart-pending-bundle">
         Add ${needed} more to unlock the $30/ea bundle deal
       </div>`;

  footer.innerHTML = `
    ${bundleHtml}
    <div class="cart-subtotal-row">
      <span>${totalQty} item${totalQty !== 1 ? 's' : ''} (before savings)</span>
      <span>$${regularTotal().toFixed(2)}</span>
    </div>
    ${savings > 0 ? `
    <div class="cart-savings-row">
      <span>${isBundle ? 'Bundle savings' : 'Sale savings'}</span>
      <span>−$${savings.toFixed(2)}</span>
    </div>` : ''}
    <div class="cart-total-row">
      <span>Total</span>
      <span>$${subtotal.toFixed(2)}</span>
    </div>
    <button class="cart-checkout-btn" id="cart-checkout-btn">
      Proceed to Checkout
    </button>
    <p class="cart-policy-note"><a href="returns.html">60-day returns</a> &middot; <a href="shipping.html">Ships 8–12 days</a> &middot; Checkout coming soon</p>`;

  document.getElementById('cart-checkout-btn')
    ?.addEventListener('click', openCheckoutModal);
}

// Delegated event listener for cart body actions
function initCartBodyDelegation() {
  document.getElementById('cart-body')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, color } = btn.dataset;
    const item = S.cart.find(i => i.color === color);
    if (!item && action !== 'remove') return;
    if (action === 'dec')    setCartItemQty(color, (item?.qty ?? 1) - 1);
    if (action === 'inc')    setCartItemQty(color, (item?.qty ?? 0) + 1);
    if (action === 'remove') removeCartItem(color);
  });
}

// =============================================================================
// CART — DRAWER OPEN / CLOSE
// =============================================================================

function openCart() {
  S.cartOpen = true;
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  drawer?.classList.add('open');  drawer?.setAttribute('aria-hidden', 'false');
  overlay?.classList.add('open'); overlay?.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('cart-close-btn')?.focus(), 60);
}

function closeCart() {
  S.cartOpen = false;
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  drawer?.classList.remove('open');  drawer?.setAttribute('aria-hidden', 'true');
  overlay?.classList.remove('open'); overlay?.setAttribute('aria-hidden', 'true');
  if (!S.menuOpen) document.body.style.overflow = '';
  document.getElementById('cart-btn')?.focus();
}

// =============================================================================
// SLIDESHOW
// =============================================================================

function initSlideshow() {
  const slides    = document.querySelectorAll('#slideshow .slide');
  const dotsWrap  = document.getElementById('slide-dots');
  const thumbBtns = document.querySelectorAll('#hero-thumbnails .thumb');

  if (!slides.length) return;

  // Build dots
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className     = 'slide-dot' + (i === 0 ? ' active' : '');
    dot.role          = 'tab';
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.setAttribute('aria-label', `Go to image ${i + 1}`);
    dot.addEventListener('click', () => { goToSlide(i); resetTimer(); });
    dotsWrap?.appendChild(dot);
  });

  // Thumbnails
  thumbBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      goToSlide(parseInt(btn.dataset.thumbIndex, 10));
      resetTimer();
    });
  });

  // Arrows
  document.getElementById('slide-prev')?.addEventListener('click', () => { prevSlide(); resetTimer(); });
  document.getElementById('slide-next')?.addEventListener('click', () => { nextSlide(); resetTimer(); });

  // Expand / lightbox
  document.querySelectorAll('.slide-expand-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openLightbox(parseInt(btn.dataset.slideIndex, 10)); });
  });
  slides.forEach(slide => {
    slide.addEventListener('click', e => {
      if (!e.target.closest('.slide-expand-btn')) openLightbox(parseInt(slide.dataset.index, 10));
    });
  });

  // Touch / swipe
  initSwipe(document.getElementById('slideshow'), () => { nextSlide(); resetTimer(); }, () => { prevSlide(); resetTimer(); });

  // Keyboard
  document.getElementById('slideshow')?.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { prevSlide(); resetTimer(); }
    if (e.key === 'ArrowRight') { nextSlide(); resetTimer(); }
  });

  // Pause on hover
  const ss = document.getElementById('slideshow');
  ss?.addEventListener('mouseenter', stopSlideshow);
  ss?.addEventListener('mouseleave', startSlideshow);

  startSlideshow();
}

function goToSlide(idx) {
  const slides    = document.querySelectorAll('#slideshow .slide');
  const dots      = document.querySelectorAll('#slide-dots .slide-dot');
  const thumbBtns = document.querySelectorAll('#hero-thumbnails .thumb');
  const total     = slides.length;
  const next      = ((idx % total) + total) % total;

  slides[S.slideIndex]?.classList.remove('active');
  dots[S.slideIndex]?.classList.remove('active');
  dots[S.slideIndex]?.setAttribute('aria-selected', 'false');
  thumbBtns[S.slideIndex]?.classList.remove('active');
  thumbBtns[S.slideIndex]?.setAttribute('aria-pressed', 'false');

  S.slideIndex = next;

  slides[S.slideIndex]?.classList.add('active');
  dots[S.slideIndex]?.classList.add('active');
  dots[S.slideIndex]?.setAttribute('aria-selected', 'true');
  thumbBtns[S.slideIndex]?.classList.add('active');
  thumbBtns[S.slideIndex]?.setAttribute('aria-pressed', 'true');
}

function nextSlide() { goToSlide(S.slideIndex + 1); }
function prevSlide() { goToSlide(S.slideIndex - 1); }

function startSlideshow() {
  if (S.slideshowTimer) return;
  S.slideshowTimer = setInterval(nextSlide, CFG.autoplayMs);
}
function stopSlideshow() {
  clearInterval(S.slideshowTimer);
  S.slideshowTimer = null;
}
function resetTimer() { stopSlideshow(); startSlideshow(); }

function initSwipe(el, onLeft, onRight) {
  if (!el) return;
  let startX = 0;
  el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 44) { dx < 0 ? onLeft() : onRight(); }
  }, { passive: true });
}

// =============================================================================
// LIGHTBOX
// =============================================================================

function openLightbox(idx) {
  S.lbIndex = idx;
  const lb  = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  if (!lb || !img) return;
  const data = CFG.images[idx];
  img.src = data.src; img.alt = data.alt;
  lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('lightbox-close')?.focus(), 60);
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb?.classList.remove('open'); lb?.setAttribute('aria-hidden', 'true');
  if (!S.cartOpen && !S.menuOpen) document.body.style.overflow = '';
}

function lbMove(delta) {
  S.lbIndex = (S.lbIndex + delta + CFG.images.length) % CFG.images.length;
  const img  = document.getElementById('lightbox-img');
  if (!img) return;
  img.style.opacity = '0';
  setTimeout(() => {
    const d = CFG.images[S.lbIndex];
    img.src = d.src; img.alt = d.alt;
    img.style.opacity = '1';
  }, 140);
}

function initLightbox() {
  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev') ?.addEventListener('click', () => lbMove(-1));
  document.getElementById('lightbox-next') ?.addEventListener('click', () => lbMove(+1));

  // Click backdrop to close
  document.getElementById('lightbox')?.addEventListener('click', e => {
    if (e.target === document.getElementById('lightbox')) closeLightbox();
  });

  // Swipe in lightbox
  initSwipe(document.getElementById('lightbox'), () => lbMove(+1), () => lbMove(-1));

  document.addEventListener('keydown', e => {
    const open = document.getElementById('lightbox')?.classList.contains('open');
    if (!open) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowRight') lbMove(+1);
    if (e.key === 'ArrowLeft')  lbMove(-1);
  });
}

// =============================================================================
// PURCHASE SECTION
// =============================================================================

function initPurchaseSection() {
  // Color swatches
  document.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(b => {
        b.classList.remove('active'); b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active'); btn.setAttribute('aria-checked', 'true');
      S.selColor = btn.dataset.color;
      const lbl = document.getElementById('selected-color-label');
      if (lbl) lbl.textContent = S.selColor;
      updatePricePreview();
    });
  });

  // Quantity
  document.getElementById('qty-decrease')?.addEventListener('click', () => {
    if (S.selQty > 1) { S.selQty--; syncQty(); updatePricePreview(); }
  });
  document.getElementById('qty-increase')?.addEventListener('click', () => {
    if (S.selQty < CFG.maxQty) { S.selQty++; syncQty(); updatePricePreview(); }
  });

  // Add to cart
  document.getElementById('add-to-cart-btn')?.addEventListener('click', () => {
    addToCart(S.selColor, S.selQty);
  });

  // Buy now
  document.getElementById('buy-now-btn')?.addEventListener('click', openCheckoutModal);

  // Shop thumbnails
  const mainImg   = document.getElementById('shop-main-img');
  const shopThumbs = document.querySelectorAll('#shop-thumbnails .shop-thumb');
  shopThumbs.forEach(btn => {
    btn.addEventListener('click', () => {
      shopThumbs.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
      if (mainImg) { mainImg.src = btn.dataset.src; mainImg.alt = btn.dataset.alt; }
    });
  });

  syncQty();
  updatePricePreview();
}

function syncQty() {
  const display = document.getElementById('qty-display');
  if (display) display.textContent = S.selQty;
  const decBtn = document.getElementById('qty-decrease');
  const incBtn = document.getElementById('qty-increase');
  if (decBtn) decBtn.disabled = S.selQty <= 1;
  if (incBtn) incBtn.disabled = S.selQty >= CFG.maxQty;
}

function updatePricePreview() {
  const el = document.getElementById('pricing-display');
  if (!el) return;

  const cartQty     = cartTotalQty();
  const projected   = cartQty + S.selQty;
  const priceEach   = unitPrice(projected);
  const lineTotal   = (S.selQty * priceEach).toFixed(2);
  const regLine     = (S.selQty * CFG.regularPrice).toFixed(2);
  const savings     = (S.selQty * CFG.regularPrice - S.selQty * priceEach).toFixed(2);
  const willBundle  = projected >= CFG.bundleMin;
  const needed      = CFG.bundleMin - projected;

  let html = `
    <div class="pd-row">
      <span>${S.selQty} × ${willBundle ? 'Bundle price' : 'Sale price'}</span>
      <span>$${priceEach.toFixed(2)} ea</span>
    </div>
    <div class="pd-total">
      <span>Line total</span>
      <span>$${lineTotal}</span>
    </div>`;

  if (parseFloat(savings) > 0) {
    html += `<div class="pd-savings"><span>You save vs regular price</span><span>−$${savings}</span></div>`;
  }
  if (!willBundle && needed > 0) {
    html += `<div class="pd-hint"><span>Add ${needed} more to unlock $30/ea bundle</span><span></span></div>`;
  }

  el.innerHTML = html;

  // Show/hide bundle callout
  const callout = document.getElementById('bundle-callout');
  if (callout) callout.style.display = willBundle ? 'none' : '';
}

// =============================================================================
// FAQ ACCORDION
// =============================================================================

function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      const panel  = document.getElementById(btn.getAttribute('aria-controls'));

      // Close all
      document.querySelectorAll('.faq-question').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        const p = document.getElementById(b.getAttribute('aria-controls'));
        p?.classList.remove('open');
      });

      // Toggle clicked
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        panel?.classList.add('open');
      }
    });
  });
}

// =============================================================================
// MOBILE MENU
// =============================================================================

function initMobileMenu() {
  const btn     = document.getElementById('mobile-menu-btn');
  const menu    = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-menu-overlay');

  function openMenu() {
    S.menuOpen = true;
    btn?.classList.add('open'); btn?.setAttribute('aria-expanded', 'true');
    menu?.classList.add('open'); menu?.setAttribute('aria-hidden', 'false');
    overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    S.menuOpen = false;
    btn?.classList.remove('open'); btn?.setAttribute('aria-expanded', 'false');
    menu?.classList.remove('open'); menu?.setAttribute('aria-hidden', 'true');
    overlay?.classList.remove('open');
    if (!S.cartOpen) document.body.style.overflow = '';
  }

  btn?.addEventListener('click', () => S.menuOpen ? closeMenu() : openMenu());
  overlay?.addEventListener('click', closeMenu);
  menu?.querySelectorAll('.mobile-nav-link').forEach(a => a.addEventListener('click', closeMenu));
}

// =============================================================================
// CHECKOUT MODAL
// =============================================================================

function openCheckoutModal() {
  const backdrop = document.getElementById('checkout-modal-backdrop');
  const modal    = document.getElementById('checkout-modal');
  backdrop?.classList.add('open'); backdrop?.setAttribute('aria-hidden', 'false');
  modal?.classList.add('open');    modal?.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('checkout-modal-ok')?.focus(), 60);
}

function closeCheckoutModal() {
  const backdrop = document.getElementById('checkout-modal-backdrop');
  const modal    = document.getElementById('checkout-modal');
  backdrop?.classList.remove('open'); backdrop?.setAttribute('aria-hidden', 'true');
  modal?.classList.remove('open');    modal?.setAttribute('aria-hidden', 'true');
  if (!S.cartOpen && !S.menuOpen) document.body.style.overflow = '';
}

function initCheckoutModal() {
  document.getElementById('checkout-modal-close')?.addEventListener('click', closeCheckoutModal);
  document.getElementById('checkout-modal-ok')   ?.addEventListener('click', closeCheckoutModal);
  document.getElementById('checkout-modal-backdrop')?.addEventListener('click', closeCheckoutModal);
}

// =============================================================================
// HEADER SCROLL + ACTIVE NAV
// =============================================================================

function initHeaderScroll() {
  const header   = document.getElementById('site-header');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('main section[id]');

  function onScroll() {
    header?.classList.toggle('scrolled', window.scrollY > 16);

    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 90) current = sec.id;
    });
    navLinks.forEach(link => {
      const href = link.getAttribute('href')?.replace('#', '');
      link.classList.toggle('active', href === current);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// =============================================================================
// SCROLL REVEAL ANIMATIONS
// =============================================================================

function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), (i % 4) * 90);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
    items.forEach(el => obs.observe(el));
  } else {
    items.forEach(el => el.classList.add('visible'));
  }
}

// =============================================================================
// SMOOTH SCROLL
// =============================================================================

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id     = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 64;
      const top     = target.getBoundingClientRect().top + window.scrollY - headerH - 8;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

// =============================================================================
// TOAST
// =============================================================================

let _toastTimer;
function showToast(msg, type = 'info') {
  let el = document.getElementById('bm-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bm-toast';
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `show${type !== 'info' ? ` toast-${type}` : ''}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 3000);
}

// =============================================================================
// UTILITY
// =============================================================================

function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

// =============================================================================
// GLOBAL KEY HANDLING
// =============================================================================

function initGlobalKeyDown() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('lightbox')?.classList.contains('open')) { closeLightbox(); return; }
      if (document.getElementById('checkout-modal')?.classList.contains('open')) { closeCheckoutModal(); return; }
      if (S.cartOpen) { closeCart(); return; }
    }
  });
}

// =============================================================================
// INIT
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  syncCartUI();

  initSlideshow();
  initLightbox();
  initCartBodyDelegation();
  initPurchaseSection();
  initFAQ();
  initMobileMenu();
  initCheckoutModal();
  initHeaderScroll();
  initScrollReveal();
  initSmoothScroll();
  initGlobalKeyDown();

  // Cart open / close
  document.getElementById('cart-btn')    ?.addEventListener('click', openCart);
  document.getElementById('cart-close-btn')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay') ?.addEventListener('click', closeCart);
});

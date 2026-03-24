const state = { token: localStorage.getItem('pm_token') || '', user: null };
const cartKey = 'pm_cart';
const lbpRate = 89500;

const byId = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));
const formatMoney = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);
const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value) || 0);
const formatLbp = (usd) => `${formatNumber((Number(usd) || 0) * lbpRate)} LBP`;
const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Not available';

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

function showMessage(target, message, kind = 'success') {
  if (!target) return;
  target.textContent = message;
  target.className = `message ${kind}`;
}

function hideMessage(target) {
  if (!target) return;
  target.textContent = '';
  target.className = 'message hidden';
}

function saveToken(token) {
  state.token = token;
  localStorage.setItem('pm_token', token);
}

function clearToken() {
  state.token = '';
  localStorage.removeItem('pm_token');
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(cartKey) || '[]');
  } catch (error) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const total = getCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('[data-cart-count]').forEach((node) => {
    node.textContent = total;
  });
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  const maxStock = Math.max(0, Number(product.stock) || 0);

  if (maxStock === 0) {
    return { ok: false, message: 'This product is currently out of stock.' };
  }

  if (existing) {
    existing.quantity = Math.min(maxStock, existing.quantity + quantity);
    existing.stock = maxStock;
  } else {
    cart.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: product.price,
      category: product.category,
      stock: maxStock,
      quantity: Math.min(maxStock, quantity),
    });
  }

  saveCart(cart);

  return {
    ok: true,
    message: existing && existing.quantity >= maxStock ? `Only ${maxStock} item(s) available.` : 'Added to cart.',
  };
}

async function loadCurrentUser() {
  if (!state.token) {
    decorateAuthLinks();
    return null;
  }

  try {
    const data = await api('/api/auth/me');
    state.user = data.user;
    decorateAuthLinks();
    return data.user;
  } catch (error) {
    clearToken();
    state.user = null;
    decorateAuthLinks();
    return null;
  }
}

function decorateAuthLinks() {
  document.querySelectorAll('[data-auth-link]').forEach((link) => {
    const shouldHide = (link.dataset.authLink === 'guest' && state.user) || (link.dataset.authLink === 'member' && !state.user);
    link.classList.toggle('hidden', Boolean(shouldHide));
  });

  document.querySelectorAll('[data-admin-link]').forEach((link) => {
    link.classList.toggle('hidden', !(state.user && state.user.role === 'admin'));
  });

  initUserMenus();
}

function closeUserMenus() {
  document.querySelectorAll('.user-menu-trigger').forEach((trigger) => {
    trigger.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  });

  document.querySelectorAll('.user-menu').forEach((menu) => {
    menu.classList.remove('is-open');
    menu.setAttribute('hidden', 'hidden');
  });
}

function initUserMenus() {
  const shortName = (name = '') => String(name).trim().split(/\s+/).slice(0, 1).join('') || 'User';

  document.querySelectorAll('.site-header__actions').forEach((actions) => {
    const memberLink = actions.querySelector('[data-auth-link="member"]');
    const adminLink = actions.querySelector('[data-admin-link]');
    if (!memberLink) return;

    let menu = actions.querySelector('.user-menu');

    if (!state.user) {
      memberLink.classList.remove('user-menu-trigger');
      memberLink.classList.remove('is-open');
      memberLink.innerHTML = '<span class="material-symbols-outlined">person</span>';
      memberLink.setAttribute('href', '/account');
      memberLink.removeAttribute('aria-expanded');
      memberLink.removeAttribute('aria-haspopup');
      if (menu) menu.remove();
      return;
    }

    if (adminLink) adminLink.classList.add('hidden');

    const displayName = shortName(state.user.name);
    memberLink.classList.add('user-menu-trigger');
    memberLink.setAttribute('href', '#');
    memberLink.setAttribute('aria-haspopup', 'menu');
    memberLink.setAttribute('aria-expanded', 'false');
    memberLink.innerHTML = `<span class="material-symbols-outlined">person</span><span class="user-menu-name">${escapeHtml(displayName)}</span><span class="material-symbols-outlined user-menu-caret">expand_more</span>`;

    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'user-menu';
      menu.setAttribute('hidden', 'hidden');
      document.body.appendChild(menu);
    }

    menu.innerHTML = `
      <div class="user-menu__head">
        <strong>${escapeHtml(state.user.name || 'Member')}</strong>
        <span>${escapeHtml(state.user.email || '')}</span>
      </div>
      <div class="user-menu__group">
        <a class="user-menu__item" href="/account"><span class="material-symbols-outlined">account_circle</span>My Account</a>
      </div>
      ${state.user.role === 'admin' ? '<div class="user-menu__group"><a class="user-menu__item" href="/admin"><span class="material-symbols-outlined">dashboard</span>Admin Dashboard</a><a class="user-menu__item" href="/admin/users"><span class="material-symbols-outlined">group</span>User Management</a></div>' : ''}
      <div class="user-menu__group user-menu__group--danger">
        <button class="user-menu__item user-menu__item--danger" type="button" data-user-logout="true"><span class="material-symbols-outlined">logout</span>Logout</button>
      </div>
    `;

    if (!memberLink.dataset.menuBound) {
      memberLink.dataset.menuBound = 'true';
      memberLink.addEventListener('click', (event) => {
        event.preventDefault();
        const isOpen = menu.classList.contains('is-open');
        closeUserMenus();
        if (!isOpen) {
          const rect = memberLink.getBoundingClientRect();
          const menuWidth = Math.min(300, Math.max(248, window.innerWidth - 16));
          const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
          menu.style.top = `${rect.bottom + 8}px`;
          menu.style.left = `${left}px`;
          menu.style.minWidth = `${menuWidth}px`;
          memberLink.classList.add('is-open');
          memberLink.setAttribute('aria-expanded', 'true');
          menu.classList.add('is-open');
          menu.removeAttribute('hidden');
        }
      });
    }

    if (!menu.dataset.logoutBound) {
      menu.dataset.logoutBound = 'true';
      menu.addEventListener('click', async (event) => {
        const logoutButton = event.target.closest('[data-user-logout]');
        if (!logoutButton) return;
        try {
          await api('/api/auth/logout', { method: 'POST' });
        } catch (error) {}
        clearToken();
        state.user = null;
        closeUserMenus();
        decorateAuthLinks();
        window.location.href = '/login';
      });
    }
  });
}

function initStoreSearch() {
  document.querySelectorAll('[data-store-search]').forEach((form) => {
    const input = form.querySelector('input[name="search"]');
    if (!input) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = input.value.trim();
      const url = new URL('/products', window.location.origin);
      if (value) url.searchParams.set('search', value);
      window.location.href = `${url.pathname}${url.search}`;
    });
  });
}

function setupPasswordToggles() {
  const icon = (visible) => visible
    ? `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.7a3 3 0 0 0 4.2 4.2"/><path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c5.3 0 9.3 4.1 10 7-.3 1.4-1.4 3.1-3 4.6"/><path d="M6.2 6.2C4.1 7.6 2.6 9.6 2 12c.7 2.9 4.7 7 10 7 1.8 0 3.4-.5 4.8-1.2"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;

  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    button.innerHTML = icon(false);
    button.addEventListener('click', () => {
      const input = button.closest('.password-field')?.querySelector('input');
      if (!input) return;
      const hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      button.innerHTML = icon(hidden);
      button.classList.toggle('is-visible', hidden);
    });
  });
}

function categoryHref(category) {
  const map = {
    Mobiles: '/mobiles',
    TVs: '/tvs',
    Audio: '/audio',
    Gaming: '/gaming',
    Wiring: '/wiring',
    Electronics: '/electronics',
  };

  return map[category] || `/products?category=${encodeURIComponent(category)}`;
}

function categoryLabel(category) {
  return category;
}

function initPrimaryNav() {
  const links = Array.from(document.querySelectorAll('[data-nav]'));
  if (!links.length) return;

  links.forEach((link) => link.classList.remove('site-header__link--active'));
  const path = window.location.pathname;
  const category = new URLSearchParams(window.location.search).get('category') || '';

  let active = '';
  if (path === '/') active = 'home';
  else if (path === '/products') {
    if (category === 'Deals') active = 'deals';
    else if (category === 'Wiring') active = 'wiring';
    else if (category === 'Electronics') active = 'electronics';
    else if (['Mobiles', 'TVs', 'Audio', 'Gaming'].includes(category)) active = category.toLowerCase();
    else active = 'shop';
  } else if (path === '/product') active = 'shop';
  else if (path === '/cart' || path === '/checkout') active = 'checkout';

  links.forEach((link) => {
    if (link.dataset.nav === active) link.classList.add('site-header__link--active');
  });
}

function serializeProduct(product) {
  return JSON.stringify(product).replace(/'/g, '&apos;');
}

function renderHomeDealCard(product, index) {
  const labels = [
    ['In Stock', 'New'],
    ['-15% OFF'],
    ['Top Pick'],
    ['Limited'],
  ];
  const activeLabels = labels[index % labels.length];

  return `<article class="group">
    <div class="bg-surface-container-low rounded-xl aspect-square mb-6 overflow-hidden relative">
      <a href="/product?slug=${encodeURIComponent(product.slug)}">
        <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
      </a>
      ${index === 0 ? `<button class="absolute top-4 right-4 p-2 bg-surface-container-lowest/80 backdrop-blur-md rounded-full text-on-surface hover:text-error transition-colors" type="button" aria-label="Featured product"><span class="material-symbols-outlined text-xl">favorite</span></button>` : ''}
      <div class="quick-add-wrap absolute bottom-0 inset-x-0 p-4">
        <button class="quick-add-btn w-full py-3 bg-primary text-on-primary font-bold text-sm rounded flex items-center justify-center gap-2" type="button" data-add-cart='${serializeProduct(product)}'>
          <span class="material-symbols-outlined text-sm">shopping_bag</span>
          Quick Add
        </button>
      </div>
    </div>
    <div class="space-y-1">
      <span class="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">${escapeHtml(categoryLabel(product.category))}</span>
      <a class="font-bold text-on-surface group-hover:text-primary transition-colors block" href="/product?slug=${encodeURIComponent(product.slug)}">${escapeHtml(product.name)}</a>
      <div class="flex items-center gap-2 pt-1 flex-wrap">
        <span class="text-lg font-black text-on-surface">${formatMoney(product.price)}</span>
        ${product.compareAtPrice ? `<span class="text-[10px] line-through opacity-30">${formatMoney(product.compareAtPrice)}</span>` : `<span class="text-[10px] text-on-surface-variant font-medium">${formatLbp(product.price)}</span>`}
      </div>
      <div class="flex gap-1 mt-2 flex-wrap">
        ${activeLabels.map((label, labelIndex) => `<span class="px-2 py-0.5 ${labelIndex === 0 ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'} text-[10px] font-bold rounded-full">${label}</span>`).join('')}
      </div>
    </div>
  </article>`;
}

function renderCatalogCard(product) {
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return `<article class="group bg-surface-container-lowest rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 flex flex-col">
    <div class="relative bg-surface-container-low p-6 xl:p-5 aspect-square flex items-center justify-center overflow-hidden">
      ${discount ? `<div class="absolute top-3 left-3 z-10"><span class="bg-tertiary text-on-tertiary text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-widest">-${discount}% Off</span></div>` : ''}
      <a class="w-full h-full" href="/product?slug=${encodeURIComponent(product.slug)}">
        <img class="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
      </a>
    </div>
    <div class="p-5 xl:p-4 flex-1 flex flex-col">
      <div class="flex justify-between items-start mb-2 gap-3">
        <span class="text-[10px] font-bold text-secondary uppercase tracking-widest">${escapeHtml(categoryLabel(product.category))}</span>
        <span class="text-[10px] font-bold ${product.stock > 0 ? 'text-primary' : 'text-error'} uppercase tracking-widest">${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
      </div>
      <a class="font-headline font-extrabold text-base xl:text-[1.02rem] text-on-surface mb-1.5 leading-tight line-clamp-2 block" href="/product?slug=${encodeURIComponent(product.slug)}">${escapeHtml(product.name)}</a>
      <p class="text-[0.95rem] xl:text-[0.9rem] text-on-surface-variant line-clamp-2 mb-4">${escapeHtml(product.summary)}</p>
      <div class="mt-auto space-y-3">
        <div class="flex flex-col gap-0.5">
          <span class="text-xl xl:text-[1.32rem] font-black text-primary">${formatMoney(product.price)}</span>
          <span class="text-xs font-medium text-on-surface-variant">
            ${product.compareAtPrice ? `${formatMoney(product.compareAtPrice)} compare` : formatLbp(product.price)}
          </span>
        </div>
        <div class="grid grid-cols-[64px,1fr] gap-2.5">
          <input class="w-full rounded-lg border border-outline-variant/30 bg-white px-2 py-2.5 text-center font-bold" type="number" min="1" max="${Math.max(1, product.stock)}" value="1" data-product-qty aria-label="Quantity for ${escapeHtml(product.name)}">
          <button class="quick-add-btn w-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold py-2.5 px-3.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60" type="button" data-add-cart='${serializeProduct(product)}' ${product.stock <= 0 ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-sm">shopping_cart</span>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  </article>`;
}

function renderSpecCards(product) {
  const entries = Object.entries(product.specs || {});
  if (!entries.length) return '';

  return entries.slice(0, 4).map(([key, value]) => `<div class="bg-surface-container-low p-4 rounded-lg flex flex-col justify-between">
      <span class="material-symbols-outlined text-primary mb-2">inventory_2</span>
      <div>
        <p class="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">${escapeHtml(key)}</p>
        <p class="text-sm font-bold">${escapeHtml(value)}</p>
      </div>
    </div>`).join('');
}

function renderSpecRows(product) {
  const entries = Object.entries(product.specs || {});
  if (!entries.length) {
    return `<div class="text-sm text-on-surface-variant">Specifications will be added soon.</div>`;
  }

  return entries.map(([key, value]) => `<div class="flex items-center justify-between gap-4 py-3 border-b border-outline-variant/15">
    <strong>${escapeHtml(key)}</strong>
    <span class="text-on-surface-variant">${escapeHtml(value)}</span>
  </div>`).join('');
}

function syncCartButtons(container, messageTarget) {
  if (!container) return;

  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-cart]');
    if (!button) return;

    const qtyInput = button.closest('article, .group, section, div')?.querySelector('[data-product-qty]');
    const qty = Number(qtyInput?.value || 1);
    const product = JSON.parse(button.dataset.addCart.replace(/&apos;/g, "'"));
    const result = addToCart(product, qty);
    if (messageTarget) showMessage(messageTarget, result.message, result.ok ? 'success' : 'error');
  });
}

function initHomePage() {
  const root = document.querySelector('[data-home-page]');
  if (!root) return Promise.resolve();

  const message = byId('heroMessage');
  const featuredGrid = byId('featuredGrid');
  const categoryGrid = byId('categoryGrid');

  return Promise.all([
    api('/api/products?featured=true'),
    api('/api/products/categories'),
  ]).then(([featuredData, categoriesData]) => {
    const featured = featuredData.products || [];
    const categories = categoriesData.categories || [];
    const hero = featured[0];
    const flash = featured[1] || featured[0];
    const gaming = featured.find((product) => product.category === 'Gaming') || featured[2] || featured[0];

    if (hero) {
      byId('homeHeroBadge').textContent = hero.featured ? 'Featured Now' : categoryLabel(hero.category);
      byId('homeHeroTitle').innerHTML = escapeHtml(hero.name);
      byId('homeHeroSummary').textContent = hero.summary;
      byId('homeHeroPrice').textContent = formatMoney(hero.price);
      byId('homeHeroLbp').textContent = `Approx. ${formatLbp(hero.price)} (Rate: ${formatNumber(lbpRate)})`;
      byId('homeHeroPrimaryLink').href = `/product?slug=${encodeURIComponent(hero.slug)}`;
      byId('homeHeroSecondaryLink').href = categoryHref(hero.category);
      const heroImage = byId('homeHeroImage');
      heroImage.src = hero.image;
      heroImage.alt = hero.name;
    }

    if (flash) {
      byId('flashPromoName').textContent = flash.name;
      byId('flashPromoPrice').textContent = formatMoney(flash.price);
      byId('flashPromoCompare').textContent = flash.compareAtPrice ? formatMoney(flash.compareAtPrice) : '';
      byId('flashPromoLink').href = `/product?slug=${encodeURIComponent(flash.slug)}`;
      byId('flashPromoImage').src = flash.image;
      byId('flashPromoImage').alt = flash.name;
    }

    if (gaming) {
      byId('gamingPromoName').textContent = gaming.name;
      byId('gamingPromoLink').href = categoryHref(gaming.category);
      byId('gamingPromoImage').src = gaming.image;
      byId('gamingPromoImage').alt = gaming.name;
    }

    if (categoryGrid) {
      const icons = {
        Mobiles: 'smartphone',
        TVs: 'tv',
        Audio: 'headphones',
        Gaming: 'sports_esports',
        Wiring: 'lightbulb',
        Electronics: 'electrical_services',
      };

      categoryGrid.innerHTML = categories.map((category) => `<a class="bg-surface-container-low p-6 rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-surface-container transition-colors cursor-pointer group" href="${categoryHref(category)}">
          <div class="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined text-2xl">${icons[category] || 'inventory_2'}</span>
          </div>
          <span class="font-bold text-sm tracking-tight">${escapeHtml(categoryLabel(category))}</span>
        </a>`).join('');
    }

    if (featuredGrid) {
      featuredGrid.innerHTML = featured.map((product, index) => renderHomeDealCard(product, index)).join('');
      syncCartButtons(featuredGrid, message);
    }
  }).catch((error) => {
    if (message) showMessage(message, error.message, 'error');
  });
}

function initCatalogPage() {
  const root = document.querySelector('[data-catalog-page]');
  if (!root) return Promise.resolve();

  const grid = byId('productsGrid');
  const chips = byId('catalogQuickFilters');
  const message = byId('catalogMessage');
  const searchInput = byId('catalogSearch');
  const sortSelect = byId('catalogSort');
  const countNode = byId('catalogCount');
  const titleNode = byId('catalogTitle');
  const descriptionNode = byId('catalogDescription');

  return Promise.all([
    api('/api/products/categories'),
    api('/api/products'),
  ]).then(([categoriesData, productsData]) => {
    const categories = categoriesData.categories || [];
    const products = productsData.products || [];
    const params = new URLSearchParams(window.location.search);
    let activeCategory = params.get('category') || root.dataset.defaultCategory || '';
    let activeSearch = params.get('search') || '';
    let activeSort = params.get('sort') || 'featured';

    const headings = {
      '': {
        title: 'Shop All Products',
        description: 'Browse the full shop with live stock, category filters, and direct add-to-cart actions.',
      },
      Deals: {
        title: 'Current Deals',
        description: 'Featured discounts and fast-moving products pulled directly from the live product feed.',
      },
    };

    if (searchInput) searchInput.value = activeSearch;
    if (sortSelect) sortSelect.value = activeSort;

    const updateUrl = () => {
      const next = new URL(window.location.href);
      next.searchParams.delete('category');
      next.searchParams.delete('search');
      next.searchParams.delete('sort');
      if (activeCategory) next.searchParams.set('category', activeCategory);
      if (activeSearch) next.searchParams.set('search', activeSearch);
      if (activeSort && activeSort !== 'featured') next.searchParams.set('sort', activeSort);
      window.history.replaceState({}, '', `${next.pathname}${next.search}`);
    };

    const sortProducts = (items) => {
      const next = [...items];
      if (activeSort === 'price-asc') next.sort((a, b) => a.price - b.price);
      else if (activeSort === 'price-desc') next.sort((a, b) => b.price - a.price);
      else if (activeSort === 'name') next.sort((a, b) => a.name.localeCompare(b.name));
      else next.sort((a, b) => Number(b.featured) - Number(a.featured));
      return next;
    };

    const renderFilters = () => {
      if (!chips) return;
      const filterItems = ['All', ...categories];
      chips.innerHTML = filterItems.map((category) => {
        const isActive = (!activeCategory && category === 'All') || activeCategory === category;
        return `<button class="catalog-chip ${isActive ? 'is-active' : ''} px-4 py-2 rounded-full text-sm font-bold" type="button" data-filter-category="${category === 'All' ? '' : escapeHtml(category)}">${escapeHtml(categoryLabel(category))}</button>`;
      }).join('');
    };

    const render = () => {
      let filtered = products.filter((product) => {
        const matchesCategory = !activeCategory || activeCategory === 'Deals' || product.category === activeCategory;
        const matchesSearch = !activeSearch || [product.name, product.category, product.summary].some((value) => String(value || '').toLowerCase().includes(activeSearch.toLowerCase()));
        const matchesDeals = activeCategory !== 'Deals' || product.featured || (product.compareAtPrice && product.compareAtPrice > product.price);
        return matchesCategory && matchesSearch && matchesDeals;
      });

      filtered = sortProducts(filtered);

      const heading = headings[activeCategory] || {
        title: categoryLabel(activeCategory) || 'Shop All Products',
        description: `Explore live ${categoryLabel(activeCategory) || 'store'} inventory with real prices and current stock.`,
      };

      if (titleNode) titleNode.textContent = heading.title;
      if (descriptionNode) descriptionNode.textContent = heading.description;
      if (countNode) countNode.textContent = `${filtered.length} product${filtered.length === 1 ? '' : 's'} available`;
      if (grid) {
        grid.innerHTML = filtered.length
          ? filtered.map(renderCatalogCard).join('')
          : `<div class="md:col-span-2 xl:col-span-3 bg-surface-container-low rounded-[28px] p-10">
              <h3 class="text-2xl font-extrabold mb-2">No products found</h3>
              <p class="text-on-surface-variant">Try a different keyword or switch to another category.</p>
            </div>`;
      }

      renderFilters();
      updateUrl();
    };

    chips?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-filter-category]');
      if (!button) return;
      activeCategory = button.dataset.filterCategory;
      render();
    });

    searchInput?.addEventListener('input', (event) => {
      activeSearch = event.target.value.trim();
      render();
    });

    sortSelect?.addEventListener('change', (event) => {
      activeSort = event.target.value;
      render();
    });

    syncCartButtons(grid, message);
    render();
  }).catch((error) => {
    if (message) showMessage(message, error.message, 'error');
  });
}

function initProductPage() {
  const root = document.querySelector('[data-product-page]');
  if (!root) return Promise.resolve();

  const slug = new URLSearchParams(window.location.search).get('slug');
  const message = byId('productMessage');
  if (!slug) {
    if (message) showMessage(message, 'No product selected.', 'error');
    return Promise.resolve();
  }

  return api(`/api/products/${slug}`)
    .then(async (data) => {
      const product = data.product;

      byId('productCategory').textContent = categoryLabel(product.category);
      byId('productBreadcrumbCategory').textContent = categoryLabel(product.category);
      byId('productBreadcrumbCategory').href = categoryHref(product.category);
      byId('productBreadcrumbName').textContent = product.name;
      byId('productName').textContent = product.name;
      byId('productSummary').textContent = product.summary;
      byId('productPrice').textContent = formatMoney(product.price);
      byId('productComparePrice').textContent = product.compareAtPrice ? formatMoney(product.compareAtPrice) : '';
      byId('productLbpPrice').textContent = `Approx. ${formatLbp(product.price)} (Rate: ${formatNumber(lbpRate)})`;
      byId('productStock').textContent = product.stock > 0 ? 'In Stock & Ready to Ship' : 'Currently Out of Stock';
      byId('productDelivery').textContent = product.stock > 0 ? `Delivery within 24-48 hours for ${product.category.toLowerCase()} orders where available.` : 'Restock updates will appear as soon as inventory changes.';
      byId('productImage').src = product.image;
      byId('productImage').alt = product.name;
      byId('productDescription').textContent = product.description;
      byId('productSpecsGrid').innerHTML = renderSpecCards(product);
      byId('productSpecsTable').innerHTML = renderSpecRows(product);

      const addButton = byId('addToCartButton');
      const buyButton = byId('buyNowButton');
      const qtyInput = byId('detailQty');
      qtyInput.max = Math.max(1, product.stock);
      addButton.disabled = product.stock <= 0;
      buyButton.classList.toggle('opacity-60', product.stock <= 0);

      addButton.addEventListener('click', () => {
        const qty = Number(qtyInput.value || 1);
        const result = addToCart(product, qty);
        if (message) showMessage(message, result.message, result.ok ? 'success' : 'error');
      });

      buyButton.addEventListener('click', (event) => {
        event.preventDefault();
        const qty = Number(qtyInput.value || 1);
        const result = addToCart(product, qty);
        if (result.ok) {
          window.location.href = '/checkout';
        } else if (message) {
          showMessage(message, result.message, 'error');
        }
      });

      const relatedWrap = byId('relatedProducts');
      if (!relatedWrap) return;

      const relatedData = await api(`/api/products?category=${encodeURIComponent(product.category)}`);
      const related = relatedData.products.filter((item) => item.slug !== product.slug).slice(0, 5);
      relatedWrap.innerHTML = related.length
        ? related.map(renderHomeDealCard).join('')
        : `<div class="col-span-full text-sm text-on-surface-variant">More products from this category will appear here as inventory grows.</div>`;
      syncCartButtons(relatedWrap, message);
    })
    .catch((error) => {
      if (message) showMessage(message, error.message, 'error');
    });
}

function renderCheckoutPage() {
  const root = document.querySelector('[data-checkout-page]');
  if (!root) return;

  const itemsWrap = byId('checkoutItems');
  const message = byId('checkoutMessage');

  function draw() {
    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = cart.length ? 5 : 0;
    const total = subtotal + shipping;

    byId('checkoutItemCount').textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    byId('checkoutSubtotal').textContent = formatMoney(subtotal);
    byId('checkoutShipping').textContent = formatMoney(shipping);
    byId('checkoutTotal').textContent = formatMoney(total);
    byId('checkoutTotalLbp').textContent = formatLbp(total);

    if (!cart.length) {
      itemsWrap.innerHTML = `<div class="bg-surface-container-low rounded-[28px] p-8">
          <h3 class="text-2xl font-extrabold mb-2">Your cart is empty</h3>
          <p class="text-on-surface-variant mb-6">Browse the live shop and add products here when you are ready.</p>
          <a class="inline-flex px-6 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-lg" href="/products">Browse products</a>
        </div>`;
      return;
    }

    itemsWrap.innerHTML = cart.map((item) => `
      <div class="bg-surface-container-lowest p-6 flex flex-col sm:flex-row gap-6 group transition-all">
        <div class="w-24 h-24 bg-surface-container flex-shrink-0 flex items-center justify-center rounded-lg overflow-hidden">
          <a class="w-full h-full" href="/product?slug=${encodeURIComponent(item.slug)}"><img class="object-contain w-full h-full" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"></a>
        </div>
        <div class="flex-grow flex flex-col justify-between">
          <div class="flex justify-between items-start gap-4">
            <div>
              <a class="font-bold text-lg text-on-surface block" href="/product?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}</a>
              <p class="text-sm text-on-surface-variant">${escapeHtml(item.category)} / Max available: ${item.stock}</p>
            </div>
            <button class="text-on-surface-variant hover:text-error transition-colors" type="button" data-cart-remove="${item.id}">
              <span class="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
          <div class="flex justify-between items-end mt-4 gap-4 flex-wrap">
            <div class="flex items-center bg-surface-container rounded-full px-1 py-1">
              <button class="w-8 h-8 flex items-center justify-center hover:bg-surface-container-highest rounded-full transition-all" type="button" data-cart-change="${item.id}" data-delta="-1">
                <span class="material-symbols-outlined text-sm">remove</span>
              </button>
              <input class="w-12 bg-transparent text-center font-bold text-sm outline-none" type="number" min="1" max="${item.stock}" value="${item.quantity}" data-cart-input="${item.id}">
              <button class="w-8 h-8 flex items-center justify-center hover:bg-surface-container-highest rounded-full transition-all" type="button" data-cart-change="${item.id}" data-delta="1">
                <span class="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
            <div class="text-right">
              <p class="text-xl font-black text-primary">${formatMoney(item.price * item.quantity)}</p>
              <p class="text-xs text-on-surface-variant">${formatLbp(item.price * item.quantity)}</p>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  itemsWrap.addEventListener('click', (event) => {
    const change = event.target.closest('[data-cart-change]');
    const remove = event.target.closest('[data-cart-remove]');
    const cart = getCart();

    if (change) {
      const item = cart.find((entry) => entry.id === change.dataset.cartChange);
      if (item) item.quantity = Math.max(1, Math.min(item.stock, item.quantity + Number(change.dataset.delta)));
      saveCart(cart);
      draw();
      return;
    }

    if (remove) {
      saveCart(cart.filter((item) => item.id !== remove.dataset.cartRemove));
      showMessage(message, 'Item removed from cart.', 'success');
      draw();
    }
  });

  itemsWrap.addEventListener('change', (event) => {
    const input = event.target.closest('[data-cart-input]');
    if (!input) return;

    const cart = getCart();
    const item = cart.find((entry) => entry.id === input.dataset.cartInput);
    if (!item) return;

    const nextQty = Math.max(1, Math.min(item.stock, Number(input.value) || 1));
    item.quantity = nextQty;
    input.value = nextQty;
    saveCart(cart);
    if (nextQty >= item.stock) showMessage(message, `Quantity capped at available stock (${item.stock}).`, 'error');
    else hideMessage(message);
    draw();
  });

  byId('clearCartButton')?.addEventListener('click', () => {
    saveCart([]);
    showMessage(message, 'Cart cleared.', 'success');
    draw();
  });

  byId('placeOrderButton')?.addEventListener('click', (event) => {
    event.preventDefault();
    if (!getCart().length) {
      showMessage(message, 'Add products to your cart before continuing.', 'error');
      return;
    }

    showMessage(message, 'Cart, pricing, and shipping state are fully wired. An order submission endpoint is not present in this codebase yet.', 'success');
  });

  draw();
}

function initRegisterPage() {
  const form = byId('registerForm');
  if (!form) return;

  const message = byId('registerMessage');
  byId('requestCodeButton').addEventListener('click', async () => {
    hideMessage(message);
    try {
      const data = await api('/api/auth/register/request-code', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      byId('verifyPanel').classList.remove('hidden');
      byId('verifyEmail').value = data.email;
      byId('previewCode').textContent = data.developmentCodePreview ? `Verification code: ${data.developmentCodePreview}` : 'Check your email inbox for the verification code.';
      showMessage(message, data.message, 'success');
    } catch (error) {
      showMessage(message, error.message, 'error');
    }
  });

  byId('completeSignupButton').addEventListener('click', async () => {
    hideMessage(message);
    try {
      const data = await api('/api/auth/register/verify', { method: 'POST', body: JSON.stringify({ email: byId('verifyEmail').value, code: byId('verificationCode').value }) });
      showMessage(message, data.message, 'success');
      form.reset();
      byId('verificationCode').value = '';
    } catch (error) {
      showMessage(message, error.message, 'error');
    }
  });
}

function initLoginPage() {
  const form = byId('loginForm');
  if (!form) return;

  const message = byId('loginMessage');
  const resetPanel = byId('resetPanel');
  const resetMessage = byId('resetMessage');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage(message);
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      saveToken(data.token);
      state.user = data.user;
      showMessage(message, `Welcome back, ${data.user.name}. Redirecting...`, 'success');
      setTimeout(() => {
        window.location.href = data.user.role === 'admin' ? '/admin' : '/account';
      }, 700);
    } catch (error) {
      showMessage(message, error.message, 'error');
    }
  });

  byId('forgotPasswordToggle')?.addEventListener('click', () => {
    resetPanel?.classList.toggle('hidden');
  });

  byId('requestResetCodeButton')?.addEventListener('click', async () => {
    hideMessage(resetMessage);
    try {
      const data = await api('/api/auth/password/request-code', {
        method: 'POST',
        body: JSON.stringify({ email: byId('resetEmail').value }),
      });

      byId('resetPreviewCode').textContent = data.developmentCodePreview ? `Reset code: ${data.developmentCodePreview}` : 'Check your email for the reset code.';
      showMessage(resetMessage, data.message, 'success');
    } catch (error) {
      showMessage(resetMessage, error.message, 'error');
    }
  });

  byId('resetPasswordButton')?.addEventListener('click', async () => {
    hideMessage(resetMessage);
    try {
      const data = await api('/api/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify({
          email: byId('resetEmail').value,
          code: byId('resetCode').value,
          password: byId('resetPassword').value,
        }),
      });

      showMessage(resetMessage, data.message, 'success');
    } catch (error) {
      showMessage(resetMessage, error.message, 'error');
    }
  });
}

async function initAccountPage() {
  if (!byId('accountPage')) return;
  const user = state.user || await loadCurrentUser();
  if (!user) {
    window.location.href = '/login';
    return;
  }

  byId('accountName').textContent = user.name;
  byId('accountEmail').textContent = user.email;
  byId('accountPhone').textContent = user.phone || 'Not provided';
  byId('accountBirthday').textContent = user.birthday ? new Date(user.birthday).toLocaleDateString() : 'Not provided';
  byId('accountAddress').textContent = user.address || 'Not provided';
  byId('accountLastLogin').textContent = formatDate(user.lastLoginAt);
  byId('accountRole').textContent = user.role;
  byId('accountStatus').textContent = user.status;

  byId('logoutButton')?.addEventListener('click', async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (error) {}
    clearToken();
    window.location.href = '/';
  });
}

function adminUsersQuery(searchValue, statusValue) {
  const params = new URLSearchParams();
  const search = String(searchValue || '').trim();
  const status = String(statusValue || '').trim();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function renderAdminStats(stats) {
  const statsRoot = byId('adminStats');
  if (!statsRoot) return;
  statsRoot.innerHTML = [
    ['Users', stats.totalUsers],
    ['Products', stats.totalProducts],
    ['Active Users', stats.activeUsers],
    ['Blocked', stats.blockedUsers],
    ['Sessions', stats.activeSessions],
    ['Admins', stats.adminUsers],
    ['Recent logins', stats.recentLogins],
  ].map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join('');
}

function renderAdminUsers(users) {
  const usersRoot = byId('adminUsers');
  if (!usersRoot) return;

  if (!users.length) {
    usersRoot.innerHTML = '<tr><td colspan="5" class="muted-copy">No users found for this filter.</td></tr>';
    return;
  }

  usersRoot.innerHTML = users.map((member) => {
    const userId = member.id || member._id || '';
    const statusClass = `admin-status-chip admin-status-chip--${member.status || 'inactive'}`;
    const roleClass = `admin-role-chip admin-role-chip--${member.role || 'user'}`;
    return `<tr>
      <td><strong>${escapeHtml(member.name)}</strong><br><span>${escapeHtml(member.email)}</span></td>
      <td>
        <span class="${roleClass}">${escapeHtml(member.role)}</span>
        <div class="actions-row" style="margin-top: 8px;">
          <button class="mini-button" data-role="admin" data-id="${userId}">Make Admin</button>
          <button class="mini-button" data-role="user" data-id="${userId}">Make User</button>
        </div>
      </td>
      <td><span class="${statusClass}">${escapeHtml(member.status)}</span></td>
      <td>${formatDate(member.lastLoginAt)}</td>
      <td>
        <div class="actions-row">
          <button class="mini-button" data-action="active" data-id="${userId}">Activate</button>
          <button class="mini-button" data-action="blocked" data-id="${userId}">Block</button>
          <button class="mini-button" data-action="inactive" data-id="${userId}">Inactive</button>
          <button class="mini-button" data-password-user="${userId}" data-user-name="${escapeHtml(member.name)}" data-user-email="${escapeHtml(member.email)}">Set Password</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function initAdminPage() {
  if (!byId('adminPage')) return;
  const message = byId('adminMessage');
  const user = state.user || await loadCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '/login';
    return;
  }

  const productForm = byId('productForm');
  let categories = [];

  function renderCategoryOptions(selected = '') {
    const select = byId('productCategoryInput');
    if (!select) return;

    const options = ['<option value="">Select category</option>', ...categories.map((item) => {
      const name = String(item.name || '');
      const isSelected = name === selected ? ' selected' : '';
      return `<option value="${escapeHtml(name)}"${isSelected}>${escapeHtml(name)}</option>`;
    })];
    select.innerHTML = options.join('');
  }

  function renderCategoryManager() {
    const root = byId('adminCategories');
    if (!root) return;

    if (!categories.length) {
      root.innerHTML = '<p class="muted-copy">No categories yet. Add one to start.</p>';
      return;
    }

    root.innerHTML = categories.map((item) => `<article class="admin-category-card">
      <div class="admin-category-card__name">${escapeHtml(item.name)}</div>
      <div class="admin-category-card__actions">
        <button class="admin-category-btn" type="button" data-category-edit="${item.id}">Rename</button>
        <button class="admin-category-btn admin-category-btn--danger" type="button" data-category-delete="${item.id}">Delete</button>
      </div>
    </article>`).join('');
  }

  function fillProductForm(product) {
    byId('productId').value = product?.id || '';
    byId('productNameInput').value = product?.name || '';
    byId('productSlugInput').value = product?.slug || '';
    renderCategoryOptions(product?.category || '');
    byId('productImageInput').value = product?.image || '';
    byId('productPriceInput').value = product?.price ?? '';
    byId('productComparePriceInput').value = product?.compareAtPrice ?? '';
    byId('productStockInput').value = product?.stock ?? 0;
    byId('productFeaturedInput').value = String(Boolean(product?.featured));
    byId('productSummaryInput').value = product?.summary || '';
    byId('productDescriptionInput').value = product?.description || '';
  }

  const loadAdmin = async () => {
    try {
      hideMessage(message);
      const [stats, products, categoryData] = await Promise.all([
        api('/api/admin/stats'),
        api('/api/admin/products'),
        api('/api/admin/categories'),
      ]);

      renderAdminStats(stats);
      categories = categoryData.categories || [];
      renderCategoryOptions(byId('productCategoryInput')?.value || '');
      renderCategoryManager();
      byId('adminProducts').innerHTML = products.products.map((product) => `<tr><td><strong>${escapeHtml(product.name)}</strong><br><span>${escapeHtml(product.slug)}</span></td><td>${escapeHtml(product.category)}</td><td>${formatMoney(product.price)}</td><td>${product.stock}</td><td><div class="actions-row"><button class="mini-button" data-product-edit="${product.id}">Edit</button><button class="mini-button" data-product-delete="${product.id}">Delete</button></div></td></tr>`).join('');
      byId('adminProducts').dataset.products = JSON.stringify(products.products);
    } catch (error) {
      showMessage(message, error.message, 'error');
    }
  };

  productForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage(message);

    const productId = byId('productId').value;
    const payload = {
      name: byId('productNameInput').value,
      slug: byId('productSlugInput').value,
      category: byId('productCategoryInput').value,
      image: byId('productImageInput').value,
      price: byId('productPriceInput').value,
      compareAtPrice: byId('productComparePriceInput').value || 0,
      stock: byId('productStockInput').value,
      featured: byId('productFeaturedInput').value,
      summary: byId('productSummaryInput').value,
      description: byId('productDescriptionInput').value,
    };

    try {
      if (productId) {
        await api(`/api/admin/products/${productId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        showMessage(message, 'Product updated successfully.', 'success');
      } else {
        await api('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
        showMessage(message, 'Product created successfully.', 'success');
      }

      fillProductForm(null);
      await loadAdmin();
    } catch (error) {
      showMessage(message, error.message, 'error');
    }
  });

  byId('resetProductButton')?.addEventListener('click', () => fillProductForm(null));

  byId('categoryForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = byId('categoryNameInput');
    const name = input?.value?.trim();
    if (!name) return;

    try {
      await api('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name }) });
      input.value = '';
      showMessage(message, 'Category added successfully.', 'success');
      await loadAdmin();
    } catch (error) {
      showMessage(message, error.message, 'error');
    }
  });

  byId('adminCategories')?.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-category-edit]');
    const deleteButton = event.target.closest('[data-category-delete]');

    if (editButton) {
      const category = categories.find((item) => item.id === editButton.dataset.categoryEdit);
      if (!category) return;
      const nextName = window.prompt('Rename category', category.name);
      if (!nextName || !nextName.trim() || nextName.trim() === category.name) return;
      try {
        await api(`/api/admin/categories/${category.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: nextName.trim() }),
        });
        showMessage(message, 'Category renamed successfully.', 'success');
        await loadAdmin();
      } catch (error) {
        showMessage(message, error.message, 'error');
      }
      return;
    }

    if (deleteButton) {
      const category = categories.find((item) => item.id === deleteButton.dataset.categoryDelete);
      if (!category) return;
      if (!window.confirm(`Delete category "${category.name}"?`)) return;
      try {
        await api(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
        showMessage(message, 'Category deleted successfully.', 'success');
        await loadAdmin();
      } catch (error) {
        showMessage(message, error.message, 'error');
      }
    }
  });

  byId('adminProducts')?.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-product-edit]');
    const deleteButton = event.target.closest('[data-product-delete]');
    const products = JSON.parse(byId('adminProducts').dataset.products || '[]');

    if (editButton) {
      const product = products.find((item) => item.id === editButton.dataset.productEdit);
      if (product) {
        fillProductForm(product);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (deleteButton) {
      try {
        await api(`/api/admin/products/${deleteButton.dataset.productDelete}`, { method: 'DELETE' });
        showMessage(message, 'Product deleted successfully.', 'success');
        if (byId('productId').value === deleteButton.dataset.productDelete) fillProductForm(null);
        await loadAdmin();
      } catch (error) {
        showMessage(message, error.message, 'error');
      }
    }
  });

  await loadAdmin();
}

async function initAdminUsersPage() {
  if (!byId('adminUsersPage')) return;
  const message = byId('adminMessage');
  const user = state.user || await loadCurrentUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '/login';
    return;
  }

  const loadUsers = async () => {
    try {
      hideMessage(message);
      const query = adminUsersQuery(byId('adminSearch')?.value, byId('adminStatus')?.value);
      const [stats, users] = await Promise.all([
        api('/api/admin/stats'),
        api(`/api/admin/users${query}`),
      ]);
      renderAdminStats(stats);
      renderAdminUsers(users.users || []);
    } catch (error) {
      showMessage(message, error.message, 'error');
    }
  };

  let usersSearchTimer = null;
  byId('adminSearch')?.addEventListener('input', () => {
    window.clearTimeout(usersSearchTimer);
    usersSearchTimer = window.setTimeout(loadUsers, 250);
  });
  byId('adminSearch')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      window.clearTimeout(usersSearchTimer);
      loadUsers();
    }
  });
  byId('adminStatus')?.addEventListener('change', loadUsers);

  byId('adminUsers')?.addEventListener('click', async (event) => {
    const statusButton = event.target.closest('[data-action]');
    const roleButton = event.target.closest('[data-role]');
    const passwordButton = event.target.closest('[data-password-user]');

    if (statusButton?.dataset.id) {
      try {
        await api(`/api/admin/users/${statusButton.dataset.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: statusButton.dataset.action }),
        });
        await loadUsers();
        showMessage(message, 'User status updated.', 'success');
      } catch (error) {
        showMessage(message, error.message, 'error');
      }
      return;
    }

    if (roleButton?.dataset.id) {
      try {
        await api(`/api/admin/users/${roleButton.dataset.id}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role: roleButton.dataset.role }),
        });
        await loadUsers();
        showMessage(message, 'User role updated.', 'success');
      } catch (error) {
        showMessage(message, error.message, 'error');
      }
      return;
    }

    if (passwordButton?.dataset.passwordUser) {
      byId('adminPasswordUserId').value = passwordButton.dataset.passwordUser;
      byId('adminPasswordInput').value = '';
      byId('adminPasswordTargetLabel').textContent = `Selected user: ${passwordButton.dataset.userName} (${passwordButton.dataset.userEmail})`;
      byId('adminPasswordPanel')?.classList.remove('hidden');
      byId('adminPasswordInput')?.focus();
    }
  });

  byId('adminPasswordCancel')?.addEventListener('click', () => {
    byId('adminPasswordPanel')?.classList.add('hidden');
    byId('adminPasswordUserId').value = '';
    byId('adminPasswordInput').value = '';
  });

  byId('adminPasswordForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const userId = byId('adminPasswordUserId').value;
    const password = byId('adminPasswordInput').value;
    if (!userId) return;

    try {
      await api(`/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      });
      byId('adminPasswordPanel')?.classList.add('hidden');
      byId('adminPasswordUserId').value = '';
      byId('adminPasswordInput').value = '';
      showMessage(message, 'Password updated and user sessions were reset.', 'success');
    } catch (error) {
      showMessage(message, error.message, 'error');
    }
  });

  await loadUsers();
}

(async function boot() {
  initPrimaryNav();
  await loadCurrentUser();
  updateCartCount();
  initStoreSearch();
  setupPasswordToggles();
  decorateAuthLinks();
  await initHomePage();
  await initCatalogPage();
  await initProductPage();
  renderCheckoutPage();
  initRegisterPage();
  initLoginPage();
  await initAccountPage();
  await initAdminPage();
  await initAdminUsersPage();
})();

document.addEventListener('click', (event) => {
  const insideMenu = event.target.closest('.user-menu');
  const trigger = event.target.closest('.user-menu-trigger');
  if (!insideMenu && !trigger) closeUserMenus();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeUserMenus();
});

window.addEventListener('resize', closeUserMenus);

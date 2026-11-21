import './products.js';
import { cloudConfig, cloudIsConfigured } from './cloud-config.js';
import { cloudLogin, cloudRefresh, cloudRead, cloudWrite, cloudUpload } from './cloud.js';

(() => {
  // Portfolio 2.0 type family: Fraunces, Archivo, and Space Mono.
  // This front-end passcode is a convenience, not secure authentication.
  const ADMIN_PIN = 'change-me';
  const STORAGE_KEY = 'harmonie-catalog-v2';
  const LEGACY_STORAGE_KEY = 'harmonie-catalog-v1';
  const SITE_IMAGES_KEY = 'harmonie-site-images-v1';
  const SITE_CONTACT_KEY = 'harmonie-site-contact-v1';
  const starterProducts = window.HARMONIE_PRODUCTS || [];
  const starterSiteImages = window.HARMONIE_SITE_IMAGES || {};
  const starterSiteContact = window.HARMONIE_SITE_CONTACT || {};
  const grid = document.querySelector('#product-grid');
  const dialog = document.querySelector('#product-dialog');
  const dialogContent = document.querySelector('#dialog-content');
  const adminDialog = document.querySelector('#admin-dialog');
  const productForm = document.querySelector('#product-form');
  const photoInput = document.querySelector('#product-image');
  const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
  let products = loadProducts();
  let editingId = null;
  let ownerToken = null;
  let ownerRefreshToken = null;
  let tokenExpiresAt = 0;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const photo = (value, width = 900) => /^(data:image\/|https?:\/\/)/i.test(value || '')
    ? value
    : `https://images.unsplash.com/${value}?auto=format&fit=crop&w=${width}&q=82`;
  const coverPhoto = product => product.image || product.gallery?.[0] || '';
  const galleryFor = product => {
    const all = Array.isArray(product.gallery) && product.gallery.length ? product.gallery : [coverPhoto(product)];
    const cover = coverPhoto(product);
    return [cover, ...all.filter(item => item && item !== cover)];
  };

  function loadSiteImages() {
    try {
      const saved = localStorage.getItem(SITE_IMAGES_KEY);
      return saved ? { ...starterSiteImages, ...JSON.parse(saved) } : { ...starterSiteImages };
    } catch (error) {
      return { ...starterSiteImages };
    }
  }
  let siteImages = loadSiteImages();

  function loadSiteContact() {
    try {
      const saved = localStorage.getItem(SITE_CONTACT_KEY);
      return saved ? { ...starterSiteContact, ...JSON.parse(saved) } : { ...starterSiteContact };
    } catch (error) {
      return { ...starterSiteContact };
    }
  }
  let siteContact = loadSiteContact();

  function renderContact() {
    const phone = document.querySelector('#contact-phone');
    const email = document.querySelector('#contact-email');
    phone.querySelector('b').textContent = siteContact.phone || '';
    email.querySelector('b').textContent = siteContact.email || '';
    let digits = String(siteContact.phone || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `234${digits.slice(1)}`;
    if (digits.length >= 10 && !/[xX]/.test(siteContact.phone)) {
      phone.href = `tel:+${digits}`;
      phone.removeAttribute('aria-disabled');
    } else {
      phone.removeAttribute('href');
      phone.setAttribute('aria-disabled', 'true');
    }
    if (siteContact.email && !siteContact.email.endsWith('.example')) {
      email.href = `mailto:${siteContact.email}`;
      email.removeAttribute('aria-disabled');
    } else {
      email.removeAttribute('href');
      email.setAttribute('aria-disabled', 'true');
    }
    document.querySelector('#contact-location').textContent = siteContact.location || '';
    document.querySelector('#contact-note').textContent = siteContact.mapNote || '';
    document.querySelector('#map-note').textContent = siteContact.mapNote || '';
    const lat = Number(siteContact.latitude) || 6.1859;
    const lon = Number(siteContact.longitude) || 6.7297;
    const bbox = `${lon - 0.04},${lat - 0.03},${lon + 0.04},${lat + 0.03}`;
    document.querySelector('#asaba-map').src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
    document.querySelector('#open-map').href = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=14/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`;
  }

  function assignImage(image, value, width) {
    const frame = image.parentElement;
    image.onload = () => { image.hidden = false; frame.classList.remove('no-photo'); };
    image.onerror = () => { image.hidden = true; frame.classList.add('no-photo'); };
    if (!value) {
      image.hidden = true;
      frame.classList.add('no-photo');
      return;
    }
    image.hidden = false;
    image.src = photo(value, width);
  }

  function applySiteImages() {
    assignImage(document.querySelector('#hero-image'), siteImages.hero, 1100);
    assignImage(document.querySelector('#story-image'), siteImages.story, 1000);
    assignImage(document.querySelector('#admin-hero-preview'), siteImages.hero, 700);
    assignImage(document.querySelector('#admin-story-preview'), siteImages.story, 700);
  }

  function wireProductPhotos(root) {
    root.querySelectorAll('.product-photo img,.dialog-photo img,.admin-product-row img').forEach(image => {
      image.onload = () => { image.hidden = false; image.parentElement.classList.remove('no-photo'); };
      image.onerror = () => { image.hidden = true; image.parentElement.classList.add('no-photo'); };
    });
  }

  function loadProducts() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.warn('Could not read the saved HARMONIE catalogue.', error);
    }
    return starterProducts.map(product => ({ ...product }));
  }

  function showCloudStatus(message = '') {
    const status = document.querySelector('#collection-sync-warning');
    status.textContent = message;
    status.hidden = !message;
  }

  function cacheCurrentContent() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    localStorage.setItem(SITE_IMAGES_KEY, JSON.stringify(siteImages));
    localStorage.setItem(SITE_CONTACT_KEY, JSON.stringify(siteContact));
  }

  async function uploadDataImage(value, folder) {
    if (typeof value === 'string' && value.startsWith('data:image/')) return cloudUpload(await ensureOwnerToken(), value, folder);
    return value;
  }

  async function ensureOwnerToken() {
    if (!ownerToken) throw new Error('Sign in to the owner studio before publishing shared changes.');
    if (Date.now() > tokenExpiresAt - 60000 && ownerRefreshToken) {
      const session = await cloudRefresh(ownerRefreshToken);
      ownerToken = session.access_token;
      ownerRefreshToken = session.refresh_token;
      tokenExpiresAt = Date.now() + Number(session.expires_in || 3600) * 1000;
    }
    return ownerToken;
  }

  async function publishCurrentContent() {
    if (!cloudIsConfigured()) { cacheCurrentContent(); return; }
    await ensureOwnerToken();
    const images = { ...siteImages };
    for (const key of Object.keys(images)) images[key] = await uploadDataImage(images[key], 'site');
    const publicProducts = [];
    for (const product of products) {
      const gallery = await Promise.all(galleryFor(product).map(image => uploadDataImage(image, 'products')));
      publicProducts.push({ ...product, image: gallery[0] || '', gallery });
    }
    await cloudWrite(await ensureOwnerToken(), { products: publicProducts, site_images: images, site_contact: siteContact });
    products = publicProducts;
    siteImages = images;
    cacheCurrentContent();
    applySiteImages();
    renderContact();
    render();
    showCloudStatus('Collection is published for all visitors.');
  }

  async function loadSharedContent() {
    if (!cloudIsConfigured()) {
      showCloudStatus('Showing the sample collection. Shared updates are not connected yet; add the Supabase settings before owner edits can publish to every visitor.');
      return;
    }
    try {
      const content = await cloudRead();
      if (content) {
        products = Array.isArray(content.products) ? content.products : starterProducts.map(product => ({ ...product }));
        siteImages = content.site_images || { ...starterSiteImages };
        siteContact = content.site_contact || { ...starterSiteContact };
        cacheCurrentContent();
        applySiteImages();
        renderContact();
        render();
        showCloudStatus('Showing the latest owner-published collection.');
      } else {
        showCloudStatus('The shared collection is ready for its first publish. Sign into Owner studio to publish the current collection.');
      }
    } catch (error) {
      console.warn('Could not load the shared HARMONIE collection.', error);
      showCloudStatus('Could not reach the shared collection. Showing the saved sample collection for now.');
    }
  }

  function render(filter = document.querySelector('.filter-chip.active')?.dataset.filter || 'All') {
    const visible = products.filter(product => filter === 'All' || product.category === filter);
    grid.innerHTML = visible.map((product, index) => `
      <article class="product-card" style="--card-delay:${index * 55}ms">
        <button class="product-open" type="button" data-product="${escapeHtml(product.id)}" aria-label="View ${escapeHtml(product.name)} details">
          <span class="product-photo"><span class="photo-fallback product-fallback" aria-hidden="true"><span>H</span><small>HARMONIE</small></span><img src="${photo(coverPhoto(product))}" alt="${escapeHtml(product.alt || product.name)}" loading="lazy"><span class="product-badge">${escapeHtml(product.badge || 'MADE WITH CARE')}</span><span class="quick-view">Take a closer look <b>↗</b></span></span>
          <span class="product-info"><span class="product-category">${escapeHtml(product.category)} <span>·</span> ${escapeHtml(product.detail)}</span><span class="product-name-price"><b>${escapeHtml(product.name)}</b><span>${money.format(Number(product.price) || 0)}</span></span></span>
        </button>
      </article>`).join('');
    wireProductPhotos(grid);
    renderAdminList();
  }

  function renderAdminList() {
    const list = document.querySelector('#admin-product-list');
    document.querySelector('#admin-product-count').textContent = products.length;
    list.innerHTML = products.map(product => `
      <article class="admin-product-row"><span class="admin-thumb"><span class="photo-fallback" aria-hidden="true"><span>H</span></span><img src="${photo(coverPhoto(product), 160)}" alt=""></span><span><b>${escapeHtml(product.name)}</b><small>${escapeHtml(product.category)} · ${money.format(Number(product.price) || 0)}${galleryFor(product).length > 1 ? ` · ${galleryFor(product).length} photos` : ''}</small></span><span class="admin-row-actions"><button type="button" class="edit-product" data-edit="${escapeHtml(product.id)}">Edit</button><button type="button" class="remove-product" data-remove="${escapeHtml(product.id)}" aria-label="Remove ${escapeHtml(product.name)}">Delete</button></span></article>`).join('') || '<p class="empty-catalogue">Your showcase is empty. Add a product above to get started.</p>';
    wireProductPhotos(list);
  }

  document.querySelectorAll('.filter-chip').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector('.filter-chip.active')?.classList.remove('active');
      button.classList.add('active');
      render(button.dataset.filter);
    });
  });

  grid.addEventListener('click', event => {
    const card = event.target.closest('[data-product]');
    if (!card) return;
    const product = products.find(item => item.id === card.dataset.product);
    if (!product) return;
    const gallery = galleryFor(product);
    dialogContent.innerHTML = `
      <div class="dialog-media"><div class="dialog-photo"><span class="photo-fallback" aria-hidden="true"><span>H</span><small>HARMONIE</small></span><img id="dialog-main-photo" src="${photo(gallery[0], 1100)}" alt="${escapeHtml(product.alt || product.name)}"></div>${gallery.length > 1 ? `<div class="gallery-thumbs" aria-label="More photos">${gallery.map((image, index) => `<button class="gallery-thumb${index === 0 ? ' is-active' : ''}" type="button" data-gallery-index="${index}" aria-label="Show photo ${index + 1}"><img src="${photo(image, 220)}" alt=""></button>`).join('')}</div>` : ''}</div>
      <div class="dialog-copy"><p class="eyebrow">${escapeHtml(product.category)} · ${escapeHtml(product.badge || 'MADE WITH CARE')}</p><h2 id="dialog-title">${escapeHtml(product.name)}</h2><p class="dialog-detail">${escapeHtml(product.detail)}</p><p class="dialog-description">${escapeHtml(product.description)}</p><strong class="dialog-price">${money.format(Number(product.price) || 0)}</strong><a class="button button-dark" href="#custom" data-close-dialog>Ask about this piece <span>↗</span></a><p class="dialog-note">Handmade in small batches. Please ask about colours, sizing, and availability.</p></div>`;
    dialog.dataset.activeProduct = product.id;
    wireProductPhotos(dialogContent);
    dialog.showModal();
  });

  dialogContent.addEventListener('click', event => {
    const thumb = event.target.closest('[data-gallery-index]');
    if (!thumb) return;
    const product = products.find(item => item.id === dialog.dataset.activeProduct);
    const image = product && galleryFor(product)[Number(thumb.dataset.galleryIndex)];
    if (!image) return;
    dialogContent.querySelector('#dialog-main-photo').src = photo(image, 1100);
    wireProductPhotos(dialogContent);
    dialogContent.querySelectorAll('.gallery-thumb').forEach(item => item.classList.toggle('is-active', item === thumb));
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target.closest('.dialog-close,[data-close-dialog]')) dialog.close();
  });
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());

  const menuToggle = document.querySelector('.menu-toggle');
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!open));
    menuToggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    document.querySelector('.desktop-nav').classList.toggle('menu-open', !open);
  });
  document.querySelectorAll('.desktop-nav a').forEach(link => link.addEventListener('click', () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    document.querySelector('.desktop-nav').classList.remove('menu-open');
  }));

  const adminLogin = document.querySelector('#admin-login');
  const adminManager = document.querySelector('#admin-manager');
  const adminError = document.querySelector('#admin-error');
  document.querySelectorAll('.open-admin').forEach(button => button.addEventListener('click', () => adminDialog.showModal()));
  document.querySelector('.admin-close').addEventListener('click', () => adminDialog.close());
  adminDialog.addEventListener('click', event => { if (event.target === adminDialog) adminDialog.close(); });
  adminDialog.addEventListener('close', () => {
    adminManager.hidden = true;
    adminLogin.hidden = false;
    adminError.textContent = '';
    ownerToken = null;
    ownerRefreshToken = null;
    tokenExpiresAt = 0;
  });

  document.querySelector('#admin-login-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const signIn = async () => {
      if (cloudIsConfigured()) {
        const session = await cloudLogin(form.elements.email.value.trim(), form.elements.password.value);
        ownerToken = session.access_token;
        ownerRefreshToken = session.refresh_token;
        tokenExpiresAt = Date.now() + Number(session.expires_in || 3600) * 1000;
        const content = await cloudRead();
        if (content) {
          products = Array.isArray(content.products) ? content.products : [];
          siteImages = content.site_images || {};
          siteContact = content.site_contact || siteContact;
          cacheCurrentContent();
          applySiteImages();
          renderContact();
          render();
        } else {
          await publishCurrentContent();
        }
      } else if (form.elements.pin.value !== ADMIN_PIN) {
        throw new Error('That passcode did not match. Try again.');
      }
      adminError.textContent = '';
      form.reset();
      adminLogin.hidden = true;
      adminManager.hidden = false;
      renderAdminList();
    };
    signIn().catch(error => { adminError.textContent = cloudIsConfigured() ? `Could not sign in: ${error.message}` : error.message; });
  });

  document.querySelector('#admin-logout').addEventListener('click', () => adminDialog.close());

  const siteContactForm = document.querySelector('#site-contact-form');
  siteContactForm.elements.phone.value = siteContact.phone || '';
  siteContactForm.elements.email.value = siteContact.email || '';
  siteContactForm.elements.location.value = siteContact.location || '';
  siteContactForm.elements.latitude.value = siteContact.latitude || 6.1859;
  siteContactForm.elements.longitude.value = siteContact.longitude || 6.7297;
  siteContactForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!siteContactForm.reportValidity()) return;
    const values = new FormData(siteContactForm);
    const previous = siteContact;
    const next = {
      phone: String(values.get('phone')).trim(),
      email: String(values.get('email')).trim(),
      location: String(values.get('location')).trim(),
      latitude: Number(values.get('latitude')),
      longitude: Number(values.get('longitude')),
      mapNote: 'Also serving customers in Lagos State · approximate campus-area pin'
    };
    try {
      siteContact = next;
      await publishCurrentContent();
      renderContact();
      document.querySelector('#contact-save-status').textContent = cloudIsConfigured() ? 'Published for all visitors.' : 'Saved only in this browser. Shared publishing is not connected yet.';
    } catch (error) {
      siteContact = previous;
      document.querySelector('#contact-save-status').textContent = `Could not save: ${error.message}`;
    }
  });

  photoInput.addEventListener('change', () => {
    const files = Array.from(photoInput.files || []);
    document.querySelector('#upload-label').textContent = files.length ? `${files.length} photo${files.length === 1 ? '' : 's'} selected` : (editingId ? 'Choose photos to add or replace' : 'Choose product photos');
  });

  function resetEditor() {
    editingId = null;
    productForm.reset();
    productForm.elements.id.value = '';
    document.querySelector('#upload-label').textContent = 'Choose product photos';
    document.querySelector('#product-image').required = false;
    document.querySelector('#cancel-edit').hidden = true;
    document.querySelector('.admin-submit').innerHTML = 'Add to showcase <span>＋</span>';
    document.querySelector('.admin-heading .eyebrow').textContent = 'YOUR PRODUCT SHOWCASE';
  }

  function startEditing(product) {
    editingId = product.id;
    productForm.elements.id.value = product.id;
    productForm.elements.name.value = product.name;
    productForm.elements.price.value = product.price;
    productForm.elements.category.value = product.category;
    productForm.elements.detail.value = product.detail;
    productForm.elements.description.value = product.description || '';
    productForm.elements.imageAction.value = 'keep';
    document.querySelector('#upload-label').textContent = 'Choose photos to add or replace';
    document.querySelector('#product-image').required = false;
    document.querySelector('#cancel-edit').hidden = false;
    document.querySelector('.admin-submit').innerHTML = 'Save changes <span>↗</span>';
    document.querySelector('.admin-heading .eyebrow').textContent = 'EDIT PRODUCT';
    productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelector('#cancel-edit').addEventListener('click', resetEditor);

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('Choose a valid image file.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The image could not be read.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('The image could not be opened.'));
        image.onload = () => {
          const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  [['hero', '#admin-hero-file'], ['story', '#admin-story-file']].forEach(([slot, selector]) => {
    document.querySelector(selector).addEventListener('change', async event => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      const status = document.querySelector('#site-photo-status');
      status.textContent = 'Preparing photo…';
      const previous = siteImages;
      try {
        const nextImages = { ...siteImages, [slot]: await compressImage(file) };
        siteImages = nextImages;
        await publishCurrentContent();
        applySiteImages();
        status.textContent = cloudIsConfigured() ? 'Photo published for all visitors.' : 'Photo saved in this browser only. Connect shared publishing to update visitors.';
      } catch (error) {
        siteImages = previous;
        applySiteImages();
        status.textContent = error.message || 'That photo could not be saved. Try a smaller image.';
      }
      event.currentTarget.value = '';
    });
  });

  productForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!productForm.reportValidity()) return;
    const files = Array.from(photoInput.files || []);
    const existing = editingId && products.find(item => item.id === editingId);
    if (!existing && files.length === 0) {
      alert('Choose at least one photo for this new product.');
      return;
    }
    const submit = productForm.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Saving…';
    try {
      const newPhotos = await Promise.all(files.map(compressImage));
      const values = new FormData(productForm);
      const name = String(values.get('name')).trim();
      const current = existing ? products.findIndex(item => item.id === existing.id) : -1;
      const oldGallery = existing ? galleryFor(existing) : [];
      const makeCover = !existing || (newPhotos.length > 0 && values.get('imageAction') === 'replace');
      const gallery = existing ? (makeCover ? [...newPhotos, ...oldGallery] : [...oldGallery, ...newPhotos]) : newPhotos;
      const updated = {
        ...(existing || {}),
        id: existing?.id || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        name,
        category: String(values.get('category')),
        detail: String(values.get('detail')).trim(),
        price: Number(values.get('price')),
        image: makeCover ? newPhotos[0] : coverPhoto(existing),
        gallery,
        alt: name,
        description: String(values.get('description')).trim() || String(values.get('detail')).trim(),
        badge: existing?.badge || 'NEW FROM HARMONIE'
      };
      const previous = products.map(item => ({ ...item }));
      if (existing) products[current] = updated;
      else products.unshift(updated);
      try {
        await publishCurrentContent();
        resetEditor();
        render();
      } catch (error) {
        products = previous;
        alert(`Could not publish the change: ${error.message}`);
      }
    } catch (error) {
      alert(error.message || 'The photo could not be added. Please try another image.');
    } finally {
      submit.disabled = false;
      if (!editingId) submit.innerHTML = 'Add to showcase <span>＋</span>';
      else submit.innerHTML = 'Save changes <span>↗</span>';
    }
  });

  document.querySelector('#admin-product-list').addEventListener('click', async event => {
    const editButton = event.target.closest('[data-edit]');
    if (editButton) {
      const product = products.find(item => item.id === editButton.dataset.edit);
      if (product) startEditing(product);
      return;
    }
    const removeButton = event.target.closest('[data-remove]');
    if (!removeButton) return;
    const product = products.find(item => item.id === removeButton.dataset.remove);
    if (!product || !confirm(`Delete “${product.name}” from the collection?`)) return;
    const previous = products;
    products = products.filter(item => item.id !== product.id);
    try { await publishCurrentContent(); }
    catch (error) { products = previous; alert(`Could not publish the deletion: ${error.message}`); }
    if (editingId === product.id) resetEditor();
    render();
  });

  document.querySelector('#export-products').addEventListener('click', () => {
    const contents = `// HARMONIE catalogue, site photos, and contact — exported from Owner studio.\nwindow.HARMONIE_PRODUCTS = ${JSON.stringify(products, null, 2)};\nwindow.HARMONIE_SITE_IMAGES = ${JSON.stringify(siteImages, null, 2)};\nwindow.HARMONIE_SITE_CONTACT = ${JSON.stringify(siteContact, null, 2)};\n`;
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/javascript' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.js';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const themeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const setThemeColor = () => { document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.body).backgroundColor; };
  setThemeColor();
  themeQuery.addEventListener?.('change', setThemeColor);

  if (cloudIsConfigured()) {
    document.querySelector('#local-pin-field').hidden = true;
    document.querySelector('#local-pin-field').querySelector('input').required = false;
    document.querySelector('#cloud-email-field').hidden = false;
    document.querySelector('#cloud-password-field').hidden = false;
    document.querySelector('#cloud-email-field').querySelector('input').required = true;
    document.querySelector('#cloud-password-field').querySelector('input').required = true;
    document.querySelector('#admin-login-note').textContent = 'Sign in with the owner account created in the connected Supabase project.';
  }
  applySiteImages();
  renderContact();
  render();
  loadSharedContent();
  if (cloudIsConfigured()) window.setInterval(() => { if (!ownerToken) loadSharedContent(); }, 30000);
})();

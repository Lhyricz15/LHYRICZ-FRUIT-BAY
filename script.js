const WHATSAPP_FALLBACK = '233203910059';
let products = Store.loadProducts();
let settings = Store.loadSettings();
let cart = JSON.parse(localStorage.getItem('lhyriczFruitBayCart') || '[]');
let activeCategory = 'All';

const money = amount => `${settings.currency}${Number(amount || 0).toFixed(2)}`;
const saveCart = () => localStorage.setItem('lhyriczFruitBayCart', JSON.stringify(cart));
const getProduct = id => products.find(p => Number(p.id) === Number(id));
const cartCount = () => cart.reduce((sum, item) => sum + item.qty, 0);
const subtotal = () => cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
const whatsappNumber = () => String(settings.whatsapp || WHATSAPP_FALLBACK).replace(/\D/g, '') || WHATSAPP_FALLBACK;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}

function openWhatsApp(message) {
  const url = `https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function renderBusinessText() {
  document.title = `${settings.businessName} | Order Freshness`;
  document.querySelectorAll('[data-business-name]').forEach(el => el.textContent = settings.businessName);
  document.querySelectorAll('[data-announcement]').forEach(el => el.textContent = settings.announcement);
  const footerPhone = document.getElementById('footerWhatsapp');
  if (footerPhone) footerPhone.textContent = formatPhoneDisplay(settings.whatsapp || WHATSAPP_FALLBACK);
}

function formatPhoneDisplay(number) {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.startsWith('233') && digits.length === 12) {
    return `0${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return number || '';
}

function renderCategories() {
  const categories = ['All', ...new Set(products.filter(p => p.available !== false).map(p => p.category).filter(Boolean))];
  if (!categories.includes(activeCategory)) activeCategory = 'All';
  document.getElementById('categoryRow').innerHTML = categories.map(category => `
    <button class="category-button ${activeCategory === category ? 'active' : ''}" data-category="${escapeHtml(category)}" type="button">${escapeHtml(category)}</button>
  `).join('');
  document.querySelectorAll('.category-button').forEach(button => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      renderCategories();
      renderProducts();
    });
  });
}

function productImage(product) {
  if (product.image) return `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">`;
  return `<span aria-hidden="true">${escapeHtml(product.emoji || '🍽️')}</span>`;
}

function renderProducts() {
  const available = products.filter(p => p.available !== false);
  const filtered = activeCategory === 'All' ? available : available.filter(p => p.category === activeCategory);
  const grid = document.getElementById('productsGrid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-menu"><strong>No items available here yet.</strong><span>Please check another category.</span></div>`;
    return;
  }

  grid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <div class="product-image">${productImage(product)}<span class="product-tag">Fresh</span></div>
      <div class="product-content">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description || '')}</p>
        <div class="product-meta">
          <span class="price">${money(product.price)}</span>
          <button class="add-btn" type="button" data-add="${Number(product.id)}">Add</button>
        </div>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('[data-add]').forEach(button => {
    button.addEventListener('click', () => addToCart(Number(button.dataset.add)));
  });
}

function addToCart(id) {
  const product = getProduct(id);
  if (!product || product.available === false) return;
  const existing = cart.find(item => Number(item.id) === Number(id));
  if (existing) {
    existing.qty += 1;
    existing.price = Number(product.price);
    existing.name = product.name;
    existing.emoji = product.emoji;
  } else {
    cart.push({ id, name: product.name, price: Number(product.price), emoji: product.emoji, image: product.image || '', qty: 1 });
  }
  saveCart();
  renderCart();
  openCart();
}

function updateQuantity(id, change) {
  const item = cart.find(entry => Number(entry.id) === Number(id));
  if (!item) return;
  item.qty += change;
  if (item.qty <= 0) cart = cart.filter(entry => Number(entry.id) !== Number(id));
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(item => Number(item.id) !== Number(id));
  saveCart();
  renderCart();
}

function syncCartWithCatalog() {
  cart = cart.filter(item => getProduct(item.id)?.available !== false);
  cart = cart.map(item => {
    const product = getProduct(item.id);
    return product ? { ...item, name: product.name, price: Number(product.price), emoji: product.emoji, image: product.image || '' } : item;
  });
  saveCart();
}

function renderCart() {
  const count = cartCount();
  document.getElementById('cartCount').textContent = count;
  const mobileCount = document.getElementById('mobileCartCount');
  if (mobileCount) mobileCount.textContent = count;
  const cartItems = document.getElementById('cartItems');
  const empty = document.getElementById('cartEmpty');
  const summary = document.getElementById('cartSummary');
  const sub = subtotal();

  if (!cart.length) {
    cartItems.innerHTML = '';
    empty.hidden = false;
    summary.hidden = true;
    return;
  }

  empty.hidden = true;
  summary.hidden = false;
  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-image" aria-hidden="true">${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : escapeHtml(item.emoji || '🍽️')}</div>
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <div class="cart-item-meta">${money(item.price)} each</div>
        <div class="qty-controls">
          <button type="button" data-qty="${Number(item.id)}" data-change="-1">−</button>
          <strong>${item.qty}</strong>
          <button type="button" data-qty="${Number(item.id)}" data-change="1">+</button>
        </div>
        <button class="remove-btn" type="button" data-remove="${Number(item.id)}">Remove</button>
      </div>
      <div class="item-total">${money(item.price * item.qty)}</div>
    </div>
  `).join('');

  document.getElementById('subtotal').textContent = money(sub);
  document.getElementById('deliveryFee').textContent = settings.deliveryFee > 0 ? money(settings.deliveryFee) : 'Calculated at checkout';
  document.getElementById('cartTotal').textContent = money(sub);
  document.getElementById('checkoutTotal').textContent = money(sub);

  document.querySelectorAll('[data-qty]').forEach(btn => btn.addEventListener('click', () => updateQuantity(Number(btn.dataset.qty), Number(btn.dataset.change))));
  document.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => removeFromCart(Number(btn.dataset.remove))));
}

function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartDrawer').setAttribute('aria-hidden', 'false');
  document.getElementById('cartOverlay').hidden = false;
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartDrawer').setAttribute('aria-hidden', 'true');
  document.getElementById('cartOverlay').hidden = true;
}

function openCheckout() {
  if (!cart.length) return;
  document.getElementById('checkoutModal').hidden = false;
  document.getElementById('checkoutTotal').textContent = money(subtotal());
  closeCart();
}

function closeCheckout() {
  document.getElementById('checkoutModal').hidden = true;
}

function createOrderMessage(formData) {
  const items = cart.map(item => `• ${item.qty} × ${item.name} — ${money(item.price * item.qty)}`).join('\n');
  const orderType = formData.get('orderType');
  const location = orderType === 'Delivery' ? (formData.get('location') || 'Not provided') : 'Pickup';
  const time = formData.get('time') || 'As soon as possible';
  const notes = formData.get('notes') || 'None';

  const delivery = orderType === 'Delivery' ? Number(settings.deliveryFee || 0) : 0;
  const total = subtotal() + delivery;
  return `Hello ${settings.businessName}! 👋\n\nI would like to place an order.\n\n🛒 *NEW ORDER*\n\n*Customer:* ${formData.get('name')}\n*Phone:* ${formData.get('phone')}\n*Order type:* ${orderType}\n*Location:* ${location}\n*Preferred time:* ${time}\n\n*Items:*\n${items}\n\n*Subtotal:* ${money(subtotal())}\n*Delivery:* ${delivery ? money(delivery) : 'GH₵0.00'}\n*Order total:* ${money(total)}\n\n*Special instructions:* ${notes}\n\nPlease confirm my order. Thank you!`;
}

document.getElementById('openCartBtn').addEventListener('click', openCart);
const mobileCartBtn = document.getElementById('mobileCartBtn');
if (mobileCartBtn) mobileCartBtn.addEventListener('click', openCart);
const mobileWhatsAppBtn = document.getElementById('mobileWhatsAppBtn');
if (mobileWhatsAppBtn) mobileWhatsAppBtn.addEventListener('click', () => openWhatsApp(`Hello ${settings.businessName}! I would like to make an order.`));
document.getElementById('closeCartBtn').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);
document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
document.getElementById('closeCheckoutBtn').addEventListener('click', closeCheckout);
document.getElementById('heroWhatsAppBtn').addEventListener('click', () => openWhatsApp(`Hello ${settings.businessName}! I would like to make an order.`));
document.getElementById('contactWhatsAppBtn').addEventListener('click', () => openWhatsApp(`Hello ${settings.businessName}! I would like to make an order.`));

document.getElementById('orderType').addEventListener('change', event => {
  const locationField = document.getElementById('locationField');
  locationField.style.display = event.target.value === 'Delivery' ? 'grid' : 'none';
});

document.getElementById('checkoutForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!cart.length) return;
  const formData = new FormData(event.currentTarget);

  openWhatsApp(createOrderMessage(formData));
});

window.addEventListener('storage', () => {
  products = Store.loadProducts();
  settings = Store.loadSettings();
  syncCartWithCatalog();
  renderBusinessText();
  renderCategories();
  renderProducts();
  renderCart();
});
window.addEventListener('catalog-updated', () => {
  products = Store.loadProducts();
  syncCartWithCatalog();
  renderCategories();
  renderProducts();
  renderCart();
});
window.addEventListener('settings-updated', () => {
  settings = Store.loadSettings();
  renderBusinessText();
  renderCart();
});

syncCartWithCatalog();
renderBusinessText();
renderCategories();
renderProducts();
renderCart();

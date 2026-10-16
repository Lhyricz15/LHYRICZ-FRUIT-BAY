/* LHYRICZ FRUIT BAY - customer storefront */
let products = [];
let settings = {};
let cart = [];
let activeCategory = "All";
let fruitAnimations = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"
}[c]));
const money = value => `${settings.currency || "GH₵"}${Number(value || 0).toFixed(2)}`;

// Floating fruit animation: spawns emoji elements that float up and fade
function initFruitAnimations(options = {}) {
  const container = document.getElementById("fruit-container");
  if (!container) return null;

  const defaults = {
    emojis: ["🍎","🍌","🍊","🍍","🍓","🍇","🥭","🍉","🥝","🍋"],
    spawnInterval: 600,
    maxOnScreen: 24,
    minSize: 18,
    maxSize: 56,
    durationMin: 4200,
    durationMax: 9000
  };
  const cfg = Object.assign({}, defaults, options);

  let running = true;

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function spawnFruit() {
    if (!running) return;
    if (container.children.length >= cfg.maxOnScreen) return;

    const el = document.createElement('div');
    el.className = 'fruit float-up';
    el.textContent = cfg.emojis[Math.floor(Math.random() * cfg.emojis.length)];

    const size = Math.round(rand(cfg.minSize, cfg.maxSize));
    el.style.fontSize = `${size}px`;
    el.style.left = `${rand(2, 96)}vw`;
    el.style.bottom = `-${rand(6, 18)}vh`;

    const drift = `${Math.round(rand(-80, 80))}px`;
    const rot = `${Math.round(rand(-220, 220))}deg`;
    el.style.setProperty('--fruit-drift-x', drift);
    el.style.setProperty('--fruit-rotation', rot);

    const duration = Math.round(rand(cfg.durationMin, cfg.durationMax));
    el.style.animationDuration = `${duration}ms`;

    container.appendChild(el);

    el.addEventListener('animationend', () => { if (el.parentNode) el.parentNode.removeChild(el); });
  }

  const id = setInterval(spawnFruit, cfg.spawnInterval);

  return {
    stop() { running = false; clearInterval(id); },
    start() { if (!running) { running = true; /* won't restart interval - kept simple */ } },
    clear() { container.innerHTML = ''; }
  };
}

function saveCart() {
  localStorage.setItem("lhyriczFruitBayCartV1", JSON.stringify(cart));
}
function loadCart() {
  try { cart = JSON.parse(localStorage.getItem("lhyriczFruitBayCartV1") || "[]"); }
  catch (_) { cart = []; }
}
function cartQty() { return cart.reduce((sum, item) => sum + item.quantity, 0); }
function subtotal() { return cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0); }

function renderSettings() {
  $$("[data-business-name]").forEach(el => el.textContent = settings.businessName || "LHYRICZ FRUIT BAY");
  $$("[data-announcement]").forEach(el => el.textContent = settings.announcement || "Every Bite.");
  if ($("#footerWhatsapp")) $("#footerWhatsapp").textContent = settings.whatsapp || "020 391 0059";
  document.title = `${settings.businessName || "LHYRICZ FRUIT BAY"} | Order Freshness`;
}

function categories() {
  return ["All", ...new Set(products.map(p => p.category).filter(Boolean))];
}

function renderCategories() {
  const row = $("#categoryRow");
  if (!row) return;
  row.innerHTML = categories().map(category =>
    `<button class="category-pill ${activeCategory === category ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
  ).join("");
  $$("[data-category]").forEach(btn => btn.addEventListener("click", () => {
    activeCategory = btn.dataset.category;
    renderCategories();
    renderProducts();
  }));
}

function renderProducts() {
  const grid = $("#productsGrid");
  if (!grid) return;
  const visible = products.filter(p => p.available !== false &&
    (activeCategory === "All" || p.category === activeCategory));

  if (!visible.length) {
    grid.innerHTML = `<div class="menu-empty"><strong>No items available right now.</strong><span>Check back soon.</span></div>`;
    return;
  }

  grid.innerHTML = visible.map(p => `
    <article class="product-card">
      <div class="product-card-image">
        ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">` :
          `<div class="product-emoji">${escapeHtml(p.emoji || "🍽️")}</div>`}
        <span class="product-category">${escapeHtml(p.category)}</span>
      </div>
      <div class="product-card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.description || "Freshly prepared and ready to enjoy.")}</p>
        <div class="product-card-bottom">
          <strong>${money(p.price)}</strong>
          <button class="btn btn-primary product-add" type="button" data-add="${escapeHtml(p.id)}">Add to cart</button>
        </div>
      </div>
    </article>
  `).join("");

  $$("[data-add]").forEach(btn => btn.addEventListener("click", () => addToCart(btn.dataset.add)));
}

function addToCart(id) {
  const p = products.find(x => String(x.id) === String(id));
  if (!p) return;
  const existing = cart.find(x => String(x.id) === String(id));
  if (existing) existing.quantity += 1;
  else cart.push({ id:p.id, name:p.name, price:Number(p.price), image:p.image, emoji:p.emoji, quantity:1 });
  saveCart();
  renderCart();
  openCart();
  if (fruitAnimations && typeof fruitAnimations.spawn === 'function') {
    try { fruitAnimations.spawn(); } catch (e) { /* ignore */ }
  } else if (fruitAnimations == null && document.getElementById('fruit-container')) {
    // fallback: create a single fruit immediately
    const container = document.getElementById('fruit-container');
    const el = document.createElement('div'); el.className = 'fruit float-up'; el.textContent = p.emoji || '🍎'; el.style.fontSize = '34px'; el.style.left = `${Math.random()*90+5}%`; el.style.animationDuration = '2800ms'; container.appendChild(el); el.addEventListener('animationend', () => { if (el.parentNode) el.parentNode.removeChild(el); });
  }
}

function changeQty(id, delta) {
  const item = cart.find(x => String(x.id) === String(id));
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(x => String(x.id) !== String(id));
  saveCart();
  renderCart();
}

function renderCart() {
  const itemsEl = $("#cartItems"), emptyEl = $("#cartEmpty"), summary = $("#cartSummary");
  if (!itemsEl) return;
  const count = cartQty();
  if ($("#cartCount")) $("#cartCount").textContent = count;
  if ($("#mobileCartCount")) $("#mobileCartCount").textContent = count;

  emptyEl.hidden = count > 0;
  summary.hidden = count === 0;

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-thumb">${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : escapeHtml(item.emoji || "🍽️")}</div>
      <div class="cart-item-info">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${money(item.price)}</span>
        <div class="cart-item-controls">
          <button type="button" data-minus="${escapeHtml(item.id)}">−</button>
          <b>${item.quantity}</b>
          <button type="button" data-plus="${escapeHtml(item.id)}">+</button>
        </div>
      </div>
      <strong>${money(item.price * item.quantity)}</strong>
    </div>
  `).join("");

  $$("[data-minus]").forEach(b => b.addEventListener("click", () => changeQty(b.dataset.minus, -1)));
  $$("[data-plus]").forEach(b => b.addEventListener("click", () => changeQty(b.dataset.plus, 1)));

  const sub = subtotal();
  if ($("#subtotal")) $("#subtotal").textContent = money(sub);
  if ($("#deliveryFee")) $("#deliveryFee").textContent = money(settings.deliveryFee || 0);
  if ($("#cartTotal")) $("#cartTotal").textContent = money(sub + Number(settings.deliveryFee || 0));
  if ($("#checkoutTotal")) $("#checkoutTotal").textContent = money(sub + Number(settings.deliveryFee || 0));
}

function openCart() {
  $("#cartOverlay").hidden = false;
  $("#cartDrawer").classList.add("open");
  $("#cartDrawer").setAttribute("aria-hidden", "false");
}
function closeCart() {
  $("#cartOverlay").hidden = true;
  $("#cartDrawer").classList.remove("open");
  $("#cartDrawer").setAttribute("aria-hidden", "true");
}
function openCheckout() {
  if (!cart.length) return;
  closeCart();
  $("#checkoutModal").hidden = false;
}
function closeCheckout() { $("#checkoutModal").hidden = true; }

function whatsappNumber() {
  let n = String(settings.whatsapp || "").replace(/[^\d]/g, "");
  if (n.startsWith("0")) n = "233" + n.slice(1);
  return n;
}

function openWhatsApp(text = `Hello ${settings.businessName || "LHYRICZ FRUIT BAY"}, I would like to place an order.`) {
  const n = whatsappNumber();
  if (!n) return alert("WhatsApp number has not been configured.");
  const waUrl = `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
  const popup = window.open(waUrl, "_blank", "noopener");
  if (!popup) window.location.href = waUrl;
}

function buildWhatsAppMessage(form, orderId) {
  const sub = subtotal();
  const delivery = form.orderType.value === "Delivery" ? Number(settings.deliveryFee || 0) : 0;
  const total = sub + delivery;
  const lines = cart.map((item, i) =>
    `${i + 1}. ${item.name} x${item.quantity} — ${money(item.price * item.quantity)}`
  ).join("\n");

  return [
    `Hello ${settings.businessName || "LHYRICZ FRUIT BAY"}!`,
    "",
    "NEW WEBSITE ORDER",
    `Order ID: ${orderId}`,
    `Customer: ${form.name.value.trim()}`,
    `Phone: ${form.phone.value.trim()}`,
    `Order type: ${form.orderType.value}`,
    form.orderType.value === "Delivery" ? `Location: ${form.location.value.trim()}` : null,
    `Preferred time: ${form.time.value.trim() || "As soon as possible"}`,
    "",
    "ITEMS:",
    lines,
    "",
    `Subtotal: ${money(sub)}`,
    `Delivery: ${money(delivery)}`,
    `TOTAL: ${money(total)}`,
    `Notes: ${form.notes.value.trim() || "None"}`,
    "",
    "Sent from the LHYRICZ FRUIT BAY website."
  ].filter(Boolean).join("\n");
}

async function submitCheckout(event) {
  event.preventDefault();
  if (!cart.length) return;
  const form = event.currentTarget;
  const submit = form.querySelector("button[type=submit]");
  submit.disabled = true;
  submit.textContent = "Sending order…";

  try {
    const delivery = form.orderType.value === "Delivery" ? Number(settings.deliveryFee || 0) : 0;
    const sub = subtotal();
    const total = sub + delivery;

    const savedOrder = await Store.createOrder({
      customerName: form.name.value,
      phone: form.phone.value,
      orderType: form.orderType.value,
      location: form.location.value,
      preferredTime: form.time.value,
      notes: form.notes.value,
      items: cart,
      subtotal: sub,
      deliveryFee: delivery,
      total
    });

    const orderId = `LFB-${String(savedOrder.id).replace(/-/g, "").toUpperCase()}`;

       // Send the order confirmation SMS without interrupting checkout.
    try {
      const { data, error } = await Store.supabase.functions.invoke(
        "send-order-sms",
        {
          body: { order_id: savedOrder.id }
        }
      );

      if (error) {
        console.error("Order SMS request failed:", error.message);
      } else if (data?.success) {
        console.log("Order SMS accepted:", data.orderId);
      } else {
        console.warn("Order SMS was not confirmed:", data);
      }
    } catch (smsError) {
      console.error("SMS notification error:", smsError);
    }

    const message = buildWhatsAppMessage(form, orderId);
    cart = [];
    saveCart();
    renderCart();
    closeCheckout();
    form.reset();
    $("#locationField").classList.add("hidden-field");
    openWhatsApp(message);
    showOrderConfirmation(orderId);
  } catch (error) {
    console.error(error);
    alert(`The order could not be saved: ${error.message || "Please try again."}`);
  } finally {
    submit.disabled = false;
    submit.textContent = "Send Order to WhatsApp";
  }
}

function showOrderConfirmation(orderId) {
  const modal = $("#orderConfirmationModal");
  const idEl = $("#confirmedOrderId");
  if (!modal || !idEl) {
    alert(`Your order has been saved. Order ID: ${orderId}`);
    return;
  }
  idEl.textContent = orderId;
  modal.hidden = false;
}

async function copyOrderId() {
  const orderId = $("#confirmedOrderId")?.textContent || "";
  if (!orderId) return;
  try {
    await navigator.clipboard.writeText(orderId);
    const button = $("#copyOrderIdBtn");
    if (button) {
      button.textContent = "Copied!";
      setTimeout(() => { button.textContent = "Copy Order ID"; }, 1800);
    }
  } catch (_) {
    window.prompt("Copy your Order ID:", orderId);
  }
}



async function refreshStore() {
  try {
    [products, settings] = await Promise.all([Store.loadProducts(), Store.loadSettings()]);
    renderSettings();
    renderCategories();
    renderProducts();
    renderCart();
  } catch (error) {
    console.error(error);
    const grid = $("#productsGrid");
    if (grid) grid.innerHTML = `<div class="menu-empty"><strong>Unable to load the menu.</strong><span>Please refresh the page.</span></div>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  loadCart();
  // initialize fruit animations (if the container exists)
  fruitAnimations = initFruitAnimations();

  await refreshStore();

  $("#openCartBtn")?.addEventListener("click", openCart);
  $("#mobileCartBtn")?.addEventListener("click", openCart);
  $("#closeCartBtn")?.addEventListener("click", closeCart);
  $("#cartOverlay")?.addEventListener("click", closeCart);
  $("#checkoutBtn")?.addEventListener("click", openCheckout);
  $("#closeCheckoutBtn")?.addEventListener("click", closeCheckout);
  $("#checkoutForm")?.addEventListener("submit", submitCheckout);
  $("#closeOrderConfirmationBtn")?.addEventListener("click", () => { $("#orderConfirmationModal").hidden = true; });
  $("#doneOrderConfirmationBtn")?.addEventListener("click", () => { $("#orderConfirmationModal").hidden = true; });
  $("#copyOrderIdBtn")?.addEventListener("click", copyOrderId);

  $("#orderType")?.addEventListener("change", e => {
    $("#locationField").classList.toggle("hidden-field", e.target.value !== "Delivery");
  });

  const wa = () => openWhatsApp();
  $("#heroWhatsAppBtn")?.addEventListener("click", wa);
  $("#contactWhatsAppBtn")?.addEventListener("click", wa);
  $("#mobileWhatsAppBtn")?.addEventListener("click", wa);

  /* =========================================
   LIGHT / DARK MODE
   ========================================= */

const themeToggle = document.getElementById("theme-toggle");

if (themeToggle) {

    // Load saved theme
    const savedTheme = localStorage.getItem("fruitBayTheme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        themeToggle.textContent = "☀️";
    }

    themeToggle.addEventListener("click", () => {

        document.body.classList.toggle("dark-mode");

        const isDarkMode = document.body.classList.contains("dark-mode");

        if (isDarkMode) {
            themeToggle.textContent = "☀️";
            localStorage.setItem("fruitBayTheme", "dark");
        } else {
            themeToggle.textContent = "🌙";
            localStorage.setItem("fruitBayTheme", "light");
        }

    });
}

  Store.subscribeToStore(async () => {
    await refreshStore();
  });
});

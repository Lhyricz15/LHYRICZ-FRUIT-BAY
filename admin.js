/* LHYRICZ FRUIT BAY - Supabase admin dashboard */
let adminProducts = [];
let adminSettings = {};
let adminOrders = [];
let editingImageUrl = "";

const $ = selector => document.querySelector(selector);
const toast = message => {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
};
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"
}[c]));
const categories = () => [...new Set(adminProducts.map(p => p.category).filter(Boolean))];
const money = value => `${adminSettings.currency || "GH₵"}${Number(value || 0).toFixed(2)}`;

function showLogin(message = "") {
  $("#loginView").hidden = false;
  $("#appView").hidden = true;
  $("#loginMessage").textContent = message;
  setTimeout(() => $("#adminPasswordInput")?.focus(), 50);
}

async function showApp() {
  $("#loginView").hidden = true;
  $("#appView").hidden = false;
  await renderAll();
}

async function renderAll() {
  [adminProducts, adminSettings, adminOrders] = await Promise.all([
    Store.loadProducts(), Store.loadSettings(), Store.loadOrders()
  ]);
  renderStats();
  renderTable();
  renderOrders();
  populateCategories();
  renderSettings();
}

function renderStats() {
  $("#totalItems").textContent = adminProducts.length;
  $("#visibleItems").textContent = adminProducts.filter(p => p.available !== false).length;
  $("#totalCategories").textContent = categories().length;
  $("#statWhatsapp").textContent = adminSettings.whatsapp || "—";
}

function renderTable() {
  const q = String($("#searchProducts").value || "").trim().toLowerCase();
  const items = adminProducts.filter(p =>
    `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q)
  );
  if (!items.length) {
    $("#productTable").innerHTML = '<div class="empty-state">No matching products.</div>';
    return;
  }

  $("#productTable").innerHTML = items.map(p => `
    <div class="product-row ${p.available === false ? "is-hidden" : ""}">
      <div class="table-product">
        <div class="thumb">${p.image ? `<img src="${escapeHtml(p.image)}" alt="">` : escapeHtml(p.emoji || "🍽️")}</div>
        <div><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.category)}</span></div>
      </div>
      <div class="table-description">${escapeHtml(p.description || "No description")}</div>
      <strong class="table-price">${money(p.price)}</strong>
      <span class="status-pill ${p.available === false ? "off" : "on"}">${p.available === false ? "Hidden" : "Visible"}</span>
      <div class="row-actions">
        <button class="icon-action" data-edit="${escapeHtml(p.id)}" type="button">Edit</button>
        <button class="icon-action toggle" data-toggle="${escapeHtml(p.id)}" type="button">${p.available === false ? "Show" : "Hide"}</button>
        <button class="icon-action danger" data-delete="${escapeHtml(p.id)}" type="button">Delete</button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => openEditor(b.dataset.edit));
  document.querySelectorAll("[data-toggle]").forEach(b => b.onclick = () => toggleProduct(b.dataset.toggle));
  document.querySelectorAll("[data-delete]").forEach(b => b.onclick = () => deleteProduct(b.dataset.delete));
}

function renderOrders() {
  const el = $("#ordersTable");
  if (!el) return;
  if (!adminOrders.length) {
    el.innerHTML = '<div class="empty-state">No customer orders yet.</div>';
    return;
  }
  el.innerHTML = adminOrders.map(order => {
    const items = (order.order_items || []).map(i => `${escapeHtml(i.product_name)} ×${i.quantity}`).join(", ");
    const date = order.created_at ? new Date(order.created_at).toLocaleString() : "";
    return `
      <div class="product-row">
        <div class="table-product">
          <div class="thumb">🧾</div>
          <div><strong>${escapeHtml(order.customer_name || "Customer")}</strong><span>${escapeHtml(order.phone || "")}</span></div>
        </div>
        <div class="table-description"><strong>${escapeHtml(items || "No items")}</strong><br>${escapeHtml(order.order_type)}${order.location ? " • " + escapeHtml(order.location) : ""}<br><small>${escapeHtml(date)}</small></div>
        <strong class="table-price">${money(order.total)}</strong>
        <select class="order-status-select" data-order-status="${escapeHtml(order.id)}">
          ${["Pending","Confirmed","Preparing","Ready","Delivered","Cancelled"].map(s => `<option ${order.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
        <div class="row-actions"><button class="icon-action" type="button" data-order-details="${escapeHtml(order.id)}">Details</button></div>
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-order-status]").forEach(select => {
    select.addEventListener("change", async () => {
      try {
        await Store.updateOrderStatus(select.dataset.orderStatus, select.value);
        toast("Order status updated.");
        await renderAll();
      } catch (error) { toast(error.message || "Could not update order."); }
    });
  });

  document.querySelectorAll("[data-order-details]").forEach(btn => {
    btn.addEventListener("click", () => {
      const order = adminOrders.find(o => String(o.id) === String(btn.dataset.orderDetails));
      if (!order) return;
      const items = (order.order_items || []).map(i => `${i.product_name} ×${i.quantity} — ${money(i.line_total)}`).join("\\n");
      alert(
        `Customer: ${order.customer_name || ""}\\n` +
        `Phone: ${order.phone || ""}\\n` +
        `Type: ${order.order_type || ""}\\n` +
        `Location: ${order.location || "Pickup"}\\n` +
        `Preferred time: ${order.preferred_time || ""}\\n` +
        `Notes: ${order.notes || "None"}\\n\\n` +
        `Items:\\n${items}\\n\\nTotal: ${money(order.total)}`
      );
    });
  });
}

function populateCategories() {
  $("#categoryOptions").innerHTML = categories().sort().map(c =>
    `<option value="${escapeHtml(c)}"></option>`
  ).join("");
}

function renderSettings() {
  const f = $("#settingsForm");
  f.elements.businessName.value = adminSettings.businessName || "";
  f.elements.whatsapp.value = adminSettings.whatsapp || "";
  f.elements.currency.value = adminSettings.currency || "GH₵";
  f.elements.deliveryFee.value = adminSettings.deliveryFee ?? 0;
  f.elements.openingHours.value = adminSettings.openingHours || "";
  f.elements.announcement.value = adminSettings.announcement || "";
}

function resetEditor() {
  const f = $("#productForm");
  f.reset();
  f.elements.id.value = "";
  f.elements.available.checked = true;
  editingImageUrl = "";
  $("#imagePreview").innerHTML = "<span>🍽️</span>";
  $("#productModalTitle").textContent = "Add Item";
}

function openEditor(id = "") {
  resetEditor();
  $("#productModal").hidden = false;
  if (!id) return;
  const p = adminProducts.find(x => String(x.id) === String(id));
  if (!p) return;

  const f = $("#productForm");
  $("#productModalTitle").textContent = "Edit Item";
  f.elements.id.value = p.id;
  f.elements.name.value = p.name;
  f.elements.price.value = p.price;
  f.elements.category.value = p.category;
  f.elements.description.value = p.description || "";
  f.elements.emoji.value = p.emoji || "";
  f.elements.available.checked = p.available !== false;
  editingImageUrl = p.image || "";
  $("#imagePreview").innerHTML = editingImageUrl
    ? `<img src="${escapeHtml(editingImageUrl)}" alt="Preview">`
    : `<span>${escapeHtml(p.emoji || "🍽️")}</span>`;
}

function closeEditor() { $("#productModal").hidden = true; }

async function saveProduct(event) {
  event.preventDefault();
  const f = event.currentTarget;
  const id = f.elements.id.value;
  const name = f.elements.name.value.trim();
  const category = f.elements.category.value.trim();
  const price = Number(f.elements.price.value);

  if (!name || !category || !Number.isFinite(price) || price < 0) {
    toast("Please enter a valid name, category and price.");
    return;
  }

  const file = f.elements.imageFile.files[0];
  const payload = {
    name, category, price,
    description: f.elements.description.value.trim(),
    emoji: f.elements.emoji.value.trim() || "🍽️",
    image: editingImageUrl,
    available: f.elements.available.checked
  };

  try {
    f.querySelector("button[type=submit]").disabled = true;
    toast(file ? "Uploading product photo…" : "Saving item…");
    if (id) {
      await Store.updateProduct(id, payload, file);
    } else {
      await Store.createProduct(payload, file);
    }
    await renderAll();
    closeEditor();
    toast(id ? "Item updated successfully." : "New item added successfully.");
  } catch (error) {
    console.error(error);
    toast(error.message || "Could not save item.");
  } finally {
    f.querySelector("button[type=submit]").disabled = false;
  }
}

async function toggleProduct(id) {
  const p = adminProducts.find(x => String(x.id) === String(id));
  if (!p) return;
  try {
    await Store.updateProductAvailability(id, p.available === false);
    await renderAll();
    toast(p.available === false ? "Item is now visible." : "Item hidden from customers.");
  } catch (error) { toast(error.message || "Could not update item."); }
}

async function deleteProduct(id) {
  const p = adminProducts.find(x => String(x.id) === String(id));
  if (!p || !confirm(`Delete “${p.name}”?`)) return;
  try {
    await Store.deleteProduct(id);
    await renderAll();
    toast("Item deleted.");
  } catch (error) { toast(error.message || "Could not delete item."); }
}

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await Store.loginAdmin($("#adminPasswordInput").value);
    $("#adminPasswordInput").value = "";
    await showApp();
  } catch (error) {
    showLogin(error.message || "Login failed.");
  }
});

$("#logoutBtn").addEventListener("click", async () => {
  await Store.logout();
  showLogin("Dashboard locked.");
});

$("#addProductBtn").addEventListener("click", () => openEditor());
$("#closeProductModal").addEventListener("click", closeEditor);
$("#cancelProductBtn").addEventListener("click", closeEditor);
$("#productForm").addEventListener("submit", saveProduct);
$("#searchProducts").addEventListener("input", renderTable);
$("#refreshOrdersBtn")?.addEventListener("click", async () => { try { await renderAll(); toast("Orders refreshed."); } catch (error) { toast(error.message || "Could not refresh orders."); } });

$("#settingsForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const data = new FormData(e.currentTarget);
    adminSettings = await Store.saveSettings({
      businessName: data.get("businessName"),
      whatsapp: data.get("whatsapp"),
      currency: data.get("currency"),
      deliveryFee: Number(data.get("deliveryFee") || 0),
      openingHours: data.get("openingHours"),
      announcement: data.get("announcement")
    });
    renderSettings();
    renderStats();
    toast("Store settings saved.");
  } catch (error) { toast(error.message || "Could not save settings."); }
});

$("#passwordForm").addEventListener("submit", async e => {
  e.preventDefault();
  const d = new FormData(e.currentTarget);
  const next = String(d.get("next") || "");
  if (next.length < 6) { toast("New password must be at least 6 characters."); return; }
  try {
    await Store.changePassword(String(d.get("current") || ""), next);
    e.currentTarget.reset();
    toast("Admin password changed successfully.");
  } catch (error) { toast(error.message || "Could not change password."); }
});

$("#exportBtn").addEventListener("click", async () => {
  try {
    const json = await Store.exportBackup();
    const blob = new Blob([json], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lhyricz-fruit-bay-backup.json"; a.click();
    URL.revokeObjectURL(url);
    toast("Cloud backup exported.");
  } catch (error) { toast(error.message || "Could not export backup."); }
});

$("#importInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    await Store.importBackup(data);
    await renderAll();
    toast("Backup imported into Supabase.");
  } catch (error) { toast(error.message || "Could not import backup."); }
  finally { e.target.value = ""; }
});

$("#resetBtn").addEventListener("click", async () => {
  if (!confirm("This will delete all current products from the cloud database and reset store settings. Continue?")) return;
  try {
    await Store.resetDemoData();
    await renderAll();
    toast("Cloud menu reset.");
  } catch (error) { toast(error.message || "Could not reset store."); }
});

$("#productForm").elements.imageFile.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
    toast("Please choose PNG, JPG or WEBP.");
    e.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => $("#imagePreview").innerHTML = `<img src="${escapeHtml(reader.result)}" alt="Preview">`;
  reader.readAsDataURL(file);
});

(async () => {
  try {
    if (await Store.isAuthed()) await showApp();
    else showLogin();
  } catch (_) {
    showLogin();
  }
})();

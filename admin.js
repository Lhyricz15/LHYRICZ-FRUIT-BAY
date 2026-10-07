let adminProducts = Store.loadProducts();
let adminSettings = Store.loadSettings();
let editingImageData = '';
const $ = selector => document.querySelector(selector);
const toast = message => { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove('show'), 2600); };
const categories = () => [...new Set(adminProducts.map(p => p.category).filter(Boolean))];
const money = value => `${adminSettings.currency || 'GH₵'}${Number(value || 0).toFixed(2)}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

function showApp() { $('#loginView').hidden = true; $('#appView').hidden = false; renderAll(); }
function showLogin(message = '') { $('#loginView').hidden = false; $('#appView').hidden = true; $('#loginMessage').textContent = message; $('#adminPasswordInput').focus(); }
function renderAll() { renderStats(); renderTable(); populateCategories(); renderSettings(); }
function renderStats() { $('#totalItems').textContent = adminProducts.length; $('#visibleItems').textContent = adminProducts.filter(p => p.available !== false).length; $('#totalCategories').textContent = categories().length; $('#statWhatsapp').textContent = adminSettings.whatsapp || '—'; }
function renderTable() {
  const q = String($('#searchProducts').value || '').trim().toLowerCase();
  const items = adminProducts.filter(p => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q));
  if (!items.length) { $('#productTable').innerHTML = '<div class="empty-state">No matching products.</div>'; return; }
  $('#productTable').innerHTML = items.map(p => `
    <div class="product-row ${p.available === false ? 'is-hidden' : ''}">
      <div class="table-product"><div class="thumb">${p.image ? `<img src="${escapeHtml(p.image)}" alt="">` : escapeHtml(p.emoji || '🍽️')}</div><div><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.category)}</span></div></div>
      <div class="table-description">${escapeHtml(p.description || 'No description')}</div>
      <strong class="table-price">${money(p.price)}</strong>
      <span class="status-pill ${p.available === false ? 'off' : 'on'}">${p.available === false ? 'Hidden' : 'Visible'}</span>
      <div class="row-actions"><button class="icon-action" data-edit="${escapeHtml(p.id)}" type="button">Edit</button><button class="icon-action toggle" data-toggle="${escapeHtml(p.id)}" type="button">${p.available === false ? 'Show' : 'Hide'}</button><button class="icon-action danger" data-delete="${escapeHtml(p.id)}" type="button">Delete</button></div>
    </div>`).join('');

  document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEditor(b.dataset.edit)));
  document.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => toggleProduct(b.dataset.toggle)));
  document.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.delete)));
}
function populateCategories() { $('#categoryOptions').innerHTML = categories().sort().map(c => `<option value="${escapeHtml(c)}"></option>`).join(''); }
function renderSettings() {
  const f = $('#settingsForm');
  Object.entries(adminSettings).forEach(([key, value]) => { if (f.elements[key]) f.elements[key].value = value; });
}
function saveProducts() { Store.saveProducts(adminProducts); renderStats(); renderTable(); populateCategories(); }
function resetEditor() { const f = $('#productForm'); f.reset(); f.elements.id.value = ''; f.elements.available.checked = true; editingImageData = ''; $('#imagePreview').innerHTML = '<span>🍽️</span>'; $('#productModalTitle').textContent = 'Add Item'; }
function openEditor(id = '') {
  resetEditor(); $('#productModal').hidden = false; if (!id) return;
  const p = adminProducts.find(x => String(x.id) === String(id)); if (!p) return;
  const f = $('#productForm'); $('#productModalTitle').textContent = 'Edit Item';
  f.elements.id.value = p.id; f.elements.name.value = p.name; f.elements.price.value = p.price; f.elements.category.value = p.category; f.elements.description.value = p.description || ''; f.elements.emoji.value = p.emoji || ''; f.elements.available.checked = p.available !== false;
  editingImageData = p.image || ''; $('#imagePreview').innerHTML = editingImageData ? `<img src="${escapeHtml(editingImageData)}" alt="Preview">` : `<span>${escapeHtml(p.emoji || '🍽️')}</span>`;
}
function closeEditor() { $('#productModal').hidden = true; }

function compressImage(file, maxSide = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) return reject(new Error('Please choose a PNG, JPG or WEBP image.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be processed.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function saveProduct(event) {
  event.preventDefault();
  const f = event.currentTarget;
  const id = f.elements.id.value || crypto.randomUUID();
  const name = f.elements.name.value.trim();
  const category = f.elements.category.value.trim();
  const price = Number(f.elements.price.value);
  if (!name || !category || !Number.isFinite(price) || price < 0) { toast('Please enter a valid name, category and price.'); return; }
  try {
    const file = f.elements.imageFile.files[0];
    if (file) { toast('Preparing image…'); editingImageData = await compressImage(file); $('#imagePreview').innerHTML = `<img src="${escapeHtml(editingImageData)}" alt="Preview">`; }
    const payload = { id, name, price, category, description: f.elements.description.value.trim(), emoji: f.elements.emoji.value.trim() || '🍽️', image: editingImageData, available: f.elements.available.checked };
    const index = adminProducts.findIndex(p => String(p.id) === String(id));
    if (index >= 0) adminProducts[index] = payload; else adminProducts.unshift(payload);
    saveProducts(); closeEditor(); toast(index >= 0 ? 'Item updated successfully.' : 'New item added successfully.');
  } catch (error) { toast(error.message || 'Could not save item.'); }
}
function toggleProduct(id) { const p = adminProducts.find(x => String(x.id) === String(id)); if (!p) return; p.available = p.available === false; saveProducts(); toast(p.available ? 'Item is now visible.' : 'Item hidden from customers.'); }
function deleteProduct(id) { const p = adminProducts.find(x => String(x.id) === String(id)); if (!p) return; if (!confirm(`Delete “${p.name}”?`)) return; adminProducts = adminProducts.filter(x => String(x.id) !== String(id)); saveProducts(); toast('Item deleted.'); }

$('#loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const entered = $('#adminPasswordInput').value;
  if (entered === Store.getAdminPassword()) { Store.setAuthed(true); $('#adminPasswordInput').value = ''; showApp(); }
  else { showLogin('Incorrect password. Please try again.'); }
});
$('#logoutBtn').addEventListener('click', () => { Store.setAuthed(false); showLogin('Dashboard locked.'); });
$('#addProductBtn').addEventListener('click', () => openEditor());
$('#closeProductModal').addEventListener('click', closeEditor);
$('#cancelProductBtn').addEventListener('click', closeEditor);
$('#productForm').addEventListener('submit', saveProduct);
$('#searchProducts').addEventListener('input', renderTable);
$('#settingsForm').addEventListener('submit', e => { e.preventDefault(); const data = new FormData(e.currentTarget); adminSettings = {...adminSettings, businessName: String(data.get('businessName')).trim(), whatsapp: String(data.get('whatsapp')).trim(), currency: String(data.get('currency')).trim() || 'GH₵', deliveryFee: Math.max(0, Number(data.get('deliveryFee') || 0)), openingHours: String(data.get('openingHours')).trim(), announcement: String(data.get('announcement')).trim()}; Store.saveSettings(adminSettings); renderAll(); toast('Store settings saved.'); });
$('#passwordForm').addEventListener('submit', e => { e.preventDefault(); const d = new FormData(e.currentTarget); if (String(d.get('current')) !== Store.getAdminPassword()) { toast('Current password is incorrect.'); return; } const next = String(d.get('next') || ''); if (next.length < 6) { toast('New password must be at least 6 characters.'); return; } Store.setAdminPassword(next); e.currentTarget.reset(); toast('Admin password changed.'); });
$('#exportBtn').addEventListener('click', () => { const blob = new Blob([Store.backup()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'lhyricz-fruit-bay-backup.json'; a.click(); URL.revokeObjectURL(url); toast('Backup exported.'); });
$('#importInput').addEventListener('change', async e => { const file = e.target.files[0]; if (!file) return; try { const data = JSON.parse(await file.text()); Store.restore(data); adminProducts = Store.loadProducts(); adminSettings = Store.loadSettings(); renderAll(); toast('Backup imported successfully.'); } catch (err) { toast(err.message || 'Could not import backup.'); } finally { e.target.value = ''; } });
$('#resetBtn').addEventListener('click', () => { if (!confirm('Reset the menu and settings to the starter demo data?')) return; localStorage.removeItem('lhyriczFruitBayCatalogV3'); localStorage.removeItem('lhyriczFruitBaySettingsV3'); adminProducts = Store.loadProducts(); adminSettings = Store.loadSettings(); renderAll(); toast('Demo data restored.'); });

document.querySelector('#productForm').elements.imageFile.addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; try { const data = await compressImage(f); $('#imagePreview').innerHTML = `<img src="${escapeHtml(data)}" alt="Preview">`; } catch (err) { toast(err.message); e.target.value = ''; } });

if (Store.isAuthed()) showApp(); else showLogin();

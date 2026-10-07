const Store = (() => {
  const CATALOG_KEY = 'lhyriczFruitBayCatalogV3';
  const SETTINGS_KEY = 'lhyriczFruitBaySettingsV3';
  const ADMIN_KEY = 'lhyriczFruitBayAdminPasswordV1';
  const AUTH_KEY = 'lhyriczFruitBayAdminAuthedV2';

  const defaultProducts = [
    { id: crypto.randomUUID(), name: 'Tropical Fruit Bowl', category: 'Fruit Bowls', price: 35, emoji: '🍍', description: 'A refreshing mix of tropical fruits.', image: '', available: true },
    { id: crypto.randomUUID(), name: 'Mango Smoothie', category: 'Smoothies', price: 25, emoji: '🥭', description: 'Smooth, fruity and naturally refreshing.', image: '', available: true },
    { id: crypto.randomUUID(), name: 'Watermelon Juice', category: 'Fresh Juices', price: 20, emoji: '🍉', description: 'Cool watermelon blended fresh for you.', image: '', available: true },
    { id: crypto.randomUUID(), name: 'Pineapple Cup', category: 'Fruit Cups', price: 18, emoji: '🍍', description: 'Sweet, chilled pineapple pieces.', image: '', available: true },
    { id: crypto.randomUUID(), name: 'Berry Fruit Cup', category: 'Fruit Cups', price: 28, emoji: '🍓', description: 'A bright blend of juicy fruit and berries.', image: '', available: true },
    { id: crypto.randomUUID(), name: 'Mixed Fruit Parfait', category: 'Fruit Bowls', price: 32, emoji: '🍓', description: 'Layered fruit with a smooth creamy finish.', image: '', available: true },
    { id: crypto.randomUUID(), name: 'Passion Fruit Cooler', category: 'Fresh Juices', price: 22, emoji: '🥤', description: 'Tangy, chilled and refreshing.', image: '', available: true },
    { id: crypto.randomUUID(), name: 'Pineapple Mango Smoothie', category: 'Smoothies', price: 28, emoji: '🍹', description: 'A creamy tropical blend of pineapple and mango.', image: '', available: true }
  ];

  const defaultSettings = {
    businessName: 'LHYRICZ FRUIT BAY',
    whatsapp: '233203910059',
    currency: 'GH₵',
    deliveryFee: 0,
    openingHours: 'Open daily',
    announcement: 'Freshness in Every Bite.'
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  function loadProducts() {
    try {
      const saved = JSON.parse(localStorage.getItem(CATALOG_KEY));
      if (Array.isArray(saved) && saved.length) return saved;
    } catch (_) {}
    const seeded = clone(defaultProducts);
    localStorage.setItem(CATALOG_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function saveProducts(products) {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('catalog-updated'));
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (saved && typeof saved === 'object') return { ...defaultSettings, ...saved };
    } catch (_) {}
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    return clone(defaultSettings);
  }

  function saveSettings(settings) {
    const merged = { ...defaultSettings, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('settings-updated'));
  }

  function getAdminPassword() {
    return localStorage.getItem(ADMIN_KEY) || '1234';
  }

  function setAdminPassword(password) {
    localStorage.setItem(ADMIN_KEY, String(password));
  }

  function setAuthed(value) {
    sessionStorage.setItem(AUTH_KEY, value ? '1' : '0');
  }

  function isAuthed() {
    return sessionStorage.getItem(AUTH_KEY) === '1';
  }

  function backup() {
    return JSON.stringify({
      version: 3,
      products: loadProducts(),
      settings: loadSettings()
    }, null, 2);
  }

  function restore(data) {
    if (!data || !Array.isArray(data.products) || typeof data.settings !== 'object') {
      throw new Error('That backup file is not valid.');
    }
    saveProducts(data.products);
    saveSettings(data.settings);
  }

  return { clone, defaultProducts, defaultSettings, loadProducts, saveProducts, loadSettings, saveSettings, getAdminPassword, setAdminPassword, setAuthed, isAuthed, backup, restore };
})();

/* LHYRICZ FRUIT BAY - Supabase data layer */
const SUPABASE_URL = "https://eqluqcqmlykgdolzzqli.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_81feKz5vylksyth3KjRLcg_XTSBE4LC";
const ADMIN_EMAIL = "lhyriczoutfitz@gmail.com";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const DEFAULT_SETTINGS = {
  id: 1,
  businessName: "LHYRICZ FRUIT BAY",
  whatsapp: "0203910059",
  currency: "GH₵",
  deliveryFee: 0,
  openingHours: "",
  announcement: "Every Bite."
};

function normalizeProduct(row) {
  return {
    id: row.id,
    name: row.name || "",
    category: row.category || "Other",
    price: Number(row.price || 0),
    description: row.description || "",
    emoji: row.emoji || "🍽️",
    image: row.image_url || "",
    available: row.available !== false,
    created_at: row.created_at
  };
}

function normalizeSettings(row) {
  return {
    id: 1,
    businessName: row?.business_name || DEFAULT_SETTINGS.businessName,
    whatsapp: row?.whatsapp || DEFAULT_SETTINGS.whatsapp,
    currency: row?.currency || DEFAULT_SETTINGS.currency,
    deliveryFee: Number(row?.delivery_fee || 0),
    openingHours: row?.opening_hours || "",
    announcement: row?.announcement || DEFAULT_SETTINGS.announcement
  };
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

async function requireAdmin() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) throw new Error("Please sign in as the administrator.");
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) throw profileError;
  if (!profile || profile.role !== "admin") throw new Error("This account is not an administrator.");
  return user;
}

const Store = {
  supabase: supabaseClient,

  async loadProducts() {
    const { data, error } = await supabaseClient
      .from("products").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeProduct);
  },

  async loadSettings() {
    const { data, error } = await supabaseClient
      .from("store_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return normalizeSettings(data);
  },

  async saveSettings(settings) {
    await requireAdmin();
    const payload = {
      id: 1,
      business_name: String(settings.businessName || DEFAULT_SETTINGS.businessName).trim(),
      whatsapp: cleanPhone(settings.whatsapp),
      currency: String(settings.currency || "GH₵").trim(),
      delivery_fee: Math.max(0, Number(settings.deliveryFee || 0)),
      opening_hours: String(settings.openingHours || "").trim(),
      announcement: String(settings.announcement || "Every Bite.").trim()
    };
    const { data, error } = await supabaseClient
      .from("store_settings").upsert(payload, { onConflict: "id" }).select().single();
    if (error) throw error;
    return normalizeSettings(data);
  },

  async loginAdmin(password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: ADMIN_EMAIL, password
    });
    if (error) throw error;
    try {
      await requireAdmin();
      return data.session;
    } catch (e) {
      await supabaseClient.auth.signOut();
      throw e;
    }
  },

  async isAuthed() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return false;
    try {
      await requireAdmin();
      return true;
    } catch (_) {
      return false;
    }
  },

  async logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  },

  async changePassword(currentPassword, newPassword) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("You are not signed in.");
    const { error: reauthError } = await supabaseClient.auth.signInWithPassword({
      email: user.email, password: currentPassword
    });
    if (reauthError) throw new Error("Current password is incorrect.");
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async uploadProductImage(file) {
    await requireAdmin();
    if (!file) return "";
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      throw new Error("Please choose a PNG, JPG or WEBP image.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image must be 5MB or smaller.");
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseClient.storage
      .from("product-images").upload(path, file, {
        cacheControl: "31536000", upsert: false, contentType: file.type
      });
    if (error) throw error;
    const { data } = supabaseClient.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  },

  async createProduct(product, imageFile = null) {
    await requireAdmin();
    let imageUrl = product.image || "";
    if (imageFile) imageUrl = await this.uploadProductImage(imageFile);

    const payload = {
      name: String(product.name || "").trim(),
      category: String(product.category || "Other").trim(),
      price: Math.max(0, Number(product.price || 0)),
      description: String(product.description || "").trim(),
      emoji: String(product.emoji || "🍽️").trim(),
      image_url: imageUrl,
      available: product.available !== false
    };
    const { data, error } = await supabaseClient.from("products").insert(payload).select().single();
    if (error) throw error;
    return normalizeProduct(data);
  },

  async updateProduct(id, product, imageFile = null) {
    await requireAdmin();
    let imageUrl = product.image || "";
    if (imageFile) imageUrl = await this.uploadProductImage(imageFile);

    const payload = {
      name: String(product.name || "").trim(),
      category: String(product.category || "Other").trim(),
      price: Math.max(0, Number(product.price || 0)),
      description: String(product.description || "").trim(),
      emoji: String(product.emoji || "🍽️").trim(),
      image_url: imageUrl,
      available: product.available !== false
    };
    const { data, error } = await supabaseClient
      .from("products").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return normalizeProduct(data);
  },

  async updateProductAvailability(id, available) {
    await requireAdmin();
    const { data, error } = await supabaseClient
      .from("products").update({ available: !!available }).eq("id", id).select().single();
    if (error) throw error;
    return normalizeProduct(data);
  },

  async deleteProduct(id) {
    await requireAdmin();
    const { data: product } = await supabaseClient
      .from("products").select("image_url").eq("id", id).maybeSingle();
    const { error } = await supabaseClient.from("products").delete().eq("id", id);
    if (error) throw error;
    if (product?.image_url) {
      const marker = "/storage/v1/object/public/product-images/";
      const index = product.image_url.indexOf(marker);
      if (index >= 0) {
        const path = decodeURIComponent(product.image_url.slice(index + marker.length));
        await supabaseClient.storage.from("product-images").remove([path]).catch(() => {});
      }
    }
  },

  async loadOrders() {
    await requireAdmin();
    const { data, error } = await supabaseClient
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateOrderStatus(id, status) {
    await requireAdmin();
    const allowed = ["Pending", "Confirmed", "Preparing", "Ready", "Delivered", "Cancelled"];
    if (!allowed.includes(status)) throw new Error("Invalid order status.");
    const { data, error } = await supabaseClient
      .from("orders").update({ status }).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  async createOrder({ customerName, phone, orderType, location, preferredTime, notes, items, subtotal, deliveryFee, total }) {
    const { data: { user } } = await supabaseClient.auth.getUser();

    const orderPayload = {
      user_id: user?.id || null,
      customer_name: String(customerName || "").trim(),
      phone: String(phone || "").trim(),
      order_type: orderType === "Delivery" ? "Delivery" : "Pickup",
      location: String(location || "").trim(),
      preferred_time: String(preferredTime || "").trim(),
      notes: String(notes || "").trim(),
      subtotal: Number(subtotal || 0),
      delivery_fee: Number(deliveryFee || 0),
      total: Number(total || 0),
      status: "Pending"
    };

    const { data: order, error: orderError } = await supabaseClient
      .from("orders").insert(orderPayload).select().single();
    if (orderError) throw orderError;

    const rows = items.map(item => ({
      order_id: order.id,
      product_id: item.id || null,
      product_name: item.name,
      unit_price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      line_total: Number(item.price || 0) * Number(item.quantity || 1)
    }));

    const { error: itemsError } = await supabaseClient.from("order_items").insert(rows);
    if (itemsError) {
      await supabaseClient.from("orders").delete().eq("id", order.id);
      throw itemsError;
    }
    return order;
  },

  subscribeToStore(onChange) {
    return supabaseClient.channel("fruit-bay-store-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "store_settings" }, onChange)
      .subscribe();
  },

  async exportBackup() {
    await requireAdmin();
    const [products, settings] = await Promise.all([this.loadProducts(), this.loadSettings()]);
    return JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      products,
      settings
    }, null, 2);
  },

  async importBackup(data) {
    await requireAdmin();
    if (!data || !Array.isArray(data.products)) throw new Error("Invalid backup file.");
    for (const product of data.products) {
      await supabaseClient.from("products").upsert({
        id: product.id || crypto.randomUUID(),
        name: product.name,
        category: product.category,
        price: Number(product.price || 0),
        description: product.description || "",
        emoji: product.emoji || "🍽️",
        image_url: product.image || "",
        available: product.available !== false
      });
    }
    if (data.settings) await this.saveSettings(data.settings);
  },

  async resetDemoData() {
    await requireAdmin();
    const { error: productError } = await supabaseClient.from("products").delete().not("id", "is", null);
    if (productError) throw productError;
    await this.saveSettings(DEFAULT_SETTINGS);
  }
};

window.Store = Store;
window.supabaseClient = supabaseClient;

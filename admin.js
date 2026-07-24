// ================= LOCAL FILE WARNING =================
// Uploads (Cloudinary) and some Firebase calls need a real http(s) origin — file:// silently hangs/fails.
if (window.location.protocol === "file:") {
  const banner = document.createElement("div");
  banner.textContent =
    "⚠️ This page is open as a local file. Photo uploads and some features won't work until this is served over http(s) — e.g. your GitHub Pages URL.";
  banner.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:9999;background:#B33F2E;color:#fff;text-align:center;padding:10px 16px;font-family:sans-serif;font-size:13px;";
  document.body.prepend(banner);
}

// ================= AUTH =================
const loginScreen = document.getElementById("login-screen");
const adminApp = document.getElementById("admin-app");

document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";

  if (typeof DEMO_MODE !== "undefined" && DEMO_MODE) {
    errorEl.textContent = "Firebase isn't connected yet — paste your config into firebase-config.js first.";
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    errorEl.textContent = "Couldn't sign in — check your email and password and try again.";
    console.error(err);
  }
});

document.getElementById("logout-btn").addEventListener("click", () => auth.signOut());

if (typeof DEMO_MODE !== "undefined" && !DEMO_MODE) {
  auth.onAuthStateChanged((user) => {
    if (user) {
      loginScreen.classList.add("hidden");
      adminApp.classList.remove("hidden");
      document.getElementById("admin-user-email").textContent = user.email;
      startOrdersListener();
      loadMenuAdmin();
      loadSiteEditor();
    } else {
      loginScreen.classList.remove("hidden");
      adminApp.classList.add("hidden");
    }
  });
} else {
  document.getElementById("login-error").textContent =
    "Firebase isn't connected yet — paste your config into firebase-config.js to enable login.";
}

// ================= TABS =================
document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-orders").classList.toggle("hidden", btn.dataset.tab !== "orders");
    document.getElementById("panel-menu").classList.toggle("hidden", btn.dataset.tab !== "menu");
    document.getElementById("panel-site").classList.toggle("hidden", btn.dataset.tab !== "site");
  });
});

// ================= ORDERS =================
function fmt(n) {
  return Number(n || 0).toFixed(2);
}

function startOrdersListener() {
  db.collection("orders")
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snap) => {
        const list = document.getElementById("orders-list");
        const empty = document.getElementById("orders-empty");
        list.innerHTML = "";
        empty.classList.toggle("hidden", !snap.empty);

        snap.forEach((doc) => {
          const order = { id: doc.id, ...doc.data() };
          list.appendChild(renderOrderCard(order));
        });
      },
      (err) => console.error("Orders listener error:", err)
    );
}

function renderOrderCard(order) {
  const card = document.createElement("div");
  card.className = "order-card";

  const createdDate =
    order.createdAt && order.createdAt.toDate ? order.createdAt.toDate().toLocaleString("en-NZ") : "Just now";

  const itemsHtml = (order.items || [])
    .map((i) => `<li>${i.qty}x ${i.name} — $${fmt(i.price * i.qty)}</li>`)
    .join("");

  const addressLine = order.address
    ? `${order.address.line1}${order.address.line2 ? ", " + order.address.line2 : ""}, ${order.address.suburb}, ${order.address.city} ${order.address.postcode}`
    : "Pickup at kitchen";

  card.innerHTML = `
    <div class="order-card-top">
      <div>
        <div class="order-id">#${order.orderId || order.id.slice(0, 6)}
          <span class="order-channel-badge ${order.orderChannel === "whatsapp" ? "channel-whatsapp" : "channel-cod"}">
            ${order.orderChannel === "whatsapp" ? "WhatsApp" : "Pay on Delivery"}
          </span>
        </div>
        <div class="order-meta">${createdDate} · ${order.type}</div>
      </div>
      <select class="order-status-select status-${order.status || "new"}" data-id="${order.id}">
        <option value="new" ${order.status === "new" ? "selected" : ""}>New</option>
        <option value="preparing" ${order.status === "preparing" ? "selected" : ""}>Preparing</option>
        <option value="ready" ${order.status === "ready" ? "selected" : ""}>Ready</option>
        <option value="completed" ${order.status === "completed" ? "selected" : ""}>Completed</option>
      </select>
    </div>
    <div class="order-body">
      <ul class="order-items">${itemsHtml}</ul>
      <div>${order.type === "Delivery" ? addressLine : "Pickup at kitchen"} · Requested: ${order.time || "ASAP"}</div>
      <div class="order-total">Total: $${fmt(order.total)} — ${order.paymentMethod || "Pay on delivery/pickup"}</div>
      <div class="order-customer">${order.name} · ${order.phone} · ${order.email}</div>
      ${order.notes ? `<div class="order-customer">Notes: ${order.notes}</div>` : ""}
    </div>
  `;

  card.querySelector(".order-status-select").addEventListener("change", (e) => {
    const newStatus = e.target.value;
    e.target.className = "order-status-select status-" + newStatus;
    db.collection("orders").doc(order.id).update({ status: newStatus }).catch((err) => console.error(err));
  });

  return card;
}

// ================= MENU ADMIN =================
let menuItemsCache = [];
let editingItemId = null;

async function loadMenuAdmin() {
  try {
    const snap = await db.collection("menu").orderBy("name").get();
    menuItemsCache = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Couldn't load menu:", err);
    menuItemsCache = [];
  }
  renderMenuAdmin();
}

function renderMenuAdmin() {
  const list = document.getElementById("menu-admin-list");
  const empty = document.getElementById("menu-empty");
  list.innerHTML = "";
  empty.classList.toggle("hidden", menuItemsCache.length > 0);

  menuItemsCache.forEach((item) => {
    const soldOut = item.inStock === false;
    const card = document.createElement("div");
    card.className = "menu-admin-card" + (soldOut ? " sold-out" : "");
    card.innerHTML = `
      <div class="menu-admin-photo">${item.photoUrl ? `<img src="${item.photoUrl}" alt="${item.name}">` : "No photo"}</div>
      <div class="menu-admin-name">${item.name}</div>
      <div class="menu-admin-cat">${item.category}</div>
      <div class="menu-admin-price">$${fmt(item.price)}</div>
      ${soldOut ? `<div class="menu-admin-badge">Sold Out</div>` : ""}
    `;
    card.addEventListener("click", () => openItemModal(item));
    list.appendChild(card);
  });
}

document.getElementById("add-item-btn").addEventListener("click", () => openItemModal(null));

function openItemModal(item) {
  editingItemId = item ? item.id : null;
  document.getElementById("item-modal-title").textContent = item ? "Edit Item" : "Add Menu Item";
  document.getElementById("item-name").value = item ? item.name : "";
  document.getElementById("item-desc").value = item ? item.desc : "";
  document.getElementById("item-price").value = item ? item.price : "";
  document.getElementById("item-category").value = item ? item.category : "Pani Puri";
  document.getElementById("item-tags").value = item && item.tags ? item.tags.join(", ") : "";
  document.getElementById("item-instock").checked = item ? item.inStock !== false : true;
  document.getElementById("item-modal-error").textContent = "";
  document.getElementById("item-photo-url").value = item && item.photoUrl ? item.photoUrl : "";
  const preview = document.getElementById("item-photo-preview");
  if (item && item.photoUrl) {
    preview.src = item.photoUrl;
    preview.classList.remove("hidden");
  } else {
    preview.classList.add("hidden");
  }
  document.getElementById("delete-item-btn").classList.toggle("hidden", !item);
  document.getElementById("item-modal-overlay").classList.add("visible");
}

document.getElementById("close-item-modal").addEventListener("click", () => {
  document.getElementById("item-modal-overlay").classList.remove("visible");
});

document.getElementById("item-photo-url").addEventListener("input", (e) => {
  const url = e.target.value.trim();
  const preview = document.getElementById("item-photo-preview");
  if (url) {
    preview.src = url;
    preview.classList.remove("hidden");
  } else {
    preview.classList.add("hidden");
  }
});

document.getElementById("save-item-btn").addEventListener("click", async () => {
  const name = document.getElementById("item-name").value.trim();
  const desc = document.getElementById("item-desc").value.trim();
  const price = parseFloat(document.getElementById("item-price").value);
  const category = document.getElementById("item-category").value;
  const tags = document
    .getElementById("item-tags")
    .value.split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const inStock = document.getElementById("item-instock").checked;
  const errorEl = document.getElementById("item-modal-error");

  if (!name || isNaN(price) || price < 0) {
    errorEl.textContent = "Please enter a name and a valid price.";
    return;
  }

  const saveBtn = document.getElementById("save-item-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const existing = editingItemId ? menuItemsCache.find((m) => m.id === editingItemId) : null;
    const pastedUrl = document.getElementById("item-photo-url").value.trim();
    const photoUrl = pastedUrl || (existing ? existing.photoUrl || "" : "");

    const data = { name, desc, price, category, tags, inStock, photoUrl };

    if (editingItemId) {
      await db.collection("menu").doc(editingItemId).update(data);
    } else {
      await db.collection("menu").add(data);
    }

    document.getElementById("item-modal-overlay").classList.remove("visible");
    await loadMenuAdmin();
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Something went wrong saving this item. Please try again.";
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Item";
  }
});

document.getElementById("delete-item-btn").addEventListener("click", async () => {
  if (!editingItemId) return;
  if (!confirm("Delete this menu item? This can't be undone.")) return;
  try {
    await db.collection("menu").doc(editingItemId).delete();
    document.getElementById("item-modal-overlay").classList.remove("visible");
    await loadMenuAdmin();
  } catch (err) {
    console.error(err);
    document.getElementById("item-modal-error").textContent = "Couldn't delete this item. Please try again.";
  }
});

document.getElementById("item-modal-overlay").addEventListener("click", (e) => {
  if (e.target.id === "item-modal-overlay") e.target.classList.remove("visible");
});

// ================= SITE EDITOR =================
// Maps every Admin input field to a dot-path in the site content object
// (e.g. "hero.headline" -> the <hero.headline> field in DEFAULT_SITE_CONTENT).
const SITE_FIELD_MAP = [
  ["announcement.text", "site-announcement-text"],
  ["announcement.bgColor", "site-announcement-bg"],
  ["announcement.textColor", "site-announcement-color"],

  ["hero.eyebrow", "site-hero-eyebrow"],
  ["hero.headline", "site-hero-headline"],
  ["hero.copy", "site-hero-copy"],
  ["hero.cta1Text", "site-hero-cta1"],
  ["hero.cta2Text", "site-hero-cta2"],
  ["hero.image", "site-hero-image"],
  ["hero.imageWidth", "site-hero-image-width", "number"],
  ["hero.imageShape", "site-hero-image-shape"],
  ["hero.headlineSize", "site-hero-headline-size", "number"],
  ["hero.bodySize", "site-hero-body-size", "number"],
  ["hero.padding", "site-hero-padding"],

  ["signature.eyebrow", "site-signature-eyebrow"],
  ["signature.padding", "site-signature-padding"],
  ["signature.cards.0.image", "site-sig-1-image"],
  ["signature.cards.0.name", "site-sig-1-name"],
  ["signature.cards.0.price", "site-sig-1-price"],
  ["signature.cards.1.image", "site-sig-2-image"],
  ["signature.cards.1.name", "site-sig-2-name"],
  ["signature.cards.1.price", "site-sig-2-price"],
  ["signature.cards.2.image", "site-sig-3-image"],
  ["signature.cards.2.name", "site-sig-3-name"],
  ["signature.cards.2.price", "site-sig-3-price"],

  ["menuSection.eyebrow", "site-menu-eyebrow"],
  ["menuSection.title", "site-menu-title"],
  ["menuSection.quote", "site-menu-quote"],

  ["story.eyebrow", "site-story-eyebrow"],
  ["story.headline", "site-story-headline"],
  ["story.paragraph1", "site-story-para1"],
  ["story.paragraph2", "site-story-para2"],
  ["story.image", "site-story-image"],
  ["story.imageShape", "site-story-image-shape"],
  ["story.headlineSize", "site-story-headline-size", "number"],
  ["story.padding", "site-story-padding"],

  ["delivery.eyebrow", "site-delivery-eyebrow"],
  ["delivery.title", "site-delivery-title"],
  ["delivery.padding", "site-delivery-padding"],
  ["delivery.card1Title", "site-delivery-card1-title"],
  ["delivery.card1Text", "site-delivery-card1-text"],
  ["delivery.card2Title", "site-delivery-card2-title"],
  ["delivery.card2Text", "site-delivery-card2-text"],
  ["delivery.card3Title", "site-delivery-card3-title"],
  ["delivery.card3Text", "site-delivery-card3-text"],

  ["findUs.eyebrow", "site-findus-eyebrow"],
  ["findUs.headline", "site-findus-headline"],
  ["findUs.line1", "site-findus-line1"],
  ["findUs.line2", "site-findus-line2"],
  ["findUs.line3", "site-findus-line3"],
  ["findUs.mapImage", "site-findus-map-image"],
  ["findUs.mapLink", "site-findus-map-link"],

  ["footer.brand", "site-footer-brand"],
  ["footer.tagline", "site-footer-tagline"],
  ["footer.address", "site-footer-address"],
  ["footer.contact", "site-footer-contact"],
  ["footer.copyright", "site-footer-copyright"],
];

function populateSiteEditor(content) {
  SITE_FIELD_MAP.forEach(([path, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = getByPath(content, path);
    if (val !== undefined && val !== null) el.value = val;
  });
}

function gatherSiteEditor() {
  const result = JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT));
  SITE_FIELD_MAP.forEach(([path, id, type]) => {
    const el = document.getElementById(id);
    if (!el) return;
    let val = el.value;
    if (type === "number") val = Number(val);
    setByPath(result, path, val);
  });
  return result;
}

async function loadSiteEditor() {
  let content = DEFAULT_SITE_CONTENT;
  try {
    const doc = await db.collection("siteSettings").doc("content").get();
    if (doc.exists) content = mergeDeep(DEFAULT_SITE_CONTENT, doc.data());
  } catch (err) {
    console.error("Couldn't load site content:", err);
  }
  populateSiteEditor(content);
}

document.getElementById("save-site-btn").addEventListener("click", async () => {
  const btn = document.getElementById("save-site-btn");
  const statusEl = document.getElementById("site-save-status");
  btn.disabled = true;
  btn.textContent = "Saving...";
  statusEl.textContent = "";

  try {
    const content = gatherSiteEditor();
    await db.collection("siteSettings").doc("content").set(content);
    statusEl.textContent = "Saved! Your site is updated live.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Something went wrong saving. Please try again.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Changes";
  }
});

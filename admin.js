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
let editingPhotoFile = null;

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
  editingPhotoFile = null;
  document.getElementById("item-modal-title").textContent = item ? "Edit Item" : "Add Menu Item";
  document.getElementById("item-name").value = item ? item.name : "";
  document.getElementById("item-desc").value = item ? item.desc : "";
  document.getElementById("item-price").value = item ? item.price : "";
  document.getElementById("item-category").value = item ? item.category : "Pani Puri";
  document.getElementById("item-tags").value = item && item.tags ? item.tags.join(", ") : "";
  document.getElementById("item-instock").checked = item ? item.inStock !== false : true;
  document.getElementById("item-modal-error").textContent = "";
  document.getElementById("item-photo").value = "";
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

document.getElementById("item-photo").addEventListener("change", (e) => {
  editingPhotoFile = e.target.files[0] || null;
  if (editingPhotoFile) {
    document.getElementById("item-photo-url").value = ""; // uploading a file overrides any pasted URL
    const preview = document.getElementById("item-photo-preview");
    preview.src = URL.createObjectURL(editingPhotoFile);
    preview.classList.remove("hidden");
  }
});

document.getElementById("item-photo-url").addEventListener("input", (e) => {
  const url = e.target.value.trim();
  const preview = document.getElementById("item-photo-preview");
  if (url) {
    editingPhotoFile = null; // pasting a URL overrides any chosen file
    document.getElementById("item-photo").value = "";
    preview.src = url;
    preview.classList.remove("hidden");
  } else if (!editingPhotoFile) {
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
    let photoUrl = null;
    const existing = editingItemId ? menuItemsCache.find((m) => m.id === editingItemId) : null;
    if (existing) photoUrl = existing.photoUrl || null;

    const pastedUrl = document.getElementById("item-photo-url").value.trim();

    if (pastedUrl) {
      // Manual override: an externally-hosted image (GitHub, Imgur, etc.)
      photoUrl = pastedUrl;
    } else if (editingPhotoFile) {
      // Default path: upload straight to Cloudinary (free, no card needed)
      if (typeof CLOUDINARY_CLOUD_NAME === "undefined" || CLOUDINARY_CLOUD_NAME.startsWith("PASTE_")) {
        errorEl.textContent = "Cloudinary isn't set up yet — paste your Cloud name and upload preset into cloudinary-config.js, or paste an Image URL instead.";
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Item";
        return;
      }
      photoUrl = await uploadToCloudinary(editingPhotoFile);
    }

    const data = { name, desc, price, category, tags, inStock, photoUrl: photoUrl || "" };

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

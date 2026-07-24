// ================= CONFIG =================
const WHATSAPP_NUMBER = "64211234567"; // Replace with your NZ WhatsApp number, country code + number, no + or spaces
const DELIVERY_FEE = 5.0;
const BUSINESS_NAME = "The Chaya & Co.";

// ================= FALLBACK MENU (used only if Firebase isn't connected yet / DEMO_MODE) =================
const MENU_FALLBACK = [
  { id: "classic-pani-puri", name: "Classic Pani Puri", category: "Pani Puri", desc: "Crisp puris, spiced potato, tangy masala pani", price: 8.0, tags: ["Bestseller", "Vegetarian"], inStock: true, photoUrl: "" },
  { id: "sweet-puri", name: "Sweet Puri", category: "Pani Puri", desc: "Tamarind and jaggery water, no chilli", price: 8.0, tags: ["Vegan"], inStock: true, photoUrl: "" },
  { id: "sev-puri", name: "Sev Puri", category: "Chaat", desc: "Crisp puris topped with potato, chutneys, sev", price: 9.5, tags: ["Vegetarian"], inStock: true, photoUrl: "" },
  { id: "dahi-puri", name: "Dahi Puri", category: "Chaat", desc: "Puris filled with yoghurt, chutney, spice", price: 9.0, tags: ["Bestseller", "Vegetarian"], inStock: true, photoUrl: "" },
  { id: "bhel-puri", name: "Bhel Puri", category: "Chaat", desc: "Puffed rice, sev, vegetables, tamarind chutney", price: 8.5, tags: ["Vegan"], inStock: true, photoUrl: "" },
  { id: "masala-chai", name: "Masala Chai", category: "Beverages", desc: "Spiced tea, made fresh to order", price: 4.5, tags: ["Vegetarian"], inStock: true, photoUrl: "" },
  { id: "sweet-lassi", name: "Sweet Lassi", category: "Beverages", desc: "Yoghurt, cardamom, a little sugar", price: 6.0, tags: ["Vegetarian"], inStock: true, photoUrl: "" },
  { id: "chaat-combo", name: "Chaat Combo", category: "Combos", desc: "Sev puri, dahi puri, and a masala chai", price: 19.0, tags: ["Bestseller"], inStock: true, photoUrl: "" },
];

const CATEGORIES = ["All", "Pani Puri", "Chaat", "Beverages", "Combos"];

let MENU = []; // populated from Firestore (or fallback) on load
let activeCategory = "All";
const cart = {}; // id -> qty

// ================= HELPERS =================
function fmt(n) {
  return n.toFixed(2);
}
function findItem(id) {
  return MENU.find((m) => m.id === id);
}
function cartEntries() {
  return Object.entries(cart).filter(([, qty]) => qty > 0);
}
function cartSubtotal() {
  return cartEntries().reduce((sum, [id, qty]) => sum + (findItem(id)?.price || 0) * qty, 0);
}
function cartCount() {
  return cartEntries().reduce((sum, [, qty]) => sum + qty, 0);
}
function isDelivery() {
  const el = document.querySelector('input[name="order-type"]:checked');
  return el && el.value === "delivery";
}
function currentDeliveryFee() {
  return isDelivery() ? DELIVERY_FEE : 0;
}
function cartTotal() {
  return cartSubtotal() + currentDeliveryFee();
}
let demoOrderCounter = 1000; // only used in demo mode, before Firebase is live

async function nextOrderNumber() {
  if (typeof DEMO_MODE !== "undefined" && !DEMO_MODE) {
    const counterRef = db.collection("counters").doc("orders");
    const next = await db.runTransaction(async (t) => {
      const doc = await t.get(counterRef);
      const current = doc.exists ? doc.data().last : 1000;
      const updated = current + 1;
      t.set(counterRef, { last: updated });
      return updated;
    });
    return "PC-" + next;
  }
  demoOrderCounter += 1;
  return "PC-" + demoOrderCounter;
}

// Builds an absolute link to the order-status page for a given order id,
// based on wherever this site is currently hosted (works on GitHub Pages,
// a custom domain, or a subfolder) so it's safe to drop into a WhatsApp
// message or show on the page.
function buildStatusLink(orderId) {
  let path = window.location.pathname;
  if (path.endsWith("index.html")) {
    path = path.slice(0, -"index.html".length);
  } else if (!path.endsWith("/")) {
    path = path.substring(0, path.lastIndexOf("/") + 1);
  }
  return window.location.origin + path + "status.html?order=" + encodeURIComponent(orderId);
}

// ================= SITE CONTENT (Site Editor in Admin) =================
function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.textContent = value;
}
function setHtmlLines(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.innerHTML = String(value).split("\n").join("<br>");
}
function applyPadding(el, size) {
  if (!el) return;
  const map = { compact: "32px 0", normal: "72px 0", spacious: "120px 0" };
  el.style.padding = map[size] || map.normal;
}
function applyImageShape(img, shape, widthPx) {
  if (!img) return;
  const radiusMap = { square: "4px", rounded: "18px", circle: "50%", pill: "999px" };
  img.style.borderRadius = radiusMap[shape] || radiusMap.rounded;
  if (widthPx) img.style.width = widthPx + "px";
  img.style.objectFit = "cover";
  if (shape === "circle") img.style.aspectRatio = "1 / 1";
}

function applySiteContent(c) {
  if (!c) return;

  const ann = document.getElementById("announce-bar");
  if (ann && c.announcement) {
    setText("announce-bar", c.announcement.text);
    ann.style.background = c.announcement.bgColor || "";
    ann.style.color = c.announcement.textColor || "";
  }

  if (c.hero) {
    setText("hero-eyebrow", c.hero.eyebrow);
    setHtmlLines("hero-headline", c.hero.headline);
    setText("hero-copy", c.hero.copy);
    setText("hero-cta1", c.hero.cta1Text);
    setText("hero-cta2", c.hero.cta2Text);
    const heroImg = document.getElementById("hero-image");
    if (heroImg && c.hero.image) {
      heroImg.src = c.hero.image;
      applyImageShape(heroImg, c.hero.imageShape, c.hero.imageWidth);
    }
    const headlineEl = document.getElementById("hero-headline");
    if (headlineEl && c.hero.headlineSize) headlineEl.style.fontSize = c.hero.headlineSize + "px";
    const copyEl = document.getElementById("hero-copy");
    if (copyEl && c.hero.bodySize) copyEl.style.fontSize = c.hero.bodySize + "px";
    applyPadding(document.getElementById("section-hero"), c.hero.padding);
  }

  if (c.signature) {
    setText("signature-eyebrow", c.signature.eyebrow);
    (c.signature.cards || []).forEach((card, i) => {
      const n = i + 1;
      const img = document.getElementById(`signature-card-${n}-img`);
      if (img && card.image) img.src = card.image;
      setText(`signature-card-${n}-name`, card.name);
      setText(`signature-card-${n}-price`, card.price);
    });
    applyPadding(document.getElementById("section-signature"), c.signature.padding);
  }

  if (c.menuSection) {
    setText("menu-eyebrow", c.menuSection.eyebrow);
    setText("menu-title", c.menuSection.title);
    setText("menu-quote-text", c.menuSection.quote);
  }

  if (c.story) {
    setText("story-eyebrow", c.story.eyebrow);
    setText("story-headline", c.story.headline);
    setText("story-para1", c.story.paragraph1);
    setText("story-para2", c.story.paragraph2);
    const storyImg = document.getElementById("story-image");
    if (storyImg && c.story.image) {
      storyImg.src = c.story.image;
      applyImageShape(storyImg, c.story.imageShape, null);
    }
    const storyHeadlineEl = document.getElementById("story-headline");
    if (storyHeadlineEl && c.story.headlineSize) storyHeadlineEl.style.fontSize = c.story.headlineSize + "px";
    applyPadding(document.getElementById("story"), c.story.padding);
  }

  if (c.delivery) {
    setText("delivery-eyebrow", c.delivery.eyebrow);
    setText("delivery-title", c.delivery.title);
    setText("delivery-card1-title", c.delivery.card1Title);
    setText("delivery-card1-text", c.delivery.card1Text);
    setText("delivery-card2-title", c.delivery.card2Title);
    setText("delivery-card2-text", c.delivery.card2Text);
    setText("delivery-card3-title", c.delivery.card3Title);
    setHtmlLines("delivery-card3-text", c.delivery.card3Text);
    applyPadding(document.getElementById("delivery"), c.delivery.padding);
  }

  if (c.findUs) {
    setText("findus-eyebrow", c.findUs.eyebrow);
    setText("findus-headline", c.findUs.headline);
    setText("findus-line1", c.findUs.line1);
    setText("findus-line2", c.findUs.line2);
    setText("findus-line3", c.findUs.line3);
    const mapLink = document.getElementById("findus-map-link");
    if (mapLink && c.findUs.mapLink) mapLink.href = c.findUs.mapLink;
    const mapImg = document.getElementById("findus-map-image");
    if (mapImg && c.findUs.mapImage) mapImg.src = c.findUs.mapImage;
  }

  if (c.footer) {
    setText("footer-brand", c.footer.brand);
    setText("footer-tagline", c.footer.tagline);
    setText("footer-address", c.footer.address);
    setText("footer-contact", c.footer.contact);
    setText("footer-copyright", c.footer.copyright);
  }
}

function loadSiteContent() {
  const defaults = typeof DEFAULT_SITE_CONTENT !== "undefined" ? DEFAULT_SITE_CONTENT : null;
  applySiteContent(defaults);

  if (typeof DEMO_MODE !== "undefined" && !DEMO_MODE) {
    db.collection("siteSettings")
      .doc("content")
      .onSnapshot(
        (doc) => {
          if (doc.exists) applySiteContent(mergeDeep(defaults, doc.data()));
        },
        (err) => console.error("Couldn't load site content:", err)
      );
  }
}

// ================= LOAD MENU (Firestore, falls back to local list) =================
async function loadMenu() {
  document.getElementById("menu-grid").innerHTML = `<p class="menu-loading">Loading menu...</p>`;

  if (typeof DEMO_MODE !== "undefined" && !DEMO_MODE) {
    try {
      const snap = await db.collection("menu").orderBy("name").get();
      MENU = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (MENU.length === 0) MENU = MENU_FALLBACK; // Firestore connected but empty — use fallback so the page isn't blank
    } catch (err) {
      console.error("Couldn't load menu from Firestore, using local fallback:", err);
      MENU = MENU_FALLBACK;
    }
  } else {
    MENU = MENU_FALLBACK;
  }
  renderTabs();
  renderMenu();
  renderSignatureCards();
  renderCart();
}

// ================= MENU RENDER =================
function renderTabs() {
  const wrap = document.getElementById("category-tabs");
  wrap.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (cat === activeCategory ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      activeCategory = cat;
      renderTabs();
      renderMenu();
    });
    wrap.appendChild(btn);
  });
}

function renderMenu() {
  const grid = document.getElementById("menu-grid");
  grid.innerHTML = "";
  const items = MENU.filter((item) => activeCategory === "All" || item.category === activeCategory);

  items.forEach((item) => {
    const qty = cart[item.id] || 0;
    const soldOut = item.inStock === false;
    const card = document.createElement("div");
    card.className = "menu-card" + (soldOut ? " sold-out" : "");
    card.innerHTML = `
      <div class="photo-placeholder${item.photoUrl ? "" : " text-only"}">${item.photoUrl ? `<img src="${item.photoUrl}" alt="${item.name}">` : `Photo: ${item.name}`}</div>
      <div class="menu-card-body">
        <div class="menu-card-top">
          <span class="menu-card-name">${item.name}</span>
          <span class="menu-card-price">$${fmt(item.price)}</span>
        </div>
        <p class="menu-card-desc">${item.desc}</p>
        <div class="menu-card-tags">
          ${(item.tags || []).map((t) => `<span class="tag-chip">${t}</span>`).join("")}
          ${soldOut ? `<span class="tag-chip sold-out-chip">Sold Out</span>` : ""}
        </div>
        <div class="menu-card-footer">
          ${
            soldOut
              ? ""
              : qty > 0
              ? `<div class="qty-control">
                  <button data-action="dec" data-id="${item.id}">−</button>
                  <span>${qty}</span>
                  <button data-action="inc" data-id="${item.id}">+</button>
                </div>`
              : `<button class="add-btn" data-action="inc" data-id="${item.id}">Add</button>`
          }
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

document.getElementById("menu-grid").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const current = cart[id] || 0;
  cart[id] = action === "inc" ? current + 1 : Math.max(0, current - 1);
  renderMenu();
  renderSignatureCards();
  renderCart();
  updateHeaderCartBadge();
});

// ================= BESTSELLERS QUICK-ADD =================
function renderSignatureCards() {
  document.querySelectorAll("#signature-row .signature-card[data-id]").forEach((card) => {
    const id = card.dataset.id;
    const actionEl = card.querySelector(".signature-card-action");
    if (!actionEl) return;
    const item = findItem(id);
    if (!item) { actionEl.innerHTML = ""; return; }
    const qty = cart[id] || 0;
    const soldOut = item.inStock === false;
    actionEl.innerHTML = soldOut
      ? `<span class="tag-chip sold-out-chip">Sold Out</span>`
      : qty > 0
      ? `<div class="qty-control">
          <button data-action="dec" data-id="${id}">−</button>
          <span>${qty}</span>
          <button data-action="inc" data-id="${id}">+</button>
        </div>`
      : `<button class="add-btn" data-action="inc" data-id="${id}">Add</button>`;
  });
}

document.getElementById("signature-row").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const current = cart[id] || 0;
  cart[id] = action === "inc" ? current + 1 : Math.max(0, current - 1);
  renderMenu();
  renderSignatureCards();
  renderCart();
  updateHeaderCartBadge();
});

// ================= CART DRAWER =================
function renderCart() {
  const list = document.getElementById("cart-items");
  const empty = document.getElementById("cart-empty");
  const entries = cartEntries();

  list.innerHTML = "";
  empty.classList.toggle("hidden", entries.length > 0);

  entries.forEach(([id, qty]) => {
    const item = findItem(id);
    if (!item) return;
    const line = document.createElement("div");
    line.className = "cart-line";
    line.innerHTML = `
      <div class="cart-line-photo" style="${item.photoUrl ? `background-image:url('${item.photoUrl}')` : ""}"></div>
      <div class="cart-line-info">
        <div class="cart-line-name">${item.name}</div>
        <div class="cart-line-price">$${fmt(item.price * qty)}</div>
      </div>
      <div class="qty-control cart-line-qty">
        <button data-action="dec" data-id="${id}">−</button>
        <span>${qty}</span>
        <button data-action="inc" data-id="${id}">+</button>
      </div>
    `;
    list.appendChild(line);
  });

  document.getElementById("cart-subtotal").textContent = `$${fmt(cartSubtotal())}`;
  const deliveryEl = document.getElementById("cart-delivery");
  deliveryEl.textContent = isDelivery() ? `$${fmt(DELIVERY_FEE)}` : "Free (Takeaway)";
  document.getElementById("cart-total").textContent = `$${fmt(cartTotal())}`;

  updateHeaderCartBadge();
  updateMobileBar();
}

document.getElementById("cart-items").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const current = cart[id] || 0;
  cart[id] = action === "inc" ? current + 1 : Math.max(0, current - 1);
  renderCart();
  renderMenu();
  updateHeaderCartBadge();
});

// ---- header badge + mobile sticky bar (these were missing — restored here) ----
function updateHeaderCartBadge() {
  document.getElementById("cart-badge").textContent = cartCount();
}
function updateMobileBar() {
  const bar = document.getElementById("mobile-sticky-bar");
  const count = cartCount();
  document.getElementById("mobile-cart-summary").textContent = `${count} item${count === 1 ? "" : "s"} · $${fmt(cartTotal())}`;
  bar.classList.toggle("visible", count > 0 && window.innerWidth <= 860);
}
window.addEventListener("resize", updateMobileBar);

// ================= DRAWER OPEN/CLOSE =================
const overlay = document.getElementById("drawer-overlay");
const cartDrawer = document.getElementById("cart-drawer");
const checkoutDrawer = document.getElementById("checkout-drawer");

function openDrawer(drawer) {
  overlay.classList.add("visible");
  drawer.classList.add("open");
}
function closeDrawers() {
  overlay.classList.remove("visible");
  cartDrawer.classList.remove("open");
  checkoutDrawer.classList.remove("open");
}
function closeCheckoutAndReset() {
  closeDrawers();
  finishCheckoutSession();
  document.getElementById("cod-order-btn").classList.remove("hidden");
  document.getElementById("whatsapp-order-btn").classList.remove("hidden");
}

overlay.addEventListener("click", closeCheckoutAndReset);
document.getElementById("open-cart").addEventListener("click", () => openDrawer(cartDrawer));
document.getElementById("mobile-cart-btn").addEventListener("click", () => openDrawer(cartDrawer));
document.getElementById("close-cart").addEventListener("click", closeDrawers);
document.getElementById("close-checkout").addEventListener("click", closeCheckoutAndReset);

document.getElementById("proceed-checkout").addEventListener("click", () => {
  if (cartCount() === 0) return;
  cartDrawer.classList.remove("open");
  renderCheckoutSummary();
  openDrawer(checkoutDrawer);
});

// ================= CHECKOUT FORM =================
document.querySelectorAll('input[name="order-type"]').forEach((el) => {
  el.addEventListener("change", () => {
    document.getElementById("address-fields").classList.toggle("hidden", !isDelivery());
    renderCart();
    renderCheckoutSummary();
  });
});

function renderCheckoutSummary() {
  const entries = cartEntries();
  const lines = entries.map(([id, qty]) => `${qty}x ${findItem(id)?.name || ""}`).join(", ");
  document.getElementById("checkout-summary").innerHTML = `
    <strong>${cartCount()} item${cartCount() === 1 ? "" : "s"}</strong> — ${lines || "no items"}<br>
    Total: $${fmt(cartTotal())} · Pay on delivery/pickup
  `;
}

function validateForm() {
  const name = document.getElementById("cf-name").value.trim();
  const phone = document.getElementById("cf-phone").value.trim();
  const email = document.getElementById("cf-email").value.trim();
  const terms = document.getElementById("cf-terms").checked;
  const errorEl = document.getElementById("form-error");

  if (cartCount() === 0) {
    errorEl.textContent = "Your cart is empty.";
    return null;
  }
  if (!name || !phone || !email) {
    errorEl.textContent = "Please fill in your name, phone, and email.";
    return null;
  }
  if (!terms) {
    errorEl.textContent = "Please accept the Terms & Conditions to continue.";
    return null;
  }

  let address = null;
  if (isDelivery()) {
    const address1 = document.getElementById("cf-address1").value.trim();
    const suburb = document.getElementById("cf-suburb").value.trim();
    const city = document.getElementById("cf-city").value.trim();
    const postcode = document.getElementById("cf-postcode").value.trim();
    if (!address1 || !suburb || !city || !postcode) {
      errorEl.textContent = "Please complete the full delivery address.";
      return null;
    }
    address = {
      line1: address1,
      line2: document.getElementById("cf-address2").value.trim(),
      suburb,
      city,
      postcode,
      notes: document.getElementById("cf-delivery-notes").value.trim(),
    };
  }

  errorEl.textContent = "";
  return {
    name,
    phone,
    email,
    type: isDelivery() ? "Delivery" : "Takeaway",
    address,
    time: document.getElementById("cf-time").value.trim() || "ASAP",
    notes: document.getElementById("cf-notes").value.trim(),
  };
}

// ---- shared: build the order record from the current cart + form ----
async function buildOrderRecord(data, orderChannel) {
  const id = await nextOrderNumber();
  const now = new Date();
  const entries = cartEntries();
  const items = entries.map(([itemId, qty]) => {
    const item = findItem(itemId);
    return { id: itemId, name: item.name, qty, price: item.price };
  });
  const subtotal = cartSubtotal();
  const delivery = currentDeliveryFee();
  const total = cartTotal();

  const record = {
    orderId: id,
    createdAt:
      typeof DEMO_MODE !== "undefined" && !DEMO_MODE && firebase.firestore.FieldValue
        ? firebase.firestore.FieldValue.serverTimestamp()
        : now.toISOString(),
    name: data.name,
    phone: data.phone,
    email: data.email,
    type: data.type,
    address: data.address,
    time: data.time,
    notes: data.notes,
    items,
    subtotal,
    deliveryFee: delivery,
    total,
    // orderChannel tells Admin how this order came in: "cod" (straight to Admin, Zomato-style)
    // or "whatsapp" (confirmed by chat). Both still show up in Admin either way.
    orderChannel,
    paymentMethod: orderChannel === "cod" ? "Cash/Card on " + data.type : "Confirmed via WhatsApp",
    status: "new",
  };

  return { id, now, items, subtotal, delivery, total, record };
}

async function saveOrderToFirestore(record) {
  if (typeof DEMO_MODE !== "undefined" && !DEMO_MODE) {
    await db.collection("orders").add(record);
  }
}

// Clears the cart the moment an order is placed (so it can't be double-submitted)
// but leaves the checkout drawer open so the customer can actually read the
// confirmation message and tap the tracking link. Nothing auto-closes.
function clearCartKeepDrawerOpen() {
  Object.keys(cart).forEach((k) => delete cart[k]);
  renderMenu();
  renderCart();
  updateHeaderCartBadge();
}

// Called when the customer closes the checkout drawer themselves (✕ button or
// tapping the overlay) — this is when we actually reset the form for next time.
function finishCheckoutSession() {
  document.getElementById("checkout-form").reset();
  document.getElementById("cf-city").value = "Rotorua";
  document.getElementById("form-error").textContent = "";
  document.getElementById("form-error").style.color = "";
  document.getElementById("address-fields").classList.add("hidden");
}

// ---- Pay on Delivery/Pickup: goes straight to the Admin orders list, no WhatsApp popup ----
document.getElementById("cod-order-btn").addEventListener("click", async () => {
  const data = validateForm();
  if (!data) return;

  const btn = document.getElementById("cod-order-btn");
  btn.disabled = true;
  btn.textContent = "Placing order...";

  const { record } = await buildOrderRecord(data, "cod");

  try {
    await saveOrderToFirestore(record);
    const statusLink = buildStatusLink(record.orderId);
    document.getElementById("form-error").style.color = "#2F3B28";
    document.getElementById("form-error").innerHTML =
      `Order #${record.orderId} placed! Pay ${record.paymentMethod.toLowerCase()} — we'll start preparing it shortly.<br>` +
      `<a href="${statusLink}" target="_blank" style="color:#B33F2E;font-weight:600;text-decoration:underline;">Track your order status →</a>`;
    clearCartKeepDrawerOpen();
    document.getElementById("cod-order-btn").classList.add("hidden");
    document.getElementById("whatsapp-order-btn").classList.add("hidden");
  } catch (err) {
    console.error("Couldn't save order:", err);
    document.getElementById("form-error").style.color = "";
    document.getElementById("form-error").textContent =
      "Couldn't place your order — please try again, or use 'Order on WhatsApp' instead.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Pay on Delivery/Pickup";
  }
});

// ---- Order on WhatsApp: opens a WhatsApp chat with the order summary ----
document.getElementById("whatsapp-order-btn").addEventListener("click", async () => {
  const data = validateForm();
  if (!data) return;

  const btn = document.getElementById("whatsapp-order-btn");
  btn.disabled = true;
  btn.textContent = "Opening WhatsApp...";

  const { id, now, items, subtotal, delivery, total, record } = await buildOrderRecord(data, "whatsapp");

  try {
    await saveOrderToFirestore(record); // still logged in Admin, tagged as a WhatsApp order
  } catch (err) {
    console.error("Couldn't save order to Firestore:", err);
    // Still continue to WhatsApp below so the order isn't lost — the kitchen still gets it via chat.
  }

  sendWhatsAppOrder(id, now, data, items, subtotal, delivery, total);

  const statusLink = buildStatusLink(id);
  document.getElementById("form-error").style.color = "#2F3B28";
  document.getElementById("form-error").innerHTML =
    `Order #${id} sent on WhatsApp!<br>` +
    `<a href="${statusLink}" target="_blank" style="color:#B33F2E;font-weight:600;text-decoration:underline;">Track your order status →</a>`;
  clearCartKeepDrawerOpen();
  document.getElementById("cod-order-btn").classList.add("hidden");
  document.getElementById("whatsapp-order-btn").classList.add("hidden");

  btn.disabled = false;
  btn.textContent = "Order on WhatsApp";
});

function sendWhatsAppOrder(id, now, data, items, subtotal, delivery, total) {
  const dateStr = now.toLocaleDateString("en-NZ") + " " + now.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" });
  const itemLines = items.map((i) => `• ${i.qty}x ${i.name} — $${fmt(i.price * i.qty)}`).join("\n");

  const addressLine = data.address
    ? `${data.address.line1}${data.address.line2 ? ", " + data.address.line2 : ""}, ${data.address.suburb}, ${data.address.city} ${data.address.postcode}`
    : "Takeaway at 44 Cuba Street, Te Aro, Rotorua";

  // Tuned WhatsApp message: clear header, scannable sections, action-oriented, no clutter
  const messageLines = [
    `🛵 *NEW ORDER — ${BUSINESS_NAME}*`,
    `Order #${id} · ${dateStr}`,
    "",
    `*${data.type.toUpperCase()}*${data.type === "Delivery" ? ` → ${addressLine}` : ` → pickup at 44 Cuba Street`}`,
    data.address && data.address.notes ? `Delivery notes: ${data.address.notes}` : null,
    `Requested time: ${data.time}`,
    "",
    `*Items:*`,
    itemLines,
    "",
    `Subtotal: NZD ${fmt(subtotal)}`,
    data.type === "Delivery" ? `Delivery fee: NZD ${fmt(delivery)}` : null,
    `*Total to collect: NZD ${fmt(total)}* (Pay on ${data.type.toLowerCase()})`,
    "",
    `*Customer:* ${data.name}`,
    `*Phone:* ${data.phone}`,
    data.notes ? `*Notes:* ${data.notes}` : null,
    "",
    `📍 Track order: ${buildStatusLink(id)}`,
  ].filter(Boolean);

  const message = encodeURIComponent(messageLines.join("\n"));
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
}

// ================= HEADER WHATSAPP QUICK LINKS =================
document.getElementById("header-whatsapp-link").addEventListener("click", (e) => {
  e.preventDefault();
  window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank");
});
document.getElementById("footer-whatsapp-link").addEventListener("click", (e) => {
  e.preventDefault();
  window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank");
});

// ================= MOBILE NAV =================
document.getElementById("mobile-menu-toggle").addEventListener("click", () => {
  document.getElementById("main-nav").classList.toggle("mobile-open");
});

// ================= POLICY MODAL =================
const POLICIES = {
  delivery: {
    title: "Delivery Policy",
    body: [
      "We deliver across central Rotorua. A flat delivery fee of $5.00 NZD applies to all delivery orders.",
      "Typical delivery time is 35–45 minutes from confirmation, depending on traffic and order volume.",
      "Takeaway orders are usually ready within 20 minutes at our Cuba Street kitchen.",
    ],
  },
  refunds: {
    title: "Refunds & Cancellations",
    body: [
      "Since every dish is made fresh to order, we're unable to offer refunds once preparation has started.",
      "If there's an issue with your order — wrong items, quality concerns, or a missed Takeaway/delivery on our end — message us on WhatsApp within 2 hours and we'll make it right.",
      "Orders can be cancelled free of charge if you contact us before we begin preparing your food.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "We collect the name, phone number, email, and (for delivery) address you provide at checkout solely to fulfil your order.",
      "Your details are never sold or shared with third parties beyond what's needed to deliver your order (e.g. a delivery partner, if used).",
      "You can ask us to delete your order history at any time by messaging us on WhatsApp.",
    ],
  },
  terms: {
    title: "Terms & Conditions",
    body: [
      "By placing an order with The Chaya & Co., you confirm the details you've provided are accurate and that you're authorised to order to the address given.",
      "Prices are listed in New Zealand dollars (NZD) and may change without notice. The price shown at checkout is the price charged.",
      "Payment is made in cash or by card directly to our team at the point of delivery or pickup.",
      "The Chaya & Co. is a New Zealand based business operating from 44 Cuba Street, Te Aro, Rotorua.",
    ],
  },
};

function openPolicy(key) {
  const policy = POLICIES[key];
  if (!policy) return;
  document.getElementById("policy-content").innerHTML = `
    <h3>${policy.title}</h3>
    ${policy.body.map((p) => `<p>${p}</p>`).join("")}
  `;
  document.getElementById("policy-overlay").classList.add("visible");
}
document.querySelectorAll("[data-policy]").forEach((el) => {
  el.addEventListener("click", () => openPolicy(el.dataset.policy));
});
document.getElementById("close-policy").addEventListener("click", () => {
  document.getElementById("policy-overlay").classList.remove("visible");
});
document.getElementById("policy-overlay").addEventListener("click", (e) => {
  if (e.target.id === "policy-overlay") document.getElementById("policy-overlay").classList.remove("visible");
});

// ================= INIT =================
loadSiteContent();
loadMenu();

// ================= CONFIG =================
const WHATSAPP_NUMBER = "64211234567"; // Replace with your NZ WhatsApp number, country code + number, no + or spaces
const DELIVERY_FEE = 5.0;

// ================= MENU DATA =================
const MENU = [
  { id: "classic-pani-puri", name: "Classic Pani Puri", category: "Pani Puri", desc: "Crisp puris, spiced potato, tangy masala pani", price: 8.0, tags: ["Bestseller", "Vegetarian"] },
  { id: "sweet-puri", name: "Sweet Puri", category: "Pani Puri", desc: "Tamarind and jaggery water, no chilli", price: 8.0, tags: ["Vegan"] },
  { id: "sev-puri", name: "Sev Puri", category: "Chaat", desc: "Crisp puris topped with potato, chutneys, sev", price: 9.5, tags: ["Vegetarian"] },
  { id: "dahi-puri", name: "Dahi Puri", category: "Chaat", desc: "Puris filled with yoghurt, chutney, spice", price: 9.0, tags: ["Bestseller", "Vegetarian"] },
  { id: "bhel-puri", name: "Bhel Puri", category: "Chaat", desc: "Puffed rice, sev, vegetables, tamarind chutney", price: 8.5, tags: ["Vegan"] },
  { id: "masala-chai", name: "Masala Chai", category: "Beverages", desc: "Spiced tea, made fresh to order", price: 4.5, tags: ["Vegetarian"] },
  { id: "sweet-lassi", name: "Sweet Lassi", category: "Beverages", desc: "Yoghurt, cardamom, a little sugar", price: 6.0, tags: ["Vegetarian"] },
  { id: "chaat-combo", name: "Chaat Combo", category: "Combos", desc: "Sev puri, dahi puri, and a masala chai", price: 19.0, tags: ["Bestseller"] },
];

const CATEGORIES = ["All", "Pani Puri", "Chaat", "Beverages", "Combos"];


let activeCategory = "All";
let activeFilters = new Set();
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
  return cartEntries().reduce((sum, [id, qty]) => sum + findItem(id).price * qty, 0);
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
function orderId() {
  return "PC-" + Math.floor(1000 + Math.random() * 9000);
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
    const card = document.createElement("div");
    card.className = "menu-card";
    card.innerHTML = `
      <div class="photo-placeholder">Photo: ${item.name}</div>
      <div class="menu-card-body">
        <div class="menu-card-top">
          <span class="menu-card-name">${item.name}</span>
          <span class="menu-card-price">$${fmt(item.price)}</span>
        </div>
        <p class="menu-card-desc">${item.desc}</p>
        <div class="menu-card-tags">${item.tags.map((t) => `<span class="tag-chip">${t}</span>`).join("")}</div>
        <div class="menu-card-footer">
          ${
            qty > 0
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
    const line = document.createElement("div");
    line.className = "cart-line";
    line.innerHTML = `
      <div class="cart-line-photo"></div>
      <div class="cart-line-info">
        <div class="cart-line-name">${qty}x ${item.name}</div>
        <div class="cart-line-price">$${fmt(item.price * qty)}</div>
        <button class="cart-line-remove" data-id="${id}">Remove</button>
      </div>
    `;
    list.appendChild(line);
  });

  document.getElementById("cart-subtotal").textContent = `$${fmt(cartSubtotal())}`;
  const deliveryRow = document.getElementById("cart-delivery-row");
  const deliveryEl = document.getElementById("cart-delivery");
  if (isDelivery()) {
    deliveryEl.textContent = `$${fmt(DELIVERY_FEE)}`;
  } else {
    deliveryEl.textContent = "Free (Takeaway)";
  }
  document.getElementById("cart-total").textContent = `$${fmt(cartTotal())}`;

  updateMobileBar();
}

document.getElementById("cart-items").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  cart[btn.dataset.id] = 0;
  renderCart();
  renderMenu();
  updateHeaderCartBadge();
});

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
overlay.addEventListener("click", closeDrawers);
document.getElementById("open-cart").addEventListener("click", () => openDrawer(cartDrawer));
document.getElementById("mobile-cart-btn").addEventListener("click", () => openDrawer(cartDrawer));
document.getElementById("close-cart").addEventListener("click", closeDrawers);
document.getElementById("close-checkout").addEventListener("click", closeDrawers);

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
  const lines = entries.map(([id, qty]) => `${qty}x ${findItem(id).name}`).join(", ");
  document.getElementById("checkout-summary").innerHTML = `
    <strong>${cartCount()} item${cartCount() === 1 ? "" : "s"}</strong> — ${lines || "no items"}<br>
    Total: $${fmt(cartTotal())}
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

document.getElementById("pay-now-btn").addEventListener("click", () => {
  const data = validateForm();
  if (!data) return;
  document.getElementById("form-error").textContent =
    "Online payment isn't connected yet — please use \"Order on WhatsApp\" to complete this order.";
});

document.getElementById("whatsapp-order-btn").addEventListener("click", () => {
  const data = validateForm();
  if (!data) return;

  const id = orderId();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-NZ") + " " + now.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" });
  const entries = cartEntries();
  const itemLines = entries.map(([itemId, qty]) => `${qty}x ${findItem(itemId).name}`).join("; ");
  const subtotal = cartSubtotal();
  const delivery = currentDeliveryFee();
  const total = cartTotal();

  const addressLine = data.address
    ? `${data.address.line1}${data.address.line2 ? ", " + data.address.line2 : ""}, ${data.address.suburb}, ${data.address.city} ${data.address.postcode}`
    : "Takeaway at 44 Cuba Street, Te Aro, Rotorua";

  const messageLines = [
    "New Order",
    `Order ID: ${id}`,
    `Date: ${dateStr}`,
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Email: ${data.email}`,
    `Type: ${data.type}`,
    `Address: ${addressLine}`,
    data.address && data.address.notes ? `Delivery notes: ${data.address.notes}` : null,
    `Preferred time: ${data.time}`,
    `Items: ${itemLines}`,
    data.notes ? `Order notes: ${data.notes}` : null,
    `Subtotal: NZD ${fmt(subtotal)}`,
    `Delivery fee: NZD ${fmt(delivery)}`,
    `Total: NZD ${fmt(total)}`,
    "Payment status: Unpaid (WhatsApp order)",
  ].filter(Boolean);

  const message = encodeURIComponent(messageLines.join("\n"));
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
});

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
      "By placing an order with The Puri Co., you confirm the details you've provided are accurate and that you're authorised to order to the address given.",
      "Prices are listed in New Zealand dollars (NZD) and may change without notice. The price shown at checkout is the price charged.",
      "The Puri Co. is a New Zealand based business operating from 44 Cuba Street, Te Aro, Rotorua.",
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
renderTabs();
renderMenu();
renderCart();
updateHeaderCartBadge();
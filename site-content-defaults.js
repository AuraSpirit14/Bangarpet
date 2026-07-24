// ================= SITE CONTENT DEFAULTS =================
// This is the fallback content used if Firestore doesn't have a siteSettings/content
// doc yet (e.g. before you've ever hit "Save" in Admin's Site Editor tab). It matches
// exactly what was hardcoded into the page originally, so nothing changes visually
// until you actually edit something in Admin.
const DEFAULT_SITE_CONTENT = {
  announcement: {
    text: "Today's special: Sev-Puri · Takeaway ready in ~20 min · Delivering across central Rotorua",
    bgColor: "#2F3B28",
    textColor: "#ffffff",
  },
  hero: {
    eyebrow: "Artisanal Bites · New Zealand",
    headline: "Street food, treated\nlike it deserves a menu card.",
    copy: "Every puri is filled to order. Every chutney is made the same morning it's served. Order ahead for Takeaway, or have it delivered across Rotorua.",
    cta1Text: "Order Now",
    cta2Text: "View Menu",
    image: "./photos/Staring.png",
    imageWidth: 270,
    imageShape: "rounded",
    headlineSize: 44,
    bodySize: 17,
    padding: "normal",
  },
  signature: {
    eyebrow: "Bestsellers",
    cards: [
      { image: "./photos/panipuri.png", name: "Classic Pani Puri", price: "$8.00" },
      { image: "./photos/BhelPuri.png", name: "Bhel Puri", price: "$8.50" },
      { image: "./photos/DahiPuri.png", name: "Dahi Puri", price: "$9.00" },
    ],
    padding: "normal",
  },
  menuSection: {
    eyebrow: "The Menu",
    title: "Order Ahead",
    quote: "\"Our masala pani is steeped fresh every morning — no shortcuts, no concentrate.\" — Kanha, founder",
  },
  story: {
    eyebrow: "Our Story",
    headline: "From a Bangarpet Kolar street cart to a Rotorua kitchen",
    paragraph1: "The Chaya & Co. began as a single market stall in 2005, built on recipes carried over from Kolar. Twenty One years on, we're still a small, family-run kitchen — everything made fresh, nothing sitting under a heat lamp.",
    paragraph2: "We're proud to be a New Zealand based business, serving our community one order at a time.",
    image: "./photos/ourstory.png",
    imageShape: "rounded",
    headlineSize: 30,
    padding: "normal",
  },
  delivery: {
    eyebrow: "Delivery & Takeaway",
    title: "How to Order",
    card1Title: "Takeaway",
    card1Text: "Ready in approximately 20 minutes. Order ahead and skip the queue at our Cuba Street kitchen.",
    card2Title: "Delivery",
    card2Text: "We deliver across central Rotorua. Flat delivery fee of $5.00. Typical delivery time is 35–45 minutes.",
    card3Title: "Hours",
    card3Text: "Monday–Sunday, 03:30pm–8:00pm.\nClosed Saturday.",
    padding: "normal",
  },
  findUs: {
    eyebrow: "Find Us",
    headline: "The Chaya & Co.",
    line1: "44 Cuba Street, Te Aro, Rotorua 6011",
    line2: "Monday–Sunday, 03:30pm–8:00pm",
    line3: "021 123 4567 · help@thechayaandco.nz",
    mapImage: "./photos/map.png",
    mapLink: "https://www.google.com/maps/place/28+Manuka+Crescent,+Hillcrest,+Rotorua+3015,+New+Zealand/@-38.1518837,176.2355002,18.94z/data=!4m6!3m5!1s0x6d6c27400b996f21:0x37cf17543a4d4322!8m2!3d-38.1521317!4d176.2364278!16s%2Fg%2F11gfd5j300",
  },
  footer: {
    brand: "The Chaya & Co.",
    tagline: "This is a New Zealand based business.",
    address: "44 Cuba Street, Te Aro, Rotorua 6011",
    contact: "021 123 4567 · hello@thechayaandco.nz",
    copyright: "© 2026 The Chaya & Co. All prices in NZD RTG.",
  },
};

// ---- shared helpers (used by both script.js and admin.js) ----

// Deep-merges a Firestore-saved content object on top of the defaults, so any
// field you haven't edited yet still falls back safely instead of going blank.
function mergeDeep(base, override) {
  if (!override) return base;
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : base;
  }
  const result = { ...base };
  Object.keys(override).forEach((key) => {
    if (
      override[key] && typeof override[key] === "object" && !Array.isArray(override[key]) &&
      base[key] && typeof base[key] === "object" && !Array.isArray(base[key])
    ) {
      result[key] = mergeDeep(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  });
  return result;
}

// Reads a nested value using a dot path like "hero.cards.0.name"
function getByPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Writes a nested value using the same dot path syntax, creating objects/arrays
// along the way as needed.
function setByPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const nextKeyIsIndex = /^\d+$/.test(keys[i + 1]);
    if (cur[k] === undefined || cur[k] === null) cur[k] = nextKeyIsIndex ? [] : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

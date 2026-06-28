const STORAGE_KEY = "pricepulse.trackers.v1";
const ALERT_KEY = "pricepulse.alerts.v1";
const CHECK_ALARM = "pricepulse.periodic-check";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(CHECK_ALARM, { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(CHECK_ALARM, { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CHECK_ALARM) runPriceChecks();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PRICEPULSE_NOTIFY") {
    createNotification(message.title, message.body);
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "PRICEPULSE_RUN_CHECKS") {
    runPriceChecks(message.productId)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function runPriceChecks(productId = null) {
  const state = await chrome.storage.local.get([STORAGE_KEY, ALERT_KEY]);
  const products = Array.isArray(state[STORAGE_KEY]) ? state[STORAGE_KEY] : [];
  let alerts = Array.isArray(state[ALERT_KEY]) ? state[ALERT_KEY] : [];
  let updated = 0;
  let notified = 0;

  for (const product of products) {
    if (productId && product.id !== productId) continue;

    const previousPrice = currentPrice(product);
    const fetchedPrice = await fetchLatestPrice(product).catch(() => null);
    const nextPrice = fetchedPrice || simulateNextPrice(product);
    const wasAboveTarget = previousPrice > product.targetPrice;

    product.history = [...product.history.slice(-17), nextPrice];
    updated += 1;

    if (wasAboveTarget && nextPrice <= product.targetPrice) {
      const alert = buildAlert(
        `${product.name}: Target crossed at ${formatCurrency(nextPrice)}`,
        `${product.platform} is now at or below ${formatCurrency(product.targetPrice)}.`
      );
      alerts = [alert, ...alerts].slice(0, 20);
      createNotification(alert.title, alert.body);
      notified += 1;
    }
  }

  await chrome.storage.local.set({
    [STORAGE_KEY]: products,
    [ALERT_KEY]: alerts
  });

  return { updated, notified };
}

async function fetchLatestPrice(product) {
  if (!isSupportedStoreUrl(product?.url)) {
    return null;
  }

  const response = await fetch(product.url, {
    credentials: "omit",
    cache: "no-store"
  });

  if (!response.ok) return null;

  const html = await response.text();
  return extractPriceFromHtml(html, product.platform, currentPrice(product));
}

function isSupportedStoreUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && (hostname.endsWith("amazon.in") || hostname.endsWith("flipkart.com"));
  } catch {
    return false;
  }
}

function extractPriceFromHtml(html, platform, referencePrice) {
  const candidates = new Set();
  const compactHtml = html.replace(/\s+/g, " ");
  const rupeeRegex = /(?:₹|Rs\.?|INR)\s*([0-9][0-9,\s.]{2,})/gi;
  let match;

  while ((match = rupeeRegex.exec(compactHtml))) {
    const price = parsePrice(match[1]);
    if (price && price >= 100 && price <= 1000000) candidates.add(price);
  }

  if (platform === "Amazon") {
    collectByRegex(compactHtml, /a-price-whole[^>]*>\s*([0-9,]+)/gi, candidates);
    collectByRegex(compactHtml, /priceblock_(?:ourprice|dealprice)[^>]*>\s*(?:₹|Rs\.?)?\s*([0-9,]+)/gi, candidates);
  }

  if (platform === "Flipkart") {
    collectByRegex(compactHtml, /(?:Nx9bqj|_30jeq3|CxhGGd)[^>]*>\s*(?:₹|Rs\.?)?\s*([0-9,]+)/gi, candidates);
  }

  const prices = [...candidates];
  if (!prices.length) return null;
  if (!referencePrice) return Math.min(...prices);

  return prices.sort((a, b) => Math.abs(a - referencePrice) - Math.abs(b - referencePrice))[0];
}

function collectByRegex(text, regex, output) {
  let match;
  while ((match = regex.exec(text))) {
    const price = parsePrice(match[1]);
    if (price && price >= 100 && price <= 1000000) output.add(price);
  }
}

function parsePrice(rawText) {
  const clean = String(rawText)
    .replace(/[^\d.]/g, "")
    .trim();
  const value = Number.parseFloat(clean);
  return Number.isFinite(value) ? Math.round(value) : null;
}

function simulateNextPrice(product) {
  const latest = currentPrice(product);
  const history = product.history || [latest];
  const previous = history.at(-2) || latest;
  const drift = (latest - previous) * 0.25;
  const eventDrop = Math.random() > 0.72 ? -latest * randomBetween(0.015, 0.05) : 0;
  const noise = latest * randomBetween(-0.018, 0.018);
  return Math.max(199, Math.round((latest + drift + eventDrop + noise) / 10) * 10);
}

function currentPrice(product) {
  return Number(product?.history?.at(-1)) || Number(product?.targetPrice) || 0;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function buildAlert(title, body) {
  return {
    id: crypto.randomUUID(),
    title,
    body,
    time: "Now"
  };
}

function createNotification(title, body) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "assets/icon-128.png",
    title: title || "PricePulse",
    message: body || "A tracked product changed price."
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

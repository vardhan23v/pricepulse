const STORAGE_KEY = "pricepulse.trackers.v1";
const ALERT_KEY = "pricepulse.alerts.v1";
const IS_EXTENSION = Boolean(globalThis.chrome?.runtime?.id && globalThis.chrome?.storage?.local);

const sampleProducts = [
  {
    id: "sony-headphones",
    name: "Sony WH-1000XM5 Wireless Headphones",
    platform: "Amazon",
    url: "https://www.amazon.in/",
    targetPrice: 24990,
    history: [29990, 29490, 28990, 28990, 28490, 27990, 27250, 26890, 26490, 26990, 25990, 25490, 25190, 24790],
    tone: "linear-gradient(135deg, #d9f3ef, #0f766e)"
  },
  {
    id: "iphone",
    name: "Apple iPhone 15 128GB",
    platform: "Flipkart",
    url: "https://www.flipkart.com/",
    targetPrice: 58999,
    history: [67999, 67499, 66999, 66499, 65999, 65499, 64999, 64299, 63799, 63299, 62899, 62499, 62199, 61999],
    tone: "linear-gradient(135deg, #e3edff, #2457a6)"
  },
  {
    id: "mixer",
    name: "Philips 750W Mixer Grinder",
    platform: "Amazon",
    url: "https://www.amazon.in/",
    targetPrice: 3299,
    history: [4299, 4199, 4099, 3899, 3799, 3699, 3599, 3549, 3499, 3529, 3489, 3519, 3499, 3529],
    tone: "linear-gradient(135deg, #fff0cf, #c47a00)"
  },
  {
    id: "watch",
    name: "Samsung Galaxy Watch 6",
    platform: "Flipkart",
    url: "https://www.flipkart.com/",
    targetPrice: 17999,
    history: [24999, 23999, 22999, 22499, 21999, 20999, 19999, 19499, 18999, 18799, 18599, 18699, 18499, 18399],
    tone: "linear-gradient(135deg, #ffe3df, #e85d5a)"
  }
];

let products = [];
let alerts = [];
let selectedId = null;
let toastTimer;

const nodes = {
  metricStrip: document.querySelector("#metricStrip"),
  productGrid: document.querySelector("#productGrid"),
  trackerForm: document.querySelector("#trackerForm"),
  productUrl: document.querySelector("#productUrl"),
  platform: document.querySelector("#platform"),
  targetPrice: document.querySelector("#targetPrice"),
  productName: document.querySelector("#productName"),
  currentPrice: document.querySelector("#currentPrice"),
  refreshButton: document.querySelector("#refreshButton"),
  notifyButton: document.querySelector("#notifyButton"),
  currentTabButton: document.querySelector("#currentTabButton"),
  modeChip: document.querySelector("#modeChip"),
  clearAlertsButton: document.querySelector("#clearAlertsButton"),
  searchInput: document.querySelector("#searchInput"),
  platformFilter: document.querySelector("#platformFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  alertList: document.querySelector("#alertList"),
  forecastTitle: document.querySelector("#forecastTitle"),
  forecastBadge: document.querySelector("#forecastBadge"),
  buyScore: document.querySelector("#buyScore"),
  scoreRing: document.querySelector("#scoreRing"),
  forecastAction: document.querySelector("#forecastAction"),
  forecastReason: document.querySelector("#forecastReason"),
  detailChart: document.querySelector("#detailChart"),
  chartRange: document.querySelector("#chartRange"),
  toast: document.querySelector("#toast")
};

function seedAlerts() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Sony WH-1000XM5 crossed target",
      body: "Amazon is now below the watched price by 200.",
      time: "Today"
    },
    {
      id: crypto.randomUUID(),
      title: "Galaxy Watch 6 is near the low",
      body: "Flipkart is within 2 percent of the 14-check low.",
      time: "Yesterday"
    }
  ];
}

async function initialize() {
  const state = await loadState();
  products = state.products;
  alerts = state.alerts;
  selectedId = products[0]?.id || null;

  if (IS_EXTENSION) {
    document.body.classList.add("extension-mode");
    nodes.modeChip.textContent = "Extension";
    nodes.notifyButton.textContent = "Test alert";
  }

  await saveState();
  bindEvents();
  renderAll();
}

async function loadState() {
  if (IS_EXTENSION) {
    const saved = await chromeStorageGet([STORAGE_KEY, ALERT_KEY]);
    return normalizeState(saved[STORAGE_KEY], saved[ALERT_KEY]);
  }

  try {
    return normalizeState(
      JSON.parse(localStorage.getItem(STORAGE_KEY)),
      JSON.parse(localStorage.getItem(ALERT_KEY))
    );
  } catch {
    return normalizeState(null, null);
  }
}

function normalizeState(savedProducts, savedAlerts) {
  return {
    products: Array.isArray(savedProducts) ? savedProducts : clone(sampleProducts),
    alerts: Array.isArray(savedAlerts) ? savedAlerts : seedAlerts()
  };
}

async function saveState() {
  if (IS_EXTENSION) {
    await chromeStorageSet({
      [STORAGE_KEY]: products,
      [ALERT_KEY]: alerts
    });
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  localStorage.setItem(ALERT_KEY, JSON.stringify(alerts));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function chromeStorageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(result);
    });
  });
}

function chromeStorageSet(value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(value, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(response);
    });
  });
}

function queryActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(tabs[0] || null);
    });
  });
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(response);
    });
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function regressionSlope(values) {
  const xMean = (values.length - 1) / 2;
  const yMean = average(values);
  let numerator = 0;
  let denominator = 0;

  values.forEach((value, index) => {
    numerator += (index - xMean) * (value - yMean);
    denominator += (index - xMean) ** 2;
  });

  return denominator === 0 ? 0 : numerator / denominator;
}

function analyzeProduct(product) {
  const history = product.history;
  const current = history.at(-1);
  const previous = history.at(-2) || current;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const slope = regressionSlope(history.slice(-10));
  const volatility = standardDeviation(history.slice(-10));
  const priceRange = Math.max(max - min, 1);
  const percentile = (current - min) / priceRange;
  const targetDistance = (current - product.targetPrice) / current;
  const dropFromHigh = ((max - current) / max) * 100;
  const change = current - previous;
  const expectedSevenDayMove = slope * 7;
  const targetHit = current <= product.targetPrice;
  const confidence = clamp(82 - (volatility / current) * 2600 + history.length * 1.5, 52, 94);

  let score = 82 - percentile * 30 - Math.max(targetDistance, 0) * 500;
  score += percentile <= 0.2 ? 8 : 0;
  score += targetHit ? 24 : 0;
  score += !targetHit && slope < -current * 0.002 ? -10 : 0;
  score += slope > 0 ? -8 : 0;
  score = Math.round(clamp(score, 8, 99));

  let action = "Watch closely";
  let type = "watch";
  let reason = "The price is moving, but the current level is not yet compelling versus its recent low and target.";
  let badge = "Hold";

  if (targetHit) {
    action = "Buy now";
    type = "buy";
    badge = "Target hit";
    reason = `Current price is ${formatCurrency(current)} against a target of ${formatCurrency(product.targetPrice)}, with ${Math.round(confidence)} percent confidence.`;
  } else if (slope < 0 && expectedSevenDayMove < -current * 0.015) {
    const nextWindow = clamp(Math.ceil((current - product.targetPrice) / Math.abs(slope || 1)), 3, 14);
    action = `Wait ${nextWindow} days`;
    type = "wait";
    badge = "Falling";
    reason = `Recent prices are trending down by about ${formatCurrency(Math.abs(slope))} per check, so a lower entry is plausible.`;
  } else if (percentile <= 0.2 && targetDistance <= 0.025) {
    action = "Good entry";
    type = "buy";
    badge = "Near low";
    reason = "The current price sits near the bottom of its recent range even though it has not fully cleared the target.";
  }

  return {
    current,
    previous,
    min,
    max,
    change,
    slope,
    volatility,
    percentile,
    targetHit,
    dropFromHigh,
    confidence,
    score,
    action,
    type,
    badge,
    reason
  };
}

function filteredProducts() {
  const searchTerm = nodes.searchInput.value.trim().toLowerCase();
  const platform = nodes.platformFilter.value;
  const sortBy = nodes.sortSelect.value;

  return products
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm);
      const matchesPlatform = platform === "all" || product.platform === platform;
      return matchesSearch && matchesPlatform;
    })
    .sort((a, b) => {
      const aStats = analyzeProduct(a);
      const bStats = analyzeProduct(b);

      if (sortBy === "drop") return bStats.dropFromHigh - aStats.dropFromHigh;
      if (sortBy === "price") return aStats.current - bStats.current;
      return bStats.score - aStats.score;
    });
}

function renderMetrics() {
  const stats = products.map(analyzeProduct);
  const targetHits = stats.filter((stat) => stat.targetHit).length;
  const bestScore = stats.length ? Math.max(...stats.map((stat) => stat.score)) : 0;
  const totalSavings = stats.reduce((sum, stat) => sum + Math.max(stat.max - stat.current, 0), 0);
  const falling = stats.filter((stat) => stat.slope < 0).length;

  const cards = [
    ["Tracked", products.length, "Active product watches"],
    ["Targets hit", targetHits, "Ready-price matches"],
    ["Savings seen", formatCurrency(totalSavings), "Against recent highs"],
    ["Falling", falling, `Top score ${bestScore}`]
  ];

  nodes.metricStrip.innerHTML = cards
    .map(([label, value, detail]) => `
      <article class="metric-card">
        <p class="eyebrow">${label}</p>
        <strong>${value}</strong>
        <span>${detail}</span>
      </article>
    `)
    .join("");
}

function renderProducts() {
  const visible = filteredProducts();

  if (!visible.length) {
    nodes.productGrid.innerHTML = `<div class="empty-state">No tracked products match the current filters.</div>`;
    return;
  }

  nodes.productGrid.innerHTML = visible.map((product) => productCard(product)).join("");

  nodes.productGrid.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedId = button.dataset.select;
      renderAll();
    });
  });

  nodes.productGrid.querySelectorAll("[data-check]").forEach((button) => {
    button.addEventListener("click", async () => {
      await refreshProduct(button.dataset.check);
    });
  });

  nodes.productGrid.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      products = products.filter((product) => product.id !== button.dataset.remove);
      if (selectedId === button.dataset.remove) selectedId = products[0]?.id || null;
      await saveState();
      renderAll();
      showToast("Tracker removed");
    });
  });
}

function productCard(product) {
  const stat = analyzeProduct(product);
  const storeClass = product.platform.toLowerCase();
  const selectedClass = product.id === selectedId ? " selected" : "";
  const delta = stat.change === 0 ? "No change" : `${stat.change < 0 ? "Down" : "Up"} ${formatCurrency(Math.abs(stat.change))}`;

  return `
    <article class="product-card${selectedClass}">
      <div class="product-art" style="--art-bg: ${product.tone}" aria-hidden="true"></div>
      <div class="product-main">
        <div class="product-topline">
          <span class="store-pill ${storeClass}">${product.platform}</span>
          <span class="deal-pill ${stat.type}">${stat.action}</span>
        </div>
        <h3 class="product-title">${escapeHtml(product.name)}</h3>
        <div class="price-row">
          <div>
            <span class="current-price">${formatCurrency(stat.current)}</span>
            <span class="target-price">Target ${formatCurrency(product.targetPrice)}</span>
          </div>
          <span class="delta-copy">${delta}</span>
        </div>
        ${sparkline(product.history)}
        <div class="card-actions">
          <button class="tiny-button" type="button" data-select="${product.id}">Forecast</button>
          <button class="tiny-button" type="button" data-check="${product.id}">Check now</button>
          <a class="tiny-button" href="${product.url}" target="_blank" rel="noreferrer">Open store</a>
          <button class="tiny-button danger" type="button" data-remove="${product.id}">Remove</button>
        </div>
      </div>
    </article>
  `;
}

function sparkline(values) {
  const width = 260;
  const height = 70;
  const points = linePoints(values, width, height, 8);
  const area = `${points} ${width - 8},${height - 8} 8,${height - 8}`;

  return `
    <svg class="sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <path class="area" d="M ${area} Z"></path>
      <polyline points="${points}"></polyline>
    </svg>
  `;
}

function linePoints(values, width, height, padding) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  return values.map((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = padding + ((max - value) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function renderForecast() {
  const product = products.find((item) => item.id === selectedId) || products[0];

  if (!product) {
    nodes.forecastTitle.textContent = "Forecast";
    nodes.forecastBadge.textContent = "Empty";
    nodes.buyScore.textContent = "0";
    nodes.scoreRing.style.setProperty("--score-angle", "0deg");
    nodes.forecastAction.textContent = "No products tracked";
    nodes.forecastReason.textContent = "Add a product to calculate a buy-time forecast.";
    nodes.detailChart.innerHTML = "";
    return;
  }

  selectedId = product.id;
  const stat = analyzeProduct(product);

  nodes.forecastTitle.textContent = product.name;
  nodes.forecastBadge.textContent = stat.badge;
  nodes.buyScore.textContent = stat.score;
  nodes.scoreRing.style.setProperty("--score-angle", `${stat.score * 3.6}deg`);
  nodes.forecastAction.textContent = stat.action;
  nodes.forecastReason.textContent = stat.reason;
  nodes.chartRange.textContent = `Last ${product.history.length} checks`;
  renderDetailChart(product, stat);
}

function renderDetailChart(product, stat) {
  const width = 360;
  const height = 180;
  const padding = 24;
  const allValues = [...product.history, product.targetPrice];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = Math.max(max - min, 1);
  const points = linePoints(product.history, width, height, padding);
  const targetY = padding + ((max - product.targetPrice) / range) * (height - padding * 2);
  const area = `${points} ${width - padding},${height - padding} ${padding},${height - padding}`;

  nodes.detailChart.innerHTML = `
    <line class="grid-line" x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}"></line>
    <line class="grid-line" x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}"></line>
    <line class="grid-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}"></line>
    <path class="history-area" d="M ${area} Z"></path>
    <polyline class="history-line" points="${points}"></polyline>
    <line class="target-line" x1="${padding}" y1="${targetY}" x2="${width - padding}" y2="${targetY}"></line>
    <circle cx="${width - padding}" cy="${padding + ((max - stat.current) / range) * (height - padding * 2)}" r="5" fill="#2457a6"></circle>
  `;
}

function renderAlerts() {
  if (!alerts.length) {
    nodes.alertList.innerHTML = `<div class="empty-state">No alerts yet.</div>`;
    return;
  }

  nodes.alertList.innerHTML = alerts
    .slice(0, 8)
    .map((alert) => `
      <article class="alert-item">
        <strong>${escapeHtml(alert.title)}</strong>
        <span>${escapeHtml(alert.body)} ${escapeHtml(alert.time)}.</span>
      </article>
    `)
    .join("");
}

async function refreshProduct(productId) {
  if (IS_EXTENSION) {
    const response = await sendRuntimeMessage({ type: "PRICEPULSE_RUN_CHECKS", productId });
    if (!response?.ok) {
      showToast(response?.error || "Price check failed");
      return;
    }

    await reloadState();
    selectedId = productId;
    renderAll();
    showToast(response.updated ? "Product price checked" : "No matching product found");
    return;
  }

  await simulateProductUpdate(productId);
  renderAll();
}

async function refreshPrices() {
  if (IS_EXTENSION) {
    const response = await sendRuntimeMessage({ type: "PRICEPULSE_RUN_CHECKS" });
    if (!response?.ok) {
      showToast(response?.error || "Price refresh failed");
      return;
    }

    await reloadState();
    renderAll();
    showToast(`Checked ${response.updated} products`);
    return;
  }

  await simulateAllUpdates();
}

async function reloadState() {
  const previousSelection = selectedId;
  const state = await loadState();
  products = state.products;
  alerts = state.alerts;
  selectedId = products.some((product) => product.id === previousSelection)
    ? previousSelection
    : products[0]?.id || null;
}

async function simulateProductUpdate(productId, options = {}) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const stat = analyzeProduct(product);
  const drift = stat.slope * 0.35;
  const seasonalDip = Math.random() > 0.68 ? -stat.current * randomBetween(0.015, 0.045) : 0;
  const noise = stat.current * randomBetween(-0.018, 0.018);
  const nextPrice = Math.max(199, Math.round((stat.current + drift + seasonalDip + noise) / 10) * 10);
  const wasAboveTarget = stat.current > product.targetPrice;

  product.history = [...product.history.slice(-17), nextPrice];
  const updated = analyzeProduct(product);

  if (wasAboveTarget && updated.current <= product.targetPrice) {
    createAlert(product, `Target crossed at ${formatCurrency(updated.current)}`, `${product.platform} is now at or below ${formatCurrency(product.targetPrice)}`);
  } else if (updated.current <= updated.min * 1.02) {
    createAlert(product, "Near recent low", `${product.platform} is within 2 percent of the local low`);
  }

  selectedId = product.id;
  await saveState();
  if (!options.silent) showToast(`${product.name} updated to ${formatCurrency(updated.current)}`);
}

async function simulateAllUpdates() {
  for (const product of products) {
    await simulateProductUpdate(product.id, { silent: true });
  }
  renderAll();
  showToast(`Checked ${products.length} products`);
}

function createAlert(product, title, body) {
  const alert = {
    id: crypto.randomUUID(),
    title: `${product.name}: ${title}`,
    body,
    time: "Now"
  };

  alerts = [alert, ...alerts].slice(0, 20);
  notify(alert.title, alert.body);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

async function handleAddProduct(event) {
  event.preventDefault();
  const form = new FormData(nodes.trackerForm);
  const url = form.get("productUrl").toString().trim();
  const platform = form.get("platform").toString();
  const targetPrice = Number(form.get("targetPrice"));
  const currentPrice = Number(form.get("currentPrice")) || Math.round(targetPrice * 1.14);
  const rawName = form.get("productName").toString().trim();
  const name = rawName || inferNameFromUrl(url, platform);
  const history = buildSyntheticHistory(currentPrice, targetPrice);

  const product = {
    id: crypto.randomUUID(),
    name,
    platform,
    url,
    targetPrice,
    history,
    tone: platform === "Amazon"
      ? "linear-gradient(135deg, #fff0cf, #0f766e)"
      : "linear-gradient(135deg, #e3edff, #e85d5a)"
  };

  products = [product, ...products];
  selectedId = product.id;
  nodes.trackerForm.reset();
  await saveState();
  renderAll();
  showToast(`${name} is now tracked`);
}

async function fillFromCurrentTab() {
  if (!IS_EXTENSION) {
    showToast("Open PricePulse as an extension to read the current tab");
    return;
  }

  const tab = await queryActiveTab();
  if (!tab?.id) {
    showToast("No active tab found");
    return;
  }

  let scraped = null;
  try {
    const response = await sendTabMessage(tab.id, { type: "PRICEPULSE_SCRAPE_PRODUCT" });
    scraped = response?.product || null;
  } catch {
    scraped = null;
  }

  const url = scraped?.url || tab.url || "";
  const platform = scraped?.platform || inferPlatformFromUrl(url);
  const name = scraped?.name || tab.title || "";
  const price = scraped?.price || "";

  nodes.productUrl.value = url;
  nodes.platform.value = platform;
  nodes.productName.value = name;
  nodes.currentPrice.value = price;
  if (price && !nodes.targetPrice.value) {
    nodes.targetPrice.value = Math.round(price * 0.92 / 50) * 50;
  }

  showToast(price ? "Current product loaded" : "Current tab loaded");
}

function buildSyntheticHistory(currentPrice, targetPrice) {
  const start = Math.max(currentPrice * randomBetween(1.08, 1.22), targetPrice * 1.08);
  const values = Array.from({ length: 13 }, (_, index) => {
    const progress = index / 12;
    const base = start + (currentPrice - start) * progress;
    const wave = Math.sin(index * 1.7) * currentPrice * 0.012;
    const noise = currentPrice * randomBetween(-0.018, 0.018);
    return Math.max(199, Math.round((base + wave + noise) / 10) * 10);
  });

  return [...values, currentPrice];
}

function inferNameFromUrl(url, platform) {
  try {
    const { pathname } = new URL(url);
    const slug = pathname.split("/").filter(Boolean)[0] || `${platform} product`;
    return slug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .slice(0, 60);
  } catch {
    return `${platform} product`;
  }
}

function inferPlatformFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    if (host.includes("flipkart")) return "Flipkart";
    return "Amazon";
  } catch {
    return "Amazon";
  }
}

function notify(title, body) {
  if (IS_EXTENSION) {
    sendRuntimeMessage({ type: "PRICEPULSE_NOTIFY", title, body }).catch(() => {});
    return;
  }

  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, { body });
}

function showToast(message) {
  clearTimeout(toastTimer);
  nodes.toast.textContent = message;
  nodes.toast.classList.add("visible");
  toastTimer = setTimeout(() => nodes.toast.classList.remove("visible"), 2800);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

function renderAll() {
  renderMetrics();
  renderProducts();
  renderForecast();
  renderAlerts();
}

function bindEvents() {
  nodes.trackerForm.addEventListener("submit", handleAddProduct);
  nodes.refreshButton.addEventListener("click", refreshPrices);
  nodes.currentTabButton?.addEventListener("click", fillFromCurrentTab);
  nodes.clearAlertsButton.addEventListener("click", async () => {
    alerts = [];
    await saveState();
    renderAlerts();
    showToast("Alerts cleared");
  });
  nodes.notifyButton.addEventListener("click", async () => {
    if (IS_EXTENSION) {
      notify("PricePulse alerts are active", "You will be notified when a tracked product crosses target.");
      showToast("Alerts active");
      return;
    }

    if (!("Notification" in window)) {
      showToast("Browser notifications are unavailable");
      return;
    }

    const permission = await Notification.requestPermission();
    showToast(permission === "granted" ? "Alerts enabled" : "Alerts remain off");
  });
  nodes.searchInput.addEventListener("input", renderProducts);
  nodes.platformFilter.addEventListener("change", renderProducts);
  nodes.sortSelect.addEventListener("change", renderProducts);
}

initialize().catch((error) => {
  console.error(error);
  showToast("PricePulse could not start");
});

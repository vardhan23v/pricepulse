(() => {
  const PRICEPULSE_MESSAGE = "PRICEPULSE_SCRAPE_PRODUCT";

  function detectPlatform(url = location.href) {
    const host = new URL(url).hostname;
    if (host.includes("flipkart")) return "Flipkart";
    if (host.includes("amazon")) return "Amazon";
    return "Amazon";
  }

  function textFromSelectors(selectors) {
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent?.replace(/\s+/g, " ").trim();
        if (text) return text;
      }
    }
    return "";
  }

  function parsePrice(rawText) {
    if (!rawText) return null;
    const clean = rawText
      .replace(/[^\d.,]/g, "")
      .replace(/,/g, "")
      .trim();
    const value = Number.parseFloat(clean);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }

  function scrapeProduct() {
    const platform = detectPlatform();
    const isFlipkart = platform === "Flipkart";
    const title = textFromSelectors(isFlipkart
      ? ["span.B_NuCI", ".VU-ZEz", "h1 span", "h1"]
      : ["#productTitle", "#title span", "h1 span", "h1"]);
    const priceText = textFromSelectors(isFlipkart
      ? [".Nx9bqj", "._30jeq3._16Jk6d", "._30jeq3", "._25b18c ._16Jk6d", ".CxhGGd"]
      : [".apexPriceToPay .a-offscreen", "#corePriceDisplay_desktop_feature_div .a-offscreen", ".a-price .a-offscreen", "#priceblock_ourprice", "#priceblock_dealprice"]);
    const price = parsePrice(priceText);

    return {
      name: title || document.title.replace(/\s*[-|].*$/, "").trim(),
      platform,
      price,
      url: location.href
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== PRICEPULSE_MESSAGE) return false;

    const product = scrapeProduct();
    sendResponse({
      ok: Boolean(product.name || product.price),
      product
    });
    return true;
  });
})();

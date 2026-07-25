<div align="center">

# 📈 PricePulse

**A smart product price tracker and forecast assistant.**  
Monitors Amazon and Flipkart prices, alerts you on target drops, and uses heuristic forecasting to advise whether to buy now or wait.

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)

</div>

<hr />

## 🌟 Overview

**PricePulse** is a robust static prototype for a product price tracker, built initially as a Chrome extension. It tracks watched products across major e-commerce platforms (Amazon and Flipkart), simulates real-time price refreshes, triggers target-price alerts, and employs a local heuristic model to estimate the optimal buying window (Buy Now, Watch Closely, or Wait).

## ✨ Key Features

- **Multi-Platform Watchlist:** Track products seamlessly with built-in filters for Amazon and Flipkart.
- **Target Price Alerts:** Set target prices and receive local alerts (with browser notification opt-in) when the price drops below your threshold.
- **Intelligent Forecasting:** A built-in heuristic model that analyzes recent trends, price volatility, historical percentiles, and target distance to recommend buying strategies.
- **Local Persistence:** Securely stores all your watchlist data and alert history locally using browser `localStorage`.
- **Demo Simulator:** Includes a built-in price refresh simulator to demonstrate functionality without live scraping.

## 🛠️ Technology Stack

- **Extension Framework:** Chrome Extensions API (Manifest V3 compatible)
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Storage:** Local Storage API

## 🚦 Getting Started

Since PricePulse is a static prototype, you can run the dashboard standalone or load it as an unpacked extension.

### Running the Dashboard Locally

Simply open the `index.html` file in your browser to view the standalone dashboard. No installation is required.

### Loading as a Chrome Extension

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vardhan23v/pricepulse.git
   cd pricepulse
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select the `pricepulse` directory.
5. The extension icon will now appear in your browser toolbar!

## 🚀 Roadmap for Production

- [ ] **Backend Worker:** Implement secure price checks through approved APIs or compliant scraping methods.
- [ ] **Cloud Database:** Migrate from `localStorage` to a hosted database (e.g., PostgreSQL or MongoDB) for cross-device syncing.
- [ ] **Machine Learning Integration:** Replace the heuristic forecast with a trained ML model for higher accuracy once sufficient historical data is collected.
- [ ] **Omnichannel Notifications:** Add support for Email, WhatsApp, or Push notifications.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/vardhan23v">Sree Vardhan V</a></sub>
</div>

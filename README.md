# PricePulse

PricePulse is a static prototype for a product price tracker for Amazon and Flipkart. It tracks watched products, simulates price refreshes, raises target-price alerts, and uses a local heuristic model to estimate whether the best move is to buy now, watch closely, or wait.

Open `index.html` in a browser to run it. No install step is required.

## What is included

- Product watchlist with Amazon and Flipkart filters
- Target price tracking and local alert history
- Browser notification opt-in
- Price refresh simulator for demo data
- Buy-time forecast using recent trend, volatility, price percentile, target distance, and confidence
- Local persistence with `localStorage`

## Next production steps

- Add a backend worker for price checks through approved APIs or compliant scraping
- Store price history in a database instead of `localStorage`
- Replace the heuristic forecast with a trained model once enough product history is available
- Add email, WhatsApp, or push notification channels

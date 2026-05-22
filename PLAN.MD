# My Dashboard - Project Brief

## What is this?
A single-page analytics dashboard showing monthly logistics metrics. Think Shopify admin or a simple Google Analytics view.

## Company Background
FastForward Logistics is a mid-size freight and supply chain company. Their logo has a lightning bolt on the left.
Use a simple SVG placeholder logo with a lightning bolt mark in the app bar.

## Data 
Generate a fake dataset as a JSON file (src/data/metrics.json)
12 months of data (Jan-Dec 2025), each month containing:
- cost per shipment, average transit time, order-to-delivery time
- shipment volume (total shipments)
- on-time delivery rates (percentage)
- regional performance for each state of the United States (show average transportation time with a choropleth-style regional map, high = dark, low = light)
- open exceptions (Late shipments, damaged packages, customs holds)

## Layout (Vuetify)
- v-app-bar at the top with the dashboard title (FastForward Logistics), a simple SVG lightning-bolt logo on the left, and a month picker
- The month picker should default to showing ALL months
- When a specific month is selected, all cards and charts filter to that month. When "All" is selected, show the full year.
- Below the app bar: a row of 3 summary cards (v-card) showing the key metrics - cost per shipment, average transit time, order-to-delivery time
- Below the cards: a row of 2 charts
    - Left: Bar chart showing average shipment volume (For individual months, show the single volume metric with a smaller month-to-month delta; style like the summary cards)
    - Right: Line chart showing on-time delivery rates (for all, show a line chart of the last 12 months. For individual months, show a single percentage with a smaller month-to-month delta; style like the summary cards)
- Below , a row of 2 charts: 
    - left: one choropleth-style regional map of the US based on average transportation time, with hover states over each state showing its name and metric
- Right: 
    - Top: Donut chart with percentage breakdown of exceptions
    - Bottom: one table for open exceptions with three columns:
        - Exception type
        - Target
        - Amount
        - Use color coding for high amounts relative to a target
- Use v-container, v-row, v-col for responsive grid layout

## Interactions
- Month picker in the app bar filters EVERYTHING. Summary cards show that month's numbers, charts highlight or filter to that month
- When "All" is selected, summary cards show yearly totals/averages and charts show all 12 months
- Cards should show a small up/down arrow or color indicating change from previous month
- For single-month on-time delivery view, delta is month-to-month (compared to prior month)
- Map behavior:
    - All months: show annual average transportation time per region
    - Single month: show selected month's transportation time per region

## Aggregations
When "All" is selected, use these aggregation rules:
- cost per shipment: weighted average by shipment volume
- average transit time: weighted average by shipment volume
- order-to-delivery time: weighted average by shipment volume

## Style
- dark theme by default (Vuetify dark theme)
- Clean, minimal, lots of whitespace
- Charts should use a cohesive color palette - not rainbow
- transit and order-to-delivery values are shown in days with 1 decimal place

## Tech
- Vue 3 + Typescript + Vuetify 3
- Chart.js via vue-chartjs for charts, D3.js for the choropleth-style 4-region US map
- Fake data from a local JSON file (no API calls)
- Single page - no routing needed for this app
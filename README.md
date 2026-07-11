# BigQuery Release Notes Navigator 🚀

A modern, responsive, and glassmorphic web application built using **Python Flask** (backend) and **plain vanilla HTML, CSS, and JavaScript** (frontend). 

This application fetches Google Cloud's official BigQuery release notes XML feed, parses the Atom entries into individual updates, and organizes them in a stunning, interactive dashboard. It includes full-text search, category filtering, multi-card selection, and a custom-designed Twitter/X composer tool.

---

## ✨ Features

- **Dynamic Feed Parser**: Fetches and parses the official BigQuery Release Notes feed. It intelligently splits daily release summaries (grouped under `<h3>` headers in the feed) into individual cards.
- **Rich Dark Theme & Glassmorphism**: High-end UI design with ambient glowing neon backgrounds, frosted glass panels, and smooth hover animations.
- **Real-Time Search & Category Filters**: Search updates by text or filter by categories like **Features**, **Changes**, **Resolved**, **Deprecations**, and **General**.
- **Interactive Tweet Builder**: 
  - Select one or multiple cards to build summary tweets.
  - Choose from **Standard**, **Bullet Summary**, or **Hype** templates.
  - Smart truncation keeps your tweets under X's **280 character limit** while preserving links.
  - Live character progress ring tracker and Twitter post preview card.
- **Refresh Control**: Manual refresh button with a loading spinner that fetches the latest notes on demand.

---

## 🛠️ Technology Stack

- **Backend**: Python 3, Flask, BeautifulSoup4, requests, lxml
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (Inter & Outfit Google Fonts, FontAwesome icons)

---

## 🚀 Getting Started

### 1. Install Dependencies
Ensure you have Python installed, then install the required libraries:
```bash
pip install Flask beautifulsoup4 requests lxml
```

### 2. Run the Application
Start the Flask development server:
```bash
python app.py
```

### 3. Open the Dashboard
Navigate to the following address in your browser:
[http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 📂 Project Structure

```
├── app.py              # Flask server and XML parser logic
├── README.md           # Project documentation and guide
├── .gitignore          # Git exclusion rules
├── templates/
│   └── index.html      # Frontend HTML template
└── static/
    ├── css/
    │   └── style.css   # Main stylesheet (Glassmorphic design system)
    └── js/
        └── app.js      # Client-side state, filtering, search, and tweet composer logic
```

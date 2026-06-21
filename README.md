# BigQuery Release Notes Hub 🚀

A sleek, modern, glassmorphic dashboard built using **Python Flask** and **Vanilla Frontend Technologies (HTML5, CSS3, JavaScript)**. This application pulls, parses, and formats the official Google Cloud BigQuery Release Notes Atom Feed, giving users a clean workspace to review updates and compose tweets about them.

---

## 🎨 Preview & Design System
- **Theme**: Dark Mode by default with radial glowing background meshes.
- **Aesthetic**: Glassmorphic panels featuring custom blur filters (`backdrop-filter`) and thin borders.
- **Categorization**: Visual color-coded cards and badges grouping updates by type:
  - 🟢 **Feature**: Emerald
  - 🟣 **Announcement**: Purple/Violet
  - 🟡 **Issue**: Amber/Orange
  - 🔴 **Deprecated**: Rose
  - 🔵 **General**: Cyan

---

## ⚙️ Key Features
- **Granular Update Parsing**: Splits bulk daily Atom entries (which often contain multiple distinct releases) into single standalone release note cards based on headers.
- **Live Search & Filter**: Instant search filtering across titles, descriptions, and categories.
- **Performance Caching**: Backend in-memory cache with a 5-minute TTL (Time To Live). Manual refresh requests bypass cache to retrieve live updates from Google Cloud servers.
- **Interactive X/Twitter Share Modal**: A custom-designed X/Twitter composer popup matching the app's style. Includes character length checks, auto-truncates paragraphs, appends specific links/hashtags, and redirects to X Web Intents for seamless sharing.

---

## 📁 Repository Structure
```text
bigquery-release-tracker/
│
├── app.py                 # Flask server, Atom XML parser, and caching logic
├── .gitignore             # Git exclusion rules
├── README.md              # Project documentation
│
├── templates/
│   └── index.html         # Application layout and Tweet composer template
│
└── static/
    ├── css/
    │   └── style.css      # Core styles, variables, grids, and glassmorphic designs
    └── js/
        └── app.js         # Client controller, search index, filter state, and API requests
```

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.7 or higher installed.
- Pip installed.

### Setup Steps
1. **Clone or download** this repository.
2. **Navigate to the directory**:
   ```bash
   cd bigquery-release-tracker
   ```
3. **Install Dependencies**:
   Ensure Flask and Requests are installed.
   ```bash
   pip install flask requests
   ```
4. **Run the Server**:
   ```bash
   python app.py
   ```
5. **Open in Browser**:
   Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

---

## 🔌 API Documentation

### Get Releases
Fetches parsed release notes from cache or live feed.
- **URL**: `/api/releases`
- **Method**: `GET`
- **Parameters**:
  - `refresh=true` *(optional)*: Bypasses backend cache and forces a live network fetch from the GCP XML Feed.
- **Response Format**: `JSON`
  ```json
  {
    "status": "success",
    "last_fetched": 1782084920.0,
    "releases": [
      {
        "id": "june-17-2026-feature-1",
        "date": "June 17, 2026",
        "updated": "2026-06-17T00:00:00-07:00",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026",
        "type": "Feature",
        "content_html": "<h3>Feature</h3><p>You can enable autonomous embedding generation...",
        "plain_text": "You can enable autonomous embedding generation..."
      }
    ]
  }
  ```

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.

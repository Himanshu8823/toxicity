# 🔬 ToxiScan — YouTube Comment Toxicity Analyzer

Paste a YouTube link and get an instant AI-powered toxicity analysis of comments using the **cointegrated/rubert-tiny-toxicity** HuggingFace model.

---

## 🗂 Project Structure

```
youtube-toxicity/
├── backend/         # Node.js + Express API
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/        # React app
    ├── src/
    │   ├── App.js
    │   ├── pages/LandingPage.js
    │   ├── pages/ResultsPage.js
    │   └── index.js
    └── package.json
```

---

## ⚙️ Setup

### 1. Get API Keys

**Hugging Face Token:**
1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a new token (Read access is enough)

**YouTube Data API v3 Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **YouTube Data API v3**
3. Create credentials → API Key

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```
HF_TOKEN=hf_your_huggingface_token
YOUTUBE_API_KEY=your_google_api_key
PORT=5000
```

Start the server:
```bash
npm start
# or for development:
npm run dev
```

Server runs at: `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

App runs at: `http://localhost:3000`

> The `"proxy": "http://localhost:5000"` in `frontend/package.json` routes API calls automatically.

---

## 🚀 Usage

1. Open `http://localhost:3000`
2. Paste any YouTube URL (watch, shorts, youtu.be)
3. Choose how many comments to analyze (10–200)
4. Click **Analyze Now**
5. View:
   - **Overview** — KPIs, category breakdown, most toxic comments
   - **Charts** — Pie chart, radial gauge, bar charts
   - **Comments** — All comments with toxicity labels + filter/search

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze-video` | Main endpoint — fetches YouTube comments and analyzes toxicity |
| POST | `/analyze-toxicity` | Single text analysis |
| POST | `/analyze-toxicity-batch` | Batch text analysis |

### Example: `/analyze-video`
```json
// Request
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "maxComments": 50
}

// Response
{
  "videoInfo": { "title": "...", "channelName": "...", ... },
  "analysis": {
    "totalAnalyzed": 50,
    "overallToxicityScore": "24.0",
    "toxicCount": 12,
    "nonToxicCount": 38,
    "labelStats": [...],
    "mostToxicComments": [...],
    "allResults": [...]
  }
}
```

---

## 🧠 Model

**Model:** `cointegrated/rubert-tiny-toxicity`  
**Source:** HuggingFace  
**Labels:** `non_toxic`, `toxic`, `insult`, `threat`, `obscene`, `identity_hate`, `severe_toxic`

---

## 🛠 Tech Stack

- **Frontend:** React 18, Recharts, Framer Motion, Axios
- **Backend:** Node.js, Express, dotenv, cors
- **AI:** HuggingFace Inference API
- **Data:** YouTube Data API v3

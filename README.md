# DataStory — Dataset to Publishable Data Story Agent

> Drop a CSV. The agent finds patterns, runs statistical tests, generates charts, and writes a publishable data story in minutes.

**DataStory** is an autonomous data science agent powered by [GLM 5.1](https://z.ai). Upload any CSV dataset and watch as the agent:

1. **Profiles** your data — column types, distributions, outliers, missing values
2. **Generates hypotheses** — testable statistical questions about your data
3. **Tests each hypothesis** — chi-squared, t-tests, correlations with real p-values
4. **Digs deeper autonomously** — picks the most surprising finding and investigates further
5. **Writes a publishable data story** — complete with title, executive summary, charts, methodology, and recommendations

## Live Demo

🔗 **[Try DataStory](https://datastory-demo.vercel.app)** (placeholder URL)

## Screenshots

<!-- Add screenshots after first deploy -->

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| Agent LLM | GLM 5.1 via Z.ai API |
| Data Analysis | pandas, scipy, numpy |
| Visualization | matplotlib, seaborn |
| Communication | Server-Sent Events (SSE) |
| Deployment | Vercel (frontend) + Railway (backend) |

## How It Works

```
CSV Upload → Data Profiling → Hypothesis Generation (GLM 5.1)
    → Statistical Testing (scipy) → Chart Generation (matplotlib)
    → Autonomous Deep Dive (GLM 5.1) → Data Story Writing (GLM 5.1)
```

The agent uses GLM 5.1 at four critical points:
- **Hypothesis generation**: Analyzes the data profile and proposes testable statistical hypotheses
- **Test code generation**: Writes Python code for each statistical test
- **Deep dive decision**: Autonomously selects the most interesting finding to investigate further
- **Narrative writing**: Composes a complete, publishable data story incorporating all findings

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.12+
- Z.ai API key (set as `ZAI_API_KEY`)

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
ZAI_API_KEY=your_key uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

### Demo
Open http://localhost:3000, click "Try with demo data" or upload any CSV.

## Built With

- [GLM 5.1](https://z.ai) — Agent-first LLM for long-horizon reasoning
- [Next.js](https://nextjs.org) — React framework
- [FastAPI](https://fastapi.tiangolo.com) — Python web framework
- [pandas](https://pandas.pydata.org) + [scipy](https://scipy.org) — Data analysis
- [matplotlib](https://matplotlib.org) — Publication-quality charts

## Built for

[Build with GLM 5.1 Challenge by Z.AI](https://build-with-glm-5-1-challenge.devpost.com/) #buildwithglm

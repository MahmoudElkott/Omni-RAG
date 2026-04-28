# Omni-RAG: The AI-Powered Learning Hub & Orchestrator

Omni-RAG is a high-performance, full-stack Retrieval-Augmented Generation (RAG) system designed to transform documents into interactive learning experiences. It combines a sleek Next.js 15 interface with a robust FastAPI backend to provide intelligent chat, automated MCQ generation, and dynamic flashcard decks powered by both local and cloud-based LLMs.

---

## 🚀 Features

- **Multi-Provider LLM Orchestration** 🤖: Seamlessly switch between local models (Ollama, LM Studio) and cloud APIs (Gemini 2.0 Flash, OpenAI GPT-4o) using LiteLLM.
- **Intelligent Document Ingestion** 📄: Upload PDF, TXT, and DOCX files or provide URLs to automatically chunk and index content into a vector database.
- **Slash Commands for Learning** ⚡: Use `/mcq` to generate interactive quizzes or `/flash` to create study decks directly from your source material.
- **Interactive Study Tools** 🎓: Engages users with Framer Motion-powered flashcards and scored multiple-choice questions.
- **Vector Search Context** 🔍: Powered by ChromaDB and LangChain to ensure responses are grounded in your specific documents.
- **Streaming Chat Interface** 💬: Real-time, low-latency AI responses with a modern, responsive UI.

---

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Components**: Shadcn UI & Base UI
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Styling**: Tailwind CSS 4

### Backend
- **API Framework**: FastAPI
- **LLM Routing**: LiteLLM (Supports 100+ providers)
- **Orchestration**: LangChain
- **Vector Database**: ChromaDB
- **Data Extraction**: Playwright & BeautifulSoup4

### Infrastructure
- **Language**: Python 3.10+, TypeScript 5
- **Runtime**: Node.js 18+

---

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/Mostafa1712002/Q-A.git
cd Q-A
```

### 2. Backend Configuration
Create a virtual environment and install dependencies:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

### 3. Frontend Configuration
Install Node modules:
```bash
cd ../frontend
npm install
```

### 4. Environment Variables
Configure your keys and local endpoints.

**Backend (`backend/.env`):**
```env
# Cloud Providers
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key

# Local Providers
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_API_KEY=not-needed
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📖 Usage

1. **Start the Backend**:
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```
2. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
3. **Open the App**: Navigate to `http://localhost:3000`.
4. **Ingest Content**: Use the sidebar to upload documents or paste URLs.
5. **Study**:
   - Chat normally to ask questions about your data.
   - Type `/mcq <topic>` to generate a quiz.
   - Type `/flash <topic>` to generate flashcards.

---

## 📂 File Structure

```text
Q-A/
├── backend/
│   ├── src/
│   │   ├── core/           # LLM Managers, Ingestion Engine, Vector Store
│   │   └── api/            # FastAPI Routes & SSE logic
│   ├── main.py             # Server entry point
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── app/                # Next.js App Router (Layouts & Pages)
│   ├── components/         # Chat, Sidebar, MCQ, and Flashcard UI
│   ├── lib/                # Zustand stores & API fetchers
│   └── package.json        # Node dependencies
└── README.md
```

---

## 🔧 Configuration & Advanced Settings

### Provider Modes
The system is optimized for two primary workflows:
- **Privacy Mode**: Prioritizes local execution via Ollama (port 11434) and LM Studio (port 1234). Ideal for sensitive documents.
- **Power Mode**: Utilizes high-reasoning cloud models like Gemini 1.5 Pro or GPT-4o for complex analysis.

### Model Parameters
Parameters like `temperature`, `max_tokens`, and `top_p` can be adjusted in `backend/src/core/provider_manager.py` to fine-tune model behavior for creative vs. factual tasks.

---

## 📄 License & Acknowledgments

This project is licensed under the **MIT License**.

- **Credits**: Built with [FastAPI](https://fastapi.tiangolo.com/), [Next.js](https://nextjs.org/), and [LiteLLM](https://litellm.ai/). Special thanks to the open-source contributors of LangChain and ChromaDB.

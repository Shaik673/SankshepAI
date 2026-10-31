# SankshepAI Architecture & Microservice Specification

## 1. System Overview

SankshepAI is built as a three-tier system:

```
┌────────────────────────────────────────────────────────┐
│                   Web Client Tier                      │
│             React 18 + Vite + Tailwind CSS             │
│                (Runs on port 5173)                     │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON / Cookies / Bearer
                           ▼
┌────────────────────────────────────────────────────────┐
│                API Gateway & Backend Tier              │
│                Node.js + Express + Mongoose            │
│                (Runs on port 5001)                     │
├──────────────────────────┬─────────────────────────────┤
│   - Session & JWT Auth   │   - Document Storage & Text │
│   - Brevo Email OTP      │   - 3-Step Guided Onboard   │
│   - Mongoose 12 Models   │   - In-Memory Mongo Fallback│
└──────────────┬───────────┴───────────────┬─────────────┘
               │                           │
               │ Mongoose Protocol         │ Internal HTTP / JSON
               ▼                           ▼
┌────────────────────────┐   ┌───────────────────────────┐
│     Database Tier      │   │     AI & NLP Engine       │
│  MongoDB or Embedded   │   │     Python + FastAPI      │
│ mongodb-memory-server  │   │    (Runs on port 8000)    │
└────────────────────────┘   ├───────────────────────────┤
                             │ - TextRank PageRank Graph │
                             │ - PyTorch BiGRU + Attn    │
                             │ - Beam Search Decoder     │
                             │ - Exact ROUGE Evaluation  │
                             │ - Grounded Q&A & Entities │
                             │ - Gemini Fallback Orch    │
                             └───────────────────────────┘
```

---

## 2. Data Persistence Model (12 Mongoose Collections)

1. **`User`**: Account identity, email verification status, salted bcrypt password hash, timestamps.
2. **`UserProfile`**: Display name, avatar URL, academic/industry affiliation, preferred language.
3. **`OnboardingProgress`**: Step state (1: Identity, 2: Preferences, 3: Discovery), completion flag.
4. **`EmailVerification`**: 6-digit numeric OTP hashed with bcrypt, expiry timestamp, attempt counter.
5. **`PasswordResetToken`**: Cryptographic random token for secure password recovery.
6. **`Document`**: Stored text, file metadata (PDF, DOCX, TXT), extracted word count, SHA-256 fingerprint.
7. **`Summary`**: Generated summary text, method used (`textrank_baseline`, `custom_seq2seq_attention`, `gemini_api_fallback`), compression ratio, processing time, evaluation metrics.
8. **`SummaryVersion`**: Version history tree enabling diff comparisons and rollback.
9. **`Collection`**: User-defined project folders and categories with color badges.
10. **`ModelExperiment`**: Hyperparameter benchmarks (beam width, length penalties, ROUGE scores).
11. **`ActivityHistory`**: Audit trail of logins, document uploads, summary generation, exports.
12. **`UserSettings`**: Default summary styles, length configurations, Gemini fallback consent toggle.

---

## 3. Microservice Resilience & Zero-Config Operation

- **MongoDB Fallback**: The backend first attempts connection to `MONGODB_URI` (default `mongodb://127.0.0.1:27017/sankshepai`). If connection fails due to `ECONNREFUSED`, it starts an embedded instance via `mongodb-memory-server` without developer intervention.
- **AI Service Circuit Breaker**: If the Python FastAPI service is unreachable during a summary request, the backend automatically reports a clean diagnostic message or switches to the Gemini fallback orchestrator if consented.
- **Email Service Fallback**: When Brevo SMTP credentials are not set, OTP codes are logged directly to the server terminal with clear visual demarcation (`[DEV OTP LOG]`).

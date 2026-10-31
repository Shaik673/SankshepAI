# SankshepAI API Reference Catalog

## 1. AI Microservice Endpoints (FastAPI — Port 8000)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health status and engine metadata |
| `POST` | `/api/summarize/textrank` | Extractive summarization via TF-IDF PageRank |
| `POST` | `/api/summarize/custom-seq2seq` | Abstractive summarization via BiGRU Attention model |
| `POST` | `/api/summarize/gemini` | Grounded Gemini fallback summarization |
| `POST` | `/api/evaluate/rouge` | Exact ROUGE-1, ROUGE-2, ROUGE-L calculation |
| `POST` | `/api/preprocess` | Text normalization, sentence segmentation, word count |
| `POST` | `/api/qa` | Source-grounded document question answering |
| `POST` | `/api/extract-entities` | High-precision regex entity extraction |
| `GET` | `/api/model/status` | Model weights, PyTorch device, checkpoint info |
| `POST` | `/api/model/beam-search-demo` | Interactive step-by-step beam search tree generator |
| `GET` | `/api/experiments` | List academic benchmark experiments |
| `POST` | `/api/experiments` | Create new benchmark run |
| `POST` | `/api/training/start` | Launch PyTorch training loop |
| `GET` | `/api/training/status` | Current training epoch, loss, and convergence status |

---

## 2. Backend Gateway Endpoints (Express — Port 5001)

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Public | Register with email/password and dispatch OTP |
| `POST` | `/api/auth/login` | Public | Authenticate user, set cookie & return JWT |
| `POST` | `/api/auth/verify-email` | Public | Validate 6-digit OTP code |
| `POST` | `/api/auth/resend-otp` | Public | Resend OTP code with rate limiting |
| `POST` | `/api/auth/forgot-password` | Public | Request password reset token |
| `POST` | `/api/auth/reset-password` | Public | Apply new password using reset token |
| `GET` | `/api/auth/me` | Auth | Current user profile and session data |
| `POST` | `/api/auth/logout` | Auth | Invalidate session and clear cookie |
| `POST` | `/api/auth/change-password` | Auth | Update password for authenticated user |

### Onboarding (`/api/onboarding`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/onboarding/progress` | Auth | Retrieve current onboarding step state |
| `PUT` | `/api/onboarding/step/:step` | Auth | Save progress for step 1, 2, or 3 |
| `POST` | `/api/onboarding/complete` | Auth | Mark onboarding complete and sync settings |

### Documents (`/api/documents`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/documents/upload` | Auth + Verified | Upload and parse PDF, DOCX, TXT files |
| `POST` | `/api/documents/paste` | Auth + Verified | Save pasted raw text |
| `POST` | `/api/documents/scrape-url` | Auth + Verified | Extract text from SSRF-safe web URL |
| `GET` | `/api/documents` | Auth + Verified | List user documents with pagination & search |
| `GET` | `/api/documents/:id` | Auth + Verified | Get document details and extracted content |
| `DELETE` | `/api/documents/:id` | Auth + Verified | Remove document from library |

### Summaries (`/api/summaries`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/summaries/generate` | Auth + Verified | Dispatch summarization job to AI service |
| `GET` | `/api/summaries` | Auth + Verified | List generated summaries with filters |
| `GET` | `/api/summaries/:id` | Auth + Verified | Get full summary with version metadata |
| `PUT` | `/api/summaries/:id` | Auth + Verified | Edit summary content and spawn new version |
| `DELETE` | `/api/summaries/:id` | Auth + Verified | Delete summary record |
| `GET` | `/api/summaries/:id/versions` | Auth + Verified | Retrieve all historical revisions |
| `GET` | `/api/summaries/:id/export` | Auth + Verified | Export summary formatted as .TXT, .MD, or .JSON |

### Collections & Analytics (`/api/collections`, `/api/analytics`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/collections` | Auth + Verified | List user project folders |
| `POST` | `/api/collections` | Auth + Verified | Create new collection |
| `GET` | `/api/analytics/dashboard` | Auth + Verified | Summary statistics, word counts, compression |
| `GET` | `/api/analytics/activity` | Auth + Verified | User audit trail logs |

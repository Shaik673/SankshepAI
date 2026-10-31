import re
from typing import List, Dict, Any, Optional
from .nlp_pipeline import NLPPipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class QAService:
    """
    Source-grounded Document Question Answering & Entity Extraction.
    Ensures that Q&A does not hallucinate beyond the uploaded document text.
    """

    @staticmethod
    def answer_question(document_text: str, question: str) -> Dict[str, Any]:
        """
        Extract direct answers from the source text for user queries.
        If the question cannot be answered from the text, honestly state so.
        """
        sentences = NLPPipeline.segment_sentences(document_text)
        if not sentences:
            return {
                "answer": "The document contains no readable text to answer questions.",
                "confidence": 0.0,
                "found": False,
                "supporting_sentences": []
            }

        # Vectorize sentences + question
        corpus = sentences + [question]
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf = vectorizer.fit_transform(corpus)
            doc_vecs = tfidf[:-1]
            q_vec = tfidf[-1]

            sims = cosine_similarity(q_vec, doc_vecs)[0]
        except Exception:
            return {
                "answer": "Unable to compute textual similarity for this question.",
                "confidence": 0.0,
                "found": False,
                "supporting_sentences": []
            }

        best_idx = int(sims.argmax())
        best_score = float(sims[best_idx])

        # Confidence threshold: if similarity is too low, state that it's absent
        if best_score < 0.12:
            return {
                "answer": "The document does not contain sufficient information to answer this question.",
                "confidence": round(best_score, 3),
                "found": False,
                "supporting_sentences": []
            }

        # Select top supporting sentences (up to 2)
        ranked = sims.argsort()[::-1]
        top_indices = [idx for idx in ranked[:2] if sims[idx] >= 0.10]
        top_sentences = [sentences[i] for i in sorted(top_indices)]

        return {
            "answer": " ".join(top_sentences),
            "confidence": round(best_score, 3),
            "found": True,
            "supporting_sentences": top_sentences
        }

    @staticmethod
    def extract_entities(text: str) -> Dict[str, List[str]]:
        """
        Extract dates, monetary amounts, circular numbers, and organizations
        using high-precision regular expressions and linguistic heuristics.
        """
        cleaned = NLPPipeline.clean_text(text)

        # Dates: e.g. 19/10/2026, 19-10-2026, 19th October 2026, October 19, 2026
        date_patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
            r'\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b',
            r'\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))\s+\d{4}\b',
        ]
        dates = []
        for pat in date_patterns:
            dates.extend(re.findall(pat, cleaned, re.IGNORECASE))

        # Monetary and statistical figures: e.g. Rs. 50,000, $1.2 billion, 45%, 10,000 crore
        figure_patterns = [
            r'(?:Rs\.?|INR|\$|€|£)\s*[\d,]+(?:\.\d+)?(?:\s*(?:crore|lakh|million|billion|trillion))?',
            r'\b\d+(?:\.\d+)?%',
            r'\b[\d,]+(?:\.\d+)?\s*(?:crore|lakh|million|billion|trillion)\b',
        ]
        figures = []
        for pat in figure_patterns:
            figures.extend(re.findall(pat, cleaned, re.IGNORECASE))

        # Circulars, acts, and statutory references: e.g. Circular No. 12/2026, Notification F.No., Section 138
        circular_patterns = [
            r'\b(?:Circular(?:\s+No\.?)?|Notification(?:\s+No\.?)?|Order|F\.\s*No\.?|Ref\.\s*No\.?)\s*[:#\s]*[A-Za-z0-9\/-]+',
            r'\bSection\s+\d+[A-Za-z]?(?:\(\d+\))?',
            r'\bAct,?\s+\d{4}\b',
        ]
        statutory = []
        for pat in circular_patterns:
            statutory.extend(re.findall(pat, cleaned, re.IGNORECASE))

        # Organizations / Proper entities (capitalized multi-word phrases)
        org_pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b'
        org_candidates = re.findall(org_pattern, cleaned)
        # Filter out common sentence starters
        common_starters = {"The", "This", "That", "In", "On", "At", "According", "Furthermore", "However", "Therefore"}
        filtered_orgs = [
            c for c in org_candidates
            if not any(c.startswith(cs + " ") for cs in common_starters)
            and len(c.split()) > 1
        ]

        return {
            "dates": list(dict.fromkeys(dates))[:15],
            "figures_and_amounts": list(dict.fromkeys(figures))[:15],
            "circulars_and_statutory": list(dict.fromkeys(statutory))[:15],
            "organizations_and_terms": list(dict.fromkeys(filtered_orgs))[:15],
        }

    @staticmethod
    def extract_key_points(text: str, max_points: int = 4) -> List[str]:
        """
        Extract key takeaways using sentence salience.
        """
        from .textrank import TextRankSummarizer
        tr = TextRankSummarizer()
        res = tr.summarize(text, max_sentences=max_points)
        return res.get("selected_sentences", [])

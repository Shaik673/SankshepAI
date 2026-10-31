import time
import math
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from .nlp_pipeline import NLPPipeline

class TextRankSummarizer:
    """
    Genuine graph-based TextRank Extractive Summarizer.
    Builds a weighted graph of sentences with edges weighted by TF-IDF cosine similarity,
    computes PageRank scores via power iteration, and extracts top-ranked sentences
    while preserving original document order.
    """

    def __init__(self, damping: float = 0.85, max_iter: int = 100, tol: float = 1e-4):
        self.damping = damping
        self.max_iter = max_iter
        self.tol = tol

    def summarize(
        self,
        text: str,
        length_mode: str = "balanced",
        max_sentences: Optional[int] = None,
        target_words: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate extractive summary using TextRank algorithm.
        
        Args:
            text: Input document text
            length_mode: 'short' (~15-20% length), 'balanced' (~30% length), 'detailed' (~50% length)
            max_sentences: Optional explicit sentence cap
            target_words: Optional explicit word target
            
        Returns:
            dict containing summary, selected_sentences, scores, word counts, and metadata
        """
        start_time = time.time()
        cleaned_text = NLPPipeline.clean_text(text)
        sentences = NLPPipeline.segment_sentences(cleaned_text)

        orig_word_count = len(cleaned_text.split())

        # Edge cases: text is too short
        if len(sentences) <= 2:
            return {
                "summary": cleaned_text,
                "selected_sentences": sentences,
                "sentence_scores": [1.0] * len(sentences),
                "original_word_count": orig_word_count,
                "summary_word_count": orig_word_count,
                "compression_ratio": 1.0,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "method": "textrank_baseline",
                "sentence_count": len(sentences),
            }

        # Step 1: Compute TF-IDF matrix for sentences
        try:
            vectorizer = TfidfVectorizer(stop_words='english', min_df=1)
            tfidf_matrix = vectorizer.fit_transform(sentences)
            # Step 2: Compute pairwise cosine similarity matrix
            similarity_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)
        except Exception:
            # Fallback to Jaccard similarity if TF-IDF fails (e.g. all stopwords)
            similarity_matrix = self._jaccard_similarity_matrix(sentences)

        # Set diagonal to zero (no self-loops in TextRank)
        np.fill_diagonal(similarity_matrix, 0.0)

        # Step 3: Run PageRank power iteration
        scores = self._pagerank(similarity_matrix)

        # Step 4: Determine number of sentences to extract
        num_sentences = len(sentences)
        if max_sentences:
            k = min(max_sentences, num_sentences)
        elif target_words:
            k = max(2, min(num_sentences, int(target_words / 20)))
        else:
            if length_mode == "short":
                ratio = 0.20
                k = max(2, int(math.ceil(num_sentences * ratio)))
            elif length_mode == "detailed":
                ratio = 0.50
                k = max(4, int(math.ceil(num_sentences * ratio)))
            else: # balanced
                ratio = 0.35
                k = max(3, int(math.ceil(num_sentences * ratio)))

        k = min(k, num_sentences)

        # Step 5: Rank sentences by score
        ranked_indices = np.argsort(scores)[::-1]
        top_k_indices = ranked_indices[:k]

        # Step 6: Restore original document order for narrative coherence
        top_k_indices_sorted = sorted(top_k_indices)
        selected_sentences = [sentences[i] for i in top_k_indices_sorted]
        summary_text = " ".join(selected_sentences)

        summary_word_count = len(summary_text.split())
        compression_ratio = round(summary_word_count / max(orig_word_count, 1), 3)
        duration_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "summary": summary_text,
            "selected_sentences": selected_sentences,
            "selected_indices": top_k_indices_sorted,
            "sentence_scores": [round(float(scores[i]), 5) for i in top_k_indices_sorted],
            "all_scores": [round(float(s), 5) for s in scores],
            "original_word_count": orig_word_count,
            "summary_word_count": summary_word_count,
            "compression_ratio": compression_ratio,
            "processing_time_ms": duration_ms,
            "method": "textrank_baseline",
            "sentence_count": len(selected_sentences),
            "total_sentences": num_sentences
        }

    def _pagerank(self, similarity_matrix: np.ndarray) -> np.ndarray:
        """
        Compute PageRank scores using power iteration on sentence similarity graph.
        """
        n = similarity_matrix.shape[0]
        if n == 0:
            return np.array([])
        
        # Row-normalize weights
        row_sums = similarity_matrix.sum(axis=1)
        # Avoid division by zero for isolated nodes
        normalized_matrix = np.zeros_like(similarity_matrix)
        for i in range(n):
            if row_sums[i] > 0:
                normalized_matrix[i, :] = similarity_matrix[i, :] / row_sums[i]
            else:
                normalized_matrix[i, :] = 1.0 / n

        # Initial uniform probability
        p = np.full(n, 1.0 / n)

        for _ in range(self.max_iter):
            prev_p = p.copy()
            # PageRank update formula
            p = (1 - self.damping) / n + self.damping * normalized_matrix.T.dot(p)
            # Check convergence
            if np.linalg.norm(p - prev_p, 1) < self.tol:
                break

        return p

    def _jaccard_similarity_matrix(self, sentences: List[str]) -> np.ndarray:
        """Fallback word-overlap Jaccard similarity matrix."""
        n = len(sentences)
        mat = np.zeros((n, n))
        token_sets = [set(NLPPipeline.tokenize_words(s)) for s in sentences]
        for i in range(n):
            for j in range(i + 1, n):
                union = token_sets[i] | token_sets[j]
                if union:
                    sim = len(token_sets[i] & token_sets[j]) / len(union)
                    mat[i, j] = sim
                    mat[j, i] = sim
        return mat

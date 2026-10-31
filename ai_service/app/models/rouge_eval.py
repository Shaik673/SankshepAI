import re
from typing import List, Dict, Any, Optional

class RougeEvaluator:
    """
    Genuine ROUGE Evaluation Suite (ROUGE-1, ROUGE-2, ROUGE-L).
    Calculates exact Precision, Recall, and F1-score against genuine reference summaries.
    Does NOT fabricate scores when reference summaries are absent.
    """

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
        return [w.strip() for w in cleaned.split() if w.strip()]

    @staticmethod
    def _get_ngrams(tokens: List[str], n: int) -> List[tuple]:
        return [tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1)]

    @classmethod
    def calc_rouge_n(cls, hypothesis: str, reference: str, n: int = 1) -> Dict[str, float]:
        """Compute ROUGE-N Precision, Recall, and F1."""
        hyp_tokens = cls._tokenize(hypothesis)
        ref_tokens = cls._tokenize(reference)

        if not hyp_tokens or not ref_tokens:
            return {"precision": 0.0, "recall": 0.0, "f1": 0.0}

        hyp_ngrams = cls._get_ngrams(hyp_tokens, n)
        ref_ngrams = cls._get_ngrams(ref_tokens, n)

        if not hyp_ngrams or not ref_ngrams:
            return {"precision": 0.0, "recall": 0.0, "f1": 0.0}

        # Count overlapping n-grams (multiset intersection)
        hyp_counts = {}
        for ng in hyp_ngrams:
            hyp_counts[ng] = hyp_counts.get(ng, 0) + 1

        ref_counts = {}
        for ng in ref_ngrams:
            ref_counts[ng] = ref_counts.get(ng, 0) + 1

        overlap = sum(min(count, hyp_counts.get(ng, 0)) for ng, count in ref_counts.items())

        recall = overlap / len(ref_ngrams) if len(ref_ngrams) > 0 else 0.0
        precision = overlap / len(hyp_ngrams) if len(hyp_ngrams) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        return {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4)
        }

    @classmethod
    def _lcs_length(cls, s1: List[str], s2: List[str]) -> int:
        """Dynamic programming calculation of Longest Common Subsequence."""
        m, n = len(s1), len(s2)
        dp = [0] * (n + 1)
        for i in range(1, m + 1):
            prev = 0
            for j in range(1, n + 1):
                temp = dp[j]
                if s1[i - 1] == s2[j - 1]:
                    dp[j] = prev + 1
                else:
                    dp[j] = max(dp[j], dp[j - 1])
                prev = temp
        return dp[n]

    @classmethod
    def calc_rouge_l(cls, hypothesis: str, reference: str) -> Dict[str, float]:
        """Compute ROUGE-L (LCS) Precision, Recall, and F1."""
        hyp_tokens = cls._tokenize(hypothesis)
        ref_tokens = cls._tokenize(reference)

        if not hyp_tokens or not ref_tokens:
            return {"precision": 0.0, "recall": 0.0, "f1": 0.0}

        lcs = cls._lcs_length(hyp_tokens, ref_tokens)

        recall = lcs / len(ref_tokens) if len(ref_tokens) > 0 else 0.0
        precision = lcs / len(hyp_tokens) if len(hyp_tokens) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        return {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4)
        }

    @classmethod
    def evaluate(cls, hypothesis: str, reference: Optional[str]) -> Dict[str, Any]:
        """
        Evaluate generated hypothesis summary against genuine reference summary.
        If reference is None or empty, returns honest status without fabricating scores.
        """
        if not reference or not reference.strip():
            return {
                "available": False,
                "message": "Reference-based ROUGE evaluation is unavailable because no reference summary was provided.",
                "rouge1": None,
                "rouge2": None,
                "rougeL": None
            }

        r1 = cls.calc_rouge_n(hypothesis, reference, 1)
        r2 = cls.calc_rouge_n(hypothesis, reference, 2)
        rl = cls.calc_rouge_l(hypothesis, reference)

        return {
            "available": True,
            "rouge1": r1,
            "rouge2": r2,
            "rougeL": rl,
            "reference_words": len(reference.split()),
            "hypothesis_words": len(hypothesis.split())
        }

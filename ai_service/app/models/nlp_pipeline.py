import re
from typing import List, Dict, Tuple, Optional

class NLPPipeline:
    """
    Reproducible NLP Preprocessing Pipeline for SankshepAI.
    Handles sentence segmentation, tokenization, vocabulary mapping,
    and long document handling while preserving legal/policy terms,
    numbers, dates, and references.
    """
    PAD_TOKEN = "<PAD>"
    UNK_TOKEN = "<UNK>"
    SOS_TOKEN = "<SOS>"
    EOS_TOKEN = "<EOS>"

    PAD_IDX = 0
    UNK_IDX = 1
    SOS_IDX = 2
    EOS_IDX = 3

    def __init__(self, vocab: Optional[Dict[str, int]] = None, max_vocab_size: int = 10000):
        self.max_vocab_size = max_vocab_size
        self.word2idx: Dict[str, int] = {
            self.PAD_TOKEN: self.PAD_IDX,
            self.UNK_TOKEN: self.UNK_IDX,
            self.SOS_TOKEN: self.SOS_IDX,
            self.EOS_TOKEN: self.EOS_IDX,
        }
        self.idx2word: Dict[int, str] = {v: k for k, v in self.word2idx.items()}
        if vocab:
            self.word2idx.update(vocab)
            self.idx2word = {v: k for k, v in self.word2idx.items()}

    @staticmethod
    def clean_text(text: str) -> str:
        """
        Normalize text without destroying numbers, dates, circular numbers,
        or punctuation crucial for legal/government documents.
        """
        if not text or not isinstance(text, str):
            return ""
        # Normalize non-breaking spaces and exotic quotes
        text = text.replace('\u00a0', ' ').replace('\u200b', '')
        text = re.sub(r'[\u2018\u2019]', "'", text)
        text = re.sub(r'[\u201c\u201d]', '"', text)
        text = re.sub(r'[\u2013\u2014]', '-', text)
        # Collapse multiple horizontal whitespaces but keep paragraph breaks
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @staticmethod
    def segment_sentences(text: str) -> List[str]:
        """
        Split text into sentences while protecting abbreviations (e.g., e.g., i.e., Dr., Prof., No., Sec., Fig., Vol.)
        and decimal numbers (e.g., 3.14, Rs. 10.50).
        """
        cleaned = NLPPipeline.clean_text(text)
        if not cleaned:
            return []

        # Try NLTK if available
        try:
            import nltk
            return [s.strip() for s in nltk.sent_tokenize(cleaned) if s.strip()]
        except Exception:
            pass

        # Robust regex-based sentence segmentation with lookbehind protection
        # Protect common abbreviations
        protected = cleaned
        abbrevs = [
            (r'\bNo\.', 'No_DOT_'),
            (r'\bDr\.', 'Dr_DOT_'),
            (r'\bMr\.', 'Mr_DOT_'),
            (r'\bMrs\.', 'Mrs_DOT_'),
            (r'\bMs\.', 'Ms_DOT_'),
            (r'\bProf\.', 'Prof_DOT_'),
            (r'\bGovt\.', 'Govt_DOT_'),
            (r'\bDept\.', 'Dept_DOT_'),
            (r'\be\.g\.', 'eg_DOT_'),
            (r'\bi\.e\.', 'ie_DOT_'),
            (r'\bvs\.', 'vs_DOT_'),
            (r'\bSec\.', 'Sec_DOT_'),
            (r'\bVol\.', 'Vol_DOT_'),
            (r'(\d+)\.(\d+)', r'\1_DECIMAL_\2'),
        ]
        for pattern, replacement in abbrevs:
            protected = re.sub(pattern, replacement, protected)

        # Split on sentence boundaries: period, exclamation, question mark followed by whitespace/newline
        raw_sentences = re.split(r'(?<=[.!?])\s+', protected)

        restored_sentences = []
        for s in raw_sentences:
            s = s.replace('No_DOT_', 'No.').replace('Dr_DOT_', 'Dr.').replace('Mr_DOT_', 'Mr.')
            s = s.replace('Mrs_DOT_', 'Mrs.').replace('Ms_DOT_', 'Ms.').replace('Prof_DOT_', 'Prof.')
            s = s.replace('Govt_DOT_', 'Govt.').replace('Dept_DOT_', 'Dept.')
            s = s.replace('eg_DOT_', 'e.g.').replace('ie_DOT_', 'i.e.').replace('vs_DOT_', 'vs.')
            s = s.replace('Sec_DOT_', 'Sec.').replace('Vol_DOT_', 'Vol.')
            s = re.sub(r'(\d+)_DECIMAL_(\d+)', r'\1.\2', s)
            s = s.strip()
            if len(s) > 3:
                restored_sentences.append(s)

        return restored_sentences or [cleaned]

    @staticmethod
    def tokenize_words(sentence: str) -> List[str]:
        """Tokenize words, preserving hyphenated terms and alphanumeric codes."""
        # Simple whitespace + punctuation tokenization
        tokens = re.findall(r'\b[\w\'-]+(?:\.[\w\'-]+)*\b|[^\w\s]', sentence.lower())
        return [t.strip() for t in tokens if t.strip()]

    def build_vocab(self, texts: List[str]) -> None:
        """Build frequency-based vocabulary from a list of texts."""
        word_freq: Dict[str, int] = {}
        for text in texts:
            tokens = self.tokenize_words(text)
            for token in tokens:
                word_freq[token] = word_freq.get(token, 0) + 1

        # Sort by frequency
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        for word, _ in sorted_words[:self.max_vocab_size - 4]:
            if word not in self.word2idx:
                idx = len(self.word2idx)
                self.word2idx[word] = idx
                self.idx2word[idx] = word

    def text_to_indices(self, text: str, max_len: int, add_sos_eos: bool = False) -> Tuple[List[int], int]:
        """Convert text into token IDs with padding and sequence length."""
        tokens = self.tokenize_words(text)
        if add_sos_eos:
            token_ids = [self.SOS_IDX] + [self.word2idx.get(t, self.UNK_IDX) for t in tokens] + [self.EOS_IDX]
        else:
            token_ids = [self.word2idx.get(t, self.UNK_IDX) for t in tokens]

        actual_len = min(len(token_ids), max_len)
        if len(token_ids) > max_len:
            token_ids = token_ids[:max_len]
            if add_sos_eos and token_ids[-1] != self.EOS_IDX:
                token_ids[-1] = self.EOS_IDX
        else:
            token_ids += [self.PAD_IDX] * (max_len - len(token_ids))

        return token_ids, actual_len

    def indices_to_text(self, indices: List[int]) -> str:
        """Convert list of token IDs back into readable string."""
        words = []
        for idx in indices:
            if idx in (self.PAD_IDX, self.SOS_IDX):
                continue
            if idx == self.EOS_IDX:
                break
            words.append(self.idx2word.get(idx, self.UNK_TOKEN))
        # Rejoin words with punctuation handling
        text = ' '.join(words)
        text = re.sub(r'\s+([,.:;?!])', r'\1', text)
        return text

    @staticmethod
    def chunk_document(text: str, max_chunk_words: int = 400) -> List[str]:
        """
        Split long documents into coherent paragraphs/chunks for hierarchical summarization.
        Ensures chunks do not break sentences in the middle.
        """
        sentences = NLPPipeline.segment_sentences(text)
        chunks = []
        current_chunk = []
        current_word_count = 0

        for sentence in sentences:
            words = sentence.split()
            if current_word_count + len(words) > max_chunk_words and current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = [sentence]
                current_word_count = len(words)
            else:
                current_chunk.append(sentence)
                current_word_count += len(words)

        if current_chunk:
            chunks.append(' '.join(current_chunk))

        return chunks or [text]

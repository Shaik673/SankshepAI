# SankshepAI — Academic Defense & Viva Voce Guide
### Deep Learning for NLP: Comprehensive Examiner Q&A Reference

---

### Question 1: What distinguishes Extractive Summarization from Abstractive Summarization?
**Answer**:
- **Extractive Summarization** identifies and selects the most salient, central sentences directly from the source document without modifying individual words or syntactic structure (e.g., TextRank). It ensures grammatical fidelity and eliminates factual hallucinations, but can result in verbose or disjointed summaries.
- **Abstractive Summarization** generates novel sentences and phrases not strictly present in the verbatim source text using an encoder-decoder neural network (e.g., our custom BiGRU Seq2Seq with attention). It mimics human summarization by compressing and paraphrasing content, but requires careful training to prevent hallucination.

---

### Question 2: Walk us through the mathematical formulation of the TextRank algorithm.
**Answer**:
1. **Graph Construction**: The input document is divided into $N$ sentences $V = \{v_1, v_2, \dots, v_N\}$. An undirected edge is drawn between every pair of sentences $(v_i, v_j)$ with weight $w_{ij}$ equal to the cosine similarity of their TF-IDF term vectors:
   $$w_{ij} = \frac{\sum_{t \in v_i \cap v_j} \text{TF-IDF}(t, v_i) \cdot \text{TF-IDF}(t, v_j)}{\|\vec{v}_i\|_2 \|\vec{v}_j\|_2}$$
2. **PageRank Iteration**: Sentence centrality scores $S(v_i)$ are updated recursively using damping factor $d = 0.85$:
   $$S^{(k+1)}(v_i) = (1 - d) + d \sum_{v_j \in \text{Adj}(v_i)} \frac{w_{ji}}{\sum_{v_k \in \text{Adj}(v_j)} w_{jk}} S^{(k)}(v_j)$$
3. **Convergence**: Iteration terminates when $\max_i |S^{(k+1)}(v_i) - S^{(k)}(v_i)| < \epsilon$ (where $\epsilon = 10^{-4}$).
4. **Ordering Restoration**: Sentences with the top $K$ scores are sorted according to their original order in the source document to preserve narrative coherence.

---

### Question 3: Explain the role of the Attention Mechanism in overcoming the "Information Bottleneck".
**Answer**:
In standard sequence-to-sequence encoder-decoder networks, the encoder compresses the entire variable-length input document $x_1, \dots, x_{T_x}$ into a single, fixed-dimensional context vector $c = h_{T_x}$. For long documents, this fixed vector cannot retain all syntactic and factual nuances, creating an information bottleneck where earlier tokens are forgotten.

The attention mechanism resolves this by allowing the decoder to dynamically attend to **all** encoder hidden states $h_1, \dots, h_{T_x}$ at each decoding step $t$. It calculates alignment weights $\alpha_{t,i}$ and constructs a step-specific context vector:
$$c_t = \sum_{i=1}^{T_x} \alpha_{t,i} h_i$$
This gives the decoder direct access to all source tokens, eliminating the information bottleneck.

---

### Question 4: Compare Bahdanau Additive Attention and Luong Multiplicative Attention.
**Answer**:
| Feature | Bahdanau (Additive) | Luong (Multiplicative) |
| :--- | :--- | :--- |
| **Scoring Function** | $e_{t,i} = v_a^T \tanh(W_a s_{t-1} + U_a h_i)$ | $e_{t,i} = s_t^T W_a h_i$ |
| **Decoder Hidden State** | Computed *before* current state ($s_{t-1}$) | Computed *with* current state ($s_t$) |
| **Context Vector Placement** | Fed as input to decoder along with token | Concatenated with $s_t$: $\tilde{s}_t = \tanh(W_c [c_t; s_t])$ |
| **Computational Complexity** | Higher (vector addition + $\tanh$ nonlinearity) | Lower (fast matrix multiplication) |

---

### Question 5: Why is Beam Search superior to Greedy Search in Seq2Seq generation?
**Answer**:
Greedy search selects the token with highest conditional probability $y_t = \arg\max P(y_t | y_{<t}, x)$ at every individual step. Because it cannot anticipate future token probabilities, it can make a sub-optimal choice that leads to an ungrammatical or poor output sequence.

Beam search maintains the top $B$ partial hypothesis sequences (beam width) at every time step $t$. It evaluates cumulative log-probabilities:
$$\text{Score} = \sum_{t=1}^{|Y|} \log P(y_t | y_{<t}, x)$$
This allows the model to explore multiple search paths simultaneously and discover globally optimal summaries.

---

### Question 6: What is the Length Normalization Penalty ($\alpha$) in Beam Search?
**Answer**:
Because cumulative log-probabilities are negative numbers ($\log P \le 0$), longer sequences accumulate more negative additions, unfairly penalizing longer, more descriptive summaries in favor of short, generic phrases.
To counteract this, SankshepAI applies Wu et al.'s length normalization penalty:
$$\text{LP}(|Y|) = \frac{(5 + |Y|)^\alpha}{(5 + 1)^\alpha}$$
With $\alpha = 0.6$, the search is balanced between conciseness and informative detail.

---

### Question 7: Explain the ROUGE metric suite (ROUGE-1, ROUGE-2, ROUGE-L).
**Answer**:
- **ROUGE-1**: Evaluates unigram (single word) overlap between generated hypothesis summary $H$ and human reference summary $R$. Measures lexical coverage.
- **ROUGE-2**: Evaluates bigram (consecutive two-word pair) overlap. Measures fluency and phrase-level consistency.
- **ROUGE-L**: Measures the Longest Common Subsequence (LCS) between $H$ and $R$. It rewards sentences with matching word sequences even if words are interrupted by other words, capturing sentence-level syntactical structure.

For each metric:
$$\text{Recall} = \frac{\text{Overlap}}{\text{Count in Reference}}, \quad \text{Precision} = \frac{\text{Overlap}}{\text{Count in Hypothesis}}, \quad F_1 = \frac{2 \cdot P \cdot R}{P + R}$$

---

### Question 8: Why does SankshepAI refuse to show ROUGE scores when no reference summary is provided?
**Answer**:
ROUGE is by definition a reference-based ground truth evaluation metric. Calculating ROUGE without a reference is mathematically impossible. Systems that fabricate fake ROUGE scores mislead users and breach research ethics. SankshepAI transparently returns `available: false` with guidance explaining that ground-truth references are required for ROUGE evaluation.

---

### Question 9: How does the system handle Out-of-Vocabulary (OOV) tokens?
**Answer**:
The vocabulary is built from the training corpus with special tokens:
- `<pad>` (index 0): Batch padding.
- `<sos>` (index 1): Start-of-sequence signal for decoder.
- `<eos>` (index 2): End-of-sequence signal.
- `<unk>` (index 3): Unknown token mapping.
Tokens not present in the vocabulary are safely mapped to `<unk>`. In inference, unknown tokens are post-processed and supplemented using fallback extractive extraction.

---

### Question 10: How does SankshepAI ensure factual consistency and avoid hallucinations in the Gemini fallback?
**Answer**:
When Gemini API fallback is triggered, the system enforces a source-grounded system prompt:
1. The model is strictly instructed to synthesize **only** statements present in the verbatim source text.
2. It is explicitly prohibited from extrapolating beyond the text or introducing external knowledge.
3. The response metadata includes `method: "gemini_api_fallback"` and a transparent audit notice so researchers and users are never misled.

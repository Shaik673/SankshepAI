import json
import os
from typing import List, Dict, Tuple
import torch
from torch.utils.data import Dataset
try:
    from app.models.nlp_pipeline import NLPPipeline
except (ImportError, ValueError):
    from ..app.models.nlp_pipeline import NLPPipeline

# Built-in representative domain corpus for government circulars, academic research, and policy documents
SAMPLE_DOMAIN_CORPUS = [
    {
        "source": "The Ministry of Finance has issued Circular No. 14/2026 notifying all scheduled commercial banks regarding the updated priority sector lending targets. Under the revised guidelines, banks are mandated to allocate 40 percent of Adjusted Net Bank Credit (ANBC) to priority sectors, including micro, small, and medium enterprises (MSMEs), agriculture, and renewable energy. The new norms shall take effect from April 1, 2026, and all non-compliant institutions will be subject to penal interest levies as determined by the Reserve Bank of India.",
        "target": "Ministry of Finance issued Circular 14/2026 requiring commercial banks to allocate 40% of ANBC to priority sectors like MSMEs and agriculture starting April 1, 2026."
    },
    {
        "source": "The Department of Science and Technology announced the launch of the National Quantum Mission with an allocated budget of Rs. 6,003 crore over eight years. The initiative aims to seed, nurture, and scale up scientific and industrial R&D in quantum technologies. Four thematic hubs will be established across leading academic institutions in quantum computing, quantum communication, quantum sensing and metrology, and quantum materials and devices.",
        "target": "Department of Science and Technology launched the Rs. 6,003 crore National Quantum Mission to establish four academic R&D hubs over eight years."
    },
    {
        "source": "Deep neural sequence-to-sequence models with attention have emerged as the state of the art for abstractive summarization. Unlike extractive methods that select verbatim sentences, abstractive architectures generate novel paraphrases while preserving core semantic factualness. The Luong attention mechanism computes alignment scores between decoder states and encoder representations using dot product or general bilinear matrices, significantly reducing gradient vanishing over long input sequences.",
        "target": "Abstractive sequence-to-sequence models with Luong attention generate novel summaries by aligning decoder states with encoder representations, outperforming extractive baselines."
    },
    {
        "source": "Pursuant to Section 21 of the Information Technology Act, the Regulatory Authority has published draft cybersecurity guidelines for cloud service providers handling public sector data. All registered providers must implement multi-factor authentication, end-to-end encryption for data in transit, and maintain incident logs for a minimum retention duration of 180 days. Public comments on the draft guidelines may be submitted within thirty days from the date of publication.",
        "target": "Regulatory Authority released draft cybersecurity rules requiring cloud providers to enforce MFA, encryption, and 180-day log retention for public sector data."
    },
    {
        "source": "The Central Pollution Control Board reported a 15% decrease in particulate matter concentrations across major metropolitan corridors following the stringent enforcement of Phase-IV emission norms and the transition to electric bus transit. However, secondary ozone levels demonstrated an upward trend during peak afternoon sunlight hours, prompting authorities to mandate accelerated VOC reduction protocols for industrial manufacturing zones.",
        "target": "CPCB observed a 15% decline in PM levels following emission norms and electric transit, though rising ozone levels require new VOC industrial reduction protocols."
    }
]

class SummarizationDataset(Dataset):
    """
    PyTorch Dataset for document summarization.
    Tokenizes and pads source and target text pairs.
    """
    def __init__(self, pairs: List[Dict[str, str]], pipeline: NLPPipeline, max_src_len: int = 120, max_trg_len: int = 50):
        self.pairs = pairs
        self.pipeline = pipeline
        self.max_src_len = max_src_len
        self.max_trg_len = max_trg_len

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        item = self.pairs[idx]
        src_text = item["source"]
        trg_text = item["target"]

        src_indices, src_len = self.pipeline.text_to_indices(src_text, self.max_src_len, add_sos_eos=False)
        trg_indices, trg_len = self.pipeline.text_to_indices(trg_text, self.max_trg_len, add_sos_eos=True)

        return (
            torch.tensor(src_indices, dtype=torch.long),
            torch.tensor(src_len, dtype=torch.long),
            torch.tensor(trg_indices, dtype=torch.long),
            torch.tensor(trg_len, dtype=torch.long)
        )

def load_or_create_dataset(data_dir: str = "data") -> List[Dict[str, str]]:
    """Load dataset from disk or write default representative corpus."""
    os.makedirs(data_dir, exist_ok=True)
    filepath = os.path.join(data_dir, "sample_corpus.json")
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    # Save default corpus
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(SAMPLE_DOMAIN_CORPUS, f, indent=2)

    return SAMPLE_DOMAIN_CORPUS

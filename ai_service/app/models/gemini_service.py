import os
import time
import re
from typing import Dict, Any, Optional

class GeminiFallbackService:
    """
    Intelligent Gemini API Fallback Orchestrator.
    Invoked ONLY under qualifying failure conditions or explicit fallback rules.
    Maintains strict source grounding and honest method attribution.
    """

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-3.5-flash-lite"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model_name = os.getenv("GEMINI_MODEL", model_name)

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    def summarize(
        self,
        text: str,
        style: str = "executive",
        length_mode: str = "balanced",
        include_key_points: bool = True
    ) -> Dict[str, Any]:
        """
        Invoke Gemini API to generate a source-grounded summary.
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "Gemini API key is not configured on the server. Please set GEMINI_API_KEY in the environment.",
                "method": "gemini_api_fallback"
            }

        start_time = time.time()
        orig_word_count = len(text.split())

        length_instructions = {
            "short": "Provide a very concise summary in approximately 100-150 words.",
            "balanced": "Provide a well-balanced summary in approximately 200-300 words.",
            "detailed": "Provide a comprehensive, detailed summary covering all primary sections in approximately 400-500 words."
        }.get(length_mode, "Provide a balanced summary.")

        style_instructions = {
            "executive": "Format as a high-level executive briefing with core conclusions and strategic impacts.",
            "academic": "Format with academic rigor, summarizing objectives, methodology/context, findings, and implications.",
            "bullet-point": "Format strictly as organized bullet points categorized by theme.",
            "plain-language": "Explain the document in clear, accessible plain language avoiding dense jargon.",
            "structured": "Format with structured headings: Background, Key Provisions, Obligations/Deadlines, and Final Verdict."
        }.get(style, "Format clearly with standard paragraphs.")

        prompt = f"""You are the intelligent summarization assistant for SankshepAI.
Generate a concise, coherent, and source-grounded summary of the following document.

CRITICAL INSTRUCTIONS:
1. Base your summary STRICTLY on the source text provided.
2. Do NOT invent, assume, or hallucinate facts, numbers, dates, or parties not present in the source.
3. Preserve key legal terms, circular numbers, dates, statutory deadlines, and monetary figures verbatim.
4. {length_instructions}
5. {style_instructions}
{"6. Include a separate section at the end titled '### Key Takeaways' with 3 to 5 concise bullet points." if include_key_points else ""}

SOURCE DOCUMENT:
\"\"\"
{text}
\"\"\"

SUMMARY:"""

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key, transport='rest')
            
            used_model = self.model_name
            try:
                model = genai.GenerativeModel(used_model)
                response = model.generate_content(
                    prompt,
                    generation_config={
                        "temperature": 0.2, # Low temperature for factual precision
                        "top_p": 0.8,
                        "max_output_tokens": 1024,
                    },
                    request_options={"timeout": 20}
                )
            except Exception as model_err:
                # If configured model fails (e.g. deadline or deprecated), fallback to gemini-3.5-flash-lite
                if used_model != "gemini-3.5-flash-lite":
                    used_model = "gemini-3.5-flash-lite"
                    model = genai.GenerativeModel(used_model)
                    response = model.generate_content(
                        prompt,
                        generation_config={
                            "temperature": 0.2,
                            "top_p": 0.8,
                            "max_output_tokens": 1024,
                        },
                        request_options={"timeout": 20}
                    )
                else:
                    raise model_err

            if not response or not response.text:
                return {
                    "success": False,
                    "error": "Gemini API returned an empty response.",
                    "method": "gemini_api_fallback"
                }

            full_output = response.text.strip()

            # Separate key takeaways if requested
            key_points = []
            summary_content = full_output
            if "### Key Takeaways" in full_output:
                parts = full_output.split("### Key Takeaways")
                summary_content = parts[0].strip()
                kp_section = parts[1].strip()
                key_points = [
                    re.sub(r'^[*-]\s*', '', line).strip()
                    for line in kp_section.split('\n')
                    if line.strip().startswith(('*', '-', '•'))
                ]

            summary_word_count = len(summary_content.split())
            duration_ms = round((time.time() - start_time) * 1000, 2)

            return {
                "success": True,
                "summary": summary_content,
                "key_points": key_points,
                "original_word_count": orig_word_count,
                "summary_word_count": summary_word_count,
                "compression_ratio": round(summary_word_count / max(orig_word_count, 1), 3),
                "processing_time_ms": duration_ms,
                "method": "gemini_api_fallback",
                "model_name": used_model,
                "fallback_triggered": True,
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Gemini API request failed: {str(e)}",
                "method": "gemini_api_fallback"
            }

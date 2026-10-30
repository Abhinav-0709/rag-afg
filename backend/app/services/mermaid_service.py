import re
from typing import Optional, Tuple
from app.models.rag import AnswerFormat


DIAGRAM_KEYWORDS = {
    "flowchart": ["flowchart", "flow chart", "algorithm", "workflow", "decision tree", "branching"],
    "sequence": ["sequence", "protocol", "handshake", "message exchange", "interaction", "client-server"],
    "state": ["state machine", "state diagram", "fsm", "lifecycle", "state transition", "process states"],
    "architecture": ["architecture", "layers", "components", "system design", "block diagram", "structure"],
}

SUPPORTED_DIAGRAM_PREFIXES = (
    "flowchart td",
    "flowchart lr",
    "flowchart tb",
    "flowchart rl",
    "graph td",
    "graph lr",
    "graph tb",
    "graph rl",
    "sequencediagram",
    "statediagram",
    "statediagram-v2",
    "classdiagram",
    "erdiagram",
)


class MermaidService:
    @staticmethod
    def detect_diagram_intent(
        query: str,
        answer_format: AnswerFormat,
        explicit_request: Optional[bool] = None,
    ) -> Tuple[bool, str]:
        """
        Determines whether a visual diagram materially improves understanding
        for the given academic query and format.
        """
        if explicit_request is False:
            return False, ""

        query_lower = query.lower()

        # Check explicit request or format
        if explicit_request is True:
            # Detect preferred type or default to flowchart
            for dtype, keywords in DIAGRAM_KEYWORDS.items():
                if any(k in query_lower for k in keywords):
                    return True, dtype
            return True, "flowchart"

        # Check keyword intent in question
        for dtype, keywords in DIAGRAM_KEYWORDS.items():
            if any(k in query_lower for k in keywords):
                return True, dtype

        # If answer format is step_by_step and query contains procedural words
        if answer_format == AnswerFormat.STEP_BY_STEP:
            procedural_terms = ["how", "explain", "steps", "procedure", "method", "working", "mechanism"]
            if any(term in query_lower for term in procedural_terms):
                return True, "flowchart"

        return False, ""

    @staticmethod
    def validate_and_sanitize_mermaid(code: str) -> Tuple[bool, str, Optional[str]]:
        """
        Validates Mermaid syntax before serving to frontend.
        Ensures valid headers, balanced brackets, and sanitizes node labels.
        """
        if not code or not code.strip():
            return False, "", "Empty diagram code."

        # 1. Strip markdown code fences if present
        cleaned = re.sub(r"^```(?:mermaid)?\s*", "", code.strip(), flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned.strip()).strip()

        lines = [line.strip() for line in cleaned.split("\n") if line.strip()]
        if not lines:
            return False, "", "No diagram instructions found."

        first_line = lines[0].lower().replace(";", "")
        # 2. Check header prefix
        has_valid_prefix = any(first_line.startswith(prefix) for prefix in SUPPORTED_DIAGRAM_PREFIXES)
        if not has_valid_prefix:
            return (
                False,
                cleaned,
                f"Unsupported or missing Mermaid diagram header: '{lines[0]}'. Expected flowchart, sequenceDiagram, or stateDiagram.",
            )

        # 3. Check balanced brackets across the code
        brackets = {"(": ")", "[": "]", "{": "}"}
        stack = []
        in_quotes = False
        quote_char = None

        for char in cleaned:
            if char in ('"', "'"):
                if not in_quotes:
                    in_quotes = True
                    quote_char = char
                elif quote_char == char:
                    in_quotes = False
                    quote_char = None
                continue

            if not in_quotes:
                if char in brackets:
                    stack.append(char)
                elif char in brackets.values():
                    if not stack or brackets[stack.pop()] != char:
                        return False, cleaned, f"Unbalanced bracket '{char}' in diagram."

        if stack:
            unclosed = stack.pop()
            return False, cleaned, f"Unclosed bracket '{unclosed}' in diagram."

        # 4. Check minimum diagram relationship/node count (must have more than just header)
        if len(lines) < 2:
            return False, cleaned, "Diagram must contain at least one node or transition."

        return True, cleaned, None

    @staticmethod
    def generate_fallback_diagram(
        steps_or_points: list[str],
        diagram_type: str = "flowchart",
        title: Optional[str] = None,
    ) -> str:
        """
        Deterministic local fallback generator for visual process flows.
        Transforms key sentences or steps into a clean Mermaid flowchart or state diagram.
        """
        if not steps_or_points:
            return ""

        clean_steps = [s.strip() for s in steps_or_points if s.strip()][:6]
        if not clean_steps:
            return ""

        if diagram_type == "state":
            lines = ["stateDiagram-v2", "    [*] --> State1"]
            for i, step in enumerate(clean_steps, 1):
                # Clean label
                label = re.sub(r"[^\w\s-]", "", step[:40]).strip()
                lines.append(f'    State{i} : {label}')
                if i < len(clean_steps):
                    lines.append(f"    State{i} --> State{i+1}")
                else:
                    lines.append(f"    State{i} --> [*]")
            return "\n".join(lines)

        # Default: flowchart TD
        lines = ["flowchart TD"]
        for i, step in enumerate(clean_steps, 1):
            # Sanitize text for node label
            safe_text = step.replace('"', "'").strip()
            if len(safe_text) > 60:
                safe_text = safe_text[:57] + "..."
            node_id = f"Step{i}"
            lines.append(f'    {node_id}["{i}. {safe_text}"]')
            if i > 1:
                prev_id = f"Step{i-1}"
                lines.append(f"    {prev_id} --> {node_id}")

        return "\n".join(lines)


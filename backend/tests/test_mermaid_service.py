import pytest
from app.models.rag import AnswerFormat
from app.services.mermaid_service import MermaidService


def test_diagram_intent_detection():
    # 1. Explicit request flag
    wants, dtype = MermaidService.detect_diagram_intent("Any question", AnswerFormat.DETAILED, explicit_request=True)
    assert wants is True
    assert dtype in ("flowchart", "sequence", "state", "architecture")

    # 2. Explicit opt-out flag
    wants, _ = MermaidService.detect_diagram_intent("Give me a flowchart of binary search", AnswerFormat.DETAILED, explicit_request=False)
    assert wants is False

    # 3. Flowchart keyword
    wants, dtype = MermaidService.detect_diagram_intent("Can you show a flowchart of the compiler pipeline?", AnswerFormat.DETAILED)
    assert wants is True
    assert dtype == "flowchart"

    # 4. Sequence diagram keyword
    wants, dtype = MermaidService.detect_diagram_intent("Show the TCP 3-way handshake protocol sequence", AnswerFormat.DETAILED)
    assert wants is True
    assert dtype == "sequence"

    # 5. State machine keyword
    wants, dtype = MermaidService.detect_diagram_intent("Explain the process state lifecycle transitions", AnswerFormat.DETAILED)
    assert wants is True
    assert dtype == "state"

    # 6. Step by step format with procedural question
    wants, dtype = MermaidService.detect_diagram_intent("Explain how merge sort works", AnswerFormat.STEP_BY_STEP)
    assert wants is True
    assert dtype == "flowchart"

    # 7. Non-diagram theoretical question
    wants, _ = MermaidService.detect_diagram_intent("What is the definition of a database?", AnswerFormat.SHORT)
    assert wants is False


def test_validate_and_sanitize_valid_mermaid():
    code = """```mermaid
flowchart TD
    A["Start Search"] --> B{"Is target found?"}
    B -- Yes --> C["Return Index"]
    B -- No --> D["Recurse"]
```"""
    is_valid, sanitized, err = MermaidService.validate_and_sanitize_mermaid(code)
    assert is_valid is True
    assert err is None
    assert sanitized.startswith("flowchart TD")
    assert not sanitized.startswith("```")


def test_validate_unsupported_header():
    code = """
pie title Pets
    "Dogs" : 386
    "Cats" : 85
"""
    is_valid, _, err = MermaidService.validate_and_sanitize_mermaid(code)
    assert is_valid is False
    assert "Unsupported or missing Mermaid diagram header" in err


def test_validate_unbalanced_brackets():
    code = """flowchart TD
    A["Unclosed label] --> B
"""
    is_valid, _, err = MermaidService.validate_and_sanitize_mermaid(code)
    assert is_valid is False
    assert "Unclosed bracket" in err or "Unbalanced bracket" in err


def test_fallback_diagram_generation():
    steps = [
        "Divide the unsorted list into n sublists.",
        "Repeatedly merge sublists to produce new sorted sublists.",
        "Return the final sorted array.",
    ]
    diagram = MermaidService.generate_fallback_diagram(steps, diagram_type="flowchart")
    is_valid, sanitized, err = MermaidService.validate_and_sanitize_mermaid(diagram)
    assert is_valid is True
    assert err is None
    assert "flowchart TD" in sanitized
    assert "Step1" in sanitized
    assert "Step2" in sanitized


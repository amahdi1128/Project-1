"""Remove recognizable contact details from government work descriptions."""

import re

EMAIL = re.compile(r"(?<![\w.+-])[A-Z0-9][A-Z0-9.+_-]*@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE = re.compile(
    r"(?<![\w-])(?:\+?1[ .-]?)?(?:\([2-9]\d{2}\)[ ]*|[2-9]\d{2}[ .-])"
    r"[2-9]\d{2}[ .-]\d{4}(?:[ ]*(?:ext\.?|x)[ ]*\d+)?(?![\w-])",
    re.IGNORECASE,
)


def redact_contact_details(description: str) -> str:
    description = EMAIL.sub("[email removed]", description)
    return PHONE.sub("[phone removed]", description)

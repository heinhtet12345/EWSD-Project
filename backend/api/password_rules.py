import re


PASSWORD_RULES_MESSAGE = (
    "Password must be 8-12 characters, include at least one uppercase letter, "
    "one lowercase letter, one number, one special character, and must not contain spaces."
)

SPECIAL_CHARACTER_PATTERN = re.compile(r"[^A-Za-z0-9]")


def validate_custom_password_rules(password: str) -> str | None:
    if not isinstance(password, str):
        return PASSWORD_RULES_MESSAGE

    if " " in password:
        return "Password must not contain spaces."

    if len(password) < 8 or len(password) > 12:
        return "Password length must be between 8 and 12 characters."

    if not any(char.isupper() for char in password):
        return "Password must include at least one uppercase letter."

    if not any(char.islower() for char in password):
        return "Password must include at least one lowercase letter."

    if not any(char.isdigit() for char in password):
        return "Password must include at least one number."

    if not SPECIAL_CHARACTER_PATTERN.search(password):
        return "Password must include at least one special character."

    return None

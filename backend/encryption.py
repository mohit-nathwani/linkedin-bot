from cryptography.fernet import Fernet
import hashlib
import base64
from backend.config import ENCRYPTION_KEY

def get_fernet():
    key = ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY
    key = base64.urlsafe_b64encode(hashlib.sha256(key).digest())
    return Fernet(key)

def encrypt_value(plain_text: str) -> str:
    if not plain_text:
        return ""
    f = get_fernet()
    return f.encrypt(plain_text.encode()).decode()

def decrypt_value(cipher_text: str) -> str:
    if not cipher_text:
        return ""
    f = get_fernet()
    return f.decrypt(cipher_text.encode()).decode()

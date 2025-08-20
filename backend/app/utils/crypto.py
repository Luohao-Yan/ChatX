"""
加密解密工具
用于OAuth令牌等敏感信息的加密存储
"""

import base64
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from typing import Optional


def _derive_key(password: str, salt: bytes = b'oauth_token_salt') -> bytes:
    """从密码派生加密密钥"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    return key


def encrypt_token(token: str, encryption_key: str) -> Optional[str]:
    """加密令牌"""
    if not token or not encryption_key:
        return None
    
    try:
        key = _derive_key(encryption_key)
        f = Fernet(key)
        encrypted_token = f.encrypt(token.encode())
        return base64.urlsafe_b64encode(encrypted_token).decode()
    except Exception:
        return None


def decrypt_token(encrypted_token: str, encryption_key: str) -> Optional[str]:
    """解密令牌"""
    if not encrypted_token or not encryption_key:
        return None
    
    try:
        key = _derive_key(encryption_key)
        f = Fernet(key)
        token_bytes = base64.urlsafe_b64decode(encrypted_token.encode())
        decrypted_token = f.decrypt(token_bytes)
        return decrypted_token.decode()
    except Exception:
        return None


def hash_token(token: str) -> str:
    """对令牌进行哈希处理（用于索引）"""
    return hashlib.sha256(token.encode()).hexdigest()[:16]
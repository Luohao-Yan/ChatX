from typing import List, Optional
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import logging
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """邮件发送服务 - 支持多种SMTP服务商"""
    
    # 预定义的SMTP配置
    SMTP_CONFIGS = {
        "gmail": {
            "server": "smtp.gmail.com",
            "port": 587,
            "use_tls": True,
            "use_ssl": False
        },
        "qq": {
            "server": "smtp.qq.com", 
            "port": 587,
            "use_tls": True,
            "use_ssl": False
        },
        "163": {
            "server": "smtp.163.com",
            "port": 25,
            "use_tls": True,
            "use_ssl": False
        },
        "tencent": {
            "server": "smtp.exmail.qq.com",
            "port": 587,
            "use_tls": True,
            "use_ssl": False
        },
        "aliyun": {
            "server": "smtpdm.aliyun.com",
            "port": 465,
            "use_tls": False,
            "use_ssl": True
        },
        "sendgrid": {
            "server": "smtp.sendgrid.net",
            "port": 587,
            "use_tls": True,
            "use_ssl": False
        }
    }
    
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.use_tls = settings.SMTP_USE_TLS
        self.use_ssl = settings.SMTP_USE_SSL
        self.from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
        self.from_name = settings.SMTP_FROM_NAME
        self.enabled = settings.SMTP_ENABLED
    
    def _create_smtp_connection(self) -> smtplib.SMTP:
        """创建SMTP连接"""
        if self.use_ssl:
            context = ssl.create_default_context()
            server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, context=context)
        else:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            
        if self.use_tls and not self.use_ssl:
            server.starttls()
            
        if self.smtp_username and self.smtp_password:
            server.login(self.smtp_username, self.smtp_password)
            
        return server
    
    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        text_content: Optional[str] = None,
        html_content: Optional[str] = None,
        attachments: Optional[List[str]] = None
    ) -> bool:
        """发送邮件"""
        
        if not self.enabled:
            logger.info(f"邮件服务未启用，模拟发送: {subject} -> {to_emails}")
            if text_content and "验证码" in text_content:
                # 从内容中提取验证码并打印到日志
                lines = text_content.split('\n')
                for line in lines:
                    if "验证码" in line and ":" in line:
                        logger.info(f"🔑 验证码: {line.split(':')[-1].strip()}")
                        break
            return True  # 返回True以便调试时不影响流程
        
        if not self.smtp_username or not self.smtp_password:
            logger.error("SMTP用户名或密码未配置")
            return False
        
        try:
            # 创建邮件对象
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.from_name} <{self.from_email}>" if self.from_name else self.from_email
            msg['To'] = ", ".join(to_emails)
            msg['Subject'] = subject
            
            # 添加文本内容
            if text_content:
                text_part = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(text_part)
            
            # 添加HTML内容  
            if html_content:
                html_part = MIMEText(html_content, 'html', 'utf-8')
                msg.attach(html_part)
            
            # 添加附件
            if attachments:
                for file_path in attachments:
                    if Path(file_path).exists():
                        with open(file_path, "rb") as attachment:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(attachment.read())
                            
                        encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename= {Path(file_path).name}'
                        )
                        msg.attach(part)
            
            # 发送邮件
            server = self._create_smtp_connection()
            server.sendmail(self.from_email, to_emails, msg.as_string())
            server.quit()
            
            logger.info(f"邮件发送成功: {subject} -> {to_emails}")
            return True
            
        except Exception as e:
            logger.error(f"邮件发送失败: {e}")
            return False
    
    async def send_verification_email(
        self, 
        to_email: str, 
        verification_code: str, 
        verification_type: str = "email_verification"
    ) -> bool:
        """发送验证码邮件"""
        
        # 根据验证类型设置不同的主题和内容
        subject_map = {
            "email_verification": "验证您的邮箱地址",
            "password_reset": "重置您的密码",
            "login_verification": "登录验证码"
        }
        
        subject = subject_map.get(verification_type, "验证码")
        
        # 基础文本内容
        text_content = f"""
亲爱的用户：

您的验证码是: {verification_code}

此验证码将在1小时内有效，请及时使用。
为了您的账户安全，请勿将验证码透露给他人。

如果这不是您本人的操作，请忽略此邮件。

ChatX团队
"""
        
        # HTML内容
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{subject}</title>
    <style>
        body {{ font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ padding: 40px 30px; }}
        .code {{ font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background: #f8f9ff; border-radius: 8px; margin: 20px 0; letter-spacing: 4px; }}
        .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ChatX 验证码</h1>
        </div>
        <div class="content">
            <p>亲爱的用户：</p>
            <p>您正在进行身份验证，验证码如下：</p>
            <div class="code">{verification_code}</div>
            <p>此验证码将在 <strong>1小时</strong> 内有效，请及时使用。</p>
            <p>为了您的账户安全，请勿将验证码透露给他人。</p>
            <p>如果这不是您本人的操作，请忽略此邮件。</p>
        </div>
        <div class="footer">
            <p>此邮件由 ChatX 系统自动发送，请勿直接回复。</p>
        </div>
    </div>
</body>
</html>
"""
        
        return await self.send_email(
            to_emails=[to_email],
            subject=subject,
            text_content=text_content,
            html_content=html_content
        )
    
    def test_connection(self) -> bool:
        """测试SMTP连接"""
        if not self.enabled:
            logger.info("邮件服务未启用")
            return True
            
        try:
            server = self._create_smtp_connection()
            server.quit()
            logger.info("SMTP连接测试成功")
            return True
        except Exception as e:
            logger.error(f"SMTP连接测试失败: {e}")
            return False
    
    @classmethod
    def get_smtp_config_for_provider(cls, provider: str) -> dict:
        """获取指定服务商的SMTP配置"""
        return cls.SMTP_CONFIGS.get(provider.lower(), {})
    
    @classmethod
    def list_supported_providers(cls) -> List[str]:
        """获取支持的邮件服务商列表"""
        return list(cls.SMTP_CONFIGS.keys())


# 全局邮件服务实例
email_service = EmailService()


async def get_email_service() -> EmailService:
    """获取邮件服务实例"""
    return email_service
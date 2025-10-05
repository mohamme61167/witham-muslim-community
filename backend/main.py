# backend/main.py
import os, ssl, smtplib, certifi
from email.message import EmailMessage
from pathlib import Path
import resend
from dotenv import load_dotenv
from fastapi import FastAPI, Form, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
import stripe
import time
from typing import Optional

# Load env that sits next to this file
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

app = FastAPI(title="Witham Muslim Community API")

origins = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",") if o.strip()]

# In-memory idempotency for a short window
_IDEMP_CACHE: dict[str, float] = {}
_IDEMP_TTL = 15.0  # seconds

def _idempotent_seen(key: str) -> bool:
    now = time.time()
    # prune old entries
    for k, ts in list(_IDEMP_CACHE.items()):
        if now - ts > _IDEMP_TTL:
            del _IDEMP_CACHE[k]
    if key in _IDEMP_CACHE:
        return True
    _IDEMP_CACHE[key] = now
    return False


# --- CORS (allow your frontend) ---
allowed_origin = os.getenv("ALLOWED_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"ok": True, "service": "wmc-api"}

# --- Email (SMTP) ---
resend.api_key = os.getenv("RESEND_API_KEY")

@app.post("/send-email")
def send_email(
        name: str = Form(...),
        contact: str = Form(...), 
        message: str = Form(...), 
        x_idempotency_key: Optional[str] = Header(default=None)
    ):

    # Duplicate within TTL? Treat as success without re-sending
    if x_idempotency_key and _idempotent_seen(x_idempotency_key):
        return {"ok": True, "duplicate": True}

    frm = os.getenv("RESEND_FROM", "WMC <onboarding@resend.dev>")
    to  = os.getenv("EMAIL_TO")
    if not (resend.api_key and frm and to):
        raise HTTPException(status_code=500, detail="Email service not configured.")

    data = {
        "from": frm,
        "to": [to],
        "subject": f"[WMC] Contact form – {name}",
        "text": f"Name: {name}\nContact: {contact}\n\nMessage:\n{message}",
    }
    if "@" in contact and "." in contact:
        data["reply_to"] = contact

    try:
        r = resend.Emails.send(data)
        return {"ok": True, "id": r.get("id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email send failed: {e}")

# --- Stripe (donations) ---
stripe.api_key = os.getenv("STRIPE_SECRET")
SUCCESS_URL = os.getenv("SUCCESS_URL", "http://localhost:3000")
CANCEL_URL   = os.getenv("CANCEL_URL", "http://localhost:3000")
STRIPE_MONTHLY_PRICE_ID = os.getenv("STRIPE_MONTHLY_PRICE_ID")  # optional

@app.post("/create-checkout-session/oneoff")
def create_oneoff_checkout(amount_gbp: int):
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured.")
    if amount_gbp < 1:
        raise HTTPException(status_code=400, detail="Amount must be at least £1.")
    session = stripe.checkout.Session.create(
        mode="payment",
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "gbp",
                "product_data": {"name": "One-time Donation"},
                "unit_amount": amount_gbp * 100,
            },
            "quantity": 1,
        }],
        success_url=SUCCESS_URL,
        cancel_url=CANCEL_URL,
    )
    return {"url": session.url}

@app.post("/create-checkout-session/monthly")
def create_monthly_checkout(amount_gbp: int = 10):
    if not stripe.api_key:
        raise HTTPException(500, "Stripe not configured.")
    if amount_gbp < 1:
        raise HTTPException(400, "Amount must be at least £1.")
    session = stripe.checkout.Session.create(
        mode="subscription",
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "gbp",
                "product_data": {"name": "Monthly Donation"},
                "unit_amount": amount_gbp * 100,
                "recurring": {"interval": "month"},
            },
            "quantity": 1,
        }],
        success_url=SUCCESS_URL,
        cancel_url=CANCEL_URL,
        allow_promotion_codes=True,
    )
    return {"url": session.url}

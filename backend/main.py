# backend/main.py
import os, ssl, smtplib, certifi
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import stripe

# Load env that sits next to this file
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

app = FastAPI(title="Witham Muslim Community API")

# --- CORS (allow your frontend) ---
allowed_origin = os.getenv("ALLOWED_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"ok": True, "service": "wmc-api"}

# --- Email (SMTP) ---
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_SECURITY = os.getenv("SMTP_SECURITY", "ssl").lower().strip()
SMTP_PASS = os.getenv("SMTP_PASS")
EMAIL_TO  = os.getenv("EMAIL_TO")

@app.post("/send-email")
def send_email(
    name: str = Form(...),
    contact: str = Form(...),
    message: str = Form(...)
):
    if not (SMTP_USER and SMTP_PASS and EMAIL_TO):
        raise HTTPException(status_code=500, detail="Email not configured on server.")
    msg = EmailMessage()
    msg["From"] = SMTP_USER
    msg["To"] = EMAIL_TO
    msg["Subject"] = f"[WMC] Contact form – {name}"
    msg.set_content(f"Name: {name}\nContact: {contact}\n\n{message}")

    ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        if SMTP_SECURITY == "starttls":
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
                s.ehlo()
                s.starttls(context=ctx)
                s.login(SMTP_USER, SMTP_PASS)
                s.send_message(msg)
        else:  # default: SSL on 465
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx) as s:
                s.login(SMTP_USER, SMTP_PASS)
                s.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email send failed: {e}")
    return {"ok": True}

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
        raise HTTPException(status_code=500, detail="Stripe not configured.")
    if amount_gbp < 1:
        raise HTTPException(status_code=400, detail="Amount must be at least £1.")
    line_item = (
        {"price": STRIPE_MONTHLY_PRICE_ID, "quantity": 1}
        if STRIPE_MONTHLY_PRICE_ID
        else {
            "price_data": {
                "currency": "gbp",
                "product_data": {"name": "Monthly Donation"},
                "unit_amount": amount_gbp * 100,
                "recurring": {"interval": "month"},
            },
            "quantity": 1,
        }
    )
    session = stripe.checkout.Session.create(
        mode="subscription",
        payment_method_types=["card"],
        line_items=[line_item],
        success_url=SUCCESS_URL,
        cancel_url=CANCEL_URL,
    )
    return {"url": session.url}

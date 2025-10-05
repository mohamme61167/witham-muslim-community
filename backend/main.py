# backend/main.py
import os, ssl, smtplib, certifi
from email.message import EmailMessage
from pathlib import Path
import resend
from dotenv import load_dotenv
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import stripe

# Load env that sits next to this file
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

app = FastAPI(title="Witham Muslim Community API")

origins = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",") if o.strip()]

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
def send_email(name: str = Form(...), contact: str = Form(...), message: str = Form(...)):
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

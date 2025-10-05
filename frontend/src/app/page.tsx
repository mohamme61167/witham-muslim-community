
"use client";

import React, { useEffect, useState } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Witham Muslim Community",
};

const API_BASE = "/api/wmc"; // <-- use the proxy base, not http://127.0.0.1:8000
let contactInFlight = false; // module-level lock, survives re-renders


async function createOneoff(amount: number) {
  const r = await fetch(`${API_BASE}/create-checkout-session/oneoff?amount_gbp=${amount}`, { method: "POST" });
  const data = await r.json();
  if (data.url) window.location.href = data.url;
}

async function createMonthly(amount: number) {
  const r = await fetch(`${API_BASE}/create-checkout-session/monthly?amount_gbp=${amount}`, { method: "POST" });
  const data = await r.json();
  if (data.url) window.location.href = data.url;
  console.log("Stripe session URL →", data.url);
}

function makeIdemKey() {
  // @ts-ignore
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function sendContact(fd: FormData) {
  const r = await fetch("/api/wmc/send-email", {
    method: "POST",
    body: fd,
    headers: { "X-Idempotency-Key": makeIdemKey() },
  });

  // Read body safely (JSON if advertised, text otherwise).
  let payload: any = null;
  const ct = r.headers.get("content-type") || "";
  try {
    payload = ct.includes("application/json") ? await r.json() : await r.text();
  } catch {
    // body could be empty or invalid JSON
    payload = null;
  }

  console.log("[send-email] status:", r.status, "payload:", payload);

  if (!r.ok) {
    // surface server message if present
    const msg =
      (payload && typeof payload === "object" && payload.detail) ||
      (typeof payload === "string" && payload) ||
      `HTTP ${r.status}`;
    throw new Error(msg);
  }

  return payload; // may be json or text or null
}



// render: {banner && <div className="...">{banner}</div>}

// Single-file React site for the Witham Muslim Community (preview-ready)
// Styling: TailwindCSS utility classes
// Notes:
// - Replace placeholder content/links with real data.
// - Hook up the contact form to your email service (e.g., Formspree) or backend.
// - Swap the Donate links once you choose a provider (e.g., JustGiving, PayPal, Stripe Checkout).
// - Prayer times here are placeholder; wire to your preferred source later.

const NAV = [
  { id: "about", label: "About" },
  { id: "prayer", label: "Prayer Times" },
  //{ id: "events", label: "Events" },
  //{ id: "donate", label: "Donate" },
  { id: "contact", label: "Contact" },
];

/*const placeholderEvents = [
  {
    date: "Sat, 18 Oct 2025",
    title: "Community Clean-Up & Chai",
    time: "10:30–13:00",
    where: "Witham River Walk – meet by the Gazebo",
    blurb:
      "Join us for a family-friendly litter pick, followed by chai and snacks. Gloves and bags provided.",
  },
  {
    date: "Fri, 24 Oct 2025",
    title: "Jumu'ah Khutbah: Mercy & Manners",
    time: "Khutbah 13:10, Salah 13:30",
    where: "(Temporary Venue) Spring Lodge Community Centre",
    blurb:
      "All welcome. Please arrive with wudhu and bring a prayer mat if possible.",
  },
  {
    date: "Sun, 26 Oct 2025",
    title: "Brothers' BJJ Open Mat",
    time: "17:00–18:30",
    where: "TBC",
    blurb:
      "Beginner-friendly. Bring water, shorts/joggers and a t‑shirt or rashguard.",
  },
]; */

/*const placeholderTimetable = [
  { name: "Fajr", adhan: "06:05", jamaah: "06:30" },
  { name: "Dhuhr", adhan: "12:58", jamaah: "13:30" },
  { name: "Asr", adhan: "16:00", jamaah: "16:30" },
  { name: "Maghrib", adhan: "Sunset", jamaah: "Sunset + 5" },
  { name: "Isha", adhan: "20:20", jamaah: "20:45" },
  { name: "Jumu'ah", adhan: "—", jamaah: "13:30" },
]; */

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-md">
        <span className="text-white text-x2 font-semibold">WMC</span>
      </div>
      <div className="leading-tight">
        <p className="font-semibold text-zinc-900">Witham Muslim Community</p>
        <p className="text-xs text-zinc-500">Seeking a home for our masjid</p>
      </div>
    </div>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/75 bg-white/90 border-b border-zinc-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#home" className="hover:opacity-90" aria-label="Home">
          <Logo />
        </a>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="px-3 py-2 rounded-xl text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 focus:outline-none focus-visible:ring focus-visible:ring-emerald-500"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#donate"
            className="ml-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
          >
            Donate
          </a>
        </nav>
        <button
          className="md:hidden inline-flex items-center justify-center p-2 rounded-xl border border-zinc-300 text-zinc-700"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-zinc-200">
          <div className="px-4 py-2 grid">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-100"
              >
                {item.label}
              </a>
            ))}
            <a href="#donate" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700">Donate</a>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900">
            Building a Masjid for Witham
          </h1>
          <p className="mt-4 text-zinc-600 text-lg">
            We are a volunteer-led community working to establish a permanent masjid in Witham and to serve our neighbours with compassion, service, and unity.
          </p>
          <p className="mt-4 text-zinc-600 text-lg">
            Jummah Prayer is at 1:30 at the Witham Labour Hall, looking forward to seeing you there
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#donate" className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700">Support the Masjid Fund</a>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Charity (Sadaqah) is continuous—every brick you help lay will benefit you in the Hereafter, in shā’ Allāh.
          </p>
        </div>
        <div className="relative">
          <div className="aspect-[4/3] rounded-3xl bg-white shadow-xl border border-zinc-200 overflow-hidden">
            <div className="h-full w-full grid place-items-center p-6">
              <div className="text-center">
                <div className="text-6xl">🕌</div>
                <p className="mt-4 font-semibold text-zinc-800">Temporary Jummah Prayer Venue</p>
                <p className="text-zinc-600">Witham Labour Hall (until we secure a property)</p>
                <a href="#prayer" className="inline-block mt-4 text-emerald-700 font-semibold underline">View prayer timetable</a>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 bg-emerald-600 text-white text-xs rounded-xl px-3 py-2 shadow-lg">
            
          </div>
        </div>
      </div>
    </section>
  );
}
//Add Registered UK Community Group to line 156 when we get registered
function About() {
  return (
    <section id="about" className="max-w-6xl mx-auto px-4 py-16">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">Who we are</h2>
          <p className="mt-4 text-zinc-700 leading-relaxed">
            Witham Muslim Community (WMC) is a non-profit, volunteer-led initiative serving Muslims
            and our wider neighbours in Witham, Essex. Our priorities are establishing a permanent masjid,
            providing reliable prayer facilities, delivering beneficial classes and youth activities, and
            contributing positively to our town through service.
          </p>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {[
              { title: "Vision", text: "A welcoming masjid and community hub for all ages in Witham." },
              { title: "Mission", text: "Worship, service, education, and unity—rooted in Islamic Values." },
              { title: "Values", text: "Sincerity, excellence (iḥsān), respect, and transparency." },
              { title: "Leadership", text: "Volunteer committee (incl. Vice President, Secretary, Treasurer)." },
            ].map((x) => (
              <div key={x.title} className="p-4 rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <p className="font-semibold text-zinc-900">{x.title}</p>
                <p className="text-zinc-600 text-sm mt-1">{x.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-1 p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <p className="text-sm uppercase tracking-wide text-zinc-500 font-semibold">Quick links</p>
          <div className="mt-3 grid gap-2">
            <a href="#donate" className="px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 hover:bg-emerald-100">Donate to the Masjid Fund</a>
            
            <a href="#contact" className="px-4 py-3 rounded-xl bg-zinc-50 text-zinc-800 font-semibold border border-zinc-200 hover:bg-white">Contact the Team</a>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Want to volunteer? We especially welcome help with youth work, event setup, social media, and fundraising.
          </p>
        </div>
      </div>
    </section>
  );
}
// add to line 194 when appropriate <a href="#events" className="px-4 py-3 rounded-xl bg-zinc-50 text-zinc-800 font-semibold border border-zinc-200 hover:bg-white">Community Events</a>
function PrayerTimes() {
  return (
    <section id="prayer" className="bg-gradient-to-b from-white to-emerald-50/60">
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">Prayer Times</h2>
        <p className="mt-4 text-zinc-700">
          Click below to view the latest prayer timetable.
        </p>
        <a
          href="https://mawaqit.net/en/alfalah-braintree" // 🔗 change this to the link you prefer
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700"
        >
          View Prayer Timetable
        </a>
      </div>
    </section>
  );
}


/*function Events() {
  return (
    <section id="events" className="max-w-6xl mx-auto px-4 py-16">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">Upcoming Events</h2>
        <a href="#contact" className="text-sm font-semibold text-emerald-700 underline">Host an event</a>
      </div>
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {placeholderEvents.map((evt) => (
          <article key={evt.title} className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <p className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">{evt.date}</p>
            <h3 className="mt-1 text-lg font-semibold text-zinc-900">{evt.title}</h3>
            <p className="text-sm text-zinc-600">{evt.time} • {evt.where}</p>
            <p className="mt-2 text-zinc-700">{evt.blurb}</p>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-2 rounded-xl text-sm font-semibold border border-zinc-300 hover:bg-zinc-50">Add to Calendar</button>
              <button className="px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700">RSVP</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}*/

function Donate() {
  return (
    <section id="donate" className="bg-gradient-to-b from-emerald-50/80 to-white">
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">Donate</h2>
        <p className="mt-3 text-zinc-700">
          Help us secure a property for a permanent masjid and support our ongoing services. 
          Every contribution—big or small—makes a difference.
        </p>

        {/* One-time donation */}
        <div className="mt-8 p-6 rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">One-time Donation</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Enter the amount you’d like to give as a one-off contribution.
          </p>
           <form
            className="mt-4 grid gap-3 justify-center"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("oneoff") as HTMLInputElement;
              const amt = Number(input?.value);
              if (!Number.isFinite(amt) || amt < 1) return alert("Please enter at least £1");
              createOneoff(amt);
              }}
           >
            <div className="relative w-48 mx-auto">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">£</span>
              <input
                name="oneoff"
                type="number"
                placeholder="Enter amount"
                min="1"
                className="px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 text-center"
              />
            </div>  
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Donate Now
            </button>
          </form>
        </div>

        {/* Monthly donation */}
        <div className="mt-8 p-6 rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900">Monthly Support</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Become a regular supporter with a recurring donation.
          </p>
          <form
            className="mt-4 grid gap-3 justify-center"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("monthly") as HTMLInputElement;
              const amt = Number(input?.value || 10);
              if (!Number.isFinite(amt) || amt < 1) return alert("Please enter at least £1");
              createMonthly(amt);
            }}
          >
            <div className="relative w-48 mx-auto">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">£</span>
                <input
                  name="monthly"
                  type="number"
                  defaultValue={10}
                  min="1"
                  className="px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 text-center"
                />
            </div>   
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Set up Monthly Donation
            </button>
          </form>
        </div>

        {/* Bank transfer option */}
        <div className="mt-8 p-4 rounded-2xl border border-zinc-200 bg-white shadow-sm text-sm text-zinc-600">
          Prefer bank transfer? <br />
          <span className="font-semibold">Account Name:</span> Witham Muslim Community •{" "}
          <span className="font-semibold">Sort Code:</span> 00-00-00 •{" "}
          <span className="font-semibold">Account No:</span> 00000000 (PLACEHOLDERS)
        </div>
      </div>
    </section>
  );
}


function Contact() {
  const [sending, setSending] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <section id="contact" className="max-w-6xl mx-auto px-4 py-16">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">Contact us</h2>
          <p className="mt-3 text-zinc-700">
            Questions, ideas, or want to volunteer? Send us a message and the team will get back to you.
          </p>
            <form ref={formRef} className="mt-6 grid gap-3" noValidate>
            <input name="name" placeholder="Your name" className="px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <input name="contact" placeholder="Email or phone" className="px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <textarea name="message" placeholder="How can we help?" rows={5} className="px-4 py-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <button
              type="button"
              onClick={async (e) => {
                if (contactInFlight) return;              // sync lock
                contactInFlight = true;
                const btn = e.currentTarget;
                btn.disabled = true;
                try {
                  const form = formRef.current!;
                  const fd = new FormData(form);
                  const name = String(fd.get("name") ?? "").trim();
                  const contact = String(fd.get("contact") ?? "").trim();
                  const message = String(fd.get("message") ?? "").trim();
                  if (!name || !contact || !message) { alert("Please complete all fields."); return; }

                  await sendContact(fd);
                  alert("Thanks! Your message has been sent.");
                  form.reset();
                } catch (err: any) {
                  console.error("send-email error:", err);
                  alert(`Sorry—message failed. ${err?.message ?? ""}`.trim());
                } finally {
                  btn.disabled = false;
                  contactInFlight = false;
                }
              }}
              className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Send message
            </button>
            <p className="text-xs text-zinc-500">Hook this form to Formspree, Getform, or your backend endpoint.</p>
          </form>
        </div>
        <div className="md:col-span-1 p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <p className="font-semibold text-zinc-900">Other ways to reach us</p>
          <div className="mt-3 grid gap-2 text-sm text-zinc-700">
            <p>Email: <a className="font-semibold text-emerald-700 underline" href="mailto:info@withammuslimcommunity.org">info@withammuslimcommunity.org</a></p>
            <p>Facebook: <a className="font-semibold text-emerald-700 underline" href="#" target="_blank" rel="noreferrer">@WithamMuslimCommunity</a></p>
            <p>Instagram: <a className="font-semibold text-emerald-700 underline" href="#" target="_blank" rel="noreferrer">@witham.muslim.community</a></p>
            <p>Phone/WhatsApp (placeholder): <span className="font-semibold">+44 0000 000000</span></p>
            <p className="text-xs text-zinc-500">Replace placeholders with your real handles.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200">
      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-6 text-sm">
        <div>
          <Logo />
          <p className="mt-3 text-zinc-600">Serving Witham with prayer, service, and learning.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-zinc-900">Links</p>
            <ul className="mt-2 space-y-2 text-zinc-600">
              <li><a href="#about" className="hover:text-zinc-900">About</a></li>
              <li><a href="#prayer" className="hover:text-zinc-900">Prayer Times</a></li>
              <li><a href="#events" className="hover:text-zinc-900">Events</a></li>
              <li><a href="#donate" className="hover:text-zinc-900">Donate</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-zinc-900">Legal</p>
            <ul className="mt-2 space-y-2 text-zinc-600">
              <li><a href="#" className="hover:text-zinc-900">Safeguarding</a></li>
              <li><a href="#" className="hover:text-zinc-900">Privacy</a></li>
              <li><a href="#" className="hover:text-zinc-900">Volunteer Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="md:text-right">
          <p className="text-zinc-500">© {new Date().getFullYear()} Witham Muslim Community</p>
          <p className="text-zinc-500">Made with ♥ by volunteers</p>
        </div>
      </div>
    </footer>
  );
}

export default function WithamMuslimCommunitySite() {
  const [banner, setBanner] = useState<string | null>(null);
  useEffect(() => {
      const ok = new URLSearchParams(window.location.search).get("donation");
      if (ok === "success") setBanner("Thank you! Your donation was successful.");
      else if (ok === "cancel") setBanner("Donation cancelled.");
    }, []);
    return (
      
      <div className="min-h-screen bg-white text-zinc-800">
        <Navbar />
        {banner && (
          <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-4 py-3 text-center">
            {banner}
          </div>
        )}
        <main>
          <Hero />
          <About />
          <PrayerTimes />
          <Donate />
          <Contact />
        </main>
        <Footer />
      </div>
    );
}


// add Event to NavBar when ready
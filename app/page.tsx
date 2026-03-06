"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  CalendarDays, Trophy, Heart, Star, Shield, BookOpen, Users,
  CheckCircle, Clock, MapPin, Loader2, AlertCircle, ChevronRight,
  Sparkles, X, Menu, Bell, Mail, Phone, Facebook, Instagram, Youtube,
  Globe,
} from "lucide-react";

// ═════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════
interface DashboardData {
  fundraisingGoal: number; fundraisingCurrent: number;
  volunteerHoursGoal: number; volunteerHoursCurrent: number;
  nextEventName?: string; nextEventDate?: string;
}
interface SchoolEvent {
  id: string; title: string; date: string; time: string;
  location: string; description: string; category: string;
}
interface Sponsor {
  id: string; name: string; tier: "Gold" | "Silver" | "Bronze" | "Community";
  website?: string; logoUrl?: string; tagline?: string;
}
interface Announcement {
  id: string; message: string; type?: "info" | "warning" | "success";
}
interface VolunteerFormData {
  volunteerName: string; volunteerEmail: string;
  eventName: string; hoursLogged: string; notes: string;
}
interface ContactFormData {
  contactName: string; contactEmail: string; subject: string; message: string;
}
type FormStatus = "idle" | "loading" | "success" | "error";

// ═════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════
function sanitizeInput(v: string): string {
  return v.replace(/<[^>]*>/g, "").replace(/[<>"'`]/g, "").trim().slice(0, 500);
}
function isValidEmail(e: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(e);
}

// ═════════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════════
const API_URL = "https://script.google.com/macros/s/AKfycbz4lb3YslgAVDobLHrha7RgCyV1tGrf5GNlk42Lb1DV4n914NNfVaSReQL4nkJYqs0BiA/exec";
const LOGO_URL = "https://cmsv2-assets.apptegy.net/uploads/7712/logo/8923/Martin_County_Bessey_Creek_Circle_Crest_Logo__2_.png";
const CALENDAR_URL = "https://www.martinschools.org/o/bces/events?view=cal-month";

// Logo-matched palette — softer green background
const C = {
  green:      "#2D9B4E",   // vibrant green from logo
  greenDark:  "#1e7039",   // darker shade for depth
  greenBg:    "#e8f5ec",   // soft green background (easier on eyes)
  greenLight: "#f0f9f3",   // very light green
  gold:       "#D4AF37",   // rich gold
  goldLight:  "#f5edd6",
  cream:      "#fafaf7",   // warm off-white
  ink:        "#1a1f1a",   // near-black text
  muted:      "#5a6b5a",   // muted green-gray (darker for better readability)
  border:     "#d4e0d4",
  red:        "#c0392b",   // from logo shield
  blue:       "#2874A6",   // from logo shield
  silver:     "#8e9eab",
};

const NAV_LINKS = [
  { label: "Progress",  href: "#progress" },
  { label: "Events",    href: "#events" },
  { label: "Volunteer", href: "#volunteer" },
  { label: "Sponsors",  href: "#sponsors" },
  { label: "Calendar",  href: "#calendar" },
  { label: "Contact",   href: "#contact" },
];

const STAR_VALUES = [
  { icon: Shield,      letter: "S", label: "Stay Safe",           accent: C.green, bg: C.greenLight },
  { icon: CheckCircle, letter: "T", label: "Take Responsibility", accent: C.red,   bg: "#fdecea" },
  { icon: BookOpen,    letter: "A", label: "Actively Learn",      accent: C.blue,  bg: "#e8f0fb" },
  { icon: Heart,       letter: "R", label: "Respect Others",      accent: C.gold,  bg: C.goldLight },
];

// ═════════════════════════════════════════════════════════════
// FALLBACK DATA
// ═════════════════════════════════════════════════════════════
const FALLBACK_DASHBOARD: DashboardData = {
  fundraisingGoal: 25000, fundraisingCurrent: 18500,
  volunteerHoursGoal: 1000, volunteerHoursCurrent: 742,
  nextEventName: "Spring Book Fair", nextEventDate: "April 15, 2025",
};
const FALLBACK_EVENTS: SchoolEvent[] = [
  { id: "1", title: "Spring Book Fair", date: "April 15, 2025", time: "9:00 AM – 4:00 PM", location: "Media Center", description: "Browse and purchase books to support our school library. All purchases benefit BCE students!", category: "Fundraiser" },
  { id: "2", title: "PTA General Meeting", date: "April 22, 2025", time: "6:30 PM", location: "Cafeteria", description: "Monthly PTA meeting open to all parents, guardians, and community members. Join us to discuss upcoming events and school initiatives.", category: "Meeting" },
  { id: "3", title: "STEM Fair", date: "May 6, 2025", time: "5:30 PM – 7:30 PM", location: "Gymnasium", description: "Celebrate science, technology, engineering, and math with hands-on activities and student project demonstrations.", category: "Academic" },
  { id: "4", title: "Field Day", date: "May 20, 2025", time: "8:30 AM – 2:00 PM", location: "Athletic Fields", description: "Annual field day with games, relay races, and outdoor activities for all grade levels. Volunteers needed!", category: "Community" },
];
const FALLBACK_SPONSORS: Sponsor[] = [
  { id: "1", name: "Gator Grille & Sports Bar",   tier: "Gold",      tagline: "Fueling Gator Pride since 2010" },
  { id: "2", name: "Treasure Coast Pediatrics",   tier: "Gold",      tagline: "Caring for our community's children" },
  { id: "3", name: "Palm City Insurance Group",   tier: "Silver",    tagline: "Protecting families, supporting schools" },
  { id: "4", name: "Martin County Credit Union",  tier: "Silver",    tagline: "Your local financial partner" },
  { id: "5", name: "Bessey Creek Dental Care",    tier: "Bronze",    tagline: "Healthy smiles for Gator families" },
  { id: "6", name: "First Bank of Florida",       tier: "Community", tagline: "Investing in tomorrow's leaders" },
];
const FALLBACK_ANNOUNCEMENTS: Announcement[] = [
  { id: "1", message: "🎉 Spring Book Fair starts April 15th — support our students and win prizes!", type: "success" },
];

// ═════════════════════════════════════════════════════════════
// DATA FETCHING
// ═════════════════════════════════════════════════════════════
async function fetchTab<T>(tab: string, fallback: T): Promise<T> {
  try {
    const url = new URL(API_URL);
    url.searchParams.set("tab", tab);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json?.data) && json.data.length > 0) return json.data as T;
    if (json?.data && !Array.isArray(json.data)) return json.data as T;
    return fallback;
  } catch { return fallback; }
}

async function postToSheet(payload: Record<string, string>): Promise<void> {
  await fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload).toString(),
  });
}

// ═════════════════════════════════════════════════════════════
// DESIGN TOKENS & SHARED STYLES
// ═════════════════════════════════════════════════════════════
const diamondDivider = (
  <div className="flex items-center gap-4 my-6">
    <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${C.gold}66, transparent)` }} />
    <div className="w-1.5 h-1.5 rotate-45" style={{ background: C.gold }} />
    <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${C.gold}66, transparent)` }} />
  </div>
);

function inputCls(hasError?: boolean) {
  return [
    "w-full rounded-xl px-4 py-3.5 text-base font-medium transition-all duration-200 outline-none",
    "border focus:ring-2",
    hasError
      ? "border-red-400 bg-red-50 focus:ring-red-100"
      : `border-[${C.border}] bg-white focus:border-[${C.gold}] focus:ring-[${C.gold}22] focus:bg-white`,
  ].join(" ");
}

// ═════════════════════════════════════════════════════════════
// ANNOUNCEMENT BANNER
// ═════════════════════════════════════════════════════════════
function AnnouncementBanner({ announcements }: { announcements: Announcement[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (!visible.length) return null;
  const ann = visible[0];
  return (
    <div className="w-full px-6 py-3 flex items-center justify-between gap-4"
      style={{ background: C.green, borderBottom: `2px solid ${C.gold}` }}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Bell className="w-4 h-4 flex-shrink-0" style={{ color: C.gold }} />
        <p className="text-sm font-semibold tracking-wide truncate" style={{ color: "white" }}>
          {ann.message}
        </p>
      </div>
      <button onClick={() => setDismissed(d => new Set([...d, ann.id]))}
        className="flex-shrink-0 p-1 rounded hover:opacity-70 transition-opacity" aria-label="Dismiss">
        <X className="w-4 h-4" style={{ color: C.gold }} />
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// NAVBAR
// ═════════════════════════════════════════════════════════════
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full transition-all duration-500"
      style={{
        background: scrolled ? "rgba(255,255,255,0.98)" : "white",
        borderBottom: `1px solid ${scrolled ? C.border : C.border}44`,
        boxShadow: scrolled ? "0 4px 32px rgba(45,155,78,0.08)" : "none",
        backdropFilter: scrolled ? "blur(12px)" : "none",
      }}>
      <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between gap-6" style={{ height: 72 }}>
        {/* Brand */}
        <a href="#top" className="flex items-center gap-3 flex-shrink-0 group">
          <div className="relative">
            <Image src={LOGO_URL} alt="Bessey Creek Elementary" width={48} height={48}
              className="rounded-full transition-transform duration-300 group-hover:scale-105"
              style={{ border: `2px solid ${C.gold}44` }} />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: C.gold, fontFamily: "Georgia, serif" }}>Bessey Creek</p>
            <p className="text-base font-black leading-tight" style={{ color: C.green, fontFamily: "'Playfair Display', Georgia, serif" }}>The Gator Grid</p>
          </div>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href}
              className="px-4 py-2 rounded-lg text-sm font-bold tracking-wider uppercase transition-all duration-200 hover:bg-green-50"
              style={{ color: C.muted, letterSpacing: "0.08em" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = C.green; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = C.muted; }}>
              {l.label}
            </a>
          ))}
          <a href="https://bceptafl.givebacks.com/shop" target="_blank" rel="noopener noreferrer" className="ml-3 px-6 py-3 rounded-full text-sm font-black tracking-wider uppercase transition-all duration-200 hover:opacity-90"
            style={{ background: C.green, color: "white", letterSpacing: "0.08em" }}>
            PTA Shop
          </a>
        </div>

        {/* Mobile */}
        <div className="md:hidden relative" ref={menuRef}>
          <button onClick={() => setOpen(v => !v)} className="p-2 rounded-lg transition-colors hover:bg-green-50" aria-label="Menu">
            {open ? <X className="w-6 h-6" style={{ color: C.green }} /> : <Menu className="w-6 h-6" style={{ color: C.green }} />}
          </button>
          {open && (
            <div className="absolute right-0 top-14 w-56 rounded-2xl overflow-hidden z-50"
              style={{ background: "white", border: `1px solid ${C.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
              {NAV_LINKS.map((l) => (
                <a key={l.label} href={l.href} onClick={() => setOpen(false)}
                  className="flex items-center px-5 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-green-50"
                  style={{ color: C.muted, borderBottom: `1px solid ${C.border}`, letterSpacing: "0.08em" }}>
                  {l.label}
                </a>
              ))}
              <a href="https://bceptafl.givebacks.com/shop" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
                className="flex items-center px-5 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors"
                style={{ color: C.green, letterSpacing: "0.08em" }}>
                PTA Shop
              </a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ═════════════════════════════════════════════════════════════
// HERO — Full-bleed vibrant green with radial glow
// ═════════════════════════════════════════════════════════════
function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden" style={{ background: C.green, minHeight: 600 }}>
      {/* Decorative background pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, ${C.greenDark}66 0%, transparent 60%), radial-gradient(circle at 80% 20%, ${C.gold}22 0%, transparent 50%)`,
        }} />
        {/* Subtle grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }} />
        {/* Gold decorative lines */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${C.gold}88, transparent)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${C.gold}66, transparent)` }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-12" style={{ background: C.gold }} />
          <p className="text-sm font-bold tracking-[0.3em] uppercase" style={{ color: C.gold }}>
            Bessey Creek Elementary · PTA
          </p>
          <div className="h-px w-12" style={{ background: C.gold }} />
        </div>

        {/* Logo with multi-ring shadow */}
        <div className="relative mb-9">
          <div className="absolute inset-0 rounded-full blur-2xl scale-110" style={{ background: `${C.gold}33` }} />
          <Image src={LOGO_URL} alt="Bessey Creek Elementary School" width={160} height={160} priority
            className="relative rounded-full"
            style={{ 
              border: `3px solid ${C.gold}88`, 
              boxShadow: `0 0 0 10px ${C.gold}33, 0 0 0 20px ${C.gold}18, 0 20px 60px rgba(0,0,0,0.45)` 
            }} />
        </div>

        {/* Title — editorial sizing */}
        <h1 className="mb-6" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          <span className="block text-xl font-bold tracking-[0.25em] uppercase mb-2" style={{ color: `${C.gold}` }}>
            Welcome to
          </span>
          <span className="block font-black" style={{ 
            color: "white", 
            fontSize: "clamp(3.2rem, 7vw, 6rem)", 
            lineHeight: 1.02, 
            letterSpacing: "-0.025em" 
          }}>
            The Gator Grid
          </span>
        </h1>

        <p className="max-w-xl text-lg font-medium leading-relaxed mb-12" style={{ color: "rgba(255,255,255,0.95)" }}>
          Your hub for community progress, upcoming events, volunteer opportunities, and everything that makes Bessey Creek Elementary extraordinary.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <a href="#volunteer" className="px-10 py-4 rounded-full text-base font-black tracking-wider uppercase transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
            style={{ 
              background: `linear-gradient(135deg, ${C.gold}, #f0c75e)`, 
              color: C.greenDark, 
              letterSpacing: "0.1em", 
              boxShadow: `0 6px 28px ${C.gold}66` 
            }}>
            Log Volunteer Hours
          </a>
          <a href="#events" className="px-10 py-4 rounded-full text-base font-black tracking-wider uppercase transition-all duration-300 hover:bg-white hover:text-green-900"
            style={{ border: `2px solid ${C.gold}88`, color: "white", letterSpacing: "0.1em" }}>
            View Events
          </a>
        </div>

        {/* S.T.A.R. strip — horizontal layout */}
        <div className="flex flex-wrap justify-center gap-8 sm:gap-14">
          {["Stay Safe", "Take Responsibility", "Actively Learn", "Respect Others"].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <span className="text-2xl font-black" style={{ color: C.gold, fontFamily: "Georgia, serif" }}>
                {v[0]}
              </span>
              <span className="text-sm font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.90)" }}>{v.slice(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// SECTION WRAPPER
// ═════════════════════════════════════════════════════════════
function Section({ id, children, cream = false }: { id?: string; children: React.ReactNode; cream?: boolean }) {
  return (
    <section id={id} className="py-24 scroll-mt-20" style={{ background: cream ? C.greenBg : "white" }}>
      <div className="max-w-7xl mx-auto px-6">{children}</div>
    </section>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center mb-16">
      <p className="text-sm font-bold tracking-[0.3em] uppercase mb-3" style={{ color: C.gold }}>
        {eyebrow}
      </p>
      <h2 className="text-5xl md:text-6xl font-black" style={{ 
        color: C.green, 
        fontFamily: "'Playfair Display', Georgia, serif", 
        letterSpacing: "-0.02em" 
      }}>
        {title}
      </h2>
      {diamondDivider}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// STAR VALUES — Vibrant green band
// ═════════════════════════════════════════════════════════════
function StarValuesSection() {
  return (
    <section className="py-14" style={{ 
      background: C.green, 
      borderTop: `2px solid ${C.gold}44`, 
      borderBottom: `2px solid ${C.gold}44` 
    }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STAR_VALUES.map(({ icon: Icon, letter, label, accent }) => (
            <div key={letter} className="group flex items-center gap-4 p-7 rounded-2xl transition-all duration-300 cursor-default hover:scale-[1.02]"
              style={{ background: `rgba(255,255,255,0.12)`, border: `1px solid ${C.gold}44` }}>
              <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${C.gold}33`, border: `1.5px solid ${C.gold}66` }}>
                <span className="text-2xl font-black" style={{ color: C.gold, fontFamily: "Georgia, serif" }}>{letter}</span>
              </div>
              <div>
                <p className="text-sm font-black tracking-wider uppercase mb-1" style={{ color: C.gold }}>
                  {label.split(" ")[0]}
                </p>
                <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.90)" }}>{label.split(" ").slice(1).join(" ")}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// DASHBOARD — Circular SVG progress rings
// ═════════════════════════════════════════════════════════════
function ProgressRing({ value, max, color, size = 150 }: { value: number; max: number; color: string; size?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const r = 45;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke={`${color}22`} strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: "stroke-dasharray 1.2s ease" }} />
      <text x="50" y="44" textAnchor="middle" fill={color} fontSize="20" fontWeight="900" fontFamily="Georgia, serif">
        {Math.round(pct)}%
      </text>
      <text x="50" y="64" textAnchor="middle" fill={color} fontSize="8" fontWeight="600" fontFamily="sans-serif" opacity="0.8">
        of goal
      </text>
    </svg>
  );
}

function DashboardSection({ data }: { data: DashboardData | null }) {
  const d = data ?? FALLBACK_DASHBOARD;
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

  return (
    <Section id="progress" cream>
      <SectionHeader eyebrow="Community Impact" title="Gator Progress" />
      <div className="grid md:grid-cols-2 gap-10">
        {/* Fundraising */}
        <div className="rounded-3xl p-10 flex flex-col sm:flex-row items-center gap-10 transition-all duration-300 hover:shadow-2xl relative"
          style={{ 
            background: "white", 
            border: `1px solid ${C.border}`, 
            boxShadow: "0 10px 50px rgba(45,155,78,0.08)" 
          }}>
          <div className="h-2 w-full absolute top-0 left-0 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${C.green}, ${C.gold}, ${C.green})` }} />
          <ProgressRing value={d.fundraisingCurrent} max={d.fundraisingGoal} color={C.gold} size={160} />
          <div className="text-center sm:text-left">
            <p className="text-sm font-black tracking-[0.24em] uppercase mb-3" style={{ color: C.gold }}>Fundraising</p>
            <p className="text-5xl font-black mb-3" style={{ color: C.green, fontFamily: "Georgia, serif" }}>
              {fmt(d.fundraisingCurrent)}
            </p>
            <p className="text-base font-bold mb-5" style={{ color: C.muted }}>raised of {fmt(d.fundraisingGoal)} goal</p>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: `${C.gold}22`, width: "100%", maxWidth: 220 }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ 
                  width: `${Math.min(100, (d.fundraisingCurrent / d.fundraisingGoal) * 100)}%`, 
                  background: `linear-gradient(90deg, ${C.gold}aa, ${C.gold})` 
                }} />
            </div>
            <p className="text-sm font-semibold mt-3" style={{ color: C.muted }}>{fmt(d.fundraisingGoal - d.fundraisingCurrent)} remaining</p>
          </div>
        </div>

        {/* Volunteer Hours */}
        <div className="rounded-3xl p-10 flex flex-col sm:flex-row items-center gap-10 transition-all duration-300 hover:shadow-2xl relative"
          style={{ 
            background: "white", 
            border: `1px solid ${C.border}`, 
            boxShadow: "0 10px 50px rgba(45,155,78,0.08)" 
          }}>
          <div className="h-2 w-full absolute top-0 left-0 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${C.green}, ${C.gold}, ${C.green})` }} />
          <ProgressRing value={d.volunteerHoursCurrent} max={d.volunteerHoursGoal} color={C.green} size={160} />
          <div className="text-center sm:text-left">
            <p className="text-sm font-black tracking-[0.24em] uppercase mb-3" style={{ color: C.green }}>Volunteer Hours</p>
            <p className="text-5xl font-black mb-3" style={{ color: C.green, fontFamily: "Georgia, serif" }}>
              {d.volunteerHoursCurrent}<span className="text-2xl font-bold" style={{ color: C.muted }}>h</span>
            </p>
            <p className="text-base font-bold mb-5" style={{ color: C.muted }}>of {d.volunteerHoursGoal}h annual goal</p>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: `${C.green}22`, width: "100%", maxWidth: 220 }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ 
                  width: `${Math.min(100, (d.volunteerHoursCurrent / d.volunteerHoursGoal) * 100)}%`, 
                  background: `linear-gradient(90deg, ${C.greenDark}aa, ${C.green})` 
                }} />
            </div>
            {d.nextEventName && <p className="text-sm font-semibold mt-3" style={{ color: C.muted }}>Next: {d.nextEventName} · {d.nextEventDate}</p>}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════
// EVENTS — Gradient timeline line with hover lift
// ═════════════════════════════════════════════════════════════
const CAT_COLORS: Record<string, string> = {
  Community: C.green, Meeting: C.blue, Academic: "#7c3aed",
  Fundraiser: C.gold, Spirit: C.red,
};

function EventCard({ event, index, total }: { event: SchoolEvent; index: number; total: number }) {
  const accent = CAT_COLORS[event.category] ?? C.silver;
  return (
    <div className="flex gap-7 group">
      {/* Timeline */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-6 h-6 rounded-full mt-1 transition-all duration-300 group-hover:scale-125 group-hover:shadow-xl"
          style={{ background: accent, boxShadow: `0 0 0 5px ${accent}22` }} />
        {index < total - 1 && (
          <div className="flex-1 w-0.5 mt-3" 
            style={{ background: `linear-gradient(to bottom, ${accent}66, transparent)` }} />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 pb-10 group">
        <div className="rounded-2xl p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          style={{ 
            background: "white", 
            border: `1px solid ${C.border}`, 
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)" 
          }}>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <h3 className="font-black text-xl" style={{ color: C.ink, fontFamily: "Georgia, serif" }}>
              {event.title}
            </h3>
            <span className="text-xs font-black px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}44` }}>
              {event.category}
            </span>
          </div>
          <p className="text-base font-medium leading-relaxed mb-5" style={{ color: C.muted }}>{event.description}</p>
          <div className="flex flex-wrap gap-5 text-sm font-semibold" style={{ color: C.muted }}>
            <span className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" style={{ color: accent }} />{event.date}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: accent }} />{event.time}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: accent }} />{event.location}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventTimelineSection({ events }: { events: SchoolEvent[] | null }) {
  const list = events ?? FALLBACK_EVENTS;
  return (
    <Section id="events">
      <SectionHeader eyebrow="What's Coming Up" title="Event Timeline" />
      <div className="max-w-3xl mx-auto max-h-[650px] overflow-y-auto pr-3">
        {list.length === 0
          ? <p className="text-center py-16 text-lg font-semibold" style={{ color: C.muted }}>No upcoming events found.</p>
          : list.map((e, i) => <EventCard key={e.id ?? i} event={e} index={i} total={list.length} />)}
      </div>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════
// VOLUNTEER FORM — Gold accent bar, refined spacing
// ═════════════════════════════════════════════════════════════
const INIT_VOL: VolunteerFormData = { volunteerName: "", volunteerEmail: "", eventName: "", hoursLogged: "", notes: "" };

function VolunteerFormSection() {
  const [form, setForm] = useState<VolunteerFormData>(INIT_VOL);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [touched, setTouched] = useState<Partial<Record<keyof VolunteerFormData, boolean>>>({});

  const set = (k: keyof VolunteerFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const touch = (k: keyof VolunteerFormData) => () => setTouched(t => ({ ...t, [k]: true }));

  const errors = {
    volunteerName:  !form.volunteerName.trim() && "Name is required.",
    volunteerEmail: !isValidEmail(form.volunteerEmail) && "Valid email required.",
    eventName:      !form.eventName.trim() && "Event name is required.",
    hoursLogged:    (!form.hoursLogged || isNaN(Number(form.hoursLogged)) || Number(form.hoursLogged) <= 0 || Number(form.hoursLogged) > 24) && "Enter hours (0.5–24).",
  };
  const isValid = !Object.values(errors).some(Boolean);

  const handleSubmit = useCallback(async () => {
    setTouched({ volunteerName: true, volunteerEmail: true, eventName: true, hoursLogged: true });
    if (!isValid) return;
    setStatus("loading");
    try {
      await postToSheet({
        tab: "VolunteerLog",
        volunteerName:  sanitizeInput(form.volunteerName),
        volunteerEmail: sanitizeInput(form.volunteerEmail),
        eventName:      sanitizeInput(form.eventName),
        hoursLogged:    String(parseFloat(form.hoursLogged)),
        notes:          sanitizeInput(form.notes),
        timestamp:      new Date().toISOString(),
      });
      setStatus("success"); setForm(INIT_VOL); setTouched({});
    } catch { setErrorMsg("Submission failed. Please try again."); setStatus("error"); }
  }, [form, isValid]);

  const reset = () => { setStatus("idle"); setErrorMsg(""); };

  return (
    <Section id="volunteer" cream>
      <SectionHeader eyebrow="Give Your Time" title="Log Volunteer Hours" />
      <div className="max-w-2xl mx-auto">
        <div className="rounded-3xl overflow-hidden relative"
          style={{ 
            background: "white", 
            border: `1px solid ${C.border}`, 
            boxShadow: "0 20px 70px rgba(45,155,78,0.12)" 
          }}>
          {/* Gold accent bar */}
          <div className="h-2" style={{ background: `linear-gradient(90deg, ${C.green}, ${C.gold}, ${C.green})` }} />

          {status === "success" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 rounded-3xl"
              style={{ background: "rgba(250,250,247,0.98)", backdropFilter: "blur(10px)" }}>
              <div className="w-28 h-28 rounded-full flex items-center justify-center"
                style={{ background: C.greenLight, border: `3px solid ${C.green}` }}>
                <CheckCircle className="w-14 h-14" style={{ color: C.green }} />
              </div>
              <div className="text-center">
                <h3 className="text-4xl font-black mb-3" style={{ color: C.green, fontFamily: "Georgia, serif" }}>
                  Hours Logged!
                </h3>
                <p className="text-base font-semibold" style={{ color: C.muted }}>Thank you — your hours have been recorded.</p>
              </div>
              <button onClick={reset} className="px-12 py-4 rounded-full text-base font-black tracking-wider uppercase text-white transition-all hover:opacity-90"
                style={{ background: C.green, letterSpacing: "0.1em" }}>
                Log More Hours
              </button>
            </div>
          )}

          <div className="p-10 space-y-6">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                  Full Name <span style={{ color: C.red }}>*</span>
                </label>
                <input type="text" placeholder="Jane Gator" value={form.volunteerName} onChange={set("volunteerName")}
                  onBlur={touch("volunteerName")} maxLength={100} autoComplete="name"
                  className={inputCls(!!touched.volunteerName && !!errors.volunteerName)}
                  style={{ borderColor: touched.volunteerName && errors.volunteerName ? "#f87171" : C.border }} />
                {touched.volunteerName && errors.volunteerName && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.volunteerName}</p>}
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                  Email <span style={{ color: C.red }}>*</span>
                </label>
                <input type="email" placeholder="jane@example.com" value={form.volunteerEmail} onChange={set("volunteerEmail")}
                  onBlur={touch("volunteerEmail")} maxLength={254} autoComplete="email"
                  className={inputCls(!!touched.volunteerEmail && !!errors.volunteerEmail)}
                  style={{ borderColor: touched.volunteerEmail && errors.volunteerEmail ? "#f87171" : C.border }} />
                {touched.volunteerEmail && errors.volunteerEmail && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.volunteerEmail}</p>}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                  Event Name <span style={{ color: C.red }}>*</span>
                </label>
                <input type="text" placeholder="Spring Carnival" value={form.eventName} onChange={set("eventName")}
                  onBlur={touch("eventName")} maxLength={150}
                  className={inputCls(!!touched.eventName && !!errors.eventName)}
                  style={{ borderColor: touched.eventName && errors.eventName ? "#f87171" : C.border }} />
                {touched.eventName && errors.eventName && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.eventName}</p>}
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                  Hours <span style={{ color: C.red }}>*</span>
                </label>
                <input type="number" placeholder="2.5" min="0.5" max="24" step="0.5" value={form.hoursLogged}
                  onChange={set("hoursLogged")} onBlur={touch("hoursLogged")}
                  className={inputCls(!!touched.hoursLogged && !!errors.hoursLogged)}
                  style={{ borderColor: touched.hoursLogged && errors.hoursLogged ? "#f87171" : C.border }} />
                {touched.hoursLogged && errors.hoursLogged && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.hoursLogged}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                Notes <span className="font-normal normal-case" style={{ color: C.silver }}>(optional)</span>
              </label>
              <textarea rows={4} placeholder="What did you help with?" value={form.notes} onChange={set("notes")}
                maxLength={500} className={inputCls() + " resize-none"}
                style={{ borderColor: C.border }} />
              <p className="text-right text-sm font-semibold mt-2" style={{ color: C.silver }}>{form.notes.length}/500</p>
            </div>
            {status === "error" && (
              <div className="flex items-center gap-3 p-4 rounded-xl text-base font-semibold"
                style={{ background: "#fef2f2", border: "1px solid #fecaca", color: C.red }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" /><span>{errorMsg}</span>
              </div>
            )}
            <button onClick={handleSubmit} disabled={status === "loading"}
              className={["w-full py-4 rounded-xl text-base font-black tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2",
                status === "loading" ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5"].join(" ")}
              style={{
                background: status === "loading" ? "#ccc" : `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
                color: "white", letterSpacing: "0.12em",
                boxShadow: status === "loading" ? "none" : `0 6px 32px ${C.green}66`,
              }}>
              {status === "loading"
                ? <><Loader2 className="w-5 h-5 animate-spin" />Submitting…</>
                : <><Sparkles className="w-5 h-5" />Submit Volunteer Hours</>}
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════
// SPONSORS — Warm gold tint on gold-tier cards
// ═════════════════════════════════════════════════════════════
const TIER_META: Record<string, { label: string; color: string; rank: number }> = {
  Gold:      { label: "Gold Partner",     color: C.gold,   rank: 1 },
  Silver:    { label: "Silver Partner",   color: C.silver, rank: 2 },
  Bronze:    { label: "Bronze Partner",   color: "#cd7f32", rank: 3 },
  Community: { label: "Community Friend", color: C.blue,   rank: 4 },
};

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const tier = TIER_META[sponsor.tier] ?? TIER_META["Community"];
  const isGold = sponsor.tier === "Gold";
  return (
    <div className="rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
      style={{
        background: isGold ? C.goldLight : "white",
        border: `1px solid ${isGold ? C.gold + "88" : C.border}`,
        boxShadow: isGold ? `0 6px 30px ${C.gold}44` : "0 4px 16px rgba(0,0,0,0.05)",
      }}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden font-black text-xl"
          style={{ background: `${tier.color}22`, border: `1.5px solid ${tier.color}66`, color: tier.color, fontFamily: "Georgia, serif" }}>
          {sponsor.logoUrl
            ? <Image src={sponsor.logoUrl} alt={sponsor.name} width={64} height={64} className="object-contain" />
            : sponsor.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-lg leading-tight" style={{ color: C.ink }}>
              {sponsor.name}
            </h3>
            {isGold && <Star className="w-5 h-5 flex-shrink-0" style={{ fill: C.gold, color: C.gold }} />}
          </div>
          <p className="text-xs font-black tracking-wide uppercase mb-2" style={{ color: tier.color }}>
            {tier.label}
          </p>
          {sponsor.tagline && <p className="text-sm font-medium leading-relaxed mb-2" style={{ color: C.muted }}>{sponsor.tagline}</p>}
          {sponsor.website && (
            <a href={sponsor.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm mt-2 font-bold transition-opacity hover:opacity-70"
              style={{ color: tier.color }}>
              Visit <ChevronRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function SponsorShowcaseSection({ sponsors }: { sponsors: Sponsor[] | null }) {
  const list = sponsors ?? FALLBACK_SPONSORS;
  return (
    <Section id="sponsors">
      <SectionHeader eyebrow="Community Partners" title="Our Sponsors" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {list.map((s, i) => <SponsorCard key={s.id ?? i} sponsor={s} />)}
      </div>
      <p className="text-center text-base font-semibold" style={{ color: C.muted }}>
        Interested in becoming a partner?{" "}
        <a href="#contact" className="font-black underline underline-offset-2" style={{ color: C.green }}>
          Contact the PTA →
        </a>
      </p>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════
// CALENDAR
// ═════════════════════════════════════════════════════════════
function CalendarSection() {
  return (
    <Section id="calendar" cream>
      <SectionHeader eyebrow="Stay Organized" title="School Calendar" />
      <div className="rounded-3xl overflow-hidden"
        style={{ border: `1px solid ${C.border}`, boxShadow: "0 20px 70px rgba(45,155,78,0.10)" }}>
        <div className="h-2" style={{ background: `linear-gradient(90deg, ${C.green}, ${C.gold}, ${C.green})` }} />
        <iframe src={CALENDAR_URL} className="w-full" style={{ height: 600, border: 0, display: "block" }}
          title="Bessey Creek Elementary School Calendar" loading="lazy" />
      </div>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════
// CONTACT — Gold accent bar, refined spacing
// ═════════════════════════════════════════════════════════════
const INIT_CONTACT: ContactFormData = { contactName: "", contactEmail: "", subject: "", message: "" };

function ContactSection() {
  const [form, setForm] = useState<ContactFormData>(INIT_CONTACT);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFormData, boolean>>>({});

  const set = (k: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const touch = (k: keyof ContactFormData) => () => setTouched(t => ({ ...t, [k]: true }));

  const errors = {
    contactName:  !form.contactName.trim() && "Name is required.",
    contactEmail: !isValidEmail(form.contactEmail) && "Valid email required.",
    subject:      !form.subject.trim() && "Subject is required.",
    message:      !form.message.trim() && "Message is required.",
  };
  const isValid = !Object.values(errors).some(Boolean);

  const handleSubmit = useCallback(async () => {
    setTouched({ contactName: true, contactEmail: true, subject: true, message: true });
    if (!isValid) return;
    setStatus("loading");
    try {
      await postToSheet({
        tab: "ContactForm",
        contactName:  sanitizeInput(form.contactName),
        contactEmail: sanitizeInput(form.contactEmail),
        subject:      sanitizeInput(form.subject),
        message:      sanitizeInput(form.message),
        timestamp:    new Date().toISOString(),
      });
      setStatus("success"); setForm(INIT_CONTACT); setTouched({});
    } catch { setErrorMsg("Submission failed. Please try again."); setStatus("error"); }
  }, [form, isValid]);

  const reset = () => { setStatus("idle"); setErrorMsg(""); };

  return (
    <Section id="contact">
      <SectionHeader eyebrow="Get Involved" title="Contact the PTA" />
      <div className="grid md:grid-cols-5 gap-10 max-w-5xl mx-auto">
        {/* Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl p-8" style={{ background: C.green }}>
            <p className="text-sm font-black tracking-[0.24em] uppercase mb-6" style={{ color: C.gold }}>
              Reach Us
            </p>
            {[
              { icon: Mail,  text: "residencybce@martin.k12.fl.us", href: "mailto:residencybce@martin.k12.fl.us" },
              { icon: Phone, text: "(772) 219-1500", href: "tel:7722191500" },
              { icon: MapPin,text: "2201 SW Matheson Avenue, Palm City, FL", href: "https://maps.google.com/?q=2201+SW+Matheson+Avenue+Palm+City+FL" },
              { icon: Globe, text: "martinschools.org/o/bces", href: "https://martinschools.org/o/bces" },
            ].map(({ icon: Icon, text, href }) => (
              <div key={text} className="flex items-start gap-4 mb-5 last:mb-0">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${C.gold}33`, border: `1px solid ${C.gold}55` }}>
                  <Icon className="w-5 h-5" style={{ color: C.gold }} />
                </div>
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-base font-semibold hover:opacity-80 transition-opacity" style={{ color: "rgba(255,255,255,0.95)" }}>
                  {text}
                </a>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-8" style={{ background: C.greenLight, border: `1px solid ${C.border}` }}>
            <p className="text-sm font-black tracking-[0.24em] uppercase mb-6" style={{ color: C.green }}>Follow Us</p>
            <div className="flex gap-4">
              {[
                { icon: Facebook,  label: "Facebook",  href: "https://www.facebook.com/BCEGators/" },
                { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/besseycreekelementary/" },
                { icon: Globe,     label: "PTA Shop",  href: "https://bceptafl.givebacks.com/shop" },
              ].map(({ icon: Icon, label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-14 h-14 rounded-xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg"
                  style={{ background: "white", border: `1px solid ${C.border}` }}>
                  <Icon className="w-6 h-6" style={{ color: C.green }} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-3">
          <div className="rounded-3xl overflow-hidden relative"
            style={{ 
              background: "white", 
              border: `1px solid ${C.border}`, 
              boxShadow: "0 20px 70px rgba(45,155,78,0.12)" 
            }}>
            <div className="h-2" style={{ background: `linear-gradient(90deg, ${C.green}, ${C.gold}, ${C.green})` }} />

            {status === "success" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 rounded-3xl"
                style={{ background: "rgba(250,250,247,0.98)", backdropFilter: "blur(10px)" }}>
                <div className="w-28 h-28 rounded-full flex items-center justify-center"
                  style={{ background: C.greenLight, border: `3px solid ${C.green}` }}>
                  <CheckCircle className="w-14 h-14" style={{ color: C.green }} />
                </div>
                <div className="text-center">
                  <h3 className="text-4xl font-black mb-3" style={{ color: C.green, fontFamily: "Georgia, serif" }}>
                    Message Sent!
                  </h3>
                  <p className="text-base font-semibold" style={{ color: C.muted }}>We&apos;ll get back to you soon.</p>
                </div>
                <button onClick={reset} className="px-12 py-4 rounded-full text-base font-black tracking-wider uppercase text-white hover:opacity-90"
                  style={{ background: C.green, letterSpacing: "0.1em" }}>Send Another</button>
              </div>
            )}

            <div className="p-10 space-y-6">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                    Name <span style={{ color: C.red }}>*</span>
                  </label>
                  <input type="text" placeholder="Your name" value={form.contactName} onChange={set("contactName")}
                    onBlur={touch("contactName")} maxLength={100}
                    className={inputCls(!!touched.contactName && !!errors.contactName)}
                    style={{ borderColor: touched.contactName && errors.contactName ? "#f87171" : C.border }} />
                  {touched.contactName && errors.contactName && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.contactName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                    Email <span style={{ color: C.red }}>*</span>
                  </label>
                  <input type="email" placeholder="your@email.com" value={form.contactEmail} onChange={set("contactEmail")}
                    onBlur={touch("contactEmail")} maxLength={254}
                    className={inputCls(!!touched.contactEmail && !!errors.contactEmail)}
                    style={{ borderColor: touched.contactEmail && errors.contactEmail ? "#f87171" : C.border }} />
                  {touched.contactEmail && errors.contactEmail && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.contactEmail}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                  Subject <span style={{ color: C.red }}>*</span>
                </label>
                <input type="text" placeholder="How can we help?" value={form.subject} onChange={set("subject")}
                  onBlur={touch("subject")} maxLength={200}
                  className={inputCls(!!touched.subject && !!errors.subject)}
                  style={{ borderColor: touched.subject && errors.subject ? "#f87171" : C.border }} />
                {touched.subject && errors.subject && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.subject}</p>}
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                  Message <span style={{ color: C.red }}>*</span>
                </label>
                <textarea rows={5} placeholder="Your message…" value={form.message} onChange={set("message")}
                  onBlur={touch("message")} maxLength={500}
                  className={inputCls(!!touched.message && !!errors.message) + " resize-none"}
                  style={{ borderColor: touched.message && errors.message ? "#f87171" : C.border }} />
                {touched.message && errors.message && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.message}</p>}
              </div>
              {status === "error" && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-base font-semibold"
                  style={{ background: "#fef2f2", border: "1px solid #fecaca", color: C.red }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /><span>{errorMsg}</span>
                </div>
              )}
              <button onClick={handleSubmit} disabled={status === "loading"}
                className={["w-full py-4 rounded-xl text-base font-black tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2",
                  status === "loading" ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5"].join(" ")}
                style={{
                  background: status === "loading" ? "#ccc" : `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
                  color: "white", letterSpacing: "0.12em",
                  boxShadow: status === "loading" ? "none" : `0 6px 32px ${C.green}66`,
                }}>
                {status === "loading"
                  ? <><Loader2 className="w-5 h-5 animate-spin" />Sending…</>
                  : <><Mail className="w-5 h-5" />Send Message</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ═════════════════════════════════════════════════════════════
// FOOTER — Full vibrant green with centered editorial layout
// ═════════════════════════════════════════════════════════════
function Footer() {
  return (
    <footer style={{ background: C.green, borderTop: `2px solid ${C.gold}66` }}>
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col items-center text-center">
          <Image src={LOGO_URL} alt="Bessey Creek Elementary" width={90} height={90} className="rounded-full mb-7"
            style={{ border: `3px solid ${C.gold}66`, opacity: 0.95 }} />
          <p className="text-sm font-bold tracking-[0.3em] uppercase mb-3" style={{ color: C.gold }}>
            Bessey Creek Elementary
          </p>
          <p className="text-4xl font-black mb-10" style={{ color: "white", fontFamily: "'Playfair Display', Georgia, serif" }}>
            The Gator Grid
          </p>
          {/* Divider */}
          <div className="flex items-center gap-5 mb-10 w-full max-w-md">
            <div className="flex-1 h-px" style={{ background: `${C.gold}55` }} />
            <div className="w-2 h-2 rotate-45" style={{ background: `${C.gold}88` }} />
            <div className="flex-1 h-px" style={{ background: `${C.gold}55` }} />
          </div>
          <p className="text-sm font-bold tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.80)" }}>
            STAY SAFE · TAKE RESPONSIBILITY · ACTIVELY LEARN · RESPECT OTHERS
          </p>
          <p className="text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.70)" }}>
            2201 SW Matheson Avenue, Palm City, FL
          </p>
          <p className="text-sm mt-6 font-semibold" style={{ color: "rgba(255,255,255,0.60)" }}>
            © {new Date().getFullYear()} Bessey Creek Elementary PTA · All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}

// ═════════════════════════════════════════════════════════════
// ROOT PAGE
// ═════════════════════════════════════════════════════════════
export default function GatorGridPage() {
  const [dashboard,     setDashboard]     = useState<DashboardData  | null>(null);
  const [events,        setEvents]        = useState<SchoolEvent[]  | null>(null);
  const [sponsors,      setSponsors]      = useState<Sponsor[]      | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [mounted,       setMounted]       = useState(false);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetchTab<DashboardData>  ("Dashboard",     FALLBACK_DASHBOARD).then(setDashboard),
      fetchTab<SchoolEvent[]>  ("Events",        FALLBACK_EVENTS).then(setEvents),
      fetchTab<Sponsor[]>      ("Sponsors",      FALLBACK_SPONSORS).then(setSponsors),
      fetchTab<Announcement[]> ("Announcements", FALLBACK_ANNOUNCEMENTS).then(setAnnouncements),
    ]);
  }, []);

  const dashData = mounted ? dashboard     : FALLBACK_DASHBOARD;
  const evData   = mounted ? events        : FALLBACK_EVENTS;
  const spData   = mounted ? sponsors      : FALLBACK_SPONSORS;
  const annData  = mounted ? (announcements ?? FALLBACK_ANNOUNCEMENTS) : FALLBACK_ANNOUNCEMENTS;

  return (
    <div className="min-h-screen" style={{ background: "white", fontFamily: "'Lato', sans-serif" }}>
      <AnnouncementBanner announcements={annData} />
      <Navbar />
      <HeroSection />
      <StarValuesSection />
      <DashboardSection data={dashData} />
      <EventTimelineSection events={evData} />
      <VolunteerFormSection />
      <SponsorShowcaseSection sponsors={spData} />
      <CalendarSection />
      <ContactSection />
      <Footer />
    </div>
  );
}

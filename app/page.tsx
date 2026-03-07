"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  CalendarDays, Star, Gift,
  CheckCircle, Clock, MapPin, Loader2, AlertCircle,
  Sparkles, X, Menu, Bell, Mail, Phone, Facebook, Instagram,
  Globe, ExternalLink, ShoppingBag, ChevronRight,
} from "lucide-react";

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
interface PrincipalMessage {
  name?: string; message?: string; imageUrl?: string;
}
interface WishlistItem {
  id: string; teacherName: string; grade: string;
  item: string; storeLink?: string;
  priority: "High" | "Medium" | "Low"; notes?: string;
}
interface WishlistClaim {
  itemId: string; claimedBy: string; timestamp: string;
}
interface VolunteerFormData {
  volunteerName: string; volunteerEmail: string;
  eventName: string; hoursLogged: string; notes: string;
}
interface ContactFormData {
  contactName: string; contactEmail: string; subject: string; message: string;
}
interface ClaimFormData {
  firstName: string; lastName: string; studentName: string; email: string;
}
type FormStatus = "idle" | "loading" | "success" | "error";

function sanitizeInput(v: string): string {
  return v.replace(/<[^>]*>/g, "").replace(/[<>"'`]/g, "").trim().slice(0, 500);
}
function isValidEmail(e: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(e);
}
function toNum(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function fmtDollar(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "$—";
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
}

const API_URL =
  "https://script.google.com/macros/s/AKfycbxhrhbumi52sQWYiDrGqjBKTqtcq9hksD0XuNchhHBF-Q4X3Q2wUgcfHiZv7K6YeT3oWw/exec";
const LOGO_URL =
  "https://cmsv2-assets.apptegy.net/uploads/7712/logo/8923/Martin_County_Bessey_Creek_Circle_Crest_Logo__2_.png";

const C = {
  green:      "#2D9B4E",
  greenDark:  "#1e7039",
  greenBg:    "#e8f5ec",
  greenLight: "#f0f9f3",
  gold:       "#D4AF37",
  goldLight:  "#f5edd6",
  ink:        "#1a1f1a",
  muted:      "#3d4f3d",
  border:     "#d4e0d4",
  red:        "#c0392b",
  blue:       "#2874A6",
  silver:     "#6b7b6b",
};

const NAV_LINKS = [
  { label: "Events",    href: "#events"    },
  { label: "Wishlist",  href: "#wishlist"  },
  { label: "Volunteer", href: "#volunteer" },
  { label: "Progress",  href: "#progress"  },
  { label: "Sponsors",  href: "#sponsors"  },
  { label: "Contact",   href: "#contact"   },
];

const FALLBACK_DASHBOARD: DashboardData = {
  fundraisingGoal: 25000, fundraisingCurrent: 18500,
  volunteerHoursGoal: 1000, volunteerHoursCurrent: 742,
  nextEventName: "Spring Book Fair", nextEventDate: "April 15, 2025",
};
const FALLBACK_EVENTS: SchoolEvent[] = [
  { id: "1", title: "Spring Book Fair",    date: "April 15, 2025",  time: "9:00 AM – 4:00 PM",  location: "Media Center",    description: "Browse and purchase books to support our library. All purchases benefit BCE students!",  category: "Fundraiser" },
  { id: "2", title: "PTA General Meeting", date: "April 22, 2025",  time: "6:30 PM",             location: "Cafeteria",       description: "Monthly PTA meeting open to all parents and community members.",                         category: "Meeting"    },
  { id: "3", title: "STEM Fair",           date: "May 6, 2025",     time: "5:30 PM – 7:30 PM",   location: "Gymnasium",       description: "Celebrate STEM with hands-on activities and student project demonstrations.",               category: "Academic"   },
  { id: "4", title: "Field Day",           date: "May 20, 2025",    time: "8:30 AM – 2:00 PM",   location: "Athletic Fields", description: "Annual field day with games and relay races. Volunteers needed!",                          category: "Community"  },
];
const FALLBACK_SPONSORS: Sponsor[] = [
  { id: "1", name: "Gator Grille & Sports Bar",  tier: "Gold",      tagline: "Fueling Gator Pride since 2010"          },
  { id: "2", name: "Treasure Coast Pediatrics",  tier: "Gold",      tagline: "Caring for our community's children"     },
  { id: "3", name: "Palm City Insurance Group",  tier: "Silver",    tagline: "Protecting families, supporting schools"  },
  { id: "4", name: "Martin County Credit Union", tier: "Silver",    tagline: "Your local financial partner"             },
  { id: "5", name: "Bessey Creek Dental Care",   tier: "Bronze",    tagline: "Healthy smiles for Gator families"        },
  { id: "6", name: "First Bank of Florida",      tier: "Community", tagline: "Investing in tomorrow's leaders"          },
];
const FALLBACK_ANNOUNCEMENTS: Announcement[] = [
  { id: "1", message: "🎉 Spring Book Fair starts April 15th — stop by the Media Center and support our students!", type: "success" },
];
const FALLBACK_PRINCIPAL: PrincipalMessage = {
  name: "Our Principal",
  message: "Welcome to Bessey Creek Elementary — a place where every Gator is empowered to Stay Safe, Take Responsibility, Actively Learn, and Respect Others. We are so grateful for our incredible PTA community and the parents who make this school extraordinary every single day. Go Gators!",
};
const FALLBACK_WISHLIST: WishlistItem[] = [
  { id: "1", teacherName: "Mrs. Smith",   grade: "2nd Grade", item: "Dry erase markers (set of 10)",      priority: "High",   notes: "Any color set works!"  },
  { id: "2", teacherName: "Mr. Johnson",  grade: "4th Grade", item: "Composition notebooks (pack of 10)", priority: "High",   notes: "Wide ruled please"     },
  { id: "3", teacherName: "Ms. Rivera",   grade: "1st Grade", item: "Crayons (24-pack)",                  priority: "Medium", notes: "Crayola preferred"     },
  { id: "4", teacherName: "Mrs. Patel",   grade: "3rd Grade", item: "Sticky notes (assorted colors)",     priority: "Medium", notes: "3x3 size"              },
  { id: "5", teacherName: "Mr. Williams", grade: "5th Grade", item: "Index cards (200 pack)",             priority: "Low",    notes: "Lined, 4x6"            },
];

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
    method: "POST", mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload).toString(),
  });
}

const diamondDivider = (
  <div className="flex items-center gap-4 my-6">
    <div className="flex-1 h-px" style={{ background: `linear-gradient(to right,transparent,${C.gold}66,transparent)` }} />
    <div className="w-1.5 h-1.5 rotate-45" style={{ background: C.gold }} />
    <div className="flex-1 h-px" style={{ background: `linear-gradient(to right,transparent,${C.gold}66,transparent)` }} />
  </div>
);
function inputCls(err?: boolean) {
  return [
    "w-full rounded-xl px-4 py-3.5 text-base font-medium transition-all duration-200 outline-none border focus:ring-2",
    err ? "border-red-400 bg-red-50 focus:ring-red-100" : "bg-white focus:bg-white",
  ].join(" ");
}
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
      <p className="text-sm font-bold tracking-[0.3em] uppercase mb-3" style={{ color: C.gold }}>{eyebrow}</p>
      <h2 className="text-5xl md:text-6xl font-black" style={{ color: C.green, fontFamily: "'Playfair Display',Georgia,serif", letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      {diamondDivider}
    </div>
  );
}

function AnnouncementBanner({ announcements }: { announcements: Announcement[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (!visible.length) return null;
  const ann = visible[0];
  return (
    <div className="w-full px-6 py-3 flex items-center justify-between gap-4"
      style={{ background: C.green, borderBottom: `2px solid ${C.gold}` }}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Bell className="w-4 h-4 flex-shrink-0" style={{ color: C.gold }} />
        <p className="text-sm font-semibold tracking-wide truncate" style={{ color: "white" }}>{ann.message}</p>
      </div>
      <button onClick={() => setDismissed(d => new Set([...d, ann.id]))}
        className="flex-shrink-0 p-1 rounded hover:opacity-70" aria-label="Dismiss">
        <X className="w-4 h-4" style={{ color: C.gold }} />
      </button>
    </div>
  );
}

function Navbar() {
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full transition-all duration-500"
      style={{
        background:     scrolled ? "rgba(255,255,255,0.98)" : "white",
        borderBottom:   `1px solid ${C.border}44`,
        boxShadow:      scrolled ? "0 4px 32px rgba(45,155,78,0.08)" : "none",
        backdropFilter: scrolled ? "blur(12px)" : "none",
      }}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-6" style={{ height: 72 }}>
        <a href="#top" className="flex items-center gap-3 flex-shrink-0 group">
          <Image src={LOGO_URL} alt="Bessey Creek Elementary" width={48} height={48}
            className="rounded-full transition-transform duration-300 group-hover:scale-105"
            style={{ border: `2px solid ${C.gold}44` }} />
          <div className="hidden sm:block">
            <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: C.gold, fontFamily: "Georgia,serif" }}>Bessey Creek</p>
            <p className="text-base font-black leading-tight" style={{ color: C.green, fontFamily: "'Playfair Display',Georgia,serif" }}>The Gator Grid</p>
          </div>
        </a>
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href}
              className="px-3 py-2.5 rounded-lg text-sm font-bold tracking-wider uppercase transition-all hover:bg-green-50"
              style={{ color: C.muted, letterSpacing: "0.07em" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = C.green; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = C.muted; }}>
              {l.label}
            </a>
          ))}
          <a href="https://bceptafl.givebacks.com/shop" target="_blank" rel="noopener noreferrer"
            className="ml-3 px-5 py-2.5 rounded-full text-sm font-black uppercase hover:opacity-90"
            style={{ background: C.green, color: "white", letterSpacing: "0.08em" }}>
            PTA Shop
          </a>
        </div>
        <div className="md:hidden relative" ref={menuRef}>
          <button onClick={() => setOpen(v => !v)} className="p-3 rounded-lg hover:bg-green-50" aria-label="Menu">
            {open ? <X className="w-6 h-6" style={{ color: C.green }} /> : <Menu className="w-6 h-6" style={{ color: C.green }} />}
          </button>
          {open && (
            <div className="absolute right-0 top-14 w-56 rounded-2xl overflow-hidden z-50"
              style={{ background: "white", border: `1px solid ${C.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
              {NAV_LINKS.map(l => (
                <a key={l.label} href={l.href} onClick={() => setOpen(false)}
                  className="flex items-center px-5 py-4 text-sm font-bold uppercase tracking-wider hover:bg-green-50"
                  style={{ color: C.muted, borderBottom: `1px solid ${C.border}`, letterSpacing: "0.08em" }}>
                  {l.label}
                </a>
              ))}
              <a href="https://bceptafl.givebacks.com/shop" target="_blank" rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center px-5 py-4 text-sm font-bold uppercase tracking-wider"
                style={{ color: C.green, letterSpacing: "0.08em" }}>PTA Shop</a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// Quick Stats Bar — always visible, actionable at a glance
function QuickStatsBar({ dashboard, wishlistCount, claimedCount }: {
  dashboard: DashboardData | null;
  wishlistCount: number;
  claimedCount: number;
}) {
  const d = dashboard ?? FALLBACK_DASHBOARD;
  const needed = wishlistCount - claimedCount;
  return (
    <div className="w-full py-3 px-4 overflow-x-auto" style={{ background: C.goldLight, borderBottom: `1px solid ${C.gold}55` }}>
      <div className="flex items-center justify-center gap-2 md:gap-6 min-w-max mx-auto text-sm font-bold flex-wrap">
        {d.nextEventName && (
          <a href="#events" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
            style={{ color: C.greenDark }}>
            <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: C.green }} />
            <span>Next: <strong>{d.nextEventName}</strong>{d.nextEventDate ? ` · ${d.nextEventDate}` : ""}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        )}
        <div className="h-4 w-px hidden md:block" style={{ background: `${C.gold}88` }} />
        {needed > 0 && (
          <a href="#wishlist" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
            style={{ color: C.greenDark }}>
            <Gift className="w-4 h-4 flex-shrink-0" style={{ color: C.red }} />
            <span><strong>{needed} classroom items</strong> still needed</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        )}
        <div className="h-4 w-px hidden md:block" style={{ background: `${C.gold}88` }} />
        <a href="#volunteer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
          style={{ color: C.greenDark }}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: C.green }} />
          <span>Log your volunteer hours</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden" style={{ background: C.green, minHeight: 520 }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 20% 50%,${C.greenDark}66 0%,transparent 60%),radial-gradient(circle at 80% 20%,${C.gold}22 0%,transparent 50%)` }} />
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)`, backgroundSize: "64px 64px" }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right,transparent,${C.gold}88,transparent)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right,transparent,${C.gold}66,transparent)` }} />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 flex flex-col items-center text-center">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px w-12" style={{ background: C.gold }} />
          <p className="text-sm font-bold tracking-[0.3em] uppercase" style={{ color: C.gold }}>Bessey Creek Elementary · PTA</p>
          <div className="h-px w-12" style={{ background: C.gold }} />
        </div>
        <div className="relative mb-7">
          <div className="absolute inset-0 rounded-full blur-2xl scale-110" style={{ background: `${C.gold}33` }} />
          <Image src={LOGO_URL} alt="Bessey Creek Elementary" width={130} height={130} priority
            className="relative rounded-full"
            style={{ border: `3px solid ${C.gold}88`, boxShadow: `0 0 0 10px ${C.gold}33,0 0 0 20px ${C.gold}18,0 20px 60px rgba(0,0,0,0.45)` }} />
        </div>
        <h1 className="mb-4" style={{ fontFamily: "'Playfair Display',Georgia,serif" }}>
          <span className="block text-lg font-bold tracking-[0.25em] uppercase mb-2" style={{ color: C.gold }}>Welcome to</span>
          <span className="block font-black" style={{ color: "white", fontSize: "clamp(2.8rem,7vw,5.5rem)", lineHeight: 1.02, letterSpacing: "-0.025em" }}>The Gator Grid</span>
        </h1>
        <p className="max-w-lg text-lg font-medium leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.95)" }}>
          See what&apos;s happening at BCE — events, teacher needs, volunteer hours, and ways to get involved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="#wishlist" className="px-8 py-4 rounded-full text-base font-black uppercase transition-all duration-300 hover:scale-[1.03]"
            style={{ background: `linear-gradient(135deg,${C.gold},#f0c75e)`, color: C.greenDark, letterSpacing: "0.1em", boxShadow: `0 6px 28px ${C.gold}66` }}>
            Teachers Need These →
          </a>
          <a href="#events" className="px-8 py-4 rounded-full text-base font-black uppercase transition-all duration-300 hover:bg-white hover:text-green-900"
            style={{ border: `2px solid ${C.gold}88`, color: "white", letterSpacing: "0.1em" }}>
            What&apos;s Coming Up
          </a>
        </div>
      </div>
    </section>
  );
}

function PrincipalSection({ data }: { data: PrincipalMessage | null }) {
  const d = data ?? FALLBACK_PRINCIPAL;
  if (!d.message) return null;
  return (
    <Section id="principal">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl overflow-hidden relative"
          style={{ background: `linear-gradient(135deg,${C.greenDark},${C.green})`, boxShadow: `0 20px 70px ${C.green}44` }}>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
          <div className="p-10 md:p-14 flex flex-col md:flex-row items-center gap-8">
            {d.imageUrl ? (
              <Image src={d.imageUrl} alt={d.name || "Principal"} width={120} height={120}
                className="rounded-full flex-shrink-0 object-cover"
                style={{ border: `3px solid ${C.gold}88`, boxShadow: `0 0 0 6px ${C.gold}33` }} />
            ) : (
              <div className="w-28 h-28 rounded-full flex-shrink-0 flex items-center justify-center font-black text-4xl"
                style={{ background: `${C.gold}33`, border: `3px solid ${C.gold}88`, color: C.gold, fontFamily: "Georgia,serif" }}>
                {(d.name || "P")[0]}
              </div>
            )}
            <div className="text-center md:text-left">
              <p className="text-xs font-black tracking-[0.3em] uppercase mb-3" style={{ color: `${C.gold}cc` }}>
                A Message From Our Principal — Shared With Permission
              </p>
              <h3 className="text-2xl font-black mb-4" style={{ color: "white", fontFamily: "'Playfair Display',Georgia,serif" }}>
                {d.name || "Our Principal"}
              </h3>
              <p className="text-base font-medium leading-relaxed" style={{ color: "rgba(255,255,255,0.90)" }}>
                &ldquo;{d.message}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ProgressRing({ value, max, color, size = 150 }: { value: number; max: number; color: string; size?: number }) {
  const safePct = max > 0 && Number.isFinite(value) && Number.isFinite(max)
    ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const r = 45, circ = 2 * Math.PI * r, dash = (safePct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke={`${color}22`} strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 1.2s ease" }} />
      <text x="50" y="44" textAnchor="middle" fill={color} fontSize="20" fontWeight="900" fontFamily="Georgia,serif">{Math.round(safePct)}%</text>
      <text x="50" y="64" textAnchor="middle" fill={color} fontSize="8" fontWeight="600" fontFamily="sans-serif" opacity="0.8">of goal</text>
    </svg>
  );
}

function DashboardSection({ data }: { data: DashboardData | null }) {
  const raw = data ?? FALLBACK_DASHBOARD;
  const d: DashboardData = {
    fundraisingGoal:       toNum(raw.fundraisingGoal,       FALLBACK_DASHBOARD.fundraisingGoal),
    fundraisingCurrent:    toNum(raw.fundraisingCurrent,    FALLBACK_DASHBOARD.fundraisingCurrent),
    volunteerHoursGoal:    toNum(raw.volunteerHoursGoal,    FALLBACK_DASHBOARD.volunteerHoursGoal),
    volunteerHoursCurrent: toNum(raw.volunteerHoursCurrent, FALLBACK_DASHBOARD.volunteerHoursCurrent),
    nextEventName: raw.nextEventName,
    nextEventDate:  raw.nextEventDate,
  };
  const remaining = d.fundraisingGoal - d.fundraisingCurrent;
  return (
    <Section id="progress" cream>
      <SectionHeader eyebrow="Community Impact" title="Gator Progress" />
      <div className="grid md:grid-cols-2 gap-10">
        <div className="rounded-3xl p-10 flex flex-col sm:flex-row items-center gap-10 hover:shadow-2xl relative transition-all duration-300"
          style={{ background: "white", border: `1px solid ${C.border}`, boxShadow: "0 10px 50px rgba(45,155,78,0.08)" }}>
          <div className="h-2 w-full absolute top-0 left-0 rounded-t-3xl" style={{ background: `linear-gradient(90deg,${C.green},${C.gold},${C.green})` }} />
          <ProgressRing value={d.fundraisingCurrent} max={d.fundraisingGoal} color={C.gold} size={160} />
          <div className="text-center sm:text-left">
            <p className="text-sm font-black tracking-[0.24em] uppercase mb-3" style={{ color: C.gold }}>Fundraising</p>
            <p className="text-5xl font-black mb-3" style={{ color: C.green, fontFamily: "Georgia,serif" }}>{fmtDollar(d.fundraisingCurrent)}</p>
            <p className="text-base font-bold mb-5" style={{ color: C.muted }}>raised of {fmtDollar(d.fundraisingGoal)} goal</p>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: `${C.gold}22`, maxWidth: 220 }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${d.fundraisingGoal > 0 ? Math.min(100, (d.fundraisingCurrent / d.fundraisingGoal) * 100) : 0}%`, background: `linear-gradient(90deg,${C.gold}aa,${C.gold})` }} />
            </div>
            <p className="text-sm font-semibold mt-3" style={{ color: C.muted }}>
              {remaining > 0 ? `${fmtDollar(remaining)} remaining` : "Goal reached! 🎉"}
            </p>
          </div>
        </div>
        <div className="rounded-3xl p-10 flex flex-col sm:flex-row items-center gap-10 hover:shadow-2xl relative transition-all duration-300"
          style={{ background: "white", border: `1px solid ${C.border}`, boxShadow: "0 10px 50px rgba(45,155,78,0.08)" }}>
          <div className="h-2 w-full absolute top-0 left-0 rounded-t-3xl" style={{ background: `linear-gradient(90deg,${C.green},${C.gold},${C.green})` }} />
          <ProgressRing value={d.volunteerHoursCurrent} max={d.volunteerHoursGoal} color={C.green} size={160} />
          <div className="text-center sm:text-left">
            <p className="text-sm font-black tracking-[0.24em] uppercase mb-3" style={{ color: C.green }}>Volunteer Hours</p>
            <p className="text-5xl font-black mb-3" style={{ color: C.green, fontFamily: "Georgia,serif" }}>
              {d.volunteerHoursCurrent}<span className="text-2xl font-bold" style={{ color: C.muted }}>h</span>
            </p>
            <p className="text-base font-bold mb-5" style={{ color: C.muted }}>of {d.volunteerHoursGoal}h annual goal</p>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: `${C.green}22`, maxWidth: 220 }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${d.volunteerHoursGoal > 0 ? Math.min(100, (d.volunteerHoursCurrent / d.volunteerHoursGoal) * 100) : 0}%`, background: `linear-gradient(90deg,${C.greenDark}aa,${C.green})` }} />
            </div>
            {d.nextEventName && <p className="text-sm font-semibold mt-3" style={{ color: C.muted }}>Next: {d.nextEventName}{d.nextEventDate ? ` · ${d.nextEventDate}` : ""}</p>}
          </div>
        </div>
      </div>
    </Section>
  );
}

const CAT_COLORS: Record<string, string> = {
  Community: C.green, Meeting: C.blue, Academic: "#7c3aed", Fundraiser: C.gold, Spirit: C.red,
};

function EventCard({ event, index, total }: { event: SchoolEvent; index: number; total: number }) {
  const accent = CAT_COLORS[event.category] ?? C.silver;
  return (
    <div className="flex gap-7 group">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-6 h-6 rounded-full mt-1 transition-all duration-300 group-hover:scale-125"
          style={{ background: accent, boxShadow: `0 0 0 5px ${accent}22` }} />
        {index < total - 1 && <div className="flex-1 w-0.5 mt-3" style={{ background: `linear-gradient(to bottom,${accent}66,transparent)` }} />}
      </div>
      <div className="flex-1 pb-10">
        <div className="rounded-2xl p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          style={{ background: "white", border: `1px solid ${C.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <h3 className="font-black text-xl" style={{ color: C.ink, fontFamily: "Georgia,serif" }}>{event.title}</h3>
            <span className="text-xs font-black px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}44` }}>{event.category}</span>
          </div>
          <p className="text-base font-medium leading-relaxed mb-5" style={{ color: C.muted }}>{event.description}</p>
          <div className="flex flex-wrap gap-5 text-sm font-semibold" style={{ color: C.muted }}>
            <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" style={{ color: accent }} />{event.date}</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4" style={{ color: accent }} />{event.time}</span>
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4" style={{ color: accent }} />{event.location}</span>
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
      <SectionHeader eyebrow="What's Happening at BCE" title="Upcoming Events" />
      <div className="max-w-3xl mx-auto max-h-[650px] overflow-y-auto pr-3">
        {list.length === 0
          ? <p className="text-center py-16 text-lg font-semibold" style={{ color: C.muted }}>No upcoming events. Check back soon!</p>
          : list.map((e, i) => <EventCard key={e.id ?? i} event={e} index={i} total={list.length} />)}
      </div>
    </Section>
  );
}

const INIT_VOL: VolunteerFormData = { volunteerName: "", volunteerEmail: "", eventName: "", hoursLogged: "", notes: "" };

function VolunteerFormSection() {
  const [form, setForm]       = useState<VolunteerFormData>(INIT_VOL);
  const [status, setStatus]   = useState<FormStatus>("idle");
  const [errorMsg, setErr]    = useState("");
  const [touched, setTouched] = useState<Partial<Record<keyof VolunteerFormData, boolean>>>({});

  const set   = (k: keyof VolunteerFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
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
      await postToSheet({ tab: "VolunteerLog", volunteerName: sanitizeInput(form.volunteerName), volunteerEmail: sanitizeInput(form.volunteerEmail), eventName: sanitizeInput(form.eventName), hoursLogged: String(parseFloat(form.hoursLogged)), notes: sanitizeInput(form.notes), timestamp: new Date().toISOString() });
      setStatus("success"); setForm(INIT_VOL); setTouched({});
    } catch { setErr("Submission failed. Please try again."); setStatus("error"); }
  }, [form, isValid]);

  return (
    <Section id="volunteer" cream>
      <SectionHeader eyebrow="I Helped Out" title="Log Volunteer Hours" />
      <div className="max-w-2xl mx-auto">
        <div className="rounded-3xl overflow-hidden relative"
          style={{ background: "white", border: `1px solid ${C.border}`, boxShadow: "0 20px 70px rgba(45,155,78,0.12)" }}>
          <div className="h-2" style={{ background: `linear-gradient(90deg,${C.green},${C.gold},${C.green})` }} />
          {status === "success" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 rounded-3xl"
              style={{ background: "rgba(250,250,247,0.98)", backdropFilter: "blur(10px)" }}>
              <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: C.greenLight, border: `3px solid ${C.green}` }}>
                <CheckCircle className="w-14 h-14" style={{ color: C.green }} />
              </div>
              <div className="text-center">
                <h3 className="text-4xl font-black mb-3" style={{ color: C.green, fontFamily: "Georgia,serif" }}>Hours Logged!</h3>
                <p className="text-base font-semibold" style={{ color: C.muted }}>Thank you — a confirmation email is on its way.</p>
              </div>
              <button onClick={() => { setStatus("idle"); setErr(""); }} className="px-12 py-4 rounded-full text-base font-black uppercase text-white hover:opacity-90" style={{ background: C.green, letterSpacing: "0.1em" }}>Log More Hours</button>
            </div>
          )}
          <div className="p-10 space-y-6">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>Full Name <span style={{ color: C.red }}>*</span></label>
                <input type="text" placeholder="Jane Gator" value={form.volunteerName} onChange={set("volunteerName")} onBlur={touch("volunteerName")} maxLength={100} autoComplete="name" className={inputCls(!!touched.volunteerName && !!errors.volunteerName)} style={{ borderColor: touched.volunteerName && errors.volunteerName ? "#f87171" : C.border }} />
                {touched.volunteerName && errors.volunteerName && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.volunteerName}</p>}
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>Email <span style={{ color: C.red }}>*</span></label>
                <input type="email" placeholder="jane@example.com" value={form.volunteerEmail} onChange={set("volunteerEmail")} onBlur={touch("volunteerEmail")} maxLength={254} autoComplete="email" className={inputCls(!!touched.volunteerEmail && !!errors.volunteerEmail)} style={{ borderColor: touched.volunteerEmail && errors.volunteerEmail ? "#f87171" : C.border }} />
                {touched.volunteerEmail && errors.volunteerEmail && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.volunteerEmail}</p>}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>Event Name <span style={{ color: C.red }}>*</span></label>
                <input type="text" placeholder="Spring Carnival" value={form.eventName} onChange={set("eventName")} onBlur={touch("eventName")} maxLength={150} className={inputCls(!!touched.eventName && !!errors.eventName)} style={{ borderColor: touched.eventName && errors.eventName ? "#f87171" : C.border }} />
                {touched.eventName && errors.eventName && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.eventName}</p>}
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>Hours <span style={{ color: C.red }}>*</span></label>
                <input type="number" placeholder="2.5" min="0.5" max="24" step="0.5" value={form.hoursLogged} onChange={set("hoursLogged")} onBlur={touch("hoursLogged")} className={inputCls(!!touched.hoursLogged && !!errors.hoursLogged)} style={{ borderColor: touched.hoursLogged && errors.hoursLogged ? "#f87171" : C.border }} />
                {touched.hoursLogged && errors.hoursLogged && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.hoursLogged}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>Notes <span className="font-normal normal-case" style={{ color: C.silver }}>(optional)</span></label>
              <textarea rows={4} placeholder="What did you help with?" value={form.notes} onChange={set("notes")} maxLength={500} className={inputCls() + " resize-none"} style={{ borderColor: C.border }} />
              <p className="text-right text-sm font-semibold mt-2" style={{ color: C.silver }}>{form.notes.length}/500</p>
            </div>
            <p className="text-xs font-semibold" style={{ color: C.silver }}>
              🔒 Your information is only used to track PTA volunteer activity and is never shared with third parties.
            </p>
            {status === "error" && (
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: C.red }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="text-base font-semibold">{errorMsg}</span>
              </div>
            )}
            <button onClick={handleSubmit} disabled={status === "loading"}
              className={["w-full py-4 rounded-xl text-base font-black uppercase transition-all duration-300 flex items-center justify-center gap-2",
                status === "loading" ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5"].join(" ")}
              style={{ background: status === "loading" ? "#ccc" : `linear-gradient(135deg,${C.green},${C.greenDark})`, color: "white", letterSpacing: "0.12em", boxShadow: status === "loading" ? "none" : `0 6px 32px ${C.green}66` }}>
              {status === "loading" ? <><Loader2 className="w-5 h-5 animate-spin" />Submitting…</> : <><Sparkles className="w-5 h-5" />Submit My Hours</>}
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Claim Modal ───────────────────────────────────────────────
const INIT_CLAIM: ClaimFormData = { firstName: "", lastName: "", studentName: "", email: "" };

function ClaimModal({ item, onClose, onClaim }: {
  item: WishlistItem;
  onClose: () => void;
  onClaim: (itemId: string, displayName: string, email: string) => Promise<void>;
}) {
  const [form, setForm]     = useState<ClaimFormData>(INIT_CLAIM);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [touched, setTouched] = useState<Partial<Record<keyof ClaimFormData, boolean>>>({});

  const set   = (k: keyof ClaimFormData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const touch = (k: keyof ClaimFormData) => () => setTouched(t => ({ ...t, [k]: true }));

  const errors = {
    firstName: !form.firstName.trim() && "First name is required.",
    lastName:  !form.lastName.trim()  && "Last name is required.",
    email:     !isValidEmail(form.email) && "Valid email required.",
  };
  const isValid = !Object.values(errors).some(Boolean);

  const handleClaim = async () => {
    setTouched({ firstName: true, lastName: true, email: true });
    if (!isValid) return;
    setStatus("loading");
    try {
      const displayName = `${sanitizeInput(form.firstName)} ${sanitizeInput(form.lastName)}`;
      await onClaim(item.id, displayName, sanitizeInput(form.email));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: "white", boxShadow: "0 30px 80px rgba(0,0,0,0.25)" }}>
        <div className="h-2" style={{ background: `linear-gradient(90deg,${C.green},${C.gold},${C.green})` }} />

        {status === "success" ? (
          <div className="p-12 flex flex-col items-center text-center gap-5">
            <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: C.greenLight, border: `3px solid ${C.green}` }}>
              <CheckCircle className="w-12 h-12" style={{ color: C.green }} />
            </div>
            <h3 className="text-3xl font-black" style={{ color: C.green, fontFamily: "Georgia,serif" }}>You&apos;re a Gator Hero! 🐊</h3>
            <p className="text-base font-semibold" style={{ color: C.muted }}>
              Thank you, <strong>{form.firstName}</strong>! You&apos;ve claimed <strong>{item.item}</strong> for {item.teacherName}.
              {form.studentName.trim() && <> {item.teacherName} will know it&apos;s from <strong>{form.studentName.trim()}</strong>&apos;s family!</>}
            </p>
            <p className="text-sm font-semibold" style={{ color: C.silver }}>A confirmation has been noted. The teacher will be so grateful!</p>
            <button onClick={onClose} className="mt-2 px-10 py-3 rounded-full font-black uppercase text-white hover:opacity-90"
              style={{ background: C.green, letterSpacing: "0.1em" }}>Done</button>
          </div>
        ) : (
          <div className="p-8">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-xs font-black tracking-[0.25em] uppercase mb-1" style={{ color: C.gold }}>I&apos;ll Buy This for the Classroom</p>
                <h3 className="text-xl font-black" style={{ color: C.ink }}>{item.item}</h3>
                <p className="text-sm font-semibold mt-1" style={{ color: C.green }}>{item.teacherName} · {item.grade}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" style={{ color: C.muted }} />
              </button>
            </div>

            {item.notes && (
              <div className="rounded-xl p-4 mb-5" style={{ background: C.greenLight, border: `1px solid ${C.border}` }}>
                <p className="text-sm font-semibold" style={{ color: C.muted }}>📝 Teacher&apos;s note: {item.notes}</p>
              </div>
            )}

            <div className="space-y-4 mb-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider mb-2" style={{ color: C.muted }}>First Name <span style={{ color: C.red }}>*</span></label>
                  <input type="text" placeholder="Sarah" value={form.firstName} onChange={set("firstName")} onBlur={touch("firstName")} maxLength={50} autoFocus
                    className={inputCls(!!touched.firstName && !!errors.firstName)} style={{ borderColor: touched.firstName && errors.firstName ? "#f87171" : C.border }} />
                  {touched.firstName && errors.firstName && <p className="text-xs font-semibold mt-1" style={{ color: C.red }}>{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider mb-2" style={{ color: C.muted }}>Last Name <span style={{ color: C.red }}>*</span></label>
                  <input type="text" placeholder="Gator" value={form.lastName} onChange={set("lastName")} onBlur={touch("lastName")} maxLength={50}
                    className={inputCls(!!touched.lastName && !!errors.lastName)} style={{ borderColor: touched.lastName && errors.lastName ? "#f87171" : C.border }} />
                  {touched.lastName && errors.lastName && <p className="text-xs font-semibold mt-1" style={{ color: C.red }}>{errors.lastName}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2" style={{ color: C.muted }}>Email <span style={{ color: C.red }}>*</span></label>
                <input type="email" placeholder="sarah@example.com" value={form.email} onChange={set("email")} onBlur={touch("email")} maxLength={254}
                  className={inputCls(!!touched.email && !!errors.email)} style={{ borderColor: touched.email && errors.email ? "#f87171" : C.border }} />
                {touched.email && errors.email && <p className="text-xs font-semibold mt-1" style={{ color: C.red }}>{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-2" style={{ color: C.muted }}>
                  Student&apos;s Name <span className="font-normal normal-case" style={{ color: C.silver }}>(optional — so the teacher can say thank you!)</span>
                </label>
                <input type="text" placeholder="e.g. Emma Gator" value={form.studentName} onChange={set("studentName")} maxLength={100}
                  className={inputCls()} style={{ borderColor: C.border }} />
              </div>
            </div>

            {item.storeLink && (
              <a href={item.storeLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 mb-5 text-sm font-bold hover:opacity-80"
                style={{ color: C.blue }}>
                <ExternalLink className="w-4 h-4" /> View item on store website →
              </a>
            )}

            <p className="text-xs font-semibold mb-5" style={{ color: C.silver }}>
              🔒 Your info is only used to coordinate classroom supply donations and is never shared.
            </p>

            {status === "error" && (
              <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: C.red }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" /><span className="text-sm font-semibold">Something went wrong. Please try again.</span>
              </div>
            )}

            <button onClick={handleClaim} disabled={status === "loading"}
              className={["w-full py-4 rounded-xl text-base font-black uppercase flex items-center justify-center gap-2 transition-all",
                status === "loading" ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 hover:-translate-y-0.5"].join(" ")}
              style={{ background: `linear-gradient(135deg,${C.green},${C.greenDark})`, color: "white", letterSpacing: "0.1em", boxShadow: `0 6px 24px ${C.green}55` }}>
              {status === "loading" ? <><Loader2 className="w-5 h-5 animate-spin" />Saving…</> : <><ShoppingBag className="w-5 h-5" />I&apos;ll Buy This for the Classroom</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const PRIORITY_META = {
  High:   { color: C.red,   bg: "#fef2f2",    label: "High Priority"   },
  Medium: { color: C.gold,  bg: C.goldLight,  label: "Medium Priority" },
  Low:    { color: C.green, bg: C.greenLight, label: "Low Priority"    },
};

function WishlistSection({ items, claims, onClaim }: {
  items: WishlistItem[] | null;
  claims: WishlistClaim[];
  onClaim: (itemId: string, displayName: string, email: string) => Promise<void>;
}) {
  const list     = items ?? FALLBACK_WISHLIST;
  const [filter, setFilter]         = useState<"All" | "High" | "Medium" | "Low">("All");
  const [claimingItem, setClaimingItem] = useState<WishlistItem | null>(null);

  const claimedIds  = new Set(claims.map(c => String(c.itemId)));
  const filtered    = filter === "All" ? list : list.filter(i => i.priority === filter);
  const totalNeeded  = list.filter(i => !claimedIds.has(String(i.id))).length;
  const totalClaimed = list.filter(i =>  claimedIds.has(String(i.id))).length;

  return (
    <Section id="wishlist" cream>
      <SectionHeader eyebrow="Teachers Need These — Can You Help?" title="Teacher Wishlist" />

      <div className="flex flex-wrap justify-center gap-6 mb-10 -mt-6">
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm"
          style={{ background: C.greenLight, border: `1px solid ${C.border}`, color: C.green }}>
          <Gift className="w-4 h-4" /> {totalNeeded} items still needed
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm"
          style={{ background: C.greenLight, border: `1px solid ${C.green}44`, color: C.green }}>
          <CheckCircle className="w-4 h-4" /> {totalClaimed} claimed by our community
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {(["All", "High", "Medium", "Low"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-5 py-2 rounded-full text-sm font-black uppercase tracking-wider transition-all duration-200"
            style={{ background: filter === f ? C.green : "white", color: filter === f ? "white" : C.muted, border: `1px solid ${filter === f ? C.green : C.border}`, boxShadow: filter === f ? `0 4px 16px ${C.green}44` : "none" }}>
            {f === "All" ? "All Items" : f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item, i) => {
          const p       = PRIORITY_META[item.priority] ?? PRIORITY_META["Low"];
          const claimed = claimedIds.has(String(item.id));
          const claim   = claims.find(c => String(c.itemId) === String(item.id));
          return (
            <div key={item.id ?? i}
              className="rounded-2xl p-6 transition-all duration-300 hover:shadow-lg relative"
              style={{ background: claimed ? "#f8faf8" : "white", border: `1px solid ${claimed ? C.green + "44" : C.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.05)", opacity: claimed ? 0.8 : 1 }}>
              {claimed && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: C.green, color: "white" }}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-black">Claimed</span>
                </div>
              )}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: p.bg }}>
                  <Gift className="w-5 h-5" style={{ color: claimed ? C.silver : p.color }} />
                </div>
                {!claimed && <span className="text-xs font-black px-2.5 py-1 rounded-full mt-0.5" style={{ background: p.bg, color: p.color }}>{p.label}</span>}
              </div>
              <h3 className="font-black text-base mb-1" style={{ color: C.ink, textDecoration: claimed ? "line-through" : "none", textDecorationColor: C.silver }}>{item.item}</h3>
              <p className="text-sm font-bold mb-1" style={{ color: C.green }}>{item.teacherName}</p>
              <p className="text-xs font-semibold mb-3" style={{ color: C.muted }}>{item.grade}</p>
              {item.notes && <p className="text-xs font-medium leading-relaxed mb-4" style={{ color: C.silver }}>{item.notes}</p>}
              {claimed ? (
                <p className="text-xs font-black" style={{ color: C.green }}>
                  ✓ Being bought by: <span style={{ color: C.ink }}>{claim?.claimedBy}</span>
                </p>
              ) : (
                <button onClick={() => setClaimingItem(item)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider hover:opacity-90 hover:-translate-y-0.5 transition-all"
                  style={{ background: C.green, color: "white", letterSpacing: "0.06em" }}>
                  <ShoppingBag className="w-4 h-4" /> I&apos;ll Buy This
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="text-center py-10 text-base font-semibold" style={{ color: C.muted }}>All items claimed at this level — thank you! 🎉</p>}

      <p className="text-center text-sm font-semibold mt-8" style={{ color: C.muted }}>
        Teachers: update your wishlist via the school&apos;s Google Sheet ·{" "}
        <a href="#contact" style={{ color: C.green }} className="font-black underline">Questions? Contact the PTA →</a>
      </p>

      {claimingItem && (
        <ClaimModal
          item={claimingItem}
          onClose={() => setClaimingItem(null)}
          onClaim={async (itemId, displayName, email) => {
            await onClaim(itemId, displayName, email);
            setClaimingItem(null);
          }}
        />
      )}
    </Section>
  );
}

const TIER_META: Record<string, { label: string; color: string; rank: number }> = {
  Gold:      { label: "Gold Partner",     color: C.gold,    rank: 1 },
  Silver:    { label: "Silver Partner",   color: C.silver,  rank: 2 },
  Bronze:    { label: "Bronze Partner",   color: "#cd7f32", rank: 3 },
  Community: { label: "Community Friend", color: C.blue,    rank: 4 },
};

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const tier   = TIER_META[sponsor.tier] ?? TIER_META["Community"];
  const isGold = sponsor.tier === "Gold";
  return (
    <div className="rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      style={{ background: isGold ? C.goldLight : "white", border: `1px solid ${isGold ? C.gold + "88" : C.border}`, boxShadow: isGold ? `0 6px 30px ${C.gold}44` : "0 4px 16px rgba(0,0,0,0.05)" }}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-2xl"
          style={{ background: `${tier.color}22`, border: `1.5px solid ${tier.color}66`, color: tier.color, fontFamily: "Georgia,serif" }}>
          {sponsor.logoUrl ? <Image src={sponsor.logoUrl} alt={sponsor.name} width={64} height={64} className="object-contain rounded-xl" /> : sponsor.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-lg leading-tight" style={{ color: C.ink }}>{sponsor.name}</h3>
            {isGold && <Star className="w-5 h-5 flex-shrink-0" style={{ fill: C.gold, color: C.gold }} />}
          </div>
          <p className="text-xs font-black tracking-wide uppercase mb-2" style={{ color: tier.color }}>{tier.label}</p>
          {sponsor.tagline && <p className="text-sm font-medium leading-relaxed mb-3" style={{ color: C.muted }}>{sponsor.tagline}</p>}
          {sponsor.website && (
            <a href={String(sponsor.website)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-black px-3 py-1.5 rounded-lg hover:opacity-80"
              style={{ background: `${tier.color}18`, color: tier.color, border: `1px solid ${tier.color}44` }}>
              <Globe className="w-3.5 h-3.5" /> Visit Website
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
      <SectionHeader eyebrow="Local Businesses That Support Our School" title="Our Sponsors" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {list.map((s, i) => <SponsorCard key={s.id ?? i} sponsor={s} />)}
      </div>
      <p className="text-center text-base font-semibold" style={{ color: C.muted }}>
        Interested in supporting BCE?{" "}
        <a href="#contact" className="font-black underline underline-offset-2" style={{ color: C.green }}>Reach out to the PTA →</a>
      </p>
    </Section>
  );
}

const INIT_CONTACT: ContactFormData = { contactName: "", contactEmail: "", subject: "", message: "" };

function ContactSection() {
  const [form, setForm]       = useState<ContactFormData>(INIT_CONTACT);
  const [status, setStatus]   = useState<FormStatus>("idle");
  const [errorMsg, setErr]    = useState("");
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFormData, boolean>>>({});

  const set   = (k: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
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
      await postToSheet({ tab: "ContactForm", contactName: sanitizeInput(form.contactName), contactEmail: sanitizeInput(form.contactEmail), subject: sanitizeInput(form.subject), message: sanitizeInput(form.message), timestamp: new Date().toISOString() });
      setStatus("success"); setForm(INIT_CONTACT); setTouched({});
    } catch { setErr("Submission failed. Please try again."); setStatus("error"); }
  }, [form, isValid]);

  return (
    <Section id="contact">
      <SectionHeader eyebrow="Questions? We're Real People." title="Contact the PTA" />
      <div className="grid md:grid-cols-5 gap-10 max-w-5xl mx-auto">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl p-8" style={{ background: C.green }}>
            <p className="text-sm font-black tracking-[0.24em] uppercase mb-6" style={{ color: C.gold }}>Reach Us</p>
            {[
              { icon: Mail,   text: "residencybce@martin.k12.fl.us",         href: "mailto:residencybce@martin.k12.fl.us" },
              { icon: Phone,  text: "(772) 219-1500",                         href: "tel:7722191500" },
              { icon: MapPin, text: "2201 SW Matheson Avenue, Palm City, FL", href: "https://maps.google.com/?q=2201+SW+Matheson+Avenue+Palm+City+FL" },
              { icon: Globe,  text: "martinschools.org/o/bces",               href: "https://martinschools.org/o/bces" },
            ].map(({ icon: Icon, text, href }) => (
              <div key={text} className="flex items-start gap-4 mb-5 last:mb-0">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${C.gold}33`, border: `1px solid ${C.gold}55` }}>
                  <Icon className="w-5 h-5" style={{ color: C.gold }} />
                </div>
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-base font-semibold hover:opacity-80" style={{ color: "rgba(255,255,255,0.95)" }}>{text}</a>
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
                  className="w-14 h-14 rounded-xl flex items-center justify-center hover:scale-110 hover:shadow-lg transition-all"
                  style={{ background: "white", border: `1px solid ${C.border}` }}>
                  <Icon className="w-6 h-6" style={{ color: C.green }} />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="md:col-span-3">
          <div className="rounded-3xl overflow-hidden relative"
            style={{ background: "white", border: `1px solid ${C.border}`, boxShadow: "0 20px 70px rgba(45,155,78,0.12)" }}>
            <div className="h-2" style={{ background: `linear-gradient(90deg,${C.green},${C.gold},${C.green})` }} />
            {status === "success" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 rounded-3xl"
                style={{ background: "rgba(250,250,247,0.98)", backdropFilter: "blur(10px)" }}>
                <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: C.greenLight, border: `3px solid ${C.green}` }}>
                  <CheckCircle className="w-14 h-14" style={{ color: C.green }} />
                </div>
                <div className="text-center">
                  <h3 className="text-4xl font-black mb-3" style={{ color: C.green, fontFamily: "Georgia,serif" }}>Message Sent!</h3>
                  <p className="text-base font-semibold" style={{ color: C.muted }}>We&apos;ll get back to you soon. A confirmation is on its way.</p>
                </div>
                <button onClick={() => { setStatus("idle"); setErr(""); }} className="px-12 py-4 rounded-full text-base font-black uppercase text-white hover:opacity-90" style={{ background: C.green, letterSpacing: "0.1em" }}>Send Another</button>
              </div>
            )}
            <div className="p-10 space-y-6">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>Name <span style={{ color: C.red }}>*</span></label>
                  <input type="text" placeholder="Your name" value={form.contactName} onChange={set("contactName")} onBlur={touch("contactName")} maxLength={100} className={inputCls(!!touched.contactName && !!errors.contactName)} style={{ borderColor: touched.contactName && errors.contactName ? "#f87171" : C.border }} />
                  {touched.contactName && errors.contactName && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.contactName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>Email <span style={{ color: C.red }}>*</span></label>
                  <input type="email" placeholder="your@email.com" value={form.contactEmail} onChange={set("contactEmail")} onBlur={touch("contactEmail")} maxLength={254} className={inputCls(!!touched.contactEmail && !!errors.contactEmail)} style={{ borderColor: touched.contactEmail && errors.contactEmail ? "#f87171" : C.border }} />
                  {touched.contactEmail && errors.contactEmail && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.contactEmail}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>Subject <span style={{ color: C.red }}>*</span></label>
                <input type="text" placeholder="How can we help?" value={form.subject} onChange={set("subject")} onBlur={touch("subject")} maxLength={200} className={inputCls(!!touched.subject && !!errors.subject)} style={{ borderColor: touched.subject && errors.subject ? "#f87171" : C.border }} />
                {touched.subject && errors.subject && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.subject}</p>}
              </div>
              <div>
                <label className="block text-sm font-black uppercase tracking-wider mb-3" style={{ color: C.muted }}>Message <span style={{ color: C.red }}>*</span></label>
                <textarea rows={5} placeholder="Your message…" value={form.message} onChange={set("message")} onBlur={touch("message")} maxLength={500} className={inputCls(!!touched.message && !!errors.message) + " resize-none"} style={{ borderColor: touched.message && errors.message ? "#f87171" : C.border }} />
                {touched.message && errors.message && <p className="text-sm font-semibold mt-2" style={{ color: C.red }}>{errors.message}</p>}
              </div>
              <p className="text-xs font-semibold" style={{ color: C.silver }}>
                🔒 Your information is only used to respond to your message and is never shared.
              </p>
              {status === "error" && (
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: C.red }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="font-semibold">{errorMsg}</span>
                </div>
              )}
              <button onClick={handleSubmit} disabled={status === "loading"}
                className={["w-full py-4 rounded-xl text-base font-black uppercase transition-all duration-300 flex items-center justify-center gap-2",
                  status === "loading" ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5"].join(" ")}
                style={{ background: status === "loading" ? "#ccc" : `linear-gradient(135deg,${C.green},${C.greenDark})`, color: "white", letterSpacing: "0.12em", boxShadow: status === "loading" ? "none" : `0 6px 32px ${C.green}66` }}>
                {status === "loading" ? <><Loader2 className="w-5 h-5 animate-spin" />Sending…</> : <><Mail className="w-5 h-5" />Send Message</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Footer() {
  return (
    <footer style={{ background: C.green, borderTop: `2px solid ${C.gold}66` }}>
      <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <Image src={LOGO_URL} alt="Bessey Creek Elementary" width={90} height={90} className="rounded-full mb-7"
          style={{ border: `3px solid ${C.gold}66`, opacity: 0.95 }} />
        <p className="text-sm font-bold tracking-[0.3em] uppercase mb-3" style={{ color: C.gold }}>Bessey Creek Elementary</p>
        <p className="text-4xl font-black mb-10" style={{ color: "white", fontFamily: "'Playfair Display',Georgia,serif" }}>The Gator Grid</p>
        <div className="flex items-center gap-5 mb-10 w-full max-w-md">
          <div className="flex-1 h-px" style={{ background: `${C.gold}55` }} />
          <div className="w-2 h-2 rotate-45" style={{ background: `${C.gold}88` }} />
          <div className="flex-1 h-px" style={{ background: `${C.gold}55` }} />
        </div>
        <p className="text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.70)" }}>2201 SW Matheson Avenue, Palm City, FL</p>
        <p className="text-sm font-semibold mt-4 max-w-md" style={{ color: "rgba(255,255,255,0.55)" }}>
          The Gator Grid is maintained by the BCE Parent-Teacher Association and is not an official Martin County School District website.
        </p>
        <p className="text-sm mt-4 font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
          © {new Date().getFullYear()} Bessey Creek Elementary PTA · All rights reserved
        </p>
      </div>
    </footer>
  );
}

export default function GatorGridPage() {
  const [dashboard,     setDashboard]     = useState<DashboardData    | null>(null);
  const [events,        setEvents]        = useState<SchoolEvent[]    | null>(null);
  const [sponsors,      setSponsors]      = useState<Sponsor[]        | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]   | null>(null);
  const [principal,     setPrincipal]     = useState<PrincipalMessage | null>(null);
  const [wishlist,      setWishlist]      = useState<WishlistItem[]   | null>(null);
  const [claims,        setClaims]        = useState<WishlistClaim[]>([]);
  const [mounted,       setMounted]       = useState(false);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetchTab<DashboardData>   ("Dashboard",        FALLBACK_DASHBOARD).then(setDashboard),
      fetchTab<SchoolEvent[]>   ("Events",           FALLBACK_EVENTS).then(setEvents),
      fetchTab<Sponsor[]>       ("Sponsors",         FALLBACK_SPONSORS).then(setSponsors),
      fetchTab<Announcement[]>  ("Announcements",    FALLBACK_ANNOUNCEMENTS).then(setAnnouncements),
      fetchTab<PrincipalMessage>("PrincipalMessage", FALLBACK_PRINCIPAL).then(setPrincipal),
      fetchTab<WishlistItem[]>  ("TeacherWishlist",  FALLBACK_WISHLIST).then(setWishlist),
      fetchTab<WishlistClaim[]> ("WishlistClaims",   []).then(setClaims),
    ]);
  }, []);

  const handleClaim = useCallback(async (itemId: string, displayName: string, email: string) => {
    await postToSheet({
      tab:       "WishlistClaims",
      itemId,
      claimedBy: displayName,
      email,
      timestamp: new Date().toISOString(),
    });
    setClaims(prev => [...prev, { itemId, claimedBy: displayName, timestamp: new Date().toISOString() }]);
  }, []);

  const dashData = mounted ? dashboard  : FALLBACK_DASHBOARD;
  const evData   = mounted ? events     : FALLBACK_EVENTS;
  const spData   = mounted ? sponsors   : FALLBACK_SPONSORS;
  const annData  = mounted ? (announcements ?? FALLBACK_ANNOUNCEMENTS) : FALLBACK_ANNOUNCEMENTS;
  const prinData = mounted ? principal  : FALLBACK_PRINCIPAL;
  const wishData = mounted ? wishlist   : FALLBACK_WISHLIST;

  return (
    <div className="min-h-screen" style={{ background: "white", fontFamily: "'Lato',sans-serif" }}>
      <AnnouncementBanner announcements={annData} />
      <Navbar />
      <HeroSection />
      <QuickStatsBar
        dashboard={dashData}
        wishlistCount={wishData?.length ?? FALLBACK_WISHLIST.length}
        claimedCount={claims.length}
      />
      <EventTimelineSection events={evData} />
      <WishlistSection items={wishData} claims={claims} onClaim={handleClaim} />
      <VolunteerFormSection />
      <PrincipalSection data={prinData} />
      <DashboardSection data={dashData} />
      <SponsorShowcaseSection sponsors={spData} />
      <ContactSection />
      <Footer />
    </div>
  );
}

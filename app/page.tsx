"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Trophy,
  Heart,
  Star,
  Shield,
  BookOpen,
  Users,
  CheckCircle,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface DashboardData {
  fundraisingGoal: number;
  fundraisingCurrent: number;
  volunteerHoursGoal: number;
  volunteerHoursCurrent: number;
  nextEventName?: string;
  nextEventDate?: string;
}

interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  category: string;
}

interface Sponsor {
  id: string;
  name: string;
  tier: "Gold" | "Silver" | "Bronze" | "Community";
  website?: string;
  logoUrl?: string;
  tagline?: string;
}

interface VolunteerFormData {
  volunteerName: string;
  volunteerEmail: string;
  eventName: string;
  hoursLogged: string;
  notes: string;
}

type FormStatus = "idle" | "loading" | "success" | "error";

// ─────────────────────────────────────────────
// SECURITY: Sanitize helpers
// ─────────────────────────────────────────────
/** Strip any HTML/script tags from user input before sending to API */
function sanitizeInput(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")          // strip HTML tags
    .replace(/[<>"'`]/g, "")          // strip dangerous chars
    .trim()
    .slice(0, 500);                    // hard length cap
}

/** Validate email format with RFC-compliant regex */
function isValidEmail(email: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email);
}

/** Build a safe API URL that only allows http/https schemes */
function buildApiUrl(base: string, tab: string): string | null {
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.searchParams.set("tab", encodeURIComponent(tab));
    return url.toString();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL ?? "";

// Logo-matched palette: green + shield quadrant colors
const COLORS = {
  green: "#006400",
  greenLight: "#1a7a1a",
  greenMid: "#2d9e2d",
  gold: "#F5C400",
  red: "#c0392b",
  blue: "#1a6faf",
  silver: "#8e9eab",
  yellowShield: "#e6b800",
};

const STAR_VALUES = [
  {
    icon: Shield,
    letter: "S",
    label: "Stay Safe",
    color: "from-green-100 to-green-50",
    accent: COLORS.green,
    bg: "#e8f5e9",
  },
  {
    icon: CheckCircle,
    letter: "T",
    label: "Take Responsibility",
    color: "from-red-100 to-red-50",
    accent: COLORS.red,
    bg: "#fdecea",
  },
  {
    icon: BookOpen,
    letter: "A",
    label: "Actively Learn",
    color: "from-blue-100 to-blue-50",
    accent: COLORS.blue,
    bg: "#e3f0fa",
  },
  {
    icon: Heart,
    letter: "R",
    label: "Respect Others",
    color: "from-yellow-100 to-yellow-50",
    accent: COLORS.yellowShield,
    bg: "#fffde7",
  },
];

// ─────────────────────────────────────────────
// FALLBACK DATA
// ─────────────────────────────────────────────
const FALLBACK_DASHBOARD: DashboardData = {
  fundraisingGoal: 10000,
  fundraisingCurrent: 6800,
  volunteerHoursGoal: 500,
  volunteerHoursCurrent: 312,
  nextEventName: "Spring Carnival",
  nextEventDate: "May 17, 2025",
};

const FALLBACK_EVENTS: SchoolEvent[] = [
  {
    id: "1",
    title: "Spring Carnival",
    date: "May 17, 2025",
    time: "10:00 AM – 3:00 PM",
    location: "School Grounds",
    description: "Annual spring carnival with games, food, and fun for the whole family!",
    category: "Community",
  },
  {
    id: "2",
    title: "PTA Meeting",
    date: "April 8, 2025",
    time: "6:30 PM",
    location: "Media Center",
    description: "Monthly PTA meeting open to all parents and guardians.",
    category: "Meeting",
  },
  {
    id: "3",
    title: "Science Night",
    date: "April 24, 2025",
    time: "5:00 PM – 7:00 PM",
    location: "Gymnasium",
    description: "Celebrate STEM with student-led science projects and demonstrations.",
    category: "Academic",
  },
];

const FALLBACK_SPONSORS: Sponsor[] = [
  { id: "1", name: "Gator Grille", tier: "Gold", tagline: "Fueling Gator Pride since 2018" },
  { id: "2", name: "CreekSide Dental", tier: "Gold", tagline: "Healthy smiles, bright futures" },
  { id: "3", name: "Bessey Builders", tier: "Silver", tagline: "Building community together" },
  { id: "4", name: "Palm City Realty", tier: "Silver", tagline: "Your local neighborhood experts" },
  { id: "5", name: "Sunrise Bakery", tier: "Bronze", tagline: "Sweet treats for sweet students" },
  { id: "6", name: "First Coast Finance", tier: "Community", tagline: "Investing in tomorrow" },
];

// ─────────────────────────────────────────────
// DATA FETCHING — with URL validation
// ─────────────────────────────────────────────
async function fetchSheet<T>(tab: string, fallback: T): Promise<T> {
  if (!API_URL) return fallback;
  const safeUrl = buildApiUrl(API_URL, tab);
  if (!safeUrl) return fallback;
  try {
    const res = await fetch(safeUrl, {
      next: { revalidate: 300 },
      // Prevent MIME sniffing attacks
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) throw new Error("Unexpected content-type");
    const json = await res.json();
    return (json?.data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────
// REUSABLE UI PRIMITIVES
// ─────────────────────────────────────────────
function Card({
  children,
  className = "",
  gold = false,
}: {
  children: React.ReactNode;
  className?: string;
  gold?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border transition-all duration-300",
        gold
          ? "bg-yellow-50 border-yellow-300 shadow-[0_4px_20px_rgba(245,196,0,0.25)]"
          : "bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)]",
        "hover:shadow-[0_4px_24px_rgba(0,100,0,0.12)] hover:border-green-300",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div
        className="p-2.5 rounded-xl"
        style={{ background: "#e8f5e9", border: `1.5px solid ${COLORS.greenMid}40` }}
      >
        <Icon className="w-5 h-5" style={{ color: COLORS.green }} />
      </div>
      <h2
        className="text-2xl font-bold tracking-tight"
        style={{ color: COLORS.green, fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {children}
      </h2>
      <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(to right, ${COLORS.green}40, transparent)` }} />
    </div>
  );
}

function ProgressBar({
  value,
  max,
  label,
  color = COLORS.green,
}: {
  value: number;
  max: number;
  label: string;
  color?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className="font-bold tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 8px ${color}55`,
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: HERO
// ─────────────────────────────────────────────
function HeroSection() {
  return (
    <section
      className="relative text-center py-16 px-4 overflow-hidden"
      style={{
        background: `linear-gradient(160deg, #f0faf0 0%, #ffffff 60%, #f5faff 100%)`,
        borderBottom: `3px solid ${COLORS.green}`,
      }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: `${COLORS.green}10`, filter: "blur(48px)" }}
      />
      <div
        className="absolute -bottom-12 -right-12 w-60 h-60 rounded-full pointer-events-none"
        style={{ background: `${COLORS.gold}18`, filter: "blur(40px)" }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Logo / crest placeholder */}
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
          style={{
            border: `3px solid ${COLORS.green}`,
            background: "white",
            boxShadow: `0 4px 24px ${COLORS.green}33`,
          }}
        >
          <span className="text-4xl">🐊</span>
        </div>

        <h1
          className="text-5xl sm:text-6xl font-black tracking-tight mb-3"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: COLORS.green,
          }}
        >
          The{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.yellowShield})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Gator Grid
          </span>
        </h1>
        <p className="text-base text-gray-500 font-semibold tracking-widest uppercase mb-2">
          Bessey Creek Elementary PTA
        </p>
        <p className="text-gray-400 text-sm">
          Empowering students · Engaging community · Elevating excellence
        </p>

        {/* Shield color dots — nod to the logo quadrants */}
        <div className="flex justify-center gap-2 mt-5">
          {[COLORS.red, COLORS.blue, COLORS.yellowShield, COLORS.green].map((c) => (
            <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION: STAR VALUES
// ─────────────────────────────────────────────
function StarValuesSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 mb-16 mt-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAR_VALUES.map(({ icon: Icon, letter, label, accent, bg }) => (
          <Card key={letter} className="p-5 group cursor-default relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
              style={{ background: bg }}
            />
            <div className="relative z-10 text-center space-y-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: `${accent}18`, border: `1.5px solid ${accent}44` }}
              >
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div
                className="text-3xl font-black"
                style={{ color: accent, fontFamily: "'Playfair Display', serif" }}
              >
                {letter}
              </div>
              <p className="text-xs text-gray-500 font-semibold leading-tight">{label}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION: DASHBOARD / PROGRESS
// ─────────────────────────────────────────────
function DashboardSection({ data }: { data: DashboardData | null }) {
  const d = data ?? FALLBACK_DASHBOARD;
  const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`);

  return (
    <section className="max-w-6xl mx-auto px-4 mb-16">
      <SectionTitle icon={Trophy}>Gator Progress</SectionTitle>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Fundraising */}
        <Card className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg text-gray-800">Fundraising Goal</h3>
              <p className="text-gray-400 text-sm mt-0.5">Help us reach our target!</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black tabular-nums" style={{ color: COLORS.gold }}>
                {fmt(d.fundraisingCurrent)}
              </p>
              <p className="text-gray-400 text-xs">of {fmt(d.fundraisingGoal)}</p>
            </div>
          </div>
          <ProgressBar value={d.fundraisingCurrent} max={d.fundraisingGoal} label="Raised so far" color={COLORS.gold} />
          <p className="text-gray-400 text-xs text-right">
            {fmt(d.fundraisingGoal - d.fundraisingCurrent)} remaining
          </p>
        </Card>

        {/* Volunteer Hours */}
        <Card className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg text-gray-800">Volunteer Hours</h3>
              <p className="text-gray-400 text-sm mt-0.5">Every hour makes a difference.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black tabular-nums" style={{ color: COLORS.green }}>
                {d.volunteerHoursCurrent}
                <span className="text-base font-medium text-gray-400">h</span>
              </p>
              <p className="text-gray-400 text-xs">of {d.volunteerHoursGoal}h goal</p>
            </div>
          </div>
          <ProgressBar value={d.volunteerHoursCurrent} max={d.volunteerHoursGoal} label="Hours logged" color={COLORS.green} />
          {d.nextEventName && (
            <p className="text-gray-400 text-xs text-right">
              Next: {d.nextEventName} · {d.nextEventDate}
            </p>
          )}
        </Card>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION: EVENT TIMELINE
// ─────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Community: COLORS.green,
  Meeting: COLORS.blue,
  Academic: "#7c3aed",
  Fundraiser: COLORS.gold,
  Spirit: COLORS.red,
};

function EventCard({ event, index }: { event: SchoolEvent; index: number }) {
  const accent = CATEGORY_COLORS[event.category] ?? COLORS.silver;
  return (
    <div className="flex gap-4 group">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full mt-1.5 transition-transform group-hover:scale-125"
          style={{ background: accent, boxShadow: `0 0 0 3px ${accent}30` }}
        />
        {index < 2 && <div className="flex-1 w-px bg-gray-200 mt-1" />}
      </div>

      {/* Card */}
      <Card className="flex-1 p-5 mb-4 hover:translate-x-1 transition-transform duration-200">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h3 className="text-gray-800 font-bold text-base">{event.title}</h3>
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}44` }}
          >
            {event.category}
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-2">{event.description}</p>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" /> {event.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {event.time}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {event.location}
          </span>
        </div>
      </Card>
    </div>
  );
}

function EventTimelineSection({ events }: { events: SchoolEvent[] | null }) {
  const list = events ?? FALLBACK_EVENTS;
  return (
    <section className="max-w-6xl mx-auto px-4 mb-16">
      <SectionTitle icon={CalendarDays}>Event Timeline</SectionTitle>
      <div className="max-h-[520px] overflow-y-auto pr-2">
        {list.length === 0 ? (
          <Card className="p-8 text-center text-gray-400">No upcoming events found.</Card>
        ) : (
          list.map((e, i) => <EventCard key={e.id ?? i} event={e} index={i} />)
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION: VOLUNTEER LOG FORM
// ─────────────────────────────────────────────
const INITIAL_FORM: VolunteerFormData = {
  volunteerName: "",
  volunteerEmail: "",
  eventName: "",
  hoursLogged: "",
  notes: "",
};

function inputClass(hasError?: boolean) {
  return [
    "w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400",
    "focus:outline-none focus:ring-2 transition-all duration-200",
    hasError
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-200 focus:border-green-400 focus:ring-green-100",
  ].join(" ");
}

function VolunteerFormSection() {
  const [form, setForm] = useState<VolunteerFormData>(INITIAL_FORM);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [touched, setTouched] = useState<Partial<Record<keyof VolunteerFormData, boolean>>>({});

  const set = (k: keyof VolunteerFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const touch = (k: keyof VolunteerFormData) => () =>
    setTouched((t) => ({ ...t, [k]: true }));

  const errors = {
    volunteerName: !form.volunteerName.trim() && "Name is required.",
    volunteerEmail: !isValidEmail(form.volunteerEmail) && "Valid email required.",
    eventName: !form.eventName.trim() && "Event name is required.",
    hoursLogged:
      (!form.hoursLogged ||
        isNaN(Number(form.hoursLogged)) ||
        Number(form.hoursLogged) <= 0 ||
        Number(form.hoursLogged) > 24) &&
      "Enter valid hours (0.5–24).",
  };

  const isValid = !Object.values(errors).some(Boolean);

  const handleSubmit = useCallback(async () => {
    setTouched({ volunteerName: true, volunteerEmail: true, eventName: true, hoursLogged: true });
    if (!isValid) return;

    if (!API_URL) {
      setErrorMsg("API URL is not configured. Please add NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL to your environment.");
      setStatus("error");
      return;
    }

    const safeUrl = buildApiUrl(API_URL, "VolunteerLog");
    if (!safeUrl) {
      setErrorMsg("Invalid API URL configuration.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      // Sanitize all inputs before transmission
      const sanitized = {
        volunteerName: sanitizeInput(form.volunteerName),
        volunteerEmail: sanitizeInput(form.volunteerEmail),
        eventName: sanitizeInput(form.eventName),
        hoursLogged: String(parseFloat(form.hoursLogged)),
        notes: sanitizeInput(form.notes),
        tab: "VolunteerLog",
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(safeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Mitigate CSRF by setting a custom header
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(sanitized),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setStatus("success");
      setForm(INITIAL_FORM);
      setTouched({});
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setStatus("error");
    }
  }, [form, isValid]);

  const reset = () => {
    setStatus("idle");
    setErrorMsg("");
  };

  return (
    <section className="max-w-6xl mx-auto px-4 mb-16">
      <SectionTitle icon={Users}>Log Volunteer Hours</SectionTitle>

      <Card className="max-w-2xl mx-auto p-8 relative overflow-hidden">
        {/* Success overlay */}
        {status === "success" && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl gap-4"
            style={{ background: "rgba(240,250,240,0.95)", backdropFilter: "blur(4px)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "#e8f5e9", border: `2px solid ${COLORS.green}` }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: COLORS.green }} />
            </div>
            <h3 className="font-bold text-xl" style={{ color: COLORS.green }}>
              Hours Logged!
            </h3>
            <p className="text-gray-500 text-sm text-center max-w-xs">
              Thank you for volunteering! Your contribution has been recorded.
            </p>
            <button
              onClick={reset}
              className="mt-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              style={{
                background: COLORS.green,
                color: "white",
              }}
            >
              Log More Hours
            </button>
          </div>
        )}

        <div className="space-y-5">
          {/* Row 1 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Jane Gator"
                value={form.volunteerName}
                onChange={set("volunteerName")}
                onBlur={touch("volunteerName")}
                maxLength={100}
                autoComplete="name"
                className={inputClass(!!touched.volunteerName && !!errors.volunteerName)}
              />
              {touched.volunteerName && errors.volunteerName && (
                <p className="text-red-500 text-xs mt-1">{errors.volunteerName}</p>
              )}
            </div>
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={form.volunteerEmail}
                onChange={set("volunteerEmail")}
                onBlur={touch("volunteerEmail")}
                maxLength={254}
                autoComplete="email"
                className={inputClass(!!touched.volunteerEmail && !!errors.volunteerEmail)}
              />
              {touched.volunteerEmail && errors.volunteerEmail && (
                <p className="text-red-500 text-xs mt-1">{errors.volunteerEmail}</p>
              )}
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Spring Carnival"
                value={form.eventName}
                onChange={set("eventName")}
                onBlur={touch("eventName")}
                maxLength={150}
                className={inputClass(!!touched.eventName && !!errors.eventName)}
              />
              {touched.eventName && errors.eventName && (
                <p className="text-red-500 text-xs mt-1">{errors.eventName}</p>
              )}
            </div>
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Hours Logged <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="2.5"
                min="0.5"
                max="24"
                step="0.5"
                value={form.hoursLogged}
                onChange={set("hoursLogged")}
                onBlur={touch("hoursLogged")}
                className={inputClass(!!touched.hoursLogged && !!errors.hoursLogged)}
              />
              {touched.hoursLogged && errors.hoursLogged && (
                <p className="text-red-500 text-xs mt-1">{errors.hoursLogged}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="What did you help with?"
              value={form.notes}
              onChange={set("notes")}
              maxLength={500}
              className={inputClass() + " resize-none"}
            />
            <p className="text-right text-xs text-gray-300 mt-0.5">{form.notes.length}/500</p>
          </div>

          {/* Error state */}
          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className={[
              "w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200",
              "flex items-center justify-center gap-2",
              status === "loading" ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
            style={
              status === "loading"
                ? { background: "#ccc", color: "#666" }
                : {
                    background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.greenMid})`,
                    color: "white",
                    boxShadow: `0 4px 20px ${COLORS.green}44`,
                  }
            }
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Submit Volunteer Hours
              </>
            )}
          </button>
        </div>
      </Card>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION: SPONSOR SHOWCASE
// ─────────────────────────────────────────────
const TIER_STYLES: Record<string, { label: string; color: string; size: string }> = {
  Gold: { label: "Gold Partner", color: COLORS.gold, size: "col-span-2 sm:col-span-1" },
  Silver: { label: "Silver Partner", color: COLORS.silver, size: "" },
  Bronze: { label: "Bronze Partner", color: "#cd7f32", size: "" },
  Community: { label: "Community Friend", color: COLORS.blue, size: "" },
};

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const tier = TIER_STYLES[sponsor.tier] ?? TIER_STYLES["Community"];
  const isGold = sponsor.tier === "Gold";
  return (
    <Card gold={isGold} className={`p-5 group ${tier.size}`}>
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg"
          style={{
            background: `${tier.color}18`,
            border: `1.5px solid ${tier.color}55`,
            color: tier.color,
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {sponsor.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-gray-800 font-bold text-sm leading-tight">{sponsor.name}</h3>
            {isGold && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />}
          </div>
          <p className="text-xs mt-0.5 font-semibold" style={{ color: tier.color }}>
            {tier.label}
          </p>
          {sponsor.tagline && (
            <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">{sponsor.tagline}</p>
          )}
          {sponsor.website && (
            
              href={sponsor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs mt-2 transition-colors"
              style={{ color: tier.color }}
            >
              Visit <ChevronRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

function SponsorShowcaseSection({ sponsors }: { sponsors: Sponsor[] | null }) {
  const list = sponsors ?? FALLBACK_SPONSORS;
  return (
    <section className="max-w-6xl mx-auto px-4 mb-16">
      <SectionTitle icon={Star}>Our Partners</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.map((s, i) => (
          <SponsorCard key={s.id ?? i} sponsor={s} />
        ))}
      </div>
      <p className="text-center text-gray-400 text-xs mt-6">
        Interested in becoming a partner?{" "}
        
          href="mailto:pta@besseycreek.edu"
          className="underline underline-offset-2 transition-colors"
          style={{ color: COLORS.green }}
        >
          Contact the PTA
        </a>
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer
      className="mt-8 py-8 text-center text-xs space-y-1"
      style={{ borderTop: `3px solid ${COLORS.green}`, background: "#f0faf0" }}
    >
      <p className="font-bold text-sm" style={{ color: COLORS.green }}>🐊 The Gator Grid</p>
      <p className="text-gray-500">
        Bessey Creek Elementary PTA · Stay Safe · Take Responsibility · Actively Learn · Respect Others
      </p>
      <p className="text-gray-400 mt-2">
        © {new Date().getFullYear()} Bessey Creek Elementary PTA. All rights reserved.
      </p>
    </footer>
  );
}

// ─────────────────────────────────────────────
// ROOT PAGE
// ─────────────────────────────────────────────
export default function GatorGridPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<SchoolEvent[] | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetchSheet<DashboardData>("Dashboard", FALLBACK_DASHBOARD).then(setDashboard),
      fetchSheet<SchoolEvent[]>("Events", FALLBACK_EVENTS).then(setEvents),
      fetchSheet<Sponsor[]>("Sponsors", FALLBACK_SPONSORS).then(setSponsors),
    ]);
  }, []);

  const dashData = mounted ? dashboard : FALLBACK_DASHBOARD;
  const eventsData = mounted ? events : FALLBACK_EVENTS;
  const sponsorsData = mounted ? sponsors : FALLBACK_SPONSORS;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Lato:wght@300;400;700&display=swap');
        * { font-family: 'Lato', sans-serif; }
        body { background: #ffffff; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #006400aa; border-radius: 99px; }
      `}</style>

      <div className="min-h-screen text-gray-800 bg-white">
        {/* Subtle grid texture */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,100,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,100,0,0.03) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10">
          <HeroSection />
          <StarValuesSection />
          <DashboardSection data={dashData} />
          <EventTimelineSection events={eventsData} />
          <VolunteerFormSection />
          <SponsorShowcaseSection sponsors={sponsorsData} />
          <Footer />
        </div>
      </div>
    </>
  );
}

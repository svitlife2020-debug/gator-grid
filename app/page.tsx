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
// CONSTANTS
// ─────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL ?? "";

const STAR_VALUES = [
  {
    icon: Shield,
    letter: "S",
    label: "Stay Safe",
    color: "from-emerald-500/20 to-emerald-600/10",
    accent: "#34d399",
  },
  {
    icon: CheckCircle,
    letter: "T",
    label: "Take Responsibility",
    color: "from-yellow-400/20 to-yellow-500/10",
    accent: "#facc15",
  },
  {
    icon: BookOpen,
    letter: "A",
    label: "Actively Learn",
    color: "from-teal-400/20 to-teal-500/10",
    accent: "#2dd4bf",
  },
  {
    icon: Heart,
    letter: "R",
    label: "Respect Others",
    color: "from-amber-400/20 to-amber-500/10",
    accent: "#fb923c",
  },
];

// ─────────────────────────────────────────────
// FALLBACK DATA (shown while fetching / on error)
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
// DATA FETCHING HELPERS
// ─────────────────────────────────────────────
async function fetchSheet<T>(tab: string, fallback: T): Promise<T> {
  if (!API_URL) return fallback;
  try {
    const res = await fetch(`${API_URL}?tab=${tab}`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json?.data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────
// REUSABLE UI PRIMITIVES
// ─────────────────────────────────────────────
function GlassCard({
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
        "rounded-2xl backdrop-blur-md border transition-all duration-300",
        gold
          ? "bg-yellow-400/10 border-yellow-400/60 shadow-[0_0_24px_rgba(255,215,0,0.18)]"
          : "bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        "hover:border-white/20",
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
      <div className="p-2.5 rounded-xl bg-yellow-400/15 border border-yellow-400/30">
        <Icon className="w-5 h-5 text-yellow-400" />
      </div>
      <h2
        className="text-2xl font-bold tracking-tight text-white"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {children}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-yellow-400/30 to-transparent ml-2" />
    </div>
  );
}

function ProgressBar({ value, max, label, color = "#FFD700" }: { value: number; max: number; label: string; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-white/70 font-medium">{label}</span>
        <span className="text-white font-bold tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="h-3 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 12px ${color}66`,
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
    <section className="relative text-center py-16 px-4 overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-green-700/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-yellow-400/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Logo mark */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-yellow-400/15 border border-yellow-400/40 mb-6 shadow-[0_0_40px_rgba(255,215,0,0.2)]">
          <span className="text-4xl">🐊</span>
        </div>

        <h1
          className="text-5xl sm:text-6xl font-black tracking-tight text-white mb-3"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          The{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">
            Gator Grid
          </span>
        </h1>
        <p className="text-lg text-white/60 font-light tracking-widest uppercase mb-2">
          Bessey Creek Elementary PTA
        </p>
        <p className="text-white/40 text-sm">Empowering students · Engaging community · Elevating excellence</p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION: STAR VALUES
// ─────────────────────────────────────────────
function StarValuesSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 mb-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAR_VALUES.map(({ icon: Icon, letter, label, color, accent }) => (
          <GlassCard key={letter} className="p-5 group cursor-default">
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className="relative z-10 text-center space-y-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}
              >
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div
                className="text-3xl font-black"
                style={{ color: accent, fontFamily: "'Playfair Display', serif" }}
              >
                {letter}
              </div>
              <p className="text-xs text-white/60 font-medium leading-tight">{label}</p>
            </div>
          </GlassCard>
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
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

  return (
    <section className="max-w-6xl mx-auto px-4 mb-16">
      <SectionTitle icon={Trophy}>Gator Progress</SectionTitle>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Fundraising */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">Fundraising Goal</h3>
              <p className="text-white/40 text-sm mt-0.5">Help us reach our target!</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-yellow-400 tabular-nums">
                {fmt(d.fundraisingCurrent)}
              </p>
              <p className="text-white/40 text-xs">of {fmt(d.fundraisingGoal)}</p>
            </div>
          </div>
          <ProgressBar
            value={d.fundraisingCurrent}
            max={d.fundraisingGoal}
            label="Raised so far"
            color="#FFD700"
          />
          <p className="text-white/30 text-xs text-right">
            {fmt(d.fundraisingGoal - d.fundraisingCurrent)} remaining
          </p>
        </GlassCard>

        {/* Volunteer Hours */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">Volunteer Hours</h3>
              <p className="text-white/40 text-sm mt-0.5">Every hour makes a difference.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-400 tabular-nums">
                {d.volunteerHoursCurrent}
                <span className="text-base font-medium text-white/50">h</span>
              </p>
              <p className="text-white/40 text-xs">of {d.volunteerHoursGoal}h goal</p>
            </div>
          </div>
          <ProgressBar
            value={d.volunteerHoursCurrent}
            max={d.volunteerHoursGoal}
            label="Hours logged"
            color="#34d399"
          />
          {d.nextEventName && (
            <p className="text-white/30 text-xs text-right">
              Next: {d.nextEventName} · {d.nextEventDate}
            </p>
          )}
        </GlassCard>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION: EVENT TIMELINE
// ─────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Community: "#34d399",
  Meeting: "#60a5fa",
  Academic: "#a78bfa",
  Fundraiser: "#fbbf24",
  Spirit: "#f87171",
};

function EventCard({ event, index }: { event: SchoolEvent; index: number }) {
  const accent = CATEGORY_COLORS[event.category] ?? "#94a3b8";
  return (
    <div className="flex gap-4 group">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full mt-1.5 ring-2 ring-offset-2 ring-offset-transparent transition-transform group-hover:scale-125"
          style={{ background: accent, ringColor: `${accent}44` }}
        />
        {index < 2 && <div className="flex-1 w-px bg-white/10 mt-1" />}
      </div>

      {/* Card */}
      <GlassCard className="flex-1 p-5 mb-4 hover:translate-x-1 transition-transform duration-200">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h3 className="text-white font-bold text-base">{event.title}</h3>
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
          >
            {event.category}
          </span>
        </div>
        <p className="text-white/50 text-sm mt-2">{event.description}</p>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/40">
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
      </GlassCard>
    </div>
  );
}

function EventTimelineSection({ events }: { events: SchoolEvent[] | null }) {
  const list = events ?? FALLBACK_EVENTS;
  return (
    <section className="max-w-6xl mx-auto px-4 mb-16">
      <SectionTitle icon={CalendarDays}>Event Timeline</SectionTitle>
      <div className="max-h-[520px] overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {list.length === 0 ? (
          <GlassCard className="p-8 text-center text-white/40">No upcoming events found.</GlassCard>
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
    "w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/30",
    "focus:outline-none focus:ring-2 transition-all duration-200",
    hasError
      ? "border-red-400/60 focus:ring-red-400/30"
      : "border-white/10 focus:border-yellow-400/50 focus:ring-yellow-400/20",
  ].join(" ");
}

function VolunteerFormSection() {
  const [form, setForm] = useState<VolunteerFormData>(INITIAL_FORM);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [touched, setTouched] = useState<Partial<Record<keyof VolunteerFormData, boolean>>>({});

  const set = (k: keyof VolunteerFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const touch = (k: keyof VolunteerFormData) => () =>
    setTouched((t) => ({ ...t, [k]: true }));

  const errors = {
    volunteerName: !form.volunteerName.trim() && "Name is required.",
    volunteerEmail: !form.volunteerEmail.includes("@") && "Valid email required.",
    eventName: !form.eventName.trim() && "Event name is required.",
    hoursLogged: (!form.hoursLogged || isNaN(Number(form.hoursLogged)) || Number(form.hoursLogged) <= 0) && "Enter valid hours.",
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
    setStatus("loading");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tab: "VolunteerLog", timestamp: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setStatus("success");
      setForm(INITIAL_FORM);
      setTouched({});
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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

      <GlassCard className="max-w-2xl mx-auto p-8 relative overflow-hidden">
        {/* Success overlay */}
        {status === "success" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#001a00]/80 backdrop-blur-sm rounded-2xl gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-white font-bold text-xl">Hours Logged!</h3>
            <p className="text-white/50 text-sm text-center max-w-xs">
              Thank you for volunteering! Your contribution has been recorded.
            </p>
            <button
              onClick={reset}
              className="mt-2 px-6 py-2.5 rounded-xl bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-sm font-semibold hover:bg-yellow-400/30 transition-colors"
            >
              Log More Hours
            </button>
          </div>
        )}

        <div className="space-y-5">
          {/* Row 1 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Jane Gator"
                value={form.volunteerName}
                onChange={set("volunteerName")}
                onBlur={touch("volunteerName")}
                className={inputClass(!!touched.volunteerName && !!errors.volunteerName)}
              />
              {touched.volunteerName && errors.volunteerName && (
                <p className="text-red-400 text-xs mt-1">{errors.volunteerName}</p>
              )}
            </div>
            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={form.volunteerEmail}
                onChange={set("volunteerEmail")}
                onBlur={touch("volunteerEmail")}
                className={inputClass(!!touched.volunteerEmail && !!errors.volunteerEmail)}
              />
              {touched.volunteerEmail && errors.volunteerEmail && (
                <p className="text-red-400 text-xs mt-1">{errors.volunteerEmail}</p>
              )}
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Event Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Spring Carnival"
                value={form.eventName}
                onChange={set("eventName")}
                onBlur={touch("eventName")}
                className={inputClass(!!touched.eventName && !!errors.eventName)}
              />
              {touched.eventName && errors.eventName && (
                <p className="text-red-400 text-xs mt-1">{errors.eventName}</p>
              )}
            </div>
            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Hours Logged <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                placeholder="2.5"
                min="0.5"
                step="0.5"
                value={form.hoursLogged}
                onChange={set("hoursLogged")}
                onBlur={touch("hoursLogged")}
                className={inputClass(!!touched.hoursLogged && !!errors.hoursLogged)}
              />
              {touched.hoursLogged && errors.hoursLogged && (
                <p className="text-red-400 text-xs mt-1">{errors.hoursLogged}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Notes <span className="text-white/30">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="What did you help with?"
              value={form.notes}
              onChange={set("notes")}
              className={inputClass() + " resize-none"}
            />
          </div>

          {/* Error state */}
          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
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
              status === "loading"
                ? "bg-white/10 text-white/40 cursor-not-allowed"
                : "bg-gradient-to-r from-yellow-400 to-yellow-500 text-green-900 hover:from-yellow-300 hover:to-yellow-400 shadow-[0_4px_24px_rgba(255,215,0,0.3)] hover:shadow-[0_4px_32px_rgba(255,215,0,0.5)]",
            ].join(" ")}
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
      </GlassCard>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION: SPONSOR SHOWCASE
// ─────────────────────────────────────────────
const TIER_STYLES: Record<string, { label: string; color: string; size: string }> = {
  Gold: { label: "Gold Partner", color: "#FFD700", size: "col-span-2 sm:col-span-1" },
  Silver: { label: "Silver Partner", color: "#C0C0C0", size: "" },
  Bronze: { label: "Bronze Partner", color: "#cd7f32", size: "" },
  Community: { label: "Community Friend", color: "#60a5fa", size: "" },
};

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const tier = TIER_STYLES[sponsor.tier] ?? TIER_STYLES["Community"];
  const isGold = sponsor.tier === "Gold";
  return (
    <GlassCard gold={isGold} className={`p-5 group ${tier.size}`}>
      <div className="flex items-start gap-3">
        {/* Logo placeholder */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg"
          style={{
            background: `${tier.color}18`,
            border: `1px solid ${tier.color}44`,
            color: tier.color,
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {sponsor.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-bold text-sm leading-tight">{sponsor.name}</h3>
            {isGold && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
          </div>
          <p className="text-xs mt-0.5 font-medium" style={{ color: tier.color }}>
            {tier.label}
          </p>
          {sponsor.tagline && (
            <p className="text-white/40 text-xs mt-1.5 leading-relaxed">{sponsor.tagline}</p>
          )}
          {sponsor.website && (
            <a
              href={sponsor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs mt-2 hover:text-yellow-400 transition-colors"
              style={{ color: `${tier.color}99` }}
            >
              Visit <ChevronRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </GlassCard>
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
      <p className="text-center text-white/20 text-xs mt-6">
        Interested in becoming a partner?{" "}
        <a href="mailto:pta@besseycreek.edu" className="text-yellow-400/60 hover:text-yellow-400 transition-colors underline underline-offset-2">
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
    <footer className="border-t border-white/5 mt-8 py-8 text-center text-white/20 text-xs space-y-1">
      <p className="text-white/40 font-semibold">🐊 The Gator Grid</p>
      <p>Bessey Creek Elementary PTA · Stay Safe · Take Responsibility · Actively Learn · Respect Others</p>
      <p className="mt-2">© {new Date().getFullYear()} Bessey Creek Elementary PTA. All rights reserved.</p>
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

  // Prevent hydration mismatch: only fetch after mount
  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetchSheet<DashboardData>("Dashboard", FALLBACK_DASHBOARD).then(setDashboard),
      fetchSheet<SchoolEvent[]>("Events", FALLBACK_EVENTS).then(setEvents),
      fetchSheet<Sponsor[]>("Sponsors", FALLBACK_SPONSORS).then(setSponsors),
    ]);
  }, []);

  // During SSR / before hydration: render with fallback data to avoid flicker
  const dashData = mounted ? dashboard : FALLBACK_DASHBOARD;
  const eventsData = mounted ? events : FALLBACK_EVENTS;
  const sponsorsData = mounted ? sponsors : FALLBACK_SPONSORS;

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        :root {
          --forest: #006400;
          --gold: #FFD700;
        }
        body {
          background: #021402;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
      `}</style>

      <div
        className="min-h-screen text-white relative"
        style={{
          background: "radial-gradient(ellipse at 20% 0%, #0a3d0a 0%, #021402 50%, #000d00 100%)",
        }}
      >
        {/* Subtle grid texture */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,215,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.8) 1px, transparent 1px)",
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

import { Star, Quote, BadgeCheck } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Dr. Eleanor Vance",
      role: "Executive Principal",
      school: "Oakridge Global Academy",
      students: "1,850 Students",
      quote:
        "CampusPulse transformed our daily morning routine. Taking attendance across 52 classrooms previously took 40 minutes of paper shuttling; now every register is locked and verified within 90 seconds. Absent parents receive automated alerts without our staff making dozens of manual calls.",
      avatar: "EV",
      rating: 5,
    },
    {
      name: "Arthur Pendelton",
      role: "Chief Financial Officer",
      school: "St. Jude’s Educational Trust",
      students: "3,200 Students Across 3 Branches",
      quote:
        "The fee ledger with row-level transaction safety completely eliminated the double-receipt and payment reconciliation headaches we faced with our prior legacy ERP. Our fee collection velocity hit 99.4% in the very first quarter of adoption.",
      avatar: "AP",
      rating: 5,
    },
    {
      name: "Priya Sharma",
      role: "Head of Academics & Math Faculty",
      school: "Cambridge Heights International",
      students: "950 Students",
      quote:
        "Compiling end-of-term report cards used to consume two full weekends for our teaching staff. With CampusPulse’s exam workflow, marks entry, GPA calculations, and branded student transcripts were finished in one afternoon.",
      avatar: "PS",
      rating: 5,
    },
  ];

  return (
    <section className="relative bg-zinc-950/80 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
            <Star className="h-3.5 w-3.5 fill-emerald-400" />
            Verified Institutional Outcomes
          </div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Trusted by Educators, Admins &amp; CFOs Worldwide
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Discover why forward-thinking schools choose CampusPulse as their core educational
            operating system.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/90 sm:p-8"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>

                <Quote className="mt-4 h-6 w-6 text-emerald-400/40" />

                <p className="mt-2 text-xs leading-relaxed text-zinc-300 italic sm:text-sm">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3 border-t border-zinc-800/80 pt-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-md">
                  {t.avatar}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-xs font-semibold text-white sm:text-sm">
                      {t.name}
                    </span>
                    <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  </div>
                  <p className="truncate text-[11px] text-zinc-400">
                    {t.role} • {t.school}
                  </p>
                  <p className="font-mono text-[10px] text-emerald-400/80">{t.students}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import React, { useEffect, useMemo, useState } from "react";

/* ========= Film catalog ========= */
const initialFilms = [
 {
  id: "bundle",
  title: "MathCinema Bundle (5 Films)",
  tagline: "Five Pixar-style shorts about great mathematicians.",
  priceGBP: 40.0,
  duration: "5 short films",
  level: "KS3–KS4",
  cover: "/posters/bundle-5films-v3.jpg",
  purchaseLink: "https://buy.stripe.com/test_14AdRaciE0ck3qFbZN8N205", 
  includes: [
    "5 films in 1080p",
  ],
  tags: ["Bundle", "Classroom", "Best value"],
  embedSrc: "https://vimeo.com/showcase/11880291/embed2",

  // NEW: the bundle “playlist” = the IDs of films to show on the thanks page
  embedPlaylist: ["descartes", "emmy", "sophie", "pythagoras", "galois"]
},
  {
    id: "descartes",
    title: "Lines of Thought: The Life of René Descartes",
    tagline: "How a coordinate plane changed the world.",
    priceGBP: 10.0,
    duration: "2m 41s",
    level: "KS3–KS4",
    cover: "/posters/descartes.jpg",
    purchaseLink: "https://buy.stripe.com/4gM00k6Yk3ow2mBe7V8N201",
    trailerLink: "#",
    includes: ["Mastered 1080p MP4", "Teacher notes & scene prompts", "Captions (EN)"],
    tags: ["Cartesian geometry", "History", "Philosophy"],
    embedSrc: "https://player.vimeo.com/video/1118483220?h=b02ee66cb9",
  },
  {
    id: "pythagoras",
    title: "The Harmony of Numbers (Pythagoras)",
    tagline: "Number, music, and the secret life of triangles.",
    priceGBP: 15.0,
    duration: "6m",
    level: "KS3",
    cover: "/posters/pythagoras.jpg",
    purchaseLink: "https://buy.stripe.com/7sY5kE4QcaQY4uJaVJ8N204",
    trailerLink: "#",
    includes: ["Mastered 1080p MP4", "Teacher notes & scene prompts", "Captions (EN)"],
    tags: ["Triangles", "Music", "Ancient Greece"],
    embedSrc: "https://player.vimeo.com/video/1118492884?h=24235ab747",
    activityPath: "/activities/pythagorasv2.html",
activityTitle: "Squares on a Right Triangle (Web Sketchpad)",
  },
  {
    id: "sophie",
    title: "La Belle Sophie: Queen of the Primes",
    tagline: "Courage, curiosity, and the secrets of prime numbers.",
    priceGBP: 12.0,
    duration: "Short film",
    level: "KS3–KS4",
    cover: "/posters/sophie.jpg",
    purchaseLink: "https://buy.stripe.com/7sYbJ296sf7ef9n3th8N203",
    trailerLink: "#",
    includes: ["Mastered 1080p MP4", "Teacher notes & scene prompts", "Captions (EN)"],
    tags: ["Primes", "Resilience", "Women in Maths"],
    embedSrc: "https://player.vimeo.com/video/1118489526?h=530df61cb5",
  },
  {
    id: "emmy",
    title: "Emmy Noether – The Heartbeat of the Universe",
    tagline: "Symmetry and invariance powering modern mathematics.",
    priceGBP: 9.0,
    duration: "Short film",
    level: "KS4",
    cover: "/posters/emmy.jpg",
    purchaseLink: "https://buy.stripe.com/14A8wQdmI8IQ3qFaVJ8N202",
    trailerLink: "#",
    includes: ["Mastered 1080p MP4", "Teacher notes & scene prompts", "Captions (EN)"],
    tags: ["Symmetry", "Algebra", "Women in Maths"],
    embedSrc: "https://player.vimeo.com/video/1118491830?h=890a64cc3f",
  },
  
  {
  id: "galois",
  title: "Galois – The Fire of Algebra",
  tagline: "Revolution, genius, and the birth of modern algebra.",
  priceGBP: 12.0,
  duration: "3m 30s",
  level: "KS3–KS4",
  cover: "/posters/galois.jpg",
  purchaseLink: "https://buy.stripe.com/test_4gM00k6Yk3ow2mBe7V8N201",
  trailerLink: "#",
  includes: ["Mastered 1080p MP4", "Teacher notes & scene prompts (coming soon)", "Captions (EN)"],
  tags: ["Algebra", "Groups", "France"],
  embedSrc: "https://player.vimeo.com/video/1118453852?h=ae721f8202&badge=0&autopause=0&player_id=0&app_id=58479",
}





];
// Helper: read ?film=... from the URL hash and return that film object
function getThanksFilm(films) {
  try {
    const hash = window.location.hash || "";
    const qs = hash.includes("?") ? hash.split("?")[1] : "";
    const params = new URLSearchParams(qs);
    const id = params.get("film");
    return films.find(f => f.id === id) || null;
  } catch {
    return null;
  }
}

/* ========= Utils ========= */
const currency = (n) => `£${Number(n).toFixed(2)} GBP`;

/* ========= App ========= */
export default function App() {
  const [showActivity, setShowActivity] = useState(false);

  // Route (read from hash, e.g. "#films", "#thanks?film=galois")
  const [route, setRoute] = useState(
    (window.location.hash || "#home").replace("#", "") || "home"
  );

  // New: which film (if any) should the Thanks page show?
  const film = getThanksFilm(initialFilms);

  // New: detect "#thanks" even when it includes a query (?film=...)
  const onThanks = (route ?? "").split("?")[0] === "thanks";

  // Search and selection (as you had)
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  // Keep route in sync with hash changes
  useEffect(() => {
    const applyHash = () =>
      setRoute((window.location.hash || "#home").replace("#", "") || "home");
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  // Filter films by search query (unchanged)
  const filtered = useMemo(() => {
    const list = Array.isArray(initialFilms) ? initialFilms : [];
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((f) =>
      [f.title, f.tagline, ...(f.tags || [])].join(" ").toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
      <SiteNav route={route} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        {route === "home" && <Home />}

        {route === "films" && (
          <Films
            films={filtered}
            query={query}
            setQuery={setQuery}
            onSelect={setSelected}
          />
        )}

        {route === "museum" && <Museum />}
        {route === "about" && <About />}
        {route === "contact" && <Contact />}

        {/* ===== /#thanks – Vimeo player based on ?film=<id> ===== */}
       {onThanks && (
  <section id="thanks" className="max-w-5xl mx-auto px-4 py-16 text-slate-100">
    <h2 className="text-3xl font-semibold mb-1">Thanks for your purchase!</h2>
    <p className="mb-6 opacity-80">{film ? film.title : ""}</p>

    {/* If it's a bundle, render every film in the playlist */}
    {film?.embedPlaylist?.length ? (
      <div className="grid gap-10">
        {film.embedPlaylist
          .map(id => initialFilms.find(f => f.id === id))
          .filter(Boolean)
          .map(item => (
            <div key={item.id}>
              <div className="relative pt-[56.25%] rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
                <iframe
                  src={item.embedSrc}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  title={item.title}
                />
              </div>
              <h3 className="mt-3 text-lg font-medium">{item.title}</h3>
            </div>
          ))}
      </div>
    ) : film?.embedSrc ? (
      /* Single film (non-bundle) */
      <>
  {/* Vimeo player */}
  <div className="relative pt-[56.25%] rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
    <iframe
      src={film.embedSrc}
      className="absolute inset-0 h-full w-full"
      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      title={film.title}
    />
  </div>

  {/* Activity toggle (only if this film has an activity) */}
  {film?.activityPath && (
    <div className="mt-6">
      <button
        onClick={() => setShowActivity(v => !v)}
        className="inline-flex items-center gap-2 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-slate-900 font-semibold px-4 py-2 transition"
      >
        {showActivity ? "Hide activity" : "Open interactive activity"}
      </button>

      {showActivity ? (
        <div className="relative pt-[75%] mt-4 rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
          <iframe
            src={film.activityPath}
            className="absolute inset-0 h-full w-full"
            title={`${film.title} — activity`}
            allowFullScreen
          />
        </div>
      ) : (
        <p className="mt-2 opacity-60 text-sm">
          Explore the maths hands-on in the activity.
        </p>
      )}
    </div>
  )}
</>

    ) : (
      <p className="opacity-80">
        We couldn’t find a streaming link for this purchase. If you just paid, please use the link in your receipt
        or email <a className="underline" href="mailto:gerrydoch@gmail.com">gerrydoch@gmail.com</a>.
      </p>
    )}

    <div className="mt-6">
      <a href="#films" className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-600">
        ← Back to Films
      </a>
    </div>
  </section>
)}

        {/* ===== end /#thanks ===== */}
      </main>

      {selected && (
        <FilmModal film={selected} onClose={() => setSelected(null)} />
      )}
      <SiteFooter />
    </div>
  );
}


/* ========= Nav ========= */
function SiteNav({ route }) {
  const Link = ({ hash, children }) => (
    <a
      href={hash}
      className={`px-3 py-2 rounded-xl hover:bg-white/10 ${
        route === hash.replace("#", "") ? "text-cyan-300" : "text-white/80"
      }`}
    >
      {children}
    </a>
  );
  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b border-white/10 bg-slate-900/60">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <a href="#home" className="font-bold tracking-tight flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded bg-cyan-400" />
          MathCinema
        </a>
        <div className="flex gap-1">
          <Link hash="#home">Home</Link>
          <Link hash="#films">Films</Link>
          <Link hash="#museum">VR Museum</Link>
          <Link hash="#about">About</Link>
          <Link hash="#contact">Contact</Link>
        </div>
      </nav>
    </header>
  );
}

/* ========= Home & Hero ========= */
function Home() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-10">
      <div className="space-y-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
          Pixar-style animated films that make <span className="text-cyan-300">mathematics</span> unforgettable
        </h1>
        <p className="text-slate-300 text-lg">
          Showcase and sell your growing collection of short films about the great mathematicians.
          Explore your interactive <span className="text-white font-semibold">History of Maths Museum</span> in Virtway and Frame VR.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="#films" className="px-5 py-3 rounded-2xl bg-cyan-400/90 hover:bg-cyan-300 text-slate-900 font-semibold">
            Browse Films
          </a>
          <a href="#museum" className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10">
            Enter VR Museum
          </a>
        </div>
      </div>
      <HeroCard films={initialFilms} />
    </section>
  );
}

function HeroCard({ films }) {
  const featured = films.find((f) => f.id === "descartes");
  if (!featured) return null;
  return (
    <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
      <div className="relative w-full overflow-hidden rounded-t-3xl pt-[56.25%]">
        <img
          src={featured.cover}
          alt={featured.title}
          className="absolute inset-0 block h-full w-full object-contain bg-slate-900"
        />
      </div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
      <div className="absolute bottom-0 p-6 space-y-2 pointer-events-none">
        <h3 className="text-xl font-semibold">Featured: {featured.title}</h3>
        <p className="text-slate-300">{featured.tagline}</p>
      </div>
    </div>
  );
}

/* ========= Films ========= */
function Films({ films = [], query, setQuery, onSelect }) {
  const safeFilms = Array.isArray(films) ? films : [];
  return (
    <section className="py-12" id="films">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold">Films</h2>
          <p className="text-slate-300">Beautiful, classroom-friendly shorts about the giants of mathematics.</p>
        </div>
        <div className="w-full sm:w-80">
          <label htmlFor="search" className="sr-only">Search films</label>
          <input
            id="search"
            type="search"
            placeholder="Search by name or tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>
      </div>

      {safeFilms.length === 0 ? (
        <div className="rounded-2xl p-6 bg-white/5 ring-1 ring-white/10 text-slate-300">
          No films found. Clear the search above or check your film data.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {safeFilms.map((film) => (
            <article key={film.id} className="group rounded-3xl overflow-hidden ring-1 ring-white/10 bg-white/5 hover:bg-white/10 transition shadow-xl">
              <button onClick={() => onSelect?.(film)} className="block text-left w-full">
                {/* 16:9 poster – contained */}
                <div className="relative w-full overflow-hidden rounded-t-3xl pt-[56.25%]">
                  <img
                    src={film.cover}
                    alt={`${film.title} cover`}
                    className="absolute inset-0 block h-full w-full object-contain bg-slate-900"
                  />
                  {film.level && (
                    <span className="absolute top-3 left-3 text-xs px-2 py-1 rounded-full bg-black/60 ring-1 ring-white/10">
                      {film.level}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-lg font-semibold leading-snug">{film.title}</h3>
                  <p className="text-slate-300 text-sm">{film.tagline}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-200 font-semibold">{currency(film.priceGBP)}</span>
                    {film.duration && <span className="text-slate-400 text-xs">{film.duration}</span>}
                  </div>
                </div>
              </button>
              <div className="px-4 pb-4 flex gap-2">
                <a href={film.trailerLink || "#"} target="_blank" rel="noreferrer" className="flex-1 text-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm">
                  Watch trailer
                </a>
                <a href={film.purchaseLink} target="_blank" rel="noreferrer" className="flex-1 text-center px-4 py-2 rounded-xl bg-cyan-400/90 hover:bg-cyan-300 text-slate-900 font-semibold text-sm">
                  Buy now
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ========= Modal ========= */
function FilmModal({ film, onClose }) {
  if (!film) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-lg w-full rounded-3xl bg-slate-900 ring-1 ring-white/10 overflow-hidden">
        <div className="relative w-full overflow-hidden rounded-t-3xl pt-[56.25%]">
          <img src={film.cover} alt={film.title} className="absolute inset-0 block h-full w-full object-contain bg-slate-900" />
        </div>
        <div className="p-6 space-y-3">
          <h3 className="text-2xl font-bold">{film.title}</h3>
          <p className="text-slate-300">{film.tagline}</p>
          <ul className="list-disc list-inside text-slate-300">
            {(film.includes || []).map((item, i) => <li key={i}>{item}</li>)}
          </ul>
          <div className="flex gap-2 pt-2">
            <a href={film.purchaseLink} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-cyan-400/90 hover:bg-cyan-300 text-slate-900 font-semibold">
              Buy now ({currency(film.priceGBP)})
            </a>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= Museum ========= */
function Museum() {
  return (
    <section className="py-12 space-y-8" id="museum">
      <header className="space-y-2">
        <h2 className="text-3xl font-bold">History of Maths Museum</h2>
        <p className="text-slate-300 max-w-3xl">
          Explore interactive exhibits built on <span className="font-semibold">Frame VR</span> and <span className="font-semibold">Virtway</span>.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VRCard
          title="Frame VR Museum"
          description="Virtual gallery of the great mathematicians in history."
          cover="/posters/framevr.png"
          primaryLabel="Open in Frame VR"
          primaryLink="https://framevr.io/cvw-olz-xsp"
        />
        <VRCard
          title="Virtway · Maths History Escape Room"
          description="Multi-user 3D environment with guided tours and live escape-room puzzles."
          cover="/posters/virtway.png"
          primaryLabel="Enter on Virtway"
          primaryLink="https://webgl.virtway.com/vyxzghkx/894e00ff-d7eb-416b-a9ab-9a7005c9edd1"
        />
      </div>
    </section>
  );
}

function VRCard({ title, description, cover, primaryLabel, primaryLink }) {
  return (
    <article className="rounded-3xl overflow-hidden ring-1 ring-white/10 bg-white/5 shadow-2xl">
      <div className="relative w-full overflow-hidden rounded-t-3xl pt-[56.25%]">
        <img src={cover} alt={title} className="absolute inset-0 block h-full w-full object-contain bg-slate-900" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
        <h3 className="absolute bottom-4 left-4 text-2xl font-bold">{title}</h3>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-slate-300">{description}</p>
        <div className="flex flex-wrap gap-3">
          <a href={primaryLink} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-cyan-400/90 hover:bg-cyan-300 text-slate-900 font-semibold">
            {primaryLabel}
          </a>
        </div>
      </div>
    </article>
  );
}

/* ========= About / Contact / Footer ========= */
function About() {
  return (
    <section className="py-12 space-y-3 max-w-3xl">
      <h2 className="text-3xl font-bold">About</h2>
      <p className="text-slate-300">
        MathCinema creates animated short films that bring the history of mathematics to life, crafted for classroom and home learning.
      </p>
    </section>
  );
}

function Contact() {
  return (
    <section className="py-12 space-y-3 max-w-3xl">
      <h2 className="text-3xl font-bold">Contact</h2>
      <p className="text-slate-300">
        Questions, school licensing, or collaborations? Email{" "}
        <a href="mailto:gerrydocherty@gmail.com" className="text-cyan-300 underline">gerrydocherty@gmail.com</a>.
      </p>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-3 text-sm text-slate-300">
        <div>
          <div className="font-semibold text-white">MathCinema</div>
          <p className="mt-2">Cinematic learning resources about the history of mathematics.</p>
        </div>
        <div>
          <div className="font-semibold text-white">Quick links</div>
          <ul className="space-y-1 mt-2">
            <li><a href="#films" className="hover:underline">Films</a></li>
            <li><a href="#museum" className="hover:underline">VR Museum</a></li>
            <li><a href="#about" className="hover:underline">About</a></li>
            <li><a href="#contact" className="hover:underline">Contact</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white">Buying & Licensing</div>
          <ul className="space-y-1 mt-2">
            <li>Single film license — educational use</li>
            <li>Site licenses available on request</li>
            <li>Payments via Stripe</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

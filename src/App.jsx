import React, { useEffect, useMemo, useState } from "react";
import RequireMembership from "./RequireMembership";
import { supabase } from "./supabaseClient";

/* ========= Trailer Vimeo embed links (modal) =========
   Use the player.vimeo.com/video/{id} format.
   dnt=1 helps make embeds more privacy-friendly.
*/
const TRAILER_SRC_BY_ID = {
  descartes: "https://player.vimeo.com/video/1148631164?dnt=1",
  pythagoras: "https://player.vimeo.com/video/1148855527?dnt=1",
  sophie: "https://player.vimeo.com/video/1148617192?dnt=1",
  emmy: "https://player.vimeo.com/video/1148619726?dnt=1",
  galois: "https://player.vimeo.com/video/1148623753?dnt=1",
  fibonacci: "https://player.vimeo.com/video/1148624820?dnt=1",
  euler: "https://player.vimeo.com/video/1148627807?dnt=1",
};

// Ensures Vimeo embeds are cookie-free (and optionally autoplay muted)
const buildVimeoSrc = (raw, { autoplay = false, muted = true } = {}) => {
  // Important: sometimes URLs get pasted with HTML entities like &amp;
  let url = (raw || "").replace(/&amp;/g, "&");
  const add = (k, v) => (u) => u + (u.includes("?") ? "&" : "?") + `${k}=${v}`;

  if (!/(\?|&)dnt=1(\b|&)/.test(url)) url = add("dnt", "1")(url);

  // Optional cleanup (prevents Vimeo showing headings in embeds)
  if (!/(\?|&)title=0(\b|&)/.test(url)) url = add("title", "0")(url);
  if (!/(\?|&)byline=0(\b|&)/.test(url)) url = add("byline", "0")(url);
  if (!/(\?|&)portrait=0(\b|&)/.test(url)) url = add("portrait", "0")(url);

  if (autoplay) {
    if (!/(\?|&)autoplay=1(\b|&)/.test(url)) url = add("autoplay", "1")(url);
    if (muted && !/(\?|&)muted=1(\b|&)/.test(url)) url = add("muted", "1")(url);
  }

  return url;
};

/* ========= Trailer Modal ========= */
function TrailerModal({ open, title, src, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-5xl rounded-3xl bg-slate-900 ring-1 ring-white/10 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="text-white font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 bg-white/10 text-white hover:bg-white/15 border border-white/10"
            type="button"
          >
            Close
          </button>
        </div>

        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={src}
            title={title}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}

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
    purchaseLink: "https://buy.stripe.com/6oU14o2I4bV22mB5Bp8N206",
    includes: ["5 films in 1080p"],
    tags: ["Bundle", "Classroom", "Best value"],
    embedSrc: "https://vimeo.com/showcase/11880291/embed2",
    embedPlaylist: ["descartes", "emmy", "sophie", "pythagoras", "galois"],
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
    activity: {
      options: [
        {
          key: "straight",
          label: "Straight Lines",
          path: "/activities/descartes/straight_lines.html",
        },
      ],
      defaultKey: "straight",
    },
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
    activity: {
      options: [{ key: "germain", label: "Germain Primes Builder", path: "/activities/sophie/germain.html" }],
      defaultKey: "germain",
    },
  },
  {
    id: "emmy",
    title: "Emmy Noether — The Heartbeat of the Universe",
    tagline: "Symmetry and invariance powering modern mathematics.",
    priceGBP: 9.0,
    duration: "Short film",
    level: "KS4",
    cover: "/posters/emmy.jpg",
    purchaseLink: "https://buy.stripe.com/14A8wQdmI8IQ3qFaVJ8N202",
    trailerLink: "#",
    includes: ["Mastered 1080p MP4", "Teacher notes & scene prompts", "Captions (EN)"],
    tags: ["Symmetry", "Algebra", "Women in Maths"],
    embedSrc:
      "https://player.vimeo.com/video/1118491830?h=890a64cc3f&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479",
    activity: {
      options: [
        { key: "reflections", label: "Reflections", path: "/activities/emmy/reflections.html" },
        { key: "rotations", label: "Rotations", path: "/activities/emmy/rotations.html" },
      ],
      defaultKey: "reflections",
    },
  },
  {
    id: "galois",
    title: "Galois – The Fire of Algebra",
    tagline: "Revolution, genius, and the birth of modern algebra.",
    priceGBP: 12.0,
    duration: "3m 30s",
    level: "KS3–KS4",
    cover: "/posters/galois.jpg",
    purchaseLink: "https://buy.stripe.com/fZuaEYciEe3a2mB5Bp8N207",
    trailerLink: "#",
    includes: ["Mastered 1080p MP4", "Teacher notes & scene prompts (coming soon)", "Captions (EN)"],
    tags: ["Algebra", "Groups", "France"],
    embedSrc: "https://player.vimeo.com/video/1118453852?h=ae721f8202&badge=0&autopause=0&player_id=0&app_id=58479",
    activity: {
      options: [{ key: "clock6", label: "Clock Arithmetic (mod 6)", path: "/activities/galois/clock_mod6_fill.html" }],
      defaultKey: "clock6",
    },
  },
  {
    id: "fibonacci",
    title: "The Spiral of Light",
    tagline: "Where numbers bloom into nature’s secret pattern.",
    priceGBP: 15.0,
    duration: "3m 40s",
    level: "KS3–KS4",
    cover: "/posters/fibonacci-v3.jpg",
    purchaseLink: "https://buy.stripe.com/5kQeVeeqMaQY6CRe7V8N208",
    trailerLink: "#",
    includes: ["Mastered 1080p MP4", "Teacher notes & prompts (soon)", "Captions (EN)"],
    tags: ["Fibonacci", "Nature", "Sequences", "Golden Ratio"],
    embedSrc: "https://player.vimeo.com/video/1140772794?h=63ac4aa635&dnt=1",
    activity: {
      options: [{ key: "rabbits", label: "Rabbit challenge", path: "/activities/fibonacci/rabbit-challenge.html" }],
      defaultKey: "rabbits",
    },
  },
  {
    id: "euler",
    title: "Threads of Infinity – Leonhard Euler",
    tagline: "From bridges to the infinite — one mind’s elegant path.",
    priceGBP: 10.0,
    duration: "2m 28s",
    level: "KS3–KS4",
    cover: "/posters/euler-v1.jpg",
    purchaseLink: "https://buy.stripe.com/fZu9AUgyU2ks6CR6Ft8N209",
    trailerLink: "#",
    embedSrc: "https://player.vimeo.com/video/1141766184?h=6cab270d17&badge=0&autopause=0&player_id=0&app_id=58479",
    includes: ["Mastered 1080p MP4", "Interactive Bridges of Königsberg activity", "Captions (EN)"],
    tags: ["Euler", "graph theory", "bridges", "history of mathematics"],
    activity: {
      options: [
        {
          key: "konigsberg",
          label: "Bridges of Königsberg",
          path: "/activities/euler/konigsberg-bridges-challenge.html",
        },
      ],
      defaultKey: "konigsberg",
    },
  },
];

// Helper: read ?film=... from the URL hash and return that film object
function getThanksFilm(films) {
  try {
    const hash = window.location.hash || "";
    const qs = hash.includes("?") ? hash.split("?")[1] : "";
    const params = new URLSearchParams(qs);
    const id = params.get("film");
    return films.find((f) => f.id === id) || null;
  } catch {
    return null;
  }
}

/* ========= Utils ========= */
const currency = (n) => `£${Number(n).toFixed(2)} GBP`;

/* ========= App ========= */
export default function App() {
  React.useEffect(() => {
    const run = async () => {
      if (window.location.pathname === "/auth/callback") {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        // even if error, send them somewhere sensible
        window.location.replace("/#museum");
      }
    };
    run();
  }, []);

  const [showActivity, setShowActivity] = useState(false);
  const [activityKey, setActivityKey] = useState(null);

  // Trailer modal state
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerFilmId, setTrailerFilmId] = useState(null);
  const [trailerTitle, setTrailerTitle] = useState("");

  const openTrailer = (film) => {
    const raw = TRAILER_SRC_BY_ID?.[film?.id];
    if (!raw) return;
    setTrailerFilmId(film.id);
    setTrailerTitle(`${film.title} Trailer`);
    setTrailerOpen(true);
  };

  const closeTrailer = () => {
    setTrailerOpen(false);
    setTrailerFilmId(null);
    setTrailerTitle("");
  };

  // Route (read from hash, e.g. "#films", "#thanks?film=galois")
  const [route, setRoute] = useState((window.location.hash || "#home").replace("#", "") || "home");

  // New: which film (if any) should the Thanks page show?
  const film = getThanksFilm(initialFilms);
  useEffect(() => {
    setActivityKey(film?.activity?.defaultKey ?? film?.activity?.options?.[0]?.key ?? null);
    setShowActivity(false);
  }, [film?.id]);

  // New: detect "#thanks" even when it includes a query (?film=...)
  const onThanks = (route ?? "").split("?")[0] === "thanks";

  // Search and selection (as you had)
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  // Keep route in sync with hash changes
  useEffect(() => {
    const applyHash = () => setRoute((window.location.hash || "#home").replace("#", "") || "home");
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  // Filter films by search query (unchanged)
  const filtered = useMemo(() => {
    const list = Array.isArray(initialFilms) ? initialFilms : [];
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((f) => [f.title, f.tagline, ...(f.tags || [])].join(" ").toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
      <SiteNav route={route} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        {route === "home" && <Home />}

        {route === "films" && (
          <Films films={filtered} query={query} setQuery={setQuery} onSelect={setSelected} onOpenTrailer={openTrailer} />
        )}

        {route === "museum" && <Museum />}
        {route === "about" && <About />}
        {route === "contact" && <Contact />}

        {/* ======= #thanks ======= */}
        {onThanks && (
          <section id="thanks" className="max-w-5xl mx-auto px-4 py-16 text-slate-100">
            <h2 className="text-3xl font-semibold mb-1">Thanks for your purchase!</h2>
            <p className="mb-6 opacity-80">{film ? film.title : ""}</p>

            {/* 1) VIDEO: playlist -> single -> fallback */}
            {film?.embedPlaylist?.length ? (
              <div className="grid gap-10">
                {film.embedPlaylist
                  .map((id) => initialFilms.find((f) => f.id === id))
                  .filter(Boolean)
                  .map((item) => (
                    <div key={item.id}>
                      <div className="relative pt-[56.25%] rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
                        <iframe
                          src={buildVimeoSrc(item.embedSrc, { autoplay: false })}
                          className="absolute inset-0 h-full w-full"
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          title={item.title}
                        />
                      </div>
                      <h3 className="mt-3 text-lg font-medium">{item.title}</h3>
                    </div>
                  ))}
              </div>
            ) : film?.embedSrc ? (
              <div className="relative pt-[56.25%] rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
                <iframe
                  src={buildVimeoSrc(film.embedSrc, { autoplay: false })}
                  className="absolute inset-0 h-full w-full"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title={film.title}
                />
              </div>
            ) : (
              <p className="opacity-80">
                We couldn’t find a streaming link for this purchase. If you just paid, please use the link in your
                receipt or email{" "}
                <a className="underline" href="mailto:gerrydoch@gmail.com">
                  gerrydoch@gmail.com
                </a>
                .
              </p>
            )}

            {/* 2) ACTIVITY: tabs + drawer */}
            {film?.activity?.options?.length ? (
              <div className="mt-6">
                {/* tab buttons */}
                <div className="mb-3 flex gap-2 flex-wrap">
                  {film.activity.options.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setActivityKey(opt.key);
                        setShowActivity(true);
                      }}
                      className={`px-3 py-1 rounded-lg border transition ${
                        activityKey === opt.key
                          ? "bg-amber-500 text-slate-900 border-amber-500"
                          : "border-amber-500 text-amber-300 hover:text-amber-200"
                      }`}
                      type="button"
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowActivity((v) => !v)}
                    className="ml-auto rounded-lg bg-amber-500/90 hover:bg-amber-500 text-slate-900 font-semibold px-4 py-2"
                    type="button"
                  >
                    {showActivity ? "Hide activity" : "Open interactive activity"}
                  </button>
                </div>

                {/* activity iframe */}
                {showActivity && activityKey && (
                  <div className="relative pt-[75%] rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
                    <iframe
                      src={film.activity.options.find((o) => o.key === activityKey)?.path}
                      className="absolute inset-0 h-full w-full"
                      title={`${film.title} — ${activityKey} activity`}
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            ) : null}

            {/* 3) Back link */}
            <div className="mt-6">
              <a href="#films" className="inline-flex items-center rounded-lg bg-sky-500 text-slate-900 font-semibold px-3 py-2">
                ← Back to Films
              </a>
            </div>
          </section>
        )}

        {/* ===== end /#thanks ===== */}
      </main>

      {selected && <FilmModal film={selected} onClose={() => setSelected(null)} />}

      {/* Trailer Modal (global) */}
      <TrailerModal
        open={trailerOpen}
        title={trailerTitle}
        src={buildVimeoSrc(trailerFilmId ? TRAILER_SRC_BY_ID[trailerFilmId] : "", { autoplay: true, muted: true })}
        onClose={closeTrailer}
      />

      {route === "pricing" && <Pricing />}
      <SiteFooter />
    </div>
  );
}

/* ========= Nav ========= */
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

  const resourcesUrl = "https://mathsthehumanstory.my.canva.site/";

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
          <Link hash="#pricing">Pricing</Link>
          <Link hash="#about">About</Link>
          <Link hash="#contact">Contact</Link>

          {/* External link */}
          <a
            href={resourcesUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-xl hover:bg-white/10 text-white/80"
          >
            Maths History Resources
          </a>
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
          Enjoy our growing collection of short films about the great mathematicians throughout history. Explore our
          interactive <span className="text-white font-semibold">History of Maths Museum and History of Maths Escape Room</span>{" "}
          in Virtway and Frame VR.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="#films"
            className="px-5 py-3 rounded-2xl bg-cyan-400/90 hover:bg-cyan-300 text-slate-900 font-semibold"
          >
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
function Films({ films = [], query, setQuery, onSelect, onOpenTrailer }) {
  const safeFilms = Array.isArray(films) ? films : [];
  return (
    <section className="py-12" id="films">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold">Films</h2>
          <p className="text-slate-300">Beautiful, classroom-friendly shorts about the giants of mathematics.</p>
        </div>
        <div className="w-full sm:w-80">
          <label htmlFor="search" className="sr-only">
            Search films
          </label>
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
          {safeFilms.map((film) => {
            const hasTrailer = !!TRAILER_SRC_BY_ID?.[film.id];
            return (
              <article
                key={film.id}
                className="group rounded-3xl overflow-hidden ring-1 ring-white/10 bg-white/5 hover:bg-white/10 transition shadow-xl"
              >
                <button onClick={() => onSelect?.(film)} className="block text-left w-full" type="button">
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
                  <button
                    type="button"
                    onClick={() => hasTrailer && onOpenTrailer?.(film)}
                    disabled={!hasTrailer}
                    className={`flex-1 text-center px-4 py-2 rounded-xl border text-sm transition ${
                      hasTrailer
                        ? "bg-white/10 hover:bg-white/20 border-white/10"
                        : "bg-white/5 border-white/10 text-white/40 cursor-not-allowed"
                    }`}
                    title={hasTrailer ? "Watch trailer" : "Trailer not available"}
                  >
                    Watch trailer
                  </button>

                  <a
                    href={film.purchaseLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center px-4 py-2 rounded-xl bg-cyan-400/90 hover:bg-cyan-300 text-slate-900 font-semibold text-sm"
                  >
                    Buy now
                  </a>
                </div>
              </article>
            );
          })}
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
          <img
            src={film.cover}
            alt={film.title}
            className="absolute inset-0 block h-full w-full object-contain bg-slate-900"
          />
        </div>
        <div className="p-6 space-y-3">
          <h3 className="text-2xl font-bold">{film.title}</h3>
          <p className="text-slate-300">{film.tagline}</p>
          <ul className="list-disc list-inside text-slate-300">
            {(film.includes || []).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <div className="flex gap-2 pt-2">
            <a
              href={film.purchaseLink}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-cyan-400/90 hover:bg-cyan-300 text-slate-900 font-semibold"
            >
              Buy now ({currency(film.priceGBP)})
            </a>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10" type="button">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= Museum ========= */
/* ========= Museum ========= */
function Museum() {
  return (
    <section className="py-12 space-y-8" id="museum">
      <header className="space-y-2">
        <h2 className="text-3xl font-bold">History of Maths Museum</h2>
        <p className="text-slate-300 max-w-3xl">
          Explore interactive exhibits built on <span className="font-semibold">Frame VR</span> and{" "}
          <span className="font-semibold">Virtway</span>.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VRCard
          title="Frame VR Museum"
          description="A virtual gallery of the great mathematicians in history."
          cover="/posters/framevr.png"
          accessLabel="Open in Frame VR"
          accessLink="https://framevr.io/cvw-olz-xsp"
        />

        <VRCard
          title="Virtway · Maths History Escape Room"
          description="A multi-user 3D environment with guided tours and live escape-room puzzles."
          cover="/posters/virtway.png"
          accessLabel="Enter on Virtway"
          accessLink="https://webgl.virtway.com/...."
        />
      </div>

      <p className="text-sm text-slate-400">
        Preview the experiences above. Full access requires an active membership.
      </p>
    </section>
  );
}


function VRCard({ title, description, cover, accessLabel, accessLink }) {
  const [status, setStatus] = React.useState("loading"); // loading | active | inactive

  React.useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const email = auth?.user?.email?.toLowerCase();

        if (!email) {
          if (alive) setStatus("inactive");
          return;
        }

        const { data, error } = await supabase
          .from("memberships")
          .select("status")
          .eq("email", email)
          .maybeSingle();

        if (error) {
          console.warn("Membership lookup failed:", error.message);
          if (alive) setStatus("inactive");
          return;
        }

        if (alive) setStatus(data?.status === "active" ? "active" : "inactive");
      } catch (e) {
        console.warn("Membership check error:", e);
        if (alive) setStatus("inactive");
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  const canAccess = status === "active";

  return (
    <article className="rounded-3xl overflow-hidden ring-1 ring-white/10 bg-white/5 shadow-2xl">
      <div className="relative w-full overflow-hidden rounded-t-3xl pt-[56.25%]">
        <img
          src={cover}
          alt={title}
          className="absolute inset-0 block h-full w-full object-contain bg-slate-900"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
        <h3 className="absolute bottom-4 left-4 text-2xl font-bold">{title}</h3>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-slate-300">{description}</p>

        {!canAccess ? (
          <div className="text-sm text-slate-300 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            Full access requires an active membership.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {status === "loading" ? (
            <button
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-slate-300 cursor-not-allowed"
              type="button"
              disabled
            >
              Checking access…
            </button>
          ) : canAccess ? (
            <a
              href={accessLink}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-cyan-400/90 hover:bg-cyan-300 text-slate-900 font-semibold"
            >
              {accessLabel || "Open"}
            </a>
          ) : (
            <a
              href="#pricing"
              className="px-4 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-slate-900 font-semibold"
            >
              Subscribe to access
            </a>
          )}
        </div>
      </div>
    </article>
  );
}


/* ========= About / Contact / Footer ========= */
function Pricing() {
  const [billing, setBilling] = React.useState("monthly"); // "monthly" | "yearly"

  const stripe = {
    family: {
      monthly: "https://buy.stripe.com/28EcN66Ykgbi0etfbZ8N20a",
      yearly: "https://buy.stripe.com/4gMaEY0zW3ow8KZ2pd8N20b",
    },
    schools: {
      monthly: "https://buy.stripe.com/5kQ8wQ6Yk8IQ6CR2pd8N20c",
      yearly: "https://buy.stripe.com/4gM4gAgyUf7e4uJbZN8N20d",
    },
  };

  const priceText = (m, y) => (billing === "monthly" ? m : y);

  return (
    <section id="pricing" className="py-12 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-2 max-w-3xl">
        <h2 className="text-3xl font-bold">Pricing</h2>
        <p className="text-slate-300">
          Choose single films, or unlock full access to all films, activities, the Museum, and the Escape Room.
        </p>
      </div>

      <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            billing === "monthly" ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          type="button"
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            billing === "yearly" ? "bg-white/10 text-white" : "text-slate-300"
          }`}
          type="button"
        >
          Yearly (save 2 months)
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tier 1 */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="text-xs font-bold text-slate-200 bg-white/5 border border-white/10 inline-block px-3 py-1 rounded-full">
            Tier 1
          </div>
          <div>
            <h3 className="text-xl font-semibold">Family &amp; Homeschool</h3>
            <div className="text-3xl font-bold mt-2">
              {priceText("£20", "£200")}
              <span className="text-sm text-slate-300 font-semibold">{billing === "monthly" ? " / month" : " / year"}</span>
            </div>
            {billing === "yearly" && <div className="text-emerald-300 text-sm font-bold">Save £40 with yearly</div>}
          </div>

          <ul className="space-y-2 text-slate-200">
            <li>• Full access to all films (while subscribed)</li>
            <li>• All Maths Activities for every film</li>
            <li>• Maths History Museum (full access)</li>
            <li>• Escape Room (full access)</li>
            <li>• New releases included during membership</li>
          </ul>

          <div className="flex flex-wrap gap-3">
            <a
              href={billing === "monthly" ? stripe.family.monthly : stripe.family.yearly}
              className="px-4 py-2 rounded-xl font-bold bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/30"
              target="_blank"
              rel="noreferrer"
            >
              Start Family Membership
            </a>
            <a
              href={stripe.family.yearly}
              className="px-4 py-2 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10"
              target="_blank"
              rel="noreferrer"
            >
              Choose Yearly
            </a>
          </div>

          <p className="text-sm text-slate-300">Ideal for home learning, curious families, and weekend maths explorers.</p>
        </div>

        {/* Tier 2 */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="text-xs font-bold text-slate-200 bg-white/5 border border-white/10 inline-block px-3 py-1 rounded-full">
            Tier 2
          </div>
          <div>
            <h3 className="text-xl font-semibold">Schools</h3>
            <div className="text-3xl font-bold mt-2">
              {priceText("£50", "£500")}
              <span className="text-sm text-slate-300 font-semibold">{billing === "monthly" ? " / month" : " / year"}</span>
            </div>
            {billing === "yearly" && <div className="text-emerald-300 text-sm font-bold">Save £100 with yearly</div>}
          </div>

          <ul className="space-y-2 text-slate-200">
            <li>• Full access to all films (while subscribed)</li>
            <li>• All Maths Activities for every film</li>
            <li>• Maths History Museum (full access)</li>
            <li>• Escape Room (full access)</li>
            <li>• New releases included during subscription</li>
            <li>• One school site up to 1000 students</li>
            <li>• Unlimited teacher accounts</li>
          </ul>

          <div className="flex flex-wrap gap-3">
            <a
              href={billing === "monthly" ? stripe.schools.monthly : stripe.schools.yearly}
              className="px-4 py-2 rounded-xl font-bold bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/30"
              target="_blank"
              rel="noreferrer"
            >
              Start Schools Membership
            </a>
            <a
              href={stripe.schools.yearly}
              className="px-4 py-2 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10"
              target="_blank"
              rel="noreferrer"
            >
              Choose Yearly
            </a>
            <a href="#contact" className="px-4 py-2 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10">
              Multi-campus or trust? Contact us
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
        <h3 className="text-xl font-semibold">Single Film + Activities</h3>
        <p className="text-slate-300">
          Buy one film and its Maths Activities pack. The Museum and Escape Room are included with Full Access Membership
          only.
        </p>
        <ul className="space-y-1 text-slate-200">
          <li>• Includes: 1 selected film + the Maths Activities for that film</li>
          <li>• Does not include: Museum, Escape Room, or access to other films</li>
        </ul>
        <div className="text-sm text-slate-300">Browse films below and use the “Buy” button on the film you want.</div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="py-12 space-y-3 max-w-3xl">
      <h2 className="text-3xl font-bold">About</h2>
      <p className="text-slate-300">
        MathCinema creates animated short films that bring the history of mathematics to life, crafted for classroom and home
        learning.
      </p>
    </section>
  );
}

function Contact() {
  return (
    <section className="py-12 space-y-3 max-w-3xl">
      <h2 className="text-3xl font-bold">Contact</h2>
      <p className="text-slate-300">
        Questions, school licensing, or subscriptions help? Email{" "}
        <a href="mailto:gerrydocherty@gmail.com" className="text-cyan-300 underline">
          gerrydocherty@gmail.com
        </a>
        .
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
            <li>
              <a href="#films" className="hover:underline">
                Films
              </a>
            </li>
            <li>
              <a href="#museum" className="hover:underline">
                VR Museum
              </a>
            </li>
            <li>
              <a href="#pricing" className="hover:underline">
                Pricing
              </a>
            </li>
            <li>
              <a href="#about" className="hover:underline">
                About
              </a>
            </li>
            <li>
              <a href="#contact" className="hover:underline">
                Contact
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white">Buying & Licensing</div>
          <ul className="space-y-1 mt-2">
            <li>Single film license — educational use</li>
            <li>Site licenses available on request</li>
            <li>Payments via Stripe</li>
            <li>
              <a href="#contact" className="hover:underline">
                Manage subscription
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

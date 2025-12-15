import React from "react";
import { supabase } from "./supabaseClient";

export default function RequireMembership({ children, subscribeHash = "#pricing" }) {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState(null);
  const [membership, setMembership] = React.useState(null);
  const [email, setEmail] = React.useState("");

  // 1) Watch auth state
  React.useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data?.user || null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // 2) Load membership row for the signed-in email
  React.useEffect(() => {
    async function loadMembership() {
      if (!user?.email) {
        setMembership(null);
        return;
      }

      const emailLower = user.email.toLowerCase();

      const { data, error } = await supabase
        .from("memberships")
        .select("status,tier,current_period_end")
        .eq("email", emailLower)
        .maybeSingle();

      setMembership(error ? null : data);
    }

    loadMembership();
  }, [user]);

  const isActive = membership?.status === "active" || membership?.status === "trialing";

  async function sendMagicLink() {
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});


    if (error) alert(error.message);
    else alert("Check your email for the sign-in link.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMembership(null);
  }

  if (loading) return <div className="text-slate-300">Loading…</div>;

  // Not signed in
  if (!user) {
    return (
      <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
        <h3 className="text-xl font-semibold">Sign in to access</h3>
        <p className="text-slate-300">Enter your email and we’ll send you a sign-in link.</p>
        <div className="flex flex-wrap gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.org"
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
          />
          <button
            onClick={sendMagicLink}
            className="px-4 py-2 rounded-xl font-bold bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/30"
          >
            Send link
          </button>
        </div>
      </div>
    );
  }

  // Signed in but not active member yet
  if (!isActive) {
    return (
      <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-xl font-semibold">Members-only</h3>
          <button onClick={signOut} className="text-sm text-slate-300 hover:underline">
            Sign out
          </button>
        </div>
        <p className="text-slate-300">
          The Museum and Escape Room are included with Full Access Membership.
        </p>
        <a
          href={subscribeHash}
          className="px-4 py-2 rounded-xl font-bold bg-cyan-500/20 border border-cyan-400/30 hover:bg-cyan-500/30 inline-block"
        >
          View Membership Options
        </a>
      </div>
    );
  }

  // Active member
  return <div className="contents">{children}</div>;
}


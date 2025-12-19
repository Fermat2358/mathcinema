// netlify/functions/stripe-webhook.js
const Stripe = require("stripe");
exports.handler = async (event) => {
  // Stripe requires the *raw* request body for signature verification.
  if (event.httpMethod !== "POST") {
  return { statusCode: 405, body: "Method Not Allowed" };
}

  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return { statusCode: 500, body: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" };
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  // Raw body handling (Netlify sometimes base64-encodes)
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return { statusCode: 400, body: `Webhook signature verification failed: ${err.message}` };
  }



  // Minimal Supabase REST call (no extra package needed)
  async function supabaseUpsertMembership(row) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/memberships`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([row]),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase upsert failed: ${res.status} ${text}`);
    }
  }

  async function supabaseUpdateStatusByEmail(email, patch) {
    const params = new URLSearchParams({ email: `eq.${email}` });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/memberships?${params.toString()}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase update failed: ${res.status} ${text}`);
    }
  }

  try {
    switch (stripeEvent.type) {
      // Fired after Payment Link / Checkout completes
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;

        // For subscriptions, session.subscription will exist
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        // Email usually available here:
        const email =
          session.customer_details?.email ||
          session.customer_email ||
          null;

        if (!email) break;

        let priceId = null;
        let currentPeriodEndIso = null;
        let status = "active";
        let tier = null;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId, {
  expand: ["items.data.price"],
});


          status = sub.status || "active";
          currentPeriodEndIso = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;

          // Pull the subscription’s first item price
          priceId = sub.items?.data?.[0]?.price?.id || null;
        } else {
          // One-time purchases (if you ever add them)
          // Try to read line items for a price id
          const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
          priceId = lines.data?.[0]?.price?.id || null;
        }

       tier = "unknown";
if (priceId) {
  try {
    const price = await stripe.prices.retrieve(priceId);
    tier = (price?.metadata?.tier || "unknown").trim().toLowerCase();

  } catch (e) 
  {console.error("Failed to retrieve price", priceId, e);
    tier = "unknown";
  }
}


        await supabaseUpsertMembership({
          email,
          tier: tier || "unknown",
          status,
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subscriptionId || null,
          price_id: priceId || null,
          current_period_end: currentPeriodEndIso,
          updated_at: new Date().toISOString(),
        });

        break;
      }

      // Subscription lifecycle updates
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object;

        const customerId = sub.customer;
        const status = sub.status;
        const priceId = sub.items?.data?.[0]?.price?.id || null;
        const tier = priceId ? PRICE_TO_TIER[priceId] : null;

        // Need email to update your table (since you key on email).
        // We fetch the customer to get email.
        const customer = await stripe.customers.retrieve(customerId);
        const email = customer.email || null;
        if (!email) break;

        const currentPeriodEndIso = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
console.log("subscriptionId", subscriptionId);
console.log("priceId", priceId);
console.log("tier from price metadata", tier);
await supabaseUpsertMembership({
          email,
          tier: tier || "unknown",
          status: status || "unknown",
          stripe_customer_id: customerId || null,
          stripe_subscription_id: sub.id || null,
          price_id: priceId || null,
          current_period_end: currentPeriodEndIso,
          updated_at: new Date().toISOString(),
        });

        break;
      }

      // If payment fails, mark as past_due
      case "invoice.payment_failed": {
        const invoice = stripeEvent.data.object;
        const customerId = invoice.customer;

        const customer = await stripe.customers.retrieve(customerId);
        const email = customer.email || null;
        if (!email) break;

        await supabaseUpdateStatusByEmail(email, {
          status: "past_due",
          updated_at: new Date().toISOString(),
        });

        break;
      }

      default:
        // Ignore other events
        break;
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    return { statusCode: 500, body: `Webhook handler error: ${err.message}` };
  }
};

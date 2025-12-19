// netlify/functions/stripe-webhook.js

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------- Helpers ----------
function getRawBody(event) {
  if (!event.body) return Buffer.from("");
  return event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body, "utf8");
}

async function getCustomerEmail(customerId) {
  if (!customerId) return null;
  const customer = await stripe.customers.retrieve(customerId);
  return customer?.email || null;
}

function normalizeStatus(sub) {
  // Keep your app logic simple: "active" while active/trialing, otherwise "inactive"
  if (!sub) return "unknown";
  if (sub.status === "active" || sub.status === "trialing") return "active";
  return "inactive";
}

function getTierFromSubscription(sub) {
  // Pull tier from Price metadata: price.metadata.tier
  // If you haven’t set it in Stripe, you’ll get "unknown"
  const tier =
    sub?.items?.data?.[0]?.price?.metadata?.tier ||
    sub?.items?.data?.[0]?.price?.metadata?.plan ||
    null;

  return (tier || "unknown").toString().trim().toLowerCase();
}

function getPriceIdFromSubscription(sub) {
  return sub?.items?.data?.[0]?.price?.id || null;
}

function toIsoFromUnixSeconds(sec) {
  if (!sec) return null;
  try {
    return new Date(sec * 1000).toISOString();
  } catch {
    return null;
  }
}

async function upsertMembership({
  email,
  tier,
  status,
  stripe_customer_id,
  stripe_subscription_id,
  price_id,
  current_period_end,
}) {
  if (!email) {
    console.warn("upsertMembership skipped: missing email");
    return;
  }

  const payload = {
    email,
    tier: tier || "unknown",
    status: status || "unknown",
    stripe_customer_id: stripe_customer_id || null,
    stripe_subscription_id: stripe_subscription_id || null,
    price_id: price_id || null,
    current_period_end: current_period_end || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("memberships")
    .upsert(payload, { onConflict: "email" });

  if (error) {
    console.error("Supabase upsert error:", error);
    throw error;
  }
}

// ---------- Main handler ----------
exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return { statusCode: 500, body: "Missing webhook secret" };
  }

  let stripeEvent;
  try {
    const raw = getRawBody(event);
    stripeEvent = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;

        // Only relevant for subscription checkouts
        if (session.mode !== "subscription" || !session.subscription) {
          console.log("checkout.session.completed (non-subscription) ignored");
          break;
        }

        const subscriptionId = session.subscription;
        const customerId = session.customer;

        const sub = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price"],
        });

        // Try email from session first, then customer record
        const email =
          session.customer_details?.email ||
          session.customer_email ||
          (await getCustomerEmail(customerId));

        const tier = getTierFromSubscription(sub);
        const priceId = getPriceIdFromSubscription(sub);
        const status = normalizeStatus(sub);
        const currentPeriodEndIso = toIsoFromUnixSeconds(sub.current_period_end);

        console.log("checkout.session.completed → email:", email);
        console.log("subscriptionId:", subscriptionId);
        console.log("priceId:", priceId);
        console.log("tier:", tier);
        console.log("status:", status);

        await upsertMembership({
          email,
          tier,
          status,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          price_id: priceId,
          current_period_end: currentPeriodEndIso,
        });

        break;
      }

      case "customer.subscription.updated": {
        const subObj = stripeEvent.data.object;

        // Retrieve with price expanded so metadata is available
        const sub = await stripe.subscriptions.retrieve(subObj.id, {
          expand: ["items.data.price"],
        });

        const customerId = sub.customer;
        const email = await getCustomerEmail(customerId);

        const tier = getTierFromSubscription(sub);
        const priceId = getPriceIdFromSubscription(sub);
        const status = normalizeStatus(sub);
        const currentPeriodEndIso = toIsoFromUnixSeconds(sub.current_period_end);

        console.log("customer.subscription.updated → email:", email);
        console.log("subscriptionId:", sub.id);
        console.log("priceId:", priceId);
        console.log("tier:", tier);
        console.log("status:", status);

        await upsertMembership({
          email,
          tier,
          status,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          price_id: priceId,
          current_period_end: currentPeriodEndIso,
        });

        break;
      }

      case "customer.subscription.deleted": {
        const subObj = stripeEvent.data.object;

        // In deleted event, prices may not be expanded, but we can still retrieve
        const sub = await stripe.subscriptions.retrieve(subObj.id, {
          expand: ["items.data.price"],
        });

        const customerId = sub.customer;
        const email = await getCustomerEmail(customerId);

        const tier = getTierFromSubscription(sub);
        const priceId = getPriceIdFromSubscription(sub);

        console.log("customer.subscription.deleted → email:", email);
        console.log("subscriptionId:", sub.id);

        await upsertMembership({
          email,
          tier,
          status: "inactive",
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          price_id: priceId,
          current_period_end: null,
        });

        break;
      }

      default:
        console.log("Unhandled event type:", stripeEvent.type);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "Webhook handler error" };
  }
};

// netlify/functions/stripe-webhook.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function normalizeStatus(sub) {
  // Keep app logic simple:
  // treat "trialing" + "active" as "active"; everything else as "inactive"
  if (!sub) return "unknown";
  if (sub.status === "active" || sub.status === "trialing") return "active";
  return "inactive";
}

function unixToIso(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function getTierFromSubscription(sub) {
  // Prefer tier in price metadata: items.data[0].price.metadata.tier
  const tier =
    sub?.items?.data?.[0]?.price?.metadata?.tier ||
    sub?.items?.data?.[0]?.plan?.metadata?.tier ||
    null;

  return tier ? String(tier).trim().toLowerCase() : "unknown";
}

function getPriceIdFromSubscription(sub) {
  return sub?.items?.data?.[0]?.price?.id || null;
}

async function upsertMembership(payload) {
  if (!payload?.email) {
    console.warn("upsertMembership skipped: missing email");
    return;
  }

  const clean = {
    ...payload,
    email: String(payload.email).trim().toLowerCase(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("memberships")
    .upsert(clean, { onConflict: "email" });

  if (error) {
    console.error("Supabase upsert error:", error);
    throw error;
  }
}

async function getCustomerEmail(customerId) {
  if (!customerId) return null;
  const cust = await stripe.customers.retrieve(customerId);
  // customer can be deleted or missing email
  return cust?.email ? String(cust.email).trim().toLowerCase() : null;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  const sig = event.headers["stripe-signature"];
  if (!sig) return json(400, { error: "Missing stripe-signature header" });

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err?.message || err);
    return json(400, { error: "Webhook signature verification failed" });
  }

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;

        // Email: usually present here
        const email =
          session?.customer_details?.email ||
          session?.customer_email ||
          null;

        const customerId = session?.customer || null;
        const subscriptionId = session?.subscription || null;

        let sub = null;
        if (subscriptionId) {
          // Expand price so metadata.tier is available
          sub = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
        }

        const status = normalizeStatus(sub);
        const tier = sub ? getTierFromSubscription(sub) : "unknown";
        const priceId = sub ? getPriceIdFromSubscription(sub) : null;
        const currentPeriodEndIso = sub ? unixToIso(sub.current_period_end) : null;
        const cancelAtPeriodEnd = sub ? !!sub.cancel_at_period_end : false;

        console.log("checkout.session.completed", {
          email,
          customerId,
          subscriptionId,
          status,
          tier,
          priceId,
          cancelAtPeriodEnd,
        });

        await upsertMembership({
          email,
          tier,
          status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          price_id: priceId,
          current_period_end: currentPeriodEndIso,
          cancel_at_period_end: cancelAtPeriodEnd,
        });

        return json(200, { ok: true });
      }

      case "customer.subscription.updated": {
        const subObj = stripeEvent.data.object;

        // IMPORTANT: subscription events do not include email reliably
        // so we fetch it from the customer object.
        const customerId = subObj?.customer || null;
        const email = await getCustomerEmail(customerId);

        // Ensure price metadata is present (sometimes update events include it already,
        // but expanding makes it consistent)
        const sub = await stripe.subscriptions.retrieve(subObj.id, {
          expand: ["items.data.price"],
        });

        const status = normalizeStatus(sub);
        const tier = getTierFromSubscription(sub);
        const priceId = getPriceIdFromSubscription(sub);
        const currentPeriodEndIso = unixToIso(sub.current_period_end);
        const cancelAtPeriodEnd = !!sub.cancel_at_period_end;

        console.log("customer.subscription.updated", {
          email,
          customerId,
          subscriptionId: sub.id,
          status,
          tier,
          priceId,
          cancelAtPeriodEnd,
        });

        await upsertMembership({
          email,
          tier,
          status,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          price_id: priceId,
          current_period_end: currentPeriodEndIso,
          cancel_at_period_end: cancelAtPeriodEnd,
        });

        return json(200, { ok: true });
      }

      case "customer.subscription.deleted": {
        const subObj = stripeEvent.data.object;
        const customerId = subObj?.customer || null;
        const email = await getCustomerEmail(customerId);

        console.log("customer.subscription.deleted", {
          email,
          customerId,
          subscriptionId: subObj?.id,
        });

        await upsertMembership({
          email,
          tier: "unknown",
          status: "inactive",
          stripe_customer_id: customerId,
          stripe_subscription_id: subObj?.id || null,
          price_id: null,
          current_period_end: null,
          cancel_at_period_end: false,
        });

        return json(200, { ok: true });
      }

      default:
        // Acknowledge other events so Stripe doesn't keep retrying
        return json(200, { ok: true, ignored: stripeEvent.type });
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return json(500, { error: err?.message || "Webhook handler error" });
  }
}

// api/create-checkout.js — Vercel Serverless Function
// Vytvorí Stripe Checkout Session a vráti URL na presmerovanie

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items, customer, delivery, shipping, orderId } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items in cart' });
    }

    // Build line items from cart
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name + (item.variant ? ` (${item.variant})` : ''),
        },
        unit_amount: Math.round(item.price * 100), // Stripe uses cents
      },
      quantity: item.qty,
    }));

    // Add shipping as a separate line item
    if (shipping && shipping > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Doprava — ${delivery || 'Doručenie'}`,
          },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      });
    }

    const origin = req.headers.origin || req.headers.referer || 'https://sock-sort-shop-update.vercel.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customer?.email || undefined,
      metadata: {
        order_id: orderId || '',
        customer_name: customer?.name || '',
        customer_phone: customer?.phone || '',
        delivery: delivery || '',
      },
      success_url: `${origin}?payment=success&order_id=${orderId}`,
      cancel_url: `${origin}?payment=cancelled`,
      locale: 'sk',
    });

    res.status(200).json({ url: session.url, sessionId: session.id });

  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
};

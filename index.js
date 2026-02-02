import express from "express";
import cors from "cors";
import Stripe from "stripe";
import paypal from "paypal-rest-sdk";
import dotenv from "dotenv";

dotenv.config();

console.log("STRIPE KEY:", process.env.STRIPE_SECRET_KEY);


const app = express();
app.use(cors());
app.use(express.json());

// STRIPE
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// PAYPAL
paypal.configure({
  mode: "sandbox", // live en producción
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

// ---------- STRIPE ----------
app.post("/create-stripe-payment", async (req, res) => {
  const { amount } = req.body;

  try {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: intent.client_secret });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ---------- PAYPAL ----------
app.post("/create-paypal-payment", (req, res) => {
  const { amount } = req.body;

  const payment = {
    intent: "sale",
    payer: { payment_method: "paypal" },
    transactions: [{
      amount: {
        total: (amount / 100).toFixed(2),
        currency: "USD",
      },
      description: "Flowers delivery to Argentina",
    }],
    redirect_urls: {
      return_url: "http://localhost:5173/success",
      cancel_url: "http://localhost:5173/cancel",
    },
  };

  paypal.payment.create(payment, (err, payment) => {
    if (err) return res.status(500).send(err);

    const approvalUrl = payment.links.find(
      (link) => link.rel === "approval_url"
    ).href;

    res.send({ approvalUrl });
  });
});

app.post("/fake-purchase", async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 5000, // USD 50.00
      currency: "usd",
      payment_method: "pm_card_visa", // tarjeta TEST
      confirm: true,
      description: "Test flower purchase",
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    res.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, '0.0.0.0', () => {
  console.log("Backend pagos corriendo en puerto 3000 (LAN/Internet)");
});


const allowedOrigins = [
  "https://mylesbowlingsolutions.com",
  "https://www.mylesbowlingsolutions.com",
  "https://cart.mylesbowlingsolutions.com"
];

const PRODUCT_URLS = [
  "https://www.mylesbowlingsolutions.com/data/products.json"
];

function getHeaders(event) {
  const origin = event.headers.origin || event.headers.Origin || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
      ? origin
      : "https://mylesbowlingsolutions.com",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
}

async function loadProducts() {
  const allProducts = [];

  for (const url of PRODUCT_URLS) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load products from ${url}`);

    const data = await res.json();
    if (Array.isArray(data)) allProducts.push(...data);
  }

  return allProducts;
}

function getProductPriceCents(product) {
  const price = Math.round(Number(product.price || product.basePrice || 0) * 100);

  if (price <= 0) {
    throw new Error(`Missing price for ${product.name || product.id}`);
  }

  return price;
}

// 🔥 SHIPPING LOGIC
function getShippingCents(subtotalCents) {
  if (subtotalCents >= 7500) return 0; // FREE over $75
  return 895; // $8.95 default
}

exports.handler = async (event) => {
  const headers = getHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const lines = Array.isArray(body.lines) ? body.lines : [];

    if (!lines.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Cart is empty" })
      };
    }

    const products = await loadProducts();

    let subtotalCents = 0;

    const line_items = lines.map((item) => {
      const product = products.find(p => p.id === item.id);

      if (!product) {
        throw new Error(`Invalid product: ${item.id}`);
      }

      const qty = Math.max(1, parseInt(item.qty || 1, 10));
      const priceCents = getProductPriceCents(product);

      subtotalCents += priceCents * qty;

      return {
        name: String(product.name || product.id).slice(0, 120),
        quantity: qty.toString(),
        base_price_money: {
          amount: priceCents,
          currency: "USD"
        }
      };
    });

    // 🚚 SHIPPING ITEM (always shown)
    const shippingCents = getShippingCents(subtotalCents);

    if (shippingCents > 0) {
      line_items.push({
        name: "Shipping",
        quantity: "1",
        note: "Flat rate shipping",
        base_price_money: {
          amount: shippingCents,
          currency: "USD"
        }
      });
    } else {
      line_items.push({
        name: "Free Shipping Applied",
        quantity: "1",
        note: "Order qualified for free shipping",
        base_price_money: {
          amount: 0,
          currency: "USD"
        }
      });
    }

    const response = await fetch("https://connect.squareup.com/v2/online-checkout/payment-links", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-12-18"
      },
      body: JSON.stringify({
        idempotency_key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        order: {
          location_id: process.env.SQUARE_LOCATION_ID,
          line_items
        },
        checkout_options: {
          ask_for_shipping_address: true,
          redirect_url: "https://www.mylesbowlingsolutions.com/ordercomplete.html"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Square API error:", data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error:
            data?.errors?.[0]?.detail ||
            data?.errors?.[0]?.code ||
            "Square checkout failed",
          square: data
        })
      };
    }

    const url = data?.payment_link?.url;

    if (!url) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Square did not return a checkout URL",
          square: data
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url })
    };

  } catch (err) {
    console.error("Checkout function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err.message || "Checkout failed"
      })
    };
  }
};

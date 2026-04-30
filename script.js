const CART_KEY = "mbs_cart_v1";
let PRODUCTS = [];

/* -------------------------
   CART HELPERS
------------------------- */
function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  document.querySelectorAll("[data-cart-count]").forEach(el => {
    el.textContent = count;
  });
}

function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

/* -------------------------
   LOAD PRODUCTS
------------------------- */
async function loadProducts() {
  try {
    const res = await fetch("data/products.json");
    if (!res.ok) throw new Error("Failed to load products.json");

    PRODUCTS = await res.json();
    renderProducts();
  } catch (err) {
    console.error("Error loading products:", err);

    const grid = document.getElementById("productGrid");
    if (grid) {
      grid.innerHTML = `<p>Unable to load products right now.</p>`;
    }
  }
}

/* -------------------------
   CART ACTIONS
------------------------- */
function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  const cart = getCart();
  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image,
      qty: 1,
      squareLink: product.squareLink || "#"
    });
  }

  saveCart(cart);
  alert(`${product.name} added to cart`);
  renderCart();
}

function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(p => p.id === id);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    const next = cart.filter(p => p.id !== id);
    saveCart(next);
  } else {
    saveCart(cart);
  }

  renderCart();
}

function removeFromCart(id) {
  const cart = getCart().filter(item => item.id !== id);
  saveCart(cart);
  renderCart();
}

function clearCart() {
  saveCart([]);
  renderCart();
}

/* -------------------------
   PRODUCTS PAGE RENDER
------------------------- */
function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = PRODUCTS.map(product => `
    <article class="product-card">
      <div class="product-media">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="product-body">
        <div class="product-meta">
          <span class="badge">${product.id === "strike-grip-sack" ? "Best Seller" : (product.category || "Product")}</span>
          <span class="price">${formatMoney(product.price)}</span>
        </div>
        <h3>${product.name}</h3>
        <p>${product.desc || ""}</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="addToCart('${product.id}')">Add to Cart</button>
          <a class="btn btn-secondary" href="${product.squareLink || "#"}" target="_blank" rel="noopener">
            Buy with Square
          </a>
        </div>
      </div>
    </article>
  `).join("");
}

/* -------------------------
   CART PAGE RENDER
------------------------- */
function renderCart() {
  const list = document.getElementById("cartList");
  const subtotalEl = document.getElementById("cartSubtotal");
  const totalEl = document.getElementById("cartTotal");
  const cartEmpty = document.getElementById("cartEmpty");
  const squareCheckoutBtn = document.getElementById("squareCheckoutBtn");

  if (!list || !subtotalEl || !totalEl) return;

  const cart = getCart();

  if (cart.length === 0) {
    list.innerHTML = "";
    subtotalEl.textContent = "$0.00";
    totalEl.textContent = "$0.00";

    if (cartEmpty) cartEmpty.style.display = "block";

    if (squareCheckoutBtn) {
      squareCheckoutBtn.disabled = true;
      squareCheckoutBtn.setAttribute("aria-disabled", "true");
      squareCheckoutBtn.style.pointerEvents = "none";
      squareCheckoutBtn.style.opacity = ".55";
    }

    return;
  }

  if (cartEmpty) cartEmpty.style.display = "none";

  let subtotal = 0;

  list.innerHTML = cart.map(item => {
    const line = Number(item.price) * Number(item.qty);
    subtotal += line;

    return `
      <div class="cart-item">
        <div class="cart-item-thumb">
          <img src="${item.image}" alt="${item.name}">
        </div>

        <div>
          <h3>${item.name}</h3>
          <p>${formatMoney(item.price)} each</p>

          <div class="qty-row">
            <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
            <strong>${item.qty}</strong>
            <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
            <button class="remove-btn" onclick="removeFromCart('${item.id}')">Remove</button>
          </div>
        </div>

        <div>
          <strong>${formatMoney(line)}</strong>
        </div>
      </div>
    `;
  }).join("");

  subtotalEl.textContent = formatMoney(subtotal);
  totalEl.textContent = formatMoney(subtotal);

  if (squareCheckoutBtn) {
    squareCheckoutBtn.disabled = false;
    squareCheckoutBtn.removeAttribute("aria-disabled");
    squareCheckoutBtn.style.pointerEvents = "";
    squareCheckoutBtn.style.opacity = "";
  }
}

/* -------------------------
   SQUARE CART CHECKOUT
------------------------- */
async function checkoutCartWithSquare() {
  const cart = getCart();
  if (!cart.length) return;

  const checkoutBtn = document.getElementById("squareCheckoutBtn");
  const originalText = checkoutBtn ? checkoutBtn.textContent : "";

  try {
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = "Starting checkout...";
    }

    const lines = cart.map(item => ({
      id: item.id,
      qty: Math.max(1, parseInt(item.qty || 1, 10))
    }));

    const res = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ lines })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Checkout failed");
    }

    const checkoutUrl = data.url || data.checkoutUrl;

    if (checkoutUrl) {
      window.location.href = checkoutUrl;
      return;
    }

    throw new Error("Missing checkout URL");
  } catch (err) {
    console.error("Square checkout error:", err);
    alert("Unable to start Square checkout right now.");
  } finally {
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = originalText || "Checkout with Square";
    }
  }
}

/* -------------------------
   HEADER SCROLL BEHAVIOR
------------------------- */
function initHeaderShrink() {
  const header = document.getElementById("siteHeader");
  if (!header) return;

  let lastScrollY = window.scrollY;

  const onScroll = () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY <= 5) {
      header.classList.remove("scrolled");
      header.classList.remove("nav-hidden");
    } else {
      header.classList.add("scrolled");

      if (currentScrollY > lastScrollY + 4) {
        header.classList.add("nav-hidden");
      } else if (currentScrollY < lastScrollY - 4) {
        header.classList.remove("nav-hidden");
      }
    }

    lastScrollY = currentScrollY;
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* -------------------------
   INIT
------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  updateCartCount();
  initHeaderShrink();
  await loadProducts();
  renderCart();

  const checkoutBtn = document.getElementById("squareCheckoutBtn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", checkoutCartWithSquare);
  }
});

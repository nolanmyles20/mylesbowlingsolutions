const CART_KEY = "mbs_cart_v1";
let PRODUCTS = [];

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll("[data-cart-count]").forEach(el => {
    el.textContent = count;
  });
}

function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

async function loadProducts() {
  try {
    const res = await fetch("data/products.json");
    PRODUCTS = await res.json();
    renderProducts();
  } catch (err) {
    console.error(err);
  }
}

function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  const cart = getCart();
  const existing = cart.find(item => item.id === id);

  if (existing) existing.qty++;
  else cart.push({ ...product, qty: 1 });

  saveCart(cart);
  alert(product.name + " added to cart");
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = PRODUCTS.map(p => `
    <div class="feature-card">
      <img src="${p.image}" style="width:100%;border-radius:10px;">
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <strong>${formatMoney(p.price)}</strong><br><br>
      <button class="btn btn-primary" onclick="addToCart('${p.id}')">Add to Cart</button>
    </div>
  `).join("");
}

/* HEADER SCROLL LOGIC */
function initHeader() {
  const header = document.getElementById("siteHeader");
  let lastScroll = 0;

  window.addEventListener("scroll", () => {
    const current = window.scrollY;

    if (current <= 5) {
      header.classList.remove("scrolled");
      header.classList.remove("nav-hidden");
    } else {
      header.classList.add("scrolled");

      if (current > lastScroll + 5) {
        header.classList.add("nav-hidden"); // scrolling down
      } else if (current < lastScroll - 5) {
        header.classList.remove("nav-hidden"); // scrolling up
      }
    }

    lastScroll = current;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  loadProducts();
  initHeader();
});

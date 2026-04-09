const CART_KEY = "mbs_cart_v1";

const PRODUCTS = [
  {
    id: "lane-display-upgrade",
    name: "Lane Display Upgrade",
    price: 249.00,
    category: "Software",
    image: "assets/06309F0A-B867-462A-8ED0-E043CD47B2AF.png",
    desc: "Custom scoring display and lane presentation package.",
    squareLink: "#"
  },
  {
    id: "league-management-kit",
    name: "League Management Kit",
    price: 399.00,
    category: "Solutions",
    image: "assets/06309F0A-B867-462A-8ED0-E043CD47B2AF.png",
    desc: "League tools for roster management, tracking, and reporting.",
    squareLink: "#"
  },
  {
    id: "brackets-payouts-suite",
    name: "Brackets & Payouts Suite",
    price: 199.00,
    category: "Software",
    image: "assets/06309F0A-B867-462A-8ED0-E043CD47B2AF.png",
    desc: "Tournament bracket and payout workflow package for centers.",
    squareLink: "#"
  }
];

function getCart(){
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount(){
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll("[data-cart-count]").forEach(el => {
    el.textContent = count;
  });
}

function addToCart(id){
  const product = PRODUCTS.find(p => p.id === id);
  if(!product) return;

  const cart = getCart();
  const existing = cart.find(item => item.id === id);

  if(existing){
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      qty: 1,
      squareLink: product.squareLink
    });
  }

  saveCart(cart);
  alert(`${product.name} added to cart`);
}

function changeQty(id, delta){
  const cart = getCart();
  const item = cart.find(p => p.id === id);
  if(!item) return;

  item.qty += delta;
  if(item.qty <= 0){
    const next = cart.filter(p => p.id !== id);
    saveCart(next);
  } else {
    saveCart(cart);
  }
  renderCart();
}

function removeFromCart(id){
  const cart = getCart().filter(item => item.id !== id);
  saveCart(cart);
  renderCart();
}

function formatMoney(value){
  return `$${value.toFixed(2)}`;
}

function renderProducts(){
  const grid = document.getElementById("productGrid");
  if(!grid) return;

  grid.innerHTML = PRODUCTS.map(product => `
    <article class="product-card">
      <div class="product-media">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="product-body">
        <div class="product-meta">
          <span class="badge">${product.category}</span>
          <span class="price">${formatMoney(product.price)}</span>
        </div>
        <h3>${product.name}</h3>
        <p>${product.desc}</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="addToCart('${product.id}')">Add to Cart</button>
          <a class="btn btn-secondary" href="${product.squareLink}">Buy with Square</a>
        </div>
      </div>
    </article>
  `).join("");
}

function renderCart(){
  const list = document.getElementById("cartList");
  const subtotalEl = document.getElementById("cartSubtotal");
  const totalEl = document.getElementById("cartTotal");
  const cartEmpty = document.getElementById("cartEmpty");
  const squareCheckoutBtn = document.getElementById("squareCheckoutBtn");

  if(!list || !subtotalEl || !totalEl) return;

  const cart = getCart();

  if(cart.length === 0){
    list.innerHTML = "";
    subtotalEl.textContent = "$0.00";
    totalEl.textContent = "$0.00";
    if(cartEmpty) cartEmpty.style.display = "block";
    if(squareCheckoutBtn){
      squareCheckoutBtn.href = "#";
      squareCheckoutBtn.setAttribute("aria-disabled", "true");
      squareCheckoutBtn.style.pointerEvents = "none";
      squareCheckoutBtn.style.opacity = ".55";
    }
    return;
  }

  if(cartEmpty) cartEmpty.style.display = "none";

  let subtotal = 0;

  list.innerHTML = cart.map(item => {
    const line = item.price * item.qty;
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

  if(squareCheckoutBtn){
    squareCheckoutBtn.href = "#";
    squareCheckoutBtn.removeAttribute("aria-disabled");
    squareCheckoutBtn.style.pointerEvents = "";
    squareCheckoutBtn.style.opacity = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  renderProducts();
  renderCart();
});

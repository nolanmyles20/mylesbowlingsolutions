let cart = JSON.parse(localStorage.getItem("cart")) || [];

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart(product) {
  const existing = cart.find(p => p.id === product.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart();
  alert("Added to cart");
}

function removeFromCart(id) {
  cart = cart.filter(p => p.id !== id);
  saveCart();
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart");

  if (!container) return;

  container.innerHTML = "";

  let total = 0;

  cart.forEach(item => {
    total += item.price * item.qty;

    container.innerHTML += `
      <div class="cart-item">
        <h3>${item.name}</h3>
        <p>$${item.price} x ${item.qty}</p>
        <button class="btn" onclick="removeFromCart('${item.id}')">Remove</button>
      </div>
    `;
  });

  container.innerHTML += `<h2>Total: $${total.toFixed(2)}</h2>`;
}


var cart = JSON.parse(localStorage.getItem("cart")) || [];
var addresses = [];
var selectedAddress = null;



// ---------------------------------------------------------------------
// SAVE
// ---------------------------------------------------------------------

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}


// ---------------------------------------------------------------------
// ADD / UPDATE / REMOVE
// ---------------------------------------------------------------------

// Adds a product to the cart, reading its name & price straight off the
// product card's data-name / data-price attributes -- no separate price
// list to keep in sync.
function addToCart(id) {
    const existingItem = cart.find((item) => item.id === id);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        const productEl = document.querySelector(`.product[data-id="${id}"]`);
        cart.push({
            id: id,
            name: productEl.dataset.name,
            price: Number(productEl.dataset.price),
            image: productEl.dataset.image,
            quantity: 1,
        });
    }

    afterCartChange();
}

function increaseQty(id) {
    const item = cart.find((item) => item.id === id);
    if (item) item.quantity++;
    afterCartChange();
}

function decreaseQty(id) {
    const item = cart.find((item) => item.id === id);
    if (!item) return;

    item.quantity--;
    if (item.quantity <= 0) {
        cart = cart.filter((item) => item.id !== id);
    }
    afterCartChange();
}

function setQuantity(id, quantity) {
    const item = cart.find((item) => item.id === id);
    if (!item) return;
    item.quantity = Number(quantity);
    afterCartChange();
}

function removeFromCart(id) {
    cart = cart.filter((item) => item.id !== id);
    afterCartChange();
}

function afterCartChange() {
    saveCart();
    updateCartCount();
    updateProductButtons();


    if (typeof refreshCartPage === "function") {
        refreshCartPage();
    } else {
        renderCart();
    }
}


// ---------------------------------------------------------------------
// PRODUCT GRID BUTTONS
// ---------------------------------------------------------------------

function updateProductButtons() {
    document.querySelectorAll(".product").forEach((product) => {
        const id = product.dataset.id;
        const cartItem = cart.find((item) => item.id === id);
        const button = product.querySelector(".cart-btn");

        if (cartItem) {
            button.innerHTML = `
                <div class="quantity-btn">
                    <span class="decrease" data-id="${id}">−</span>
                    <span>${cartItem.quantity}</span>
                    <span class="increase" data-id="${id}">+</span>
                </div>
            `;
            button.classList.add("quantity-btn");
        } else {
            button.innerHTML = `<img src="./assets/images/icon-add-to-cart.svg"> Add to Cart`;
            button.classList.remove("quantity-btn");
        }
    });

    attachQuantityEvents();
}

function attachQuantityEvents() {
    document.querySelectorAll(".increase").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            increaseQty(btn.dataset.id);
        });
    });

    document.querySelectorAll(".decrease").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            decreaseQty(btn.dataset.id);
        });
    });
}


function attachAddToCartEvents() {
    document.querySelectorAll(".cart-btn").forEach((button) => {
        const id = button.closest(".product").dataset.id;
        button.addEventListener("click", () => addToCart(id));
    });
}


// ---------------------------------------------------------------------
// CART PAGE
// ---------------------------------------------------------------------


function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const headerCountEl = document.getElementById("cart-nav-count");
    if (headerCountEl) headerCountEl.textContent = totalItems;

    const sidebarCountEl = document.getElementById("cart-count");
    if (sidebarCountEl) sidebarCountEl.textContent = totalItems;
}

function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}


function renderCart() {
    const itemsContainer = document.getElementById("cart-items-container");
    const emptyState = document.getElementById("empty-cart");

    if (!itemsContainer) return; // cart page markup isn't on this screen

    if (cart.length === 0) {
        itemsContainer.innerHTML = "";
        itemsContainer.classList.add("hidden");
        emptyState.classList.remove("hidden");
        return;
    }

    itemsContainer.classList.remove("hidden");
    emptyState.classList.add("hidden");

    itemsContainer.innerHTML = cart
        .map((item) => {
            const qtyOptions = Array.from({ length: 10 }, (_, i) => i + 1)
                .map((n) => `<option value="${n}" ${n === item.quantity ? "selected" : ""}>${n}</option>`)
                .join("");

            return `
        <div class="cart-item-block" data-id="${item.id}">
            <div class="cart-line-top">
                <div class="cart-line-img">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-line-details">
                    <p class="cart-line-name">${item.name}</p>
                    <p class="cart-line-unit-price">₹${item.price} each</p>
                    <label class="qty-label">
                        Qty:
                        <select class="qty-select" data-id="${item.id}">${qtyOptions}</select>
                    </label>
                </div>
                <div class="cart-line-price-col">
                    <span class="cart-line-total">₹${item.price * item.quantity}</span>
                </div>
            </div>
            <div class="cart-line-actions">
                <button type="button" class="cart-action-btn remove-item" data-id="${item.id}">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Remove
                </button>
            </div>
        </div>
    `;
        })
        .join("");

    attachRemoveEvents();
    attachQtySelectEvents();
}

function attachQtySelectEvents() {
    document.querySelectorAll(".qty-select").forEach((select) => {
        select.addEventListener("change", () => setQuantity(select.dataset.id, select.value));
    });
}

function attachRemoveEvents() {
    document.querySelectorAll(".remove-item").forEach((btn) => {
        btn.addEventListener("click", () => removeFromCart(btn.dataset.id));
    });
}


// ---------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    updateProductButtons();
    attachAddToCartEvents();
    updateCartCount();
 
});

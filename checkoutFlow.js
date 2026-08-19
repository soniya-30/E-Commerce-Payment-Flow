/*
    checkoutFlow.js
    ---------------
    Manages the Order Summary, Payment, Confirmation, and Order History screens
    for the single-page checkout application.
*/

const ORDERS_KEY = "pastOrders";

// Coupon state
let appliedCouponCode = null; // null if none
let couponDiscount = 0;

// Payment state
let selectedPaymentMethod = "cod"; // "cod", "card", "upi"

// ---------------------------------------------------------------------
// STATE & MATH UTILS
// ---------------------------------------------------------------------

function getDeliveryFee(subtotal) {
    if (appliedCouponCode === "FREESHIP") {
        return 0;
    }
    // Free delivery over 500
    if (subtotal >= 500) {
        return 0;
    }
    return 40; // Flat 40 delivery fee
}

function calculatePriceSummary() {
    const subtotal = window.getCartSubtotal ? window.getCartSubtotal() : 0;
    
    // Calculate coupon discount
    let discount = 0;
    if (appliedCouponCode === "SAVE50") {
        discount = Math.min(50, subtotal);
    } else if (appliedCouponCode === "SAVE10") {
        const pctDiscount = Math.round(subtotal * 0.1);
        discount = Math.min(pctDiscount, 200); // Cap at 200
    }
    
    couponDiscount = discount;
    const deliveryFee = getDeliveryFee(subtotal);
    
    // Add dummy Fees like in Flipkart (e.g. ₹26)
    const packagingFee = subtotal > 0 ? 26 : 0;
    const totalAmount = subtotal + deliveryFee + packagingFee - couponDiscount;
    
    return {
        subtotal,
        couponDiscount,
        deliveryFee,
        packagingFee,
        totalAmount
    };
}

// ---------------------------------------------------------------------
// SCREEN RENDERERS
// ---------------------------------------------------------------------

// Render Flipkart-style Price Details Sidebar
function renderPriceSidebar(summary, containerId, buttonText, onButtonClick) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalSavings = summary.couponDiscount + (summary.subtotal >= 500 ? 40 : 0);
    const crossedMRP = summary.subtotal + summary.packagingFee + 1200; // Fake original price for aesthetics

    container.innerHTML = `
        <h3 class="price-details-heading">Price Details</h3>
        <div class="price-row">
            <span>MRP (incl. of all taxes)</span>
            <span>₹${crossedMRP}</span>
        </div>
        <div class="price-row">
            <span>Item Price (Cart Subtotal)</span>
            <span>₹${summary.subtotal}</span>
        </div>
        <div class="price-row">
            <span>Fees (Secured Packaging)</span>
            <span>₹${summary.packagingFee}</span>
        </div>
        <div class="price-row">
            <span>Delivery Fee</span>
            <span class="${summary.deliveryFee === 0 ? 'price-delivery-free' : ''}">
                ${summary.deliveryFee === 0 ? 'Free' : '₹' + summary.deliveryFee}
            </span>
        </div>
        ${summary.couponDiscount > 0 ? `
        <div class="price-row" style="color: #388E3C; font-weight: 600;">
            <span>Coupon Discount</span>
            <span>-₹${summary.couponDiscount}</span>
        </div>
        ` : ''}
        
        <div class="cart-subtotal-row">
            <span>Total Amount</span>
            <span>₹${summary.totalAmount}</span>
        </div>

        ${totalSavings > 0 ? `
        <div class="price-savings-alert">
            You will save ₹${totalSavings} on this order
        </div>
        ` : ''}

        <div class="price-safety-note">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2 4 5v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V5z"></path>
                <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
            <span>Safe and secure payments. Easy returns. 100% Authentic products.</span>
        </div>

        <div class="price-details-bottom-bar">
            <div class="price-details-total-box">
                <span class="price-details-crossed-total">₹${crossedMRP}</span>
                <span class="price-details-bold-total">₹${summary.totalAmount}</span>
                <a href="#" class="price-details-view-link">View price details</a>
            </div>
            <button class="btn-primary" id="${containerId}-action-btn">${buttonText}</button>
        </div>
    `;

    document.getElementById(`${containerId}-action-btn`).addEventListener("click", onButtonClick);
}

// 1. ORDER SUMMARY PAGE
function refreshSummaryPage() {
    // Render Address review at top
    const addrCard = document.getElementById("summary-address-card");
    if (addrCard) {
        if (window.selectedAddress && window.selectedAddress.fullName) {
            const addr = window.selectedAddress;
            addrCard.innerHTML = `
                <div class="address-summary-info">
                    <div class="address-summary-title">Deliver to:</div>
                    <div class="address-summary-name-row">
                        <span class="address-summary-name">${addr.fullName}</span>
                        <span class="address-type-badge">${(addr.type || 'Home').toUpperCase()}</span>
                    </div>
                    <p class="address-summary-text">${addr.addressLine}, ${addr.city}, ${addr.state} - ${addr.pincode}</p>
                    <div class="address-summary-phone">Phone: ${addr.phone}</div>
                </div>
                <button class="change-link edit-address-btn" id="summary-change-address-btn">Change</button>
            `;
            document.getElementById("summary-change-address-btn").addEventListener("click", () => {
                if (typeof showPage === "function") {
                    showPage("page-cart");
                    // Expand address panel automatically
                    const panel = document.getElementById("address-management");
                    if (panel) panel.classList.remove("hidden");
                }
            });
        } else {
            addrCard.innerHTML = `
                <div class="address-summary-info">
                    <p class="placeholder-note">No delivery address selected.</p>
                </div>
                <button class="btn-primary" id="summary-change-address-btn">Select Address</button>
            `;
            document.getElementById("summary-change-address-btn").addEventListener("click", () => {
                if (typeof showPage === "function") showPage("page-cart");
            });
        }
    }

    // Render Items
    const itemsCard = document.getElementById("summary-items-card");
    if (itemsCard) {
        const cartItems = window.cart || [];
        if (cartItems.length === 0) {
            itemsCard.innerHTML = `<p class="placeholder-note">No items in your cart.</p>`;
        } else {
            itemsCard.innerHTML = cartItems.map(item => {
                const crossedPrice = item.price * 2; // Fake original price
                // Custom hardcoded rating for each dessert for Flipkart style realism
                let rating = "4.2";
                let reviews = "18,432";
                if (item.id === "1" || item.id === "7") { rating = "4.6"; reviews = "42,881"; }
                else if (item.id === "4") { rating = "4.5"; reviews = "29,481"; }

                return `
                    <div class="checkout-item-row">
                        <img class="checkout-item-img" src="${item.image}" alt="${item.name}">
                        <div class="checkout-item-details">
                            <div class="checkout-item-badge-row">
                                <span class="item-badge-bestseller">BESTSELLER</span>
                                <span class="item-badge-hotdeal">Hot Deal</span>
                            </div>
                            <h4 class="checkout-item-name">${item.name}</h4>
                            <p class="checkout-item-options">Qty: ${item.quantity} | Freshly Prepared</p>
                            <div class="checkout-item-rating">
                                <span class="rating-stars">★ ${rating}</span>
                                <span>(${reviews})</span>
                            </div>
                            <div class="checkout-item-price-row">
                                <span class="price-discount-percent">↓50% Off</span>
                                <span class="price-mrp-crossed">₹${crossedPrice * item.quantity}</span>
                                <span class="price-selling">₹${item.price * item.quantity}</span>
                            </div>
                            <p class="checkout-item-delivery">Delivery in 1-2 hours | Standard Quality Guaranteed</p>
                        </div>
                    </div>
                `;
            }).join("");
        }
    }

    // Render Coupon Card State
    renderCouponUI();

    // Render Price Sidebar
    const summary = calculatePriceSummary();
    renderPriceSidebar(summary, "summary-price-card", "CONTINUE", () => {
        // Block proceeding if cart is empty or address is missing
        if ((window.cart || []).length === 0) {
            alert("Your cart is empty!");
            return;
        }
        if (!window.selectedAddress) {
            alert("Please select a delivery address first!");
            return;
        }
        if (typeof showPage === "function") showPage("page-payment");
    });
}

function renderCouponUI() {
    const input = document.getElementById("coupon-code-input");
    const msg = document.getElementById("coupon-message");
    const display = document.getElementById("active-coupon-display");
    const nameSpan = document.getElementById("applied-coupon-name");
    
    if (!msg) return;

    if (appliedCouponCode) {
        input.value = "";
        input.disabled = true;
        msg.textContent = "Coupon applied successfully!";
        msg.className = "coupon-message success";
        
        nameSpan.textContent = `${appliedCouponCode} (Saved ₹${couponDiscount})`;
        display.classList.remove("hidden");
    } else {
        input.disabled = false;
        msg.textContent = "";
        msg.className = "coupon-message";
        display.classList.add("hidden");
    }
}

function handleCouponApply() {
    const input = document.getElementById("coupon-code-input");
    const msg = document.getElementById("coupon-message");
    if (!input || !msg) return;

    const code = input.value.trim().toUpperCase();
    if (!code) {
        msg.textContent = "Please enter a coupon code.";
        msg.className = "coupon-message error";
        return;
    }

    const validCoupons = ["SAVE50", "SAVE10", "FREESHIP"];
    if (validCoupons.includes(code)) {
        appliedCouponCode = code;
        msg.textContent = "Coupon applied successfully!";
        msg.className = "coupon-message success";
        refreshSummaryPage();
    } else {
        msg.textContent = "Invalid or Expired coupon code.";
        msg.className = "coupon-message error";
    }
}

function handleCouponRemove() {
    appliedCouponCode = null;
    couponDiscount = 0;
    refreshSummaryPage();
}

// 2. PAYMENT PAGE
function refreshPaymentPage() {
    // Selected Address Read-only review
    const addrCard = document.getElementById("payment-address-card");
    if (addrCard && window.selectedAddress) {
        const addr = window.selectedAddress;
        addrCard.innerHTML = `
            <div class="address-summary-info">
                <div class="address-summary-title">Delivery Address:</div>
                <div class="address-summary-name-row">
                    <span class="address-summary-name">${addr.fullName}</span>
                    <span class="address-type-badge">${(addr.type || 'Home').toUpperCase()}</span>
                </div>
                <p class="address-summary-text">${addr.addressLine}, ${addr.city}, ${addr.state} - ${addr.pincode}</p>
                <div class="address-summary-phone">Phone: ${addr.phone}</div>
            </div>
            <button class="change-link" id="payment-change-address-btn">Change</button>
        `;
        document.getElementById("payment-change-address-btn").addEventListener("click", () => {
            if (typeof showPage === "function") showPage("page-cart");
        });
    }

    // Refresh Price summary and COD text
    const summary = calculatePriceSummary();
    const codAmount = document.getElementById("cod-payable-amount");
    if (codAmount) {
        codAmount.textContent = `₹${summary.totalAmount}`;
    }

    // Render Price Details sidebar for payment
    renderPriceSidebar(summary, "payment-price-card", "PLACE ORDER", handlePlaceOrderClick);

    // Initial forms layout toggle
    togglePaymentOptionUI();
}

function togglePaymentOptionUI() {
    const codForm = document.getElementById("cod-form");
    const cardForm = document.getElementById("card-form");
    const upiForm = document.getElementById("upi-form");
    
    // Toggle active background colors
    document.querySelectorAll(".payment-option-row").forEach(row => {
        row.classList.remove("selected");
    });
    
    const activeRow = document.querySelector(`input[name="payment-method"]:checked`).closest(".payment-option-row");
    if (activeRow) activeRow.classList.add("selected");

    codForm.classList.toggle("hidden", selectedPaymentMethod !== "cod");
    cardForm.classList.toggle("hidden", selectedPaymentMethod !== "card");
    upiForm.classList.toggle("hidden", selectedPaymentMethod !== "upi");
}

function clearPaymentErrors() {
    document.querySelectorAll(".payment-option-form .field-error").forEach(el => {
        el.textContent = "";
    });
    document.querySelectorAll(".payment-option-form input").forEach(el => {
        el.classList.remove("input-error");
    });
}

function validatePaymentForm() {
    clearPaymentErrors();
    let isValid = true;

    if (selectedPaymentMethod === "upi") {
        const upiId = document.getElementById("upi-id-input").value.trim();
        const errUpi = document.getElementById("err-upi");
        if (!upiId) {
            errUpi.textContent = "UPI ID is required.";
            document.getElementById("upi-id-input").classList.add("input-error");
            isValid = false;
        } else if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
            errUpi.textContent = "Enter a valid UPI ID (e.g., username@bank).";
            document.getElementById("upi-id-input").classList.add("input-error");
            isValid = false;
        }
    } else if (selectedPaymentMethod === "card") {
        const cardNumber = document.getElementById("card-number").value.replace(/\s+/g, "");
        const cardExpiry = document.getElementById("card-expiry").value.trim();
        const cardCvv = document.getElementById("card-cvv").value.trim();

        if (!cardNumber) {
            document.getElementById("err-card-number").textContent = "Card number is required.";
            document.getElementById("card-number").classList.add("input-error");
            isValid = false;
        } else if (!/^\d{16}$/.test(cardNumber)) {
            document.getElementById("err-card-number").textContent = "Enter a valid 16-digit card number.";
            document.getElementById("card-number").classList.add("input-error");
            isValid = false;
        }

        if (!cardExpiry) {
            document.getElementById("err-card-expiry").textContent = "Expiry date is required.";
            document.getElementById("card-expiry").classList.add("input-error");
            isValid = false;
        } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
            document.getElementById("err-card-expiry").textContent = "Use MM/YY format.";
            document.getElementById("card-expiry").classList.add("input-error");
            isValid = false;
        }

        if (!cardCvv) {
            document.getElementById("err-card-cvv").textContent = "CVV is required.";
            document.getElementById("card-cvv").classList.add("input-error");
            isValid = false;
        } else if (!/^\d{3}$/.test(cardCvv)) {
            document.getElementById("err-card-cvv").textContent = "CVV must be 3 digits.";
            document.getElementById("card-cvv").classList.add("input-error");
            isValid = false;
        }
    }
    return isValid;
}

function handlePlaceOrderClick() {
    if (!validatePaymentForm()) {
        return;
    }
    
    // Save order in state and history list in localStorage
    const summary = calculatePriceSummary();
    const orderId = "ORD-" + Date.now();
    const paymentMethodsName = {
        cod: "Cash on Delivery (COD)",
        card: "Credit / Debit Card",
        upi: "UPI Payment"
    };

    const newOrder = {
        id: orderId,
        date: new Date().toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        address: { ...window.selectedAddress },
        items: [...window.cart],
        paymentMethod: paymentMethodsName[selectedPaymentMethod],
        totalAmount: summary.totalAmount,
        estimatedDeliveryDate: calculateDeliveryDate(5)
    };

    // Save to past orders list
    const pastOrders = JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
    pastOrders.unshift(newOrder); // Add to beginning
    localStorage.setItem(ORDERS_KEY, JSON.stringify(pastOrders));

    // Clear cart
    window.cart = [];
    if (window.saveCart) window.saveCart();
    if (window.updateCartCount) window.updateCartCount();
    if (window.updateProductButtons) window.updateProductButtons();

    // Reset applied coupons
    appliedCouponCode = null;
    couponDiscount = 0;

    // Show Confirmation page
    renderConfirmationPage(newOrder);
    if (typeof showPage === "function") showPage("page-confirmation");
}

function calculateDeliveryDate(daysToAdd) {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return date.toLocaleDateString("en-IN", { weekday: 'long', month: 'short', day: 'numeric' });
}

// 3. CONFIRMATION PAGE
function renderConfirmationPage(order) {
    document.getElementById("confirm-order-id").textContent = order.id;
    
    const addr = order.address;
    document.getElementById("confirm-address").innerHTML = `
        <strong>${addr.fullName}</strong> (${addr.type})<br>
        ${addr.addressLine}, ${addr.city}, ${addr.state} - ${addr.pincode}<br>
        Phone: ${addr.phone}
    `;
    
    document.getElementById("confirm-delivery-date").textContent = order.estimatedDeliveryDate;
    document.getElementById("confirm-payment-method").textContent = order.paymentMethod;
    document.getElementById("confirm-total-amount").textContent = `₹${order.totalAmount}`;

    // Render items summary list in confirmation
    const itemsList = document.getElementById("confirm-items-list");
    itemsList.innerHTML = order.items.map(item => `
        <div class="confirm-item-block">
            <div class="confirm-item-left">
                <span class="confirm-item-name">${item.name}</span>
                <span class="confirm-item-qty">Qty: ${item.quantity}</span>
            </div>
            <span class="confirm-item-price">₹${item.price * item.quantity}</span>
        </div>
    `).join("");
}

// 4. ORDER HISTORY
function renderOrderHistory() {
    const container = document.getElementById("order-history-container");
    if (!container) return;

    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
    if (orders.length === 0) {
        container.innerHTML = `<p class="placeholder-note" style="text-align: center; padding: 40px 0;">You have not placed any orders yet.</p>`;
        return;
    }

    container.innerHTML = orders.map((order, index) => {
        const totalItems = order.items.reduce((sum, it) => sum + it.quantity, 0);
        return `
            <div class="history-order-card" id="history-card-${index}">
                <div class="history-order-header" onclick="toggleOrderDetails(${index})">
                    <div class="history-header-left">
                        <span class="history-order-id">${order.id}</span>
                        <span class="history-order-date">${order.date}</span>
                    </div>
                    <div class="history-header-right">
                        <span class="history-order-total">₹${order.totalAmount} (${totalItems} item${totalItems > 1 ? 's' : ''})</span>
                        <span class="history-expand-icon" id="expand-icon-${index}">▼</span>
                    </div>
                </div>
                <div class="history-order-details hidden" id="details-panel-${index}">
                    <div class="history-details-section">
                        <div class="history-details-heading">Delivery Address</div>
                        <p class="history-address-text">
                            <strong>${order.address.fullName}</strong> (${order.address.type})<br>
                            ${order.address.addressLine}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}<br>
                            Phone: ${order.address.phone}
                        </p>
                    </div>
                    <div class="history-details-section">
                        <div class="history-details-heading">Payment Information</div>
                        <p class="history-payment-text">
                            Method: <strong>${order.paymentMethod}</strong><br>
                            Delivery: <strong>${order.estimatedDeliveryDate}</strong>
                        </p>
                    </div>
                    <div class="history-details-section">
                        <div class="history-details-heading">Items Ordered</div>
                        <div class="history-items-list">
                            ${order.items.map(item => `
                                <div class="history-item-row">
                                    <span>${item.name} (Qty: ${item.quantity})</span>
                                    <strong>₹${item.price * item.quantity}</strong>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// Expand/Collapse order history details
function toggleOrderDetails(index) {
    const details = document.getElementById(`details-panel-${index}`);
    const card = document.getElementById(`history-card-${index}`);
    if (!details || !card) return;

    const isHidden = details.classList.contains("hidden");
    details.classList.toggle("hidden", !isHidden);
    card.classList.toggle("expanded", isHidden);
}

// ---------------------------------------------------------------------
// INIT AND BINDINGS
// ---------------------------------------------------------------------

function attachCheckoutEvents() {
    // Coupon apply & remove
    const applyBtn = document.getElementById("apply-coupon-btn");
    if (applyBtn) applyBtn.addEventListener("click", handleCouponApply);

    const removeBtn = document.getElementById("remove-coupon-btn");
    if (removeBtn) removeBtn.addEventListener("click", handleCouponRemove);

    // Payment Radio button changes
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
        radio.addEventListener("change", (e) => {
            selectedPaymentMethod = e.target.value;
            togglePaymentOptionUI();
        });
    });

    // Credit Card formatting (gaps after every 4 digits)
    const cardInput = document.getElementById("card-number");
    if (cardInput) {
        cardInput.addEventListener("input", (e) => {
            let val = e.target.value.replace(/\D/g, "");
            let formatted = "";
            for (let i = 0; i < val.length; i++) {
                if (i > 0 && i % 4 === 0) formatted += " ";
                formatted += val[i];
            }
            e.target.value = formatted.slice(0, 19);
        });
    }

    // Expiry Date MM/YY formatting (slash after 2 digits)
    const expiryInput = document.getElementById("card-expiry");
    if (expiryInput) {
        expiryInput.addEventListener("input", (e) => {
            let val = e.target.value.replace(/\D/g, "");
            if (val.length > 2) {
                e.target.value = val.slice(0, 2) + "/" + val.slice(2, 4);
            } else {
                e.target.value = val;
            }
        });
    }

    // CVV input restrictions
    const cvvInput = document.getElementById("card-cvv");
    if (cvvInput) {
        cvvInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/\D/g, "").slice(0, 3);
        });
    }

    // UPI verification ID characters check
    const upiInput = document.getElementById("upi-id-input");
    if (upiInput) {
        upiInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-Z0-9.\-_@]/g, "");
        });
    }
}

// Wire up our custom page hooks into the navigation flow
document.addEventListener("DOMContentLoaded", () => {
    attachCheckoutEvents();
    
    // Override/extend showPage from app.js to trigger sub-screen refreshes
    const originalShowPage = window.showPage;
    if (typeof originalShowPage === "function") {
        window.showPage = function(pageId) {
            originalShowPage(pageId);
            
            if (pageId === "page-summary") {
                refreshSummaryPage();
            } else if (pageId === "page-payment") {
                refreshPaymentPage();
            } else if (pageId === "page-order-history") {
                renderOrderHistory();
            }
        };
    }

    // Profile Click navigates to Order History (optional link)
    const profileBtn = document.querySelector(".header-action-item[data-goto='page-order-history']");
    if (profileBtn) {
        profileBtn.addEventListener("click", () => {
            if (typeof showPage === "function") showPage("page-order-history");
        });
    }
});

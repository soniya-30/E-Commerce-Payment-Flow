# Full E-Commerce Checkout Flow - Single Page Application

A complete, realistic single-page e-commerce checkout journey styled after Flipkart's design. Built entirely with plain HTML, CSS, and vanilla JavaScript.

---

## 📂 Project Structure

- **[index.html](file:///d:/2.%20full%20payment%20flow/index.html)**: Contains all the page sections (Product Grid, Cart, Address Form, Order Summary, Payment, Confirmation, and Order History) toggled dynamically via class properties.
- **[styles/styles.css](file:///d:/2.%20full%20payment%20flow/styles/styles.css)**: Vanilla CSS file implementing design patterns, responsive grids, and checkout components.
- **[js/app.js](file:///d:/2.%20full%20payment%20flow/js/app.js)**: Handles routing, showing/hiding page sections, and active state indicators in the checkout stepper.
- **[js/productListing.js](file:///d:/2.%20full%20payment%20flow/js/productListing.js)**: Core product grid interactions, cart quantities, item additions, and unit price calculations.
- **[js/cartPage.js](file:///d:/2.%20full%20payment%20flow/js/cartPage.js)**: Address selection, address addition/editing/deletion, and deliver-to recap rendering.
- **[js/checkoutFlow.js](file:///d:/2.%20full%20payment%20flow/js/checkoutFlow.js)**: Orchestrates the Order Summary page, coupon discount validations, payment accordion forms (UPI/Card/COD), place order actions, and expandable history logs.

---

## 🧪 How to Test the Flow

1. **Browse & Add Items**:
   - Open `index.html` in your browser.
   - Click **"Add to Cart"** on various desserts. Adjust quantities using `+` / `−` buttons.
   - Click **"Cart"** in the top header.

2. **Manage Address Selection**:
   - Click **"Add Address"**, fill in the form (ensuring a 10-digit phone and 6-digit pincode), and click **"Save Address"**.
   - Your address will render in the list. Check the radio option to select it.
   - Click **"Place Order"**.

3. **Verify Order Summary & Apply Coupons**:
   - Review your address and items.
   - Apply the following test coupons:
     - **`SAVE50`**: Applies a flat **₹50** discount on the subtotal.
     - **`SAVE10`**: Applies a **10%** discount, capped at a maximum of **₹200**.
     - **`FREESHIP`**: Waives the standard **₹40** delivery fee (which is normally free only for subtotals over ₹500).
   - Enter invalid coupon names to test inline error validation.
   - Remove the coupon to see the total revert back.
   - Click **"Continue"**.

4. **Select Payment & Place Order**:
   - Choose **Cash on Delivery (COD)**, **UPI**, or **Credit/Debit Card**.
   - Test Card Number formatting (spaces added automatically after every 4 digits) and Expiry (MM/YY slash formatting).
   - Click **"Place Order"** (with missing details to trigger inline form validation).

5. **Confirm and Review History**:
   - Check the animated success screen showing your programmatically calculated delivery date (**Today + 5 days**), fake Order ID, total, and items list.
   - Click **"Orders"** in the top header to see your order history, then click the order card to expand and collapse its detailed log.

---

## 📝 Developer Note

### 1. What was hardest?
- **Ensuring Scoping and Load Order Safety**: Sharing state between classic scripts without using modular bundlers (like Vite/Webpack) can sometimes lead to load-order errors or isolated variable scopes (e.g. `let` scoping in ES6 blocks). We solved this by using `var` declarations for the shared states (`cart`, `addresses`, `selectedAddress`) to cleanly expose them globally.
- **Defensive Rendering Against Stale Data**: Addressing user-specific `localStorage` formats without clearing out the client's storage. We built parsing filters to scrub stale structures (e.g. missing `fullName` or `addressLine` fields) before loading them into state, preventing fatal `TypeError` runtime crashes.
- **Cohesive UI Transitions**: Toggling the single-page views while keeping data in sync. We solved this by overriding the central `showPage` router in `app.js` with a custom function wrapper in `checkoutFlow.js` that intercepts view shifts and automatically fires page-level recalculations.

### 2. How is state structured and kept consistent?
- **Centralized Shared Variables**:
  - `window.cart`: Tracks items, units, and custom dessert thumbnails.
  - `window.addresses`: Holds an array of validated customer address objects.
  - `window.selectedAddress`: Holds the active delivery address object.
- **LocalStorage Sync**: Whenever a cart changes, or a new address is saved/selected/deleted, the state variables write straight back to `localStorage` (via `saveCart()`, `saveAddresses()`, `saveSelectedAddressId()`).
- **Reactive Navigation Hooks**: Since everything is a Single Page Application, clicking back/forward button toggles classes. To keep values synced, every page transition triggers layout functions (`refreshSummaryPage()`, `refreshPaymentPage()`, `renderOrderHistory()`) to pull the latest state values and redraw the elements instantly.

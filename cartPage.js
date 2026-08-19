
const ADDRESSES_KEY = "addresses";
const SELECTED_ADDRESS_KEY = "selectedAddressId";

let editingAddressId = null; // null while adding a brand-new address


// ---------------------------------------------------------------------
// PERSISTENCE
// ---------------------------------------------------------------------

function saveAddresses() {
    localStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses));
}

function saveSelectedAddressId() {
    if (selectedAddress) {
        localStorage.setItem(SELECTED_ADDRESS_KEY, selectedAddress.id);
    } else {
        localStorage.removeItem(SELECTED_ADDRESS_KEY);
    }
}

function loadAddresses() {
    try {
        const raw = localStorage.getItem(ADDRESSES_KEY);
        const parsed = JSON.parse(raw) || [];
        // Filter out any stale/invalid address objects that don't have required fields
        addresses = parsed.filter(addr => addr && typeof addr === 'object' && addr.id && addr.fullName && addr.addressLine);
    } catch (e) {
        console.error("Error loading addresses", e);
        addresses = [];
    }

    const savedSelectedId = localStorage.getItem(SELECTED_ADDRESS_KEY);
    selectedAddress = addresses.find((a) => a.id === savedSelectedId) || null;

    if (!selectedAddress && addresses.length > 0) {
        selectedAddress = addresses[0];
        saveSelectedAddressId();
    }
}

function generateAddressId() {
    return "addr_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}


// ---------------------------------------------------------------------
// VALIDATION
// ---------------------------------------------------------------------

function validateAddressForm(data) {
    const errors = {};

    if (!data.fullName.trim()) errors.fullName = "Full name is required.";

    if (!data.phone.trim()) {
        errors.phone = "Phone number is required.";
    } else if (!/^\d{10}$/.test(data.phone.trim())) {
        errors.phone = "Enter a valid 10-digit phone number.";
    }

    if (!data.pincode.trim()) {
        errors.pincode = "Pincode is required.";
    } else if (!/^\d{6}$/.test(data.pincode.trim())) {
        errors.pincode = "Enter a valid 6-digit pincode.";
    }

    if (!data.addressLine.trim()) errors.addressLine = "Address line is required.";
    if (!data.city.trim()) errors.city = "City is required.";
    if (!data.state.trim()) errors.state = "State is required.";

    return errors;
}

function clearFormErrors() {
    document.querySelectorAll("#address-form .field-error").forEach((el) => {
        el.textContent = "";
    });
    document.querySelectorAll("#address-form input").forEach((el) => {
        el.classList.remove("input-error");
    });
}

function showFormErrors(errors) {
    const fieldToInputId = {
        fullName: "addr-fullname",
        phone: "addr-phone",
        pincode: "addr-pincode",
        addressLine: "addr-line",
        city: "addr-city",
        state: "addr-state",
    };

    Object.entries(errors).forEach(([field, message]) => {
        const errorEl = document.getElementById(`err-${field === "addressLine" ? "line" : field.toLowerCase()}`);
        const inputEl = document.getElementById(fieldToInputId[field]);
        if (errorEl) errorEl.textContent = message;
        if (inputEl) inputEl.classList.add("input-error");
    });
}


// ---------------------------------------------------------------------
// ADDRESS FORM (add / edit) -- lives on its own page (page-address-form)
// ---------------------------------------------------------------------

function goToAddressForm(address) {
    editingAddressId = address ? address.id : null;

    clearFormErrors();

    document.getElementById("addr-fullname").value = address ? address.fullName : "";
    document.getElementById("addr-phone").value = address ? address.phone : "";
    document.getElementById("addr-pincode").value = address ? address.pincode : "";
    document.getElementById("addr-line").value = address ? address.addressLine : "";
    document.getElementById("addr-city").value = address ? address.city : "";
    document.getElementById("addr-state").value = address ? address.state : "";

    const type = address ? address.type : "Home";
    document.querySelectorAll('input[name="addr-type"]').forEach((radio) => {
        radio.checked = radio.value === type;
    });

    document.getElementById("address-form-title").textContent = address ? "Edit Address" : "Add New Address";
    document.getElementById("save-address-btn").textContent = address ? "Save Changes" : "Save Address";

    if (typeof showPage === "function") showPage("page-address-form");
}


function resetAddressForm() {
    editingAddressId = null;
    const form = document.getElementById("address-form");
    if (form) form.reset();
    clearFormErrors();
}

function handleAddressFormSubmit(e) {
    e.preventDefault();

    const data = {
        fullName: document.getElementById("addr-fullname").value,
        phone: document.getElementById("addr-phone").value,
        pincode: document.getElementById("addr-pincode").value,
        addressLine: document.getElementById("addr-line").value,
        city: document.getElementById("addr-city").value,
        state: document.getElementById("addr-state").value,
        type: document.querySelector('input[name="addr-type"]:checked').value,
    };

    const errors = validateAddressForm(data);
    clearFormErrors();

    if (Object.keys(errors).length > 0) {
        showFormErrors(errors);
        return;
    }

    if (editingAddressId) {
        // Update in place -- not duplicated.
        const existing = addresses.find((a) => a.id === editingAddressId);
        Object.assign(existing, data);

        if (selectedAddress && selectedAddress.id === existing.id) {
            selectedAddress = existing;
        }
    } else {
        const newAddress = { id: generateAddressId(), ...data };
        addresses.push(newAddress);

        if (!selectedAddress) {
            selectedAddress = newAddress;
        }
    }

    saveAddresses();
    saveSelectedAddressId();
    resetAddressForm();
    if (typeof showPage === "function") showPage("page-cart");
    refreshCartPage();
}

// ---------------------------------------------------------------------
// ADDRESS ACTIONS
// ---------------------------------------------------------------------

function selectAddress(id) {
    const address = addresses.find((a) => a.id === id);
    if (!address) return;

    selectedAddress = address;
    saveSelectedAddressId();

    toggleAddressManagement(false);
    refreshCartPage();
}

function editAddress(id) {
    const address = addresses.find((a) => a.id === id);
    if (!address) return;
    goToAddressForm(address);
}

function deleteAddress(id) {
    addresses = addresses.filter((a) => a.id !== id);

    if (selectedAddress && selectedAddress.id === id) {
        selectedAddress = addresses.length > 0 ? addresses[0] : null;
    }

    saveAddresses();
    saveSelectedAddressId();
    refreshCartPage();
}

function attachAddressCardEvents() {
    document.querySelectorAll(".address-select-radio").forEach((radio) => {
        radio.addEventListener("change", () => selectAddress(radio.value));
    });

    document.querySelectorAll(".edit-address-btn").forEach((btn) => {
        btn.addEventListener("click", () => editAddress(btn.dataset.id));
    });

    document.querySelectorAll(".delete-address-btn").forEach((btn) => {
        btn.addEventListener("click", () => deleteAddress(btn.dataset.id));
    });
}


// ---------------------------------------------------------------------
// RENDERING -- address list / deliver-to bar / panel toggle
// ---------------------------------------------------------------------

function renderAddressList() {
    const container = document.getElementById("address-list-container");
    if (!container) return;

    if (addresses.length === 0) {
        container.innerHTML = `<p class="placeholder-note">No saved addresses yet. Add one below.</p>`;
        return;
    }

    container.innerHTML = addresses
        .map((addr) => {
            const isSelected = selectedAddress && selectedAddress.id === addr.id;
            return `
        <label class="address-card ${isSelected ? "selected" : ""}">
            <input
                type="radio"
                class="address-select-radio"
                name="delivery-address"
                value="${addr.id}"
                ${isSelected ? "checked" : ""}
            >
            <div class="address-card-body">
                <div class="address-card-top">
                    <strong>${addr.fullName}</strong>
                    <span class="address-type-badge">${addr.type}</span>
                </div>
                <p class="address-card-line">${addr.addressLine}, ${addr.city}, ${addr.state} - ${addr.pincode}</p>
                <p class="address-card-phone">Phone: ${addr.phone}</p>
                <div class="address-card-actions">
                    <button type="button" class="edit-address-btn" data-id="${addr.id}">Edit</button>
                    <button type="button" class="delete-address-btn" data-id="${addr.id}">Delete</button>
                </div>
            </div>
        </label>
        `;
        })
        .join("");

    attachAddressCardEvents();
}

function renderDeliverToBar() {
    const nameEl = document.getElementById("deliver-to-name");
    const typeEl = document.getElementById("deliver-to-type");
    const fullEl = document.getElementById("deliver-to-full");
    const changeBtn = document.getElementById("change-address-btn");

    if (!nameEl) return;

    if (selectedAddress && selectedAddress.fullName) {
        nameEl.textContent = `${selectedAddress.fullName}, ${selectedAddress.pincode || ''}`;
        if (selectedAddress.type) {
            typeEl.textContent = selectedAddress.type.toUpperCase();
            typeEl.classList.remove("hidden");
        } else {
            typeEl.classList.add("hidden");
        }
        fullEl.textContent = `${selectedAddress.addressLine || ''}, ${selectedAddress.city || ''}, ${selectedAddress.state || ''}`;
        changeBtn.textContent = "Change";
    } else {
        nameEl.textContent = "No address added";
        typeEl.classList.add("hidden");
        fullEl.textContent = "Add a delivery address to continue.";
        changeBtn.textContent = "Add Address";
    }
}

function toggleAddressManagement(forceState) {
    const panel = document.getElementById("address-management");
    if (!panel) return;

    const shouldShow = typeof forceState === "boolean" ? forceState : panel.classList.contains("hidden");
    panel.classList.toggle("hidden", !shouldShow);
}


// ---------------------------------------------------------------------
// PRICE DETAILS
// ---------------------------------------------------------------------

function renderPriceDetails() {
    const itemCountEl = document.getElementById("price-item-count");
    const mrpEl = document.getElementById("price-mrp");
    const subtotalEl = document.getElementById("cart-subtotal");

    if (!itemCountEl) return;

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = getCartSubtotal();

    itemCountEl.textContent = totalItems;
    mrpEl.textContent = `₹${subtotal}`;
    subtotalEl.textContent = `₹${subtotal}`;
}

function updatePlaceOrderButton() {
    const btn = document.getElementById("place-order-btn");
    const hint = document.getElementById("place-order-hint");
    if (!btn) return;

    const cartHasItems = cart.length > 0;
    const hasAddress = !!selectedAddress;

    btn.disabled = !(cartHasItems && hasAddress);

    if (!hint) return;

    if (!cartHasItems) {
        hint.textContent = "Add an item to your cart to continue.";
        hint.classList.remove("hidden");
    } else if (!hasAddress) {
        hint.textContent = "Select a delivery address to continue.";
        hint.classList.remove("hidden");
    } else {
        hint.textContent = "";
        hint.classList.add("hidden");
    }
}


// ---------------------------------------------------------------------
// PUTTING IT ALL TOGETHER
// ---------------------------------------------------------------------

function refreshCartPage() {
    if (typeof renderCart === "function") renderCart();
    renderDeliverToBar();
    renderAddressList();
    renderPriceDetails();
    updatePlaceOrderButton();
}


// ---------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------

function attachAddressFormEvents() {
    const changeBtn = document.getElementById("change-address-btn");
    const addBtn = document.getElementById("add-address-btn");
    const cancelBtn = document.getElementById("cancel-address-btn");
    const form = document.getElementById("address-form");

    if (changeBtn) {
        changeBtn.addEventListener("click", () => {
            // No addresses saved at all -- skip the (empty) list panel and
            // go straight to the form.
            if (addresses.length === 0) {
                goToAddressForm(null);
            } else {
                toggleAddressManagement();
            }
        });
    }

    if (addBtn) {
        addBtn.addEventListener("click", () => goToAddressForm(null));
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            resetAddressForm();
            if (typeof showPage === "function") showPage("page-cart");
        });
    }

    if (form) {
        form.addEventListener("submit", handleAddressFormSubmit);
    }

    // Digits only, as-you-type, for phone & pincode.
    const phoneInput = document.getElementById("addr-phone");
    const pincodeInput = document.getElementById("addr-pincode");
    if (phoneInput) {
        phoneInput.addEventListener("input", () => {
            phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 10);
        });
    }
    if (pincodeInput) {
        pincodeInput.addEventListener("input", () => {
            pincodeInput.value = pincodeInput.value.replace(/\D/g, "").slice(0, 6);
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadAddresses();
    attachAddressFormEvents();
    refreshCartPage();
});

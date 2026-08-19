/*
    app.js
    ------
    This file owns page navigation for the single-page checkout flow.
    Cart, address, coupon and payment logic will be added here (or in
    their own files) in later steps -- for now this only handles moving
    between the six "pages" (sections) and remembering which one the
    shopper was on.
*/


// ---------------------------------------------------------------------
// PAGE NAVIGATION
// ---------------------------------------------------------------------

const PAGE_ORDER = [
    "page-product",
    "page-cart",
    "page-address-form",
    "page-summary",
    "page-payment",
    "page-confirmation",
];

const STEPPER_PAGES = ["page-summary", "page-payment", "page-confirmation"];

const CURRENT_PAGE_KEY = "currentPage";


// Read which page the shopper was last on, so a refresh doesn't dump
// them back at the product grid.
function getCurrentPage() {
    const saved = localStorage.getItem(CURRENT_PAGE_KEY);
    return PAGE_ORDER.includes(saved) ? saved : "page-product";
}

function setCurrentPage(pageId) {
    localStorage.setItem(CURRENT_PAGE_KEY, pageId);
}


// Show exactly one page section, hide the rest.
function showPage(pageId) {
    if (!PAGE_ORDER.includes(pageId)) {
        console.error(`showPage: "${pageId}" is not a known page id`);
        return;
    }

    document.querySelectorAll(".page").forEach((section) => {
        section.classList.toggle("hidden", section.id !== pageId);
    });

    updateStepper(pageId);
    setCurrentPage(pageId);
    window.scrollTo({ top: 0, behavior: "instant" });

    // The cart page (items + price details + address management) is driven
    // by cartPage.js. Refresh it whenever it's shown, so a page reload that
    // restores straight into it still renders correctly.
    if (pageId === "page-cart" && typeof refreshCartPage === "function") {
        refreshCartPage();
    }
}


// Keep every stepper on the page (there's one per checkout section) in
// sync with where the shopper currently is: the current step gets
// "active", steps before it get "completed", steps after it get neither.
function updateStepper(pageId) {
    const currentStepKey = pageId.replace("page-", ""); // "page-summary" -> "summary"
    const currentStepIndex = STEPPER_PAGES.indexOf(pageId);

    document.querySelectorAll(".stepper").forEach((stepper) => {
        stepper.querySelectorAll(".step").forEach((step) => {
            const stepPageId = `page-${step.dataset.step}`;
            const stepIndex = STEPPER_PAGES.indexOf(stepPageId);

            step.classList.remove("active", "completed");

            if (step.dataset.step === currentStepKey) {
                step.classList.add("active");
            } else if (currentStepIndex !== -1 && stepIndex < currentStepIndex) {
                step.classList.add("completed");
            }
        });
    });
}


// Any element with data-goto="page-id" navigates there on click.
// This keeps the HTML declarative: to add a new nav button anywhere,
// just add the data-goto attribute -- no extra JS wiring needed.
function attachNavigationEvents() {
    document.querySelectorAll("[data-goto]").forEach((el) => {
        el.addEventListener("click", () => {
            showPage(el.dataset.goto);
        });
    });
}


// ---------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    attachNavigationEvents();
    showPage(getCurrentPage());
});

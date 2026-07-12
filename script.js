/* ============================================================
   SMARTBANK AI — Core JavaScript Engine (Vanilla JS, No Frameworks)
   AI-Powered Banking Service & Grievance Management Portal
   ============================================================ */

/* ------------------------------------------------------------
   1. GLOBAL STATE
   ------------------------------------------------------------ */
let categoryChartInstance = null;
let priorityChartInstance = null;
let monthlyChartInstance = null;
let departmentChartInstance = null;
let resolutionChartInstance = null;

let lastDeletedRequest = null;   // Undo stack slot
let undoTimeoutId = null;

// Storage key (kept distinct from legacy key to avoid stale data collisions)
const STORAGE_KEY = "smartbank_requests";

// Category, Priority & Department reference lists (single source of truth)
const CATEGORY_LIST = [
    "Debit Card", "Credit Card", "Loan", "UPI", "Net Banking",
    "Mobile Banking", "KYC", "Account Opening", "Fixed Deposit",
    "Fraud Report", "General Query"
];

const PRIORITY_LIST = ["Critical", "High", "Medium", "Normal"];

const DEPARTMENT_LIST = [
    "Digital Banking", "Card Services", "Loans", "Customer Support",
    "Fraud Investigation", "Operations", "KYC Team"
];

// Simulated branch coordinates for the Branch Network Map
const branchCoordMap = {
    "MG Road Branch": { x: 25, y: 35 },
    "Andheri Branch": { x: 50, y: 15 },
    "Connaught Place Branch": { x: 50, y: 50 },
    "Whitefield Branch": { x: 45, y: 80 },
    "Salt Lake Branch": { x: 75, y: 45 },
    "Hitech City Branch": { x: 80, y: 75 },
    "Koramangala Branch": { x: 30, y: 70 },
    "Banjara Hills Branch": { x: 55, y: 35 }
};

/* ------------------------------------------------------------
   2. PWA / SERVICE WORKER REGISTRATION
   ------------------------------------------------------------ */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js")
            .then(reg => console.log("SmartBank AI PWA Service Worker registered.", reg.scope))
            .catch(err => console.warn("Service worker registration failed: ", err));
    });
}

/* ------------------------------------------------------------
   3. UI HELPERS — Toasts & Loading Overlay
   ------------------------------------------------------------ */

/**
 * Displays a floating toast notification.
 * @param {string} message - Text content of the toast.
 * @param {"success"|"error"|"info"} type - Visual style of the toast.
 */
const showToast = (message, type = "success") => {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const iconMap = { success: "fa-check-circle", error: "fa-exclamation-circle", info: "fa-circle-info" };
    toast.innerHTML = `<i class="fas ${iconMap[type] || iconMap.success}"></i><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "fadeOut 0.5s forwards";
        setTimeout(() => toast.remove(), 500);
    }, 2600);
};

/**
 * Reveals the AI processing overlay with a custom message and animates
 * a checklist of "AI steps" to simulate a genuine analysis pipeline.
 * @param {string} message - Primary status message shown to the user.
 */
const showLoading = (message = "Analyzing request with AI engine...") => {
    document.getElementById("loading-message").textContent = message;
    document.getElementById("loading-overlay").style.display = "flex";

    const stepsContainer = document.getElementById("ai-processing-steps");
    const steps = [
        { icon: "fa-magnifying-glass", label: "Scanning request text..." },
        { icon: "fa-triangle-exclamation", label: "Predicting urgency level..." },
        { icon: "fa-building-columns", label: "Routing to correct department..." },
        { icon: "fa-clock", label: "Estimating resolution time..." }
    ];
    stepsContainer.innerHTML = steps.map(s => `<div class="ai-step"><i class="fas ${s.icon}"></i><span>${s.label}</span></div>`).join("");

    // Sequentially reveal each step to feel like a real AI pipeline
    const stepEls = stepsContainer.querySelectorAll(".ai-step");
    stepEls.forEach((el, idx) => {
        setTimeout(() => el.classList.add("done"), 250 * (idx + 1));
    });
};

/** Hides the AI processing / loading overlay. */
const hideLoading = () => {
    document.getElementById("loading-overlay").style.display = "none";
};

/* ------------------------------------------------------------
   4. LOCAL STORAGE PERSISTENCE LAYER
   ------------------------------------------------------------ */

/**
 * Retrieves all banking requests from LocalStorage. Falls back to
 * seeded mock data on first run or if the stored data is corrupted.
 * @returns {Array<Object>} List of banking service request records.
 */
const getRequests = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return getMockRequests();
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : getMockRequests();
    } catch (e) {
        console.error("LocalStorage corrupted. Resetting SmartBank AI data.", e);
        return getMockRequests();
    }
};

/**
 * Persists the full list of banking requests to LocalStorage.
 * @param {Array<Object>} requests - Complete request dataset to save.
 */
const saveRequests = (requests) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
};

/**
 * Seeds premium demo data so the dashboard is populated on first load.
 * @returns {Array<Object>} The generated mock dataset (also saved to storage).
 */
function getMockRequests() {
    const mock = [
        {
            id: "mp928k1a",
            name: "Emily Watson",
            email: "emily@example.com",
            mobile: "9876543210",
            accountType: "Savings",
            category: "UPI",
            branch: "MG Road Branch",
            description: "My UPI transaction failed but the amount was debited from my account. This happened during a payment at a merchant store.",
            priority: "High",
            department: "Digital Banking",
            resolutionTime: "6 Hours",
            status: "Pending",
            timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
        },
        {
            id: "kp837s2c",
            name: "Rajesh Kumar",
            email: "rajesh@example.com",
            mobile: "9123456780",
            accountType: "Current",
            category: "Debit Card",
            branch: "Andheri Branch",
            description: "My debit card got permanently blocked after multiple failed PIN attempts at an ATM. I need it urgently unblocked.",
            priority: "High",
            department: "Card Services",
            resolutionTime: "6 Hours",
            status: "Pending",
            timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
            id: "rp734t1m",
            name: "Marcus Vance",
            email: "marcus@example.com",
            mobile: "9988776655",
            accountType: "Business",
            category: "Loan",
            branch: "Whitefield Branch",
            description: "I would like to inquire about the status of my business loan application submitted last week.",
            priority: "Normal",
            department: "Loans",
            resolutionTime: "3 Days",
            status: "Resolved",
            timestamp: new Date(Date.now() - 3600000 * 72).toISOString()
        },
        {
            id: "fr441q9z",
            name: "Anita Sharma",
            email: "anita@example.com",
            mobile: "9012345678",
            accountType: "Savings",
            category: "Fraud Report",
            branch: "Salt Lake Branch",
            description: "I noticed an unauthorized transaction of Rs. 15,000 on my account that I did not initiate. Please investigate immediately, this looks like fraud.",
            priority: "Critical",
            department: "Fraud Investigation",
            resolutionTime: "2 Hours",
            status: "Pending",
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
        }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
    return mock;
}

/* ------------------------------------------------------------
   5. AI SIMULATION ENGINE
   Predicts urgency, department routing & resolution time based on
   category + free-text description keyword analysis.
   ------------------------------------------------------------ */

/**
 * Simulated AI decision matrix. Scans description text for urgency
 * signals and maps the issue category to the appropriate department
 * and an estimated resolution time.
 * @param {string} category - Selected banking issue category.
 * @param {string} description - Free-text description from the customer.
 * @returns {{priority:string, department:string, resolutionTime:string}}
 */
const runAIAnalysis = (category, description = "") => {
    let priority = "Normal";
    let department = "Customer Support";
    let resolutionTime = "3 Days";

    const text = description.toLowerCase();

    // Critical urgency keyword signals (apply across all categories)
    const criticalSignals = ["fraud", "unauthorized", "hacked", "stolen", "scam", "urgent", "emergency", "phishing"];
    const highSignals = ["blocked", "failed", "not working", "error", "declined", "deducted", "debited", "lost card"];

    const hasCritical = criticalSignals.some(word => text.includes(word));
    const hasHigh = highSignals.some(word => text.includes(word));

    switch (category) {
        case "Debit Card":
        case "Credit Card":
            department = "Card Services";
            priority = hasCritical ? "Critical" : hasHigh ? "High" : "Medium";
            resolutionTime = hasCritical ? "2 Hours" : hasHigh ? "6 Hours" : "24 Hours";
            break;

        case "Loan":
        case "Fixed Deposit":
            department = "Loans";
            priority = hasCritical ? "High" : hasHigh ? "Medium" : "Normal";
            resolutionTime = hasCritical ? "6 Hours" : hasHigh ? "24 Hours" : "3 Days";
            break;

        case "UPI":
        case "Net Banking":
        case "Mobile Banking":
            department = "Digital Banking";
            priority = hasCritical ? "Critical" : hasHigh ? "High" : "Medium";
            resolutionTime = hasCritical ? "2 Hours" : hasHigh ? "6 Hours" : "24 Hours";
            break;

        case "KYC":
        case "Account Opening":
            department = "KYC Team";
            priority = hasCritical ? "High" : hasHigh ? "Medium" : "Normal";
            resolutionTime = hasCritical ? "24 Hours" : hasHigh ? "3 Days" : "3 Days";
            break;

        case "Fraud Report":
            department = "Fraud Investigation";
            priority = "Critical"; // Fraud reports are always treated as critical
            resolutionTime = "2 Hours";
            break;

        case "General Query":
        default:
            department = "Customer Support";
            priority = hasCritical ? "High" : hasHigh ? "Medium" : "Normal";
            resolutionTime = hasCritical ? "24 Hours" : hasHigh ? "3 Days" : "3 Days";
            break;
    }

    return { priority, department, resolutionTime };
};

/**
 * Generates a human-friendly reference number for a request based on
 * its unique id, e.g. "SB-2A9F31".
 * @param {string} id - Internal unique identifier of the request.
 * @returns {string} Formatted reference number.
 */
const getReferenceNumber = (id) => `SB-${id.substring(0, 6).toUpperCase()}`;

/* ------------------------------------------------------------
   6. CARD RENDERING — Request Management Ledger
   ------------------------------------------------------------ */

/**
 * Maps a category name to a representative Font Awesome icon class.
 * @param {string} category
 * @returns {string}
 */
const getCategoryIcon = (category) => {
    const iconMap = {
        "Debit Card": "fa-credit-card",
        "Credit Card": "fa-credit-card",
        "Loan": "fa-hand-holding-dollar",
        "UPI": "fa-mobile-screen-button",
        "Net Banking": "fa-globe",
        "Mobile Banking": "fa-mobile-screen",
        "KYC": "fa-id-card",
        "Account Opening": "fa-user-plus",
        "Fixed Deposit": "fa-piggy-bank",
        "Fraud Report": "fa-user-shield",
        "General Query": "fa-circle-question"
    };
    return iconMap[category] || "fa-file-lines";
};

/**
 * Builds a DOM element representing a single banking request card,
 * including priority badge, timeline, and action buttons.
 * @param {Object} request - Banking service request record.
 * @returns {HTMLElement} The rendered card element.
 */
const renderRequestCard = (request) => {
    const card = document.createElement("div");
    card.classList.add("request-card");
    card.dataset.id = request.id;

    const categoryIcon = getCategoryIcon(request.category);
    const priorityClass = request.priority.toLowerCase();

    // Progress timeline simulation
    const steps = ["Received", "Assigned", "In Progress", "Resolved"];
    let currentStepIndex = 1;
    if (request.priority === "Critical" || request.priority === "High") currentStepIndex = 2;
    if (request.status === "Resolved") currentStepIndex = 3;

    const timelineHTML = `
        <div class="timeline-wrapper">
            ${steps.map((step, idx) => `
                <div class="timeline-step ${idx <= currentStepIndex ? 'active' : ''}">
                    <div class="timeline-dot"></div>
                    <span class="timeline-label">${step}</span>
                </div>
            `).join('')}
        </div>
    `;

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <h3 style="font-size: 1.1em;"><i class="fas ${categoryIcon}" style="color: var(--primary-color); margin-right: 8px;"></i>${request.category}</h3>
            <span class="status-${request.status.toLowerCase()}" style="font-size: 0.8em; padding: 4px 10px; border-radius: 20px; background: var(--input-background); border: 1px solid var(--border-color); font-weight:600;"><i class="fas ${request.status === 'Resolved' ? 'fa-check-circle' : 'fa-hourglass-half'}"></i> ${request.status}</span>
        </div>

        <p class="reference-badge" style="margin-bottom: 8px;"><i class="fas fa-hashtag"></i> ${getReferenceNumber(request.id)}</p>
        <p><strong><i class="fas fa-user-circle" style="width: 20px; color: var(--primary-color);"></i> Customer:</strong> ${request.name}</p>
        <p><strong><i class="fas fa-building" style="width: 20px; color: var(--primary-color);"></i> Branch:</strong> ${request.branch}</p>

        <div style="margin: 12px 0; padding: 10px 14px; background: rgba(0,0,0,0.03); border-radius: 8px; border-left: 4px solid var(--primary-color); font-size:0.9em;">
            <p style="font-style: italic;">"${request.description}"</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85em; margin-bottom: 10px; align-items:center;">
            <p><span class="priority-badge priority-${priorityClass}"><i class="fas fa-flag"></i> ${request.priority}</span></p>
            <p><strong>Est. Time:</strong> <i class="fas fa-calendar-alt"></i> ${request.resolutionTime}</p>
        </div>
        <p style="font-size: 0.85em; margin-bottom: 15px;"><strong>Department:</strong> <i class="fas fa-sitemap"></i> ${request.department}</p>

        ${timelineHTML}

        <div class="card-actions" style="margin-top: 15px;">
            <button class="btn btn-outline btn-export-one tooltip" data-id="${request.id}" data-tooltip="Export this request"><i class="fas fa-file-export"></i></button>
            <button class="btn btn-outline btn-edit tooltip" data-id="${request.id}" data-tooltip="Edit Request"><i class="fas fa-pen"></i> Edit</button>
            ${request.status === "Pending" ? `<button class="btn btn-resolve" data-id="${request.id}"><i class="fas fa-check"></i> Resolve</button>` : ``}
            <button class="btn btn-delete" data-id="${request.id}"><i class="fas fa-trash-alt"></i> Delete</button>
        </div>
    `;
    return card;
};

/**
 * Renders animated skeleton placeholder cards while data is refreshing,
 * providing a premium perceived-performance loading effect.
 * @param {HTMLElement} container - Target container to fill with skeletons.
 * @param {number} count - Number of skeleton cards to render.
 */
const renderSkeletonCards = (container, count = 3) => {
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement("div");
        skeleton.className = "skeleton-card";
        skeleton.innerHTML = `
            <div class="skeleton-line w-40"></div>
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-100"></div>
            <div class="skeleton-line w-80"></div>
            <div class="skeleton-line w-60"></div>
        `;
        container.appendChild(skeleton);
    }
};

/* ------------------------------------------------------------
   7. CHART.JS ANALYTICS RENDERING
   ------------------------------------------------------------ */

/**
 * Returns theme-aware colors used consistently across all Chart.js
 * instances so charts adapt automatically to Dark/Light mode.
 * @returns {{labelColor:string, gridColor:string}}
 */
const getChartThemeColors = () => {
    const isDark = document.body.classList.contains("dark-mode");
    return {
        labelColor: isDark ? "#E2E8F0" : "#1E293B",
        gridColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)"
    };
};

/** Common Chart.js palette used for category/department/priority charts. */
const CHART_PALETTE = ["#2563EB", "#38BDF8", "#22C55E", "#F59E0B", "#EF4444", "#A855F7", "#0D9488", "#F97316", "#14B8A6", "#6366F1", "#EC4899"];

/**
 * Renders the Category Distribution doughnut chart.
 * @param {Array<Object>} requests
 */
const renderCategoryChart = (requests) => {
    const counts = CATEGORY_LIST.map(cat => requests.filter(r => r.category === cat).length);
    const ctx = document.getElementById("categoryChart").getContext("2d");
    const { labelColor } = getChartThemeColors();

    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: CATEGORY_LIST,
            datasets: [{ data: counts, backgroundColor: CHART_PALETTE, borderWidth: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { animateScale: true, animateRotate: true },
            plugins: { legend: { position: "right", labels: { color: labelColor, boxWidth: 12, font: { size: 10, family: "Poppins" } } } }
        }
    });
};

/**
 * Renders the Priority Distribution bar chart.
 * @param {Array<Object>} requests
 */
const renderPriorityChart = (requests) => {
    const counts = PRIORITY_LIST.map(p => requests.filter(r => r.priority === p).length);
    const ctx = document.getElementById("priorityChart").getContext("2d");
    const { labelColor, gridColor } = getChartThemeColors();
    const priorityColors = { Critical: "#EF4444", High: "#F59E0B", Medium: "#38BDF8", Normal: "#22C55E" };

    if (priorityChartInstance) priorityChartInstance.destroy();

    priorityChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: PRIORITY_LIST,
            datasets: [{
                label: "Requests",
                data: counts,
                backgroundColor: PRIORITY_LIST.map(p => priorityColors[p]),
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 900, easing: "easeOutQuart" },
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: labelColor }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { color: labelColor, stepSize: 1 }, grid: { color: gridColor } }
            }
        }
    });
};

/**
 * Renders the Monthly Requests line chart, aggregating requests by month.
 * @param {Array<Object>} requests
 */
const renderMonthlyChart = (requests) => {
    const monthLabels = [];
    const monthCounts = [];
    const now = new Date();

    // Build a rolling 6-month window ending at the current month
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
        monthLabels.push(label);
        const count = requests.filter(r => {
            const rd = new Date(r.timestamp);
            return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        }).length;
        monthCounts.push(count);
    }

    const ctx = document.getElementById("monthlyChart").getContext("2d");
    const { labelColor, gridColor } = getChartThemeColors();

    if (monthlyChartInstance) monthlyChartInstance.destroy();

    monthlyChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: monthLabels,
            datasets: [{
                label: "Requests",
                data: monthCounts,
                borderColor: "#2563EB",
                backgroundColor: "rgba(37, 99, 235, 0.15)",
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#2563EB"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 900 },
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: labelColor }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { color: labelColor, stepSize: 1 }, grid: { color: gridColor } }
            }
        }
    });
};

/**
 * Renders the Department Workload horizontal bar chart.
 * @param {Array<Object>} requests
 */
const renderDepartmentChart = (requests) => {
    const counts = DEPARTMENT_LIST.map(dep => requests.filter(r => r.department === dep).length);
    const ctx = document.getElementById("departmentChart").getContext("2d");
    const { labelColor, gridColor } = getChartThemeColors();

    if (departmentChartInstance) departmentChartInstance.destroy();

    departmentChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: DEPARTMENT_LIST,
            datasets: [{
                label: "Workload",
                data: counts,
                backgroundColor: CHART_PALETTE,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 900 },
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, ticks: { color: labelColor, stepSize: 1 }, grid: { color: gridColor } },
                y: { ticks: { color: labelColor, font: { size: 10 } }, grid: { display: false } }
            }
        }
    });
};

/**
 * Renders the Resolution Trend chart for the last 7 days, showing
 * how many requests were resolved each day.
 * @param {Array<Object>} requests
 */
const renderResolutionChart = (requests) => {
    const dayLabels = [];
    const dayCounts = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const label = d.toLocaleDateString("default", { weekday: "short" });
        dayLabels.push(label);
        const count = requests.filter(r => {
            if (r.status !== "Resolved") return false;
            const rd = new Date(r.timestamp);
            return rd.toDateString() === d.toDateString();
        }).length;
        dayCounts.push(count);
    }

    const ctx = document.getElementById("resolutionChart").getContext("2d");
    const { labelColor, gridColor } = getChartThemeColors();

    if (resolutionChartInstance) resolutionChartInstance.destroy();

    resolutionChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: dayLabels,
            datasets: [{
                label: "Resolved Requests",
                data: dayCounts,
                borderColor: "#22C55E",
                backgroundColor: "rgba(34, 197, 94, 0.15)",
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#22C55E"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 900 },
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: labelColor }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { color: labelColor, stepSize: 1 }, grid: { color: gridColor } }
            }
        }
    });
};

/**
 * Refreshes all Chart.js visualizations at once.
 * @param {Array<Object>} requests
 */
const updateAllCharts = (requests) => {
    renderCategoryChart(requests);
    renderPriorityChart(requests);
    renderMonthlyChart(requests);
    renderDepartmentChart(requests);
    renderResolutionChart(requests);
};

/* ------------------------------------------------------------
   8. AI BANKING SUMMARY / INSIGHTS PANEL
   ------------------------------------------------------------ */

/**
 * Compiles and displays the "AI Banking Summary" insights panel:
 * most reported issue, peak request time, average resolution and
 * a dynamic strategic recommendation.
 * @param {Array<Object>} requests
 */
const updateAIInsights = (requests) => {
    if (requests.length === 0) {
        document.getElementById("ai-top-category").textContent = "N/A";
        document.getElementById("ai-peak-time").textContent = "N/A";
        document.getElementById("ai-mean-resolution").textContent = "N/A";
        document.getElementById("ai-system-recommendation").textContent = "Submit banking requests to activate the AI summarization engine.";
        return;
    }

    // Most reported category
    const categoryMap = {};
    requests.forEach(r => { categoryMap[r.category] = (categoryMap[r.category] || 0) + 1; });
    const topCategory = Object.keys(categoryMap).reduce((a, b) => categoryMap[a] > categoryMap[b] ? a : b);

    // Peak request hour bucket
    const hourBuckets = {};
    requests.forEach(r => {
        const hour = new Date(r.timestamp).getHours();
        const bucket = `${hour}:00 - ${(hour + 3) % 24}:00`;
        hourBuckets[bucket] = (hourBuckets[bucket] || 0) + 1;
    });
    const peakBucket = Object.keys(hourBuckets).length
        ? Object.keys(hourBuckets).reduce((a, b) => hourBuckets[a] > hourBuckets[b] ? a : b)
        : "10 AM - 1 PM";

    document.getElementById("ai-top-category").textContent = topCategory;
    document.getElementById("ai-peak-time").textContent = peakBucket;
    document.getElementById("ai-mean-resolution").textContent = `~${calculateAverageResolutionHours(requests)} Hours`;

    // Dynamic strategic recommendation based on top category
    const recommendationMap = {
        "UPI": "UPI failures are trending high. AI recommends scaling up Digital Banking infrastructure and load-testing payment gateways.",
        "Debit Card": "High card-blocking activity detected. AI recommends deploying self-service instant card unblock via mobile app.",
        "Credit Card": "Frequent credit card disputes reported. AI recommends strengthening the Card Services fraud-check pipeline.",
        "Loan": "Loan status inquiries are trending. AI recommends adding automated loan tracking notifications for customers.",
        "Fraud Report": "Elevated fraud reports detected. AI strongly recommends immediate reinforcement of the Fraud Investigation team.",
        "KYC": "KYC delays are a recurring theme. AI recommends digitizing document verification with OCR automation.",
        "Net Banking": "Net Banking issues are frequent. AI recommends a full audit of the online banking portal uptime.",
        "Mobile Banking": "Mobile Banking issues are frequent. AI recommends an app stability and crash-analytics review.",
        "Account Opening": "Account opening delays detected. AI recommends streamlining the onboarding workflow.",
        "Fixed Deposit": "FD-related queries are increasing. AI recommends adding self-service FD management tools.",
        "General Query": "General queries dominate the ledger. AI recommends expanding the self-service FAQ / chatbot coverage."
    };
    document.getElementById("ai-system-recommendation").textContent =
        recommendationMap[topCategory] || `Consolidated analysis indicates optimizing "${topCategory}" workflows will yield the highest customer satisfaction improvement.`;
};

/**
 * Calculates an approximate average resolution time (in hours) across
 * all resolved requests, based on their assigned resolutionTime string.
 * @param {Array<Object>} requests
 * @returns {number} Average resolution hours (rounded).
 */
const calculateAverageResolutionHours = (requests) => {
    const resolved = requests.filter(r => r.status === "Resolved");
    if (resolved.length === 0) return 18; // Sensible placeholder default

    const toHours = (str) => {
        if (str.includes("Hour")) return parseInt(str) || 0;
        if (str.includes("Day")) return (parseInt(str) || 1) * 24;
        return 24;
    };

    const total = resolved.reduce((sum, r) => sum + toHours(r.resolutionTime), 0);
    return Math.round(total / resolved.length);
};

/* ------------------------------------------------------------
   9. BRANCH NETWORK MAP SIMULATION
   ------------------------------------------------------------ */

/**
 * Updates the simulated Branch Network Map markers and sidebar list
 * to reflect the current set of banking requests.
 * @param {Array<Object>} requests
 */
const updateBranchNetworkMap = (requests) => {
    const markersLayer = document.getElementById("markers-layer");
    const listContainer = document.getElementById("map-events-list");
    if (!markersLayer || !listContainer) return;

    markersLayer.innerHTML = "";
    listContainer.innerHTML = "";

    requests.forEach((request) => {
        let coords = branchCoordMap[request.branch];
        if (!coords) {
            const seed = request.branch.length * 7;
            coords = { x: 15 + (seed % 70), y: 15 + ((seed * 11) % 70) };
        }

        // Color mapped by category for quick visual differentiation
        let color = "#38BDF8"; // Digital Banking default
        if (request.category === "Fraud Report") color = "#EF4444";
        else if (["Debit Card", "Credit Card"].includes(request.category)) color = "#F59E0B";
        else if (request.category === "Loan") color = "#22C55E";

        const marker = document.createElement("div");
        marker.className = "map-marker";
        marker.style.left = `${coords.x}%`;
        marker.style.top = `${coords.y}%`;
        marker.style.borderColor = color;
        marker.style.background = color;
        marker.title = `[Click] ${getReferenceNumber(request.id)}: ${request.description}`;

        marker.addEventListener("click", () => {
            showToast(`Focusing: ${getReferenceNumber(request.id)} at ${request.branch}`, "info");
            const listEl = document.getElementById(`map-item-${request.id}`);
            if (listEl) {
                listEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
                listEl.style.borderColor = "var(--primary-color)";
                setTimeout(() => { listEl.style.borderColor = "var(--border-color)"; }, 1500);
            }
        });

        markersLayer.appendChild(marker);

        const listItem = document.createElement("div");
        listItem.id = `map-item-${request.id}`;
        listItem.className = "map-event-item";
        listItem.innerHTML = `
            <strong>${getReferenceNumber(request.id)}</strong> - ${request.category}<br>
            <span style="font-size:0.8em; opacity:0.8;"><i class="fas fa-building"></i> ${request.branch}</span>
        `;
        listItem.addEventListener("click", () => {
            showToast(`Navigating map to: ${request.branch}`, "info");
            marker.style.transform = "translate(-50%, -50%) scale(2.2)";
            setTimeout(() => { marker.style.transform = "translate(-50%, -50%) scale(1)"; }, 1200);
        });
        listContainer.appendChild(listItem);
    });
};

/* ------------------------------------------------------------
   10. DASHBOARD COUNTER ANIMATIONS
   ------------------------------------------------------------ */

/**
 * Animates all elements with the `.counter` class from 0 to their
 * target numeric value for a premium "smooth counter" effect.
 * Supports an optional `data-suffix` attribute (e.g. "%", " Hrs").
 */
const animateDashboardCounters = () => {
    const counters = document.querySelectorAll(".counter");
    counters.forEach(counter => {
        const target = parseInt(counter.textContent, 10) || 0;
        const suffix = counter.dataset.suffix || "";
        let count = 0;
        const speed = Math.max(1, Math.floor(target / 40));

        const updateCount = () => {
            if (count < target) {
                count += speed;
                if (count > target) count = target;
                counter.textContent = count + suffix;
                setTimeout(updateCount, 15);
            } else {
                counter.textContent = target + suffix;
            }
        };
        updateCount();
    });
};

/* ------------------------------------------------------------
   11. DASHBOARD STATS + LEDGER REFRESH LAYER
   ------------------------------------------------------------ */

/**
 * Central refresh routine: recomputes all dashboard stats, re-renders
 * the request cards, and refreshes charts/insights/map. Accepts an
 * optional filtered subset for the ledger cards while stats/charts
 * always compute against the complete dataset for global context.
 * @param {Array<Object>} [filteredList] - Optional filtered subset for card rendering.
 */
const refreshDashboard = (filteredList = null) => {
    const allRequests = getRequests();
    const listToRender = filteredList !== null ? filteredList : allRequests;

    // Core dashboard stat counters
    document.getElementById("total-requests").textContent = allRequests.length;
    document.getElementById("critical-requests").textContent = allRequests.filter(r => r.priority === "Critical").length;
    document.getElementById("pending-requests").textContent = allRequests.filter(r => r.status === "Pending").length;
    document.getElementById("resolved-requests").textContent = allRequests.filter(r => r.status === "Resolved").length;
    document.getElementById("avg-resolution-time").textContent = calculateAverageResolutionHours(allRequests);
    document.getElementById("fraud-alerts").textContent = allRequests.filter(r => r.category === "Fraud Report").length;
    document.getElementById("digital-banking-requests").textContent = allRequests.filter(r => r.department === "Digital Banking").length;

    // Simulated customer satisfaction score, weighted by resolution ratio
    const resolvedCount = allRequests.filter(r => r.status === "Resolved").length;
    const satisfaction = allRequests.length > 0
        ? Math.min(99, 70 + Math.round((resolvedCount / allRequests.length) * 29))
        : 0;
    document.getElementById("customer-satisfaction").textContent = satisfaction;

    // Resolution progress bar
    const progressPercentage = allRequests.length > 0 ? Math.round((resolvedCount / allRequests.length) * 100) : 0;
    document.getElementById("resolution-percentage").textContent = `${progressPercentage}%`;
    document.getElementById("resolution-progress-fill").style.width = `${progressPercentage}%`;

    // Hero mini stats (today's requests + avg response)
    const today = new Date().toDateString();
    const todayCount = allRequests.filter(r => new Date(r.timestamp).toDateString() === today).length;
    const heroRequestsEl = document.getElementById("hero-requests-today");
    const heroAvgEl = document.getElementById("hero-avg-response");
    if (heroRequestsEl) heroRequestsEl.textContent = todayCount;
    if (heroAvgEl) heroAvgEl.textContent = `${calculateAverageResolutionHours(allRequests)}h`;

    // Render request ledger cards
    const container = document.getElementById("requests-container");
    container.innerHTML = "";

    if (listToRender.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; opacity:0.8;">
                <i class="fas fa-building-columns" style="font-size: 3.5em; color: var(--primary-color); margin-bottom:15px; display:block;"></i>
                <h3>No Banking Requests Found</h3>
                <p>No requests matched the active ledger filters, or the database is empty.</p>
            </div>
        `;
    } else {
        listToRender.forEach(r => container.appendChild(renderRequestCard(r)));
    }

    // Refresh charts, AI insights & branch network map (always full dataset context)
    updateAllCharts(allRequests);
    updateAIInsights(allRequests);
    updateBranchNetworkMap(allRequests);
};

/* ------------------------------------------------------------
   12. SEARCH & FILTER LOGIC
   ------------------------------------------------------------ */

/**
 * Applies the active search term and category/priority/department/status
 * filters, then triggers a dashboard refresh with the filtered subset.
 */
const applyFilters = () => {
    const searchTerm = document.getElementById("search-input").value.toLowerCase();
    const filterCategory = document.getElementById("filter-category").value;
    const filterPriority = document.getElementById("filter-priority").value;
    const filterDepartment = document.getElementById("filter-department").value;
    const filterStatus = document.getElementById("filter-status").value;

    const requests = getRequests();

    const filtered = requests.filter(r => {
        const matchesSearch = (
            r.name.toLowerCase().includes(searchTerm) ||
            r.description.toLowerCase().includes(searchTerm) ||
            r.branch.toLowerCase().includes(searchTerm) ||
            r.id.toLowerCase().includes(searchTerm) ||
            getReferenceNumber(r.id).toLowerCase().includes(searchTerm)
        );

        const matchesCategory = filterCategory === "all" || r.category === filterCategory;
        const matchesPriority = filterPriority === "all" || r.priority === filterPriority;
        const matchesDepartment = filterDepartment === "all" || r.department === filterDepartment;
        const matchesStatus = filterStatus === "all" || r.status === filterStatus;

        return matchesSearch && matchesCategory && matchesPriority && matchesDepartment && matchesStatus;
    });

    refreshDashboard(filtered);
};

/* ------------------------------------------------------------
   13. SECURITY — XSS SANITIZATION HELPER
   ------------------------------------------------------------ */

/**
 * Escapes arbitrary text before it is inserted into the DOM as HTML,
 * preventing basic cross-site scripting (XSS) injection.
 * @param {string} text - Raw, untrusted input text.
 * @returns {string} Escaped-safe string.
 */
const sanitizeInput = (text) => {
    const temp = document.createElement("div");
    temp.textContent = text;
    return temp.innerHTML;
};

/* ------------------------------------------------------------
   14. FORM VALIDATION & SUBMISSION HANDLER
   ------------------------------------------------------------ */

/**
 * Validates all fields of the banking request form, displaying
 * inline error messages for any invalid inputs.
 * @returns {boolean} True if the form passes all validation checks.
 */
const validateRequestForm = () => {
    const fields = {
        name: document.getElementById("name"),
        email: document.getElementById("email"),
        mobile: document.getElementById("mobile"),
        accountType: document.getElementById("accountType"),
        category: document.getElementById("category"),
        branch: document.getElementById("branch"),
        description: document.getElementById("description")
    };

    document.querySelectorAll(".error-msg").forEach(el => el.textContent = "");
    let isValid = true;

    if (!fields.name.value.trim()) {
        document.getElementById("name-error").textContent = "Customer name is required.";
        isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fields.email.value.trim())) {
        document.getElementById("email-error").textContent = "Provide a valid email address.";
        isValid = false;
    }

    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(fields.mobile.value.replace(/\D/g, ""))) {
        document.getElementById("mobile-error").textContent = "Enter a valid 10-digit mobile number.";
        isValid = false;
    }

    if (!fields.accountType.value) {
        document.getElementById("accountType-error").textContent = "Please select an account type.";
        isValid = false;
    }

    if (!fields.category.value) {
        document.getElementById("category-error").textContent = "Please select an issue category.";
        isValid = false;
    }

    if (!fields.branch.value.trim()) {
        document.getElementById("branch-error").textContent = "Branch name is required.";
        isValid = false;
    }

    if (fields.description.value.trim().length < 15) {
        document.getElementById("description-error").textContent = "Description must be at least 15 characters long.";
        isValid = false;
    }

    return isValid;
};

/**
 * Handles submission of the Banking Service Request form: validates
 * input, checks for duplicates, runs the simulated AI analysis with a
 * staged loading animation, then persists and renders the new request.
 * @param {Event} e - Form submit event.
 */
const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!validateRequestForm()) {
        showToast("Form validation failed. Please check the highlighted fields.", "error");
        return;
    }

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const mobileInput = document.getElementById("mobile");
    const accountTypeSelect = document.getElementById("accountType");
    const catSelect = document.getElementById("category");
    const branchInput = document.getElementById("branch");
    const descInput = document.getElementById("description");

    // Duplicate pending-request guard
    const allRequests = getRequests();
    const isDuplicate = allRequests.some(r =>
        r.category === catSelect.value &&
        r.branch.toLowerCase().trim() === branchInput.value.toLowerCase().trim() &&
        r.status === "Pending"
    );

    if (isDuplicate) {
        showToast("A pending duplicate request already exists for this category/branch.", "error");
        return;
    }

    showLoading("AI is analyzing your banking request...");

    // Simulated AI processing delay for a realistic pipeline feel
    setTimeout(() => {
        const sanitizedDesc = sanitizeInput(descInput.value);
        const { priority, department, resolutionTime } = runAIAnalysis(catSelect.value, sanitizedDesc);

        const newRequest = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            name: sanitizeInput(nameInput.value),
            email: sanitizeInput(emailInput.value),
            mobile: sanitizeInput(mobileInput.value),
            accountType: accountTypeSelect.value,
            category: catSelect.value,
            branch: sanitizeInput(branchInput.value),
            description: sanitizedDesc,
            priority,
            department,
            resolutionTime,
            status: "Pending",
            timestamp: new Date().toISOString()
        };

        allRequests.push(newRequest);
        saveRequests(allRequests);

        hideLoading();
        showToast(`Request submitted! AI routed it to ${department} with ${priority} priority.`, "success");

        document.getElementById("request-form").reset();
        document.getElementById("request-form-section").style.display = "none";

        refreshDashboard();
    }, 1400);
};

/* ------------------------------------------------------------
   15. EDIT MODAL LOGIC
   ------------------------------------------------------------ */

/**
 * Opens the admin edit modal and pre-fills it with the target request's
 * current data.
 * @param {string} id - Unique identifier of the request to edit.
 */
const openEditModal = (id) => {
    const list = getRequests();
    const req = list.find(r => r.id === id);
    if (!req) return;

    document.getElementById("edit-id").value = req.id;
    document.getElementById("edit-name").value = req.name;
    document.getElementById("edit-email").value = req.email;
    document.getElementById("edit-mobile").value = req.mobile || "";
    document.getElementById("edit-accountType").value = req.accountType || "Savings";
    document.getElementById("edit-category").value = req.category;
    document.getElementById("edit-branch").value = req.branch;
    document.getElementById("edit-description").value = req.description;
    document.getElementById("edit-status").value = req.status;

    document.getElementById("edit-modal").style.display = "flex";
};

/**
 * Persists edits made in the admin edit modal, re-running the AI
 * analysis so priority/department/resolution stay in sync with any
 * changes to category or description.
 * @param {Event} e - Form submit event.
 */
const handleEditFormSubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-id").value;
    const list = getRequests();
    const idx = list.findIndex(r => r.id === id);

    if (idx > -1) {
        list[idx].name = sanitizeInput(document.getElementById("edit-name").value);
        list[idx].email = sanitizeInput(document.getElementById("edit-email").value);
        list[idx].mobile = sanitizeInput(document.getElementById("edit-mobile").value);
        list[idx].accountType = document.getElementById("edit-accountType").value;
        list[idx].category = document.getElementById("edit-category").value;
        list[idx].branch = sanitizeInput(document.getElementById("edit-branch").value);
        list[idx].description = sanitizeInput(document.getElementById("edit-description").value);
        list[idx].status = document.getElementById("edit-status").value;

        // Re-run AI analysis so routing stays consistent with new details
        const updatedAI = runAIAnalysis(list[idx].category, list[idx].description);
        list[idx].priority = updatedAI.priority;
        list[idx].department = updatedAI.department;
        list[idx].resolutionTime = updatedAI.resolutionTime;

        saveRequests(list);
        refreshDashboard();
        document.getElementById("edit-modal").style.display = "none";
        showToast("Request updated & auto-reassigned by AI engine.", "success");
    }
};

/* ------------------------------------------------------------
   16. VOICE INPUT (Web Speech API) & TEXT-TO-SPEECH
   ------------------------------------------------------------ */

/**
 * Wires up voice dictation for the description textarea using the
 * Web Speech API, gracefully hiding the control if unsupported.
 */
const setupVoiceDictation = () => {
    const voiceBtn = document.getElementById("voice-input-btn");
    const descArea = document.getElementById("description");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceBtn.style.display = "none";
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    voiceBtn.addEventListener("click", () => {
        showToast("Voice mode active. Start speaking...", "info");
        voiceBtn.classList.add("active");
        voiceBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Listening...`;
        recognition.start();
    });

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        descArea.value += (descArea.value ? " " : "") + text;
        showToast("Speech dictation processed.", "success");
    };

    recognition.onerror = () => {
        showToast("Dictation failed. Try speaking louder.", "error");
    };

    recognition.onend = () => {
        voiceBtn.classList.remove("active");
        voiceBtn.innerHTML = `<i class="fas fa-microphone"></i> Dictate Text`;
    };
};

/* ------------------------------------------------------------
   17. EXPORT FEATURES — CSV & Single-Record
   ------------------------------------------------------------ */

/**
 * Exports the full banking request ledger as a downloadable CSV file.
 */
const exportToCSV = () => {
    const list = getRequests();
    if (list.length === 0) {
        showToast("No data available to export.", "error");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Reference,Name,Email,Mobile,AccountType,Category,Branch,Priority,Department,EstTime,Status,Timestamp\n";
    list.forEach(r => {
        const row = [
            getReferenceNumber(r.id),
            `"${r.name}"`,
            r.email,
            r.mobile || "",
            r.accountType || "",
            r.category,
            `"${r.branch}"`,
            r.priority,
            `"${r.department}"`,
            r.resolutionTime,
            r.status,
            r.timestamp
        ].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SmartBankAI_Requests_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV ledger exported successfully.", "success");
};

/**
 * Exports a single banking request as its own mini CSV file.
 * @param {string} id - Unique identifier of the request to export.
 */
const exportSingleRequest = (id) => {
    const list = getRequests();
    const req = list.find(r => r.id === id);
    if (!req) return;

    let csvContent = "data:text/csv;charset=utf-8,Reference,Name,Email,Mobile,AccountType,Category,Branch,Priority,Department,EstTime,Status,Timestamp\n";
    csvContent += [
        getReferenceNumber(req.id),
        `"${req.name}"`,
        req.email,
        req.mobile || "",
        req.accountType || "",
        req.category,
        `"${req.branch}"`,
        req.priority,
        `"${req.department}"`,
        req.resolutionTime,
        req.status,
        req.timestamp
    ].join(",");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${getReferenceNumber(req.id)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${getReferenceNumber(req.id)}.`, "success");
};

/* ------------------------------------------------------------
   18. UNDO-DELETE STACK
   ------------------------------------------------------------ */

/**
 * Restores the most recently deleted request from the undo buffer.
 */
const undoDelete = () => {
    if (lastDeletedRequest) {
        const list = getRequests();
        list.push(lastDeletedRequest);
        saveRequests(list);
        lastDeletedRequest = null;
        document.getElementById("undo-bar").classList.remove("show");
        if (undoTimeoutId) clearTimeout(undoTimeoutId);
        refreshDashboard();
        showToast("Deleted request recovered successfully.", "success");
    }
};

/* ------------------------------------------------------------
   19. APPLICATION BOOTSTRAP — DOMContentLoaded
   ------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", () => {

    /* --- Splash Screen Sequence --- */
    setTimeout(() => {
        const splash = document.getElementById("splash-screen");
        splash.style.opacity = "0";
        setTimeout(() => {
            splash.style.display = "none";
            animateDashboardCounters();
        }, 800);
    }, 2200);

    /* --- Initial Data Load --- */
    refreshDashboard();
    setupVoiceDictation();

    /* --- Banking Request Form --- */
    document.getElementById("request-form").addEventListener("submit", handleFormSubmit);

    const toggleRequestForm = (show) => {
        const formSec = document.getElementById("request-form-section");
        formSec.style.display = show ? "block" : "none";
        if (show) formSec.scrollIntoView({ behavior: "smooth" });
    };

    document.getElementById("toggle-form-btn").addEventListener("click", () => {
        const formSec = document.getElementById("request-form-section");
        toggleRequestForm(formSec.style.display === "none");
    });

    document.getElementById("cancel-form-btn").addEventListener("click", () => toggleRequestForm(false));
    document.getElementById("scroll-form-btn").addEventListener("click", () => toggleRequestForm(true));
    document.getElementById("floating-lodge-btn").addEventListener("click", () => toggleRequestForm(true));

    /* --- Branch Network Map Toggle --- */
    document.getElementById("toggle-map-btn").addEventListener("click", () => {
        const mapSec = document.getElementById("map-section");
        mapSec.style.display = mapSec.style.display === "none" ? "block" : "none";
        if (mapSec.style.display === "block") mapSec.scrollIntoView({ behavior: "smooth" });
    });

    /* --- Scroll to Dashboard --- */
    document.getElementById("scroll-stats-btn").addEventListener("click", () => {
        document.getElementById("dashboard-section").scrollIntoView({ behavior: "smooth" });
    });

    /* --- Export Actions --- */
    document.getElementById("export-pdf-btn").addEventListener("click", () => {
        showToast("Generating system Print preview / PDF...", "info");
        window.print();
    });
    document.getElementById("export-csv-btn").addEventListener("click", exportToCSV);

    /* --- Search & Filters --- */
    document.getElementById("search-input").addEventListener("input", applyFilters);
    document.getElementById("filter-category").addEventListener("change", applyFilters);
    document.getElementById("filter-priority").addEventListener("change", applyFilters);
    document.getElementById("filter-department").addEventListener("change", applyFilters);
    document.getElementById("filter-status").addEventListener("change", applyFilters);

    /* --- Edit Modal Controls --- */
    document.getElementById("close-modal-btn").addEventListener("click", () => {
        document.getElementById("edit-modal").style.display = "none";
    });
    document.getElementById("cancel-edit-btn").addEventListener("click", () => {
        document.getElementById("edit-modal").style.display = "none";
    });
    document.getElementById("edit-form").addEventListener("submit", handleEditFormSubmit);

    /* --- Undo Delete Trigger --- */
    document.getElementById("undo-btn").addEventListener("click", undoDelete);

    /* --- Clear All Data --- */
    document.getElementById("clear-all-data").addEventListener("click", () => {
        if (confirm("Are you sure you want to clear all banking request data? This action cannot be undone.")) {
            localStorage.removeItem(STORAGE_KEY);
            refreshDashboard([]);
            showToast("All banking records cleared.", "success");
        }
    });

    /* --- Delegated Card Actions (Resolve / Delete / Edit / Export) --- */
    document.getElementById("requests-container").addEventListener("click", (e) => {
        const target = e.target;

        // Resolve
        if (target.closest(".btn-resolve")) {
            const id = target.closest(".btn-resolve").dataset.id;
            const list = getRequests();
            const idx = list.findIndex(r => r.id === id);
            if (idx > -1) {
                list[idx].status = "Resolved";
                saveRequests(list);
                refreshDashboard();
                showToast("Request marked as Resolved.", "success");
            }
        }

        // Delete (with Undo support)
        if (target.closest(".btn-delete")) {
            const id = target.closest(".btn-delete").dataset.id;
            const list = getRequests();
            const idx = list.findIndex(r => r.id === id);
            if (idx > -1) {
                lastDeletedRequest = list[idx];
                list.splice(idx, 1);
                saveRequests(list);
                refreshDashboard();

                const undoBar = document.getElementById("undo-bar");
                undoBar.classList.add("show");

                if (undoTimeoutId) clearTimeout(undoTimeoutId);
                undoTimeoutId = setTimeout(() => {
                    undoBar.classList.remove("show");
                    lastDeletedRequest = null;
                }, 5000);
            }
        }

        // Edit
        if (target.closest(".btn-edit")) {
            const id = target.closest(".btn-edit").dataset.id;
            openEditModal(id);
        }

        // Export single record
        if (target.closest(".btn-export-one")) {
            const id = target.closest(".btn-export-one").dataset.id;
            exportSingleRequest(id);
        }
    });

    /* --- About Modal --- */
    const aboutModal = document.getElementById("about-modal");
    document.getElementById("about-btn").addEventListener("click", () => { aboutModal.style.display = "flex"; });
    document.getElementById("close-about-modal-btn").addEventListener("click", () => { aboutModal.style.display = "none"; });

    /* --- Dark / Light Mode Theme Toggle --- */
    const darkModeSwitch = document.getElementById("dark-mode-switch");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    if (localStorage.getItem("theme") === "dark" || (!localStorage.getItem("theme") && prefersDark.matches)) {
        document.body.classList.add("dark-mode");
        darkModeSwitch.checked = true;
    }

    darkModeSwitch.addEventListener("change", () => {
        if (darkModeSwitch.checked) {
            document.body.classList.add("dark-mode");
            localStorage.setItem("theme", "dark");
            showToast("Dark Mode enabled.", "success");
        } else {
            document.body.classList.remove("dark-mode");
            localStorage.setItem("theme", "light");
            showToast("Light Mode enabled.", "success");
        }
        // Re-render charts so labels/grid colors match the new theme
        refreshDashboard();
    });
});

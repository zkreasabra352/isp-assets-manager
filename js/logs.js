import {
    collection,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { auth, db } from "./firebase.js";

// DOM Elements
const logsTableBody = document.getElementById("logsTableBody");
const actionFilter = document.getElementById("actionFilter");
const sectionFilter = document.getElementById("sectionFilter");
const searchInput = document.getElementById("searchInput");
const logoutBtn = document.getElementById("logoutBtn");

let allLogs = [];

// Auth Init
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    if (document.getElementById("userEmail")) {
        document.getElementById("userEmail").textContent = user.email || "المستخدم";
    }
    if (document.getElementById("userAvatar")) {
        document.getElementById("userAvatar").textContent = user.email ? user.email.charAt(0).toUpperCase() : "U";
    }

    // 👈 استدعاء الجلب بعد تأكيد وجود المستخدم
    loadLogs();
});

// Fetch Realtime Logs
function loadLogs() {
    const logsRef = collection(db, "logs");
    
    onSnapshot(logsRef, snapshot => {
        allLogs = [];
        snapshot.forEach(doc => {
            allLogs.push({ id: doc.id, ...doc.data() });
        });

        // Sort latest first
        allLogs.sort((a, b) => getTimeValue(b.timestamp) - getTimeValue(a.timestamp));

        renderLogsTable();
    }, err => {
        console.error("Error loading logs:", err);
        logsTableBody.innerHTML = `<tr><td colspan="5" class="loading-state">تعذر تحميل سجل الحركات.</td></tr>`;
    });
}

function renderLogsTable() {
    if (!logsTableBody) return;

    const actionVal = actionFilter.value;
    const sectionVal = sectionFilter.value;
    const searchVal = searchInput.value.trim().toLowerCase();

    const filtered = allLogs.filter(log => {
        if (actionVal && log.action !== actionVal) return false;
        if (sectionVal && log.section !== sectionVal) return false;

        if (searchVal) {
            const text = [log.details, log.userEmail, log.targetName].join(" ").toLowerCase();
            if (!text.includes(searchVal)) return false;
        }

        return true;
    });

    logsTableBody.innerHTML = "";

    if (filtered.length === 0) {
        logsTableBody.innerHTML = `<tr><td colspan="5" class="loading-state">لا توجد سجلات مطابقة.</td></tr>`;
        return;
    }

    filtered.forEach(log => {
        const row = document.createElement("tr");
        
        row.innerHTML = `
            <td dir="ltr" style="text-align:right; font-size:11px; color:#94a3b8;">${formatDate(log.timestamp)}</td>
            <td>${getActionBadge(log.action)}</td>
            <td><span class="type-badge">${escapeHtml(log.section || "عام")}</span></td>
            <td><div class="log-details">${escapeHtml(log.details || "-")}</div></td>
            <td><div class="user-badge-cell">👤 ${escapeHtml(log.userEmail || "النظام")}</div></td>
        `;
        
        logsTableBody.appendChild(row);
    });
}

function getActionBadge(action) {
    if (action === "إضافة") return `<span class="badge-action action-add">➕ إضافة</span>`;
    if (action === "تعديل") return `<span class="badge-action action-edit">✏️ تعديل</span>`;
    if (action === "حذف") return `<span class="badge-action action-delete">🗑️ حذف</span>`;
    return `<span class="badge-action">${escapeHtml(action)}</span>`;
}

// Event Listeners
[actionFilter, sectionFilter].forEach(el => el.addEventListener("change", renderLogsTable));
if (searchInput) searchInput.addEventListener("input", renderLogsTable);

function getTimeValue(val) {
    if (!val) return 0;
    if (typeof val.toDate === "function") return val.toDate().getTime();
    if (typeof val === "string") return new Date(val).getTime() || 0;
    return 0;
}

function formatDate(val) {
    if (!val) return "-";
    let dateObj = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(dateObj)) return String(val);
    
    return dateObj.toLocaleString("ar-SY", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
}

function escapeHtml(val) {
    return String(val ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
}
import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { auth, db } from "./firebase.js";

// DOM Elements
const dataSource = document.getElementById("dataSource");
const typeFilter = document.getElementById("typeFilter");
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");

const reportsTableBody = document.getElementById("reportsTableBody");
const summaryCount = document.getElementById("summaryCount");
const summaryIps = document.getElementById("summaryIps");
const summaryTypes = document.getElementById("summaryTypes");

const printReportBtn = document.getElementById("printReportBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const logoutBtn = document.getElementById("logoutBtn");

let networkParts = [];
let customerParts = [];
let currentFilteredData = [];

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

    initDataLoad();
});

// Realtime Firestore Fetch
function initDataLoad() {
    onSnapshot(collection(db, "parts"), snap => {
        networkParts = snap.docs.map(doc => ({ id: doc.id, sourceType: "network", ...doc.data() }));
        processAndRender();
    });

    onSnapshot(collection(db, "customerParts"), snap => {
        customerParts = snap.docs.map(doc => ({ id: doc.id, sourceType: "customer", name: doc.data().customerName, ...doc.data() }));
        processAndRender();
    });
}

function processAndRender() {
    buildTypeFilterOptions();
    applyReportFilters();
}

function buildTypeFilterOptions() {
    const currentVal = typeFilter.value;
    const combined = [...networkParts, ...customerParts];
    const types = [...new Set(combined.map(item => item.type).filter(Boolean))].sort();

    typeFilter.innerHTML = `<option value="">كل الأنواع المتاحة</option>`;
    types.forEach(t => {
        typeFilter.innerHTML += `<option value="${t}">${t}</option>`;
    });
    typeFilter.value = currentVal;
}

function applyReportFilters() {
    let baseList = [];
    const source = dataSource.value;

    if (source === "all") baseList = [...networkParts, ...customerParts];
    else if (source === "network") baseList = [...networkParts];
    else if (source === "customer") baseList = [...customerParts];

    const selectedType = typeFilter.value;
    const fromTime = dateFrom.value ? new Date(dateFrom.value).getTime() : null;
    const toTime = dateTo.value ? new Date(dateTo.value + "T23:59:59").getTime() : null;

    currentFilteredData = baseList.filter(item => {
        if (selectedType && item.type !== selectedType) return false;

        const itemTimestamp = getTimeValue(item.createdAt || item.grantDate);
        if (fromTime && itemTimestamp < fromTime) return false;
        if (toTime && itemTimestamp > toTime) return false;

        return true;
    });

    renderReportTable();
    updateSummaryStats();
}

function renderReportTable() {
    if (!reportsTableBody) return;

    reportsTableBody.innerHTML = "";

    if (currentFilteredData.length === 0) {
        reportsTableBody.innerHTML = `<tr><td colspan="7" class="loading-state">لا توجد أصول مطابقة لمعايير الفلترة المحددة.</td></tr>`;
        return;
    }

    currentFilteredData.forEach((item, index) => {
        const row = document.createElement("tr");
        const isCustomer = item.sourceType === "customer";
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(item.name || item.customerName || "-")}</strong></td>
            <td>${escapeHtml(item.type || "-")}</td>
            <td>
                <span class="badge-source ${isCustomer ? 'badge-customer' : 'badge-network'}">
                    ${isCustomer ? 'زبون' : 'شبكة'}
                </span>
            </td>
            <td dir="ltr" style="text-align:right; font-family:monospace;">${escapeHtml(item.ip || "-")}</td>
            <td dir="ltr" style="text-align:right; font-family:monospace;">${escapeHtml(item.mac || "-")}</td>
            <td>${escapeHtml(item.server || item.grantDate || "-")}</td>
        `;
        reportsTableBody.appendChild(row);
    });
}

function updateSummaryStats() {
    if (summaryCount) summaryCount.textContent = currentFilteredData.length;

    const ips = new Set(currentFilteredData.map(i => i.ip).filter(Boolean));
    if (summaryIps) summaryIps.textContent = ips.size;

    const types = new Set(currentFilteredData.map(i => i.type).filter(Boolean));
    if (summaryTypes) summaryTypes.textContent = types.size;
}

// Event Listeners
[dataSource, typeFilter, dateFrom, dateTo].forEach(el => {
    if (el) el.addEventListener("change", applyReportFilters);
});

if (printReportBtn) {
    printReportBtn.addEventListener("click", () => {
        document.getElementById("printDate").textContent = `تاريخ الاستخراج: ${new Date().toLocaleDateString("ar-SY")}`;
        window.print();
    });
}

if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
        if (!currentFilteredData.length) return;

        let csvData = "\uFEFFالرقم,الاسم/الزبون,النوع,المصدر,IP,MAC,السيرفر/تاريخ المنح\n";
        currentFilteredData.forEach((item, index) => {
            csvData += `"${index + 1}","${item.name || item.customerName || ''}","${item.type || ''}","${item.sourceType === 'customer' ? 'زبون' : 'شبكة'}","${item.ip || ''}","${item.mac || ''}","${item.server || item.grantDate || ''}"\n`;
        });

        const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `تقرير_أصول_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function getTimeValue(val) {
    if (!val) return 0;
    if (typeof val.toDate === "function") return val.toDate().getTime();
    if (typeof val === "string") return new Date(val).getTime() || 0;
    return 0;
}

function escapeHtml(val) {
    return String(val ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
}
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
    const currentVal = typeFilter ? typeFilter.value : "";
    const combined = [...networkParts, ...customerParts];
    const types = [...new Set(combined.map(item => item.type).filter(Boolean))].sort();

    if (typeFilter) {
        typeFilter.innerHTML = `<option value="">كل الأنواع المتاحة</option>`;
        types.forEach(t => {
            typeFilter.innerHTML += `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`;
        });
        typeFilter.value = currentVal;
    }
}

function applyReportFilters() {
    let baseList = [];
    const source = dataSource ? dataSource.value : "all";

    if (source === "all") baseList = [...networkParts, ...customerParts];
    else if (source === "network") baseList = [...networkParts];
    else if (source === "customer") baseList = [...customerParts];

    const selectedType = typeFilter ? typeFilter.value : "";
    const fromTime = dateFrom && dateFrom.value ? new Date(dateFrom.value).getTime() : null;
    const toTime = dateTo && dateTo.value ? new Date(dateTo.value + "T23:59:59").getTime() : null;

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
        reportsTableBody.innerHTML = `<tr><td colspan="6" class="loading-state">لا توجد أصول مطابقة لمعايير الفلترة المحددة.</td></tr>`;
        return;
    }

    currentFilteredData.forEach((item, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td style="text-align:center;">${index + 1}</td>
            <td><strong>${escapeHtml(item.name || item.customerName || "-")}</strong></td>
            <td>${escapeHtml(item.type || "-")}</td>
            <td dir="ltr" class="ip-column" style="text-align:center; font-family:monospace;">${escapeHtml(item.ip || "-")}</td>
            <td dir="ltr" class="mac-column" style="text-align:center; font-family:monospace; font-weight:bold;">${escapeHtml(item.mac || "-")}</td>
            <td style="text-align:center;">${escapeHtml(item.server || item.grantDate || "-")}</td>
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

// Print Logic
if (printReportBtn) {
    printReportBtn.addEventListener("click", () => {
        const printDateElem = document.getElementById("printDate");
        if (printDateElem) {
            const now = new Date();
            const dateStr = now.toLocaleDateString("ar-SY", { year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = now.toLocaleTimeString("ar-SY", { hour: '2-digit', minute: '2-digit' });
            printDateElem.textContent = `تاريخ الاستخراج: ${dateStr} - الساعة: ${timeStr}`;
        }
        window.print();
    });
}

// HIGH-QUALITY PROFESSIONAL EXCEL GENERATOR (SpreadsheetML)
if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
        if (!currentFilteredData.length) return;

        let rowsHtml = "";
        currentFilteredData.forEach((item, index) => {
            rowsHtml += `
                <tr>
                    <td style="text-align:center;">${index + 1}</td>
                    <td style="text-align:right; font-weight:bold;">${escapeHtml(item.name || item.customerName || '-')}</td>
                    <td style="text-align:center;">${escapeHtml(item.type || '-')}</td>
                    <td style="text-align:center; font-family:Consolas, monospace;">${escapeHtml(item.ip || '-')}</td>
                    <td style="text-align:center; font-family:Consolas, monospace; font-weight:bold;">${escapeHtml(item.mac || '-')}</td>
                    <td style="text-align:center;">${escapeHtml(item.server || item.grantDate || '-')}</td>
                </tr>`;
        });

        const excelDocument = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>تقرير الأصول</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayRightToLeft/>
                                    <x:Print>
                                        <x:ValidPrinterInfo/>
                                    </x:Print>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    table { border-collapse: collapse; width: 100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                    th { background-color: #1e293b; color: #ffffff; border: 1px solid #0f172a; padding: 10px; font-size: 13px; text-align: center; }
                    td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; color: #000000; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                </style>
            </head>
            <body>
                <h2>تقرير أصول الشبكة - ISP Assets Manager</h2>
                <p>تاريخ التصدير: ${new Date().toLocaleDateString('ar-SY')}</p>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th style="width: 220px;">الاسم / الزبون</th>
                            <th style="width: 140px;">نوع القطعة</th>
                            <th style="width: 140px;">عنوان IP</th>
                            <th style="width: 170px;">عنوان MAC</th>
                            <th style="width: 150px;">السيرفر / التاريخ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
            </html>`;

        const blob = new Blob([excelDocument], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const link = document.createElement("a");
        const dateStr = new Date().toISOString().slice(0, 10);

        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `تقرير_أصول_شبكة_${dateStr}.xls`);
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
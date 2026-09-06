import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { auth, db } from "./firebase.js";

// ========================================
// عناصر الصفحة
// ========================================

const totalPartsElement =
    document.getElementById("totalParts");

const totalCustomerPartsElement =
    document.getElementById("totalCustomerParts");

const totalIpsElement =
    document.getElementById("totalIps");

const totalTypesElement =
    document.getElementById("totalTypes");

const recentPartsTable =
    document.getElementById("recentPartsTable");

const userEmailElement =
    document.getElementById("userEmail");

const userAvatarElement =
    document.getElementById("userAvatar");

const logoutButton =
    document.getElementById("logoutButton");

let networkParts = [];
let customerParts = [];

// ========================================
// حماية الصفحة وتحديد المستخدم
// ========================================

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    if (userEmailElement) {
        userEmailElement.textContent = user.email || "المستخدم";
    }

    if (userAvatarElement && user.email) {
        userAvatarElement.textContent = user.email.charAt(0).toUpperCase();
    }

    // الاستماع التلقائي اللحظي
    initRealtimeDashboard();

});

// ========================================
// تحميل Dashboard بأسلوب Realtime
// ========================================

function initRealtimeDashboard() {

    const partsRef = collection(db, "parts");
    const customerPartsRef = collection(db, "customerParts");

    // 1. قطع الشبكة
    onSnapshot(partsRef, (snapshot) => {
        networkParts = [];
        snapshot.forEach((doc) => {
            networkParts.push({ id: doc.id, ...doc.data() });
        });
        updateDashboardData();
    }, (err) => {
        console.error("Error fetching network parts:", err);
    });

    // 2. قطع الزبائن
    onSnapshot(customerPartsRef, (snapshot) => {
        customerParts = [];
        snapshot.forEach((doc) => {
            customerParts.push({ id: doc.id, ...doc.data() });
        });
        updateDashboardData();
    }, (err) => {
        console.error("Error fetching customer parts:", err);
    });

}

// ========================================
// تحديث الحسابات واللوحة
// ========================================

function updateDashboardData() {

    // حساب إجمالي القطع
    if (totalPartsElement) {
        totalPartsElement.textContent = networkParts.length;
    }

    if (totalCustomerPartsElement) {
        totalCustomerPartsElement.textContent = customerParts.length;
    }

    // حساب الـ IPs الفريدة من المجموعتين
    const allIps = new Set();
    networkParts.forEach(p => { if (p.ip && p.ip.trim()) allIps.add(p.ip.trim()); });
    customerParts.forEach(p => { if (p.ip && p.ip.trim()) allIps.add(p.ip.trim()); });

    if (totalIpsElement) {
        totalIpsElement.textContent = allIps.size;
    }

    // حساب الأنواع الفريدة من المجموعتين
    const allTypes = new Set();
    networkParts.forEach(p => { if (p.type && p.type.trim()) allTypes.add(p.type.trim()); });
    customerParts.forEach(p => { if (p.type && p.type.trim()) allTypes.add(p.type.trim()); });

    if (totalTypesElement) {
        totalTypesElement.textContent = allTypes.size;
    }

    // عرض أحدث القطع المضافة في الجدول
    renderRecentParts(networkParts);

}

// ========================================
// عرض أحدث القطع
// ========================================

function renderRecentParts(parts) {

    if (!recentPartsTable) return;

    if (!parts.length) {
        recentPartsTable.innerHTML = `
            <tr>
                <td colspan="5" class="loading-cell">
                    لا توجد قطع مضافة حتى الآن.
                </td>
            </tr>
        `;
        return;
    }

    // ترتيب السجلات الأحدث أولاً
    const sortedParts = [...parts].sort((a, b) => {
        return getDateValue(b.createdAt) - getDateValue(a.createdAt);
    });

    const recentParts = sortedParts.slice(0, 5);

    recentPartsTable.innerHTML = "";

    recentParts.forEach((part) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>
                    ${escapeHtml(part.name || "-")}
                </strong>
            </td>
            <td>
                ${escapeHtml(part.type || "-")}
            </td>
            <td>
                ${escapeHtml(part.ip || "-")}
            </td>
            <td>
                ${escapeHtml(part.server || "-")}
            </td>
            <td>
                ${formatDate(part.createdAt)}
            </td>
        `;

        recentPartsTable.appendChild(row);
    });

}

// ========================================
// دوال مساعدة للتاريخ والحماية
// ========================================

function getDateValue(value) {
    if (!value) return 0;
    if (typeof value.toDate === "function") return value.toDate().getTime();
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

function formatDate(value) {
    if (!value) return "-";
    if (value?.toDate) {
        return value.toDate().toLocaleDateString("ar-SY");
    }
    if (typeof value === "string") {
        return value;
    }
    return "-";
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

// ========================================
// تسجيل الخروج
// ========================================

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            console.error("خطأ في تسجيل الخروج:", error);
        }
    });
}
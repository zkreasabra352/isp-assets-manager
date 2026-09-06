import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { auth, db } from "./firebase.js";

// =========================================================
// VARIABLES
// =========================================================

const customerPartsCollection =
    collection(db, "customerParts");

let allCustomerParts = [];
let selectedIds = new Set();
let currentAuthEmail = "مستخدم";
let editingId = null;
let deleteIds = [];

// =========================================================
// ELEMENTS
// =========================================================

const tableBody =
    document.getElementById("customerPartsTableBody");

const loadingState =
    document.getElementById("loadingState");

const emptyState =
    document.getElementById("emptyState");

const searchInput =
    document.getElementById("searchInput");

const typeFilter =
    document.getElementById("typeFilter");

const dateFilter =
    document.getElementById("dateFilter");

const headerSelectAll =
    document.getElementById("headerSelectAll");

const selectionBar =
    document.getElementById("selectionBar");

const selectedCount =
    document.getElementById("selectedCount");

const editBtn =
    document.getElementById("editBtn");

const deleteBtn =
    document.getElementById("deleteBtn");

const clearSelectionBtn =
    document.getElementById("clearSelectionBtn");

const addCustomerPartBtn =
    document.getElementById("addCustomerPartBtn");

const emptyAddBtn =
    document.getElementById("emptyAddBtn");

const modal =
    document.getElementById("customerPartModal");

const modalTitle =
    document.getElementById("modalTitle");

const closeModalBtn =
    document.getElementById("closeModalBtn");

const cancelModalBtn =
    document.getElementById("cancelModalBtn");

const form =
    document.getElementById("customerPartForm");

const customerName =
    document.getElementById("customerName");

const customerPartType =
    document.getElementById("customerPartType");

const customerPartIp =
    document.getElementById("customerPartIp");

const customerPartMac =
    document.getElementById("customerPartMac");

const grantDate =
    document.getElementById("grantDate");

const customerPartNote =
    document.getElementById("customerPartNote");

const saveCustomerPartBtn =
    document.getElementById("saveCustomerPartBtn");

const deleteModal =
    document.getElementById("deleteModal");

const deleteMessage =
    document.getElementById("deleteMessage");

const cancelDeleteBtn =
    document.getElementById("cancelDeleteBtn");

const confirmDeleteBtn =
    document.getElementById("confirmDeleteBtn");

const toast =
    document.getElementById("toast");

const toastIcon =
    document.getElementById("toastIcon");

const toastMessage =
    document.getElementById("toastMessage");

const logoutBtn =
    document.getElementById("logoutBtn");

const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");

const sidebar =
    document.getElementById("sidebar");

const userEmail =
    document.getElementById("userEmail");

const userInitial =
    document.getElementById("userInitial");

// =========================================================
// AUTHENTICATION
// =========================================================

onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentAuthEmail = user.email || "مستخدم"; // 👈 حفظ البريد هنا

    if (userEmail) userEmail.textContent = currentAuthEmail;
    if (userInitial) userInitial.textContent = getInitial(currentAuthEmail);

    loadCustomerParts();
});
async function logActivity(action, details) {
    try {
        await addDoc(collection(db, "logs"), {
            userEmail: currentAuthEmail, // 👈 استخدام المتغير النصي
            action: action,              // "إضافة" | "تعديل" | "حذف"
            section: "قطع الزبائن",
            details: details,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Logger Error:", e);
    }
}
// =========================================================
// LOAD DATA - REALTIME
// =========================================================

function loadCustomerParts() {

    loadingState.classList.remove("hidden");

    emptyState.classList.add("hidden");

    onSnapshot(

        customerPartsCollection,

        snapshot => {

            allCustomerParts = [];

            snapshot.forEach(docSnap => {

                allCustomerParts.push({

                    id: docSnap.id,

                    ...docSnap.data()

                });

            });

            loadingState.classList.add("hidden");

            buildTypeFilter();

            updateStats();

            renderCustomerParts();

        },

        error => {

            console.error(
                "Firestore Error:",
                error
            );

            loadingState.classList.add("hidden");

            showToast(
                "حدث خطأ أثناء تحميل البيانات",
                "error"
            );

        }

    );

}

// =========================================================
// RENDER
// =========================================================

function renderCustomerParts() {

    const filtered =
        getFilteredParts();

    tableBody.innerHTML = "";

    if (filtered.length === 0) {

        emptyState.classList.remove("hidden");

        updateSelectionUI();

        return;

    }

    emptyState.classList.add("hidden");

    filtered.forEach(part => {

        const row =
            document.createElement("tr");

        const isSelected =
            selectedIds.has(part.id);

        if (isSelected) {

            row.classList.add("selected");

        }

        row.innerHTML = `

            <td class="checkbox-column">

                <input
                    type="checkbox"
                    class="row-checkbox"
                    data-id="${escapeAttribute(part.id)}"
                    ${isSelected ? "checked" : ""}>

            </td>

            <td>

                <span class="customer-name">

                    ${escapeHtml(
                        part.customerName || "-"
                    )}

                </span>

            </td>

            <td>

                <span class="type-badge">

                    ${escapeHtml(
                        part.type || "-"
                    )}

                </span>

            </td>

            <td>

                <span class="ip-value">

                    ${escapeHtml(
                        part.ip || "-"
                    )}

                </span>

            </td>

            <td>

                <span class="mac-value">

                    ${escapeHtml(
                        part.mac || "-"
                    )}

                </span>

            </td>

            <td>

                <span class="date-value">

                    ${formatGrantDate(
                        part.grantDate
                    )}

                </span>

            </td>

            <td>

                <span class="date-value">

                    ${formatCreatedAt(
                        part.createdAt
                    )}

                </span>

            </td>

            <td>

                <span
                    class="note-value"
                    title="${escapeAttribute(
                        part.note || ""
                    )}">

                    ${escapeHtml(
                        part.note || "-"
                    )}

                </span>

            </td>

        `;

        tableBody.appendChild(row);

    });

    updateSelectionUI();

}

// =========================================================
// FILTERING
// =========================================================

function getFilteredParts() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    const selectedType =
        typeFilter.value;

    const selectedDate =
        dateFilter.value;

    return allCustomerParts

        .filter(part => {

            if (!search) {

                return true;

            }

            const text = [

                part.customerName,

                part.type,

                part.ip,

                part.mac,

                part.note

            ]

                .filter(Boolean)

                .join(" ")

                .toLowerCase();

            return text.includes(search);

        })

        .filter(part => {

            if (!selectedType) {

                return true;

            }

            return part.type === selectedType;

        })

        .filter(part => {

            if (!selectedDate) {

                return true;

            }

            return matchesDateFilter(
                part.createdAt,
                selectedDate
            );

        })

        .sort((a, b) => {

            return getDateValue(b.createdAt)
                - getDateValue(a.createdAt);

        });

}

// =========================================================
// TYPE FILTER
// =========================================================

function buildTypeFilter() {

    const currentValue =
        typeFilter.value;

    const types =
        [...new Set(

            allCustomerParts

                .map(part => part.type)

                .filter(Boolean)

        )]

        .sort();

    typeFilter.innerHTML = `

        <option value="">
            جميع الأنواع
        </option>

    `;

    types.forEach(type => {

        const option =
            document.createElement("option");

        option.value =
            type;

        option.textContent =
            type;

        typeFilter.appendChild(option);

    });

    if (types.includes(currentValue)) {

        typeFilter.value =
            currentValue;

    }

}

// =========================================================
// STATS
// =========================================================

function updateStats() {

    document.getElementById(
        "totalCustomerParts"
    ).textContent =
        allCustomerParts.length;

    const customers =
        new Set(

            allCustomerParts

                .map(part => part.customerName)

                .filter(Boolean)

        );

    document.getElementById(
        "totalCustomers"
    ).textContent =
        customers.size;

    const ips =
        new Set(

            allCustomerParts

                .map(part => part.ip)

                .filter(Boolean)

        );

    document.getElementById(
        "totalCustomerIps"
    ).textContent =
        ips.size;

    const types =
        new Set(

            allCustomerParts

                .map(part => part.type)

                .filter(Boolean)

        );

    document.getElementById(
        "totalCustomerTypes"
    ).textContent =
        types.size;

}

// =========================================================
// SEARCH & FILTERS
// =========================================================

searchInput.addEventListener(
    "input",
    () => {

        renderCustomerParts();

    }
);

typeFilter.addEventListener(
    "change",
    () => {

        renderCustomerParts();

    }
);

dateFilter.addEventListener(
    "change",
    () => {

        renderCustomerParts();

    }
);

// =========================================================
// TABLE CHECKBOX
// =========================================================

tableBody.addEventListener(
    "change",
    event => {

        if (
            !event.target.classList.contains(
                "row-checkbox"
            )
        ) {

            return;

        }

        const id =
            event.target.dataset.id;

        if (event.target.checked) {

            selectedIds.add(id);

        } else {

            selectedIds.delete(id);

        }

        renderCustomerParts();

    }
);

// =========================================================
// SELECT ALL
// =========================================================

headerSelectAll.addEventListener(
    "change",
    () => {

        const filtered =
            getFilteredParts();

        if (headerSelectAll.checked) {

            filtered.forEach(part => {

                selectedIds.add(part.id);

            });

        } else {

            filtered.forEach(part => {

                selectedIds.delete(part.id);

            });

        }

        renderCustomerParts();

    }
);

// =========================================================
// SELECTION UI
// =========================================================

function updateSelectionUI() {

    const count =
        selectedIds.size;

    selectedCount.textContent =
        count;

    selectionBar.classList.toggle(
        "hidden",
        count === 0
    );

    editBtn.disabled =
        count !== 1;

    deleteBtn.disabled =
        count === 0;

    const filtered =
        getFilteredParts();

    headerSelectAll.checked =
        filtered.length > 0 &&
        filtered.every(part =>
            selectedIds.has(part.id)
        );

}

// =========================================================
// CLEAR SELECTION
// =========================================================

clearSelectionBtn.addEventListener(
    "click",
    clearSelection
);

function clearSelection() {

    selectedIds.clear();

    renderCustomerParts();

}

// =========================================================
// ADD
// =========================================================

if (addCustomerPartBtn) {
    addCustomerPartBtn.addEventListener(
        "click",
        openAddModal
    );
}

if (emptyAddBtn) {
    emptyAddBtn.addEventListener(
        "click",
        openAddModal
    );
}

function openAddModal() {

    editingId = null;

    modalTitle.textContent =
        "إضافة قطعة للزبون";

    saveCustomerPartBtn.textContent =
        "حفظ القطعة";

    form.reset();

    setTodayDate();

    modal.classList.add("show");

    customerName.focus();

}

// =========================================================
// EDIT
// =========================================================

editBtn.addEventListener(
    "click",
    openEditModal
);

function openEditModal() {

    if (selectedIds.size !== 1) {

        return;

    }

    const id =
        [...selectedIds][0];

    const part =
        allCustomerParts.find(
            item => item.id === id
        );

    if (!part) {

        return;

    }

    editingId = id;

    modalTitle.textContent =
        "تعديل قطعة الزبون";

    saveCustomerPartBtn.textContent =
        "حفظ التعديلات";

    customerName.value =
        part.customerName || "";

    customerPartType.value =
        part.type || "";

    customerPartIp.value =
        part.ip || "";

    customerPartMac.value =
        part.mac || "";

    grantDate.value =
        convertGrantDateToInput(
            part.grantDate
        );

    customerPartNote.value =
        part.note || "";

    modal.classList.add("show");

    customerName.focus();

}

// =========================================================
// DUPLICATE VALIDATION
// =========================================================

function normalizeValue(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase();

}

function findDuplicateCustomerPart(data) {

    const customerNameValue =
        normalizeValue(data.customerName);

    const ipValue =
        normalizeValue(data.ip);

    const macValue =
        normalizeValue(data.mac);

    for (const part of allCustomerParts) {

        if (editingId && part.id === editingId) {
            continue;
        }

        const existingName = normalizeValue(part.customerName);
        const existingIp = normalizeValue(part.ip);
        const existingMac = normalizeValue(part.mac);

        if (customerNameValue && existingName === customerNameValue) {
            return {
                type: "name",
                value: part.customerName
            };
        }

        if (ipValue && existingIp === ipValue) {
            return {
                type: "ip",
                value: part.ip
            };
        }

        if (macValue && existingMac && existingMac === macValue) {
            return {
                type: "mac",
                value: part.mac
            };
        }
    }

    return null;

}

// =========================================================
// SAVE (WITH LOGS INTEGRATION)
// =========================================================

if (form) {
    form.addEventListener("submit", async event => {
        event.preventDefault();

        const data = {
            customerName: customerName.value.trim(),
            type: customerPartType.value,
            ip: customerPartIp.value.trim(),
            mac: customerPartMac.value.trim(),
            grantDate: grantDate.value,
            note: customerPartNote.value.trim()
        };

        if (!data.customerName) {
            showToast("يرجى إدخال اسم الزبون", "error");
            customerName.focus();
            return;
        }

        if (!data.type) {
            showToast("يرجى اختيار نوع القطعة", "error");
            customerPartType.focus();
            return;
        }

        if (!data.ip) {
            showToast("يرجى إدخال عنوان IP", "error");
            customerPartIp.focus();
            return;
        }

        if (!data.grantDate) {
            showToast("يرجى تحديد تاريخ المنح", "error");
            grantDate.focus();
            return;
        }

        const duplicate = findDuplicateCustomerPart(data);

        if (duplicate) {
            if (duplicate.type === "name") {
                showToast(`اسم الزبون "${duplicate.value}" موجود مسبقًا`, "error");
                customerName.focus();
            } else if (duplicate.type === "ip") {
                showToast(`عنوان IP "${duplicate.value}" مستخدم مسبقًا`, "error");
                customerPartIp.focus();
            } else if (duplicate.type === "mac") {
                showToast(`عنوان MAC "${duplicate.value}" مستخدم مسبقًا`, "error");
                customerPartMac.focus();
            }
            return;
        }

        saveCustomerPartBtn.disabled = true;
        saveCustomerPartBtn.textContent = "جاري الحفظ...";

        try {
            if (editingId) {
                const partRef = doc(db, "customerParts", editingId);
                await updateDoc(partRef, data);

                // 🔹 تسجيل حركة التعديل تلقائياً
                await logActivity("تعديل", `تم تعديل قطعة للزبون: ${data.customerName} - النوع: ${data.type}`);

                showToast("تم تعديل القطعة بنجاح", "success");
            } else {
                await addDoc(customerPartsCollection, {
                    ...data,
                    createdAt: serverTimestamp()
                });

                // 🔹 تسجيل حركة الإضافة تلقائياً
                await logActivity("إضافة", `تم منح قطعة جديدة للزبون: ${data.customerName} - IP: ${data.ip}`);

                showToast("تمت إضافة القطعة بنجاح", "success");
            }

            closeModal();
            selectedIds.clear();

        } catch (error) {
            console.error("Save Error:", error);
            showToast("تعذر حفظ البيانات", "error");
        } finally {
            saveCustomerPartBtn.disabled = false;
            saveCustomerPartBtn.textContent = editingId ? "حفظ التعديلات" : "حفظ القطعة";
        }
    });
}

// =========================================================
// CLOSE MODAL
// =========================================================

closeModalBtn.addEventListener(
    "click",
    closeModal
);

cancelModalBtn.addEventListener(
    "click",
    closeModal
);

modal.addEventListener(
    "click",
    event => {

        if (event.target === modal) {

            closeModal();

        }

    }
);

function closeModal() {

    modal.classList.remove("show");

    form.reset();

    editingId = null;

}

// =========================================================
// DELETE
// =========================================================

deleteBtn.addEventListener(
    "click",
    openDeleteModal
);

function openDeleteModal() {

    if (selectedIds.size === 0) {

        return;

    }

    deleteIds =
        [...selectedIds];

    if (deleteIds.length === 1) {

        deleteMessage.textContent =
            "هل أنت متأكد من حذف قطعة الزبون المحددة؟";

    } else {

        deleteMessage.textContent =
            `هل أنت متأكد من حذف ${deleteIds.length} قطع من قطع الزبائن؟`;

    }

    deleteModal.classList.add("show");

}

// =========================================================
// CONFIRM DELETE (WITH LOGS INTEGRATION)
// =========================================================

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
        if (deleteIds.length === 0) return;

        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = "جاري الحذف...";

        try {
            const batch = writeBatch(db);
            const deletedNames = [];

            deleteIds.forEach(id => {
                const item = allCustomerParts.find(p => p.id === id);
                if (item) deletedNames.push(item.customerName || id);

                const ref = doc(db, "customerParts", id);
                batch.delete(ref);
            });

            await batch.commit();

            // 🔹 تسجيل حركة الحذف تلقائياً
            await logActivity("حذف", `تم حذف ${deleteIds.length} قطعة زبون: (${deletedNames.join(", ")})`);

            showToast(
                deleteIds.length === 1
                    ? "تم حذف القطعة بنجاح"
                    : `تم حذف ${deleteIds.length} قطع بنجاح`,
                "success"
            );

            selectedIds.clear();
            closeDeleteModal();

        } catch (error) {
            console.error("Delete Error:", error);
            showToast("تعذر حذف البيانات", "error");
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = "حذف";
        }
    });
}

// =========================================================
// CLOSE DELETE MODAL
// =========================================================

cancelDeleteBtn.addEventListener(
    "click",
    closeDeleteModal
);

deleteModal.addEventListener(
    "click",
    event => {

        if (event.target === deleteModal) {

            closeDeleteModal();

        }

    }
);

function closeDeleteModal() {

    deleteModal.classList.remove("show");

    deleteIds = [];

}

// =========================================================
// TODAY
// =========================================================

function setTodayDate() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            today.getDate()
        ).padStart(2, "0");

    grantDate.value =
        `${year}-${month}-${day}`;

}

// =========================================================
// DATE FORMAT
// =========================================================

function formatGrantDate(value) {

    if (!value) {

        return "-";

    }

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {

        const parts =
            value.split("-");

        return `${parts[2]}/${parts[1]}/${parts[0]}`;

    }

    return String(value);

}

function convertGrantDateToInput(value) {

    if (!value) {

        return "";

    }

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {

        return value;

    }

    return "";

}

// =========================================================
// CREATED AT
// =========================================================

function formatCreatedAt(value) {

    if (!value) {

        return "جاري التسجيل...";

    }

    if (
        value &&
        typeof value.toDate === "function"
    ) {

        return value
            .toDate()
            .toLocaleDateString(
                "ar-SY",
                {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }
            );

    }

    if (typeof value === "string") {

        return value;

    }

    return "-";

}

// =========================================================
// DATE VALUE
// =========================================================

function getDateValue(value) {

    if (!value) {

        return 0;

    }

    if (
        value &&
        typeof value.toDate === "function"
    ) {

        return value
            .toDate()
            .getTime();

    }

    if (typeof value === "string") {

        const date =
            new Date(value);

        if (!isNaN(date.getTime())) {

            return date.getTime();

        }

    }

    return 0;

}

// =========================================================
// DATE FILTER
// =========================================================

function matchesDateFilter(
    value,
    filter
) {

    const timestamp =
        getDateValue(value);

    if (!timestamp) {

        return false;

    }

    const date =
        new Date(timestamp);

    const now =
        new Date();

    if (filter === "today") {

        return (

            date.getFullYear() ===
                now.getFullYear()

            &&

            date.getMonth() ===
                now.getMonth()

            &&

            date.getDate() ===
                now.getDate()

        );

    }

    if (filter === "week") {

        const weekAgo =
            new Date(now);

        weekAgo.setDate(
            now.getDate() - 7
        );

        return date >= weekAgo;

    }

    if (filter === "month") {

        return (

            date.getFullYear() ===
                now.getFullYear()

            &&

            date.getMonth() ===
                now.getMonth()

        );

    }

    return true;

}

// =========================================================
// INITIAL
// =========================================================

function getInitial(email) {

    if (!email) {

        return "U";

    }

    return email
        .charAt(0)
        .toUpperCase();

}

// =========================================================
// HTML SECURITY
// =========================================================

function escapeHtml(value) {

    return String(value ?? "")

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}

function escapeAttribute(value) {

    return escapeHtml(value);

}

// =========================================================
// TOAST
// =========================================================

let toastTimer;

function showToast(
    message,
    type = "success"
) {

    toastMessage.textContent =
        message;

    if (type === "error") {

        toastIcon.textContent =
            "×";

    } else {

        toastIcon.textContent =
            "✓";

    }

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toastTimer
    );

    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}

// =========================================================
// LOGOUT
// =========================================================

logoutBtn.addEventListener(
    "click",
    async () => {

        try {

            await signOut(auth);

            window.location.href =
                "index.html";

        } catch (error) {

            console.error(
                "Logout Error:",
                error
            );

        }

    }
);

// =========================================================
// MOBILE SIDEBAR
// =========================================================

mobileMenuBtn.addEventListener(
    "click",
    () => {

        sidebar.classList.toggle(
            "open"
        );

    }
);

// =========================================================
// ESC KEY
// =========================================================

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {

            return;

        }

        if (
            modal.classList.contains(
                "show"
            )
        ) {

            closeModal();

        }

        if (
            deleteModal.classList.contains(
                "show"
            )
        ) {

            closeDeleteModal();

        }

    }
);
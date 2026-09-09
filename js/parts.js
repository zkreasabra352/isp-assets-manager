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

import {
    auth,
    db
} from "./firebase.js";


/* =========================================
   ELEMENTS
========================================= */

const partsTableBody =
    document.getElementById("partsTableBody");

const totalParts =
    document.getElementById("totalParts");

const selectedParts =
    document.getElementById("selectedParts");

const totalTypes =
    document.getElementById("totalTypes");

const totalServers =
    document.getElementById("totalServers");

const resultsCount =
    document.getElementById("resultsCount");

const selectionText =
    document.getElementById("selectionText");

const searchInput =
    document.getElementById("searchInput");

const typeFilter =
    document.getElementById("typeFilter");

const serverFilter =
    document.getElementById("serverFilter");

const selectAll =
    document.getElementById("selectAll");

const headerSelectAll =
    document.getElementById("headerSelectAll");

const editBtn =
    document.getElementById("editBtn");

const deleteBtn =
    document.getElementById("deleteBtn");

const addPartBtn =
    document.getElementById("addPartBtn");

const emptyAddBtn =
    document.getElementById("emptyAddBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const partModal =
    document.getElementById("partModal");

const deleteModal =
    document.getElementById("deleteModal");

const closeModalBtn =
    document.getElementById("closeModalBtn");

const cancelModalBtn =
    document.getElementById("cancelModalBtn");

const cancelDeleteBtn =
    document.getElementById("cancelDeleteBtn");

const confirmDeleteBtn =
    document.getElementById("confirmDeleteBtn");

const partForm =
    document.getElementById("partForm");

const modalTitle =
    document.getElementById("modalTitle");

const saveBtnText =
    document.getElementById("saveBtnText");

const deleteMessage =
    document.getElementById("deleteMessage");

const toast =
    document.getElementById("toast");

const toastIcon =
    document.getElementById("toastIcon");

const toastTitle =
    document.getElementById("toastTitle");

const toastMessage =
    document.getElementById("toastMessage");

const sidebarUserEmail =
    document.getElementById("sidebarUserEmail");

const topbarUserEmail =
    document.getElementById("topbarUserEmail");

const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");

const sidebar =
    document.querySelector(".sidebar");

const emptyState =
    document.getElementById("emptyState");


/* =========================================
   FORM ELEMENTS
========================================= */

const partName = document.getElementById("partName");

const partType = document.getElementById("partType");

const partIp = document.getElementById("partIp");

const partMac = document.getElementById("partMac");
const partFrequency = document.getElementById("partFrequency");
const partChannelWidth = document.getElementById("partChannelWidth");
const partServer = document.getElementById("partServer");
const partNote = document.getElementById("partNote");


/* =========================================
   STATE
========================================= */

let allParts = [];
let currentAuthEmail = "مستخدم"; // 👈 أضف هذا السطر هنا
let filteredParts = [];

let selectedIds = new Set();

let editingId = null;

let unsubscribeParts = null;

let toastTimer = null;


/* =========================================
   AUTH PROTECTION
========================================= */

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const email = user.email || "المستخدم";
    currentAuthEmail = email; // 👈 أضف هذا السطر لتخزين البريد

    if (sidebarUserEmail) sidebarUserEmail.textContent = email;
    if (topbarUserEmail) topbarUserEmail.textContent = email;

    loadParts();

});

/* =========================================
   LOG ACTIVITY HELPER
========================================= */

async function logActivity(action, details) {
    try {
        await addDoc(collection(db, "logs"), {
            userEmail: currentAuthEmail,
            action: action, // "إضافة" | "تعديل" | "حذف"
            section: "قطع الشبكة",
            details: details,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Logger Error:", e);
    }
}
/* =========================================
   LOAD PARTS - REAL TIME
========================================= */

function loadParts() {

    if (unsubscribeParts) {
        unsubscribeParts();
    }


    const partsRef =
        collection(db, "parts");


    unsubscribeParts =
        onSnapshot(
            partsRef,
            (snapshot) => {

                allParts = snapshot.docs.map(
                    (item) => ({
                        id: item.id,
                        ...item.data()
                    })
                );


                updateStatistics();

                updateFilters();

                applyFilters();

            },

            (error) => {

                console.error(
                    "Firestore Error:",
                    error
                );

                showToast(
                    "خطأ",
                    "تعذر تحميل بيانات القطع.",
                    true
                );

            }
        );

}


/* =========================================
   STATISTICS
========================================= */

function updateStatistics() {

    if (totalParts) {
        totalParts.textContent =
            allParts.length;
    }


    const types =
        new Set(
            allParts
                .map(part => part.type)
                .filter(Boolean)
        );


    const servers =
        new Set(
            allParts
                .map(part => part.server)
                .filter(Boolean)
        );


    if (totalTypes) {
        totalTypes.textContent =
            types.size;
    }

    if (totalServers) {
        totalServers.textContent =
            servers.size;
    }


    updateSelectedCount();

}


/* =========================================
   FILTER OPTIONS
========================================= */

function updateFilters() {

    if (!typeFilter || !serverFilter) return;

    const currentType =
        typeFilter.value;

    const currentServer =
        serverFilter.value;


    const types =
        [...new Set(
            allParts
                .map(part => part.type)
                .filter(Boolean)
        )]
        .sort();


    const servers =
        [...new Set(
            allParts
                .map(part => part.server)
                .filter(Boolean)
        )]
        .sort();


    typeFilter.innerHTML = `
        <option value="">
            كل الأنواع
        </option>
    `;


    types.forEach(type => {

        typeFilter.innerHTML += `
            <option value="${escapeAttribute(type)}">
                ${escapeHtml(type)}
            </option>
        `;

    });


    serverFilter.innerHTML = `
        <option value="">
            كل السيرفرات
        </option>
    `;


    servers.forEach(server => {

        serverFilter.innerHTML += `
            <option value="${escapeAttribute(server)}">
                ${escapeHtml(server)}
            </option>
        `;

    });


    if (
        types.includes(currentType)
    ) {

        typeFilter.value =
            currentType;

    }


    if (
        servers.includes(currentServer)
    ) {

        serverFilter.value =
            currentServer;

    }

}


/* =========================================
   FILTER + SEARCH
========================================= */

function applyFilters() {

    const search = searchInput ?
        searchInput.value
            .trim()
            .toLowerCase() : "";


    const selectedType = typeFilter ?
        typeFilter.value : "";


    const selectedServer = serverFilter ?
        serverFilter.value : "";


    filteredParts =
        allParts.filter(part => {

            const searchableText = [

                part.name,
                part.type,
                part.ip,
                part.mac,
                part.frequency,
            part.channelWidth,
                part.server,
                part.note

            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            const matchesSearch =
                !search ||
                searchableText.includes(search);


            const matchesType =
                !selectedType ||
                part.type === selectedType;


            const matchesServer =
                !selectedServer ||
                part.server === selectedServer;


            return (
                matchesSearch &&
                matchesType &&
                matchesServer
            );

        });


    filteredParts.sort(
        (a, b) =>
            getDateValue(b.createdAt) -
            getDateValue(a.createdAt)
    );


    renderTable();

}


/* =========================================
   RENDER TABLE
========================================= */

function renderTable() {

    if (resultsCount) {
        resultsCount.textContent = `${filteredParts.length} قطعة`;
    }

    if (filteredParts.length === 0) {
        if (partsTableBody) partsTableBody.innerHTML = "";
        if (emptyState) emptyState.classList.remove("hidden");
        updateSelectAllState();
        return;
    }

    if (emptyState) emptyState.classList.add("hidden");

    if (partsTableBody) {
        partsTableBody.innerHTML = filteredParts.map(part => {

            const checked = selectedIds.has(part.id) ? "checked" : "";
            const createdAt = formatDate(part.createdAt);

            return `
                <tr data-id="${escapeAttribute(part.id)}" class="${selectedIds.has(part.id) ? "selected" : ""}">
                    <td class="check-column">
                        <input type="checkbox" class="part-checkbox" data-id="${escapeAttribute(part.id)}" ${checked}>
                    </td>
                    <td>
                        <div class="part-name">
                            <div class="part-avatar">${getInitial(part.name)}</div>
                            <strong>${escapeHtml(part.name || "بدون اسم")}</strong>
                        </div>
                    </td>
                    <td>
                        <span class="type-badge">${escapeHtml(part.type || "غير محدد")}</span>
                    </td>
                    <td>
                        <span class="ip-address" dir="ltr" style="font-family:monospace;">${escapeHtml(part.ip || "-")}</span>
                    </td>
                    <td>
                        <span class="mac-address" dir="ltr" style="font-family:monospace;">${escapeHtml(part.mac || "-")}</span>
                    </td>
                    <td>
                        <span style="font-family:monospace; font-weight:bold; color:#0284c7;" dir="ltr">${escapeHtml(part.frequency || "-")}</span>
                    </td>
                    <td>
                        <span style="background:rgba(2,132,199,0.1); color:#0284c7; padding:3px 8px; border-radius:6px; font-size:12px; font-weight:600;" dir="ltr">${escapeHtml(part.channelWidth || "-")}</span>
                    </td>
                    <td>
                        <span class="server-badge">${escapeHtml(part.server || "-")}</span>
                    </td>
                    <td>
                        <span class="date-cell">${escapeHtml(createdAt)}</span>
                    </td>
                    <td>
                        <div class="note-cell" title="${escapeAttribute(part.note || "")}">
                            ${escapeHtml(part.note || "-")}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    attachRowEvents();
    updateSelectAllState();
}


/* =========================================
   ROW CHECKBOX EVENTS
========================================= */

function attachRowEvents() {

    const checkboxes =
        document.querySelectorAll(
            ".part-checkbox"
        );


    checkboxes.forEach(checkbox => {

        checkbox.addEventListener(
            "change",
            () => {

                const id =
                    checkbox.dataset.id;


                if (checkbox.checked) {

                    selectedIds.add(id);

                } else {

                    selectedIds.delete(id);

                }


                const row =
                    checkbox.closest("tr");


                if (row) {

                    row.classList.toggle(
                        "selected",
                        checkbox.checked
                    );

                }


                updateSelectedCount();

                updateSelectAllState();

            }
        );

    });

}


/* =========================================
   SELECT ALL
========================================= */

function toggleSelectAll() {

    const shouldSelect = selectAll ? selectAll.checked : false;


    if (shouldSelect) {

        filteredParts.forEach(part => {

            selectedIds.add(part.id);

        });

    } else {

        filteredParts.forEach(part => {

            selectedIds.delete(part.id);

        });

    }


    renderTable();

    updateSelectedCount();

}


/* =========================================
   UPDATE SELECT ALL STATE
========================================= */

function updateSelectAllState() {

    if (!selectAll && !headerSelectAll) return;

    if (
        filteredParts.length === 0
    ) {

        if (selectAll) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }

        if (headerSelectAll) {
            headerSelectAll.checked = false;
            headerSelectAll.indeterminate = false;
        }

        return;

    }


    const selectedVisible =
        filteredParts.filter(
            part => selectedIds.has(part.id)
        ).length;


    const allSelected =
        selectedVisible === filteredParts.length;


    const someSelected =
        selectedVisible > 0 &&
        selectedVisible < filteredParts.length;


    if (selectAll) {
        selectAll.checked = allSelected;
        selectAll.indeterminate = someSelected;
    }


    if (headerSelectAll) {
        headerSelectAll.checked = allSelected;
        headerSelectAll.indeterminate = someSelected;
    }

}


/* =========================================
   SELECTED COUNT
========================================= */

function updateSelectedCount() {

    const count =
        selectedIds.size;


    if (selectedParts) {
        selectedParts.textContent = count;
    }


    if (selectionText) {
        if (count === 0) {
            selectionText.textContent = "لم يتم تحديد أي قطعة";
        } else if (count === 1) {
            selectionText.textContent = "تم تحديد قطعة واحدة";
        } else {
            selectionText.textContent = `تم تحديد ${count} قطع`;
        }
    }


    if (editBtn) {
        editBtn.disabled = count !== 1;
    }


    if (deleteBtn) {
        deleteBtn.disabled = count === 0;
    }

}


/* =========================================
   OPEN ADD MODAL
========================================= */

function openAddModal() {

    editingId = null;


    if (modalTitle) {
        modalTitle.textContent = "إضافة قطعة جديدة";
    }


    if (saveBtnText) {
        saveBtnText.textContent = "حفظ القطعة";
    }


    if (partForm) {
        partForm.reset();
    }


    if (partModal) {
        partModal.classList.add("show");
    }


    setTimeout(() => {

        if (partName) partName.focus();

    }, 100);

}


/* =========================================
   OPEN EDIT MODAL
========================================= */

function openEditModal() {

    if (selectedIds.size !== 1) {

        showToast(
            "تنبيه",
            "حدد قطعة واحدة فقط للتعديل.",
            true
        );

        return;

    }


    const id =
        [...selectedIds][0];


    const part =
        allParts.find(
            item => item.id === id
        );


    if (!part) {

        showToast(
            "خطأ",
            "تعذر العثور على القطعة.",
            true
        );

        return;

    }


    editingId = id;


    if (modalTitle) {
        modalTitle.textContent = "تعديل بيانات القطعة";
    }


    if (saveBtnText) {
        saveBtnText.textContent = "حفظ التعديلات";
    }


    if (partName) partName.value = part.name || "";

    if (partType) partType.value = part.type || "";

    if (partIp) partIp.value = part.ip || "";

    if (partMac) partMac.value = part.mac || "";
if (partFrequency) partFrequency.value = part.frequency || "";
if (partChannelWidth) partChannelWidth.value = part.channelWidth || "";
    if (partServer) partServer.value = part.server || "";

    if (partNote) partNote.value = part.note || "";


    if (partModal) {
        partModal.classList.add("show");
    }


    setTimeout(() => {

        if (partName) partName.focus();

    }, 100);

}


/* =========================================
   CLOSE MODAL
========================================= */

function closeModal() {

    if (partModal) partModal.classList.remove("show");

    if (partForm) partForm.reset();

    editingId = null;

}


/* =========================================
   DUPLICATE VALIDATION
========================================= */

function normalizeValue(value) {
    return String(value ?? "").trim().toLowerCase();
}

function findDuplicatePart(data) {
    const nameVal = normalizeValue(data.name);
    const ipVal = normalizeValue(data.ip);
    const macVal = normalizeValue(data.mac);

    for (const part of allParts) {
        if (editingId && part.id === editingId) {
            continue;
        }

        const existingName = normalizeValue(part.name);
        const existingIp = normalizeValue(part.ip);
        const existingMac = normalizeValue(part.mac);

        if (nameVal && existingName === nameVal) {
            return { type: "name", value: part.name };
        }

        if (ipVal && existingIp === ipVal) {
            return { type: "ip", value: part.ip };
        }

        if (macVal && existingMac && existingMac === macVal) {
            return { type: "mac", value: part.mac };
        }
    }

    return null;
}


/* =========================================
   SAVE PART
========================================= */

if (partForm) {
    partForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const name = partName ? partName.value.trim() : "";
            const type = partType ? partType.value : "";
            const ip = partIp ? partIp.value.trim() : "";
            const mac = partMac ? partMac.value.trim() : "";
            const frequency = partFrequency ? partFrequency.value.trim() : "";
const channelWidth = partChannelWidth ? partChannelWidth.value : "";
            const server = partServer ? partServer.value : "";
            const note = partNote ? partNote.value.trim() : "";


            if (
                !name ||
                !type ||
                !ip ||
                !server
            ) {

                showToast(
                    "بيانات ناقصة",
                    "يرجى تعبئة الحقول المطلوبة.",
                    true
                );

                return;

            }


            // ---------------------------------------------
            // CHECK DUPLICATES (NAME, IP, MAC)
            // ---------------------------------------------

            const duplicate = findDuplicatePart({ name, ip, mac });

            if (duplicate) {
                if (duplicate.type === "name") {
                    showToast(
                        "تكرار بيانات",
                        `اسم القطعة "${duplicate.value}" موجود مسبقاً.`,
                        true
                    );
                    if (partName) partName.focus();
                } else if (duplicate.type === "ip") {
                    showToast(
                        "تكرار بيانات",
                        `عنوان IP "${duplicate.value}" مستخدم مسبقاً.`,
                        true
                    );
                    if (partIp) partIp.focus();
                } else if (duplicate.type === "mac") {
                    showToast(
                        "تكرار بيانات",
                        `عنوان MAC "${duplicate.value}" مستخدم مسبقاً.`,
                        true
                    );
                    if (partMac) partMac.focus();
                }
                return;
            }


            const saveButton =
                document.getElementById(
                    "savePartBtn"
                );


            if (saveButton) saveButton.disabled = true;


            if (saveBtnText) {
                if (editingId) {
                    saveBtnText.textContent = "جاري التعديل...";
                } else {
                    saveBtnText.textContent = "جاري الحفظ...";
                }
            }


            try {

                const data = {

                    name,
                    type,
                    ip,
                    mac,
                    frequency,     
    channelWidth,
                    server,
                    note

                };


                if (editingId) {

    const partRef = doc(db, "parts", editingId);

    await updateDoc(partRef, data);

    // 🔹 أضف هذا السطر لتسجيل التعديل:
    await logActivity("تعديل", `تم تعديل قطعة شبكة: ${name} - السيرفر: ${server}`);

    showToast(
        "تم التعديل",
        "تم تحديث بيانات القطعة بنجاح."
    );

} else {

    await addDoc(
        collection(db, "parts"),
        {
            ...data,
            createdAt: serverTimestamp()
        }
    );

    // 🔹 أضف هذا السطر لتسجيل الإضافة:
    await logActivity("إضافة", `تم إضافة قطعة شبكة جديدة: ${name} - IP: ${ip}`);

    showToast(
        "تمت الإضافة",
        "تمت إضافة القطعة بنجاح."
    );

}


                closeModal();
                selectedIds.clear();


            } catch (error) {

                console.error(
                    "Save Error:",
                    error
                );


                showToast(
                    "حدث خطأ",
                    "تعذر حفظ بيانات القطعة.",
                    true
                );


            } finally {

                if (saveButton) saveButton.disabled = false;

                if (saveBtnText) {
                    saveBtnText.textContent =
                        editingId
                            ? "حفظ التعديلات"
                            : "حفظ القطعة";
                }

            }

        }
    );
}


/* =========================================
   DELETE
========================================= */

function openDeleteModal() {

    const count =
        selectedIds.size;


    if (count === 0) {
        return;
    }


    if (deleteMessage) {
        if (count === 1) {
            deleteMessage.textContent =
                "هل أنت متأكد من حذف القطعة المحددة؟ لا يمكن التراجع عن هذه العملية.";
        } else {
            deleteMessage.textContent =
                `هل أنت متأكد من حذف ${count} قطع؟ لا يمكن التراجع عن هذه العملية.`;
        }
    }


    if (deleteModal) {
        deleteModal.classList.add("show");
    }

}


async function deleteSelectedParts() {

    if (selectedIds.size === 0) {
        return;
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = "جاري الحذف...";
    }

    try {

        // 1. تجميع أسماء القطع المحددة قبل تصفير القائمة أو حذفها
        const deletedNames = [];
        selectedIds.forEach(id => {
            const part = allParts.find(p => p.id === id);
            if (part) {
                deletedNames.push(part.name || "بدون اسم");
            }
        });

        const deletedCount = selectedIds.size;

        // 2. تنفيذ عملية الحذف الجماعي من قاعدة البيانات
        const batch = writeBatch(db);

        selectedIds.forEach(id => {
            const partRef = doc(db, "parts", id);
            batch.delete(partRef);
        });

        await batch.commit();

        // 3. تسجيل الحركة في السجلات مع ذكر أسماء القطع المحذوفة
        await logActivity(
            "حذف",
            `تم حذف ${deletedCount} قطعة شبكة: (${deletedNames.join(", ")})`
        );

        // 4. تنظيف التحديد وإغلاق النافذة
        selectedIds.clear();

        closeDeleteModal();

        showToast(
            "تم الحذف",
            `تم حذف ${deletedCount} قطعة بنجاح.`
        );

        updateSelectedCount();

    } catch (error) {

        console.error("Delete Error:", error);

        showToast(
            "حدث خطأ",
            "تعذر حذف القطع المحددة.",
            true
        );

    } finally {

        if (confirmDeleteBtn) {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = "نعم، حذف";
        }

    }

}


/* =========================================
   CLOSE DELETE MODAL
========================================= */

function closeDeleteModal() {

    if (deleteModal) deleteModal.classList.remove("show");

}


/* =========================================
   DATE FORMAT
========================================= */

function formatDate(value) {

    if (!value) {
        return "جاري الحفظ...";
    }


    if (
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


    if (
        value instanceof Date
    ) {

        return value.toLocaleDateString(
            "ar-SY"
        );

    }


    return String(value);

}


/* =========================================
   DATE SORT VALUE
========================================= */

function getDateValue(value) {

    if (!value) {
        return 0;
    }


    if (
        typeof value.toMillis === "function"
    ) {

        return value.toMillis();

    }


    if (
        typeof value.toDate === "function"
    ) {

        return value.toDate().getTime();

    }


    if (
        typeof value === "string"
    ) {

        const normalized =
            normalizeArabicNumbers(
                value
            )
            .replace(
                /[^\d/.-]/g,
                ""
            );


        const parts =
            normalized.split("/");


        if (parts.length === 3) {

            const day =
                parseInt(parts[0]);

            const month =
                parseInt(parts[1]) - 1;

            const year =
                parseInt(parts[2]);


            const date =
                new Date(
                    year,
                    month,
                    day
                );


            return date.getTime();

        }


        const parsed =
            Date.parse(value);


        return Number.isNaN(parsed)
            ? 0
            : parsed;

    }


    return 0;

}


/* =========================================
   ARABIC NUMBER NORMALIZATION
========================================= */

function normalizeArabicNumbers(value) {

    const arabic =
        "٠١٢٣٤٥٦٧٨٩";

    const persian =
        "۰۱۲۳۴۵۶۷۸۹";


    return String(value)
        .split("")
        .map(char => {

            const arabicIndex =
                arabic.indexOf(char);


            if (arabicIndex !== -1) {
                return arabicIndex;
            }


            const persianIndex =
                persian.indexOf(char);


            if (persianIndex !== -1) {
                return persianIndex;
            }


            return char;

        })
        .join("");

}


/* =========================================
   INITIAL
========================================= */

function getInitial(name) {

    if (!name) {
        return "؟";
    }


    return String(name)
        .trim()
        .charAt(0)
        .toUpperCase();

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function escapeAttribute(value) {

    return escapeHtml(value);

}


/* =========================================
   TOAST
========================================= */

function showToast(
    title,
    message,
    isError = false
) {

    if (!toast) return;

    clearTimeout(toastTimer);


    if (toastTitle) toastTitle.textContent = title;

    if (toastMessage) toastMessage.textContent = message;


    if (toastIcon) {
        toastIcon.textContent =
            isError
                ? "!"
                : "✓";
    }


    toast.classList.toggle(
        "error",
        isError
    );


    toast.classList.add("show");


    toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 3500);

}


/* =========================================
   SEARCH EVENTS
========================================= */

if (searchInput) searchInput.addEventListener("input", applyFilters);

if (typeFilter) typeFilter.addEventListener("change", applyFilters);

if (serverFilter) serverFilter.addEventListener("change", applyFilters);


/* =========================================
   BUTTON EVENTS
========================================= */

if (addPartBtn) addPartBtn.addEventListener("click", openAddModal);

if (emptyAddBtn) emptyAddBtn.addEventListener("click", openAddModal);

if (editBtn) editBtn.addEventListener("click", openEditModal);

if (deleteBtn) deleteBtn.addEventListener("click", openDeleteModal);

if (selectAll) selectAll.addEventListener("change", toggleSelectAll);

if (headerSelectAll) {
    headerSelectAll.addEventListener(
        "change",
        () => {

            if (selectAll) selectAll.checked = headerSelectAll.checked;

            toggleSelectAll();

        }
    );
}

if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal);

if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModal);

if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", deleteSelectedParts);


/* =========================================
   CLOSE MODALS BY CLICKING OUTSIDE
========================================= */

if (partModal) {
    partModal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === partModal
            ) {

                closeModal();

            }

        }
    );
}


if (deleteModal) {
    deleteModal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === deleteModal
            ) {

                closeDeleteModal();

            }

        }
    );
}


/* =========================================
   ESC KEY
========================================= */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape"
        ) {

            closeModal();

            closeDeleteModal();

        }

    }
);


/* =========================================
   MOBILE SIDEBAR
========================================= */

if (mobileMenuBtn && sidebar) {

    mobileMenuBtn.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "mobile-open"
            );

        }
    );

}


/* =========================================
   LOGOUT
========================================= */

if (logoutBtn) {
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

                showToast(
                    "خطأ",
                    "تعذر تسجيل الخروج.",
                    true
                );

            }

        }
    );
}
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { auth } from "./firebase.js";


// ===============================
// عناصر صفحة تسجيل الدخول
// ===============================

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");


// ===============================
// إذا كان المستخدم مسجل دخول مسبقاً
// ===============================

if (loginForm) {

    onAuthStateChanged(auth, (user) => {

        if (user) {

            window.location.href = "dashboard.html";

        }

    });

}


// ===============================
// تسجيل الدخول
// ===============================

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();


        const email = emailInput.value.trim();
        const password = passwordInput.value;


        // تنظيف الرسالة
        loginMessage.textContent = "";


        if (!email || !password) {

            loginMessage.textContent =
                "يرجى إدخال البريد الإلكتروني وكلمة المرور.";

            return;

        }


        try {

            // تعطيل الزر أثناء تسجيل الدخول
            const loginButton =
                loginForm.querySelector("button");

            loginButton.disabled = true;

            loginButton.querySelector("span").textContent =
                "جاري تسجيل الدخول...";


            // 🔹 تثبيت حفظ الجلسة محلياً في المتصفح بشكل دائم
            await setPersistence(auth, browserLocalPersistence);


            // تسجيل الدخول عبر Firebase
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


            // عند النجاح سيتم تحويل المستخدم
            // بواسطة onAuthStateChanged

        }

        catch (error) {

            console.error(error);


            switch (error.code) {

                case "auth/invalid-credential":
                    loginMessage.textContent =
                        "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
                    break;


                case "auth/user-not-found":
                    loginMessage.textContent =
                        "لا يوجد حساب بهذا البريد الإلكتروني.";
                    break;


                case "auth/wrong-password":
                    loginMessage.textContent =
                        "كلمة المرور غير صحيحة.";
                    break;


                case "auth/invalid-email":
                    loginMessage.textContent =
                        "البريد الإلكتروني غير صالح.";
                    break;


                case "auth/too-many-requests":
                    loginMessage.textContent =
                        "تمت محاولات كثيرة. حاول مرة أخرى لاحقاً.";
                    break;


                default:
                    loginMessage.textContent =
                        "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.";
                    break;

            }


            // إعادة الزر لوضعه الطبيعي
            const loginButton =
                loginForm.querySelector("button");

            loginButton.disabled = false;

            loginButton.querySelector("span").textContent =
                "تسجيل الدخول";

        }

    });

}
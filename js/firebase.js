import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDQEucE0sNO1BrN7QNdq_q-JK2U5JB8MHE",
    authDomain: "isp-assets-manager.firebaseapp.com",
    projectId: "isp-assets-manager",
    storageBucket: "isp-assets-manager.firebasestorage.app",
    messagingSenderId: "439934314903",
    appId: "1:439934314903:web:3553911a573b8f19c17cd2"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

export { app, auth, db };
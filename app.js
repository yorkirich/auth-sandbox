// Firebase Modular SDK v10/v11 Import
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDzjyJTcXm1JC2jnLTXOmvBqkcRWu_Eeiw",
    authDomain: "auth-sandbox-b9765.firebaseapp.com",
    projectId: "auth-sandbox-b9765",
    storageBucket: "auth-sandbox-b9765.firebasestorage.app",
    messagingSenderId: "68211559097",
    appId: "1:68211559097:web:31d8c60e5351e29b766968"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const mainHeading = document.getElementById("mainHeading");
const headingInput = document.getElementById("headingInput");
const saveBtn = document.getElementById("saveBtn");
const premiumContainer = document.getElementById("premium-features");
const premiumStatus = document.getElementById("premiumStatus");

// Global variable to store the unsubscribe function for real-time listener
let unsubscribeFirestoreListener = null;

// ============================================================================
// LOCAL STORAGE SETUP - Run on page load
// ============================================================================
function initializeLocalSettings() {
    const savedText = localStorage.getItem("customText");
    if (savedText) {
        mainHeading.textContent = savedText;
        headingInput.value = savedText;
    }
}

// ============================================================================
// AUTH STATE MANAGEMENT - Listen for auth changes
// ============================================================================
function updateUIForAuthState(user) {
    if (user) {
        // User is logged in
        statusIndicator.classList.remove("status-logged-out");
        statusIndicator.classList.add("status-logged-in");
        statusText.textContent = user.email;
        loginForm.style.display = "none";
        loginBtn.disabled = true;
        registerBtn.disabled = true;
        logoutBtn.disabled = false;
        logoutBtn.style.display = "block";

        // Set up real-time listener for user settings from Firestore
        setupRealtimeListener(user.uid);
    } else {
        // User is logged out
        statusIndicator.classList.remove("status-logged-in");
        statusIndicator.classList.add("status-logged-out");
        statusText.textContent = "Logged Out";
        loginForm.style.display = "flex";
        loginBtn.disabled = false;
        registerBtn.disabled = false;
        logoutBtn.disabled = true;
        logoutBtn.style.display = "none";
        fullNameInput.value = "";
        emailInput.value = "";
        passwordInput.value = "";

        // Reset heading to default "Hello World" on logout
        mainHeading.textContent = "Hello World";
        headingInput.value = "Hello World";

        // Hide premium features
        premiumContainer.style.display = "none";
        premiumStatus.textContent = "";

        // Clean up Firestore listener
        if (unsubscribeFirestoreListener) {
            unsubscribeFirestoreListener();
            unsubscribeFirestoreListener = null;
        }
    }
}

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
    updateUIForAuthState(user);
});

// ============================================================================
// REAL-TIME SYNCHRONIZATION - Listen for user settings changes
// ============================================================================
function setupRealtimeListener(userId) {
    // Clean up any existing listener
    if (unsubscribeFirestoreListener) {
        unsubscribeFirestoreListener();
    }

    const userDocRef = doc(db, "users", userId);

    // Set up real-time listener using onSnapshot
    unsubscribeFirestoreListener = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const userData = docSnap.data();

            // Handle custom text
            if (userData.customText) {
                // Instantly update heading and input
                mainHeading.textContent = userData.customText;
                headingInput.value = userData.customText;
                // Sync to localStorage
                localStorage.setItem("customText", userData.customText);
                console.log("Real-time sync: heading updated to", userData.customText);
            }

            // Handle role-based access control
            const userRole = userData.role;
            if (userRole === "premium") {
                // Show premium features
                premiumContainer.style.display = "block";
                premiumStatus.textContent = "✨ You have access to all advanced routing and planning tools!";
                premiumStatus.classList.add("premium-active");
                premiumStatus.classList.remove("premium-inactive");
                console.log("Premium features unlocked for user:", userId);
            } else {
                // Show upgrade message
                premiumContainer.style.display = "block";
                premiumStatus.textContent = "🔒 Upgrade to Premium to unlock advanced routing and planning tools!";
                premiumStatus.classList.remove("premium-active");
                premiumStatus.classList.add("premium-inactive");
            }
        }
    }, (error) => {
        console.error("Error setting up real-time listener:", error);
    });
}

// ============================================================================
// LOGIN HANDLER
// ============================================================================
async function handleLogin(e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        loginBtn.disabled = true;
        loginBtn.textContent = "Logging in...";

        // Try to sign in first
        await signInWithEmailAndPassword(auth, email, password);
        // If successful, onAuthStateChanged will handle UI updates

    } catch (error) {
        // If user doesn't exist, create account
        if (error.code === "auth/user-not-found") {
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                // If successful, onAuthStateChanged will handle UI updates
            } catch (createError) {
                console.error("Error creating account:", createError);
                alert("Error: " + createError.message);
            }
        } else {
            console.error("Login error:", error);
            alert("Error: " + error.message);
        }
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
    }
}

// ============================================================================
// REGISTRATION HANDLER
// ============================================================================
async function handleRegister(e) {
    e.preventDefault();

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        statusText.textContent = "Please enter both email and password.";
        statusIndicator.classList.remove("status-logged-in");
        statusIndicator.classList.add("status-logged-out");
        return;
    }

    try {
        registerBtn.disabled = true;
        registerBtn.textContent = "Registering...";

        // Create new user account and capture the user object
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("Account created successfully! UID:", user.uid);

        // Update user profile with display name
        if (fullName) {
            await updateProfile(user, { displayName: fullName });
        }

        // Create Firestore document with user profile data
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            displayName: fullName || "User",
            role: "free",
            customText: "Hello World",
            createdAt: serverTimestamp()
        });

        console.log("User profile and Firestore document created successfully!");
        // onAuthStateChanged will automatically sign them in and handle UI updates

    } catch (error) {
        console.error("Registration error:", error);
        // Display error in status indicator
        statusText.textContent = "Registration failed: " + error.message;
        statusIndicator.classList.remove("status-logged-in");
        statusIndicator.classList.add("status-logged-out");
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = "Register";
    }
}

// ============================================================================
// LOGOUT HANDLER
// ============================================================================
async function handleLogout() {
    try {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Logging out...";

        // Clean up Firestore listener before signing out
        if (unsubscribeFirestoreListener) {
            unsubscribeFirestoreListener();
            unsubscribeFirestoreListener = null;
        }

        await signOut(auth);
        // onAuthStateChanged will handle UI updates

    } catch (error) {
        console.error("Logout error:", error);
        alert("Error logging out: " + error.message);
    } finally {
        logoutBtn.disabled = false;
        logoutBtn.textContent = "Logout";
    }
}

// ============================================================================
// SAVE SETTINGS HANDLER
// ============================================================================
async function handleSaveSettings() {
    const newText = headingInput.value.trim() || "Hello World";

    // 1. Instantly update HTML and localStorage
    mainHeading.textContent = newText;
    localStorage.setItem("customText", newText);

    // 2. If authenticated, upload to Firestore
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            await setDoc(
                userDocRef,
                {
                    customText: newText,
                    updatedAt: serverTimestamp()
                },
                { merge: true } // Merge with existing data
            );
            console.log("Settings saved to Firestore");
        } catch (error) {
            console.error("Error saving to Firestore:", error);
            // Still show success since local save worked
            alert("Settings saved locally. Cloud sync failed: " + error.message);
        }
    } else {
        console.log("Settings saved locally (user not authenticated)");
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
loginForm.addEventListener("submit", handleLogin);
registerBtn.addEventListener("click", handleRegister);
logoutBtn.addEventListener("click", handleLogout);
saveBtn.addEventListener("click", handleSaveSettings);

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    initializeLocalSettings();
    // Auth state listener is already set up globally
});

// ============================================================================
// SERVICE WORKER REGISTRATION - Enable PWA functionality
// ============================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch((error) => {
                console.warn('Service Worker registration failed:', error);
            });
    });
}

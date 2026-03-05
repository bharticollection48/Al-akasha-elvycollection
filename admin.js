// --- 1. CONFIGURATION ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbzdL8t-sKlAs1mEg7D4eHvbS3LNH-g4FQ6fG1UwZ55WyU0wibhfc1EZGoiw8S7jjBhKPg/exec";
const IMGBB_API_KEY = "9ee7440c835d66e8df057ca7e92ce285"; 

// --- 2. Server se Settings Fetch Karna ---
async function fetchServerSettings() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL + "?t=" + Date.now());
        const data = await response.json();
        
        if (data.settings) {
            localStorage.setItem('adminPassword', data.settings.password);
            localStorage.setItem('ghabaUPI', data.settings.upi);
            
            if(document.getElementById('currentUPIText')) document.getElementById('currentUPIText').innerText = data.settings.upi;
            if(document.getElementById('currentPassText')) document.getElementById('currentPassText').innerText = data.settings.password;
            if(document.getElementById('adminUPI')) document.getElementById('adminUPI').value = data.settings.upi;
        }
        return data.products || [];
    } catch (error) {
        console.error("Server Fetch Error:", error);
        return [];
    }
}

// --- 3. Security Check (Anti-Reload Password Fix) ---
window.onload = async function() {
    // Check karein kya isi session mein pehle login kiya tha?
    const alreadyLoggedIn = sessionStorage.getItem('isGhabaAdmin');
    
    const serverProducts = await fetchServerSettings();
    const latestPass = localStorage.getItem('adminPassword') || "admin123";

    if (alreadyLoggedIn === "true") {
        // Agar pehle se login hai toh seedha andar bhejo
        document.body.style.display = "block";
        displayAdminProducts(serverProducts);
    } else {
        // Agar naya session hai toh password pucho
        let userEntry = prompt("Enter Admin Password:");
        if (userEntry === latestPass) {
            sessionStorage.setItem('isGhabaAdmin', "true"); // Session mein login save karo
            document.body.style.display = "block";
            displayAdminProducts(serverProducts);
        } else {
            alert("Access Denied! Galat Password.");
            window.location.href = "index.html";
        }
    }
};

// --- 4. Server Update Logic (No Page Reload) ---
async function syncSettingsToServer(newUpi, newPass) {
    const data = {
        type: "updateSettings",
        upi: newUpi,
        password: newPass
    };

    if(typeof showLoader === "function") showLoader(true);

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors', 
            body: JSON.stringify(data)
        });

        alert("Server updated successfully! ✅");
        
        // Refresh ki jagah sirf data reload karo
        const updatedProducts = await fetchServerSettings();
        displayAdminProducts(updatedProducts);
    } catch (error) {
        alert("Server error!");
    } finally {
        if(typeof showLoader === "function") showLoader(false);
    }
}

function updateUPI() {
    const upi = document.getElementById('adminUPI').value.trim();
    const currentPass = localStorage.getItem('adminPassword');
    if(upi) syncSettingsToServer(upi, currentPass);
}

function updatePass() {
    const newPass = document.getElementById('adminPass').value.trim();
    const currentUPI = localStorage.getItem('ghabaUPI');
    if(newPass.length >= 4) syncSettingsToServer(currentUPI, newPass);
}

// --- 5. Photo Upload (ImgBB) ---
async function autoUrl(input, slot) {
    const file = input.files[0];
    if (!file) return;

    const previewImg = document.getElementById(`pre${slot}`);
    const urlInput = document.getElementById(`url${slot}`);
    const btnSpan = input.previousElementSibling; 

    if (btnSpan) btnSpan.innerText = "Wait...";
    if (previewImg) previewImg.style.opacity = "0.3";

    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            urlInput.value = data.data.url;
            if (previewImg) {
                previewImg.src = data.data.url;
                previewImg.style.opacity = "1";
            }
            if (btnSpan) btnSpan.innerText = "Done ✅";
        }
    } catch (error) {
        alert("Photo upload fail!");
    }
}

// --- 6. Save Product (No Page Reload Fix) ---
async function saveProduct() {
    const name = document.getElementById('pName').value.trim();
    const price = document.getElementById('pPrice').value.trim();
    const category = document.getElementById('pCategory').value;
    const video = document.getElementById('pVideo').value.trim();

    const gallery = [
        document.getElementById('url1').value,
        document.getElementById('url2').value,
        document.getElementById('url3').value,
        document.getElementById('url4').value,
        document.getElementById('url5').value
    ].filter(url => url.trim() !== "");

    if (!name || !price || gallery.length === 0) {
        alert("Details bhariye!");
        return;
    }

    const submitBtn = document.getElementById('publishBtn');
    submitBtn.innerText = "PUBLISHING...";
    submitBtn.disabled = true;
    if(typeof showLoader === "function") showLoader(true);

    const newProduct = {
        id: Date.now(),
        name: name,
        price: price,
        category: category,
        mainImg: gallery[0],
        gallery: gallery, 
        video: video
    };

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(newProduct)
        });

        alert("Product Published! ✅");

        // Form ko khali karo (Refesh ki zaroorat nahi)
        document.getElementById('pName').value = "";
        document.getElementById('pPrice').value = "";
        document.getElementById('pVideo').value = "";
        for(let i=1; i<=5; i++){
            document.getElementById(`url${i}`).value = "";
            document.getElementById(`pre${i}`).src = "https://via.placeholder.com/50";
        }

        // List update karo bina refresh ke
        const freshProducts = await fetchServerSettings();
        displayAdminProducts(freshProducts);

    } catch (error) {
        alert("Server error!");
    } finally {
        submitBtn.innerText = "PUBLISH TO STORE";
        submitBtn.disabled = false;
        if(typeof showLoader === "function") showLoader(false);
    }
}

// --- 7. UI Helpers ---
function displayAdminProducts(products) {
    const list = document.getElementById('adminProductList');
    if (!list || !products) return;
    
    list.innerHTML = products.slice().reverse().map(p => `
        <div class="p-card">
            <img src="${p.mainImg}">
            <p style="font-size:12px; font-weight:bold; margin:5px 0;">${p.name}</p>
            <p style="color:#ff4757; font-weight:bold;">₹${p.price}</p>
        </div>
    `).join('');
}

function logout() { 
    localStorage.clear(); 
    sessionStorage.clear();
    window.location.href = "index.html"; 
}
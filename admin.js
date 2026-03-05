// --- 1. CONFIGURATION ---
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyIPMJkkNyixopJDKSmvkWcyfMjkhKAI4to5dC-8ot-cINWLlwXg4pLFmThXEtw-Q/exec";
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

// --- 3. Security Check ---
window.onload = async function() {
    const alreadyLoggedIn = sessionStorage.getItem('isGhabaAdmin');
    const serverProducts = await fetchServerSettings();
    const latestPass = localStorage.getItem('adminPassword') || "admin123";

    if (alreadyLoggedIn === "true") {
        document.body.style.display = "block";
        displayAdminProducts(serverProducts);
    } else {
        let userEntry = prompt("Enter Admin Password:");
        if (userEntry === latestPass) {
            sessionStorage.setItem('isGhabaAdmin', "true");
            document.body.style.display = "block";
            displayAdminProducts(serverProducts);
        } else {
            alert("Access Denied!");
            window.location.href = "index.html";
        }
    }
};

// --- 4. Server Update Logic ---
async function syncSettingsToServer(newUpi, newPass) {
    const data = {
        type: "updateSettings",
        upi: newUpi,
        password: newPass
    };

    if(typeof showLoader === "function") showLoader(true, "Updating Server...");

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors', 
            body: JSON.stringify(data)
        });

        alert("Server updated successfully! ✅");
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
async function processMedia(input, urlInputId, previewId) {
    const file = input.files[0];
    if (!file) return;

    const previewImg = document.getElementById(previewId);
    const urlInput = document.getElementById(urlInputId);
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
        if (btnSpan) btnSpan.innerText = "Gallery";
        if (previewImg) previewImg.style.opacity = "1";
    }
}

// --- 6. Save Product (With 7 Photos & No Video) ---
async function saveProduct() {
    const name = document.getElementById('pName').value.trim();
    const price = document.getElementById('pPrice').value.trim();
    const category = document.getElementById('pCategory').value;

    // Collect all 7 photo URLs
    const gallery = [];
    for(let i=1; i<=7; i++) {
        const val = document.getElementById(`url${i}`).value.trim();
        if(val) gallery.push(val);
    }

    if (!name || !price || gallery.length === 0) {
        alert("Please fill name, price and at least one image!");
        return;
    }

    const submitBtn = document.getElementById('publishBtn');
    submitBtn.innerText = "PUBLISHING...";
    submitBtn.disabled = true;
    if(typeof showLoader === "function") showLoader(true, "Publishing Product...");

    const newProduct = {
        id: Date.now(),
        name: name,
        price: price,
        category: category,
        mainImg: gallery[0],
        gallery: gallery
        // Video field removed as per request
    };

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(newProduct)
        });

        alert("Product Published! ✅");

        // Clear Form
        document.getElementById('pName').value = "";
        document.getElementById('pPrice').value = "";
        for(let i=1; i<=7; i++){
            document.getElementById(`url${i}`).value = "";
            document.getElementById(`pre${i}`).src = "https://via.placeholder.com/50";
            // Reset button text
            const inputs = document.querySelectorAll('.btn-file');
            inputs.forEach(span => span.innerText = "Gallery");
        }

        // Update Inventory List
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
    sessionStorage.clear();
    window.location.href = "index.html"; 
}
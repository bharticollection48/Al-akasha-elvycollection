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

// --- 4. Settings Update ---
async function syncSettingsToServer(newUpi, newPass) {
    const data = { type: "updateSettings", upi: newUpi, password: newPass };
    if(typeof showLoader === "function") showLoader(true);
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

// --- 5. Media Upload (Images & Video Handling) ---
// Note: ImgBB doesn't support video. For video, we use a different approach or direct Base64 if small.
async function processMedia(input, slotOrId, previewId) {
    const file = input.files[0];
    if (!file) return;

    // Check if it's a video
    if (file.type.startsWith('video/')) {
        if (file.size > 15 * 1024 * 1024) { // 15MB Limit
            alert("Video file too large! Please keep it under 15MB.");
            return;
        }
        uploadVideoDirectly(file);
        return;
    }

    // If it's an image, use ImgBB
    uploadImageToImgBB(file, slotOrId, previewId, input);
}

// Image Upload Logic
async function uploadImageToImgBB(file, slot, previewId, input) {
    const btnSpan = input.previousElementSibling; 
    if (btnSpan) btnSpan.innerText = "Wait...";
    if(typeof showLoader === "function") showLoader(true, "Uploading Image...");

    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById(`url${slot}`).value = data.data.url;
            if (previewId) document.getElementById(previewId).src = data.data.url;
            if (btnSpan) btnSpan.innerText = "Done ✅";
        }
    } catch (error) {
        alert("Photo upload fail!");
    } finally {
        if(typeof showLoader === "function") showLoader(false);
    }
}

// Video Reading Logic (Convert to Base64)
function uploadVideoDirectly(file) {
    if(typeof showLoader === "function") showLoader(true, "Reading Video File...");
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('pVideo').value = e.target.result;
        if(document.getElementById('vidStatus')) document.getElementById('vidStatus').style.display = 'block';
        if(typeof showLoader === "function") showLoader(false);
        alert("Video loaded! Click Publish to save.");
    };
    reader.readAsDataURL(file);
}

// --- 6. Save Product ---
async function saveProduct() {
    const name = document.getElementById('pName').value.trim();
    const price = document.getElementById('pPrice').value.trim();
    const category = document.getElementById('pCategory').value;
    const video = document.getElementById('pVideo').value.trim();

    const gallery = [];
    for(let i=1; i<=5; i++) {
        let val = document.getElementById(`url${i}`).value.trim();
        if(val) gallery.push(val);
    }

    if (!name || !price || gallery.length === 0) {
        alert("Please enter Name, Price and at least one Image!");
        return;
    }

    const submitBtn = document.getElementById('publishBtn');
    submitBtn.innerText = "SAVING TO CLOUD...";
    submitBtn.disabled = true;
    if(typeof showLoader === "function") showLoader(true, "Publishing to Google Sheets...");

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
        // We use POST with no-cors. If file is too big, this might still fail.
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct)
        });

        alert("Product Successfully Saved to Google Sheets! ✅");

        // Clear Form
        document.getElementById('pName').value = "";
        document.getElementById('pPrice').value = "";
        document.getElementById('pVideo').value = "";
        if(document.getElementById('vidStatus')) document.getElementById('vidStatus').style.display = 'none';
        for(let i=1; i<=5; i++){
            document.getElementById(`url${i}`).value = "";
            document.getElementById(`pre${i}`).src = "https://via.placeholder.com/50";
        }

        const freshProducts = await fetchServerSettings();
        displayAdminProducts(freshProducts);

    } catch (error) {
        console.error(error);
        alert("Error saving product. Check your internet or file size.");
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
            <p style="color:#f10c59; font-weight:bold;">₹${p.price}</p>
        </div>
    `).join('');
}

function logout() { 
    sessionStorage.clear();
    window.location.href = "index.html"; 
}
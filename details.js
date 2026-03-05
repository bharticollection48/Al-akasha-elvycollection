// --- 1. CONFIGURATION ---
// अपनी Google Sheet Script URL यहाँ सुनिश्चित करें
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyIPMJkkNyixopJDKSmvkWcyfMjkhKAI4to5dC-8ot-cINWLlwXg4pLFmThXEtw-Q/exec";

// URL से Product ID निकालना
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

async function initDetails() {
    console.log("Fetching product for ID:", productId);
    
    let allProducts = [];
    const loader = document.getElementById('loader');

    try {
        // STEP 1: Fresh data fetch करना (Cache bypass के साथ)
        const response = await fetch(SCRIPT_URL + "?t=" + new Date().getTime());
        const data = await response.json();
        allProducts = data.products || [];
        
        // STEP 2: LocalStorage अपडेट करें
        localStorage.setItem('myProducts', JSON.stringify(allProducts));
        console.log("Data fetched from Google Sheet");

    } catch (e) {
        console.log("Cloud fetch failed, using local storage...", e);
        // इंटरनेट न होने पर local storage का इस्तेमाल
        allProducts = JSON.parse(localStorage.getItem('myProducts')) || [];
    }

    // Product ढूँढें
    const product = allProducts.find(p => p.id == productId);

    if (product) {
        renderProduct(product, allProducts);
        if(loader) loader.style.display = 'none';
    } else {
        showError();
    }
}

function renderProduct(product, allProducts) {
    // 1. Basic Details भरना
    if(document.getElementById('pName')) document.getElementById('pName').innerText = product.name;
    if(document.getElementById('pPrice')) document.getElementById('pPrice').innerText = '₹' + product.price;
    if(document.getElementById('pCat')) document.getElementById('pCat').innerText = product.category || "General";
    
    // Discount Calculation (Professional Look)
    if(document.getElementById('pOld')) {
        const off = 45; 
        const oldPrice = Math.round(product.price / (1 - off/100));
        document.getElementById('pOld').innerText = '₹' + oldPrice;
        document.getElementById('pOff').innerText = off + "% OFF";
    }

    // 2. 7 Photos Gallery Logic
    const mainDisplay = document.getElementById('mainDisplay');
    const thumbRow = document.getElementById('thumbRow');
    
    if (mainDisplay && thumbRow) {
        thumbRow.innerHTML = ''; // Clear old thumbs
        
        let galleryArray = [];
        
        // Main Image को पहले रखें
        if(product.mainImg) galleryArray.push(product.mainImg);
        
        // बाकी 6 Photos (gallery से) जोड़ें
        if (Array.isArray(product.gallery)) {
            galleryArray = [...galleryArray, ...product.gallery];
        } else if (typeof product.gallery === 'string') {
            const extra = product.gallery.split(',').filter(img => img.trim() !== "");
            galleryArray = [...galleryArray, ...extra];
        }

        // Unique URLs रखें और अधिकतम 7 तक सीमित करें
        const finalGallery = [...new Set(galleryArray)].slice(0, 7);

        // अगर कुछ भी न मिले तो placeholder दिखाएँ
        if (finalGallery.length === 0) {
            finalGallery.push('https://via.placeholder.com/400?text=No+Image');
        }

        // Main Display Set करें
        mainDisplay.src = finalGallery[0];

        // थंबनेल (Thumbnails) बनाएँ
        finalGallery.forEach((img, index) => {
            const thumb = document.createElement('div');
            thumb.className = `thumb-card ${index === 0 ? 'active' : ''}`;
            thumb.innerHTML = `<img src="${img.trim()}" onerror="this.src='https://via.placeholder.com/100?text=Error'">`;
            
            thumb.onclick = () => {
                mainDisplay.src = img.trim();
                document.querySelectorAll('.thumb-card').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbRow.appendChild(thumb);
        });
    }

    // 3. Size Area Logic (Saree/Kurtis के लिए)
    const sizeArea = document.getElementById('sizeArea');
    const sizeOptions = document.getElementById('sizeOptions');
    const cat = (product.category || "").toUpperCase();

    if(sizeArea && (cat.includes('KURTI') || cat.includes('SAREE') || cat.includes('DRESS'))) {
        sizeArea.style.display = 'block';
        sizeOptions.innerHTML = '';
        const sizes = cat.includes('SAREE') ? ["Free Size"] : ["S", "M", "L", "XL", "XXL"];
        
        sizes.forEach(sz => {
            const btn = document.createElement('button');
            btn.className = "btn-size";
            btn.innerText = sz;
            btn.onclick = () => {
                document.querySelectorAll('.btn-size').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.selectedSize = sz; // Global variable for checkout
            };
            sizeOptions.appendChild(btn);
        });
    }

    // 4. Related Products (More from Category)
    const relatedGrid = document.getElementById('relatedGrid');
    if(relatedGrid) {
        relatedGrid.innerHTML = '';
        const similar = allProducts.filter(p => p.category === product.category && p.id != product.id).slice(0, 4);
        similar.forEach(sp => {
            const item = document.createElement('div');
            item.className = 'rel-card'; // Make sure this class is in your CSS
            item.style.cursor = "pointer";
            item.onclick = () => window.location.href = `details.html?id=${sp.id}`;
            item.innerHTML = `
                <img src="${sp.mainImg}" style="width:100%; height:160px; object-fit:cover; border-radius:8px;">
                <div style="padding:8px 0;">
                    <div style="font-size:12px; font-weight:600; height:34px; overflow:hidden;">${sp.name}</div>
                    <div style="color:#f3047c; font-weight:800;">₹${sp.price}</div>
                </div>
            `;
            relatedGrid.appendChild(item);
        });
    }
}

// Error Show Function
function showError() {
    document.body.innerHTML = `
        <div style="text-align:center; padding:100px 20px; font-family:'Poppins', sans-serif;">
            <i class="fa-solid fa-circle-exclamation" style="font-size:50px; color:#ccc;"></i>
            <h2 style="color:#666; margin-top:20px;">Product Not Found!</h2>
            <p>This product might be out of stock or removed.</p>
            <a href="index.html" style="display:inline-block; margin-top:20px; padding:10px 25px; background:#f3047c; color:white; border-radius:30px; text-decoration:none; font-weight:bold;">Continue Shopping</a>
        </div>`;
}

// Share Product Function
function shareProduct() {
    const pName = document.getElementById('pName').innerText;
    if (navigator.share) {
        navigator.share({
            title: pName,
            text: `Check out this ${pName} on Al Akasha Elvy!`,
            url: window.location.href
        });
    } else {
        alert("Link Copied!");
        navigator.clipboard.writeText(window.location.href);
    }
}

// Global Variables
window.selectedSize = "";

window.onload = initDetails;
// --- 1. CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxKbWEBwz1sm4sftFM5yM-ako6ProOKTPEGtA_7zDqA8_LrJ-_KTXtCfsAIhfXqIlpy/exec"; 

let allProducts = [];
let currentData = [];

/**
 * Page load hote hi data mangwane ki koshish karein
 */
window.onload = async () => {
    // 1. Loader dikhao jab tak data load na ho
    const grid = document.getElementById('productDisplay');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px;"><i class="fa-solid fa-spinner fa-spin" style="font-size:30px; color:#9c27b0;"></i><p>Loading Products...</p></div>';

    // 2. Pehle LocalStorage se purana data dikhao (Instant feel ke liye)
    const localData = localStorage.getItem('myProducts');
    if (localData) {
        try {
            allProducts = JSON.parse(localData);
            currentData = [...allProducts];
            render(allProducts);
        } catch(e) { console.log("Cache error"); }
    }
    
    // 3. Phir Cloud se ekdum taaza data lao
    await refreshData();
};

/**
 * Google Sheets se Fresh Data Lane Ke Liye
 */
async function refreshData() {
    try {
        // Cache busting: t=Date.now() browser ko naya data lane par majboor karta hai
        const fetchUrl = SCRIPT_URL + (SCRIPT_URL.includes('?') ? '&' : '?') + 't=' + Date.now();
        
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error("Server not responding");
        
        const result = await response.json();
        
        let freshProducts = [];

        // Admin Panel format check: { products: [], settings: {} }
        if (result.products && Array.isArray(result.products)) {
            freshProducts = result.products;
            
            // Sync UPI and Password to LocalStorage
            if(result.settings) {
                localStorage.setItem('ghabaUPI', result.settings.upi);
                localStorage.setItem('adminPassword', result.settings.password);
            }
        } 
        // Agar result sirf ek array hai
        else if (Array.isArray(result)) {
            freshProducts = result;
        }

        if (freshProducts.length > 0) {
            allProducts = freshProducts;
            currentData = [...allProducts];
            
            // Store in LocalStorage for next visit
            localStorage.setItem('myProducts', JSON.stringify(allProducts));
            render(allProducts); 
            console.log("Cloud Sync Successful. Total:", allProducts.length);
        } else {
            // Agar sheet khali hai
            render([]);
        }
    } catch (error) {
        console.error("Sync Error:", error);
    }
    updateCartBadge();
}

/**
 * Render Function (Design & UI)
 */
function render(data) {
    const grid = document.getElementById('productDisplay');
    if (!grid) return;

    if (!data || data.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #888;">
                <i class="fa-solid fa-box-open" style="font-size: 40px; margin-bottom: 10px; color: #ccc;"></i>
                <h3>Stock Update Ho Raha Hai</h3>
                <p>Kripya thodi der mein check karein ya refresh karein.</p>
            </div>`;
        return;
    }

    grid.innerHTML = '';
    
    // Naye products hamesha upar dikhane ke liye reverse()
    const displayData = [...data].reverse();

    displayData.forEach(p => {
        const currentPrice = parseFloat(p.price) || 0;
        const originalPrice = Math.round(currentPrice * 1.4);
        
        // Multiple fallback for images
        let imgPath = p.mainImg || p.img || (p.gallery && p.gallery[0]) || 'https://via.placeholder.com/300?text=No+Image';

        grid.innerHTML += `
            <div class="product-card" onclick="openProduct(${p.id})">
                <div class="img-wrapper">
                    <img src="${imgPath}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300?text=Image+Error'">
                    <div class="wishlist-icon" onclick="event.stopPropagation(); addToWishlist(${p.id})">
                        <i class="fa-regular fa-heart"></i>
                    </div>
                </div>
                <div class="product-info">
                    <p class="product-name">${p.name}</p>
                    <div class="price-container">
                        <span class="main-price">₹${currentPrice}</span>
                        <span class="old-price">₹${originalPrice}</span>
                        <span class="discount-badge">30% OFF</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 5px;">
                         <span class="rating-pill">4.2 <i class="fa-solid fa-star" style="font-size: 8px;"></i></span>
                        <span style="font-size: 11px; color: #00b894; font-weight:bold;">Free Delivery</span>
                    </div>
                </div>
            </div>`;
    });
}

// --- Filtering & UI Logic ---

function searchProduct() {
    const val = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allProducts.filter(p => 
        (p.name && p.name.toLowerCase().includes(val)) || 
        (p.category && p.category.toLowerCase().includes(val))
    );
    render(filtered);
}

function filterProducts(categoryName) {
    currentData = (categoryName === 'All') 
        ? [...allProducts] 
        : allProducts.filter(p => p.category === categoryName);
    render(currentData);
}

function sortProducts(type) {
    const sorted = [...currentData].sort((a, b) => 
        type === 'low' ? a.price - b.price : b.price - a.price
    );
    render(sorted);
}

function openProduct(id) {
    window.location.href = `details.html?id=${id}`; 
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadgeIndex');
    if (!badge) return;
    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    badge.innerText = cart.length;
    badge.style.display = cart.length > 0 ? "block" : "none";
}

function addToWishlist(id) {
    alert("Wishlist mein add ho gaya! ❤️");
}

// Jab user doosre tab se wapas aaye toh data refresh karein
window.onfocus = refreshData;
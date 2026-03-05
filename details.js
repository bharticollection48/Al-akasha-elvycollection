// --- 1. CONFIGURATION ---
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzdL8t-sKlAs1mEg7D4eHvbS3LNH-g4FQ6fG1UwZ55WyU0wibhfc1EZGoiw8S7jjBhKPg/exec"; 

// URL se Product ID nikalna
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

async function initDetails() {
    console.log("Fetching product for ID:", productId);
    
    let allProducts = [];

    try {
        // STEP 1: Hamesha Google Sheet se fresh data mangwayein
        // Cache bypass karne ke liye timestamp (?t=...) add kiya hai
        const response = await fetch(SCRIPT_URL + "?t=" + new Date().getTime());
        allProducts = await response.json();
        
        // STEP 2: Milte hi LocalStorage update karein
        localStorage.setItem('myProducts', JSON.stringify(allProducts));
        console.log("Data fetched from Google Sheet");

    } catch (e) {
        console.log("Cloud fetch failed, trying local storage...", e);
        // STEP 3: Agar internet nahi hai, tabhi local storage use karein
        allProducts = JSON.parse(localStorage.getItem('myProducts')) || [];
    }

    // Product dhoondhein
    const product = allProducts.find(p => p.id == productId);

    if (product) {
        renderProduct(product);
    } else {
        showError();
    }
}

function renderProduct(product) {
    // 1. Basic Details
    document.getElementById('detName').innerText = product.name;
    document.getElementById('detPrice').innerText = product.price;
    document.getElementById('detCat').innerText = product.category || "General";

    // 2. Media Slider Logic
    const slider = document.getElementById('mediaSlider');
    const dotsContainer = document.getElementById('sliderDots');
    
    let mediaHTML = '';
    let dotsHTML = '';
    let galleryArray = [];

    // Photo format fix (Sheet se data string ya array dono ho sakta hai)
    if (Array.isArray(product.gallery)) {
        galleryArray = product.gallery;
    } else if (typeof product.gallery === 'string') {
        galleryArray = product.gallery.split(',').filter(img => img.trim() !== "");
    }

    // Agar gallery khali hai toh mainImg fallback
    if (galleryArray.length === 0) {
        const fallback = product.mainImg || product.img || 'https://via.placeholder.com/400';
        galleryArray = [fallback];
    }

    // Build Slider HTML
    galleryArray.forEach((img, index) => {
        mediaHTML += `
            <div class="slider-item">
                <img src="${img.trim()}" onerror="this.src='https://via.placeholder.com/400?text=Image+Not+Found'">
            </div>`;
        dotsHTML += `<div class="dot ${index === 0 ? 'active' : ''}"></div>`;
    });

    // 3. Video Slide
    if (product.video && product.video.trim() !== "") {
        mediaHTML += `
            <div class="slider-item">
                <video controls style="width:100%; height:100%; object-fit:contain; background:#000;">
                    <source src="${product.video}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>`;
        dotsHTML += `<div class="dot"></div>`;
    }

    slider.innerHTML = mediaHTML;
    dotsContainer.innerHTML = dotsHTML;

    // Scroll Indicator Logic
    slider.onscroll = () => {
        const scrollIndex = Math.round(slider.scrollLeft / slider.clientWidth);
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === scrollIndex));
    };
}

function showError() {
    document.body.innerHTML = `
        <div style="text-align:center; padding:100px 20px; font-family:sans-serif;">
            <h2 style="color:#666;">Product Not Found!</h2>
            <p>Yeh product shayad hata diya gaya hai ya link galat hai.</p>
            <a href="index.html" style="color:#9c27b0; text-decoration:none; font-weight:bold;">Back to Shop</a>
        </div>`;
}

// Add to Cart / Buy Now (Hamesha fresh local storage se data lein)
function getProductData() {
    const products = JSON.parse(localStorage.getItem('myProducts')) || [];
    return products.find(p => p.id == productId);
}

function addToCart() {
    const product = getProductData();
    if (!product) return;

    let cart = JSON.parse(localStorage.getItem('myCart')) || [];
    if (cart.find(item => item.id == product.id)) {
        alert("Pehle se Bag mein hai! 😊");
    } else {
        cart.push(product);
        localStorage.setItem('myCart', JSON.stringify(cart));
        alert("Bag mein add ho gaya! ✅");
    }
}

function buyNow() {
    const product = getProductData();
    if(product) {
        const text = `Hi, I want to buy: ${product.name} (ID: ${product.id}) for ₹${product.price}`;
        window.open(`https://wa.me/91XXXXXXXXXX?text=${encodeURIComponent(text)}`, '_blank');
    }
}

window.onload = initDetails;
window.onload = () => {
    loadWishlist();
};

function loadWishlist() {
    const grid = document.getElementById('wishlistDisplay');
    const allProducts = JSON.parse(localStorage.getItem('myProducts')) || [];
    const wishlistIds = JSON.parse(localStorage.getItem('myWishlist')) || [];

    // Filter products
    const savedProducts = allProducts.filter(p => wishlistIds.includes(Number(p.id)) || wishlistIds.includes(String(p.id)));

    if (savedProducts.length === 0) {
        grid.innerHTML = `<div style="text-align:center; padding:50px; grid-column:1/-1;"><h3>Wishlist Khali Hai!</h3></div>`;
        return;
    }

    grid.innerHTML = savedProducts.map(p => {
        const price = p.price || 0;
        const img = p.mainImg || p.img || 'https://via.placeholder.com/300';

        return `
            <div class="p-card" style="cursor: pointer; border:1px solid #eee; border-radius:10px; background:#fff;" onclick="goToDetails(${p.id})">
                <div style="position:relative;">
                    <img src="${img}" alt="${p.name}" style="width:100%; height:180px; object-fit:cover;">
                    <i class="fa-solid fa-trash" 
                       style="position:absolute; top:8px; right:8px; background:white; color:red; padding:8px; border-radius:50%; z-index:10;" 
                       onclick="removeFav(event, ${p.id})"></i>
                </div>
                <div style="padding:10px;">
                    <p style="font-weight:bold; font-size:14px;">${p.name}</p>
                    <p style="font-size:16px; font-weight:bold; margin-top:5px;">₹${price}</p>
                    <button class="pill-btn" style="width:100%; margin-top:10px; background:#9c27b0; color:white; border:none; padding:8px; border-radius:5px;">Details Dekhein</button>
                </div>
            </div>`;
    }).join('');
}

// Naya function detail page par bhejne ke liye
function goToDetails(id) {
    window.location.href = `details.html?id=${id}`;
}

// Remove function (event.stopPropagation() ke saath taaki details page na khule jab delete karein)
function removeFav(event, id) {
    event.stopPropagation(); // Isse sirf delete hoga, details page nahi khulega
    let wishlist = JSON.parse(localStorage.getItem('myWishlist')) || [];
    wishlist = wishlist.filter(wishId => String(wishId) !== String(id));
    localStorage.setItem('myWishlist', JSON.stringify(wishlist));
    loadWishlist();
}
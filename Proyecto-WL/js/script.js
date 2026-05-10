document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES Y ESTADOS ---
    let WHATSAPP_NUMBER = ''; 
    let cart = JSON.parse(localStorage.getItem('carrito')) || {};
    let stockRealGlobal = []; 
    let productosAgrupados = []; 

    const container = document.getElementById('productos-container');
    const cartCountElement = document.getElementById('cart-count');
    const cartItemsList = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const checkoutButton = document.getElementById('checkout-button');
    const zoomOverlay = document.getElementById('zoomOverlay');
    const zoomImage = document.getElementById('zoomImage');

    const searchTrigger = document.getElementById('search-trigger');
    const searchInput = document.getElementById('product-search');
    const brandName = document.getElementById('brand-name'); // El elemento "COSMÉTICOS"

    function formatWhatsAppPrice(amount) {
        try {
            return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        } catch (e) {
            return '$ ' + amount.toString().replace(/\B(?=(\d{3})+(!=\d))/g, ".");
        }
    }

    // --- 1. CARGAR DATOS DESDE BD ---
    async function syncStock() {
        try {
            const response = await fetch('conexion.php', {
                method: 'GET',
                headers: { 
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });
            const text = await response.text();
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}') + 1;
            
            if (jsonStart === -1 || jsonEnd === 0) return;

            const cleanJson = text.substring(jsonStart, jsonEnd);
            const data = JSON.parse(cleanJson);
            
            if (data.status === "success") {
                productosAgrupados = data.productos || [];
                WHATSAPP_NUMBER = data.whatsapp || ''; 
                
                stockRealGlobal = [];
                productosAgrupados.forEach(p => {
                    p.tonos.forEach(t => {
                        stockRealGlobal.push({ 
                            nombre_id: t.nombre_completo, 
                            stock: t.stock, 
                            precio: p.precio 
                        });
                    });
                });
                renderizarTienda(productosAgrupados);
            }
        } catch (e) { console.error("Error en carga:", e); }
    }

    // --- 2. RENDERIZAR TIENDA ---
    function renderizarTienda(lista) {
        if (!container) return;
        container.innerHTML = '';
        lista.forEach(prod => {
            const agotadoGlobal = prod.tonos.every(t => parseInt(t.stock) <= 0);
            const imgPortada = prod.imagen_principal || (prod.tonos[0] ? prod.tonos[0].imagen : '');
            const col = document.createElement('div');
            col.className = 'col mb-5';
            col.innerHTML = `
                <div class="card h-100 shadow-sm border-0">
                    <img class="card-img-top" src="assets/${imgPortada}" style="height: 230px; object-fit: cover; cursor: pointer;">
                    <div class="card-body p-4 text-center">
                        <h5 class="fw-bolder" style="font-family: 'Oswald', sans-serif;">${prod.nombre}</h5>
                        ${prod.tonos.length > 1 ? `
                            <div class="tone-selector d-flex justify-content-center gap-2">
                                ${prod.tonos.map((t) => `
                                    <div class="tone-option ${parseInt(t.stock) <= 0 ? 'agotado' : ''}" 
                                         style="background-image: url('assets/${t.imagen}'); width:26px; height:26px; border-radius:50%; background-size:cover; border: 2px solid #ddd; cursor: pointer; opacity: ${parseInt(t.stock) <= 0 ? '0.2' : '1'}; pointer-events: ${parseInt(t.stock) <= 0 ? 'none' : 'auto'};" 
                                         data-tone="${t.tono}"
                                         data-full="${t.nombre_completo}">
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<div style="height:10px;"></div>'}
                        <p class="text-primary fw-bold fs-5 mb-0">${formatWhatsAppPrice(prod.precio)}</p>
                        <input type="hidden" class="selected-tone" value="${prod.tonos.length === 1 ? prod.tonos[0].tono : ''}">
                        <input type="hidden" class="selected-id" value="${prod.tonos.length === 1 ? prod.tonos[0].nombre_completo : ''}">
                    </div>
                    <div class="card-footer text-center">
                        <button class="btn ${agotadoGlobal ? 'btn-secondary' : 'btn-dark'} add-to-cart" ${agotadoGlobal ? 'disabled' : ''}>
                            ${agotadoGlobal ? 'Agotado' : 'Añadir al carrito'}
                        </button>
                    </div>
                </div>`;
            container.appendChild(col);
        });
    }

    // --- 3. EVENTOS ---
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('card-img-top')) {
            zoomImage.src = e.target.src;
            zoomOverlay.classList.add('active');
        }

        // LÓGICA DE TONOS (MARCAR / DESMARCAR)
        if (e.target.classList.contains('tone-option')) {
            const cardBody = e.target.closest('.card-body');
            const inputTone = cardBody.querySelector('.selected-tone');
            const inputId = cardBody.querySelector('.selected-id');
            
            // Si el que clicamos ya es el seleccionado, lo desmarcamos
            if (inputTone.value === e.target.dataset.tone) {
                e.target.style.border = "2px solid #ddd";
                inputTone.value = "";
                inputId.value = "";
            } else {
                // Si es uno nuevo, limpiamos los demás y marcamos este
                cardBody.querySelectorAll('.tone-option').forEach(opt => opt.style.border = "2px solid #ddd");
                e.target.style.border = "2px solid #000";
                inputTone.value = e.target.dataset.tone;
                inputId.value = e.target.dataset.full;
            }
        }

        const addBtn = e.target.closest('.add-to-cart');
        if (addBtn) {
            const card = addBtn.closest('.card');
            const fullName = card.querySelector('.selected-id').value;
            
            // Validación si no hay nada seleccionado (o se desmarcó)
            if (!fullName) return alert("Selecciona un tono.");

            const info = stockRealGlobal.find(i => i.nombre_id === fullName);
            const cantidadActual = (cart[fullName]?.quantity || 0);
            if (cantidadActual + 1 > parseInt(info.stock)) return alert(`Solo quedan ${info.stock} unidades.`);

            if (cart[fullName]) { cart[fullName].quantity++; } 
            else { cart[fullName] = { name: fullName, price: parseInt(info.precio), quantity: 1, image: card.querySelector('.card-img-top').src }; }
            
            updateCartCount();
            addBtn.textContent = '¡Listo!';
            addBtn.classList.replace('btn-dark', 'btn-success');
            setTimeout(() => {
                addBtn.textContent = 'Añadir al carrito';
                addBtn.classList.replace('btn-success', 'btn-dark');
            }, 1000);
        }

        const btnQty = e.target.closest('.btn-qty');
        if (btnQty) {
            const id = btnQty.dataset.id;
            if (btnQty.dataset.action === 'increase') {
                const info = stockRealGlobal.find(i => i.nombre_id === id);
                if (cart[id].quantity + 1 > parseInt(info.stock)) return alert("Stock máximo");
                cart[id].quantity++;
            } else {
                cart[id].quantity > 1 ? cart[id].quantity-- : delete cart[id];
            }
            updateCartCount(); renderCart();
        }

        if (e.target.closest('.btn-remove')) {
            delete cart[e.target.closest('.btn-remove').dataset.id];
            updateCartCount(); renderCart();
        }
    });

    function updateCartCount() {
        let count = Object.values(cart).reduce((t, i) => t + i.quantity, 0);
        cartCountElement.textContent = count;
        localStorage.setItem('carrito', JSON.stringify(cart));
    }

    function renderCart() {
        cartItemsList.innerHTML = '';
        const items = Object.keys(cart);
        if (items.length === 0) {
            emptyCartMessage.classList.replace('d-none', 'd-flex');
            checkoutButton.disabled = true;
        } else {
            emptyCartMessage.classList.replace('d-flex', 'd-none');
            checkoutButton.disabled = false;
            items.forEach(id => {
                const item = cart[id];
                const li = document.createElement('li');
                li.className = 'list-group-item border-0 mb-3 shadow-sm rounded p-3';
                li.innerHTML = `
                    <div style="display: grid; grid-template-columns: 50px 1fr auto; gap: 12px; align-items: center;">
                        <img src="${item.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                        <div>
                            <p class="mb-0 fw-bold small">${item.name}</p>
                            <small class="text-muted">${formatWhatsAppPrice(item.price)}</small>
                        </div>
                        <span class="fw-bold text-primary small">${formatWhatsAppPrice(item.price * item.quantity)}</span>
                    </div>
                    <div class="d-flex justify-content-between mt-2 pt-2 border-top">
                        <div class="input-group input-group-sm" style="width: 80px;">
                            <button class="btn btn-dark btn-qty" data-id="${id}" data-action="decrease">-</button>
                            <input type="text" class="form-control text-center p-0" value="${item.quantity}" readonly>
                            <button class="btn btn-dark btn-qty" data-id="${id}" data-action="increase">+</button>
                        </div>
                        <button class="btn btn-sm btn-remove" data-id="${id}"><i class="bi bi-trash"></i></button>
                    </div>`;
                cartItemsList.appendChild(li);
            });
        }
        cartTotalElement.textContent = formatWhatsAppPrice(Object.values(cart).reduce((t, i) => t + (i.price * i.quantity), 0));
    }

    checkoutButton.addEventListener('click', () => {
        const items = Object.values(cart);
        if (items.length === 0) return;
        let detalleHTML = ""; let detalleBD = ""; let totalVal = 0;
        items.forEach(i => {
            const subtotal = i.price * i.quantity;
            totalVal += subtotal;
            detalleHTML += `<div class="d-flex justify-content-between mb-1"><span>${i.quantity}x ${i.name}</span><span>${formatWhatsAppPrice(subtotal)}</span></div>`;
            detalleBD += `${i.quantity}x ${i.name}, `;
        });
        window.tempPedido = { detalle: detalleBD.slice(0, -2), total: totalVal, resumenMsg: items.map(i => `* ${i.name} (x${i.quantity})`).join('\n') };
        document.getElementById('resumen-pedido-detalle').innerHTML = `${detalleHTML}<hr class="my-2"><div class="d-flex justify-content-between fw-bold"><span>TOTAL:</span><span class="text-primary">${formatWhatsAppPrice(totalVal)}</span></div>`;
        bootstrap.Modal.getInstance(document.getElementById('cartModal')).hide();
        new bootstrap.Modal(document.getElementById('modalConfirmar')).show();
    });

    window.enviarPedidoBD = async function() {
        const nombreCliente = document.getElementById('nombre-cliente').value.trim();
        if (!nombreCliente) return alert("Por favor, ingresa tu nombre.");
        const btnConfirmar = document.querySelector('.btn-realizar');
        btnConfirmar.disabled = true;
        try {
            const formData = new FormData();
            formData.append('cliente', nombreCliente);
            formData.append('productos_detalle', window.tempPedido.detalle);
            formData.append('total', window.tempPedido.total);
            const saveRes = await fetch('guardar_pedido.php', { method: 'POST', body: formData });
            const saveStatus = await saveRes.text();
            if (saveStatus.includes("OK")) {
                let msg = `¡HOLA WENLAU! MI PEDIDO:\n\n*Cliente:* ${nombreCliente}\n*Detalle:*\n${window.tempPedido.resumenMsg}\n\n*TOTAL:* ${formatWhatsAppPrice(window.tempPedido.total)}`;
                cart = {}; updateCartCount(); localStorage.removeItem('carrito');
                window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
            } else { alert("Error al guardar."); btnConfirmar.disabled = false; }
        } catch (e) { alert("Error de conexión."); btnConfirmar.disabled = false; }
    };

    // --- BUSCADOR CORREGIDO PARA MÓVIL ---
    if (searchTrigger && searchInput) {
        searchTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = searchInput.classList.toggle('active');
            
            if (window.innerWidth < 768) {
                if (isActive) {
                    brandName.style.fontSize = "14px"; 
                    brandName.style.opacity = "0.5";   
                } else {
                    brandName.style.fontSize = "";     
                    brandName.style.opacity = "";
                }
            }
            
            if (isActive) searchInput.focus();
        });

        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const filtrados = productosAgrupados.filter(p => p.nombre.toLowerCase().includes(query));
            renderizarTienda(filtrados);
        });
    }

    document.getElementById('cartModal').addEventListener('show.bs.modal', renderCart);
    zoomOverlay?.addEventListener('click', () => zoomOverlay.classList.remove('active'));
    syncStock();
    updateCartCount();
});
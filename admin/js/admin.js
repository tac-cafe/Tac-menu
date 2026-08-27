let currentView = 'banners';
let editingItemId = null;
let currentCollection = null;
let imageBase64 = null;

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initNavigation();

    // Restore saved view state
    const savedView = localStorage.getItem('admin_last_view') || 'banners';
    
    // Update active nav link
    document.querySelectorAll('.nav-link[data-view]').forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('data-view') === savedView) {
            l.classList.add('active');
        }
    });
    
    renderView(savedView);
});

function initNavigation() {
    document.querySelectorAll('.nav-link[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-link[data-view]').forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const view = e.currentTarget.getAttribute('data-view');
            
            // Save state
            localStorage.setItem('admin_last_view', view);
            
            renderView(view);
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('sidebarOverlay')?.classList.remove('active');
            }
        });
    });

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    function openSidebar() {
        sidebar.classList.add('open');
        if(overlay) overlay.classList.add('active');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        if(overlay) overlay.classList.remove('active');
    }

    document.getElementById('mobileNavBtn').addEventListener('click', openSidebar);
    document.getElementById('mobileCloseBtn')?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);
    
    document.getElementById('saveBtn').addEventListener('click', saveItem);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await supabaseClient.auth.signOut();
                window.location.href = '../login/';
            } catch (error) {
                showToast('Failed to logout', 'error');
            }
        });
    }
    
    const confirmBtn = document.getElementById('confirmActionBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if(confirmCallback) confirmCallback();
            closeConfirmModal();
        });
    }
}

async function renderView(view) {
    currentView = view;
    const titleEl = document.getElementById('pageTitle');
    const container = document.getElementById('viewContainer');
    const actions = document.getElementById('headerActions');
    
    // Set title immediately so it doesn't flash "Banners"
    if (view === 'banners') titleEl.textContent = 'Banners';
    else if (view === 'recommended') titleEl.textContent = 'Recommended';
    else if (view === 'products') titleEl.textContent = 'Products';
    else if (view === 'categories') titleEl.textContent = 'Categories';
    else if (view === 'orders') titleEl.textContent = 'Orders';
    else if (view === 'settings') titleEl.textContent = 'Settings';

    actions.innerHTML = '';

    if (['banners', 'recommended', 'products', 'categories'].includes(view)) {
        container.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:300px; flex-direction:column; gap:16px;">
                <i data-lucide="loader-2" class="spin" style="width:40px;height:40px;color:var(--color-primary)"></i>
                <span style="color:var(--color-text-secondary);font-weight:500;">Loading ${view}...</span>
            </div>
        `;
        lucide.createIcons();
        await DataService.loadCollection(view);
    }
    
    switch(view) {
        case 'banners':
            currentCollection = 'banners';
            actions.innerHTML = `<button class="btn btn-primary" onclick="openModal('banners')"><i data-lucide="plus"></i> Add Banner</button>`;
            renderTable(container, 'banners');
            break;
        case 'recommended':
            currentCollection = 'recommended';
            actions.innerHTML = `<button class="btn btn-primary" onclick="openModal('recommended')"><i data-lucide="plus"></i> Add Item</button>`;
            renderTable(container, 'recommended');
            break;
        case 'products':
            currentCollection = 'products';
            
            actions.innerHTML = `
                <div class="actions-wrapper">
                    <div class="custom-dropdown" id="categoryDropdownContainer">
                        <div class="dropdown-trigger" onclick="toggleDropdown()">
                            <span id="dropdownSelectedText">All Categories</span>
                            <i data-lucide="chevron-down" class="dropdown-icon"></i>
                        </div>
                        <div class="dropdown-options" id="categoryOptionsList">
                            <div class="dropdown-option selected" onclick="selectCategory(this, '', 'All Categories')">All Categories</div>
                            ${DataService.getData('categories').map(c => `
                                <div class="dropdown-option" onclick="selectCategory(this, '${c.title.toLowerCase()}', '${c.title.replace(/'/g, "\\'")}')">${c.title}</div>
                            `).join('')}
                        </div>
                        <input type="hidden" id="categoryFilter" value="">
                    </div>
                    <button class="btn btn-primary" onclick="openModal('products')"><i data-lucide="plus"></i> Add Product</button>
                </div>
            `;
            renderTable(container, 'products');
            break;
        case 'categories':
            currentCollection = 'categories';
            actions.innerHTML = `<button class="btn btn-primary" onclick="openModal('categories')"><i data-lucide="plus"></i> Add Category</button>`;
            renderTable(container, 'categories');
            break;
    }
    lucide.createIcons();
}

function renderTable(container, collection) {
    const data = DataService.getData(collection);
    
    // Clear search and filters on render if they exist
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.value = '';
        const selectedText = document.getElementById('dropdownSelectedText');
        if(selectedText) selectedText.innerText = 'All Categories';
        
        const options = document.querySelectorAll('#categoryOptionsList .dropdown-option');
        options.forEach(opt => opt.classList.remove('selected'));
        if(options.length > 0) options[0].classList.add('selected');
    }

    let html = `
        <table class="data-table ${collection}-table" id="dataTable">
            <thead>
                <tr>
                    ${getTableHeaders(collection)}
                    <th style="width: 120px;">Status</th>
                    <th style="width: 120px;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => `
                    <tr>
                        ${getTableRow(collection, item)}
                        <td data-label="Status">
                            <span class="status-badge ${item.status ? 'enabled' : 'disabled'}">
                                ${item.status ? 'Enabled' : 'Disabled'}
                            </span>
                        </td>
                        <td data-label="Actions">
                            <div class="actions">
                                <button class="action-btn edit-btn" onclick="openModal('${collection}', '${item.id}')" title="Edit"><i data-lucide="edit"></i></button>
                                <button class="action-btn toggle-btn" onclick="toggleStatus('${collection}', '${item.id}')" title="${item.status ? 'Hide' : 'Show'}"><i data-lucide="${item.status ? 'eye-off' : 'eye'}"></i></button>
                                <button class="action-btn delete-btn" onclick="deleteItem('${collection}', '${item.id}')" title="Delete"><i data-lucide="trash-2"></i></button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
                ${data.length === 0 ? '<tr><td colspan="10" style="text-align:center;">No items found.</td></tr>' : ''}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    lucide.createIcons();
}

function getTableHeaders(collection) {
    switch(collection) {
        case 'banners': return `<th style="width: 100px;">Image</th><th>Alt Text</th>`;
        case 'categories': return `<th style="width: 100px;">Icon</th><th>Title</th><th>Target ID</th>`;
        case 'recommended': return `<th style="width: 100px;">Image</th><th>Title</th><th>Price</th>`;
        case 'products': return `<th>Name</th><th>Category</th><th>Price</th>`;
    }
}

function getTableRow(collection, item) {
    switch(collection) {
        case 'banners': 
            return `<td data-label="Image"><img src="${item.image}" class="item-image" alt="banner"></td><td data-label="Alt Text"><strong>${item.altText || 'Untitled'}</strong></td>`;
        case 'categories': 
            return `<td data-label="Icon"><div class="item-image" style="display:flex; justify-content:center; align-items:center;"><i data-lucide="${item.icon}" style="color:var(--color-icon-secondary)"></i></div></td><td data-label="Title"><strong>${item.title}</strong></td><td data-label="Target ID">${item.targetId}</td>`;
        case 'recommended': 
            return `<td data-label="Image"><img src="${item.image}" class="item-image" alt="item"></td><td data-label="Title"><strong>${item.title}</strong></td><td data-label="Price">${item.price}</td>`;
        case 'products': 
            const cat = DataService.getData('categories').find(c => c.id === item.categoryId);
            let displayPrice = item.price ? '₹' + item.price : '-';
            if (item.variants && item.variants.length > 0) {
                displayPrice = item.variants.length + ' Variants';
            }
            return `<td data-label="Name"><strong>${item.name}</strong></td><td data-label="Category">${cat ? cat.title : '-'}</td><td data-label="Price">${displayPrice}</td>`;
    }
}

function filterTable() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter');
    const selectedCategory = categoryFilter ? categoryFilter.value.toLowerCase() : '';
    
    const rows = document.querySelectorAll('#dataTable tbody tr');
    rows.forEach(row => {
        // Skip empty state row
        if(row.querySelector('td[colspan]')) return;
        
        let matchesSearch = row.innerText.toLowerCase().includes(input);
        
        let matchesCategory = true;
        if (selectedCategory && currentCollection === 'products') {
            const categoryCell = row.querySelector('td:nth-child(2)');
            if (categoryCell) {
                matchesCategory = categoryCell.innerText.toLowerCase().trim() === selectedCategory;
            }
        }

        if(matchesSearch && matchesCategory) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Custom Dropdown Logic
function toggleDropdown() {
    const dropdown = document.getElementById('categoryDropdownContainer');
    if(dropdown) {
        dropdown.classList.toggle('open');
    }
}

function selectCategory(element, value, text) {
    document.getElementById('dropdownSelectedText').innerText = text;
    document.getElementById('categoryFilter').value = value;
    
    // Update selected state
    const options = document.querySelectorAll('#categoryOptionsList .dropdown-option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    if(element) {
        element.classList.add('selected');
    }

    toggleDropdown();
    filterTable();
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('categoryDropdownContainer');
    if(dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

async function toggleStatus(collection, id) {
    const items = DataService.getData(collection);
    const item = items.find(i => i.id === id);
    if(item) {
        const newStatus = !item.status;
        try {
            await DataService.updateItem(collection, id, { status: newStatus });
            renderTable(document.getElementById('viewContainer'), collection);
            showToast(`Item ${newStatus ? 'enabled' : 'disabled'} successfully`);
        } catch (e) {
            showToast('Failed to update status', 'error');
        }
    }
}

function deleteItem(collection, id) {
    showConfirm('Are you sure you want to delete this item?', async () => {
        try {
            const item = DataService.getData(collection).find(i => i.id === id);
            
            await DataService.deleteItem(collection, id);
            
            // Delete image from storage if it exists
            if (item && item.image && item.image.includes('/storage/v1/object/public/images/')) {
                await DataService.deleteImage(item.image);
            }
            
            renderTable(document.getElementById('viewContainer'), collection);
            showToast('Item deleted successfully');
        } catch (e) {
            showToast('Failed to delete item', 'error');
        }
    });
}

// Modal Logic
function openModal(collection, id = null) {
    editingItemId = id;
    imageBase64 = null;
    
    document.getElementById('modalTitle').textContent = id ? 'Edit Item' : 'Add Item';
    const formContent = document.getElementById('modalFormContent');
    
    let item = {};
    if(id) {
        item = DataService.getData(collection).find(i => i.id === id) || {};
        imageBase64 = item.image || null;
    } else {
        item.status = true;
        const items = DataService.getData(collection);
        item.order = items.length > 0 ? Math.max(...items.map(i => parseInt(i.order) || 0)) + 1 : 1;
    }
    
    formContent.innerHTML = generateForm(collection, item);
    if(collection === 'products' || collection === 'recommended') {
        renderVariantsList();
    }
    updatePreview(collection);
    
    // Add event listeners for live preview
    const inputs = formContent.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => updatePreview(collection));
    });
    
    document.getElementById('formModal').classList.add('active');
    lucide.createIcons();
}

// Variant Handlers
window.renderVariantsList = function() {
    const container = document.getElementById('variantsContainer');
    if(!container) return;
    const variantsInput = document.getElementById('f_variants');
    let variants = [];
    try { variants = JSON.parse(variantsInput.value); } catch(e){}
    
    container.innerHTML = variants.map((v, i) => `
        <div class="variant-row" style="display:flex; gap:8px; align-items:center; margin-bottom: 8px; width: 100%;">
            <input type="text" placeholder="Name" value="${v.name || ''}" oninput="updateVariant(${i}, 'name', this.value)" style="flex:1; min-width:0; padding:12px; border:1px solid var(--color-border-standard); border-radius:8px; font-size:14px; background:var(--color-surface-outer); color:var(--color-text-primary); transition:all 0.2s ease; outline:none;">
            <input type="text" placeholder="Price" value="${v.price || ''}" oninput="updateVariant(${i}, 'price', this.value)" style="width:70px; flex-shrink:0; padding:12px; border:1px solid var(--color-border-standard); border-radius:8px; font-size:14px; background:var(--color-surface-outer); color:var(--color-text-primary); transition:all 0.2s ease; outline:none;">
            <button type="button" onclick="removeVariant(${i})" style="width:42px; height:42px; flex-shrink:0; display:flex; align-items:center; justify-content:center; padding:0; border:none; background:rgba(255,59,48,0.1); color:#ff3b30; border-radius:8px; cursor:pointer; transition:all 0.2s ease;"><i data-lucide="trash-2" style="width:18px;height:18px;"></i></button>
        </div>
    `).join('');
    
    // Handle Base Price disabling if variants exist
    const basePriceInput = document.getElementById('f_price');
    const basePriceLabel = document.getElementById('f_price_label');
    if (basePriceInput) {
        if (variants.length > 0) {
            basePriceInput.disabled = true;
            basePriceInput.style.opacity = '0.5';
            basePriceInput.style.backgroundColor = 'var(--color-surface-main)';
            if (basePriceLabel) basePriceLabel.style.opacity = '0.5';
        } else {
            basePriceInput.disabled = false;
            basePriceInput.style.opacity = '1';
            basePriceInput.style.backgroundColor = 'var(--color-surface-outer)';
            if (basePriceLabel) basePriceLabel.style.opacity = '1';
        }
    }
    
    lucide.createIcons();
}

window.updateVariant = function(index, field, value) {
    const variantsInput = document.getElementById('f_variants');
    let variants = [];
    try { variants = JSON.parse(variantsInput.value); } catch(e){}
    if(variants[index]) {
        variants[index][field] = value;
        variantsInput.value = JSON.stringify(variants);
        updatePreview(currentCollection);
    }
}

window.addVariantField = function() {
    const variantsInput = document.getElementById('f_variants');
    let variants = [];
    try { variants = JSON.parse(variantsInput.value); } catch(e){}
    variants.push({name: '', price: ''});
    variantsInput.value = JSON.stringify(variants);
    renderVariantsList();
    updatePreview(currentCollection);
}

window.removeVariant = function(index) {
    const variantsInput = document.getElementById('f_variants');
    let variants = [];
    try { variants = JSON.parse(variantsInput.value); } catch(e){}
    variants.splice(index, 1);
    variantsInput.value = JSON.stringify(variants);
    renderVariantsList();
    updatePreview(currentCollection);
}

function closeModal() {
    document.getElementById('formModal').classList.remove('active');
}

let cropper = null;

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('cropperModal').classList.add('active');
            const cropperImage = document.getElementById('cropperImage');
            cropperImage.src = e.target.result;
            
            if(cropper) cropper.destroy();
            
            setTimeout(() => {
                // Force 1:1 ratio for all images
                const ratio = 1;
                cropper = new Cropper(cropperImage, {
                    aspectRatio: ratio,
                    viewMode: 1,
                    autoCropArea: 1
                });
            }, 50);
            
            event.target.value = ''; // Reset input
        }
        reader.readAsDataURL(file);
    }
}

function closeCropperModal() {
    document.getElementById('cropperModal').classList.remove('active');
    if(cropper) {
        cropper.destroy();
        cropper = null;
    }
}

function applyCrop() {
    if(cropper) {
        // Compress the image by restricting max dimensions and converting to WebP
        const canvas = cropper.getCroppedCanvas({
            maxWidth: 1024,
            maxHeight: 1024
        });
        
        // Export as WebP format with 80% quality for drastic size reduction
        imageBase64 = canvas.toDataURL('image/webp', 0.8);
        
        const previewImg = document.getElementById('uploadPreviewImg');
        if(previewImg) {
            previewImg.src = imageBase64;
            previewImg.style.display = 'block';
        }
        updatePreview(currentCollection);
        closeCropperModal();
    }
}

function generateForm(collection, item) {
    let html = '';
    
    // Common Image field for banners and recommended
    if(collection === 'banners' || collection === 'recommended') {
        html += `
            <div class="form-group">
                <label>Image</label>
                <div class="image-upload" onclick="document.getElementById('imageInput').click()">
                    <i data-lucide="upload-cloud"></i>
                    <span>Click or drag to upload image</span>
                    <input type="file" id="imageInput" style="display:none;" accept="image/*" onchange="handleImageUpload(event)">
                    ${item.image ? `<img id="uploadPreviewImg" src="${item.image}">` : '<img id="uploadPreviewImg" src="" style="display:none;">'}
                </div>
            </div>
        `;
    }
    
    if(collection === 'banners') {
        html += `
            <div class="form-group"><label>Alt Text</label><input type="text" id="f_altText" value="${item.altText || ''}"></div>
        `;
    }
    
    if(collection === 'categories') {
        html += `
            <div class="form-group"><label>Title</label><input type="text" id="f_title" value="${item.title || ''}"></div>
            <div class="form-group"><label>Target ID (e.g. mocktails)</label><input type="text" id="f_targetId" value="${item.targetId || ''}"></div>
            <div class="form-group"><label>Lucide Icon Name</label><input type="text" id="f_icon" value="${item.icon || 'star'}"></div>
        `;
    }
    
    if(collection === 'recommended') {
        const variantsJson = item.variants ? JSON.stringify(item.variants).replace(/"/g, '&quot;') : '[]';
        html += `
            <div class="form-group"><label>Title</label><input type="text" id="f_title" value="${item.title || ''}"></div>
            <div class="form-group"><label>Caption (Pop-up only)</label><input type="text" id="f_caption" value="${item.caption || ''}"></div>
            <div class="form-group" id="basePriceGroup">
                <label id="f_price_label" ${item.variants && item.variants.length > 0 ? 'style="opacity: 0.5;"' : ''}>Base Price</label>
                <input type="text" id="f_price" value="${item.price || ''}" ${item.variants && item.variants.length > 0 ? 'disabled style="opacity: 0.5; background: var(--color-surface-main);"' : ''}>
            </div>
            <div class="form-group">
                <label style="display:flex; justify-content:space-between; align-items:center;">
                    Variants (Optional)
                    <button type="button" class="btn btn-secondary" onclick="addVariantField()" style="height:32px; padding:0 12px; font-size:13px;"><i data-lucide="plus" style="width:14px;height:14px;"></i>Add</button>
                </label>
                <div id="variantsContainer" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
                <input type="hidden" id="f_variants" value="${variantsJson}">
            </div>
        `;
    }
    
    if(collection === 'products') {
        const categories = DataService.getData('categories');
        const variantsJson = item.variants ? JSON.stringify(item.variants).replace(/"/g, '&quot;') : '[]';
        html += `
            <div class="form-group"><label>Name</label><input type="text" id="f_name" value="${item.name || ''}"></div>
            <div class="form-group"><label>Description / Ingredients (optional)</label><input type="text" id="f_description" value="${item.description || ''}"></div>
            <div class="form-group"><label>Caption (Pop-up only)</label><input type="text" id="f_caption" value="${item.caption || ''}"></div>
            <div class="form-group" id="basePriceGroup">
                <label id="f_price_label" ${item.variants && item.variants.length > 0 ? 'style="opacity: 0.5;"' : ''}>Base Price</label>
                <input type="text" id="f_price" value="${item.price || ''}" ${item.variants && item.variants.length > 0 ? 'disabled style="opacity: 0.5; background: var(--color-surface-main);"' : ''}>
            </div>
            <div class="form-group">
                <label style="display:flex; justify-content:space-between; align-items:center;">
                    Variants (Optional)
                    <button type="button" class="btn btn-secondary" onclick="addVariantField()" style="height:32px; padding:0 12px; font-size:13px;"><i data-lucide="plus" style="width:14px;height:14px;"></i>Add</button>
                </label>
                <div id="variantsContainer" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
                <input type="hidden" id="f_variants" value="${variantsJson}">
            </div>
            <div class="form-group"><label>Category</label>
                <select id="f_categoryId">
                    ${categories.map(c => `<option value="${c.id}" ${item.categoryId === c.id ? 'selected' : ''}>${c.title}</option>`).join('')}
                </select>
            </div>
        `;
    }
    
    // Common fields
    html += `
        <input type="hidden" id="f_order" value="${item.order || 1}">
        <div class="form-group"><label>Status</label>
            <label class="toggle-switch">
                <input type="checkbox" id="f_status" ${item.status !== false ? 'checked' : ''} onchange="document.getElementById('f_status_label').innerText = this.checked ? 'Enabled' : 'Disabled'">
                <span class="slider"></span>
                <span class="toggle-label" id="f_status_label">${item.status !== false ? 'Enabled' : 'Disabled'}</span>
            </label>
        </div>
    `;
    
    return html;
}

function updatePreview(collection) {
    const preview = document.getElementById('modalPreviewContent');
    
    if(collection === 'banners') {
        const img = imageBase64 || document.getElementById('uploadPreviewImg')?.src || '';
        preview.innerHTML = `
            <div class="preview-wrapper">
                <img src="${img}" class="banner-preview-img" alt="Banner Preview">
            </div>
        `;
    } else if(collection === 'categories') {
        const title = document.getElementById('f_title')?.value || 'Title';
        const icon = document.getElementById('f_icon')?.value || 'star';
        preview.innerHTML = `
            <div style="background:var(--color-surface-outer); width:60px; height:60px; border-radius:50%; display:flex; justify-content:center; align-items:center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); color:var(--color-text-primary);">
                <i data-lucide="${icon}"></i>
            </div>
            <span style="font-size:11px; font-weight:600; color:var(--color-icon-secondary); margin-top:8px; text-transform:uppercase;">${title}</span>
        `;
        lucide.createIcons();
    } else if(collection === 'recommended') {
        const title = document.getElementById('f_title')?.value || 'Title';
        const price = document.getElementById('f_price')?.value || '';
        let variants = [];
        try { variants = JSON.parse(document.getElementById('f_variants')?.value || '[]'); } catch(e){}
        const img = imageBase64 || document.getElementById('uploadPreviewImg')?.src || '';
        const caption = document.getElementById('f_caption')?.value || '';
        
        let priceStr = '';
        if (variants && variants.length > 0) {
            priceStr = variants.map(v => '₹' + v.price).join(', ');
        } else if (price) {
            priceStr = price.startsWith('₹') || isNaN(price[0]) ? price : '₹' + price;
        }
        
        let variantsHtml = '';
        if (variants && variants.length > 0) {
            variantsHtml = '<div class="variants-list" style="display:flex; flex-direction:column;">' + 
                variants.map((v, index) => `
                    <div class="variant-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; ${index === 0 ? '' : 'border-top:1px dashed var(--color-border-dashed);'}">
                        <span class="variant-name" style="font-weight:500; font-size:15px;">${v.name}</span>
                        <span class="variant-price" style="font-weight:600; font-size:15px;">₹${v.price}</span>
                    </div>
                `).join('') + 
            '</div>';
        }

        preview.innerHTML = `
            <div class="preview-wrapper" style="display: flex; flex-direction: column; gap: 24px; align-items: center; padding-bottom: 40px; width: 100%;">
                <div style="width: 100%; text-align: center; color: var(--color-icon-secondary); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: -10px;">Card Preview (Click to view pop-up)</div>
                <div class="food-card-preview" style="cursor: pointer;" onclick="document.getElementById('adminFoodModal').classList.add('active')">
                    <div class="card-image-wrap-preview">
                        ${img ? `<img src="${img}">` : '<div style="width:100%; height:100%; background:var(--color-border-standard);"></div>'}
                    </div>
                    <div class="card-content-preview">
                        <h3 class="food-title-preview">${title}</h3>
                        <div class="price-row-preview">
                            <span class="price-preview">${priceStr}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="food-modal-overlay" id="adminFoodModal" onclick="if(event.target===this) this.classList.remove('active')" style="z-index: 10001;">
                <div class="food-modal">
                    <button class="food-modal-close" onclick="document.getElementById('adminFoodModal').classList.remove('active')"><i data-lucide="x"></i></button>
                    <h2 class="food-modal-title">${title}</h2>
                    ${caption ? `<div class="food-modal-subtitle">${caption}</div>` : ''}
                    <div class="food-modal-price" style="border-top: none; padding-top: 0;">${variantsHtml || priceStr}</div>
                </div>
            </div>
        `;
        lucide.createIcons();
    } else if(collection === 'products') {
        const name = document.getElementById('f_name')?.value || 'Product Name';
        const desc = document.getElementById('f_description')?.value || '';
        const price = document.getElementById('f_price')?.value || '';
        const caption = document.getElementById('f_caption')?.value || '';
        let priceStr = price ? (price.startsWith('₹') || isNaN(price[0]) ? price : '₹' + price) : '';
        
        let variantsHtml = '';
        let listPricesHtml = priceStr;
        try {
            const variantsInput = document.getElementById('f_variants');
            if (variantsInput) {
                const variants = JSON.parse(variantsInput.value);
                if (variants && variants.length > 0) {
                    variantsHtml = '<div style="display:flex; flex-direction:column;">' + 
                        variants.map((v, index) => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; ${index === 0 ? '' : 'border-top:1px dashed rgba(44,36,27,0.1);'}">
                                <span style="font-weight:500; font-size:15px;">${v.name || 'Variant'}</span>
                                <span style="font-weight:600; font-size:15px;">₹${v.price || '0'}</span>
                            </div>
                        `).join('') + 
                    '</div>';
                    
                    let groups = [];
                    for(let i=0; i<variants.length; i+=2) {
                        groups.push(variants.slice(i, i+2).map(v => '₹' + (v.price || '0')).join(', '));
                    }
                    listPricesHtml = `<div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                        ${groups.map(g => `<span class="menu-item-price-preview" style="line-height:1.2;">${g}</span>`).join('')}
                    </div>`;
                }
            }
        } catch(e) {}
        
        let modalPriceHtml = variantsHtml ? variantsHtml : priceStr;

        preview.innerHTML = `
            <div class="preview-wrapper" style="display: flex; flex-direction: column; gap: 24px; align-items: center; padding-bottom: 40px; width: 100%;">
                <div style="width: 100%; text-align: center; color: var(--color-icon-secondary); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: -10px;">List Item Preview (Click to view pop-up)</div>
                <div class="menu-card" style="margin-bottom: 0; cursor: pointer;" onclick="document.getElementById('adminFoodModal').classList.add('active')">
                    <div class="menu-card-item-preview" style="width: 100%;">
                        <div class="menu-item-header-preview">
                            <h3 class="menu-item-name-preview">${name} 
                                ${desc ? `<em>(${desc})</em>` : ''}
                            </h3>
                            <div class="menu-item-dots-preview"></div>
                            ${variantsHtml ? listPricesHtml : (priceStr ? `<span class="menu-item-price-preview">${priceStr}</span>` : '')}
                        </div>
                    </div>
                </div>
            </div>

            <div class="food-modal-overlay" id="adminFoodModal" onclick="if(event.target===this) this.classList.remove('active')" style="z-index: 10001;">
                <div class="food-modal">
                    <button class="food-modal-close" onclick="document.getElementById('adminFoodModal').classList.remove('active')"><i data-lucide="x"></i></button>
                    <h2 class="food-modal-title">${name}</h2>
                    <div class="food-modal-subtitle">${desc ? `(${desc})` : ''}</div>
                    <div class="food-modal-desc">${caption}</div>
                    <div class="food-modal-price">${modalPriceHtml}</div>
                </div>
            </div>
        `;
        lucide.createIcons();
    }
}

async function saveItem() {
    const btn = document.getElementById('saveBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Saving...';
    btn.disabled = true;
    lucide.createIcons();
    
    try {
        const item = {};
        
        if(currentCollection === 'banners') {
            item.altText = document.getElementById('f_altText').value;
            let imgData = imageBase64 || document.getElementById('uploadPreviewImg').src;
            if (imgData && imgData.startsWith('data:image')) {
                btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Uploading Image...';
                lucide.createIcons();
                item.image = await DataService.uploadImage(imgData);
                
                // If editing and we just uploaded a new image, delete the old one to save space
                if (editingItemId) {
                    const oldItem = DataService.getData(currentCollection).find(i => i.id === editingItemId);
                    if (oldItem && oldItem.image) {
                        await DataService.deleteImage(oldItem.image);
                    }
                }
                
                btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Saving...';
                lucide.createIcons();
            } else {
                item.image = imgData;
            }
        } else if(currentCollection === 'categories') {
            item.title = document.getElementById('f_title').value;
            item.targetId = document.getElementById('f_targetId').value;
            item.icon = document.getElementById('f_icon').value;
        } else if(currentCollection === 'recommended') {
            item.title = document.getElementById('f_title').value;
            item.price = document.getElementById('f_price').value;
            try {
                item.variants = JSON.parse(document.getElementById('f_variants').value);
            } catch(e) {
                item.variants = [];
            }
            item.caption = document.getElementById('f_caption')?.value || '';
            let imgData = imageBase64 || document.getElementById('uploadPreviewImg').src;
            if (imgData && imgData.startsWith('data:image')) {
                btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Uploading Image...';
                lucide.createIcons();
                item.image = await DataService.uploadImage(imgData);
                
                // If editing and we just uploaded a new image, delete the old one to save space
                if (editingItemId) {
                    const oldItem = DataService.getData(currentCollection).find(i => i.id === editingItemId);
                    if (oldItem && oldItem.image) {
                        await DataService.deleteImage(oldItem.image);
                    }
                }

                btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Saving...';
                lucide.createIcons();
            } else {
                item.image = imgData;
            }
        } else if(currentCollection === 'products') {
            item.name = document.getElementById('f_name').value;
            item.description = document.getElementById('f_description').value;
            item.caption = document.getElementById('f_caption')?.value || '';
            item.price = document.getElementById('f_price').value;
            item.categoryId = document.getElementById('f_categoryId').value;
            try {
                item.variants = JSON.parse(document.getElementById('f_variants').value);
            } catch(e) {
                item.variants = [];
            }
        }
        
        item.order = parseInt(document.getElementById('f_order').value) || 1;
        item.status = document.getElementById('f_status').checked;
        
        if(editingItemId) {
            await DataService.updateItem(currentCollection, editingItemId, item);
            showToast('Item updated successfully');
        } else {
            await DataService.addItem(currentCollection, item);
            showToast('Item added successfully');
        }
        
        closeModal();
        renderTable(document.getElementById('viewContainer'), currentCollection);
    } catch (e) {
        showToast('Failed to save item', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
    }
}

// --- Toast & Confirm Logic ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    // Remove older toasts if there are too many
    while (container.children.length >= 3) {
        container.removeChild(container.firstChild);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'check-circle';
    if(type === 'error') icon = 'alert-circle';
    if(type === 'info') icon = 'info';
    
    toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2500);
}

let confirmCallback = null;

function showConfirm(message, callback) {
    const modal = document.getElementById('confirmModal');
    if (!modal) {
        // Fallback if HTML wasn't added
        if(confirm(message)) callback();
        return;
    }
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    modal.classList.add('active');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('active');
    confirmCallback = null;
}

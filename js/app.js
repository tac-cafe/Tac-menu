async function initApp() {
    try {
        const [
            { data: banners },
            { data: categories },
            { data: recommended },
            { data: products }
        ] = await Promise.all([
            supabaseClient.from('banners').select('*').eq('status', true).order('order', { ascending: true }),
            supabaseClient.from('categories').select('*').eq('status', true).order('order', { ascending: true }),
            supabaseClient.from('recommended').select('*').eq('status', true).order('order', { ascending: true }),
            supabaseClient.from('products').select('*').eq('status', true).order('order', { ascending: true })
        ]);

        renderBanners(banners);
        renderCategories(categories);
        renderMenu(categories, recommended, products);

        lucide.createIcons();
        if (typeof window.initNativeScripts === 'function') window.initNativeScripts();

    } catch (err) {
        console.error('Error loading data', err);
    } finally {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }
}

function renderBanners(banners) {
    const carousel = document.querySelector('.banner-carousel');
    const dotsContainer = document.querySelector('.carousel-dots');
    
    if (!banners || banners.length === 0 || !carousel) return;

    carousel.innerHTML = banners.map((b, index) => `<img src="${b.image}" alt="${b.altText || 'Banner'}" class="banner-image" ${index === 0 ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'}>`).join('');
    
    if (dotsContainer) {
        dotsContainer.innerHTML = banners.map((b, i) => `<div class="dot ${i === 0 ? 'active' : ''}"></div>`).join('');
    }
}

function renderCategories(categories) {
    const container = document.getElementById('category-chips');
    if (!container) return;

    let html = `
        <div class="chip-item active" data-target="recommended">
            <div class="chip-circle"><i data-lucide="layout-grid"></i></div>
            <span class="chip-label">All</span>
        </div>
    `;

    if (categories && categories.length > 0) {
        html += categories.map((c, i) => `
            <div class="chip-item" data-target="${c.targetId}">
                <div class="chip-circle"><i data-lucide="${c.icon || 'star'}"></i></div>
                <span class="chip-label">${c.title}</span>
            </div>
        `).join('');
    }

    container.innerHTML = html;
}

function renderMenu(categories, recommended, products) {
    const container = document.querySelector('.menu-list');
    if (!container) return;

    let html = '';

    if (recommended && recommended.length > 0) {
        html += `
            <section id="recommended" class="menu-section">
                <h2 class="section-title">Recommended <span class="line"></span></h2>
                <div class="food-carousel">
                    ${recommended.map(r => `
                        <div class="food-card" data-variants="${r.variants ? JSON.stringify(r.variants).replace(/"/g, '&quot;') : '[]'}">
                            <div class="card-image-wrap">
                                ${r.discountTag ? `<div class="discount-tag">${r.discountTag}</div>` : ''}
                                <img src="${r.image}" alt="${r.title}" loading="lazy">
                            </div>
                            <div class="card-content">
                                <h3 class="food-title">${r.title}</h3>
                                <div class="price-row">
                                    <span class="price">${r.variants && r.variants.length > 0 ? r.variants.map(v => '₹' + v.price).join(', ') : (r.price ? '₹' + r.price : '')}</span>
                                </div>
                                ${r.caption ? `<div class="menu-item-desc" style="display:none;">${r.caption}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }

    if (categories && products) {
        categories.forEach(cat => {
            if (cat.targetId === 'recommended') return;

            const catProducts = products.filter(p => p.categoryId === cat.id);
            if (catProducts.length === 0) return;

            html += `
                <section id="${cat.targetId}" class="menu-section">
                    <h2 class="section-title">${cat.title} <span class="line"></span></h2>
                    <div class="menu-card">
                        <div class="menu-card-list">
                            ${catProducts.map(p => `
                                <div class="menu-card-item" data-variants="${p.variants ? JSON.stringify(p.variants).replace(/"/g, '&quot;') : '[]'}">
                                    <div class="menu-item-header">
                                        <h3 class="menu-item-name">${p.name.replace(/\s*\((.*?)\)/, ' <span class="inline-desc">($1)</span>')} ${p.description ? `<em style="font-weight:normal; font-size:14px; color:var(--color-icon-secondary);">${p.description}</em>` : ''}</h3>
                                        <div class="menu-item-dots"></div>
                                        ${p.variants && p.variants.length > 0 ? 
                                            (function() {
                                                let groups = [];
                                                for(let i=0; i<p.variants.length; i+=2) {
                                                    groups.push(p.variants.slice(i, i+2).map(v => '₹' + v.price).join(', '));
                                                }
                                                return `<div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                                                    ${groups.map(g => `<span class="menu-item-price" style="line-height:1.2;">${g}</span>`).join('')}
                                                </div>`;
                                            })()
                                            : (p.price ? `<span class="menu-item-price">₹${p.price}</span>` : '')
                                        }
                                    </div>
                                    ${p.caption ? `<div class="menu-item-desc" style="display:none;">${p.caption}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>
            `;
        });
    }

    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', initApp);

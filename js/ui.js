window.initNativeScripts = function() {
    lucide.createIcons();

    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const sections = document.querySelectorAll('.menu-section');
            const subcategoryTitles = document.querySelectorAll('.subcategory-title');
            subcategoryTitles.forEach(el => el.style.display = 'none');

            sections.forEach(section => {
                let hasVisibleItems = false;
                section.querySelectorAll('.food-card').forEach(card => {
                    if (card.textContent.toLowerCase().includes(query)) {
                        card.style.display = '';
                        hasVisibleItems = true;
                    } else {
                        card.style.display = 'none';
                    }
                });
                section.querySelectorAll('.menu-card-item').forEach(item => {
                    if (item.textContent.toLowerCase().includes(query)) {
                        item.style.display = '';
                        hasVisibleItems = true;
                    } else {
                        item.style.display = 'none';
                    }
                });
                section.style.display = hasVisibleItems ? '' : 'none';
            });
        });
    }

    const carousel = document.querySelector('.banner-carousel');
    const dots = document.querySelectorAll('.carousel-dots .dot');
    
    if (carousel && dots.length > 0) {
        let autoScrollInterval;
        const totalSlides = dots.length;

        const updateDots = (index) => {
            dots.forEach(dot => dot.classList.remove('active'));
            if (dots[index]) dots[index].classList.add('active');
        };

        carousel.addEventListener('scroll', () => {
            const slideWidth = carousel.clientWidth;
            if (slideWidth > 0) {
                const activeIndex = Math.round(carousel.scrollLeft / slideWidth);
                updateDots(activeIndex);
            }
        });

        const startAutoScroll = () => {
            clearInterval(autoScrollInterval);
            autoScrollInterval = setInterval(() => {
                const slideWidth = carousel.clientWidth;
                if(slideWidth === 0) return;
                let nextIndex = Math.round(carousel.scrollLeft / slideWidth) + 1;
                if (nextIndex >= totalSlides) nextIndex = 0;
                carousel.scrollTo({ left: nextIndex * slideWidth, behavior: 'smooth' });
            }, 3000);
        };

        carousel.addEventListener('touchstart', () => clearInterval(autoScrollInterval), {passive: true});
        carousel.addEventListener('touchend', startAutoScroll);
        startAutoScroll();
    }

    const scrollContainer = document.getElementById('scroll-container');
    const stickyNav = document.getElementById('sticky-nav');
    const chips = document.querySelectorAll('.chip-item');
    const sections = document.querySelectorAll('.menu-section');
    const chipContainer = document.getElementById('category-chips');
    
    if (scrollContainer && stickyNav) {
        const stickyNavHeight = stickyNav.offsetHeight;
        sections.forEach(sec => sec.style.scrollMarginTop = `${stickyNavHeight + 20}px`);

        let isClickScrolling = false;
        let scrollTimeout;

        chips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const targetId = chip.getAttribute('data-target');
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    isClickScrolling = true;
                    updateActiveChip(chip, true);
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(() => isClickScrolling = false, 600);
                }
            });
        });

        const observerOptions = {
            root: scrollContainer,
            rootMargin: `-${stickyNavHeight + 30}px 0px -50% 0px`,
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            if (isClickScrolling) return;
            let activeEntry = null;
            entries.forEach(entry => { if (entry.isIntersecting) activeEntry = entry; });

            if (activeEntry) {
                const id = activeEntry.target.getAttribute('id');
                const correspondingChip = document.querySelector(`.chip-item[data-target="${id}"]`);
                if (correspondingChip) updateActiveChip(correspondingChip, false);
            }
        }, observerOptions);

        sections.forEach(sec => observer.observe(sec));

        scrollContainer.addEventListener('scroll', () => {
            if (isClickScrolling) return;
            if (Math.abs(scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop) <= 5) {
                const lastSection = sections[sections.length - 1];
                if (lastSection) {
                    const id = lastSection.getAttribute('id');
                    const correspondingChip = document.querySelector(`.chip-item[data-target="${id}"]`);
                    if (correspondingChip) updateActiveChip(correspondingChip, false);
                }
            }
        });

        function updateActiveChip(activeChip, isClick = false) {
            if (!activeChip || activeChip.classList.contains('active')) return;
            chips.forEach(c => c.classList.remove('active'));
            activeChip.classList.add('active');
            
            if (chipContainer) {
                const scrollLeft = activeChip.offsetLeft - (chipContainer.offsetWidth / 2) + (activeChip.offsetWidth / 2);
                chipContainer.scrollTo({
                    left: scrollLeft,
                    behavior: isClick ? 'smooth' : 'auto'
                });
            }
        }
    }

    const navSentinel = document.getElementById('nav-sentinel');
    if (navSentinel && scrollContainer && stickyNav) {
        const stickyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) stickyNav.classList.add('is-stuck');
                else stickyNav.classList.remove('is-stuck');
            });
        }, { root: scrollContainer, threshold: 0, rootMargin: '0px 0px 0px 0px' });
        stickyObserver.observe(navSentinel);
    }
    
    const openNavBtn = document.getElementById('openNavBtn');
    const navMenu = document.getElementById('navMenu');
    const closeNavBtn = document.getElementById('closeNavBtn');
    const linkMain = document.querySelector('.nav-link[href="#"]');
    const linkAbout = document.querySelector('.nav-link[href="#about"]');
    const mainView = document.getElementById('main-view');
    const aboutView = document.getElementById('about-view');

    if (openNavBtn && navMenu && closeNavBtn) {
        openNavBtn.addEventListener('click', () => navMenu.classList.add('active'));
        closeNavBtn.addEventListener('click', () => navMenu.classList.remove('active'));
        navMenu.addEventListener('click', (e) => {
            if (e.target === navMenu) navMenu.classList.remove('active');
        });

        if (linkMain && linkAbout && mainView && aboutView) {
            const savedView = localStorage.getItem('main_last_view') || 'main';
            if (savedView === 'about') {
                mainView.style.display = 'none';
                aboutView.style.display = 'block';
            } else {
                mainView.style.display = 'block';
                aboutView.style.display = 'none';
            }

            linkMain.addEventListener('click', (e) => {
                e.preventDefault();
                mainView.style.display = 'block';
                aboutView.style.display = 'none';
                navMenu.classList.remove('active');
                localStorage.setItem('main_last_view', 'main');
                if (scrollContainer) scrollContainer.scrollTo(0, 0);
            });

            linkAbout.addEventListener('click', (e) => {
                e.preventDefault();
                mainView.style.display = 'none';
                aboutView.style.display = 'block';
                navMenu.classList.remove('active');
                localStorage.setItem('main_last_view', 'about');
                if (scrollContainer) scrollContainer.scrollTo(0, 0);
            });
        }
    }

    const foodModal = document.getElementById('foodModal');
    const foodModalClose = document.getElementById('foodModalClose');
    const foodModalTitle = document.getElementById('foodModalTitle');
    const foodModalSubtitle = document.getElementById('foodModalSubtitle');
    const foodModalDesc = document.getElementById('foodModalDesc');
    const foodModalPrice = document.getElementById('foodModalPrice');

    if (foodModal && foodModalClose) {
        foodModalClose.addEventListener('click', () => foodModal.classList.remove('active'));
        foodModal.addEventListener('click', (e) => {
            if (e.target === foodModal) foodModal.classList.remove('active');
        });

        // Event delegation for dynamically added menu items and recommended cards
        document.body.addEventListener('click', (e) => {
            const item = e.target.closest('.menu-card-item') || e.target.closest('.food-card');
            if (item) {
                let nameEl, descEl, priceEl;

                if (item.classList.contains('food-card')) {
                    nameEl = item.querySelector('.food-title');
                    descEl = item.querySelector('.menu-item-desc');
                    priceEl = item.querySelector('.price');
                } else {
                    nameEl = item.querySelector('.menu-item-name');
                    descEl = item.querySelector('.menu-item-desc');
                    priceEl = item.querySelector('.menu-item-price');
                }
                
                if (nameEl) {
                    const nameClone = nameEl.cloneNode(true);
                    const emTag = nameClone.querySelector('em');
                    let subtitleText = '';
                    if (emTag) {
                        subtitleText = emTag.textContent;
                        emTag.remove();
                    }
                    if(foodModalTitle) foodModalTitle.innerHTML = nameClone.innerHTML.trim();
                    if(foodModalSubtitle) foodModalSubtitle.textContent = subtitleText;
                }
                if (descEl && foodModalDesc) foodModalDesc.innerHTML = descEl.innerHTML;
                else if (foodModalDesc) foodModalDesc.innerHTML = '';

                let variantsHtml = '';
                try {
                    const variantsData = item.getAttribute('data-variants');
                    if (variantsData) {
                        const variants = JSON.parse(variantsData);
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
                    }
                } catch(e) {}

                if (foodModalPrice) {
                    if (variantsHtml) {
                        foodModalPrice.innerHTML = variantsHtml;
                    } else if (priceEl) {
                        foodModalPrice.innerHTML = priceEl.innerHTML;
                    } else {
                        foodModalPrice.innerHTML = '';
                    }
                }

                foodModal.classList.add('active');
            }
        });
    }
};



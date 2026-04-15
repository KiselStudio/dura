/**
 * Dura AI — Settings Module
 * Model selection, limits display, payments.
 */

const Settings = (() => {
    let profile = null;
    let textModels = [];
    let imageModels = [];
    let packages = [];
    let subscriptions = [];
    let currentSettings = {};
    let paymentCheckInterval = null;

    const settingsModal = document.getElementById('settings-modal');
    const imageGenModal = document.getElementById('image-gen-modal');
    const paymentModal = document.getElementById('payment-modal');

    async function init() {
        setupEventListeners();
        await refreshProfile();
    }

    function setupEventListeners() {
        // Settings modal
        document.getElementById('settings-btn').addEventListener('click', openSettings);
        document.getElementById('settings-close').addEventListener('click', closeSettings);
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettings();
        });

        // Image generation modal
        document.getElementById('generate-image-btn').addEventListener('click', openImageGen);
        document.getElementById('image-gen-close').addEventListener('click', closeImageGen);
        imageGenModal.addEventListener('click', (e) => {
            if (e.target === imageGenModal) closeImageGen();
        });
        document.getElementById('generate-btn').addEventListener('click', generateImage);

        // Payment modal
        document.getElementById('payment-close').addEventListener('click', closePayment);
        paymentModal.addEventListener('click', (e) => {
            if (e.target === paymentModal) closePayment();
        });
    }

    // ========================
    // Profile & Data Loading
    // ========================
    async function refreshProfile() {
        try {
            profile = await API.getProfile();
            currentSettings = profile.settings;
            updateProfileUI();
            Chat.updateLimits(profile);
        } catch (err) {
            console.error('Failed to load profile:', err);
        }
    }

    function updateProfileUI() {
        if (!profile) return;

        // Sidebar user info
        document.getElementById('user-name').textContent = profile.username;
        document.getElementById('user-plan').textContent = profile.subscription.name;
        document.getElementById('user-avatar').textContent = profile.username.charAt(0).toUpperCase();
    }

    // ========================
    // Settings Modal
    // ========================
    async function openSettings() {
        settingsModal.style.display = 'flex';

        // Load data in parallel
        try {
            const [textData, imageData, packagesData] = await Promise.all([
                API.getTextModels(),
                API.getImageModels(),
                API.getPackages(),
            ]);

            textModels = textData.models;
            imageModels = imageData.models;
            packages = packagesData.packages;
            subscriptions = packagesData.subscriptions;

            await refreshProfile();

            renderTextModels();
            renderImageModels();
            renderLimits();
            renderPackages();
            renderSubscriptions();
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    }

    function closeSettings() {
        settingsModal.style.display = 'none';
    }

    // ========================
    // Model Selection
    // ========================
    function renderTextModels() {
        const container = document.getElementById('text-model-list');
        container.innerHTML = '';

        const plan = subscriptions.find(s => s.id === profile.subscription.id);
        const allowedModels = plan && plan.models === 'all' ? null : (plan ? plan.models : []);

        textModels.forEach(model => {
            const isActive = currentSettings.text_model === model.id;
            const isLocked = allowedModels && !allowedModels.includes(model.id);

            const div = document.createElement('div');
            div.className = `model-option${isActive ? ' active' : ''}${isLocked ? ' locked' : ''}`;
            div.innerHTML = `
                <div class="model-radio"></div>
                <div class="model-info">
                    <div class="model-name">${model.name} <span style="color:var(--text-muted);font-size:11px">${model.provider}</span></div>
                    <div class="model-desc">${model.description}${model.supports_vision ? ' • 👁 Vision' : ''}</div>
                </div>
                <span class="model-badge ${model.is_premium ? 'model-badge--premium' : 'model-badge--free'}">
                    ${model.is_premium ? 'Premium' : 'Free'}
                </span>
            `;

            if (!isLocked) {
                div.addEventListener('click', () => selectTextModel(model.id));
            }
            container.appendChild(div);
        });
    }

    function renderImageModels() {
        const container = document.getElementById('image-model-list');
        container.innerHTML = '';

        const plan = subscriptions.find(s => s.id === profile.subscription.id);
        const allowedModels = plan && plan.models === 'all' ? null : (plan ? plan.models : []);

        imageModels.forEach(model => {
            const isActive = currentSettings.image_model === model.id;
            const isLocked = allowedModels && !allowedModels.includes(model.id);

            const div = document.createElement('div');
            div.className = `model-option${isActive ? ' active' : ''}${isLocked ? ' locked' : ''}`;
            div.innerHTML = `
                <div class="model-radio"></div>
                <div class="model-info">
                    <div class="model-name">${model.name} <span style="color:var(--text-muted);font-size:11px">${model.provider}</span></div>
                    <div class="model-desc">${model.description}</div>
                </div>
                <span class="model-badge ${model.is_premium ? 'model-badge--premium' : 'model-badge--free'}">
                    ${model.is_premium ? 'Premium' : 'Free'}
                </span>
            `;

            if (!isLocked) {
                div.addEventListener('click', () => selectImageModel(model.id));
            }
            container.appendChild(div);
        });
    }

    async function selectTextModel(modelId) {
        try {
            await API.updateSettings({ text_model: modelId });
            currentSettings.text_model = modelId;
            renderTextModels();
        } catch (err) {
            alert(err.message);
        }
    }

    async function selectImageModel(modelId) {
        try {
            await API.updateSettings({ image_model: modelId });
            currentSettings.image_model = modelId;
            renderImageModels();
        } catch (err) {
            alert(err.message);
        }
    }

    // ========================
    // Limits Display
    // ========================
    function renderLimits() {
        if (!profile) return;
        const l = profile.limits;

        document.getElementById('text-limit-numbers').textContent = `${l.text_used} / ${l.text_total}`;
        document.getElementById('image-limit-numbers').textContent = `${l.image_used} / ${l.image_total}`;

        const textPercent = l.text_total > 0 ? (l.text_used / l.text_total) * 100 : 0;
        const imagePercent = l.image_total > 0 ? (l.image_used / l.image_total) * 100 : 0;

        document.getElementById('text-progress').style.width = `${Math.min(textPercent, 100)}%`;
        document.getElementById('image-progress').style.width = `${Math.min(imagePercent, 100)}%`;
    }

    // ========================
    // Packages (Buy More)
    // ========================
    function renderPackages() {
        const container = document.getElementById('packages-grid');
        container.innerHTML = '';

        packages.forEach(pkg => {
            const div = document.createElement('div');
            div.className = 'package-card';
            div.innerHTML = `
                <div class="package-name">${pkg.name}</div>
                <div class="package-price">${pkg.price}<span class="package-price-currency"> ₽</span></div>
            `;
            div.addEventListener('click', () => purchasePackage(pkg.id, 'package'));
            container.appendChild(div);
        });
    }

    // ========================
    // Subscriptions
    // ========================
    function renderSubscriptions() {
        const container = document.getElementById('subscriptions-grid');
        container.innerHTML = '';

        subscriptions.forEach(sub => {
            const isActive = profile.subscription.id === sub.id;
            const div = document.createElement('div');
            div.className = `subscription-card${isActive ? ' active' : ''}`;
            div.innerHTML = `
                <div class="sub-info">
                    <div class="sub-name">${sub.name}</div>
                    <div class="sub-desc">${sub.description} • ${sub.text_messages} сообщ. • ${sub.image_generations} изобр.</div>
                </div>
                ${sub.price > 0 ? `<div class="sub-price">${sub.price}<span> ₽/мес</span></div>` : '<div class="sub-price" style="color:var(--success)">Бесплатно</div>'}
            `;

            if (!isActive && sub.price > 0) {
                div.addEventListener('click', () => purchasePackage(sub.id, 'subscription'));
                div.style.cursor = 'pointer';
            }
            container.appendChild(div);
        });
    }

    // ========================
    // Payments
    // ========================
    async function purchasePackage(packageId, type) {
        try {
            const data = await API.createPayment(packageId, type);

            if (data.redirect) {
                // Open payment page in new tab
                window.open(data.redirect, '_blank');

                // Show payment status modal
                showPaymentModal(data.payment_id);
            }
        } catch (err) {
            alert('Ошибка создания платежа: ' + err.message);
        }
    }

    function showPaymentModal(paymentId) {
        paymentModal.style.display = 'flex';
        document.getElementById('payment-spinner').style.display = 'flex';
        document.getElementById('payment-success').style.display = 'none';

        // Poll payment status
        let attempts = 0;
        paymentCheckInterval = setInterval(async () => {
            attempts++;
            try {
                const data = await API.checkPaymentStatus(paymentId);

                if (data.status === 'CONFIRMED') {
                    clearInterval(paymentCheckInterval);
                    document.getElementById('payment-spinner').style.display = 'none';
                    document.getElementById('payment-success').style.display = 'flex';
                    await refreshProfile();
                    renderLimits();
                    renderSubscriptions();

                    setTimeout(() => closePayment(), 3000);
                } else if (data.status === 'CANCELED' || data.status === 'CHARGEBACKED') {
                    clearInterval(paymentCheckInterval);
                    closePayment();
                    alert('Платёж отменён');
                }
            } catch (err) {
                console.error('Payment check error:', err);
            }

            if (attempts > 120) {
                clearInterval(paymentCheckInterval);
                closePayment();
            }
        }, 5000);
    }

    function closePayment() {
        paymentModal.style.display = 'none';
        if (paymentCheckInterval) {
            clearInterval(paymentCheckInterval);
            paymentCheckInterval = null;
        }
    }

    // ========================
    // Image Generation
    // ========================
    function openImageGen() {
        imageGenModal.style.display = 'flex';
        document.getElementById('image-prompt').value = '';
        document.getElementById('image-gen-error').style.display = 'none';
        document.getElementById('image-gen-result').style.display = 'none';
        document.getElementById('image-prompt').focus();
    }

    function closeImageGen() {
        imageGenModal.style.display = 'none';
    }

    async function generateImage() {
        const prompt = document.getElementById('image-prompt').value.trim();
        if (!prompt) return;

        const btn = document.getElementById('generate-btn');
        const spinner = btn.querySelector('.btn-loader');
        const label = btn.querySelector('span');
        const errorEl = document.getElementById('image-gen-error');
        const resultEl = document.getElementById('image-gen-result');

        errorEl.style.display = 'none';
        resultEl.style.display = 'none';
        spinner.style.display = 'block';
        label.textContent = 'Генерация...';
        btn.disabled = true;

        try {
            const size = document.getElementById('image-size').value;
            const quality = document.getElementById('image-quality').value;

            const data = await API.generateImage(prompt, size, quality);

            if (data.images && data.images.length > 0) {
                const imgUrl = data.images[0].url || data.images[0].b64_json;
                let src;
                if (data.images[0].url) {
                    src = data.images[0].url;
                } else if (data.images[0].b64_json) {
                    src = `data:image/png;base64,${data.images[0].b64_json}`;
                }

                if (src) {
                    document.getElementById('generated-image').src = src;
                    resultEl.style.display = 'block';
                }

                if (data.over_limit) {
                    errorEl.textContent = '⚡ Лимит исчерпан — использована экономичная модель';
                    errorEl.style.display = 'block';
                    errorEl.style.background = 'rgba(245, 158, 11, 0.1)';
                    errorEl.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                    errorEl.style.color = '#fbbf24';
                }
            }

            await refreshProfile();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        } finally {
            spinner.style.display = 'none';
            label.textContent = 'Сгенерировать';
            btn.disabled = false;
        }
    }

    return {
        init,
        refreshProfile,
        openSettings,
    };
})();

/**
 * Dura AI — Auth Module
 * Login and registration form handling.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if (API.isLoggedIn()) {
        window.location.href = 'chat.html';
        return;
    }

    // Tab switching
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const indicator = document.querySelector('.auth-tab-indicator');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            if (target === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                indicator.style.transform = 'translateX(0)';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
                indicator.style.transform = 'translateX(100%)';
            }
        });
    });

    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');
        const spinner = btn.querySelector('.btn-loader');
        const label = btn.querySelector('span');

        errorEl.style.display = 'none';
        spinner.style.display = 'block';
        label.textContent = 'Вход...';
        btn.disabled = true;

        try {
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;

            const data = await API.login(username, password);
            API.setToken(data.token);
            window.location.href = 'chat.html';
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        } finally {
            spinner.style.display = 'none';
            label.textContent = 'Войти';
            btn.disabled = false;
        }
    });

    // Register
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('register-error');
        const btn = document.getElementById('register-btn');
        const spinner = btn.querySelector('.btn-loader');
        const label = btn.querySelector('span');

        errorEl.style.display = 'none';

        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        const password2 = document.getElementById('reg-password2').value;
        const secret = document.getElementById('reg-secret').value;

        if (password !== password2) {
            errorEl.textContent = 'Пароли не совпадают';
            errorEl.style.display = 'block';
            return;
        }

        spinner.style.display = 'block';
        label.textContent = 'Регистрация...';
        btn.disabled = true;

        try {
            const data = await API.register(username, password, secret);
            API.setToken(data.token);
            window.location.href = 'chat.html';
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        } finally {
            spinner.style.display = 'none';
            label.textContent = 'Зарегистрироваться';
            btn.disabled = false;
        }
    });
});

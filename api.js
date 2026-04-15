/**
 * Dura AI — API Client
 * Handles all communication with the Flask backend.
 */

const API = (() => {
    // *** CHANGE THIS to your VPS server URL ***
    const BASE_URL = localStorage.getItem('dura_api_url') || 'http://171.22.31.230:5000';

    function getToken() {
        return localStorage.getItem('dura_token');
    }

    function setToken(token) {
        localStorage.setItem('dura_token', token);
    }

    function clearToken() {
        localStorage.removeItem('dura_token');
    }

    function isLoggedIn() {
        return !!getToken();
    }

    async function request(method, path, body = null, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
        };

        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers,
            ...options,
        };

        if (body && method !== 'GET') {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(`${BASE_URL}${path}`, config);

        if (response.status === 401) {
            clearToken();
            window.location.href = 'index.html';
            throw new Error('Unauthorized');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Произошла ошибка');
        }

        return data;
    }

    // Auth
    function register(username, password, secret_word) {
        return request('POST', '/api/auth/register', { username, password, secret_word });
    }

    function login(username, password) {
        return request('POST', '/api/auth/login', { username, password });
    }

    function getProfile() {
        return request('GET', '/api/auth/profile');
    }

    // Models
    function getTextModels() {
        return request('GET', '/api/models/text');
    }

    function getImageModels() {
        return request('GET', '/api/models/image');
    }

    // Settings
    function getSettings() {
        return request('GET', '/api/settings');
    }

    function updateSettings(settings) {
        return request('PUT', '/api/settings', settings);
    }

    // Chats
    function listChats() {
        return request('GET', '/api/chats');
    }

    function createChat(title) {
        return request('POST', '/api/chats', { title });
    }

    function getChat(chatId) {
        return request('GET', `/api/chats/${chatId}`);
    }

    function deleteChat(chatId) {
        return request('DELETE', `/api/chats/${chatId}`);
    }

    // Messages (SSE streaming)
    function sendMessage(chatId, content, image = null) {
        const token = getToken();
        return fetch(`${BASE_URL}/api/chats/${chatId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ content, image }),
        });
    }

    // Image Generation
    function generateImage(prompt, size, quality) {
        return request('POST', '/api/images/generate', { prompt, size, quality });
    }

    // Payments
    function getPackages() {
        return request('GET', '/api/payments/packages');
    }

    function createPayment(packageId, type = 'package', returnUrl = null, failedUrl = null) {
        return request('POST', '/api/payments/create', {
            package_id: packageId,
            type,
            return_url: returnUrl || window.location.href,
            failed_url: failedUrl || window.location.href,
        });
    }

    function checkPaymentStatus(paymentId) {
        return request('GET', `/api/payments/status/${paymentId}`);
    }

    // Server URL management
    function setApiUrl(url) {
        localStorage.setItem('dura_api_url', url);
    }

    function getApiUrl() {
        return BASE_URL;
    }

    return {
        getToken, setToken, clearToken, isLoggedIn,
        register, login, getProfile,
        getTextModels, getImageModels,
        getSettings, updateSettings,
        listChats, createChat, getChat, deleteChat,
        sendMessage,
        generateImage,
        getPackages, createPayment, checkPaymentStatus,
        setApiUrl, getApiUrl,
    };
})();

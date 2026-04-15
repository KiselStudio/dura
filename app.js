/**
 * Dura AI — Main Application Controller
 * Initialization, routing, global event handlers.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    if (!API.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize modules
    Chat.init();
    Settings.init();

    // Sidebar toggle (mobile)
    const sidebar = document.getElementById('sidebar');
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        sidebar.classList.add('open');
    });
    document.getElementById('sidebar-close').addEventListener('click', () => {
        sidebar.classList.remove('open');
    });

    // New chat buttons
    document.getElementById('new-chat-btn').addEventListener('click', () => {
        Chat.createNewChat();
    });
    const welcomeNewChat = document.getElementById('welcome-new-chat');
    if (welcomeNewChat) {
        welcomeNewChat.addEventListener('click', () => {
            Chat.createNewChat();
        });
    }

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите выйти?')) {
            API.clearToken();
            window.location.href = 'index.html';
        }
    });

    // Close sidebar on click outside (mobile)
    document.getElementById('chat-main').addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    });

    // Keyboard shortcut: Ctrl+K for new chat
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            Chat.createNewChat();
        }
    });
});

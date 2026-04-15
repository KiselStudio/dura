/**
 * Dura AI — Chat Module
 * Chat management, message sending/receiving with SSE streaming, photo upload.
 */

const Chat = (() => {
    let currentChatId = null;
    let isStreaming = false;
    let pendingImage = null;

    // DOM elements
    const chatList = document.getElementById('chat-list');
    const messagesList = document.getElementById('messages-list');
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const inputArea = document.getElementById('input-area');
    const welcomeScreen = document.getElementById('welcome-screen');
    const chatTitle = document.getElementById('chat-title');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const limitsText = document.getElementById('limits-text');

    function init() {
        loadChats();
        setupInputHandlers();
        setupPhotoUpload();
    }

    // ========================
    // Chat List
    // ========================
    async function loadChats() {
        try {
            const data = await API.listChats();
            renderChatList(data.chats);
        } catch (err) {
            console.error('Failed to load chats:', err);
        }
    }

    function renderChatList(chats) {
        chatList.innerHTML = '';
        if (chats.length === 0) {
            chatList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">Нет чатов</div>';
            return;
        }

        chats.forEach(chat => {
            const el = document.createElement('div');
            el.className = `chat-item${chat.id === currentChatId ? ' active' : ''}`;
            el.dataset.id = chat.id;
            el.innerHTML = `
                <svg class="chat-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span class="chat-item-title">${escapeHtml(chat.title)}</span>
                <button class="btn-icon chat-item-delete" title="Удалить" data-id="${chat.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            `;
            el.addEventListener('click', (e) => {
                if (e.target.closest('.chat-item-delete')) return;
                openChat(chat.id);
            });
            el.querySelector('.chat-item-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteChatConfirm(chat.id);
            });
            chatList.appendChild(el);
        });
    }

    async function createNewChat() {
        try {
            const data = await API.createChat('Новый чат');
            currentChatId = data.id;
            await loadChats();
            openChat(data.id);
        } catch (err) {
            console.error('Failed to create chat:', err);
        }
    }

    async function openChat(chatId) {
        currentChatId = chatId;
        inputArea.style.display = 'block';

        // Update active state in list
        document.querySelectorAll('.chat-item').forEach(el => {
            el.classList.toggle('active', el.dataset.id === chatId);
        });

        // Load messages
        try {
            const data = await API.getChat(chatId);
            chatTitle.textContent = data.title;
            renderMessages(data.messages);
        } catch (err) {
            console.error('Failed to load chat:', err);
        }

        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
        messageInput.focus();
    }

    async function deleteChatConfirm(chatId) {
        if (!confirm('Удалить этот чат?')) return;
        try {
            await API.deleteChat(chatId);
            if (currentChatId === chatId) {
                currentChatId = null;
                inputArea.style.display = 'none';
                chatTitle.textContent = 'Выберите или создайте чат';
                messagesList.innerHTML = '';
                messagesList.appendChild(welcomeScreen);
                welcomeScreen.style.display = 'flex';
            }
            await loadChats();
        } catch (err) {
            console.error('Failed to delete chat:', err);
        }
    }

    // ========================
    // Messages
    // ========================
    function renderMessages(messages) {
        messagesList.innerHTML = '';
        if (messages.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'welcome-screen';
            empty.innerHTML = '<p style="color:var(--text-muted)">Начните разговор, отправив сообщение</p>';
            messagesList.appendChild(empty);
        } else {
            messages.forEach(msg => {
                appendMessage(msg.role, msg.content, msg.image_url);
            });
        }
        scrollToBottom();
    }

    function appendMessage(role, content, imageUrl = null) {
        // Remove welcome screen if present
        const welcome = messagesList.querySelector('.welcome-screen');
        if (welcome) welcome.remove();

        const div = document.createElement('div');
        div.className = `message message--${role}`;

        const isUser = role === 'user';
        const avatarLetter = isUser ? 'Вы' : 'AI';

        div.innerHTML = `
            <div class="message-avatar">${avatarLetter}</div>
            <div class="message-body">
                <div class="message-role">${isUser ? 'Вы' : 'Ассистент'}</div>
                <div class="message-content">${formatMessage(content)}</div>
                ${imageUrl && isUser ? `<img class="message-image" src="${imageUrl.startsWith('data:') ? imageUrl : `data:image/jpeg;base64,${imageUrl}`}" alt="Uploaded image">` : ''}
            </div>
        `;
        messagesList.appendChild(div);
        scrollToBottom();
        return div;
    }

    function createStreamingMessage() {
        const welcome = messagesList.querySelector('.welcome-screen');
        if (welcome) welcome.remove();

        const div = document.createElement('div');
        div.className = 'message message--assistant';
        div.id = 'streaming-message';
        div.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-body">
                <div class="message-role">Ассистент</div>
                <div class="message-content">
                    <div class="message-typing"><span></span><span></span><span></span></div>
                </div>
            </div>
        `;
        messagesList.appendChild(div);
        scrollToBottom();
        return div;
    }

    function updateStreamingMessage(div, text) {
        const contentEl = div.querySelector('.message-content');
        contentEl.innerHTML = formatMessage(text);
        scrollToBottom();
    }

    function finalizeStreamingMessage(div, text, overLimit) {
        const contentEl = div.querySelector('.message-content');
        contentEl.innerHTML = formatMessage(text);
        if (overLimit) {
            contentEl.innerHTML += '<div class="over-limit-badge">⚡ Использована экономичная модель (лимит исчерпан)</div>';
        }
        div.removeAttribute('id');
        scrollToBottom();
    }

    // ========================
    // Input Handling
    // ========================
    function setupInputHandlers() {
        // Auto-resize textarea
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
            sendBtn.disabled = !messageInput.value.trim() && !pendingImage;
        });

        // Send on Enter (Shift+Enter for new line)
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);
    }

    async function sendMessage() {
        if (isStreaming) return;
        const content = messageInput.value.trim();
        const image = pendingImage;

        if (!content && !image) return;
        if (!currentChatId) return;

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.disabled = true;
        clearPendingImage();

        // Show user message
        appendMessage('user', content, image ? `data:image/jpeg;base64,${image}` : null);

        // Create streaming message
        const streamDiv = createStreamingMessage();
        isStreaming = true;

        try {
            const response = await API.sendMessage(currentChatId, content, image);

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Ошибка');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let overLimit = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.error) {
                            throw new Error(data.error);
                        }
                        if (data.text) {
                            fullText += data.text;
                            updateStreamingMessage(streamDiv, fullText);
                        }
                        if (data.over_limit) {
                            overLimit = true;
                        }
                        if (data.done) {
                            finalizeStreamingMessage(streamDiv, fullText, overLimit);
                        }
                    } catch (parseErr) {
                        if (parseErr.message !== 'Unexpected end of JSON input') {
                            console.error('Parse error:', parseErr);
                        }
                    }
                }
            }

            // Update chat list (title might have changed)
            loadChats();
            // Refresh limits
            if (typeof Settings !== 'undefined' && Settings.refreshProfile) {
                Settings.refreshProfile();
            }

        } catch (err) {
            const contentEl = streamDiv.querySelector('.message-content');
            contentEl.innerHTML = `<span style="color:var(--error)">Ошибка: ${escapeHtml(err.message)}</span>`;
        } finally {
            isStreaming = false;
            sendBtn.disabled = !messageInput.value.trim();
        }
    }

    // ========================
    // Photo Upload
    // ========================
    function setupPhotoUpload() {
        document.getElementById('upload-btn').addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('Пожалуйста, выберите изображение');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                alert('Изображение слишком большое (максимум 10 МБ)');
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = ev.target.result.split(',')[1];
                pendingImage = base64;
                previewImg.src = ev.target.result;
                imagePreview.style.display = 'inline-block';
                sendBtn.disabled = false;
            };
            reader.readAsDataURL(file);
            fileInput.value = '';
        });

        document.getElementById('preview-remove').addEventListener('click', clearPendingImage);
    }

    function clearPendingImage() {
        pendingImage = null;
        imagePreview.style.display = 'none';
        previewImg.src = '';
        sendBtn.disabled = !messageInput.value.trim();
    }

    // ========================
    // Utilities
    // ========================
    function formatMessage(text) {
        if (!text) return '';

        // Escape HTML first
        let html = escapeHtml(text);

        // Code blocks (```...```)
        html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code>${code.trim()}</code></pre>`;
        });

        // Inline code (`...`)
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold (**...**)
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Italic (*...*)
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Links [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        // Newlines
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    function scrollToBottom() {
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }

    function updateLimits(profile) {
        if (!profile || !profile.limits) return;
        const l = profile.limits;
        limitsText.textContent = `${l.text_used}/${l.text_total}`;
    }

    return {
        init,
        createNewChat,
        loadChats,
        updateLimits,
        getCurrentChatId: () => currentChatId,
    };
})();

// Utility
function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

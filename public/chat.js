(function () {
  'use strict';

  var WIDGET_URL = 'https://vebot.veseguro.com';

  // Get config from script tag
  var scripts = document.querySelectorAll('script[data-site]');
  var currentScript = scripts[scripts.length - 1];
  var siteId = (currentScript && currentScript.getAttribute('data-site')) || 'default';
  var primaryColor = (currentScript && currentScript.getAttribute('data-color')) || '#00bcd4';
  var position = (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right';

  var SESSION_KEY = 'vebot_session_' + siteId;
  var sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).slice(2) + '_' + Date.now();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  var conversationHistory = [];
  var isOpen = false;
  var isLoading = false;

  // Create host element
  var host = document.createElement('div');
  host.id = 'vebot-widget';
  host.style.cssText = 'position:fixed;z-index:2147483647;' + (position === 'bottom-left' ? 'left:20px;' : 'right:20px;') + 'bottom:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
  document.body.appendChild(host);

  // Shadow DOM to avoid CSS conflicts
  var shadow = host.attachShadow({ mode: 'open' });

  var styles = [
    '* { box-sizing: border-box; margin: 0; padding: 0; }',
    '.bubble {',
    '  width: 56px; height: 56px;',
    '  background: ' + primaryColor + ';',
    '  border-radius: 50%;',
    '  cursor: pointer;',
    '  display: flex; align-items: center; justify-content: center;',
    '  box-shadow: 0 4px 20px rgba(0,0,0,0.3);',
    '  transition: transform 0.2s, box-shadow 0.2s;',
    '  border: none;',
    '}',
    '.bubble:hover { transform: scale(1.05); box-shadow: 0 6px 24px rgba(0,0,0,0.4); }',
    '.bubble svg { width: 24px; height: 24px; fill: white; }',
    '.window {',
    '  position: absolute;',
    '  bottom: 68px;',
    (position === 'bottom-left' ? '  left: 0;' : '  right: 0;'),
    '  width: 360px;',
    '  max-height: 520px;',
    '  background: #1a1a1a;',
    '  border-radius: 16px;',
    '  box-shadow: 0 8px 40px rgba(0,0,0,0.5);',
    '  display: flex; flex-direction: column;',
    '  overflow: hidden;',
    '  border: 1px solid rgba(255,255,255,0.08);',
    '  opacity: 0; transform: translateY(8px) scale(0.97);',
    '  transition: opacity 0.2s, transform 0.2s;',
    '  pointer-events: none;',
    '}',
    '.window.open {',
    '  opacity: 1; transform: translateY(0) scale(1);',
    '  pointer-events: all;',
    '}',
    '.header {',
    '  padding: 14px 16px;',
    '  background: ' + primaryColor + ';',
    '  display: flex; align-items: center; justify-content: space-between;',
    '}',
    '.header-info { display: flex; align-items: center; gap: 10px; }',
    '.avatar {',
    '  width: 32px; height: 32px; background: rgba(255,255,255,0.2);',
    '  border-radius: 50%; display: flex; align-items: center; justify-content: center;',
    '  font-size: 16px;',
    '}',
    '.header-text .name { font-size: 14px; font-weight: 600; color: white; }',
    '.header-text .status { font-size: 11px; color: rgba(255,255,255,0.8); }',
    '.close-btn {',
    '  background: none; border: none; cursor: pointer;',
    '  color: rgba(255,255,255,0.8); font-size: 20px; line-height: 1;',
    '  padding: 2px 4px;',
    '}',
    '.close-btn:hover { color: white; }',
    '.messages {',
    '  flex: 1; overflow-y: auto; padding: 16px; display: flex;',
    '  flex-direction: column; gap: 12px; min-height: 200px; max-height: 360px;',
    '}',
    '.messages::-webkit-scrollbar { width: 4px; }',
    '.messages::-webkit-scrollbar-track { background: transparent; }',
    '.messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }',
    '.msg { display: flex; gap: 8px; align-items: flex-end; }',
    '.msg.user { flex-direction: row-reverse; }',
    '.msg-bubble {',
    '  max-width: 78%; padding: 10px 14px; border-radius: 16px;',
    '  font-size: 13px; line-height: 1.5; word-wrap: break-word;',
    '}',
    '.msg.bot .msg-bubble {',
    '  background: #2a2a2a; color: #e8e8e8; border-bottom-left-radius: 4px;',
    '}',
    '.msg.user .msg-bubble {',
    '  background: ' + primaryColor + '; color: white; border-bottom-right-radius: 4px;',
    '}',
    '.msg-avatar {',
    '  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;',
    '  background: ' + primaryColor + '; display: flex; align-items: center;',
    '  justify-content: center; font-size: 12px; color: white;',
    '}',
    '.typing-indicator { display: flex; gap: 4px; align-items: center; padding: 4px 0; }',
    '.dot {',
    '  width: 6px; height: 6px; background: rgba(255,255,255,0.4);',
    '  border-radius: 50%; animation: bounce 1.2s infinite;',
    '}',
    '.dot:nth-child(2) { animation-delay: 0.2s; }',
    '.dot:nth-child(3) { animation-delay: 0.4s; }',
    '@keyframes bounce {',
    '  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }',
    '  40% { transform: translateY(-6px); opacity: 1; }',
    '}',
    '.input-area {',
    '  padding: 12px; border-top: 1px solid rgba(255,255,255,0.06);',
    '  display: flex; gap: 8px; align-items: flex-end;',
    '}',
    '.input-field {',
    '  flex: 1; background: #2a2a2a; border: 1px solid rgba(255,255,255,0.1);',
    '  border-radius: 20px; padding: 8px 14px; color: white; font-size: 13px;',
    '  outline: none; resize: none; max-height: 100px; font-family: inherit;',
    '  line-height: 1.4;',
    '}',
    '.input-field::placeholder { color: rgba(255,255,255,0.3); }',
    '.input-field:focus { border-color: ' + primaryColor + '40; }',
    '.send-btn {',
    '  width: 36px; height: 36px; border-radius: 50%; background: ' + primaryColor + ';',
    '  border: none; cursor: pointer; display: flex; align-items: center;',
    '  justify-content: center; flex-shrink: 0; transition: background 0.15s;',
    '}',
    '.send-btn:hover { filter: brightness(1.1); }',
    '.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
    '.send-btn svg { width: 16px; height: 16px; fill: white; }',
    '.powered {',
    '  text-align: center; padding: 6px; font-size: 10px;',
    '  color: rgba(255,255,255,0.2);',
    '}',
    '@media (max-width: 400px) {',
    '  .window { width: calc(100vw - 32px); right: 0 !important; left: 0 !important; margin: 0 auto; }',
    '}'
  ].join('\n');

  var botName = 'VeBot';
  var greeting = 'Hi! How can I help you?';

  function render() {
    shadow.innerHTML = '';
    var styleEl = document.createElement('style');
    styleEl.textContent = styles;
    shadow.appendChild(styleEl);

    var windowEl = document.createElement('div');
    windowEl.className = 'window' + (isOpen ? ' open' : '');

    // Header
    var header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = '<div class="header-info"><div class="avatar">🤖</div><div class="header-text"><div class="name">' + botName + '</div><div class="status">● Online</div></div></div><button class="close-btn">×</button>';
    header.querySelector('.close-btn').addEventListener('click', toggleWindow);

    // Messages
    var messagesEl = document.createElement('div');
    messagesEl.className = 'messages';
    messagesEl.id = 'vebot-messages';

    conversationHistory.forEach(function (msg) {
      var msgEl = createMessageEl(msg.role, msg.content);
      messagesEl.appendChild(msgEl);
    });

    if (isLoading) {
      var loadEl = document.createElement('div');
      loadEl.className = 'msg bot';
      loadEl.innerHTML = '<div class="msg-avatar">🤖</div><div class="msg-bubble"><div class="typing-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>';
      messagesEl.appendChild(loadEl);
    }

    // Input
    var inputArea = document.createElement('div');
    inputArea.className = 'input-area';
    inputArea.innerHTML = '<textarea class="input-field" placeholder="Type a message..." rows="1"></textarea><button class="send-btn"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>';

    var textarea = inputArea.querySelector('.input-field');
    var sendBtn = inputArea.querySelector('.send-btn');

    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(textarea.value.trim());
      }
    });
    textarea.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });
    sendBtn.addEventListener('click', function () {
      sendMessage(textarea.value.trim());
    });
    if (isLoading) sendBtn.disabled = true;

    var powered = document.createElement('div');
    powered.className = 'powered';
    powered.textContent = 'Powered by VeBot';

    windowEl.appendChild(header);
    windowEl.appendChild(messagesEl);
    windowEl.appendChild(inputArea);
    windowEl.appendChild(powered);

    // Bubble
    var bubbleEl = document.createElement('button');
    bubbleEl.className = 'bubble';
    bubbleEl.setAttribute('aria-label', 'Open chat');
    bubbleEl.innerHTML = isOpen
      ? '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>';
    bubbleEl.addEventListener('click', toggleWindow);

    shadow.appendChild(windowEl);
    shadow.appendChild(bubbleEl);

    setTimeout(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 50);
  }

  function createMessageEl(role, content) {
    var msgEl = document.createElement('div');
    msgEl.className = 'msg ' + role;
    var avatarEl = document.createElement('div');
    avatarEl.className = 'msg-avatar';
    avatarEl.textContent = role === 'bot' ? '🤖' : '👤';
    var bubbleEl = document.createElement('div');
    bubbleEl.className = 'msg-bubble';
    bubbleEl.textContent = content;
    msgEl.appendChild(avatarEl);
    msgEl.appendChild(bubbleEl);
    return msgEl;
  }

  function toggleWindow() {
    isOpen = !isOpen;
    if (isOpen && conversationHistory.length === 0) {
      loadConfig();
    }
    render();
  }

  function loadConfig() {
    fetch(WIDGET_URL + '/api/config?site=' + siteId)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data) {
          botName = data.name || botName;
          greeting = data.greeting || greeting;
        }
        if (conversationHistory.length === 0) {
          conversationHistory.push({ role: 'bot', content: greeting });
          render();
        }
      })
      .catch(function () {
        if (conversationHistory.length === 0) {
          conversationHistory.push({ role: 'bot', content: greeting });
          render();
        }
      });
  }

  function sendMessage(text) {
    if (!text || isLoading) return;
    conversationHistory.push({ role: 'user', content: text });
    isLoading = true;
    render();

    var textarea = shadow.querySelector('.input-field');
    if (textarea) { textarea.value = ''; textarea.style.height = 'auto'; }

    var historyForAPI = conversationHistory.slice(-12).map(function (m) {
      return { role: m.role === 'bot' ? 'assistant' : 'user', content: m.content };
    }).slice(0, -1);

    fetch(WIDGET_URL + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: siteId, message: text, sessionId: sessionId, history: historyForAPI })
    }).then(function (res) {
      if (!res.ok) throw new Error('API error');
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var botMessage = '';
      conversationHistory.push({ role: 'bot', content: '' });
      isLoading = false;
      render();

      function read() {
        reader.read().then(function (result) {
          if (result.done) return;
          var chunk = decoder.decode(result.value, { stream: true });
          chunk.split('\n').forEach(function (line) {
            if (line.startsWith('data: ')) {
              var data = line.slice(6).trim();
              if (data === '[DONE]') return;
              try {
                var parsed = JSON.parse(data);
                if (parsed.text) {
                  botMessage += parsed.text;
                  conversationHistory[conversationHistory.length - 1].content = botMessage;
                  var msgs = shadow.querySelectorAll('.msg.bot .msg-bubble');
                  if (msgs.length > 0) {
                    msgs[msgs.length - 1].textContent = botMessage;
                    var messagesEl = shadow.querySelector('.messages');
                    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
                  }
                }
              } catch (e) {}
            }
          });
          read();
        });
      }
      read();
    }).catch(function () {
      isLoading = false;
      conversationHistory.push({ role: 'bot', content: "Sorry, I'm having trouble connecting. Please try again." });
      render();
    });
  }

  render();

  var hasAutoOpened = sessionStorage.getItem('vebot_auto_' + siteId);
  if (!hasAutoOpened) {
    sessionStorage.setItem('vebot_auto_' + siteId, '1');
    // Don't auto-open — let user discover it
  }
})();

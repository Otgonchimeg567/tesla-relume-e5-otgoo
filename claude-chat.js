(() => {
  const toggle = document.createElement('button');
  toggle.className = 'claude-chat-toggle';
  toggle.type = 'button';
  toggle.textContent = 'Claude-оос асуух';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'claude-chat-panel');

  const panel = document.createElement('section');
  panel.className = 'claude-chat-panel';
  panel.id = 'claude-chat-panel';
  panel.setAttribute('aria-label', 'Claude туслах');
  panel.hidden = true;
  panel.innerHTML = `
    <header class="claude-chat-header">
      <div>
        <div class="claude-chat-heading">Claude туслах</div>
        <div class="claude-chat-subtitle">Tesla сайтын талаар асуугаарай</div>
      </div>
      <button class="claude-chat-close" type="button" aria-label="Чат хаах">×</button>
    </header>
    <div class="claude-chat-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
    <form class="claude-chat-form">
      <textarea class="claude-chat-input" rows="1" maxlength="2000" aria-label="Зурвасаа бичнэ үү" placeholder="Зурвасаа бичнэ үү..." required></textarea>
      <button class="claude-chat-send" type="submit">Илгээх</button>
    </form>`;

  document.body.append(toggle, panel);

  const closeButton = panel.querySelector('.claude-chat-close');
  const messagesElement = panel.querySelector('.claude-chat-messages');
  const form = panel.querySelector('.claude-chat-form');
  const input = panel.querySelector('.claude-chat-input');
  const sendButton = panel.querySelector('.claude-chat-send');
  const messages = [];

  function addMessage(role, text, isError = false) {
    const message = document.createElement('div');
    message.className = `claude-chat-message claude-chat-message--${role}`;
    if (isError) message.classList.add('claude-chat-message--error');
    message.textContent = text;
    messagesElement.append(message);
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
    else toggle.focus();
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  closeButton.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });

  addMessage('assistant', 'Сайн байна уу! Tesla сайтын талаар танд юугаар туслах вэ?');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content || sendButton.disabled) return;

    messages.push({ role: 'user', content });
    while (
      messages.length > 12 ||
      messages.reduce((length, message) => length + message.content.length, 0) > 8000
    ) {
      messages.shift();
    }
    addMessage('user', content);
    input.value = '';
    sendButton.disabled = true;
    input.disabled = true;
    sendButton.textContent = '...';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: messages.slice(-12) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Хүсэлт амжилтгүй боллоо.');

      messages.push({ role: 'assistant', content: result.reply });
      addMessage('assistant', result.reply);
    } catch (error) {
      messages.pop();
      addMessage('assistant', error.message || 'Алдаа гарлаа. Дахин оролдоно уу.', true);
    } finally {
      sendButton.disabled = false;
      input.disabled = false;
      sendButton.textContent = 'Илгээх';
      input.focus();
    }
  });
})();

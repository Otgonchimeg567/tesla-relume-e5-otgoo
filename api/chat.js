const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOTAL_LENGTH = 8000;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Зөвхөн POST хүсэлт зөвшөөрнө.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Claude холболт тохируулагдаагүй байна.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Хүсэлтийн формат буруу байна.' });
  }
  const messages = body && body.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: 'Зурвасын формат буруу байна.' });
  }

  let totalLength = 0;
  const conversation = [];
  for (const message of messages) {
    if (
      !message ||
      !['user', 'assistant'].includes(message.role) ||
      typeof message.content !== 'string' ||
      message.content.trim().length === 0 ||
      message.content.length > MAX_MESSAGE_LENGTH
    ) {
      return res.status(400).json({ error: 'Зурвасын формат буруу байна.' });
    }

    totalLength += message.content.length;
    if (totalLength > MAX_TOTAL_LENGTH) {
      return res.status(413).json({ error: 'Яриа хэт урт байна. Шинэ яриа эхлүүлнэ үү.' });
    }

    conversation.push({ role: message.role, content: message.content });
  }

  if (conversation[conversation.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Сүүлийн зурвас хэрэглэгчийнх байх ёстой.' });
  }

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5',
        max_tokens: 800,
        system:
          'Та энэ бие даасан Tesla танилцуулгын сайтын Монгол хэлтэй туслах. Tesla, Inc.-ийн албан ёсны төлөөлөгч биш гэдгээ шаардлагатай үед тодорхой хэл. Сайтын хуудсанд харагдаж буй мэдээллээр тусал; мэдэхгүй үнэ, боломж, захиалгын нөхцөлийг зохиож хэлэхгүй, албан ёсны мэдээллийг Tesla-гийн сайтаас шалгахыг зөвлө. Товч, найрсаг, Монгол хэлээр хариул.',
        messages: conversation,
      }),
    });
  } catch (error) {
    console.error('Claude API request failed:', error);
    return res.status(502).json({ error: 'Claude-тэй холбогдож чадсангүй. Дахин оролдоно уу.' });
  }

  if (!response.ok) {
    console.error(`Claude API returned ${response.status}`);
    return res.status(502).json({ error: 'Claude хариу өгөхөд алдаа гарлаа. Дахин оролдоно уу.' });
  }

  const result = await response.json();
  const reply = Array.isArray(result.content)
    ? result.content.filter((part) => part.type === 'text').map((part) => part.text).join('')
    : '';

  if (!reply) {
    console.error('Claude API returned no text content');
    return res.status(502).json({ error: 'Claude хоосон хариу өглөө. Дахин оролдоно уу.' });
  }

  return res.status(200).json({ reply });
};

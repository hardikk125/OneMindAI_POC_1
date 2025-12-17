// Test Gemini SSE streaming endpoint
async function testGemini() {
  console.log('Testing Gemini SSE streaming...');
  
  const response = await fetch('http://localhost:3002/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Count from 1 to 5' }],
      model: 'gemini-2.5-flash-lite',
      stream: true,
    }),
  });

  console.log('Response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('Error:', error);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log('\n=== Stream ended ===');
      break;
    }
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          console.log('\n[DONE] signal received');
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            process.stdout.write(text);
          }
        } catch (e) {
          console.error('\nParse error:', e.message);
        }
      }
    }
  }
}

testGemini().catch(console.error);

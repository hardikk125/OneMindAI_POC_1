// Test Gemini streaming endpoint
async function testGemini() {
  console.log('Testing Gemini streaming...');
  
  const response = await fetch('http://localhost:3002/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Say "Hello World" in 3 words' }],
      model: 'gemini-2.5-flash-lite',
      stream: true,
    }),
  });

  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers));

  if (!response.ok) {
    const error = await response.text();
    console.error('Error:', error);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log('Stream ended');
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    console.log('Chunk:', chunk);
  }
}

testGemini().catch(console.error);

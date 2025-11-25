// api/send-emote.js
// ⚡ VERCEL SERVERLESS FUNCTION - SUPER FAST API PROXY

export default async function handler(req, res) {
  const startTime = Date.now();
  
  // ✅ CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Handle OPTIONS request (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // ✅ Quick method check
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const params = req.query;
    
    // ✅ Fast validation with single condition
    if (!params?.server || !params?.tc || !params?.uid1 || !params?.emote_id) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['server', 'tc', 'uid1', 'emote_id']
      });
    }

    // ✅ Optimized URL building using array join (faster than string concatenation)
    const urlParts = [`${params.server}/join?tc=${encodeURIComponent(params.tc)}`];
    
    // Add UIDs efficiently (up to 5)
    for (let i = 1; i <= 5; i++) {
      if (params[`uid${i}`]) {
        urlParts.push(`uid${i}=${encodeURIComponent(params[`uid${i}`])}`);
      }
    }
    
    urlParts.push(`emote_id=${encodeURIComponent(params.emote_id)}`);
    
    const apiUrl = urlParts.join('&');

    console.log('⚡ API Call:', apiUrl);

    // ✅ Fast fetch with timeout protection and optimized headers
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'NOVRA-X-Bot/1.0',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    // ✅ Stream response for faster processing
    const responseText = await response.text();
    
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ Response in ${elapsed}ms - Status: ${response.status}`);

    // ✅ Minimal response payload for speed
    return res.status(200).json({
      success: true,
      status: response.status,
      elapsed: elapsed,
      message: 'Emote sent successfully',
      data: responseText
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;
    
    console.error(`❌ Error after ${elapsed}ms:`, error.message);
    
    // ✅ Handle timeout specifically
    const isTimeout = error.name === 'AbortError';
    
    return res.status(isTimeout ? 504 : 500).json({
      success: false,
      error: isTimeout ? 'Request timeout (8s)' : error.message,
      elapsed: elapsed
    });
  }
}
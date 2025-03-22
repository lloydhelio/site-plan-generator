const axios = require('axios');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body;
    
    // Call Claude API
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      messages: [
        { "role": "user", "content": prompt }
      ]
    }, {
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    });
    
    // Get Claude's response text
    const assistantMessage = response.data.content[0].text;
    
    // Extract SVG code
    const svgMatch = assistantMessage.match(/<svg[\s\S]*?<\/svg>/);
    
    if (svgMatch) {
      const svgCode = svgMatch[0];
      return res.status(200).json({ svg: svgCode });
    } else {
      console.log("No SVG found in Claude response:", assistantMessage.substring(0, 200));
      return res.status(200).json({ 
        error: "No SVG code found in the response.",
        responsePreview: assistantMessage.substring(0, 200) + "..."
      });
    }
  } catch (error) {
    console.error('Error details:', error);
    
    let errorMessage = 'Failed to generate site plan';
    
    if (error.response) {
      errorMessage = `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
      errorMessage = 'No response received from API';
    } else {
      errorMessage = `Request Error: ${error.message}`;
    }
    
    return res.status(500).json({ error: errorMessage });
  }
}
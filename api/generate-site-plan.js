// api/generate-site-plan.js
const axios = require('axios');

module.exports = async (req, res) => {
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
    
    // Validate the prompt
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing prompt in request body' });
    }
    
    // Validate the API key
    if (!process.env.CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'API key is not configured' });
    }
    
    console.log('Sending request to Claude 3.7 API...');
    
    // Call Claude API - using the standard messages endpoint, not the batch endpoint
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      temperature: 0.2, // Lower temperature for more predictable SVG output
      messages: [
        { "role": "user", "content": prompt }
      ]
    }, {
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01' // Using the standard version header
      },
      timeout: 50000 // 50 second timeout for the HTTP request
    });
    
    console.log('Received response from Claude 3.7 API');
    
    // Get Claude's response text
    const assistantMessage = response.data.content[0].text;
    
    // Extract SVG code
    const svgMatch = assistantMessage.match(/<svg[\s\S]*?<\/svg>/);
    
    if (svgMatch) {
      const svgCode = svgMatch[0];
      console.log('Successfully extracted SVG code');
      return res.status(200).json({ svg: svgCode });
    } else {
      console.log("No SVG found in Claude response. First 200 chars:", assistantMessage.substring(0, 200));
      return res.status(200).json({ 
        error: "No SVG code found in the response.",
        responsePreview: assistantMessage.substring(0, 200) + "..."
      });
    }
  } catch (error) {
    console.error('Error calling Claude API:', error.message);
    
    let errorMessage = 'Failed to generate site plan';
    let statusCode = 500;
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = `API Error (${error.response.status}): ${JSON.stringify(error.response.data || {})}`;
      console.error('Response error details:', error.response.data);
      statusCode = error.response.status >= 400 && error.response.status < 500 ? 400 : 500;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'Request timeout or no response from API';
      console.error('Request error details:', error.code, error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = `Request setup error: ${error.message}`;
    }
    
    return res.status(statusCode).json({ error: errorMessage });
  }
}
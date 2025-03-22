const axios = require('axios');

exports.handler = async function(event, context) {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { prompt } = JSON.parse(event.body);
    
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
    
    // Extract SVG code from response
    const assistantMessage = response.data.content[0].text;
    
    // Basic regex to extract SVG code
    const svgMatch = assistantMessage.match(/<svg[\s\S]*?<\/svg>/);
    const svgCode = svgMatch ? svgMatch[0] : '';
    
    return {
      statusCode: 200,
      body: JSON.stringify({ svg: svgCode }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate site plan' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};
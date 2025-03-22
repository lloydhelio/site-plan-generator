const axios = require('axios');

exports.handler = async function(event, context) {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        body: JSON.stringify({ error: 'Method Not Allowed' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
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
    
    // Get Claude's response text
    const assistantMessage = response.data.content[0].text;
    
    // Log for debugging
    console.log("Claude response first 100 chars:", assistantMessage.substring(0, 100));
    
    // Extract SVG code - look for content between <svg and </svg>
    const svgMatch = assistantMessage.match(/<svg[\s\S]*?<\/svg>/);
    
    if (svgMatch) {
      const svgCode = svgMatch[0];
      
      return {
        statusCode: 200,
        body: JSON.stringify({ svg: svgCode }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    } else {
      // Log the full response when no SVG is found
      console.log("No SVG found in Claude response. Full response:", assistantMessage);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          error: "No SVG code found in the response from Claude.",
          responsePreview: assistantMessage.substring(0, 200) + "..." 
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }
  } catch (error) {
    console.error('Error details:', error);
    
    let errorMessage = 'Failed to generate site plan';
    
    // Try to extract more useful error information
    if (error.response) {
      // API responded with error status
      console.error('API Error Response:', error.response.data);
      errorMessage = `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
      // Request was made but no response
      errorMessage = 'No response received from API';
    } else {
      // Error in setting up the request
      errorMessage = `Request Error: ${error.message}`;
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { verifyToken } = require('../middleware/auth');
require('dotenv').config();

// Initialize Gemini
let model = null;
if (process.env.GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  } catch (err) {
    console.error('Failed to initialize Google Generative AI:', err.message);
  }
} else {
  console.warn('WARNING: GEMINI_API_KEY not configured. AI routes will return 503 Service Unavailable.');
}

// In-memory request tracker for rate limiting (max 10 requests per hour per user)
const aiRateLimits = {};

function checkAiRateLimit(req, res, next) {
  const userId = req.user.user_id;
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!aiRateLimits[userId]) {
    aiRateLimits[userId] = [];
  }

  // Filter timestamps to keep only those from the last 1 hour
  aiRateLimits[userId] = aiRateLimits[userId].filter(timestamp => (now - timestamp) < oneHour);

  if (aiRateLimits[userId].length >= 10) {
    return res.status(429).json({
      success: false,
      error: "AI request limit reached. Try again in 1 hour."
    });
  }

  aiRateLimits[userId].push(now);
  next();
}

// Safe JSON Extraction Helper
function extractJSON(text) {
  // Strip Markdown JSON fences if they are present
  const clean = text.replace(/```json|```/gi, '').trim();
  return JSON.parse(clean);
}

// @route   POST /api/ai/plant-advisor
// @desc    Get custom plant and package suggestions for customer's balcony
// @access  Private
router.post('/plant-advisor', verifyToken, checkAiRateLimit, async (req, res, next) => {
  const { balcony_size, sunlight, city, preferences, budget } = req.body;

  if (!balcony_size || !sunlight || !city || !budget) {
    return res.status(400).json({ success: false, error: 'Balcony size, sunlight level, city, and budget are required.' });
  }

  if (!model) {
    return res.status(503).json({ success: false, error: 'AI advisor unavailable. Gemini API Key is missing or invalid on the server.' });
  }

  const prompt = `
    You are GreenBot, an expert balcony garden designer for Indian urban homes.
    The user lives in ${city} with a ${balcony_size} balcony receiving ${sunlight}.
    Their preferences: ${preferences || 'None specified'}.
    Budget: ₹${budget}.

    Based on the products we stock (plants: Aloe Vera, Money Plant, Tulsi; pots: Terracotta Pot, Hanging Basket; decor: Solar String Lights; fertilizers: Vermicompost, Neem Cake Powder), give them a personalized garden recommendation.

    Return ONLY valid JSON in this exact format, no markdown fences:
    {
      "recommended_plants": [
        { "name": "...", "reason": "...", "care_level": "Easy|Medium|Hard", "price_estimate": 150 }
      ],
      "suggested_package": "Small|Medium|Premium",
      "care_tips": ["tip1", "tip2", "tip3"],
      "warnings": ["warning if any"],
      "estimated_total": 1200,
      "confidence_note": "one sentence about why this recommendation fits them"
    }

    Be specific to Indian climate and Telugu/Andhra preferences. Avoid generic advice. Mention actual plant names available in Indian nurseries.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    try {
      const parsedData = extractJSON(text);

      // Validate required keys
      const requiredKeys = ['recommended_plants', 'suggested_package', 'care_tips', 'warnings', 'estimated_total', 'confidence_note'];
      const hasAllKeys = requiredKeys.every(key => Object.prototype.hasOwnProperty.call(parsedData, key));

      if (!hasAllKeys) {
        throw new Error('Missing keys in AI response');
      }

      res.status(200).json({
        success: true,
        data: parsedData
      });
    } catch (parseErr) {
      console.error('JSON Parse failed for Gemini output:', text);
      return res.status(422).json({
        success: false,
        error: "AI returned unexpected format. Try again."
      });
    }
  } catch (err) {
    console.error('Gemini API execution failed:', err);
    res.status(503).json({
      success: false,
      error: "AI advisor unavailable. Please try again."
    });
  }
});

// @route   POST /api/ai/booking-assistant
// @desc    Suggest optimal booking date and plan based on customer details
// @access  Private
router.post('/booking-assistant', verifyToken, checkAiRateLimit, async (req, res, next) => {
  const { service_preference, budget, available_dates, existing_plants, concerns } = req.body;

  if (!service_preference || !budget || !available_dates || available_dates.length === 0) {
    return res.status(400).json({ success: false, error: 'Service preference, budget, and available dates are required.' });
  }

  if (!model) {
    return res.status(503).json({ success: false, error: 'AI booking assistant unavailable. Gemini API Key is missing or invalid on the server.' });
  }

  const prompt = `
    You are GreenBot, a smart booking assistant for GreenBalcony — a balcony garden service platform in India.

    Customer details:
    - Service preference: ${service_preference}
    - Budget: ₹${budget}
    - Available dates: ${JSON.stringify(available_dates)}
    - Existing plants: ${JSON.stringify(existing_plants || [])}
    - Customer concern: ${concerns || 'None'}

    Recommend the best booking plan for this customer.

    Return ONLY valid JSON, no markdown:
    {
      "recommended_service": "Setup|Maintenance",
      "service_type": "Watering|Cleaning|Fertilizing|Plant Care|Pruning",
      "suggested_products": [
        { "product_name": "...", "reason": "...", "estimated_price": 250 }
      ],
      "optimal_date": "YYYY-MM-DD from the available dates provided",
      "estimated_total": 1200,
      "booking_reason": "2-3 sentence explanation of why this plan fits",
      "urgency": "Low|Medium|High",
      "follow_up_tip": "one actionable tip for after the service"
    }

    Be practical. Match recommendations to Indian balcony gardening realities.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const parsedData = extractJSON(text);

      const requiredKeys = ['recommended_service', 'service_type', 'suggested_products', 'optimal_date', 'estimated_total', 'booking_reason', 'urgency', 'follow_up_tip'];
      const hasAllKeys = requiredKeys.every(key => Object.prototype.hasOwnProperty.call(parsedData, key));

      if (!hasAllKeys) {
        throw new Error('Missing keys in booking assistant AI response');
      }

      res.status(200).json({
        success: true,
        data: parsedData
      });
    } catch (parseErr) {
      console.error('JSON Parse failed for Gemini output:', text);
      return res.status(422).json({
        success: false,
        error: "AI returned unexpected format. Try again."
      });
    }
  } catch (err) {
    console.error('Gemini API execution failed:', err);
    res.status(503).json({
      success: false,
      error: "AI booking assistant unavailable. Please try again."
    });
  }
});

// @route   POST /api/ai/garden-chat
// @desc    Interactive gardening chatbot keeping state of conversation history
// @access  Private
router.post('/garden-chat', verifyToken, checkAiRateLimit, async (req, res, next) => {
  const { chatHistory, question } = req.body;

  if (!question) {
    return res.status(400).json({ success: false, error: 'Question is required.' });
  }

  if (!model) {
    return res.status(503).json({ success: false, error: 'AI Chat unavailable. Gemini API Key is missing or invalid on the server.' });
  }

  // Format chat history
  let formattedHistory = '';
  if (chatHistory && chatHistory.length > 0) {
    formattedHistory = chatHistory
      .map(chat => `${chat.role === 'user' ? 'user' : 'greenbot'}: ${chat.message}`)
      .join('\n');
  }

  const prompt = `
    You are GreenBot, an expert gardening assistant for GreenBalcony India.
    You help customers care for their balcony gardens after booking services.
    You know Indian plant varieties, climate zones (especially Andhra Pradesh and Telangana), and common urban balcony gardening problems.

    You are NOT a general AI assistant. Only answer gardening questions.
    If asked about non-gardening topics, politely redirect:
    "I'm here to help with your garden! Ask me about plants, watering, fertilizing, or your balcony setup."

    Conversation so far:
    ${formattedHistory}

    New question: ${question}

    Reply in 2-4 short paragraphs. Be warm, expert, and practical.
    Give at least one specific actionable step.
    Do not mention you are Gemini or an AI — you are GreenBot.

    Return ONLY valid JSON:
    { "reply": "your full response here as a single string" }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const parsedData = extractJSON(text);

      if (!parsedData.reply) {
        throw new Error('Missing reply key in chat AI response');
      }

      res.status(200).json({
        success: true,
        data: parsedData
      });
    } catch (parseErr) {
      console.error('JSON Parse failed for Gemini output:', text);
      return res.status(422).json({
        success: false,
        error: "AI returned unexpected format. Try again."
      });
    }
  } catch (err) {
    console.error('Gemini API execution failed:', err);
    res.status(503).json({
      success: false,
      error: "AI Chat unavailable. Please try again."
    });
  }
});

module.exports = router;

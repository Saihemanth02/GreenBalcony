const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { verifyToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
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

// @route   POST /api/ai/voice-assistant
// @desc    Interactive voice and chat assistant for landing page and dashboard
// @access  Public (Optional Authentication)
router.post('/voice-assistant', async (req, res, next) => {
  const { chatHistory, question } = req.body;

  if (!question) {
    return res.status(400).json({ success: false, error: 'Question is required.' });
  }

  if (!model) {
    return res.status(503).json({ success: false, error: 'AI Assistant unavailable. Gemini API Key is missing or invalid on the server.' });
  }

  // Parse optional token
  const authHeader = req.headers['authorization'];
  let user = null;
  if (authHeader) {
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length === 2 && tokenParts[0] === 'Bearer') {
      try {
        const decoded = jwt.decode(tokenParts[1]);
        if (decoded && (!decoded.exp || Date.now() < decoded.exp * 1000)) {
          if (decoded.user_metadata) {
            decoded.role = decoded.user_metadata.role || decoded.role;
            decoded.name = decoded.user_metadata.name;
          }
          decoded.user_id = decoded.sub || decoded.user_id;
          user = decoded;
        }
      } catch(e) {}
    }
  }

  // Rate Limiting (max 30 requests per hour per user/IP)
  const rateLimitKey = user ? user.user_id : req.ip;
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (!aiRateLimits[rateLimitKey]) {
    aiRateLimits[rateLimitKey] = [];
  }
  aiRateLimits[rateLimitKey] = aiRateLimits[rateLimitKey].filter(t => (now - t) < oneHour);

  if (aiRateLimits[rateLimitKey].length >= 30) {
    return res.status(429).json({
      success: false,
      error: "AI Assistant request limit reached. Please try again in an hour."
    });
  }
  aiRateLimits[rateLimitKey].push(now);

  // Format chat history
  let formattedHistory = '';
  if (chatHistory && chatHistory.length > 0) {
    formattedHistory = chatHistory
      .map(chat => `${chat.role === 'user' ? 'user' : 'assistant'}: ${chat.message}`)
      .join('\n');
  }

  const userContext = user ? `The user is logged in. Their name is ${user.name || 'Valued Customer'}.` : 'The user is a visitor (not logged in).';

  const prompt = `
    You are GreenBalcony AI, the intelligent voice and chat assistant for GreenBalcony.
    Mission: "Your Garden, Our Responsibility."

    CONTEXT:
    ${userContext}

    PRIMARY GOALS:
    1. Help visitors understand GreenBalcony services.
    2. Recommend suitable garden packages.
    3. Suggest plants and decorations.
    4. Convert visitors into customers.
    5. Assist with bookings and maintenance requests.
    6. Guide users through the website.
    7. Provide quick and accurate support.

    WELCOME MESSAGE:
    "🌿 Welcome to GreenBalcony! I'm your AI Garden Assistant. I can help you choose plants, design your balcony garden, recommend packages, schedule maintenance, or book a service. How can I help you today?"

    HOMEPAGE ASSISTANCE:
    Help users explore: Garden Packages, Plants, Balcony Decorations, Garden Setup Ideas, Maintenance Services, Booking Services.

    SUPPORTED USER REQUESTS:
    1. Package Selection: Help users choose: Small Balcony Package, Medium Garden Package, Premium Garden Package. Ask: Balcony size, Budget, Maintenance preference, Sunlight availability. Recommend the most suitable package.
    2. Plant Recommendations: Collect: Balcony size, Indoor or outdoor, Location, Sunlight hours, Maintenance preference. Recommend suitable plants and explain why they are a good fit.
    3. Balcony Design Guidance: Modern Balcony Gardens, Minimal Balcony Gardens, Vertical Gardens, Eco-Friendly Gardens, Decorative Balcony Spaces. Suggest suitable plants, layouts, and decorations.
    4. Maintenance Assistance: Watering, Fertilizing, Plant Care, Cleaning, Seasonal Maintenance. Keep advice practical and easy to follow.
    5. Booking Assistance: Before creating a booking, confirm: Package, Date, Time, Address, Contact Number. Always ask for confirmation before proceeding. Never assume missing information.
    6. Navigation Assistance: Help users navigate to:
       - Packages -> target: "packages"
       - Plants -> target: "plants"
       - Decorations -> target: "decorations"
       - Setup Ideas -> target: "ideas"
       - Bookings -> target: "bookings"
       - Maintenance Services -> target: "maintenance"
       - User Dashboard -> target: "dashboard"
       - Notifications -> target: "notifications"
       - Payments -> target: "payments"
       - Profile -> target: "profile"
       
       IF NAVIGATION IS NEEDED, set "action" to "navigate" and specify "target".
       Otherwise set "action" to "chat" and "target" to null.

    VOICE CONVERSATION RULES:
    - Respond strictly in Telugu (using Telugu script) for all replies, regardless of whether the user queries in English or Telugu.
    - Be friendly and professional.
    - Sound natural when spoken aloud in Telugu.
    - Keep response under 50 words in Telugu whenever possible.
    - Avoid long explanations.


    SAFETY & SALES RULES:
    - Recommend additional services only when relevant (Maintenance Plans, Decorative Items, Premium Packages, Seasonal Plants). Focus on helping first, do not pressure.
    - Never invent booking info, payment details, claim actions completed unless confirmed, or guess account info.
    - Offer one helpful next step at the end of successful interactions (e.g. "Would you like me to recommend plants...", "Would you like to explore...", "Would you like help scheduling...").

    Conversation history:
    ${formattedHistory}

    User message: ${question}

    You must respond with a JSON object in this exact format (no markdown, no backticks, no other text):
    {
      "reply": "your text response here",
      "action": "chat" or "navigate",
      "target": "packages" or "plants" or "decorations" or "ideas" or "bookings" or "maintenance" or "dashboard" or "notifications" or "payments" or "profile" or null
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const parsedData = extractJSON(text);

      if (!parsedData.reply) {
        throw new Error('Missing reply key in AI response');
      }

      res.status(200).json({
        success: true,
        data: parsedData
      });
    } catch (parseErr) {
      console.error('JSON Parse failed for Gemini output:', text);
      return res.status(422).json({
        success: false,
        error: "AI returned unexpected format. Please try again."
      });
    }
  } catch (err) {
    console.error('Gemini API execution failed, using local Telugu fallback:', err.message || err);
    
    // Fallback checks for daily quota limits
    const q = question.toLowerCase();
    let reply = "క్షమించండి, ప్రస్తుతం నా సర్వర్ కొద్దిగా బిజీగా ఉంది (Gemini API కోటా ముగిసింది). నేను మీకు ఎలా సహాయపడగలను?";
    let action = "chat";
    let target = null;

    if (q.includes('telugu') || q.includes('tleugu') || q.includes('telgu') || q.includes('తెలుగు') || q.includes('ochu') || q.includes('ocha')) {
      reply = "అవును, నాకు తెలుగు బాగా వచ్చు! గ్రీన్‌బాల్కనీ గురించి మీకు ఏ సమాచారం కావాలి?";
    } else if (q.includes('plant') || q.includes('mokka') || q.includes('మొక్క')) {
      reply = "మా వద్ద అలోవెరా, మనీ ప్లాంట్, మరియు తులసి మొక్కలు లభిస్తాయి. మొక్కల జాబితా కోసం మిమ్మల్ని క్యాటలాగ్ పేజీకి తీసుకెళ్తున్నాను.";
      action = "navigate";
      target = "plants";
    } else if (q.includes('package') || q.includes('ప్యాకేజీ') || q.includes('offer')) {
      reply = "మా వద్ద బాల్కనీ తోట కోసం చిన్న, మధ్యస్థ మరియు ప్రీమియం ప్యాకేజీలు అందుబాటులో ఉన్నాయి. మరిన్ని వివరాల కోసం క్యాటలాగ్ చూడండి.";
      action = "navigate";
      target = "packages";
    } else if (q.includes('book') || q.includes('బుక్') || q.includes('order')) {
      reply = "సర్వీస్ లేదా సెటప్ బుక్ చేయడానికి, మిమ్మల్ని బుకింగ్ పేజీకి తీసుకెళ్తున్నాను.";
      action = "navigate";
      target = "bookings";
    } else if (q.includes('maintenance') || q.includes('clean') || q.includes('మెయింటెనెన్స్')) {
      reply = "తోట మెయింటెనెన్స్ షెడ్యూల్ మరియు వివరాల కోసం మిమ్మల్ని మెయింటెనెన్స్ పేజీకి మళ్లిస్తున్నాను.";
      action = "navigate";
      target = "maintenance";
    } else if (q.includes('dashboard') || q.includes('డాష్') || q.includes('account')) {
      reply = "మీ తోట వివరాలు మరియు ఆర్డర్ల కోసం మిమ్మల్ని డాష్‌బోర్డ్ పేజీకి తీసుకువెళ్తున్నాను.";
      action = "navigate";
      target = "dashboard";
    } else if (q.includes('payment') || q.includes('డబ్బు') || q.includes('bill')) {
      reply = "మీ బిల్లులు మరియు పేమెంట్ రశీదుల కోసం మిమ్మల్ని పేమెంట్స్ పేజీకి మళ్లిస్తున్నాను.";
      action = "navigate";
      target = "payments";
    } else if (q.includes('hi') || q.includes('hello') || q.includes('హలో') || q.includes('namaste') || q.includes('నమస్తే')) {
      reply = "నమస్తే! నేను గ్రీన్‌బాల్కనీ AI అసిస్టెంట్‌ని. మీకు మొక్కల ప్యాకేజీలు, బుకింగ్స్ లేదా మెయింటెనెన్స్ గురించి ఏ సమాచారం కావాలి?";
    }

    return res.status(200).json({
      success: true,
      data: {
        reply,
        action,
        target
      }
    });
  }
});

module.exports = router;

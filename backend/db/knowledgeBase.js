/**
 * GreenBalcony Knowledge Base
 * Predefined Q&A entries in English and Telugu for local lookup
 * with keyword/phrase scoring and automatic fallback detection.
 */

const knowledgeBase = [
  {
    id: 'packages',
    keywords: [
      'package', 'packages', 'offer', 'offers', 'plan', 'plans', 'cost', 'price', 'rate',
      'ప్యాకేజీ', 'ప్యాకేజీలు', 'ప్లాన్', 'ధర', 'రేటు', 'ఖర్చు', 'ఆఫర్లు'
    ],
    phrases: [
      'what packages do you offer', 'garden packages', 'balcony packages',
      'how much does it cost', 'package prices',
      'ఏ ప్యాకేజీలు ఉన్నాయి', 'గార్డెన్ ప్యాకేజీలు', 'ధరలు ఎంత', 'ప్లాన్స్ ఏంటి'
    ],
    action: 'navigate',
    target: 'packages',
    reply: {
      en: "We offer three main balcony garden packages:\n1. **Small Balcony Package** (₹1,999): Ideal for small spaces, includes 4 plants, 4 pots, vermicompost, and basic setup.\n2. **Medium Garden Package** (₹4,999): For medium balconies, includes 8 plants, premium pots, solar string lights, and full setup.\n3. **Premium Garden Package** (₹9,999): Full balcony transformation, includes 15+ plants, vertical garden structures, premium designer pots, decor, and 1 month free maintenance.",
      te: "మేము మూడు ప్రధాన బాల్కనీ గార్డెన్ ప్యాకేజీలను అందిస్తున్నాము:\n1. **చిన్న బాల్కనీ ప్యాకేజీ** (₹1,999): చిన్న స్థలాలకు అనుకూలం, 4 మొక్కలు, 4 కుండీలు, ఎరువులు మరియు ప్రాథమిక సెటప్ ఉంటుంది.\n2. **మధ్యస్థ గార్డెన్ ప్యాకేజీ** (₹4,999): 8 మొక్కలు, ప్రీమియం కుండీలు, సోలార్ లైట్లు మరియు పూర్తి డిజైన్ సెటప్ ఉంటుంది.\n3. **ప్రీమియం గార్డెన్ ప్యాకేజీ** (₹9,999): పూర్తి బాల్కనీ పరివర్తన, 15+ మొక్కలు, వర్టికల్ గార్డెన్ సెటప్, ప్రీమియం అలంకరణలు మరియు 1 నెల ఉచిత మెయింటెనెన్స్ ఉంటాయి."
    }
  },
  {
    id: 'booking',
    keywords: [
      'book', 'booking', 'order', 'reserve', 'schedule setup', 'checkout', 'how to buy',
      'బుక్', 'బుకింగ్', 'ఆర్డర్', 'కొనడం ఎలా', 'షెడ్యూల్', 'సర్వీస్ బుక్'
    ],
    phrases: [
      'how to book a service', 'book setup', 'make a booking', 'place an order',
      'బుకింగ్ ఎలా చేయాలి', 'ఆర్డర్ ఎలా పెట్టాలి', 'బుక్ చేయండి'
    ],
    action: 'navigate',
    target: 'bookings',
    reply: {
      en: "Booking a service is easy! Navigate to our **Bookings** page, choose your preferred package, select an available date and time slot, fill in your address details, and confirm. Once submitted, our team will review and assign an employee to transform your balcony.",
      te: "సర్వీస్ బుక్ చేయడం చాలా సులభం! మా **బుకింగ్స్** పేజీకి వెళ్లి, మీకు నచ్చిన ప్యాకేజీని ఎంచుకోండి, అందుబాటులో ఉన్న తేదీ మరియు సమయాన్ని సెలెక్ట్ చేయండి, మీ చిరునామాను పూరించి కన్ఫర్మ్ చేయండి. మా టీమ్ రివ్యూ చేసి మీ బాల్కనీ తోటను ఏర్పాటు చేయడానికి వర్కర్‌ను నియమిస్తుంది."
    }
  },
  {
    id: 'maintenance',
    keywords: [
      'maintenance', 'clean', 'pruning', 'care service', 'watering service', 'trim', 'trimming',
      'మెయింటెనెన్స్', 'క్లీనింగ్', 'కత్తిరించడం', 'నీరు పోయడం', 'రక్షణ సేవలు'
    ],
    phrases: [
      'do you offer maintenance', 'maintenance service details', 'clean my garden',
      'మెయింటెనెన్స్ సేవలు', 'తోట క్లీన్ చేయడం', 'మెయింటెనెన్స్ ప్యాకేజీ'
    ],
    action: 'navigate',
    target: 'maintenance',
    reply: {
      en: "Yes, we provide expert maintenance services! This includes professional cleaning, seasonal pruning, organic fertilizing, soil aeration, and pest inspection. Standard maintenance plans start at ₹499 per visit. You can track all schedules on your dashboard.",
      te: "అవును, మేము నిపుణులైన మెయింటెనెన్స్ సేవలను అందిస్తాము! ఇందులో తోటను శుభ్రపరచడం, ఎండిన ఆకులను కత్తిరించడం, సేంద్రీయ ఎరువులు వేయడం మరియు తెగుళ్ల తనిఖీ ఉంటాయి. సాధారణ మెయింటెనెన్స్ ప్లాన్స్ ప్రతి విజిట్‌కు ₹499 నుండి ప్రారంభమవుతాయి. మీ డాష్‌బోర్డ్‌లో మీరు ఈ వివరాలను చూడవచ్చు."
    }
  },
  {
    id: 'plants',
    keywords: [
      'plant', 'plants', 'aloe vera', 'money plant', 'tulsi', 'inventory', 'stock',
      'మొక్క', 'మొక్కలు', 'అలోవెరా', 'మనీ ప్లాంట్', 'తులసి', 'ఏ మొక్కలు ఉన్నాయి'
    ],
    phrases: [
      'what plants are available', 'list of plants', 'aloe vera price', 'money plant price', 'tulsi price',
      'అందుబాటులో ఉన్న మొక్కలు', 'మొక్కల లిస్ట్', 'తులసి ధర', 'అలోవెరా ధర', 'మనీ ప్లాంట్ ధర'
    ],
    action: 'navigate',
    target: 'plants',
    reply: {
      en: "We stock premium quality plants tailored for balconies:\n- **Aloe Vera** (₹149): Low maintenance, medicinal plant.\n- **Money Plant** (₹199): Air-purifying, thrives in partial sunlight.\n- **Tulsi / Holy Basil** (₹99): Sacred Indian herb, high therapeutic value.\nAll plants are sourced from certified organic nurseries and delivered healthy.",
      te: "బాల్కనీలకు సరిపోయే ప్రీమియం నాణ్యత గల మొక్కలు మా వద్ద ఉన్నాయి:\n- **అలోవెరా** (₹149): తక్కువ నిర్వహణ అవసరమయ్యే ఔషధ మొక్క.\n- **మనీ ప్లాంట్** (₹199): గాలిని శుద్ధి చేసే పాక్షిక ఎండలో పెరిగే మొక్క.\n- **తులసి** (₹99): పవిత్రమైన మూలిక, అధిక ఆరోగ్య ప్రయోజనాలు కలది.\nమొక్కల క్యాటలాగ్ చూడటానికి మా ప్లాంట్స్ పేజీని సందర్శించండి."
    }
  },
  {
    id: 'pots_decor',
    keywords: [
      'pot', 'pots', 'basket', 'decor', 'decoration', 'light', 'lights', 'fertilizer', 'soil', 'vermicompost',
      'కుండీ', 'కుండీలు', 'బాస్కెట్', 'అలంకరణ', 'లైట్లు', 'ఎరువులు', 'మట్టి', 'వర్మికంపోస్ట్'
    ],
    phrases: [
      'what pots do you have', 'decor items', 'fertilizer price', 'hanging baskets',
      'కుండీల ధర ఎంత', 'సోలార్ లైట్లు', 'ఎరువులు మరియు మట్టి'
    ],
    action: 'navigate',
    target: 'decorations',
    reply: {
      en: "We offer high-quality gardening accessories:\n- **Terracotta Pot** (₹129) & **Hanging Basket** (₹179).\n- **Solar String Lights** (₹399): Waterproof, auto-sensor outdoor lights.\n- **Vermicompost** (₹79/kg) & **Neem Cake Powder** (₹99/kg) for nutrition and organic pest protection.",
      te: "మేము నాణ్యమైన తోటపని వస్తువులను అందిస్తున్నాము:\n- **టెర్రకోట కుండీ** (₹129) & **హ్యాంగింగ్ బాస్కెట్** (₹179).\n- **సోలార్ స్ట్రింగ్ లైట్లు** (₹399): వాటర్‌ప్రూఫ్, ఆటో-సెన్సార్ కలిగిన అలంకరణ లైట్లు.\n- **వర్మికంపోస్ట్** (₹79/kg) & **వేప పిండి పొడి** (₹99/kg) సేంద్రీయ తెగుళ్ల నివారణ కోసం."
    }
  },
  {
    id: 'locations',
    keywords: [
      'location', 'locations', 'city', 'cities', 'operate', 'coverage', 'service area', 'service areas',
      'నగరం', 'నగరాలు', 'ప్రాంతాలు', 'సేవలు ఎక్కడెక్కడ', 'ఎక్కడ లభిస్తాయి'
    ],
    phrases: [
      'which cities do you operate in', 'where are your services available', 'do you serve hyderabad',
      'మీరు ఏ నగరాల్లో సేవలు అందిస్తారు', 'హైదరాబాద్‌లో ఉందా', 'ఆంధ్రా మరియు తెలంగాణా'
    ],
    reply: {
      en: "GreenBalcony operates in major urban cities across Andhra Pradesh and Telangana, including Hyderabad, Visakhapatnam, Vijayawada, Guntur, Tirupati, Nellore, Rajahmundry, Kakinada, Warangal, and Karimnagar. We are expanding to more cities soon!",
      te: "గ్రీన్‌బాల్కనీ ఆంధ్రప్రదేశ్ మరియు తెలంగాణలోని ప్రధాన నగరాలైన హైదరాబాద్, విశాఖపట్నం, విజయవాడ, గుంటూరు, తిరుపతి, నెల్లూరు, రాజమండ్రి, కాకినాడ, వరంగల్ మరియు కరీంనగర్‌లలో సేవలు అందిస్తోంది. త్వరలోనే మరిన్ని నగరాలకు విస్తరిస్తాము!"
    }
  },
  {
    id: 'contact',
    keywords: [
      'contact', 'support', 'help', 'email', 'phone', 'call', 'address', 'office', 'number',
      'కాంటాక్ట్', 'సపోర్ట్', 'ఫోన్', 'ఈమెయిల్', 'చిరునామా', 'ఆఫీస్', 'సహాయం', 'నెంబర్'
    ],
    phrases: [
      'how to contact support', 'customer care number', 'where is your office', 'contact details',
      'కస్టమర్ కేర్ నెంబర్', 'మిమ్మల్ని ఎలా సంప్రదించాలి', 'ఆఫీస్ అడ్రస్'
    ],
    action: 'navigate',
    target: 'profile',
    reply: {
      en: "You can reach GreenBalcony customer support via:\n- **Email**: support@greenbalcony.com\n- **Phone**: +91 98765 43210 (9:00 AM to 6:00 PM, Mon-Sat)\n- **Office**: GVP MCA Campus, Madhurawada, Visakhapatnam, AP - 530048.",
      te: "మీరు గ్రీన్‌బాల్కనీ సపోర్ట్‌ను ఈ క్రింది విధంగా సంప్రదించవచ్చు:\n- **ఈమెయిల్**: support@greenbalcony.com\n- **ఫోన్**: +91 98765 43210 (ఉదయం 9 నుండి సాయంత్రం 6 వరకు, సోమ-శని)\n- **ఆఫీస్**: GVP MCA క్యాంపస్, మధురవాడ, విశాఖపట్నం, AP - 530048."
    }
  },
  {
    id: 'yellow_leaves',
    keywords: [
      'yellow', 'leaves', 'dry', 'dying', 'brown', 'spots', 'overwater', 'water log',
      'పసుపు', 'ఆకులు', 'ఆకులు రాలడం', 'ఎండిపోవడం', 'ఆకులు పసుపు రంగు', 'తెగుళ్లు'
    ],
    phrases: [
      'why are my leaves turning yellow', 'yellow leaves care', 'plant leaves drying',
      'మొక్కల ఆకులు పసుపు రంగులోకి మారడం', 'మొక్క ఎండిపోతుంది', 'మొక్క కాపాడడం ఎలా'
    ],
    reply: {
      en: "Yellow leaves are usually caused by:\n1. **Overwatering**: Check if the soil is muddy. Let the top 1-inch of soil dry before watering again.\n2. **Poor Drainage**: Ensure the pot's bottom holes are not clogged.\n3. **Sunlight Deficiency**: Move the plant to a brighter spot with indirect sunlight.",
      te: "ఆకులు పసుపు రంగులోకి మారడానికి ప్రధాన కారణాలు:\n1. **ఎక్కువగా నీరు పోయడం**: కుండీలో మట్టి బురదగా ఉందో లేదో చూడండి. పై మట్టి ఆరిన తర్వాతే మళ్లీ నీరు పోయాలి.\n2. **నీరు నిలిచిపోవడం**: కుండీ కింద రంధ్రాలు మూసుకుపోకుండా చూసుకోండి.\n3. **ఎండ లేకపోవడం**: మొక్కను తగినంత పరోక్ష సూర్యరశ్మి తగిలే ప్రదేశానికి మార్చండి."
    }
  },
  {
    id: 'drooping_leaves',
    keywords: [
      'droop', 'drooping', 'wilt', 'wilting', 'water frequency', 'how often to water',
      'వాలిపోవడం', 'నీరు ఎప్పుడు పోయాలి', 'నీటి ఎద్దడి'
    ],
    phrases: [
      'why is my plant drooping', 'wilting plants', 'how much water to give plants',
      'మొక్కలు వాలిపోతున్నాయి', 'నీరు ఎంత పోయాలి', 'నీటి సంరక్షణ'
    ],
    reply: {
      en: "Drooping is typically a sign of **underwatering**. Touch the soil; if it feels dry and dusty, water the plant thoroughly until water runs out of the drainage holes. For most balcony plants, watering once daily in summers and once every 2-3 days in winters/monsoon is ideal.",
      te: "మొక్క ఆకులు వాలిపోవడానికి ప్రధాన కారణం **నీరు తక్కువవడం**. మట్టిని తాకండి; పొడిగా, ధూళిలా ఉంటే కుండీ అడుగు రంధ్రాల నుండి నీరు వచ్చే వరకు బాగా నీరు పోయండి. వేసవిలో రోజుకు ఒకసారి, చలి/వర్షాకాలంలో 2-3 రోజులకు ఒకసారి నీరు పోయడం సరైన పద్ధతి."
    }
  },
  {
    id: 'diy_ideas',
    keywords: [
      'diy', 'ideas', 'design', 'layout', 'vertical', 'setup ideas', 'minimalist', 'balcony decoration',
      'decorate', 'decorating', 'డెకరేషన్', 'అలంకరించడం', 'డిజైన్', 'వర్టికల్ తోట', 'సొంతంగా తోట', 'బాల్కనీ డెకరేషన్ ఐడియాలు'
    ],
    phrases: [
      'balcony garden design ideas', 'how to decorate a small balcony', 'vertical garden setup DIY',
      'బాల్కనీ డెకరేట్ చేయడం ఎలా', 'వర్టికల్ గార్డెన్ ఐడియాస్', 'తోట నమూనాలు'
    ],
    action: 'navigate',
    target: 'ideas',
    reply: {
      en: "Great balcony design ideas include:\n- **Vertical Gardening**: Use wall hangers or wooden pallets for small balconies to maximize space.\n- **Minimalist setup**: Combine 3-4 clean terracotta pots with a wooden stool.\n- **Fairy Light Oasis**: Wrap Solar String Lights around the railing and place a cozy chair.\nCheck our **Setup Ideas** section on the landing page for visual templates!",
      te: "అందమైన బాల్కనీ తోట ఐడియాలు:\n- **వర్టికల్ గార్డెనింగ్**: గోడకు వేలాడే స్టాండ్‌లు లేదా చెక్క పలకలను వాడి స్థలాన్ని ఆదా చేయండి.\n- **మినిమలిస్ట్ సెటప్**: ఒక చెక్క స్టూల్ మీద 3-4 మట్టి కుండీలను అమర్చండి.\n- **లైటింగ్ డెకరేషన్**: సోలార్ స్ట్రింగ్ లైట్లను బాల్కనీ గ్రిల్స్‌కు చుట్టి రాత్రి వేళల్లో తోటను ప్రకాశవంతం చేయండి."
    }
  },
  {
    id: 'about',
    keywords: [
      'about', 'who are you', 'what is greenbalcony', 'founder', 'mission', 'purpose',
      'ఎవరు మీరు', 'గ్రీన్‌బాల్కనీ అంటే ఏమిటి', 'లక్ష్యం', 'ధేయం'
    ],
    phrases: [
      'what is the mission of greenbalcony', 'tell me about greenbalcony', 'who made this website',
      'గ్రీన్‌బాల్కనీ గురించి చెప్పండి', 'ఈ వెబ్‌సైట్ ఎవరిది'
    ],
    reply: {
      en: "GreenBalcony is a complete urban gardening solution. Our mission is **\"Your Garden, Our Responsibility\"**. We help apartment residents design and manage green spaces in their balconies. This platform was created as a MCA Mini Project at Gayatri Vidya Parishad College (GVP), Visakhapatnam.",
      te: "గ్రీన్‌బాల్కనీ అనేది పట్టణ తోటపని పరిష్కారం. మా ధ్యేయం **\"మీ తోట, మా బాధ్యత\"**. బాల్కనీలలో మొక్కలను పెంచుకోవాలనుకునే వారికి మేము పూర్తి సేవలు అందిస్తాము. ఈ ప్లాట్‌ఫారమ్ గాయత్రీ విద్యా పరిషత్ కాలేజ్ (GVP), విశాఖపట్నంలో MCA మినీ ప్రాజెక్ట్‌గా నిర్మించబడింది."
    }
  },
  {
    id: 'cancellation_refund',
    keywords: [
      'cancel', 'cancellation', 'refund', 'refunds', 'change order', 'modify',
      'రద్దు', 'క్యాన్సిల్', 'డబ్బులు వెనక్కి', 'రీఫండ్', 'ఆర్డర్ మార్చడం'
    ],
    phrases: [
      'cancellation policy', 'can i cancel my booking', 'how to get a refund',
      'బుకింగ్ రద్దు చేయడం ఎలా', 'రీఫండ్ రూల్స్'
    ],
    action: 'navigate',
    target: 'payments',
    reply: {
      en: "You can cancel or reschedule any booking up to 24 hours before the scheduled service time directly from your payments or orders page. Once cancelled, refunds are processed to your original payment method within 3-5 business days.",
      te: "మీరు బుక్ చేసిన సేవలను 24 గంటల ముందే మీ పేమెంట్స్ లేదా ఆర్డర్స్ పేజీ నుండి రద్దు చేసుకోవచ్చు లేదా సమయం మార్చుకోవచ్చు. రద్దు చేసిన 3-5 పనిదినాల్లో మీ డబ్బులు మీ ఖాతాకు తిరిగి జమ చేయబడతాయి."
    }
  }
];

/**
 * Searches the knowledge base for a query and returns the best matching entry.
 * Returns null if no match scores high enough.
 * @param {string} question - The user question
 * @returns {object|null} Matched knowledge base entry or null
 */
function matchKnowledgeBase(question) {
  if (!question) return null;

  // Normalize string: remove emojis/special characters, lowercase
  const cleanQ = question
    .toLowerCase()
    .replace(/🌿|⭐|★|☆|✈️|🎙️|🔔|🧑‍🌾|🪴|🚜|✨|📅/g, '')
    .trim();

  let bestMatch = null;
  let maxScore = 0;

  for (const entry of knowledgeBase) {
    let score = 0;

    // 1. Phrase matching (substantial weight)
    if (entry.phrases) {
      for (const phrase of entry.phrases) {
        const cleanPhrase = phrase.toLowerCase();
        if (cleanQ.includes(cleanPhrase)) {
          score += 8; // Match phrase directly
        }
      }
    }

    // 2. Keyword matching
    if (entry.keywords) {
      for (const keyword of entry.keywords) {
        const cleanKeyword = keyword.toLowerCase();
        
        // Use word boundary for English, substring for Telugu (no space boundaries)
        const isTelugu = /[\u0c00-\u0c7f]/.test(cleanKeyword);
        if (isTelugu) {
          if (cleanQ.includes(cleanKeyword)) {
            score += 3;
          }
        } else {
          const regex = new RegExp(`\\b${escapeRegExp(cleanKeyword)}\\b`, 'i');
          if (regex.test(cleanQ)) {
            score += 3;
          } else if (cleanQ.includes(cleanKeyword)) {
            score += 1; // Substring match fallback for English
          }
        }
      }
    }

    // Capture highest score above threshold
    if (score > maxScore && score >= 3) {
      maxScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

// Utility to escape special characters for regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  knowledgeBase,
  matchKnowledgeBase
};

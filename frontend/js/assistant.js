// GreenBalcony — AI Voice Assistant Widget logic
const AI_SERVER_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : `${window.location.origin}/api`;

const targets = {
  packages: 'catalog.html',
  plants: 'catalog.html',
  decorations: 'catalog.html',
  ideas: 'index.html#how-it-works',
  bookings: 'booking.html',
  maintenance: 'maintenance.html',
  dashboard: 'dashboard.html',
  notifications: 'dashboard.html',
  payments: 'payments.html',
  profile: 'dashboard.html'
};

const welcomeMsg = "🌿 గ్రీన్‌బాల్కనీకి స్వాగతం! నేను మీ AI గార్డెన్ అసిస్టెంట్‌ని. మొక్కలను ఎంచుకోవడంలో, మీ బాల్కనీ తోటను డిజైన్ చేయడంలో, ప్యాకేజీలను సిఫార్సు చేయడంలో లేదా సర్వీస్ బుక్ చేయడంలో నేను మీకు సహాయపడగలను. ఈరోజు నేను మీకు ఎలా సహాయపడగలను?";

// Chat History State
let chatHistory = [];
let recognition = null;
let currentUtterance = null;
let currentAudio = null;

// Initialize Widget
function injectWidget() {
  const container = document.createElement('div');
  container.id = 'gb-assistant-container';
  container.innerHTML = `
    <div id="gb-assistant-widget">
      <!-- Floating Bubble Button -->
      <button id="gb-assistant-bubble" class="pulse-button" title="GreenBalcony AI Voice Assistant">
        <span class="bubble-icon">🌿</span>
      </button>

      <!-- Chat Panel -->
      <div id="gb-assistant-panel" class="hidden">
        <div class="panel-header">
          <div class="panel-title-area">
            <span class="avatar">🌿</span>
            <div>
              <h4>GreenBalcony AI</h4>
              <span class="status-indicator online">Online</span>
            </div>
          </div>
          <button id="gb-assistant-close" class="close-btn">&times;</button>
        </div>
        
        <div id="gb-assistant-messages" class="message-area">
          <!-- Welcome message populated on open -->
        </div>
        
        <div id="gb-assistant-speech-status" class="speech-status hidden">
          Listening...
        </div>

        <div class="panel-footer">
          <div class="input-container">
            <input type="text" id="gb-assistant-input" placeholder="Type a message..." autocomplete="off">
            <button id="gb-assistant-mic" class="action-btn mic-btn" title="Speak to assistant">
              🎙️
            </button>
            <button id="gb-assistant-send" class="action-btn send-btn" title="Send message">
              ✈️
            </button>
          </div>
          <!-- Voice synthesis toggle -->
          <div class="voice-toggle-row">
            <label class="switch-container">
              <input type="checkbox" id="gb-assistant-voice-toggle" checked>
              <span class="slider"></span>
              <span class="toggle-label">Voice Response</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);
  
  // Attach listeners
  setupListeners();
}

function setupListeners() {
  const bubble = document.getElementById('gb-assistant-bubble');
  const panel = document.getElementById('gb-assistant-panel');
  const closeBtn = document.getElementById('gb-assistant-close');
  const inputEl = document.getElementById('gb-assistant-input');
  const sendBtn = document.getElementById('gb-assistant-send');
  const micBtn = document.getElementById('gb-assistant-mic');
  const voiceToggle = document.getElementById('gb-assistant-voice-toggle');

  let isFirstOpen = true;

  bubble.onclick = () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      bubble.classList.remove('pulse-button');
      if (isFirstOpen) {
        appendMessage('assistant', welcomeMsg);
        speakVoice(welcomeMsg);
        isFirstOpen = false;
      }
      inputEl.focus();
    } else {
      stopListening();
      cancelSpeech();
    }
  };

  closeBtn.onclick = () => {
    panel.classList.add('hidden');
    stopListening();
    cancelSpeech();
  };

  sendBtn.onclick = () => {
    handleUserSubmit();
  };

  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') {
      handleUserSubmit();
    }
  };

  // Web Speech API - Speech Recognition Setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.style.display = 'none'; // Speech recognition not supported in this browser
  } else {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    // support mixed English & Telugu
    recognition.lang = 'en-IN'; // Default to Indian English

    recognition.onstart = () => {
      micBtn.classList.add('listening');
      const statusEl = document.getElementById('gb-assistant-speech-status');
      statusEl.textContent = 'Listening... Speak now';
      statusEl.classList.remove('hidden');
      cancelSpeech();
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      inputEl.value = transcript;
      handleUserSubmit();
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopListening();
      if (event.error === 'not-allowed') {
        showToast('Microphone access denied. Enable permissions in your browser.', 'warning');
      }
    };

    recognition.onend = () => {
      stopListening();
    };

    micBtn.onclick = () => {
      if (micBtn.classList.contains('listening')) {
        stopListening();
      } else {
        try {
          recognition.start();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }
}

function stopListening() {
  const micBtn = document.getElementById('gb-assistant-mic');
  const statusEl = document.getElementById('gb-assistant-speech-status');
  if (micBtn) micBtn.classList.remove('listening');
  if (statusEl) statusEl.classList.add('hidden');
  if (recognition) {
    try {
      recognition.stop();
    } catch(e) {}
  }
}

function appendMessage(role, text) {
  const msgArea = document.getElementById('gb-assistant-messages');
  if (!msgArea) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `msg ${role}`;
  msgDiv.innerHTML = text; // text could contain escaped HTML
  msgArea.appendChild(msgDiv);
  msgArea.scrollTop = msgArea.scrollHeight;
}

function appendTypingIndicator() {
  const msgArea = document.getElementById('gb-assistant-messages');
  if (!msgArea) return null;

  const indicatorDiv = document.createElement('div');
  indicatorDiv.className = 'msg assistant';
  indicatorDiv.id = 'gb-assistant-typing';
  indicatorDiv.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  msgArea.appendChild(indicatorDiv);
  msgArea.scrollTop = msgArea.scrollHeight;
  return indicatorDiv;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('gb-assistant-typing');
  if (indicator) indicator.remove();
}

async function handleUserSubmit() {
  const inputEl = document.getElementById('gb-assistant-input');
  if (!inputEl) return;

  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = '';
  stopListening();
  cancelSpeech();

  // Render User Message
  appendMessage('user', escapeHtml(text));
  
  // Show Typing
  appendTypingIndicator();

  // Send API Request
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const response = await fetch(`${AI_SERVER_BASE}/ai/voice-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`
      },
      body: JSON.stringify({
        chatHistory: chatHistory,
        question: text
      })
    });

    removeTypingIndicator();

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        const payload = result.data;
        
        // Append response to Chat
        appendMessage('assistant', escapeHtml(payload.reply));

        // Speak aloud if enabled
        speakVoice(payload.reply);

        // Update local chat history
        chatHistory.push({ role: 'user', message: text });
        chatHistory.push({ role: 'assistant', message: payload.reply });
        
        // Handle Navigation Action
        if (payload.action === 'navigate' && payload.target && targets[payload.target]) {
          const targetUrl = targets[payload.target];
          
          // Display action notice in chat
          setTimeout(() => {
            appendMessage('assistant', `<em>Navigating to ${payload.target}...</em>`);
          }, 800);

          // Redirect after a delay to let speech play
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 2000);
        }
      } else {
        appendMessage('assistant', 'Sorry, I encountered an issue processing your request.');
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      appendMessage('assistant', errorData.error || 'The assistant service is currently offline. Please try again later.');
    }
  } catch (err) {
    removeTypingIndicator();
    console.error('AI assistant error:', err);
    appendMessage('assistant', 'Network error. Please make sure the local server is running.');
  }
}

// Web Speech API - Speech Synthesis (Text-to-Speech)
async function speakVoice(text) {
  const toggle = document.getElementById('gb-assistant-voice-toggle');
  if (!toggle || !toggle.checked) return;

  cancelSpeech();

  // Remove emojis or special symbols for cleaner speech
  const cleanText = text.replace(/🌿|⭐|★|☆|✈️|🎙️|🔔|🧑‍🌾|🪴|🚜|✨|📅/g, '').trim();
  if (!cleanText) return;

  // Detect Telugu characters
  const containsTelugu = /[\u0c00-\u0c7f]/.test(cleanText);

  if (containsTelugu) {
    try {
      const response = await fetch(`${AI_SERVER_BASE}/ai/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: cleanText })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.audio) {
          currentAudio = new Audio('data:audio/wav;base64,' + result.audio);
          currentAudio.play().catch(e => {
            console.warn('Audio playback failed (possibly blocked by browser autoplay policy):', e);
            // fallback to speech synthesis if play fails
            speakBrowserVoice(cleanText, true);
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Sarvam TTS failed, falling back to browser SpeechSynthesis:', err);
    }
  }

  // Fallback to browser SpeechSynthesis
  speakBrowserVoice(cleanText, containsTelugu);
}

function speakBrowserVoice(cleanText, containsTelugu) {
  if ('speechSynthesis' in window) {
    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    
    const voices = window.speechSynthesis.getVoices();
    if (containsTelugu) {
      const teluguVoice = voices.find(v => v.lang.startsWith('te') || v.lang.includes('TE'));
      if (teluguVoice) currentUtterance.voice = teluguVoice;
      else currentUtterance.lang = 'te-IN';
    } else {
      const indianEnglish = voices.find(v => v.lang === 'en-IN' || v.lang.includes('EN-IN'));
      if (indianEnglish) currentUtterance.voice = indianEnglish;
      else currentUtterance.lang = 'en-US';
    }

    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;

    window.speechSynthesis.speak(currentUtterance);
  }
}

function cancelSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
    currentAudio = null;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Inject on load
injectWidget();

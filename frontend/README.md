# 🎤 AURA Voice AI - Frontend

Modern voice AI interface with floating widget and admin panel built with vanilla JavaScript.

## 🚀 Quick Start

1. **Open the test page**: `test.html`
2. **Admin Panel**: `admin/index.html` - Login and document management
3. **Voice Widget**: `widget/index.html` - Floating voice call interface

## 📁 Architecture

```
frontend/
├── admin/                 # Admin panel (login + dashboard)
│   ├── index.html        # Login page
│   ├── dashboard.html    # Admin dashboard
│   ├── login.js         # Login functionality
│   ├── dashboard.js     # Dashboard functionality
│   └── style.css        # Admin styling
├── widget/               # Voice call widget
│   ├── index.html       # Widget interface
│   ├── widget.js        # Widget functionality
│   └── widget.css       # Widget styling
├── shared/               # Shared components
│   └── api.js           # API communication
└── test.html            # Demo page
```

## 🎯 Features

### Admin Panel
- ✅ **Simple Login** - Clean authentication interface
- ✅ **Document Upload** - Drag & drop file management
- ✅ **System Status** - Real-time backend monitoring
- ✅ **Modern UI** - W3Schools-inspired design

### Voice Widget
- ✅ **Floating Interface** - Draggable, minimizable widget
- ✅ **Real-time Voice** - WebSocket + getUserMedia
- ✅ **Audio Visualization** - Live audio level display
- ✅ **Transcript** - Conversation history
- ✅ **Settings** - Microphone, speaker, voice speed

### Technical
- ✅ **Vanilla JavaScript** - No framework overhead
- ✅ **Modern CSS** - Gradients, animations, responsive
- ✅ **WebSocket** - Real-time communication
- ✅ **Audio API** - getUserMedia + Web Audio API
- ✅ **Embeddable** - Can be added to any website

## 🔧 Usage

### Admin Panel
1. Navigate to `admin/index.html`
2. Login with your credentials
3. Upload documents and monitor system

### Voice Widget
1. Navigate to `widget/index.html`
2. Click "Start Call" to begin voice conversation
3. Use minimize/close controls as needed

### Embedding Widget
```html
<!-- Add to any website -->
<link rel="stylesheet" href="widget/widget.css">
<script src="widget/widget.js"></script>
```

## 🎨 Design Features

- **Gradient Backgrounds** - Modern purple/blue gradients
- **Glass Morphism** - Backdrop blur effects
- **Smooth Animations** - Hover effects and transitions
- **Responsive Design** - Mobile-friendly layout
- **Status Indicators** - Real-time connection status
- **Toast Notifications** - User feedback messages

## 🔌 API Integration

The `shared/api.js` module handles all backend communication:

```javascript
// Authentication
await AuraAPI.login(username, password);

// Document management
await AuraAPI.uploadDocument(file);
await AuraAPI.getDocuments();
await AuraAPI.deleteDocument(fileId);

// Voice calls
await AuraAPI.startVoiceCall(userId);
await AuraAPI.sendVoiceMessage(audioData, userId);
```

## 🚀 Benefits of Vanilla JS

- **Faster Development** - No build process needed
- **Lighter Weight** - No framework overhead
- **Better Performance** - Direct DOM manipulation
- **Easier Debugging** - Browser dev tools work perfectly
- **Embeddable** - Can be added to any website easily
- **No Dependencies** - Just HTML, CSS, JavaScript

## 🔮 Next Steps

1. **Backend Integration** - Connect to your Python backend
2. **WebSocket Setup** - Implement real-time voice streaming
3. **Audio Processing** - Add noise cancellation and echo suppression
4. **Widget Embedding** - Create embed codes for websites
5. **Mobile Optimization** - Touch gestures and mobile UI

## 🎯 Perfect for

- **Customer Support** - Live voice assistance
- **E-commerce** - Voice shopping assistants
- **Education** - Interactive learning
- **Healthcare** - Voice health consultations
- **Any Website** - Embedded voice AI

---

**Built with ❤️ using vanilla JavaScript for maximum performance and simplicity.**

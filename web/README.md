# JB-X Web Interface

**A modern web-based trading hub for Roblox Jailbreak**

![JB-X Logo](https://img.shields.io/badge/JB--X-Jailbreak%20Trading%20Hub-6366f1?style=for-the-badge)

---

## 🌟 Features

### 🔍 Item Lookup
Search for any tradable item in Roblox Jailbreak and get instant value information including:
- Cash Value & Duped Value
- Demand ratings
- Trend indicators
- Market notes

### 🧮 Trade Calculator
Calculate and compare trade values in real-time:
- Dual-panel comparison (Your Side vs Their Side)
- Automatic value calculation
- Trade fairness scoring
- Export trade summaries

### ⚠️ Dupe Detection
Check if a player's items have duplication flags:
- Username/User ID lookup
- View dupe ratios and trade history
- Clean user verification

### 📦 Inventory Viewer
View player information and inventory data:
- Player profile lookup
- User ID resolution
- Inventory overview (coming soon)

### 📈 Market Trends
Stay informed about market movement:
- High demand items
- Rising/Falling trends
- Stable value items

### ⚖️ Item Comparison
Compare multiple items side-by-side to make informed trading decisions.

---

## 🚀 Quick Start

### Live Demo
Visit the live version at: **[jbx-jailbreak.web.app](https://jbx-jailbreak.web.app)** *(Coming Soon)*

### Local Development
1. Clone the repository
2. Open `web/index.html` in a browser
3. That's it! No build step required.

### GitHub Pages Deployment
The web interface is automatically served via GitHub Pages when deployed to the `main` branch.

---

## 🛠️ Technologies

- **Pure HTML/CSS/JavaScript** - No frameworks required
- **JailbreakChangelogs API** - Powered by the official JBCL API
- **Progressive Web App (PWA)** - Installable and offline-capable
- **Responsive Design** - Works on desktop and mobile

---

## 📁 Project Structure

```
web/
├── index.html          # Main application
├── manifest.json       # PWA manifest
├── .nojekyll          # GitHub Pages config
├── css/
│   └── styles.css      # Custom styles
└── js/
    ├── app.js          # Main application logic
    └── enhanced.js     # Enhanced trading features
```

---

## 🔌 API Integration

This interface uses the following JailbreakChangelogs API endpoints:

| Endpoint | Purpose |
|----------|---------|
| `api.jailbreakchangelogs.xyz/items/get` | Item value lookup |
| `inventories.jailbreakchangelogs.xyz/proxy/users` | User ID resolution |
| `inventories.jailbreakchangelogs.xyz/users/dupes` | Dupe detection |

*Please respect the API rate limits and terms of service.*

---

## 🎨 Customization

### Theme Toggle
Click the moon/sun icon in the header to toggle between dark and light themes. Your preference is saved automatically.

### Keyboard Shortcuts
- `Enter` in search field to execute search
- `Escape` to close modals

---

## 📱 PWA Installation

The JB-X web interface supports PWA installation:

1. Visit the site on a supported device
2. Click "Install" or "Add to Home Screen"
3. Enjoy offline access to cached data

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](../LICENSE) file for details.

---

## ⚠️ Disclaimer

**Not affiliated with Roblox Corporation or Badimo.**

Jailbreak™ is a trademark of Roblox Corporation. This project is an independent fan-made tool and is not officially endorsed or sponsored by Roblox Corporation or Badimo.

---

## 🙏 Acknowledgments

- [JailbreakChangelogs](https://github.com/JBChangelogs/JailbreakChangelogs) for the amazing API
- Roblox Jailbreak community for inspiration
- All contributors and users!

---

<p align="center">
  Made with ❤️ for the Jailbreak trading community
</p>
# FontCraft Pro - Version 5.3 Changelog

## 🛠 Fixed  
- Add mk_service function to generate background service script
- Service monitors and removes conflicting font files in /data/fonts/
- Expand font replacement from 4 to 17 core system fonts
- Add proper Magisk/KernelSU detection with $method variable
- Implement system notifications for conflict resolution
- Improve error handling and logging throughout installation
- Fix exit handling in mode selection (abort vs exit)
- Add boot completion detection for service timing
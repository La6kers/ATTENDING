# ATTENDING AI Mobile Companion

React Native / Expo mobile app for the ATTENDING AI patient experience.

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- For iOS: macOS with Xcode installed
- For Android: Android Studio with an emulator or physical device

## Setup

```bash
cd apps/mobile
npm install
```

## Running

```bash
# Start Expo dev server (pick platform from menu)
npm start

# Start directly on a platform
npm run ios
npm run android
npm run web
```

## Project Structure

```
apps/mobile/
  app/
    _layout.tsx          # Root Stack navigator with teal branded header
    index.tsx            # Home screen with feature cards
    compass.tsx          # WebView wrapper for COMPASS assessment
    emergency-access.tsx # Emergency access with crash detection placeholder
    health.tsx           # Health dashboard with vitals display
  App.tsx                # Expo Router entry point
  app.json               # Expo configuration
  package.json           # Dependencies (Expo SDK 51)
  tsconfig.json          # TypeScript configuration
```

## Screens

| Screen | Description |
|--------|-------------|
| Home | Card-based navigation to all features |
| COMPASS | WebView loading the patient portal COMPASS assessment |
| Health Dashboard | Vitals grid, medications, care plan, appointments |
| Emergency Access | 911 quick-dial, crash detection toggle, emergency contacts |

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Teal | `#1A8FA8` | Primary actions, icons, accents |
| Deep Navy | `#0C3547` | Headers, text, navigation chrome |
| Coral | `#E87461` | Emergency actions, alerts, warnings |
| Light Teal | `#4FD1C5` | Secondary accents, backgrounds |

## Crash Detection (Placeholder)

The emergency access screen includes a placeholder for crash detection using
the Expo Sensors accelerometer API. The detection logic monitors for:

1. Sudden high-G impact (above 4G threshold)
2. Followed by a period of device stillness (5 seconds)
3. Triggers a 30-second countdown alert before auto-dialing 911

This requires `expo-sensors` and appropriate device permissions configured
in `app.json`.

## Notes

- The COMPASS WebView points to `https://attending.ai/patient-portal/compass` --
  update this URL to match your deployment.
- Messages and Appointments screens are not yet implemented and route to
  the health dashboard as placeholders.
- Typed routes are enabled via `experiments.typedRoutes` in `app.json`.

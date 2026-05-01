# Library — Reference Modpacks

Place your reference modpacks here for the AI to learn from:

## Structure
```
library/
├── bedrock/          ← 2 working Bedrock modpacks (.mcaddon or extracted)
│   ├── modpack1/
│   └── modpack2/
├── java/             ← 2 Java modpacks (.jar or extracted)
│   ├── modpack1/
│   └── modpack2/
└── analysis/         ← Auto-generated pattern files
    ├── bedrock-patterns.json
    └── java-patterns.json
```

## How It Works
1. Place your reference modpacks in the appropriate folders
2. Run `npm run analyze-library` to generate pattern files
3. The AI uses these patterns as context during conversion

## Recommendations
- Use simple, well-structured modpacks as references
- Bedrock modpacks should be ones you've confirmed work in-game
- Java modpacks should cover common mod features (blocks, items, recipes)

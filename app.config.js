export default {
    expo: {
      name: "TangenAI",
      scheme: "tangenai",
      newArchEnabled: true,
      extra: {
        FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
        HF_API_KEY: process.env.HF_API_KEY,
        HF_API_KEY2: process.env.HF_API_KEY2,
        HF_API_KEY3: process.env.HF_API_KEY3,
        NEXT_PUBLIC_RAPIDAPI_KEY: process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
        FMP_API: process.env.FMP_API,
        BLUESKY_PASSWORD: process.env.BLUESKY_PASSWORD,
        BLUESKY_USER: process.env.BLUESKY_USER,
      },
    },
  };
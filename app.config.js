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
      },
    },
  };
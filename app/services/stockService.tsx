import axios from "axios";
import Config from "react-native-config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
// Configure API endpoints
const FINNHUB_API_URL = "https://finnhub.io/api/v1";
const YAHOO_FINANCE_API = "https://query1.finance.yahoo.com/v8/finance/chart";
const HF_API_URL =
  "https://api-inference.huggingface.co/models/mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis";
const CORS_PROXY = "https://api.allorigins.win/get?url=";
let HF_API = Constants.expoConfig.extra.HF_API_KEY2;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (type, identifier) => `${type}_${identifier}`;

const storeCache = async (key, data) => {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.error("Cache store error:", error);
  }
};

const getCache = async (key) => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return data;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
};

// Helper functions
const calculateVolatility = (prices) => {
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252);
};

const processStockData = (closes) => {
  const recentLookback = Math.min(5, closes.length - 1);
  return {
    recent_growth:
      (closes[closes.length - 1] / closes[closes.length - recentLookback - 1] -
        1) *
      100,
    historical_growth: (closes[closes.length - 1] / closes[0] - 1) * 100,
    volatility: calculateVolatility(closes),
    data_points: closes.length,
  };
};

const defaultSentiment = () => ({
  score: 0,
  positive: 0,
  negative: 0,
  neutral: 0,
  total: 0,
});

// API call functions
const fetchCompanyNews = async (symbol) => {
  const cacheKey = getCacheKey("news", symbol);
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const today = new Date();
    const fromDate = new Date(today.setDate(today.getDate() - 30));

    const { data } = await axios.get(`${FINNHUB_API_URL}/company-news`, {
      params: {
        symbol,
        from: fromDate.toISOString().split("T")[0],
        to: new Date().toISOString().split("T")[0],
        token: Constants.expoConfig.extra.FINNHUB_API_KEY,
      },
    });

    const validNews = data.filter((article) => article.summary);
    await storeCache(cacheKey, validNews);
    return validNews;
  } catch (error) {
    console.error("News fetch error:", error.response?.data || error.message);
    return [];
  }
};

const fetchStockData = async (symbol, horizon) => {
  const cacheKey = getCacheKey("stock", `${symbol}_${horizon}`);
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const range = horizon === "short-term" ? "1mo" : "5y";
    const encodedURL = encodeURIComponent(
      `${YAHOO_FINANCE_API}/${symbol}?interval=1d&range=${range}`
    );
    const response = await axios.get(`${CORS_PROXY}${encodedURL}`);

    const result = JSON.parse(response.data.contents).chart.result[0];
    const closes = result.indicators.quote[0].close.filter(
      (price) => price !== null
    );

    if (closes.length < 5) return null;

    const stockData = processStockData(closes);
    await storeCache(cacheKey, stockData);
    console.log(stockData);
    return stockData;
  } catch (error) {
    console.error("Stock data error:", error.response?.data || error.message);
    return null;
  }
};
const analyzeSentiment = async (
  articles: string[]
): Promise<ReturnType<typeof defaultSentiment>> => {
  console.log(
    `[analyzeSentiment] Starting analysis with ${articles.length} articles`
  );

  if (!articles.length) {
    console.log(
      "[analyzeSentiment] No articles provided, returning default sentiment"
    );
    return defaultSentiment();
  }

  const cacheKey = getCacheKey("sentiment", articles.join("|"));
  const cached = await getCache(cacheKey);
  // if (cached) {
  //   console.log('[analyzeSentiment] Found cached sentiment data');
  //   return cached;
  // }
  console.log("[analyzeSentiment] Cache miss, performing analysis");

  try {
    const MAX_CHUNK_LENGTH = 450;
    const chunks: string[] = [];
    let currentChunk: string[] = [];

    // Log chunking process
    console.log(
      `[analyzeSentiment] Processing ${articles.length} articles into chunks`
    );

    articles
      .map((article: string) => article.trim())
      .filter((article: string) => article.length > 0)
      .forEach((article: string) => {
        console.log(
          `[analyzeSentiment] Processing article of length: ${article.length}`
        );
        if (currentChunk.join(" ").length + article.length > MAX_CHUNK_LENGTH) {
          chunks.push(currentChunk.join(" "));
          console.log(
            `[analyzeSentiment] Created new chunk of length: ${
              chunks[chunks.length - 1].length
            }`
          );
          currentChunk = [article];
        } else {
          currentChunk.push(article);
        }
      });

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
      console.log(
        `[analyzeSentiment] Added final chunk, total chunks: ${chunks.length}`
      );
    }

    const analyzeChunk = async (
      chunk: string
    ): Promise<SentimentResponse[]> => {
      // Add delay based on index
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log(
        `[analyzeSentiment] Analyzing chunk of length: ${chunk.length}`
      );
      try {
        const response = await axios.post(
          HF_API_URL,
          { inputs: chunk },
          {
            headers: {
              Authorization: `Bearer ${HF_API}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log(
          "[analyzeChunk] Raw response:",
          JSON.stringify(response.data)
        );

        if (!response.data || !Array.isArray(response.data)) {
          console.error("[analyzeChunk] Invalid response structure");
          return [];
        }

        const sentiments = response.data.map((item) => ({
          label: item[0]?.label || "",
          score: parseFloat(item[0]?.score || 0),
        }));

        console.log("[analyzeChunk] Processed sentiments:", sentiments);
        return sentiments;
      } catch (error) {
        console.error("[analyzeChunk] Error:", error);
        return [];
      }
    };

    const results = await Promise.all(chunks.map(analyzeChunk));
    console.log(`[analyzeSentiment] Got ${results.length} chunk results`);

    const allSentiments = results
      .flat()
      .filter(
        (item) =>
          item?.label && typeof item.score === "number" && !isNaN(item.score)
      );
    console.log(
      `[analyzeSentiment] Filtered sentiments: ${allSentiments.length}`
    );

    if (allSentiments.length === 0) {
      console.warn("[analyzeSentiment] No valid sentiments found");
      return defaultSentiment();
    }

    const sentimentResult = {
      score:
        allSentiments.reduce((sum, s) => sum + s.score, 0) /
        allSentiments.length,
      positive: allSentiments.filter(
        (s) => s.label.toLowerCase() === "positive"
      ).length,
      negative: allSentiments.filter(
        (s) => s.label.toLowerCase() === "negative"
      ).length,
      neutral: allSentiments.filter((s) => s.label.toLowerCase() === "neutral")
        .length,
      total: allSentiments.length,
    };
    console.log("[analyzeSentiment] Final sentiment result:", sentimentResult);

    await storeCache(cacheKey, sentimentResult);
    console.log("[analyzeSentiment] Cached sentiment results");

    return sentimentResult;
  } catch (error) {
    console.error("[analyzeSentiment] Error:", error);
    return defaultSentiment();
  }
};
export const getStockRecommendation = async (
  companies,
  horizon = "short-term"
) => {
  try {
    console.log(
      "HF API Key:",
      Constants.expoConfig?.extra?.HF_API_KEY ? "Exists" : "Missing"
    );

    if (!Constants.expoConfig?.extra?.HF_API_KEY) {
      console.error("Hugging Face API key not configured");
      return defaultSentiment();
    }

    const validCompanies = Array.isArray(companies)
      ? companies
          .filter((c) => c && typeof c === "string")
          .map((c) => c.toUpperCase())
      : [];

    if (!validCompanies.length) {
      throw new Error("No valid companies provided");
    }

    const recommendations = await Promise.all(
      validCompanies.map(async (company) => {
        try {
          const [stockData, news] = await Promise.all([
            fetchStockData(company, horizon),
            fetchCompanyNews(company),
          ]);

          if (!stockData || !news.length) return null;

          const articles = news
            .map((article) => article.summary?.substring(0, 100) || "")
            .filter((text) => text.length > 0);

          const sentiment = await analyzeSentiment(articles);
          const components = {
            recent_performance: Math.min(
              Math.max(((stockData.recent_growth + 20) / 40) * 100, 0),
              100
            ),
            historical_growth: Math.min(
              Math.max(((stockData.historical_growth + 50) / 100) * 100, 0),
              100
            ),
            sentiment_score: sentiment.total
              ? 50 +
                (sentiment.positive / sentiment.total -
                  sentiment.negative / sentiment.total) *
                  50
              : 50,
            risk_factor: Math.max(0, 100 - stockData.volatility * 100),
          };

          const weights =
            horizon === "short-term"
              ? {
                  recent_performance: 0.4,
                  historical_growth: 0.2,
                  sentiment_score: 0.3,
                  risk_factor: 0.1,
                }
              : {
                  recent_performance: 0.2,
                  historical_growth: 0.4,
                  sentiment_score: 0.2,
                  risk_factor: 0.2,
                };

          const score = Object.keys(weights).reduce(
            (acc, key) => acc + components[key] * weights[key],
            0
          );

          return {
            company,
            score: Math.round(score * 10) / 10,
            details: {
              stock_data: stockData,
              sentiment,
              components,
            },
          };
        } catch (error) {
          console.error(`Error processing ${company}:`, error);
          return null;
        }
      })
    );

    return {
      status: "success",
      recommendations: recommendations
        .filter((r) => r !== null)
        .sort((a, b) => b.score - a.score),
      metadata: {
        timestamp: new Date().toISOString(),
        horizon,
      },
    };
  } catch (error) {
    console.error("Recommendation service error:", error.message);
    return {
      status: "error",
      message: error.message,
      recommendations: [],
    };
  }
};

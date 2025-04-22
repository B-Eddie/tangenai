import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { parse } from "node-html-parser";
import { generateSentimentRationale } from "./geminiService";

// Market data endpoints
const FINNHUB_API_URL = "https://finnhub.io/api/v1";
const YAHOO_FINANCE_API = "https://query1.finance.yahoo.com/v8/finance/chart";
const CORS_PROXY = "https://api.allorigins.win/get?url=";
const CACHE_TTL = 5 * 60 * 1000;

// Sentiment analysis word lists
const POSITIVE_WORDS = new Set([
  "increase",
  "profit",
  "growth",
  "gain",
  "positive",
  "up",
  "high",
  "rising",
  "success",
  "strong",
  "better",
  "improved",
  "growing",
  "good",
  "promising",
]);

const NEGATIVE_WORDS = new Set([
  "decrease",
  "loss",
  "decline",
  "down",
  "negative",
  "low",
  "falling",
  "fail",
  "weak",
  "worse",
  "reduced",
  "poor",
  "bad",
  "risk",
]);

interface NewsArticle {
  summary?: string;
  datetime?: number;
  headline?: string;
  url?: string;
}

const validateNewsData = (data: any): data is NewsArticle[] => {
  return (
    Array.isArray(data) &&
    data.every((item) => typeof item === "object" && item !== null)
  );
};

// 1. Sanitize cache keys so they only contain safe characters
const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9_]/g, "_");

// A simple djb2 hash function that produces a fixed-length numeric string.
const simpleHash = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(); // Ensure it's positive and return as string.
};

// Use the hash function and a safe prefix to generate the cache key.
// This avoids long or unsafe characters (like '@') in the key.
const getCacheKey = (type: string, identifier: string): string => {
  // Limit the identifier to a reasonable length to avoid extremely long input
  const limitedIdentifier = identifier.slice(0, 200);
  const hash = simpleHash(limitedIdentifier);
  // Remove any "@" symbols from the type (if present) and use a safe prefix.
  const safeType = type.replace(/@/g, "");
  return `cache_${safeType}_${hash}`;
};

// ---
const storeCache = async (key: string, data: any) => {
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

const getCache = async (key: string) => {
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

const INVESTOPEDIA_SEARCH_URL =
  CORS_PROXY + "https://www.investopedia.com/search?q=";

const fetchCompanyTweets = async (query) => {
  console.log("Fetching Investopedia articles for:", query);
  const cacheKey = getCacheKey("investopedia_articles", query);

  try {
    const cached = await getCache(cacheKey);
    if (cached) return cached;
  } catch (error) {
    console.error("Cache retrieval error:", error);
  }

  try {
    // Fetch the search results page using the CORS proxy
    const response = await axios.get(INVESTOPEDIA_SEARCH_URL + query, {
      params: { q: query },
    });

    // If using a proxy like AllOrigins, extract the actual HTML from the "contents" property.
    let html = response.data;
    if (html && html.contents) {
      html = html.contents;
    }
    // console.log("HTML snippet:", html);

    // Parse the HTML with node-html-parser
    const root = parse(html);
    const articles = [];

    // Use a class-based selector to grab article cards
    const allArticleElements = root.querySelectorAll(
      'a[id^="mntl-card-list-card--extendable"]'
    );
    const articleElements = Array.from(allArticleElements).slice(0, 1);

    console.log("Found article elements:", articleElements.length);

    for (const element of articleElements) {
      // Find the title within the anchor element
      const titleElement = element.querySelector(".card__title-text");
      const title = titleElement ? titleElement.text.trim() : "";
      const url = element.getAttribute("href");
      let articleText = "";

      if (url) {
        try {
          const fullUrl = url.startsWith("http")
            ? url
            : `https://www.investopedia.com${url}`;
          const response = await axios.get(
            CORS_PROXY + encodeURIComponent(fullUrl)
          );
          const articleHtml = response.data.contents;
          const articleRoot = parse(articleHtml);
          const articleContent = articleRoot.querySelector(".article-content");
          articleText = articleContent ? articleContent.text.trim() : "";
        } catch (error) {
          console.error(`Error fetching article content for ${url}:`, error);
        }
      }

      if (title && url) {
        articles.push({
          title,
          url: url.startsWith("http")
            ? url
            : `https://www.investopedia.com${url}`,
          text: articleText,
        });
      }
    }

    await storeCache(cacheKey, articles);
    // console.log("Fetched Investopedia articles:", articles);
    return articles;
  } catch (error) {
    console.error(`Error fetching Investopedia articles for ${query}:`, error);
    return [];
  }
};

// Local sentiment analysis (simple word-based)
const analyzeSentiment = (text: string) => {
  const words = text.toLowerCase().split(/\W+/);
  let positive = 0,
    negative = 0;

  words.forEach((word) => {
    if (POSITIVE_WORDS.has(word)) positive++;
    if (NEGATIVE_WORDS.has(word)) negative++;
  });

  const total = positive + negative;
  if (total === 0)
    return { score: 0.5, positive: 0, negative: 0, neutral: 1, total: 1 };

  const score = positive / total;
  return {
    score,
    positive: score > 0.6 ? 1 : 0,
    negative: score < 0.4 ? 1 : 0,
    neutral: score >= 0.4 && score <= 0.6 ? 1 : 0,
    total: 1,
  };
};

const analyzeArticles = async (articles: string[]) => {
  if (!articles.length) {
    return { score: 0.5, positive: 0, negative: 0, neutral: 0, total: 0 };
  }

  const cacheKey = getCacheKey("sentiment", articles.join("|"));
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const sentiments = articles.map(analyzeSentiment);
  const result = sentiments.reduce(
    (acc, cur) => ({
      score: acc.score + cur.score,
      positive: acc.positive + cur.positive,
      negative: acc.negative + cur.negative,
      neutral: acc.neutral + cur.neutral,
      total: acc.total + cur.total,
    }),
    { score: 0, positive: 0, negative: 0, neutral: 0, total: 0 }
  );

  result.score /= sentiments.length;
  await storeCache(cacheKey, result);
  return result;
};

// ---
// Stock data processing
const calculateVolatility = (prices: number[]) => {
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252);
};

const processStockData = (closes: number[]) => {
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

// ---
// In fetchStockData function
const fetchStockData = async (symbol: string, horizon: string) => {
  const cacheKey = getCacheKey("stock", `${symbol}_${horizon}`);
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const range = horizon === "short-term" ? "1mo" : "5y";
    const targetUrl = `${YAHOO_FINANCE_API}/${symbol}?interval=1d&range=${range}`;

    const response = await axios.get(
      CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(targetUrl)}` : targetUrl
    );

    // Handle proxy wrapper format
    const responseData = CORS_PROXY
      ? JSON.parse(response.data.contents)
      : response.data;

    if (!responseData?.chart?.result?.[0]) {
      console.error("Invalid stock data structure:", responseData);
      return null;
    }

    const closes =
      responseData.chart.result[0].indicators.quote[0].close.filter(
        (price: number) => price !== null
      );

    if (closes.length < 5) return null;

    const stockData = processStockData(closes);
    await storeCache(cacheKey, stockData);
    return stockData;
  } catch (error) {
    console.error("Stock data error:", error);
    return null;
  }
};

// In fetchCompanyNews function
const fetchCompanyNews = async (symbol: string) => {
  const cacheKey = getCacheKey("news", symbol);
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  try {
    const today = new Date();
    const fromDate = new Date(today.setDate(today.getDate() - 30));
    const apiKey = Constants.expoConfig?.extra?.FINNHUB_API_KEY;

    const targetUrl = `${FINNHUB_API_URL}/company-news?symbol=${symbol}&from=${
      fromDate.toISOString().split("T")[0]
    }&to=${new Date().toISOString().split("T")[0]}&token=${apiKey}`;

    let response = await axios.get(
      CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(targetUrl)}` : targetUrl
    );

    if (response.status === 500) {
      // Retry the request once
      const retryResponse = await axios.get(
        CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(targetUrl)}` : targetUrl
      );
      response = retryResponse; // Update the response with retry result
    }

    // Handle proxy response format
    const data = CORS_PROXY
      ? JSON.parse(response.data.contents)
      : response.data;

    if (!validateNewsData(data)) {
      console.warn(`Invalid news data for ${symbol}`);
      return [];
    }

    const validNews = data.filter(
      (article: NewsArticle) =>
        article &&
        typeof article.summary === "string" &&
        article.summary.length > 0
    );
    await storeCache(cacheKey, validNews);
    return validNews;
  } catch (error) {
    console.error("News fetch error:", error);
    return [];
  }
};

// Add RapidAPI configuration
const RAPIDAPI_KEY = "9aa4bf8e6cmsha7bc3e1aab08dfdp169b22jsn2ad80087c37d"; // Should be stored in environment variables
const RAPIDAPI_HOST = "wall-street-journal.p.rapidapi.com";
const WSJ_API_URL =
  "https://wall-street-journal.p.rapidapi.com/api/v1/searchArticleByKeyword";

// Update the WSJ API response interface
interface WSJApiResponse {
  status: boolean;
  timestamp: number;
  data: WSJArticle[];
}

interface WSJArticle {
  articleId: string;
  headline: string;
  summary: string;
  url: string;
  timestamp: string;
  authors?: string[];
  created?: string;
}

// Replace fetchCompanyArticles to handle the correct response format
const fetchCompanyArticles = async (query: string): Promise<any[]> => {
  console.log("Fetching WSJ articles for:", query);
  const cacheKey = getCacheKey("wsj_articles", query);

  try {
    const cached = await getCache(cacheKey);
    if (cached) return cached;
  } catch (error) {
    console.error("Cache retrieval error:", error);
  }

  try {
    // Fetch articles from WSJ API via RapidAPI
    const response = await axios.get(WSJ_API_URL, {
      params: {
        keyword: query,
      },
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });

    // Check for the correct response structure
    if (
      !response.data ||
      !response.data.status ||
      !Array.isArray(response.data.data)
    ) {
      console.warn("Invalid WSJ API response format:", response.data);
      return [];
    }

    const articles = response.data.data
      .map((article: WSJArticle) => ({
        title: article.headline || "",
        url: article.url || "",
        text: article.summary || "",
        datetime:
          article.created || article.timestamp || new Date().toISOString(),
        authors: article.authors || [],
      }))
      .filter((article: any) => article.title && article.text);

    // Limit to 5 articles to avoid too many requests
    const limitedArticles = articles.slice(0, 5);

    await storeCache(cacheKey, limitedArticles);
    console.log(`Fetched ${limitedArticles.length} WSJ articles for ${query}`);
    return limitedArticles;
  } catch (error) {
    console.error(`Error fetching WSJ articles for ${query}:`, error);
    return [];
  }
};

// Main recommendation function
export const getStockRecommendation = async (
  companies: string[],
  horizon = "short-term"
) => {
  try {
    if (!Array.isArray(companies) || companies.length === 0) {
      throw new Error("No valid companies provided");
    }

    const recommendations = await Promise.all(
      companies.map(async (company) => {
        try {
          const [stockData, news, articles] = await Promise.all([
            fetchStockData(company, horizon),
            fetchCompanyNews(company),
            fetchCompanyArticles(company),
          ]);

          if (!stockData || (!news.length && !articles.length)) return null;

          const newsTexts = news
            .map((article: any) => article.summary?.substring(0, 100) || "")
            .filter((text: string) => text.length > 0);

          const articleTexts = articles
            .map((article: any) => article.text || "")
            .filter((text: string) => text.length > 0);

          const allTexts = [...newsTexts, ...articleTexts];

          if (allTexts.length === 0) return null;

          const sentiment = await analyzeArticles(allTexts);
          const sentimentScore = sentiment.total
            ? 50 +
              (sentiment.positive / sentiment.total -
                sentiment.negative / sentiment.total) *
                50
            : 50;

          // Generate sentiment rationale
          const sentimentRationale = await generateSentimentRationale(
            company,
            [...news, ...articles],
            sentimentScore
          );

          const components = {
            recent_performance: Math.min(
              Math.max(((stockData.recent_growth + 20) / 40) * 100, 0),
              100
            ),
            historical_growth: Math.min(
              Math.max(((stockData.historical_growth + 50) / 100) * 100, 0),
              100
            ),
            sentiment_score: sentimentScore,
            risk_factor: Math.max(0, stockData.volatility * 100),
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
              company,
              articles,
              sentiment_rationale: sentimentRationale,
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
    console.error("Recommendation service error:", error);
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
      recommendations: [],
    };
  }
};

// ---
// prevent Router errors
export default {};

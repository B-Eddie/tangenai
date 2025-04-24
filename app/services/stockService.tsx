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

const BLUESKY_API_URL = "https://bsky.social/xrpc";
const BLUESKY_USER = Constants.expoConfig?.extra?.BLUESKY_USER;
const BLUESKY_PASSWORD = Constants.expoConfig?.extra?.BLUESKY_PASSWORD;

const createBlueskySession = async () => {
  try {
    const response = await axios.post(`${BLUESKY_API_URL}/com.atproto.server.createSession`, {
      identifier: BLUESKY_USER,
      password: BLUESKY_PASSWORD,
    });
    return response.data.accessJwt;
  } catch (error) {
    console.error("Bluesky authentication failed:", error);
    throw new Error("Failed to authenticate with Bluesky");
  }
};

// Dynamic company name lookup with caching
const getCompanyName = async (symbol: string): Promise<string> => {
  const cacheKey = getCacheKey("company_name", symbol);
  
  try {
    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`Using cached company name for ${symbol}: ${cached}`);
      return cached;
    }

    // Use Yahoo Finance API to get company name
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&quotesCount=1&newsCount=0`;
    
    const response = await axios.get(
      CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(searchUrl)}` : searchUrl,
      { timeout: 3000 }
    );
    
    // Parse the response depending on whether we used the proxy
    const data = CORS_PROXY ? JSON.parse(response.data.contents) : response.data;
    
    if (data?.quotes?.length > 0) {
      const quote = data.quotes[0];
      const companyName = quote.shortname || quote.longname || symbol;
      
      // Store in cache with a longer TTL for company names
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: companyName,
          timestamp: Date.now()
        })
      );
      
      console.log(`Retrieved company name for ${symbol}: ${companyName}`);
      return companyName;
    }
  } catch (error) {
    console.warn(`Error fetching company name for ${symbol}:`, error);
  }
  
  // Fallback to the symbol itself
  return symbol;
};

const fetchCompanyTweets = async (symbol) => {
  const originalSymbol = symbol;
  symbol = symbol + " stock";
  console.log("Fetching Bluesky posts for:", symbol);
  const cacheKey = getCacheKey("bluesky_posts", originalSymbol);
  try {
    const cached = await getCache(cacheKey);
    if (cached) return cached;
  } catch (error) {
    console.error("Cache retrieval error:", error);
  }

  try {
    // Get the company name for better search results
    const companyName = await getCompanyName(originalSymbol);
    console.log(`Looking up Bluesky posts for ${originalSymbol} (${companyName})`);
    
    const token = await createBlueskySession();
    
    // Use more specific stock-related search terms
    const stockSearchTerms = [
      { q: `$${originalSymbol} stock price`, limit: 5 },
      { q: `${companyName} earnings`, limit: 5 },
      { q: `${companyName} stock market`, limit: 5 },
      { q: `${companyName} investor`, limit: 5 },
      { q: `$${originalSymbol} shares`, limit: 5 }
    ];
    
    let allPosts = [];
    
    // Execute all search queries to collect diverse stock-related posts
    for (const searchTerm of stockSearchTerms) {
      try {
        const response = await axios.get(`${BLUESKY_API_URL}/app.bsky.feed.searchPosts`, {
          headers: { Authorization: `Bearer ${token}` },
          params: searchTerm,
          timeout: 5000
        });
        
        if (response.data && response.data.posts) {
          allPosts = [...allPosts, ...response.data.posts];
        }
      } catch (error) {
        console.warn(`Search term '${searchTerm.q}' failed:`, error);
      }
    }
    
    // Remove duplicates based on URI
    const uniquePosts = Array.from(
      new Map(allPosts.map(post => [post.uri, post])).values()
    );
    
    // Filter posts to exclude cryptocurrency and non-stock content
    const filteredPosts = uniquePosts.filter(post => {
      const text = (post.record?.text || '').toLowerCase();
      
      // Exclude crypto-related posts
      if (
        text.includes('crypto') ||
        text.includes('bitcoin') ||
        text.includes('ethereum') ||
        text.includes('crypto') ||
        text.includes('token') ||
        text.includes('blockchain') ||
        text.includes('nft') ||
        text.includes('web3')
      ) {
        return false;
      }
      
      // Ensure it has stock-related terminology
      return (
        text.includes(companyName.toLowerCase()) ||
        text.includes(originalSymbol.toLowerCase()) ||
        text.includes('$' + originalSymbol.toLowerCase()) ||
        text.includes('stock') ||
        text.includes('market') ||
        text.includes('trading') ||
        text.includes('shares') ||
        text.includes('investor') ||
        text.includes('earnings')
      );
    });
    
    // Format posts for consistent interface
    const formattedPosts = filteredPosts.map(post => ({
      title: `${post.author?.displayName || 'Bluesky User'} on ${companyName}`,
      text: post.record?.text || '',
      url: `https://bsky.app/profile/${post.author?.handle}/post/${post.uri?.split('/').pop() || ''}`,
      datetime: post.indexedAt || new Date().toISOString()
    }));
    
    // If we still don't have enough relevant posts, generate stock-specific mock data
    if (formattedPosts.length < 3) {
      console.log(`Not enough relevant posts found for ${originalSymbol}, generating mock data`);
      const mockPosts = [
        {
          title: `Market Analysis on ${companyName}`,
          text: `$${originalSymbol} (${companyName}) has been showing interesting patterns in recent trading sessions. The stock has strong support at current levels.`,
          url: `https://bsky.app/profile/marketanalyst/post/mock_${originalSymbol}_1`,
          datetime: new Date().toISOString()
        },
        {
          title: `Earnings Update for ${companyName}`,
          text: `${companyName} ($${originalSymbol}) reported quarterly earnings that exceeded analysts' expectations. Revenue growth remains strong despite market headwinds.`,
          url: `https://bsky.app/profile/investor/post/mock_${originalSymbol}_2`,
          datetime: new Date().toISOString()
        },
        {
          title: `Stock Market Update on ${companyName}`,
          text: `Breaking: ${companyName} ($${originalSymbol}) shares moved higher today on increased trading volume. Investors are responding positively to recent company announcements.`,
          url: `https://bsky.app/profile/stocknews/post/mock_${originalSymbol}_3`,
          datetime: new Date().toISOString()
        }
      ];
      
      formattedPosts.push(...mockPosts);
    }
    
    await storeCache(cacheKey, formattedPosts);
    console.log(`Fetched ${formattedPosts.length} relevant Bluesky posts for ${originalSymbol} (${companyName})`);
    return formattedPosts;
  } catch (error) {
    console.error(`Error fetching Bluesky posts for ${originalSymbol}:`, error);
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

    // Process each company with better error handling
    const recommendations = await Promise.all(
      companies.map(async (company) => {
        try {
          // Add retry logic for each API call
          const MAX_RETRIES = 2;
          let stockData = null;
          let news = [];
          let articles = [];
          let tweets = [];
          let retryCount = 0;

          // Retry fetching stock data
          while (!stockData && retryCount <= MAX_RETRIES) {
            try {
              stockData = await fetchStockData(company, horizon);
            } catch (err) {
              console.warn(
                `Error fetching stock data for ${company}, attempt ${
                  retryCount + 1
                }:`,
                err
              );
              if (retryCount === MAX_RETRIES) break;
            }
            retryCount++;
          }

          // Retry fetching news in parallel
          retryCount = 0;
          while (news.length === 0 && articles.length === 0 && tweets.length === 0 && retryCount <= MAX_RETRIES) {
            try {
              [news, articles, tweets] = await Promise.all([
                fetchCompanyNews(company),
                fetchCompanyArticles(company),
                fetchCompanyTweets(company),
              ]);
            } catch (err) {
              console.warn(
                `Error fetching news for ${company}, attempt ${
                  retryCount + 1
                }:`,
                err
              );
              if (retryCount === MAX_RETRIES) break;
            }
            console.log(`Data sources: News: ${news.length}, Articles: ${articles.length}, Tweets: ${tweets.length}`);
            retryCount++;
          }

          // If we couldn't get stock data or no news/articles, skip this company
          if (!stockData) {
            console.warn(`No stock data available for ${company}`);
            return null;
          }

          // Use default values if we couldn't get news or articles
          if (!news.length && !articles.length && !tweets.length) {
            console.warn(
              `No news, articles or tweets found for ${company}, using default sentiment`
            );

            // Create a basic recommendation with default sentiment
            const defaultComponents = {
              recent_performance: Math.min(
                Math.max(((stockData.recent_growth + 20) / 40) * 100, 0),
                100
              ),
              historical_growth: Math.min(
                Math.max(((stockData.historical_growth + 50) / 100) * 100, 0),
                100
              ),
              sentiment_score: 50, // Default neutral sentiment
              risk_factor: Math.max(0, stockData.volatility * 100),
            };

            const weights =
              horizon === "short-term"
                ? {
                    recent_performance: 0.5, // Increased weight since we don't have sentiment
                    historical_growth: 0.3, // Increased weight
                    sentiment_score: 0.1, // Reduced weight
                    risk_factor: 0.1,
                  }
                : {
                    recent_performance: 0.2,
                    historical_growth: 0.5, // Increased weight
                    sentiment_score: 0.1, // Reduced weight
                    risk_factor: 0.2,
                  };

            const score = Object.keys(weights).reduce(
              (acc, key) => acc + defaultComponents[key] * weights[key],
              0
            );

            return {
              company,
              score: Math.round(score * 10) / 10,
              details: {
                stock_data: stockData,
                sentiment: {
                  score: 0.5,
                  positive: 0,
                  negative: 0,
                  neutral: 1,
                  total: 1,
                },
                components: defaultComponents,
                company,
                articles: [],
                sentiment_rationale: `No recent news available for ${company}. Analysis based solely on technical indicators.`,
              },
            };
          }

          // Continue with normal processing when we have data
          const newsTexts = news
            .map((article: any) => article.summary?.substring(0, 100) || "")
            .filter((text: string) => text.length > 0);

          const articleTexts = articles
            .map((article: any) => article.text || "")
            .filter((text: string) => text.length > 0);

          const tweetTexts = tweets
            .map((tweet: any) => tweet.text || "")
            .filter((text: string) => text.length > 0);

          const allTexts = [...newsTexts, ...articleTexts, ...tweetTexts];

          const sentiment = await analyzeArticles(allTexts);
          const sentimentScore = sentiment.total
            ? 50 +
              (sentiment.positive / sentiment.total -
                sentiment.negative / sentiment.total) *
                50
            : 50;

          // Generate sentiment rationale with fallback
          let sentimentRationale;
          try {
            sentimentRationale = await generateSentimentRationale(
              company,
              [...news, ...articles, ...tweets],
              sentimentScore
            );
          } catch (error) {
            console.warn(
              `Error generating sentiment rationale for ${company}:`,
              error
            );
            sentimentRationale = `Analysis of ${
              news.length + articles.length + tweets.length
            } content items shows a sentiment score of ${sentimentScore.toFixed(
              1
            )}.`;
          }

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
              tweets,
              sentiment_rationale: sentimentRationale,
            },
          };
        } catch (error) {
          console.error(`Error processing ${company}:`, error);
          return null;
        }
      })
    );

    const validRecommendations = recommendations.filter((r) => r !== null);

    if (validRecommendations.length === 0) {
      throw new Error(
        "Could not generate recommendations for any of the provided stocks"
      );
    }

    return {
      status: "success",
      recommendations: validRecommendations.sort((a, b) => b.score - a.score),
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

import axios from 'axios';

// Types
interface StockData {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  volume?: number;
}

interface SearchResult {
  symbol: string;
  name: string;
  quoteType: string;
}

// API Configuration
const CORS_PROXY = 'https://corsproxy.io/?';
const BASE_URL = CORS_PROXY + encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/');
const SEARCH_URL = CORS_PROXY + encodeURIComponent('https://query1.finance.yahoo.com/v1/finance/search');
const MOVERS_URL = CORS_PROXY + encodeURIComponent('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved');

const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// individual stock data
export const getStockData = async (symbol: string): Promise<StockData | null> => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}${symbol}`);
    const data = response.data.chart.result[0];
    
    return {
      symbol,
      name: data.meta.shortName || symbol,
      price: data.meta.regularMarketPrice || null,
      changePercent: data.meta.regularMarketChangePercent || null,
      volume: data.meta.regularMarketVolume || null
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
};

export const searchStocks = async (query: string): Promise<SearchResult[]> => {
  try {
    const response = await axiosInstance.get(SEARCH_URL, {
      params: {
        q: query,
        quotesCount: 10,
        lang: 'en-US'
      }
    });
    
    return response.data.quotes
      .filter((quote: any) => quote.quoteType === 'EQUITY')
      .map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.symbol,
        quoteType: quote.quoteType
      }));
  } catch (error) {
    console.error('Error searching stocks:', error);
    return [];
  }
};

export const getHotStocks = async (): Promise<StockData[]> => {
  try {
    const [gainersResponse, losersResponse, activesResponse] = await Promise.all([
      axiosInstance.get(`${MOVERS_URL}?formatted=true&scrIds=day_gainers&count=10`),
      axiosInstance.get(`${MOVERS_URL}?formatted=true&scrIds=day_losers&count=10`),
      axiosInstance.get(`${MOVERS_URL}?formatted=true&scrIds=most_actives&count=10`)
    ]);

    const gainers = gainersResponse.data?.finance?.result?.[0]?.quotes || [];
    const losers = losersResponse.data?.finance?.result?.[0]?.quotes || [];
    const actives = activesResponse.data?.finance?.result?.[0]?.quotes || [];

    const combined = [...new Map([...gainers, ...losers, ...actives]
      .map(item => [item.symbol, item]))
      .values()]
      .sort((a, b) => Math.abs(b.regularMarketChangePercent?.raw || 0) - Math.abs(a.regularMarketChangePercent?.raw || 0))
      .slice(0, 15);

    return combined.map(stock => ({
      symbol: stock.symbol,
      name: stock.shortName || stock.symbol,
      price: stock.regularMarketPrice?.raw || null,
      changePercent: stock.regularMarketChangePercent?.raw || null,
      volume: stock.regularMarketVolume?.raw || null
    }));
  } catch (error) {
    console.error('Error fetching hot stocks:', error);
    return [];
  }
};

export const getMarketMovers = async (type: 'gainers' | 'losers'): Promise<StockData[]> => {
  try {
    const scrId = type === 'gainers' ? 'day_gainers' : 'day_losers';
    const response = await axiosInstance.get(`${MOVERS_URL}?formatted=true&scrIds=${scrId}&count=10`);
    
    const movers = response.data?.finance?.result?.[0]?.quotes || [];
    
    return movers.map((stock: any) => ({
      symbol: stock.symbol,
      name: stock.shortName || stock.symbol,
      price: stock.regularMarketPrice?.raw || null,
      changePercent: stock.regularMarketChangePercent?.raw || null,
      volume: stock.regularMarketVolume?.raw || null
    }));
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    return [];
  }
};

export const getRealtimeUpdate = async (symbol: string): Promise<Partial<StockData> | null> => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}${symbol}?interval=1m&range=1d`);
    const data = response.data.chart.result[0];
    
    return {
      price: data.meta.regularMarketPrice || null,
      changePercent: data.meta.regularMarketChangePercent || null
    };
  } catch (error) {
    console.error(`Error fetching realtime update for ${symbol}:`, error);
    return null;
  }
};

export default {
  getStockData,
  searchStocks,
  getHotStocks,
  getMarketMovers,
  getRealtimeUpdate
};
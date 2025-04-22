import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

interface NewsArticle {
  title?: string;
  summary?: string;
  text?: string;
  datetime?: string;
  url?: string;
}

export const generateSentimentRationale = async (
  company: string,
  articles: NewsArticle[],
  sentimentScore: number
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analyze the following news articles about ${company} and provide a concise rationale for the sentiment score of ${sentimentScore.toFixed(1)}. 
    Focus on the most significant factors mentioned in the articles that influenced this sentiment.
    
    Articles:
    ${articles.map(article => `
    Title: ${article.title || 'N/A'}
    Summary: ${article.summary || article.text || 'N/A'}
    Date: ${article.datetime || 'N/A'}
    `).join('\n')}
    
    Provide a brief, factual explanation (2-3 sentences) of why the sentiment score is what it is, based on the news content.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating sentiment rationale:', error);
    return `Unable to generate rationale for ${company}'s sentiment score of ${sentimentScore.toFixed(1)}.`;
  }
}; 
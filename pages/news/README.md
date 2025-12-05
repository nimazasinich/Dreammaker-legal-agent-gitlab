# News Page - News API Integration

## Overview

This news page has been updated to integrate with the [News API](https://newsapi.org/) to fetch real-time cryptocurrency news articles. The implementation includes comprehensive error handling, sentiment analysis, and a modern UI with image support.

## Features

### 1. **News API Integration**
- Fetches cryptocurrency news from News API
- Configurable search queries (default: cryptocurrency, Bitcoin, Ethereum)
- Automatic date filtering (last 7 days by default)
- Sorted by most recent articles

### 2. **Error Handling**
The system handles multiple error scenarios:
- **Invalid API Key**: Displays authentication error message
- **Rate Limiting**: Notifies when API rate limit is exceeded
- **No Internet**: Detects network connectivity issues
- **Server Errors**: Handles News API server issues
- **Fallback Data**: Automatically switches to demo data if API fails

### 3. **Article Display**
Each article shows:
- **Title**: Article headline
- **Description**: Article summary/content
- **URL**: Link to full article (opens in new tab)
- **Image**: Article thumbnail (if available)
- **Source**: News source name
- **Author**: Article author (if available)
- **Timestamp**: Relative time (e.g., "2h ago")
- **Sentiment Badge**: Positive/Negative/Neutral indicator

### 4. **Sentiment Analysis**
Automatic sentiment detection based on keywords:
- **Positive**: surge, rise, gain, bullish, growth, etc.
- **Negative**: fall, drop, crash, bearish, decline, etc.
- **Neutral**: Neither positive nor negative

### 5. **Filtering & Search**
- **Keyword Search**: Real-time search across titles and descriptions
- **Source Filter**: Filter by news source
- **Sentiment Filter**: Filter by sentiment (positive/negative/neutral)

## Configuration

Edit `news-config.js` to customize settings:

```javascript
export const NEWS_CONFIG = {
  // API Settings
  apiKey: 'YOUR_API_KEY_HERE',
  baseUrl: 'https://newsapi.org/v2',
  
  // Search Parameters
  defaultQuery: 'cryptocurrency OR bitcoin OR ethereum',
  language: 'en',
  pageSize: 100,
  daysBack: 7,
  
  // Refresh Settings
  autoRefreshInterval: 60000, // milliseconds
  
  // Display Settings
  showImages: true,
  showAuthor: true,
  showSentiment: true
};
```

## API Key Setup

1. Get your free API key from [newsapi.org](https://newsapi.org/register)
2. Update the `apiKey` in `news-config.js`
3. Free tier includes:
   - 100 requests per day
   - Articles from the last 30 days
   - All sources and languages

## File Structure

```
static/pages/news/
├── index.html          # HTML structure
├── news.js             # Main JavaScript logic
├── news.css            # Styling
├── news-config.js      # Configuration settings
└── README.md           # This file
```

## Key Functions

### `fetchFromNewsAPI()`
Fetches articles from News API with proper error handling.

### `formatNewsAPIArticles(articles)`
Transforms News API response to internal format.

### `analyzeSentiment(text)`
Performs keyword-based sentiment analysis.

### `handleAPIError(error)`
Displays user-friendly error messages.

### `renderNews()`
Renders articles to the DOM with images and formatting.

## Error Messages

| Error | User Message |
|-------|-------------|
| Invalid API key | API authentication failed. Please check your API key. |
| Rate limit exceeded | Too many requests. Please try again later. |
| Server error | News service is temporarily unavailable. |
| No internet | No internet connection. Please check your network. |

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features required
- Fetch API support required

## Demo Data

If the API is unavailable, the system automatically loads demo cryptocurrency news to ensure the page always displays content.

## Performance

- Auto-refresh: Every 60 seconds (configurable)
- Lazy loading for images
- Efficient client-side filtering
- Responsive grid layout

## Styling

The page uses a modern glass-morphism design with:
- Gradient accents
- Smooth animations
- Hover effects
- Responsive layout
- Dark theme optimized

## Future Enhancements

Potential improvements:
- Multi-language support
- Category filtering
- Bookmarking articles
- Share functionality
- Advanced sentiment analysis (ML-based)
- Custom RSS feed support
- Export to PDF/CSV

## Support

For issues or questions:
1. Check News API status: [status.newsapi.org](https://status.newsapi.org/)
2. Verify API key is valid
3. Check browser console for errors
4. Review configuration settings

## License

This implementation uses the News API service which has its own [Terms of Service](https://newsapi.org/terms).


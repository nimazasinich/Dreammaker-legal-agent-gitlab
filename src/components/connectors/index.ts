// Temporary fix for memory leak - disable connector components
// These components make independent API calls that bypass DataContext

import { Logger } from '../../core/Logger.js';
const logger = Logger.getInstance();

// Comment out these imports to prevent multiple API calls
/*
export { RealSignalFeedConnector } from './RealSignalFeedConnector';
export { RealPriceChartConnector } from './RealPriceChartConnector';
export { RealChartDataConnector } from './RealChartDataConnector';
export { RealPortfolioConnector } from './RealPortfolioConnector';
export { RealDataConnector } from './RealDataConnector';
*/

logger.info('🚫 Connector components temporarily disabled to prevent memory leak');
/**
 * Cloudflare Worker Entry Point
 */

import { handleRequest } from './router';

export default {
	fetch: handleRequest,
};

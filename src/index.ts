/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { main as emmaMain } from './emma.js';
import trainJson from './public/train.json5';

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === '/') {
			return new Response('Hello from Cloudflare Workers!', { headers: { 'Content-Type': 'text/plain' } });
		}

		if (url.pathname === '/latest') {
			return new Response(trainJson, { headers: { 'Content-Type': 'application/json' } });
		}

		if (url.pathname === '/health') {
			return new Response('OK', { headers: { 'Content-Type': 'text/plain' } });
		}

		return new Response('Not Found', { status: 404 });
	},

	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		try {
			await emmaMain();
		} catch (e) {
			console.error('Scheduled function error:', e);
		}
	},
} satisfies ExportedHandler<Env>;

import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// SPA mode: all unmatched routes fall back to index.html
			fallback: 'index.html'
		}),
		prerender: {
			entries: []
		}
	}
};

export default config;

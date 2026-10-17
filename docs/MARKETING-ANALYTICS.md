# Social previews and campaign tracking

Share the homepage or a campaign link generated at /staff/marketing.

The branded static social card is at /social-preview.svg and is referenced by Open Graph / Twitter meta tags in index.html. Some platforms require PNG/JPEG and may not render SVG; check their link debuggers before relying on the card. The underlying Vite SPA serves static homepage OG tags for all routes.

The campaign generator appends utm_source, utm_medium, utm_campaign. Anonymous campaign landing events are stored in marketing_events only on initial load with a utm_source and while DNT is not set. No cookies, IP address, user agent or user-level identifiers are saved. Session storage preserves only the campaign source for booking attribution during the same tab session. Booking requests store that source in booking_requests.source.

Admin-only reporting at /staff/marketing authenticates with the existing staff account and verifies the user's active admin profile server-side. Counts show the last 30 days and the API currently caps results at 10,000 events per query. It does not count all site visitors, private forwards, actual email opens, or social impressions. "Shares" requires share-button instrumentation; none is added to existing navigation.

Production requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Vercel and the create_privacy_friendly_marketing_events migration on Supabase. Never expose the service role key to clients. Respect applicable privacy/consent requirements before expanding tracking.

# API & Embeddable Widget - Requirements Document

## Overview

This document outlines the requirements for implementing a public REST API and embeddable booking widget for NextPlay Court. This is **Phase 1 Priority** (Q2 2026) as outlined in `docs/ROADMAP.md`.

**Goal**: Enable third-party integrations and allow venues to embed booking functionality on their own websites.

**Reference Documentation**:
- `docs/ARCHITECTURE.md` - Current system architecture
- `docs/FEATURE_INVENTORY.md` - Existing features to expose via API
- `docs/ROADMAP.md` - Phase 1 details
- `docs/PLAYTOMIC_FEATURE_ANALYSIS.md` - Competitor analysis

---

## Part 1: Public REST API

### 1.1 API Authentication & Security

#### Requirements

**REQ-API-001: API Key Authentication**
- Generate unique API keys for each client application
- Store API keys securely (hashed in database)
- Include API key in request headers: `X-API-Key: {key}`
- Return 401 Unauthorized for invalid/missing keys

**REQ-API-002: OAuth 2.0 Support**
- Implement OAuth 2.0 authorization code flow
- Support scopes: `read:venues`, `read:courts`, `write:bookings`, `read:profile`
- Issue JWT access tokens (1 hour expiry)
- Issue refresh tokens (30 days expiry)
- Provide token endpoint: `POST /api/v1/oauth/token`

**REQ-API-003: Rate Limiting**
- Implement rate limiting per API key
- Default limits:
  - 100 requests per minute
  - 10,000 requests per day
- Return 429 Too Many Requests with `Retry-After` header
- Include rate limit headers in all responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

**REQ-API-004: CORS Configuration**
- Allow cross-origin requests from registered domains
- Clients must register allowed origins when creating API key
- Support preflight OPTIONS requests
- Include appropriate CORS headers

---

### 1.2 API Endpoints

#### Venues API

**REQ-API-005: List Venues**
```
GET /api/v1/venues
Query Parameters:
  - sport: string (optional) - Filter by sport type
  - city: string (optional) - Filter by city
  - region: string (optional) - Filter by region
  - lat: number (optional) - Latitude for distance search
  - lng: number (optional) - Longitude for distance search
  - radius: number (optional) - Search radius in km (default: 10)
  - page: number (optional) - Page number (default: 1)
  - limit: number (optional) - Results per page (default: 20, max: 100)

Response: 200 OK
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "address": "string",
      "city": "string",
      "region": "string",
      "country": "string",
      "latitude": number,
      "longitude": number,
      "phone": "string",
      "email": "string",
      "website": "string",
      "amenities": ["string"],
      "sports": ["string"],
      "photos": ["url"],
      "rating": number,
      "totalReviews": number
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

**REQ-API-006: Get Venue Details**
```
GET /api/v1/venues/{venueId}

Response: 200 OK
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "address": "string",
  "city": "string",
  "region": "string",
  "country": "string",
  "latitude": number,
  "longitude": number,
  "phone": "string",
  "email": "string",
  "website": "string",
  "amenities": ["string"],
  "sports": ["string"],
  "photos": ["url"],
  "rating": number,
  "totalReviews": number,
  "courts": [
    {
      "id": "uuid",
      "name": "string",
      "sport": "string",
      "surfaceType": "string",
      "indoor": boolean,
      "amenities": ["string"],
      "photos": ["url"]
    }
  ]
}
```

#### Courts API

**REQ-API-007: List Courts**
```
GET /api/v1/courts
Query Parameters:
  - venueId: uuid (optional) - Filter by venue
  - sport: string (optional) - Filter by sport
  - indoor: boolean (optional) - Filter indoor/outdoor
  - surfaceType: string (optional) - Filter by surface
  - page: number (optional)
  - limit: number (optional)

Response: 200 OK
{
  "data": [
    {
      "id": "uuid",
      "venueId": "uuid",
      "venueName": "string",
      "name": "string",
      "sport": "string",
      "surfaceType": "string",
      "indoor": boolean,
      "amenities": ["string"],
      "photos": ["url"]
    }
  ],
  "pagination": { ... }
}
```

**REQ-API-008: Get Court Availability**
```
GET /api/v1/courts/{courtId}/availability
Query Parameters:
  - date: string (required) - ISO date (YYYY-MM-DD)
  - duration: number (optional) - Booking duration in minutes (default: 60)

Response: 200 OK
{
  "courtId": "uuid",
  "date": "string",
  "slots": [
    {
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "available": boolean,
      "price": number,
      "currency": "string"
    }
  ]
}
```

#### Bookings API

**REQ-API-009: Create Booking**
```
POST /api/v1/bookings
Authorization: Bearer {access_token} (required)

Request Body:
{
  "courtId": "uuid",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "duration": number, // minutes
  "equipment": [
    {
      "equipmentId": "uuid",
      "quantity": number
    }
  ],
  "paymentMethod": "stripe" | "venue" | "credits",
  "stripePaymentMethodId": "string" // required if paymentMethod = "stripe"
}

Response: 201 Created
{
  "id": "uuid",
  "courtId": "uuid",
  "userId": "uuid",
  "date": "string",
  "startTime": "string",
  "endTime": "string",
  "duration": number,
  "status": "confirmed" | "pending" | "cancelled",
  "totalPrice": number,
  "currency": "string",
  "paymentStatus": "paid" | "pending" | "refunded",
  "equipment": [...],
  "createdAt": "ISO timestamp"
}
```

**REQ-API-010: Get Booking Details**
```
GET /api/v1/bookings/{bookingId}
Authorization: Bearer {access_token} (required)

Response: 200 OK
{
  "id": "uuid",
  "court": {
    "id": "uuid",
    "name": "string",
    "venue": {
      "id": "uuid",
      "name": "string",
      "address": "string"
    }
  },
  "date": "string",
  "startTime": "string",
  "endTime": "string",
  "duration": number,
  "status": "string",
  "totalPrice": number,
  "currency": "string",
  "paymentStatus": "string",
  "equipment": [...],
  "createdAt": "ISO timestamp"
}
```

**REQ-API-011: Cancel Booking**
```
DELETE /api/v1/bookings/{bookingId}
Authorization: Bearer {access_token} (required)

Response: 200 OK
{
  "id": "uuid",
  "status": "cancelled",
  "refundAmount": number,
  "refundStatus": "pending" | "completed"
}
```

**REQ-API-012: List User Bookings**
```
GET /api/v1/bookings
Authorization: Bearer {access_token} (required)
Query Parameters:
  - status: string (optional) - Filter by status
  - from: string (optional) - Start date (YYYY-MM-DD)
  - to: string (optional) - End date (YYYY-MM-DD)
  - page: number (optional)
  - limit: number (optional)

Response: 200 OK
{
  "data": [ ... ],
  "pagination": { ... }
}
```

#### Users API

**REQ-API-013: Get User Profile**
```
GET /api/v1/users/me
Authorization: Bearer {access_token} (required)

Response: 200 OK
{
  "id": "uuid",
  "email": "string",
  "fullName": "string",
  "nationality": "string",
  "city": "string",
  "region": "string",
  "preferredSports": ["string"],
  "credits": number,
  "createdAt": "ISO timestamp"
}
```

---

### 1.3 Webhooks

**REQ-API-014: Webhook System**
- Allow clients to register webhook URLs
- Send POST requests to registered URLs for events:
  - `booking.created`
  - `booking.cancelled`
  - `booking.completed`
  - `payment.succeeded`
  - `payment.failed`
  - `payment.refunded`
- Include signature in `X-Webhook-Signature` header for verification
- Retry failed webhooks (3 attempts with exponential backoff)
- Provide webhook logs in API dashboard

**Webhook Payload Format**:
```json
{
  "id": "event_uuid",
  "type": "booking.created",
  "createdAt": "ISO timestamp",
  "data": {
    // Event-specific data
  }
}
```

---

### 1.4 API Documentation

**REQ-API-015: OpenAPI Specification**
- Create OpenAPI 3.0 specification file
- Include all endpoints, parameters, request/response schemas
- Document authentication methods
- Include example requests and responses
- Host at `/api/v1/openapi.json`

**REQ-API-016: Interactive Documentation Portal**
- Create interactive API documentation using Swagger UI or similar
- Host at `/api/docs`
- Include:
  - Getting started guide
  - Authentication guide
  - Endpoint reference
  - Code examples (JavaScript, Python, PHP, cURL)
  - Webhook documentation
  - Rate limiting information
  - Error codes reference
  - Changelog

---

### 1.5 API Versioning & Error Handling

**REQ-API-017: API Versioning**
- Use URL versioning: `/api/v1/...`
- Maintain backward compatibility within major versions
- Provide deprecation notices (6 months minimum)
- Document version changes in changelog

**REQ-API-018: Error Handling**
- Use standard HTTP status codes
- Return consistent error response format:
```json
{
  "error": {
    "code": "string", // Machine-readable error code
    "message": "string", // Human-readable message
    "details": {} // Optional additional details
  }
}
```

**Common Error Codes**:
- 400 Bad Request - Invalid request parameters
- 401 Unauthorized - Missing or invalid authentication
- 403 Forbidden - Insufficient permissions
- 404 Not Found - Resource not found
- 409 Conflict - Resource conflict (e.g., slot already booked)
- 429 Too Many Requests - Rate limit exceeded
- 500 Internal Server Error - Server error

---

## Part 2: Embeddable Booking Widget

### 2.1 Widget Architecture

**REQ-WIDGET-001: Standalone Widget Bundle**
- Create standalone JavaScript bundle
- Bundle size < 100KB (gzipped)
- No dependencies on external libraries (self-contained)
- Compatible with modern browsers (Chrome, Firefox, Safari, Edge)
- Support for IE11 optional (can be separate bundle)

**REQ-WIDGET-002: Widget Initialization**
```html
<!-- Simple embed code -->
<div id="nextplay-widget"></div>
<script src="https://widget.nextplaycourt.com/v1/widget.js"></script>
<script>
  NextPlayWidget.init({
    apiKey: 'your_api_key',
    container: '#nextplay-widget',
    venueId: 'venue_uuid', // Optional: show specific venue
    sport: 'tennis', // Optional: filter by sport
    theme: {
      primaryColor: '#3B82F6',
      fontFamily: 'Inter, sans-serif'
    },
    language: 'en' // or 'pt'
  });
</script>
```

---

### 2.2 Widget Features

**REQ-WIDGET-003: Court Discovery**
- Display list of available courts
- Filter by sport, date, time
- Show court photos and details
- Display pricing information
- Show venue information

**REQ-WIDGET-004: Availability Calendar**
- Interactive calendar view
- Show available time slots
- Highlight selected date/time
- Display pricing per slot
- Real-time availability updates

**REQ-WIDGET-005: Booking Flow**
- Multi-step booking process:
  1. Select court and date/time
  2. Select duration
  3. Optional: Add equipment
  4. Enter user details (if not logged in)
  5. Payment
  6. Confirmation
- Progress indicator
- Back/Next navigation
- Form validation

**REQ-WIDGET-006: Authentication**
- Support guest checkout (email + name)
- Support existing user login
- OAuth integration with parent site (optional)
- Remember user session

**REQ-WIDGET-007: Payment Integration**
- Stripe Elements integration
- Support credit card payments
- 3D Secure support
- Display payment confirmation
- Email receipt

---

### 2.3 Widget Customization

**REQ-WIDGET-008: Theme Customization**
```javascript
theme: {
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  fontFamily: 'Inter, sans-serif',
  borderRadius: '8px',
  buttonStyle: 'rounded' | 'square',
  layout: 'compact' | 'full'
}
```

**REQ-WIDGET-009: Venue-Specific Widget**
- Filter to show only specific venue's courts
- Use venue's branding (logo, colors)
- Custom header/footer content

**REQ-WIDGET-010: Sport-Specific Widget**
- Filter to show only specific sport
- Sport-specific terminology
- Sport-specific icons

**REQ-WIDGET-011: Language Support**
- Support English and Portuguese
- Auto-detect browser language
- Allow manual language selection
- All UI text translated

---

### 2.4 Widget Security & Performance

**REQ-WIDGET-012: Cross-Origin Security**
- Use postMessage API for parent-widget communication
- Validate message origins
- Sandbox iframe (if using iframe approach)
- Content Security Policy headers

**REQ-WIDGET-013: Performance Optimization**
- Lazy load images
- Code splitting for different views
- Cache API responses (with TTL)
- Minimize DOM operations
- Debounce user inputs

**REQ-WIDGET-014: Responsive Design**
- Mobile-first approach
- Breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- Touch-friendly interactions
- Optimized for small screens

---

### 2.5 Widget Analytics

**REQ-WIDGET-015: Usage Analytics**
- Track widget impressions
- Track booking conversions
- Track user interactions (clicks, form submissions)
- Track errors and failures
- Provide analytics dashboard for API key owners

**REQ-WIDGET-016: Event Callbacks**
```javascript
NextPlayWidget.init({
  // ... other config
  onBookingComplete: (booking) => {
    // Custom tracking code
  },
  onError: (error) => {
    // Custom error handling
  }
});
```

---

### 2.6 Widget Documentation

**REQ-WIDGET-017: Widget Documentation**
- Installation guide
- Configuration options reference
- Customization examples
- Troubleshooting guide
- FAQ

**REQ-WIDGET-018: Widget Generator Tool**
- Web-based widget configuration tool
- Live preview
- Generate embed code
- Copy to clipboard
- Save configurations

---

## Part 3: Integration Examples

**REQ-INTEGRATION-001: WordPress Plugin**
- Create WordPress plugin for easy widget integration
- Settings page for API key configuration
- Shortcode support: `[nextplay_widget venue_id="..."]`
- Gutenberg block support

**REQ-INTEGRATION-002: Direct HTML/JavaScript**
- Provide copy-paste embed code
- CDN-hosted widget script
- Minimal configuration required
- Works on any HTML page

**REQ-INTEGRATION-003: Integration Documentation**
- Step-by-step guides for popular platforms:
  - WordPress
  - Wix
  - Squarespace
  - Shopify
  - Custom HTML sites
- Video tutorials
- Code examples

---

## Part 4: Monitoring & Maintenance

**REQ-MONITOR-001: API Monitoring**
- Track API uptime (target: 99.9%)
- Monitor response times
- Alert on errors and failures
- Track rate limit violations
- Monitor webhook delivery success

**REQ-MONITOR-002: Widget Monitoring**
- Track widget load times
- Monitor JavaScript errors
- Track booking conversion rates
- Monitor API call failures from widget
- A/B testing support

**REQ-MONITOR-003: Logging**
- Log all API requests (with PII redaction)
- Log authentication attempts
- Log rate limit violations
- Log webhook deliveries
- Retention: 90 days

---

## Success Metrics

### Phase 1 Goals (Q2 2026)
- 50+ venues using platform
- 10+ venues using embeddable widget
- 1,000+ bookings via API
- 5+ third-party integrations
- API uptime >99.9%
- Widget load time <2 seconds
- Booking conversion rate >15%

---

## Technical Implementation Notes

### API Implementation
- Use Supabase Edge Functions for API endpoints
- Implement API key management in Supabase database
- Use Supabase Auth for OAuth implementation
- Implement rate limiting using Redis or Supabase
- Use existing booking logic from current platform

### Widget Implementation
- Build with vanilla JavaScript or lightweight framework (Preact/Svelte)
- Use Vite for bundling
- Host on CDN (Cloudflare, AWS CloudFront)
- Use Stripe Elements for payment forms
- Communicate with API using fetch API

### Database Changes
- Add `api_keys` table for API key management
- Add `api_usage` table for rate limiting and analytics
- Add `webhooks` table for webhook registrations
- Add `widget_analytics` table for widget usage tracking

---

## References

- **Architecture**: `docs/ARCHITECTURE.md`
- **Current Features**: `docs/FEATURE_INVENTORY.md`
- **Roadmap**: `docs/ROADMAP.md` (Phase 1)
- **Competitor Analysis**: `docs/PLAYTOMIC_FEATURE_ANALYSIS.md`
- **Best Practices**: `docs/LOVABLE_BEST_PRACTICES.md`

---

**Document Version**: 1.0
**Last Updated**: 2026-04-18
**Status**: Ready for Implementation

# NextPlay Court - Architecture Documentation

## Project Overview

NextPlay Court is a comprehensive sports booking platform that enables users to discover, book, and manage court reservations across multiple sports (not limited to racket sports like competitors). The platform supports multiple user roles and provides features for players, venue managers, and group organizers.

**Live Platform**: [Your deployment URL]
**Tech Stack**: React + TypeScript + Vite + Supabase + Stripe

## Core Objectives

1. **Multi-Sport Focus**: Unlike Playtomic (racket sports only), support basketball, tennis, padel, volleyball, futsal, and more
2. **Embeddable Booking**: Allow venues to embed booking widgets on their own websites
3. **API-First**: Provide public APIs for third-party integrations
4. **Community Building**: Connect players through groups, quick challenges, and social features
5. **Venue Management**: Comprehensive tools for venue owners to manage courts, bookings, and revenue

## System Architecture

### Frontend Architecture

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── booking/        # Booking wizard and related components
│   ├── courts/         # Court discovery and display
│   ├── manager/        # Venue manager dashboard components
│   ├── payment/        # Payment processing components
│   ├── quick-challenge/# Quick game matching components
│   └── ui/             # shadcn/ui base components
├── pages/              # Route pages
│   ├── admin/          # Admin panel pages
│   └── manager/        # Manager dashboard pages
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── integrations/       # External service integrations
└── i18n/               # Internationalization (en, pt)
```

### Backend Architecture (Supabase)

**Database**: PostgreSQL with Row Level Security (RLS)
**Authentication**: Supabase Auth with email/password and social providers
**Storage**: Supabase Storage for court photos and user avatars
**Edge Functions**: Serverless functions for:
- Stripe payment processing
- Stripe Connect onboarding
- Booking hold management
- Notification delivery

### Key Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with role information |
| `venues` | Venue/court facility information |
| `courts` | Individual courts within venues |
| `court_availability` | Time slot availability for courts |
| `bookings` | Court reservations |
| `groups` | Recurring game groups |
| `group_members` | Group membership tracking |
| `quick_challenges` | Quick game lobbies |
| `notifications` | In-app notifications |
| `credits` | User credit balance tracking |
| `referrals` | Referral program tracking |

## User Roles

### 1. Player (Default)
- Browse and book courts
- Join groups and quick challenges
- Manage bookings and profile
- Earn and use credits
- Refer friends

### 2. Venue Manager
- Register and manage venues
- Configure courts and availability
- Set pricing and equipment
- View bookings and revenue
- Manage staff access
- Stripe Connect integration for payouts

### 3. Group Organizer
- Create recurring game groups
- Manage group members
- Set organizer fees
- Stripe Connect integration for fee payouts

### 4. Admin
- Platform-wide management
- User and venue moderation
- System configuration

## Key Features Implemented

### Booking System
- **Booking Wizard**: Multi-step booking flow with date/time selection
- **Hold System**: 10-minute hold on slots during booking process
- **Payment Options**: 
  - Immediate payment (Stripe)
  - Pay at venue
  - Use credits
- **Equipment Rental**: Optional equipment selection during booking
- **Group Booking**: Book for groups with split payment options

### Court Discovery
- **Search & Filter**: By sport, location, price, amenities
- **Map View**: Interactive map with court locations
- **Favorites**: Save favorite courts
- **Court Details**: Photos, amenities, pricing, availability calendar

### Group Management
- **Recurring Sessions**: Weekly/bi-weekly game groups
- **Member Management**: Invite, approve, remove members
- **Organizer Fees**: Optional fees for group organizers
- **Group Chat**: Communication within groups

### Quick Challenges
- **Lobby System**: Create or join quick game lobbies
- **Player Matching**: Find players for immediate games
- **Lobby Chat**: Real-time chat in lobbies
- **Invite Friends**: Invite specific users to lobbies

### Payment & Credits
- **Stripe Integration**: Secure payment processing
- **Stripe Connect**: Payouts for venues and organizers
- **Credits System**: Earn credits through referrals, use for bookings
- **Refund Handling**: Automated refund processing

### Venue Manager Dashboard
- **Live Court Status**: Real-time booking status
- **Revenue Analytics**: Weekly performance charts
- **Booking Management**: View, reschedule, cancel bookings
- **Availability Management**: Bulk availability generation, date overrides
- **Staff Access**: Grant staff members access to venue management

### Internationalization
- **Multi-language**: English and Portuguese
- **Localized Content**: All UI text translated
- **Date/Time Formatting**: Locale-aware formatting

## Technical Patterns

### State Management
- **React Query**: Server state management and caching
- **React Hook Form**: Form state and validation
- **Zustand** (if needed): Client-side global state

### Data Fetching
- Custom hooks wrapping Supabase queries
- React Query for caching and optimistic updates
- Real-time subscriptions for live updates

### Authentication Flow
1. User signs up/logs in via Supabase Auth
2. Profile created automatically via database trigger
3. Role selection (player/manager) on first login
4. Protected routes check authentication status

### Payment Flow
1. User initiates booking
2. Slot placed on 10-minute hold
3. Payment processed via Stripe
4. Booking confirmed and hold released
5. Venue receives payout (minus platform fee)

### Booking Hold System
- Prevents double-booking during checkout
- Automatic release after 10 minutes
- Visual countdown timer for user
- Database-level hold tracking

## Security Considerations

### Row Level Security (RLS)
- All tables have RLS policies
- Users can only access their own data
- Managers can only access their venue data
- Admin role for platform-wide access

### API Security
- Supabase service role key protected
- Edge functions validate authentication
- Stripe webhook signature verification
- Input validation with Zod schemas

### Payment Security
- PCI compliance via Stripe
- No card data stored locally
- Stripe Connect for secure payouts
- Webhook verification for payment events

## Performance Optimizations

### Frontend
- Code splitting by route
- Lazy loading of components
- Image optimization (WebP format)
- React Query caching strategy

### Backend
- Database indexes on frequently queried columns
- Materialized views for analytics
- Edge function cold start optimization
- Connection pooling

## Deployment

### Frontend
- Hosted on Lovable platform
- Automatic deployments on git push
- Custom domain support
- CDN distribution

### Backend
- Supabase hosted PostgreSQL
- Edge functions on Deno Deploy
- Automatic backups
- Point-in-time recovery

## Monitoring & Analytics

### Application Monitoring
- Supabase dashboard for database metrics
- Edge function logs
- Error tracking (to be implemented)

### Business Metrics
- Booking conversion rates
- Revenue tracking
- User growth metrics
- Court utilization rates

## Known Limitations

1. **No mobile apps**: Web-only (PWA support planned)
2. **Limited sports**: Need to expand sport types
3. **No API**: Public API not yet available
4. **No embeddable widget**: Cannot embed booking on external sites
5. **Single currency**: Only NZD supported currently
6. **Limited payment methods**: Stripe only

## Future Architecture Considerations

### API Layer
- RESTful API with OpenAPI documentation
- Rate limiting and authentication
- Webhook support for integrations

### Embeddable Widget
- Standalone booking widget
- Customizable styling
- Cross-origin communication
- Lightweight bundle size

### Mobile Apps
- React Native for iOS/Android
- Shared business logic with web
- Native payment integrations

### Scalability
- Database sharding for multi-region
- Redis caching layer
- Message queue for async processing
- Microservices for complex domains

---

**Last Updated**: 2026-04-18
**Maintained By**: Development Team

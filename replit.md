# Rifas Online - Sistema de Rifas

## Overview

This is a complete raffle management system built with Node.js, Express, and SQLite. The system allows administrators to create and manage raffles, while users can participate by purchasing numbers and making payments through Mercado Pago integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Express.js server with session-based authentication
- **Database**: SQLite with manual schema management
- **Authentication**: Session-based admin authentication with bcrypt password hashing
- **Payment Integration**: Mercado Pago API for PIX payments
- **File Structure**: MVC pattern with separate routes, models, and middleware

### Frontend Architecture
- **Technology**: Vanilla JavaScript with Bootstrap 5 for styling
- **Pages**: Separate HTML pages for public raffle viewing, admin dashboard, and individual raffle participation
- **Styling**: Custom CSS with Bootstrap components and Font Awesome icons
- **Interaction**: AJAX-based API calls for dynamic content loading

## Key Components

### Models
- **Raffle**: Manages raffle creation, updates, and statistics
- **Participant**: Handles participant registration and number reservations
- **Payment**: Tracks payment status and Mercado Pago integration

### Routes
- **Admin Routes** (`/admin`): Authentication, raffle management, participant exports
- **Raffle Routes** (`/api/raffles`): Public raffle listing and details
- **Payment Routes** (`/api/payments`): Payment creation and webhook handling

### Middleware
- **Authentication**: Session-based admin authentication middleware
- **Error Handling**: Global error handling for API responses

### Utilities
- **CSV Exporter**: Exports participant data and raffle statistics
- **Lottery Utils**: Calculates winner numbers based on federal lottery results

## Data Flow

1. **Admin Creates Raffle**: Admin logs in and creates a new raffle with title, description, number of tickets, price, and draw date
2. **User Participation**: Users browse active raffles, select available numbers, and provide contact information
3. **Payment Process**: System generates PIX payment through Mercado Pago API with QR code
4. **Payment Confirmation**: Webhooks update payment status and participant status
5. **Winner Selection**: Admin inputs federal lottery number to calculate winner automatically

## External Dependencies

### Payment Processing
- **Mercado Pago**: PIX payment integration for secure transactions
- **Webhook Support**: Automatic payment status updates

### Database
- **SQLite**: Local database with tables for raffles, participants, payments, and admin users
- **Session Storage**: SQLite-based session storage for admin authentication

### Libraries
- **bcrypt**: Password hashing for admin authentication
- **csv-writer**: Export functionality for participant data
- **express-session**: Session management with SQLite store
- **CORS**: Cross-origin resource sharing support

## Deployment Strategy

### Environment Configuration
- Uses dotenv for environment variable management
- Configurable Mercado Pago access token
- Session secret configuration
- Port configuration (defaults to 5000)

### Database Setup
- Automatic table creation on startup
- SQLite database file stored locally
- Session database separate from main application data

### Static File Serving
- Public directory serves HTML, CSS, and JavaScript files
- Bootstrap and Font Awesome served from CDN
- Custom CSS for styling enhancements

### Error Handling
- Global error middleware for API routes
- Client-side error handling with user-friendly messages
- Fallback for missing Mercado Pago configuration (test mode)

### Security Considerations
- Session-based authentication with secure cookies
- Password hashing with bcrypt
- Input validation on server side
- CSRF protection through session management
# JavaScript Downloader Web Application

## Overview

This is a full-stack web application for extracting and downloading JavaScript files from websites. The application allows users to input a URL, automatically discovers all JavaScript files linked on that page, downloads them, and provides real-time progress tracking with detailed logging. Built with a React frontend and Express backend, it features a modern UI using shadcn/ui components and provides comprehensive extraction analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system and CSS variables
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation resolvers

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints for extraction job management
- **File Processing**: Custom JavaScript extraction service using Cheerio for HTML parsing and Axios for HTTP requests
- **Session Management**: Express sessions with PostgreSQL session storage via connect-pg-simple

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Fallback Storage**: In-memory storage implementation for development/testing

### Database Schema Design
- **Extraction Jobs Table**: Tracks extraction requests with status, progress metrics, domain info, and completion timestamps
- **JS Files Table**: Records individual JavaScript file downloads with URLs, filenames, sizes, and error handling
- **Logging System**: JSON-based logs stored within job records for real-time progress tracking

### API Architecture
- **Job Creation**: POST /api/extraction-jobs - Creates new extraction jobs and triggers async processing
- **Job Monitoring**: GET /api/extraction-jobs/:id - Retrieves job details with associated files
- **Job History**: GET /api/extraction-jobs - Lists recent extraction jobs with pagination
- **Real-time Updates**: Polling-based progress tracking with React Query refetch intervals

### File Processing Pipeline
- **URL Discovery**: Parses HTML to find script tags with src attributes
- **File Extraction**: Downloads JavaScript files with proper error handling and timeouts
- **Progress Tracking**: Real-time status updates with success/failure counts and total file sizes
- **Error Management**: Comprehensive error logging with specific failure reasons

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations and query building
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI Component Libraries
- **Radix UI**: Headless UI primitives for accessibility and keyboard navigation
- **Lucide React**: Icon library for consistent iconography
- **class-variance-authority**: Type-safe component variant management

### Development Tools
- **Vite**: Fast build tool with hot module replacement
- **TypeScript**: Static type checking across frontend and backend
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **React Query**: Server state synchronization and caching

### HTTP and Web Scraping
- **Axios**: Promise-based HTTP client for external requests
- **Cheerio**: Server-side jQuery implementation for HTML parsing
- **Web Scraping**: Custom extraction logic for discovering JavaScript file URLs

### Form and Validation
- **React Hook Form**: Performant form state management
- **Zod**: TypeScript-first schema validation library
- **Hookform Resolvers**: Integration between React Hook Form and validation libraries

### Build and Deployment
- **ESBuild**: Fast bundling for production server builds
- **PostCSS**: CSS processing with Tailwind and autoprefixer plugins
- **Replit Plugins**: Development environment integration for runtime error handling and debugging
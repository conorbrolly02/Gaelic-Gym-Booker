"""
FastAPI Application Entry Point.

This is the main application file that:
- Creates the FastAPI app instance
- Configures CORS middleware
- Registers all API routers
- Sets up database initialization on startup
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db
from app.routers import auth_router, members_router, bookings_router, admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for the FastAPI application.
    
    - On startup: Initialize database tables
    - On shutdown: Clean up resources
    """
    # Startup: Create database tables
    print("Initializing database...")
    await init_db()
    print("Database initialized!")
    
    yield  # App runs here
    
    # Shutdown: Clean up (if needed)
    print("Shutting down...")


# Create the FastAPI application
app = FastAPI(
    title="Gym Booking API",
    description="""
    REST API for a Gaelic club gym booking system.
    
    ## Features
    
    - **Authentication**: Register, login, logout with JWT tokens
    - **Members**: Profile management for gym members
    - **Bookings**: Create, view, and cancel gym time slot bookings
    - **Admin**: Member approval, booking oversight, statistics
    
    ## Authentication
    
    This API uses JWT tokens stored in HTTP-only cookies.
    Login via POST /api/v1/auth/login to receive tokens.
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS (Cross-Origin Resource Sharing)
# This allows the Next.js frontend to call the API
app.add_middleware(
    CORSMiddleware,
    # Allow requests from the frontend
    # In production, replace with your actual frontend URL
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        "http://0.0.0.0:5000",
        "*",  # Allow all for development
    ],
    # Allow cookies to be sent with requests
    allow_credentials=True,
    # Allow all HTTP methods
    allow_methods=["*"],
    # Allow all headers
    allow_headers=["*"],
)

# Register API routers with /api/v1 prefix
# This creates versioned API endpoints
app.include_router(auth_router, prefix="/api/v1")
app.include_router(members_router, prefix="/api/v1")
app.include_router(bookings_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    """
    Root endpoint - health check.
    
    Returns a simple message confirming the API is running.
    """
    return {
        "message": "Gym Booking API is running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring.
    
    Returns 200 OK if the service is healthy.
    """
    return {"status": "healthy"}

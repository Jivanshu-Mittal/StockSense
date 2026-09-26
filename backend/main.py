from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.config import settings
from routers import auth, products, operations, dashboard, locations

app = FastAPI(title=settings.PROJECT_NAME, version="0.1.0")

# Configure CORS with strict, environment-controlled origins
origins = [origin.strip() for origin in settings.BACKEND_CORS_ORIGINS.split(",")]
# Remove wildcard origins when credentials are enabled (security best practice)
origins = [origin for origin in origins if origin != "*"]
# If after removing wildcards we have no origins, use default development origins
if not origins:
    origins = ["http://localhost:3000", "http://localhost:8081", "http://localhost:19006"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    if isinstance(exc, ValueError):
        return JSONResponse(
            status_code=400,
            content={"detail": str(exc)}
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(operations.router)
app.include_router(dashboard.router)
app.include_router(locations.router)


@app.get("/")
def root():
    return {"status": "ok", "app": settings.PROJECT_NAME}

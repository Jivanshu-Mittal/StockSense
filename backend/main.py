from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routers import auth, products, operations

app = FastAPI(title=settings.PROJECT_NAME, version="0.1.0")

# TODO: lock this down before going to prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(operations.router)


@app.get("/")
def root():
    return {"status": "ok", "app": settings.PROJECT_NAME}

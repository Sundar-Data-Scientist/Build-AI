import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Support running as a script: `python main.py`
if __package__ is None or __package__ == "":
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    from app.auth import router as auth_router  # type: ignore
    from app.uploads import router as uploads_router  # type: ignore
    from app.projects import router as projects_router  # type: ignore
    from app.time_tracking import router as time_tracking_router  # type: ignore
    from app.pdf_extraction import router as pdf_extraction_router  # type: ignore
    from app.db import ensure_uploaded_files_schema, ensure_projects_schema, ensure_auth_schema  # type: ignore
else:
    from .auth import router as auth_router
    from .uploads import router as uploads_router
    from .projects import router as projects_router
    from .time_tracking import router as time_tracking_router
    from .pdf_extraction import router as pdf_extraction_router
    from .db import ensure_uploaded_files_schema, ensure_projects_schema, ensure_auth_schema

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth_router)
app.include_router(uploads_router)
app.include_router(projects_router)
app.include_router(time_tracking_router)
app.include_router(pdf_extraction_router)

@app.get("/health")
def health():
    return {"status": "ok"}


# Ensure schema columns for uploaded_files table exist on startup
ensure_uploaded_files_schema()
ensure_projects_schema()
ensure_auth_schema()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)



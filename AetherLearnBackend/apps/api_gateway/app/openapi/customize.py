from fastapi import FastAPI


def customize_openapi(app: FastAPI) -> None:
    app.openapi_schema = None

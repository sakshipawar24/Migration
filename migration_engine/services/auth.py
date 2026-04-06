from typing import Dict, Any
import os


def resolve_auth_config(payload: Dict[str, Any]) -> Dict[str, Any]:
    payload = payload or {}
    auth_type = payload.get("auth_type") or "service_principal"

    # Never hardcode credentials; only resolve from payload or env.
    return {
        "auth_type": auth_type,
        "tenant_id": payload.get("tenant_id") or os.environ.get("POWERBI_TENANT_ID") or "",
        "client_id": payload.get("client_id") or os.environ.get("POWERBI_CLIENT_ID") or "",
        "client_secret": payload.get("client_secret") or os.environ.get("POWERBI_CLIENT_SECRET") or "",
        "username": payload.get("username") or "",
        "password": payload.get("password") or "",
    }


def validate_auth_config(auth_config: Dict[str, Any]) -> Dict[str, Any]:
    auth_type = auth_config.get("auth_type")
    if auth_type in {"service_principal", "azure_ad_oauth"}:
        required = ["tenant_id", "client_id"]
        missing = [k for k in required if not auth_config.get(k)]
        if auth_type == "service_principal" and not auth_config.get("client_secret"):
            missing.append("client_secret")
        return {
            "valid": len(missing) == 0,
            "missing": missing,
        }

    if auth_type == "database":
        missing = [k for k in ["username", "password"] if not auth_config.get(k)]
        return {
            "valid": len(missing) == 0,
            "missing": missing,
        }

    return {
        "valid": False,
        "missing": ["unsupported auth_type"],
    }

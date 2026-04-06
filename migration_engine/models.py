from dataclasses import dataclass, field
from typing import Dict, List, Any


@dataclass
class ConnectorMetadata:
    connector_type: str
    server: str = ""
    database: str = ""
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TransformationRequest:
    source_type: str
    target_type: str
    mapping: Dict[str, Any]
    query: str = ""


@dataclass
class TransformationResult:
    success: bool
    source_type: str
    target_type: str
    transformed_query: str
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

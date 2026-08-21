
import pytest
from app.analyzers.base import Analyzer


def test_analyzer_cannot_be_instantiated() -> None:
    with pytest.raises(TypeError):
        Analyzer()  # type: ignore[abstract]
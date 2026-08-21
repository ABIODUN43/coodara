class AnalyzerError(Exception):
    """Base exception for analyzer failures."""


class AnalyzerConfigurationError(AnalyzerError):
    """Raised when an analyzer is incorrectly configured."""


class AnalyzerExecutionError(AnalyzerError):
    """Raised when an analyzer cannot complete its analysis."""
from pydantic import BaseModel
from pydantic import ConfigDict


class UserResponse(
    BaseModel
):
    id: int
    github_id: int
    username: str
    email: str | None
    avatar_url: str | None

    model_config = ConfigDict(
        from_attributes=True
    )
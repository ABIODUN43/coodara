from typing import Protocol
from domain.model import Order

class OrderRepositoryPort(Protocol):
    def save(self, order: Order) -> None:
        ...

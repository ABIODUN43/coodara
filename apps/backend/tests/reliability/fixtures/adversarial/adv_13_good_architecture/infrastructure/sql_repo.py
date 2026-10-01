from domain.ports import OrderRepositoryPort
from domain.model import Order

class SqlOrderRepository(OrderRepositoryPort):
    def save(self, order: Order) -> None:
        pass

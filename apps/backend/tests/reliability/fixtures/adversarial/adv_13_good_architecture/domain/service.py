from domain.ports import OrderRepositoryPort
from domain.model import Order

class OrderService:
    def __init__(self, repo: OrderRepositoryPort):
        self.repo = repo

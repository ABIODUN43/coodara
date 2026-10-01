from domain.service import OrderService

class OrderController:
    def __init__(self, svc: OrderService):
        self.svc = svc

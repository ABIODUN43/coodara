from typing import Protocol

class PaymentGateway(Protocol):
    def process_payment(self, amount: int) -> bool:
        ...

from billing.gateway import PaymentGateway

class StripeGateway(PaymentGateway):
    def process_payment(self, amount: int) -> bool:
        return True

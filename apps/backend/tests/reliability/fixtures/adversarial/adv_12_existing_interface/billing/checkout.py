from billing.gateway import PaymentGateway

class CheckoutService:
    def __init__(self, gw: PaymentGateway):
        self.gw = gw

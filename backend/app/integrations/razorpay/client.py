# Razorpay Client Stub (Integrated in Phase 6)
# See prd.md §6 and architecture.md §7

class RazorpayClient:
    def __init__(self, key_id: str = "", key_secret: str = ""):
        self.key_id = key_id
        self.key_secret = key_secret

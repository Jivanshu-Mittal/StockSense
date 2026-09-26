from locust import HttpUser, task, between
import random


class StockSenseUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        email = f"user_{random.randint(1, 999999)}@test.com"
        pw = "password123"

        self.client.post("/auth/signup", json={"email": email, "password": pw})
        resp = self.client.post("/auth/login", data={"username": email, "password": pw})

        if resp.ok:
            self.token = resp.json().get("access_token")

    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(3)
    def browse_products(self):
        self.client.get("/products/", headers=self._headers())

    @task(1)
    def browse_movements(self):
        self.client.get("/operations/movements", headers=self._headers())

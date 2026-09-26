from locust import HttpUser, task, between
import random
import os
import json


class InventoryManagerUser(HttpUser):
    """Simulates an inventory manager user."""
    wait_time = between(2, 5)
    token = None
    email = "admin@stocksense.com"
    password = None  # Will be set from environment variable ADMIN_PASSWORD

    def on_start(self):
        """Log in as admin user."""
        self.password = os.environ.get("ADMIN_PASSWORD")
        if not self.password:
            # Fallback to a default for testing; in production, should be set via env
            self.password = "admin"

        # Login
        resp = self.client.post(
            "/auth/login",
            data={"username": self.email, "password": self.password},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if resp.ok:
            self.token = resp.json().get("access_token")
        else:
            # If login fails, maybe the user doesn't exist? We could try to signup but role won't be correct.
            # For load testing, we assume the admin user exists from seeding.
            raise Exception(f"Failed to login as admin: {resp.status_code} {resp.text}")

    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(3)
    def browse_products(self):
        self.client.get("/products/", headers=self._headers())

    @task(2)
    def browse_movements(self):
        self.client.get("/operations/movements", headers=self._headers())

    @task(1)
    def get_dashboard_kpis(self):
        self.client.get("/dashboard/kpis", headers=self._headers())

    @task(1)
    def create_product(self):
        """Create a new product with random initial stock."""
        payload = {
            "name": f"Product {random.randint(1000, 9999)}",
            "sku": f"SKU-{random.randint(10000, 99999)}",
            "category": random.choice(["Electronics", "Clothing", "Food", "Hardware"]),
            "unit_of_measure": random.choice(["Units", "Kg", "Liters", "Boxes"]),
            "initial_stock": random.randint(10, 100)
        }
        self.client.post("/products/", json=payload, headers=self._headers())

    @task(1)
    def create_receipt(self):
        """Create a receipt for a random product."""
        # First, get a list of products to choose from
        resp = self.client.get("/products/", headers=self._headers())
        if not resp.ok:
            return
        products = resp.json()
        if not products:
            return
        product = random.choice(products)

        payload = {
            "product_id": product["id"],
            "quantity": random.randint(5, 50),
            "partner_name": f"Vendor {random.randint(1, 20)}",
            "contact_email": f"vendor{random.randint(1,20)}@example.com",
            "reference_code": f"REF{random.randint(1000,9999)}"
        }
        self.client.post("/operations/receipts", json=payload, headers=self._headers())

    @task(1)
    def create_transfer(self):
        """Create a transfer between two locations."""
        # We need at least two locations. We'll assume the seeded locations exist.
        # Get locations (we don't have an endpoint for locations, so we'll use hardcoded IDs from seed)
        # From seed.py: Main Warehouse (id=1), Vendors (id=2, virtual), Customers (id=3, virtual)
        # For transfer, we need physical locations. Only Main Warehouse is physical.
        # We'll need to create a second physical location? Not in seed.
        # For simplicity, we'll skip transfer if we don't have two physical locations.
        # Alternatively, we can create a location via API? There's no endpoint.
        # We'll assume there are at least two physical locations with IDs 1 and 4? Not reliable.
        # Let's instead get a list of products and use the same location for source and dest?
        # But transfer requires different locations.
        # We'll skip this task for now and rely on the fact that we have at least two locations from seed?
        # Actually seed only creates one physical location.
        # We'll create a transfer only if we have at least two locations; we'll try to get locations from the product's stock quants?
        # Too complex for load testing. We'll skip transfer and focus on other operations.
        pass

    @task(1)
    def create_adjustment(self):
        """Create an adjustment for a random product."""
        # Get a product
        resp = self.client.get("/products/", headers=self._headers())
        if not resp.ok:
            return
        products = resp.json()
        if not products:
            return
        product = random.choice(products)

        # Determine if we want to increase or decrease stock
        increase = random.choice([True, False])
        quantity = random.randint(1, 20)
        if not increase:
            quantity = -quantity  # negative for decrease

        payload = {
            "product_id": product["id"],
            "quantity": quantity,
            # We'll not specify location for general adjustment (allowed by schema)
            # source_location_id and dest_location_id will be None
        }
        self.client.post("/operations/adjustments", json=payload, headers=self._headers())


class WarehouseStaffUser(HttpUser):
    """Simulates a warehouse staff user."""
    wait_time = between(1, 4)
    token = None
    email = None
    password = "password123"

    def on_start(self):
        """Sign up a new user and log in."""
        # Generate a unique email
        self.email = f"warehouse_staff_{random.randint(1, 999999)}@test.com"

        # Sign up
        resp = self.client.post(
            "/auth/signup",
            json={"email": self.email, "password": self.password}
        )
        if not resp.ok:
            # If signup fails (maybe email already exists), we try to login directly
            pass

        # Login
        resp = self.client.post(
            "/auth/login",
            data={"username": self.email, "password": self.password},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if resp.ok:
            self.token = resp.json().get("access_token")
        else:
            raise Exception(f"Failed to login as warehouse staff: {resp.status_code} {resp.text}")

    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(3)
    def browse_products(self):
        self.client.get("/products/", headers=self._headers())

    @task(2)
    def browse_movements(self):
        self.client.get("/operations/movements", headers=self._headers())

    @task(1)
    def get_dashboard_kpis(self):
        self.client.get("/dashboard/kpis", headers=self._headers())

    @task(2)
    def create_delivery_and_process(self):
        """Create a delivery and advance it through the workflow."""
        # Get a product
        resp = self.client.get("/products/", headers=self._headers())
        if not resp.ok:
            return
        products = resp.json()
        if not products:
            return
        product = random.choice(products)

        # Step 1: Create delivery (DRAFT)
        payload = {
            "product_id": product["id"],
            "quantity": random.randint(5, 30),
            "partner_name": f"Customer {random.randint(1, 50)}",
            "contact_email": f"customer{random.randint(1,50)}@example.com",
            "reference_code": f"DEL{random.randint(1000,9999)}"
        }
        resp = self.client.post("/operations/deliveries", json=payload, headers=self._headers())
        if not resp.ok:
            return
        delivery = resp.json()
        delivery_id = delivery["id"]

        # Step 2: Transition to WAITING (optional, we might skip)
        if random.choice([True, False]):
            resp = self.client.post(f"/operations/deliveries/{delivery_id}/waiting", headers=self._headers())
            if not resp.ok:
                return

        # Step 3: Transition to READY (optional)
        if random.choice([True, False]):
            resp = self.client.post(f"/operations/deliveries/{delivery_id}/ready", headers=self._headers())
            if not resp.ok:
                return

        # Step 4: Transition to DONE (or sometimes CANCELED)
        if random.choice([True, False]):
            # Cancel instead of completing
            resp = self.client.post(f"/operations/deliveries/{delivery_id}/canceled", headers=self._headers())
        else:
            resp = self.client.post(f"/operations/deliveries/{delivery_id}/done", headers=self._headers())


# For running multiple user types, we can specify weights if needed.
# By default, each user class is weighted equally.
# We can adjust by setting a weight attribute.
# Let's set inventory manager to weight 1 and warehouse staff to weight 2 to have more warehouse staff.
InventoryManagerUser.weight = 1
WarehouseStaffUser.weight = 2
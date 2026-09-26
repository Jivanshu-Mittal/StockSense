from locust import HttpUser, task, between
import random
import os
import json


class InventoryManagerUser(HttpUser):
    """Simulates an inventory manager user responsible for stock control."""
    wait_time = between(3, 6)
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

    @task(5)
    def browse_products(self):
        """Browse products list."""
        self.client.get("/products/", headers=self._headers())

    @task(4)
    def browse_movements_with_filters(self):
        """Browse movements with various filters."""
        # Randomly apply filters
        params = {}
        if random.choice([True, False]):
            params["document_type"] = random.choice(["receipt", "delivery", "internal", "adjustment"])
        if random.choice([True, False]):
            params["status"] = random.choice(["draft", "waiting", "ready", "done", "canceled"])
        if random.choice([True, False]):
            params["category"] = random.choice(["Electronics", "Clothing", "Food", "Hardware"])
        if random.choice([True, False]):
            params["limit"] = random.choice([10, 25, 50])

        self.client.get("/operations/movements", params=params, headers=self._headers())

    @task(3)
    def get_dashboard_kpis(self):
        """Get dashboard KPIs - frequently accessed by managers."""
        self.client.get("/dashboard/kpis", headers=self._headers())

    @task(2)
    def get_locations(self):
        """Browse warehouse locations."""
        self.client.get("/locations/", headers=self._headers())

    @task(2)
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

    @task(3)
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

        # Get a physical destination location (not virtual)
        locations_resp = self.client.get("/locations/", headers=self._headers())
        if not locations_resp.ok:
            return
        locations = [loc for loc in locations_resp.json() if not loc["is_virtual"]]
        if not locations:
            return
        dest_location = random.choice(locations)

        payload = {
            "product_id": product["id"],
            "quantity": random.randint(5, 50),
            "partner_name": f"Vendor {random.randint(1, 20)}",
            "contact_email": f"vendor{random.randint(1,20)}@example.com",
            "reference_code": f"REF{random.randint(1000,9999)}",
            "dest_location_id": dest_location["id"]
        }
        self.client.post("/operations/receipts", json=payload, headers=self._headers())

    @task(2)
    def create_transfer(self):
        """Create a transfer between two physical locations."""
        # Get products
        products_resp = self.client.get("/products/", headers=self._headers())
        if not products_resp.ok:
            return
        products = products_resp.json()
        if not products:
            return
        product = random.choice(products)

        # Get two different physical locations
        locations_resp = self.client.get("/locations/", headers=self._headers())
        if not locations_resp.ok:
            return
        physical_locations = [loc for loc in locations_resp.json() if not loc["is_virtual"]]
        if len(physical_locations) < 2:
            return
        source_loc, dest_loc = random.sample(physical_locations, 2)

        payload = {
            "product_id": product["id"],
            "quantity": random.randint(1, 30),
            "source_location_id": source_loc["id"],
            "dest_location_id": dest_loc["id"]
        }
        self.client.post("/operations/transfers", json=payload, headers=self._headers())

    @task(2)
    def create_adjustment(self):
        """Create an adjustment for a random product."""
        # Get a product
        products_resp = self.client.get("/products/", headers=self._headers())
        if not products_resp.ok:
            return
        products = products_resp.json()
        if not products:
            return
        product = random.choice(products)

        # Get a physical location
        locations_resp = self.client.get("/locations/", headers=self._headers())
        if not locations_resp.ok:
            return
        physical_locations = [loc for loc in locations_resp.json() if not loc["is_virtual"]]
        if not physical_locations:
            return
        location = random.choice(physical_locations)

        # Determine if we want to increase or decrease stock
        increase = random.choice([True, False])
        quantity = random.randint(1, 20)
        if not increase:
            quantity = -quantity  # negative for decrease

        payload = {
            "product_id": product["id"],
            "quantity": quantity,
            # For adjustments, we set either source or destination location based on quantity sign
            "source_location_id": location["id"] if quantity < 0 else None,
            "dest_location_id": location["id"] if quantity > 0 else None
        }
        self.client.post("/operations/adjustments", json=payload, headers=self._headers())

    @task(1)
    def validate_receipt(self):
        """Validate a existing receipt in DONE status."""
        # Get recent receipts
        resp = self.client.get("/operations/movements?document_type=receipt&status=done&limit=10", headers=self._headers())
        if not resp.ok:
            return
        receipts = resp.json()
        if not receipts:
            return
        receipt = random.choice(receipts)

        self.client.post(f"/operations/receipts/{receipt['id']}/validate", headers=self._headers())


class WarehouseStaffUser(HttpUser):
    """Simulates a warehouse staff user focused on picking, packing, and shipping."""
    wait_time = between(2, 5)
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
        # Ignore signup result - if user exists, login will work; if not, we've created them

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

    @task(4)
    def browse_products(self):
        """Browse products list."""
        self.client.get("/products/", headers=self._headers())

    @task(3)
    def browse_movements(self):
        """Browse recent movements."""
        self.client.get("/operations/movements?limit=20", headers=self._headers())

    @task(3)
    def get_dashboard_kpis(self):
        """Get dashboard KPIs."""
        self.client.get("/dashboard/kpis", headers=self._headers())

    @task(4)
    def create_delivery_and_process(self):
        """Create a delivery and advance it through the workflow."""
        # Get a product
        products_resp = self.client.get("/products/", headers=self._headers())
        if not products_resp.ok:
            return
        products = products_resp.json()
        if not products:
            return
        product = random.choice(products)

        # Get a physical source location
        locations_resp = self.client.get("/locations/", headers=self._headers())
        if not locations_resp.ok:
            return
        physical_locations = [loc for loc in locations_resp.json() if not loc["is_virtual"]]
        if not physical_locations:
            return
        source_location = random.choice(physical_locations)

        # Step 1: Create delivery (DRAFT)
        payload = {
            "product_id": product["id"],
            "quantity": random.randint(5, 30),
            "partner_name": f"Customer {random.randint(1, 50)}",
            "contact_email": f"customer{random.randint(1,50)}@example.com",
            "reference_code": f"DEL{random.randint(1000,9999)}",
            "source_location_id": source_location["id"]
        }
        resp = self.client.post("/operations/deliveries", json=payload, headers=self._headers())
        if not resp.ok:
            return
        delivery = resp.json()
        delivery_id = delivery["id"]

        # Step 2: Transition to WAITING (sometimes)
        if random.choice([True, False]):
            resp = self.client.post(f"/operations/deliveries/{delivery_id}/waiting", headers=self._headers())
            if not resp.ok:
                return

        # Step 3: Transition to READY (sometimes)
        if random.choice([True, False]):
            resp = self.client.post(f"/operations/deliveries/{delivery_id}/ready", headers=self._headers())
            if not resp.ok:
                return

        # Step 4: Transition to DONE or CANCELED
        if random.choice([True, False]):
            # Cancel instead of completing (10% chance)
            if random.random() < 0.1:
                resp = self.client.post(f"/operations/deliveries/{delivery_id}/canceled", headers=self._headers())
            else:
                resp = self.client.post(f"/operations/deliveries/{delivery_id}/done", headers=self._headers())
        else:
            # Stay in current state (DRAFT, WAITING, or READY)
            pass

    @task(2)
    def get_pending_dashboard_counts(self):
        """Specifically check pending operations from dashboard perspective."""
        # This hits the same endpoint but we're focusing on the pending counts
        self.client.get("/dashboard/kpis", headers=self._headers())


class ReportingUser(HttpUser):
    """Simulates a user who primarily checks reports and analytics."""
    wait_time = between(5, 10)
    token = None
    email = "reporter@stocksense.com"
    password = None

    def on_start(self):
        """Log in as reporter user."""
        self.password = os.environ.get("REPORTER_PASSWORD", "reporter123")
        self.email = "reporter@stocksense.com"

        # Login
        resp = self.client.post(
            "/auth/login",
            data={"username": self.email, "password": self.password},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if resp.ok:
            self.token = resp.json().get("access_token")
        else:
            # For load testing, we'll fall back to using admin credentials if reporter doesn't exist
            self.email = "admin@stocksense.com"
            self.password = os.environ.get("ADMIN_PASSWORD", "admin")
            resp = self.client.post(
                "/auth/login",
                data={"username": self.email, "password": self.password},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if resp.ok:
                self.token = resp.json().get("access_token")
            else:
                raise Exception(f"Failed to login: {resp.status_code} {resp.text}")

    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(10)
    def get_dashboard_kpis(self):
        """Frequently check dashboard KPIs."""
        self.client.get("/dashboard/kpis", headers=self._headers())

    @task(5)
    def browse_movements_detailed(self):
        """Browse movements with detailed filtering for reports."""
        # Complex filtering for report generation
        params = {
            "limit": 100,
            "offset": 0
        }

        # Add random date ranges for reports
        if random.choice([True, False]):
            params["start_date"] = "2026-01-01"
        if random.choice([True, False]):
            params["end_date"] = "2026-12-31"

        # Add random document types
        if random.choice([True, False]):
            params["document_type"] = random.choice(["receipt", "delivery", "internal", "adjustment"])

        self.client.get("/operations/movements", params=params, headers=self._headers())

    @task(3)
    def export_movements_csv(self):
        """Simulate exporting movements data (using limit to get large dataset)."""
        self.client.get("/operations/movements?limit=500", headers=self._headers())

    @task(2)
    def analyze_product_categories(self):
        """Analyze movements by product category."""
        params = {
            "limit": 50,
            "category": random.choice(["Electronics", "Clothing", "Food", "Hardware"])
        }
        self.client.get("/operations/movements", params=params, headers=self._headers())


# User class weights for realistic distribution
# Inventory managers: 30% - responsible for stock control
# Warehouse staff: 50% - largest group doing day-to-day operations
# Reporting users: 20% - checking analytics and reports
InventoryManagerUser.weight = 3
WarehouseStaffUser.weight = 5
ReportingUser.weight = 2
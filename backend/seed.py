import logging
import os
import secrets

from faker import Faker

import models
from core.security import get_password_hash
from database import SessionLocal

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

fake = Faker()


def seed_db():
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            log.info("already seeded, skipping")
            return

        log.info("creating admin + 99 test users...")

        # Get admin password from environment or generate secure one
        admin_password = os.environ.get("ADMIN_PASSWORD")
        if not admin_password:
            # Generate a secure random password for admin
            admin_password = secrets.token_urlsafe(16)
            log.warning(
                "ADMIN_PASSWORD not set in environment. "
                f"Generated secure admin password: {admin_password}"
            )

        # Create admin user as inventory manager
        db.add(models.User(
            email="admin@stocksense.com",
            hashed_password=get_password_hash(admin_password),
            role=models.UserRole.INVENTORY_MANAGER
        ))

        # Create test users with random passwords
        users = []
        for i in range(99):
            # Generate random password for each test user
            random_password = secrets.token_urlsafe(16)
            users.append(models.User(
                email=fake.unique.email(),
                hashed_password=get_password_hash(random_password),
                role=models.UserRole.WAREHOUSE_STAFF
            ))

        db.bulk_save_objects(users)
        db.commit()
        log.info("done. 100 users created")

        # default locations every warehouse needs
        db.add_all([
            models.WarehouseLocation(name="Main Warehouse"),
            models.WarehouseLocation(name="Vendors", is_virtual=True),
            models.WarehouseLocation(name="Customers", is_virtual=True),
        ])
        db.commit()
        log.info("locations added")

    except Exception as e:
        log.error(f"seed failed: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()

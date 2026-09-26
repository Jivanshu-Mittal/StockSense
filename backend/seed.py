import logging

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

        db.add(models.User(
            email="admin@stocksense.com",
            hashed_password=get_password_hash("admin123"),
        ))

        users = [
            models.User(
                email=fake.unique.email(),
                hashed_password=get_password_hash("password123"),
            )
            for _ in range(99)
        ]
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

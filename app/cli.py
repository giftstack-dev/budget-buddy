"""Management CLI commands for Budget Buddy (create-db, seed-demo, cleanup-demo)."""

from __future__ import annotations

import argparse

from app.database import Base, SessionLocal, engine
from app.services.demo_service import cleanup_expired_demo_users, create_demo_user


def main() -> None:
    parser = argparse.ArgumentParser(description="Budget Buddy management CLI")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("create-db", help="Create all database tables directly")
    sub.add_parser("seed-demo", help="Create a fresh demo user with 6 weeks of data")
    sub.add_parser("cleanup-demo", help="Remove expired temporary demo accounts")

    args = parser.parse_args()

    if args.command == "create-db":
        # Import models so Base.metadata registers every table before create_all.
        import app.models  # noqa: F401

        Base.metadata.create_all(bind=engine)
        print("Database tables ready.")
    elif args.command == "seed-demo":
        with SessionLocal() as db:
            demo_user = create_demo_user(db)
            print(f"Seeded demo user id={demo_user.id}.")
    elif args.command == "cleanup-demo":
        with SessionLocal() as db:
            removed = cleanup_expired_demo_users(db)
            print(f"Removed {removed} expired demo account(s).")


if __name__ == "__main__":
    main()

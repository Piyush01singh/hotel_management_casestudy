"""
StayWise AI — Database Schema Initialization and Seeder
Populates SQLite database with hotels, room categories, snapshots, and actuals.
"""

import os
import json
import datetime
import pandas as pd
from backend.app.database.session import engine, Base, SessionLocal
from backend.app.models.entities import Hotel, RoomCategory, BookingSnapshot, OccupancyActual, ModelMetric
from backend.app.core.config import settings

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Hotel).first():
            print("Database already contains records. Refreshing seed data...")
            db.query(BookingSnapshot).delete()
            db.query(OccupancyActual).delete()
            db.query(RoomCategory).delete()
            db.query(Hotel).delete()
            db.commit()

        # 1. Seed Hotel & Categories
        config_path = os.path.join(settings.ML_DATA_DIR, "processed", "hotel_config.json")
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)

        hotel = Hotel(
            hotel_id=cfg["hotel_id"],
            name=cfg["name"],
            total_rooms=cfg["total_rooms"],
            city=cfg["city"]
        )
        db.add(hotel)
        db.flush()

        for cat_code, cinfo in cfg["categories"].items():
            rc = RoomCategory(
                category_id=cat_code,
                hotel_id=hotel.hotel_id,
                name=cinfo["name"],
                capacity=cinfo["capacity"],
                base_rate=cinfo["base_rate"],
                clean_minutes_stayover=cinfo.get("clean_stay", 15),
                clean_minutes_departure=cinfo.get("clean_dep", 30)
            )
            db.add(rc)

        db.commit()
        print(f"Seeded hotel {hotel.name} and {len(cfg['categories'])} room categories.")

        # 2. Seed Occupancy Actuals
        actuals_path = os.path.join(settings.ML_DATA_DIR, "processed", "occupancy_actuals.csv")
        actuals_df = pd.read_csv(actuals_path)
        actuals_objects = []
        for _, row in actuals_df.iterrows():
            actuals_objects.append(OccupancyActual(
                stay_date=datetime.date.fromisoformat(row["stay_date"]),
                room_category=row["room_category"],
                occupied_rooms=int(row["occupied_rooms"]),
                room_capacity=int(row["room_capacity"]),
                occupancy_rate=float(row["occupancy_rate"]),
                day_of_week=int(row["day_of_week"]),
                is_weekend=bool(row["is_weekend"]),
                month=int(row["month"]),
                event_impact_score=float(row.get("event_impact_score", 1.0))
            ))
        db.bulk_save_objects(actuals_objects)
        db.commit()
        print(f"Seeded {len(actuals_objects)} occupancy actual records.")

        # 3. Seed Snapshots (representative recent 120 days for ultra-fast queries)
        snapshots_path = os.path.join(settings.ML_DATA_DIR, "synthetic", "booking_snapshots.csv")
        snapshots_df = pd.read_csv(snapshots_path)
        # Seed all snapshots
        snap_objects = []
        for _, row in snapshots_df.iterrows():
            snap_objects.append(BookingSnapshot(
                snapshot_date=datetime.date.fromisoformat(row["snapshot_date"]),
                stay_date=datetime.date.fromisoformat(row["stay_date"]),
                room_category=row["room_category"],
                lead_time=int(row["lead_time"]),
                otb_rooms=int(row["otb_rooms"]),
                otb_cancellations=int(row["otb_cancellations"]),
                pickup_1d=int(row["pickup_1d"]),
                pickup_7d=int(row["pickup_7d"]),
                room_capacity=int(row["room_capacity"])
            ))
        db.bulk_save_objects(snap_objects)
        db.commit()
        print(f"Seeded {len(snap_objects)} booking snapshot records.")

        # 4. Seed Model Metrics
        metrics_path = os.path.join(settings.ML_ARTIFACTS_DIR, "model_metrics.json")
        if os.path.exists(metrics_path):
            with open(metrics_path, "r", encoding="utf-8") as f:
                m_data = json.load(f)
            t_eval = datetime.datetime.fromisoformat(m_data["trained_timestamp"])
            
            metric_objects = []
            for m_name, vals in m_data["overall_models"].items():
                metric_objects.append(ModelMetric(
                    model_name=m_name,
                    horizon_window="overall",
                    room_category="all",
                    mae=vals["mae"],
                    rmse=vals["rmse"],
                    wape=vals["wape"],
                    evaluated_at=t_eval
                ))
            db.bulk_save_objects(metric_objects)
            db.commit()
            print("Seeded model benchmark metrics.")

        print("Database seed complete!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class Hotel(Base):
    __tablename__ = "hotels"

    hotel_id = Column(String(32), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    total_rooms = Column(Integer, nullable=False)
    city = Column(String(64), nullable=False)

    categories = relationship("RoomCategory", back_populates="hotel")


class RoomCategory(Base):
    __tablename__ = "room_categories"

    category_id = Column(String(32), primary_key=True, index=True)
    hotel_id = Column(String(32), ForeignKey("hotels.hotel_id"), nullable=False)
    name = Column(String(64), nullable=False)
    capacity = Column(Integer, nullable=False)
    base_rate = Column(Float, nullable=False)
    clean_minutes_stayover = Column(Integer, default=15)
    clean_minutes_departure = Column(Integer, default=30)

    hotel = relationship("Hotel", back_populates="categories")


class BookingSnapshot(Base):
    __tablename__ = "booking_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_date = Column(Date, index=True, nullable=False)
    stay_date = Column(Date, index=True, nullable=False)
    room_category = Column(String(32), nullable=False)
    lead_time = Column(Integer, nullable=False)
    otb_rooms = Column(Integer, nullable=False)
    otb_cancellations = Column(Integer, nullable=False)
    pickup_1d = Column(Integer, nullable=False)
    pickup_7d = Column(Integer, nullable=False)
    room_capacity = Column(Integer, nullable=False)


class OccupancyActual(Base):
    __tablename__ = "occupancy_actuals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    stay_date = Column(Date, index=True, nullable=False)
    room_category = Column(String(32), nullable=False)
    occupied_rooms = Column(Integer, nullable=False)
    room_capacity = Column(Integer, nullable=False)
    occupancy_rate = Column(Float, nullable=False)
    day_of_week = Column(Integer, nullable=False)
    is_weekend = Column(Boolean, nullable=False)
    month = Column(Integer, nullable=False)
    event_impact_score = Column(Float, default=1.0)


class ModelMetric(Base):
    __tablename__ = "model_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(64), nullable=False)
    horizon_window = Column(String(32), nullable=False)
    room_category = Column(String(32), nullable=False)
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    wape = Column(Float, nullable=False)
    evaluated_at = Column(DateTime, nullable=False)

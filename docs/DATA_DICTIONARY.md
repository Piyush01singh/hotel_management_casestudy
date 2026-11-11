# Data Dictionary: StayWise AI

This document defines the data schemas, primary entities, temporal snapshots, and feature definitions used across the **StayWise AI** pipeline.

---

## 1. Relational Entities (Database)

### 1.1 `hotels`
| Column Name | Type | Constraints | Description |
|---|---|---|---|
| `hotel_id` | VARCHAR(32) | PRIMARY KEY | Unique identifier for hotel property (e.g., `HOTEL_01`). |
| `name` | VARCHAR(128) | NOT NULL | Hotel display name (e.g., "Grand Azure Resort & Spa"). |
| `total_rooms` | INTEGER | NOT NULL, > 0 | Total physical room capacity across all room categories. |
| `city` | VARCHAR(64) | NOT NULL | Property location. |

### 1.2 `room_categories`
| Column Name | Type | Constraints | Description |
|---|---|---|---|
| `category_id` | VARCHAR(32) | PRIMARY KEY | Unique code: `STD` (Standard), `DLX` (Deluxe), `SUI` (Suite), `EXE` (Executive). |
| `name` | VARCHAR(64) | NOT NULL | Category name. |
| `capacity` | INTEGER | NOT NULL, > 0 | Physical room count dedicated to this category. |
| `base_rate` | FLOAT | NOT NULL, > 0 | Baseline rack rate in USD. |
| `clean_minutes_stayover` | INTEGER | NOT NULL | Typical minutes required for mid-stay housekeeping clean. |
| `clean_minutes_departure`| INTEGER | NOT NULL | Typical minutes required for full turnover cleaning upon departure. |

### 1.3 `booking_events`
Records raw historical booking event transactions (deterministic generation matching real PMS logs):
| Column Name | Type | Description |
|---|---|---|
| `booking_id` | VARCHAR(64) | PRIMARY KEY. Unique reservation reference. |
| `hotel_id` | VARCHAR(32) | Foreign Key -> `hotels.hotel_id`. |
| `room_category` | VARCHAR(32) | Foreign Key -> `room_categories.category_id`. |
| `booking_timestamp` | DATETIME | Timestamp when reservation was created. |
| `stay_date` | DATE | Night of the guest stay. |
| `lead_time_days` | INTEGER | Number of days between booking creation and stay date. |
| `status` | VARCHAR(16) | Reservation status as of today: `confirmed`, `cancelled`, `checked_in`, `checked_out`. |
| `cancellation_timestamp` | DATETIME | Timestamp if cancelled (NULL if stayed). |
| `num_guests` | INTEGER | Guest count (adults + children). |
| `adr` | FLOAT | Average Daily Rate booked. |

### 1.4 `booking_snapshots` (Point-in-Time OTB Table)
Pre-aggregated daily snapshots at 23:59:59 cutoff date:
| Column Name | Type | Description |
|---|---|---|
| `snapshot_date` | DATE | The cutoff timestamp date $t_0$. |
| `stay_date` | DATE | The future stay date $d \ge t_0 + 1$. |
| `room_category` | VARCHAR(32) | Room category code. |
| `lead_time` | INTEGER | $d - t_0$ (days to arrival). |
| `otb_confirmed` | INTEGER | Count of active non-cancelled bookings made $\le t_0$ with stay date $d$. |
| `otb_cancelled` | INTEGER | Count of cancellations received $\le t_0$ for stay date $d$. |
| `pickup_1d` | INTEGER | Net new bookings created on day $t_0$ for date $d$. |
| `pickup_7d` | INTEGER | Net new bookings created in $[t_0 - 6, t_0]$ for date $d$. |

### 1.5 `occupancy_actuals` (Ground Truth)
| Column Name | Type | Description |
|---|---|---|
| `stay_date` | DATE | Stay night date. |
| `room_category` | VARCHAR(32) | Room category code. |
| `occupied_rooms`| INTEGER | Realized ground-truth occupied rooms ($0 \le y \le \text{Capacity}$). |
| `occupancy_rate`| FLOAT | `occupied_rooms / capacity * 100%`. |
| `day_of_week` | INTEGER | 0=Monday through 6=Sunday. |
| `is_weekend` | BOOLEAN | 1 if Friday or Saturday night, else 0. |

---

## 2. Machine Learning Feature Matrix

| Feature Name | Type | Source | Availability Cutoff | Formula / Logic |
|---|---|---|---|---|
| `lead_time` | INTEGER | Snapshot | Known at $t_0$ | `stay_date - snapshot_date` |
| `day_of_week` | INTEGER (0-6) | Calendar | Known at $t_0$ | `stay_date.weekday()` |
| `is_weekend` | BOOLEAN | Calendar | Known at $t_0$ | 1 if day in (4, 5) else 0 |
| `month` | INTEGER (1-12) | Calendar | Known at $t_0$ | `stay_date.month` |
| `is_holiday` | BOOLEAN | Calendar | Known at $t_0$ | National/regional holiday match |
| `event_impact_score` | FLOAT | Calendar | Known at $t_0$ | Local convention or festival demand uplift multiplier |
| `otb_rooms` | INTEGER | Snapshot | As of $t_0$ 23:59:59 | Bookings confirmed $\le t_0$ without cancellation $\le t_0$ |
| `otb_cancellations` | INTEGER | Snapshot | As of $t_0$ 23:59:59 | Cancellations processed $\le t_0$ |
| `pickup_1d` | INTEGER | Snapshot | As of $t_0$ 23:59:59 | $\text{otb}(t_0) - \text{otb}(t_0 - 1)$ |
| `pickup_7d` | INTEGER | Snapshot | As of $t_0$ 23:59:59 | $\text{otb}(t_0) - \text{otb}(t_0 - 7)$ |
| `hist_lag_7d` | INTEGER | Actuals | As of $t_0$ 23:59:59 | Realized occupancy for category on $t_0 - 6$ (stay date $d - 7$) |
| `hist_lag_14d` | INTEGER | Actuals | As of $t_0$ 23:59:59 | Realized occupancy for category on $t_0 - 13$ |
| `hist_rolling_mean_7d` | FLOAT | Actuals | As of $t_0$ 23:59:59 | Mean daily occupancy for category in $[t_0 - 6, t_0]$ |
| `hist_rolling_mean_28d` | FLOAT | Actuals | As of $t_0$ 23:59:59 | Mean daily occupancy for category in $[t_0 - 27, t_0]$ |
| `room_capacity` | INTEGER | Metadata | Fixed physical constant | Total rooms in category |
| `category_STD` | BINARY | One-Hot | Fixed | 1 if Standard, else 0 |
| `category_DLX` | BINARY | One-Hot | Fixed | 1 if Deluxe, else 0 |
| `category_SUI` | BINARY | One-Hot | Fixed | 1 if Suite, else 0 |
| `category_EXE` | BINARY | One-Hot | Fixed | 1 if Executive, else 0 |
| **`target_occupied_rooms`** | INTEGER | Target ($y$) | Evaluated post-stay | Ground truth rooms occupied on `stay_date` |

from datetime import UTC, datetime

from sqlalchemy import CHAR, VARCHAR, Column, DateTime, Float, Integer, Null, Text, FetchedValue
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import column_property, declarative_base, mapped_column

Base = declarative_base()


def _fmt_dt(dt):
    return dt.strftime("%Y-%m-%d %H:%M") if dt else "<None>"


def _fmt_price(p):
    return f"${p:,.0f}" if p is not None else "—"


def _fmt_int(i):
    return str(i) if i is not None else "—"


class AssetJsonFeed(Base):
    __tablename__ = "asset_json_feed"
    __table_args__ = {"schema": "baxus"}

    asset_json_idx = Column(Integer, primary_key=True, autoincrement=True)
    asset_idx = Column(Integer, primary_key=False, nullable=False)
    asset_json = Column(JSONB, nullable=True)
    metadata_json = Column(JSONB, nullable=True)
    added_date = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)

    def __str__(self):
        added_str = _fmt_dt(self.added_date) if self.added_date else "<None>"

        if isinstance(self.metadata_json, Null):
            meta_json_str = "<null>"
        elif self.metadata_json is None:
            meta_json_str = "<None>"
        else:
            meta_json_str = str(len(self.metadata_json))

        if isinstance(self.asset_json, Null):
            asset_json_str = "<null>"
        elif self.asset_json is None:
            asset_json_str = "<None>"
        else:
            asset_json_str = str(len(self.asset_json))

        lines = [
            "<AssetJsonFeed>",
            f"  asset_json_idx    : {self.asset_json_idx or '<None>'}",
            f"  asset_idx         : {self.asset_idx or '<None>'}",
            f"  asset_json_len    : {asset_json_str}",
            f"  metadata_json_len : {meta_json_str}",
            f"  added_date        : {added_str}",
            "</AssetJsonFeed>",
        ]
        return "\n".join(lines)

    @property
    def baxus_idx(self) -> float | None:
        """Transient value that lives only in the Python object."""
        return getattr(self, "_baxus_idx", None)

    @baxus_idx.setter
    def baxus_idx(self, value: int | None):
        if value is None:
            # Optional: clean up the attribute so it doesn't linger
            self.__dict__.pop("_baxus_idx", None)
        else:
            self._baxus_idx = value


class AssetDetails(Base):
    __tablename__ = "assets"
    __table_args__ = {"schema": "baxus"}

    asset_idx = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(CHAR(44), primary_key=False, nullable=False, index=True)
    baxus_idx = Column(Integer, primary_key=False, nullable=True)
    name = Column(Text, nullable=False)
    price = Column(Float, nullable=True)
    bottled_year = Column(Integer, nullable=True)
    age = Column(Integer, nullable=True)
    is_listed = Column(Integer, nullable=True)
    listed_date = Column(DateTime, nullable=True)
    asset_json = Column(JSONB, nullable=False)
    metadata_json = Column(JSONB, nullable=True)
    added_date = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)
    last_updated = mapped_column(DateTime, server_default=FetchedValue())

    # last_updated = column_property(Column("last_updated", DateTime))

    def __str__(self):
        url = f"https://baxus.co/asset/{self.asset_id}" if self.asset_id else "—"

        name_display = self.name
        if len(self.name) > 60:
            name_display = self.name[:57] + "..."

        age_str = f" age={self.age}" if self.age else "age=<None>"
        bottled_str = f"bottledyear={self.bottled_year}" if self.bottled_year else "bottledyear=<None>"
        price_str = _fmt_price(self.price) if self.price is not None else "<None>"
        listed_str = _fmt_dt(self.listed_date)
        is_listed_str = "true" if self.is_listed else "false"
        json_len = len(self.asset_json) if self.asset_json else "<None>"

        if isinstance(self.metadata_json, Null):
            meta_json_str = "<null>"
        elif self.metadata_json is None:
            meta_json_str = "<None>"
        else:
            meta_json_str = str(len(self.metadata_json))

        lines = [
            "<Asset>",
            f"  asset_idx   : {self.asset_idx or '<None>'}",
            f"  asset_id    : {self.asset_id or '<None>'}",
            f"  baxus_idx   : {self.baxus_idx or '<None>'}",
            f"  name        : {name_display}",
            f"  details     : {bottled_str} {age_str}",
            f"  price       : {price_str}",
            f"  listed      : {listed_str}",
            f"  is listed   : {is_listed_str}",
            f"  json_len    : {json_len}",
            f"  metajson_len: {meta_json_str}",
            f"  url         : {url}",
            "</Asset>",
        ]
        return "\n".join(lines)


class ActivityFeedImport(Base):
    __tablename__ = "activity_feed_import"
    __table_args__ = {"schema": "baxus"}

    asset_id = Column(CHAR(44), primary_key=True, nullable=False, index=True)
    price = Column(Float, nullable=False, primary_key=True)
    activity_date = Column(DateTime, nullable=False, primary_key=True)

    def __str__(self):
        price_str = _fmt_price(self.price) if self.price is not None else "—"
        activitystr = _fmt_dt(self.activity_date)
        lines = [
            "<ActivityLogImport>",
            f"  asset_id         : {self.asset_id or '—'}",
            f"  price            : {price_str}",
            f"  date             : {activitystr}",
            "</ActivityLogImport>",
        ]
        return "\n".join(lines)


class ActivityFeed(Base):
    __tablename__ = "activity_feed"
    __table_args__ = {"schema": "baxus"}

    activity_idx = Column(Integer, primary_key=True, autoincrement=True)
    activity_type_idx = Column(Integer, nullable=False)
    asset_idx = Column(Integer, primary_key=False, autoincrement=False, nullable=False)
    price = Column(Float, nullable=True)
    activity_date = Column(DateTime, nullable=False)
    signature = Column(VARCHAR(88), primary_key=False, nullable=True)
    from_user_account = Column(VARCHAR(44), primary_key=False, nullable=True)
    to_user_account = Column(VARCHAR(44), primary_key=False, nullable=True)

    def __str__(self):
        price_str = _fmt_price(self.price) if self.price is not None else "—"
        activitystr = _fmt_dt(self.activity_date)
        lines = [
            "<ActivityLog>",
            f"  activity_idx     : {self.activity_idx or '—'}",
            f"  activity_type_idx: {self.activity_type_idx}",
            f"  asset_idx        : {self.asset_idx or '—'}",
            f"  price            : {price_str}",
            f"  date             : {activitystr}",
            f"  signature        : {self.signature or '—'}",
            f"  from_user_account: {self.from_user_account or '—'}",
            f"  to_user_account  : {self.to_user_account or '—'}",
            "</ActivityLog>",
        ]
        if "mint" in self.__dict__:
            lines.insert(-1, f"  mint             : {self.mint or '—'}")
        return "\n".join(lines)


class ActivityTypes(Base):
    __tablename__ = "dim_activity_types"
    __table_args__ = {"schema": "baxus"}

    activity_type_idx = Column(Integer, primary_key=True, autoincrement=True)
    activity_type_code = Column(VARCHAR(50), primary_key=False, nullable=False, index=False)
    activity_type_name = Column(VARCHAR(100), primary_key=False, nullable=False, index=False)

    def __str__(self):
        lines = [
            "<ActivityType>",
            f"  activity_type_idx : {self.activity_type_idx or '—'}",
            f"  activity_type_code: {self.activity_type_code}",
            f"  activity_type_name    : {self.activity_type_name or '—'}",
            "</ActivityType>",
        ]
        return "\n".join(lines)


class Bottle(Base):
    __tablename__ = "bottles"
    __table_args__ = {"schema": "baxus"}

    bottle_idx = Column(Integer, primary_key=True, autoincrement=True)
    bottle_name = Column(Text, nullable=False)
    image_url = Column(Text, nullable=False)
    producer = Column(Text, nullable=True)
    bottler = Column(Text, nullable=True)
    brand = Column(Text, nullable=True)
    sub_brand = Column(Text, nullable=True)
    added_date = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)

    def __str__(self):

        if not self.bottle_name:
            name_display = "<None>"
        elif len(self.bottle_name) > 60:
            name_display = self.bottle_name[:57] + "..."
        else:
            name_display = self.bottle_name

        added_date_str = _fmt_dt(self.added_date)
        producer = f"{self.producer}" if self.producer else "<None>"
        bottler = f"{self.bottler}" if self.bottler else "<None>"
        brand = f"{self.brand}" if self.brand else "<None>"
        sub_brand = f"{self.sub_brand}" if self.sub_brand else "<None>"

        lines = [
            "<Bottle>",
            f"  bottle_idx        : {self.bottle_idx or '—'}",
            f"  bottle_name       : {name_display}",
            f"  image_url         : {self.image_url}",
            f"  producer          : {producer}",
            f"  bottler           : {bottler}",
            f"  brand             : {brand}",
            f"  sub_brand         : {sub_brand}",
            f"  added_date        : {added_date_str}",
            "</Bottle>",
        ]
        return "\n".join(lines)

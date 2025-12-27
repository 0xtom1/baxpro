"""Client for fetching listings from the Baxus API."""

import json
from time import sleep

import google.generativeai as genai
import requests
from requests.adapters import HTTPAdapter
from sqlalchemy.orm import Session
from urllib3.util.retry import Retry

from .models import Bottle
from .utils.config import Config
from .utils.log import get_logger

logger = get_logger()

PROMPT = """
You are an expert in spirits, whisky, tequila, rum, and fine wine bottles and want to categorize every bottle into standard attributes.

Analyze the attached bottle image and the following text attributes (if any):

<attributes_tag>

From the image and the text, extract **only** these two fields in strict JSON. 
Do NOT add explanations, do NOT wrap in markdown.

Return ONLY this JSON:
{
  "brand": "string or null",
  "sub_brand": "string or null"
}

Rules:
- "brand" = the main brand family (e.g., "Weller", "Macallan", "Don Julio", "Patrón", "Lagavulin")
- "sub_brand" = the specific expression / age / variant (e.g., "12", "CYPB", "18 Year Old", "Añejo", "Special Reserve", "Full Proof", null if none exists)
- If there is no visible or obvious sub-brand/age/variant → use null
- Never guess. If you're not at least 90 percent sure → use null
- Ignore limited-edition numbers like "Batch 12" or "Bottle 456/1000" — those are not sub-brand
- Brand is mainly how it is marketed and is usually the biggest text on the label.
- Any "Bottled for" text can be ignored. You want general brand and sub_brand categories that most bottles can fall under
- Words like "Rye" in the name are usually important identifiers and should be in the brand or sub_brand

Examples you must follow:
Image shows Weller 12 bottle → {"brand": "Weller", "sub_brand": "12"}
Image shows Buffalo Trace (standard) → {"brand": "Buffalo Trace", "sub_brand": null}
Image shows Macallan 18 Sherry Oak → {"brand": "Macallan", "sub_brand": "18 Sherry Oak"}
Image shows Blanton's Single Barrel → {"brand": "Blanton's", "sub_brand": null}
Image Shows "E.H. Taylor, Jr. Warehouse C Tornado Surviving - 2011" and the Producer is "Buffalo Trace" → {'brand': 'E.H. Taylor', 'sub_brand': 'Warehouse C Tornado Surviving'}
Data shows {"name": "Dad's Hat Single Barrel Rye #456 For Club Marzipan"} → {"brand": "Dad's Hat", "sub_brand": "Single Barrel Rye"}
"""


class BottleRepository:
    """HTTP client for the Baxus API with retry logic."""

    def __init__(self, config: Config, db_session: Session = None):
        self.config = config
        genai.configure(api_key=config.gemini_api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.DEFAULT_DELAY_SECONDS = 1
        self.session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
        self.db_session = db_session

    def _get_headers(self) -> dict:
        """Build request headers."""
        headers = {
            "Accept": "application/json",
            "User-Agent": "BaxPro-Monitor/1.0",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def should_process_all_assets(self) -> bool:
        """Returns True if listings_feed is empty

        Returns:
            bool: True if no records
        """
        record = self.db_session.query(Bottle).count()
        if not record:
            logger.info("Table is empty")
            return True
        elif record > 1800:
            return False
        else:
            return True

    def get_by_key(self, record: Bottle) -> Bottle:
        """
        Insert or update a listing. 
        Returns (listing, is_new) tuple where is_new indicates if this was a new listing.
        """

        record = self.db_session.query(Bottle).filter(
            Bottle.bottle_name == record.bottle_name,
            Bottle.producer == record.producer,
            Bottle.bottler == record.bottler,
        ).first()
        return record

    def process_bottle(self, metadata_json: dict) -> int:
        asset_dict = dict()
        asset_dict['name'] = metadata_json.get("name", None)
        asset_dict['description'] = metadata_json.get("description", None)
        image_url = metadata_json.get("image")

        exclude_attributes = ["Baxus Class ID", "Blurhash",
                              "Baxus Class Name", "assetId", "PackageShot"]
        attributes = {
            item["trait_type"]: item["value"]
            for item in metadata_json["attributes"] if item not in exclude_attributes
        }
        if not attributes:
            attributes = dict()

        asset_dict.update(attributes)

        asset_dict = {k: v for k, v in asset_dict.items()
                      if v is not None and v != '' and v != 'undefined' and v!= 'null'}

        bottle = Bottle(bottle_name=asset_dict.get("name", None), image_url=image_url, producer=asset_dict.get("Producer", None),
                        bottler=asset_dict.get("Bottler", None))

        existing = self.get_by_key(record=bottle)
        if existing:
            logger.info("Record Exists for bottle: {b}".format(
                b=bottle.bottle_name))
            return existing.bottle_idx
        else:
            brand_info = self.query_gemini(
                attributes=attributes, image_url=image_url)

            bottle.brand = brand_info.get("brand")
            bottle.sub_brand = brand_info.get("sub_brand")
            self.db_session.add(bottle)
            self.db_session.commit()
            logger.info("Bottle Added: {b}".format(b=bottle))
            sleep(5)
            return bottle.bottle_idx

    def query_gemini(self, attributes: dict, image_url) -> dict:
        """_summary_

        Args:
            attributes_dict (dict): _description_
            name (str): _description_
            producer (str): _description_
            image_url (_type_): _description_
        """
        # Remove None values so the prompt stays clean
        attributes_dict = {k: v for k,
                           v in attributes.items() if v is not None and v != ''}

        # Turn it into nicely formatted JSON string
        attributes_json = json.dumps(attributes_dict, indent=2)

        prompt = PROMPT.replace("<attributes_tag>", attributes_json)

        try:
            # Ask Gemini
            gemini_response = self.model.generate_content(
                [prompt, image_url])

            # Clean JSON from the answer
            text = gemini_response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3]  # strip markdown
            elif text.startswith("```"):
                text = text[3:-3]

            response = json.loads(text)
            assert 'brand' in response
            assert 'sub_brand' in response

        except Exception as e:
            logger.info("Error {e}".format(e=e))
            return None

        return response
